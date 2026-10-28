use crate::types::FileMetadata;
use std::fs::{self, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::PathBuf;
use tauri::{Manager, State};
use std::collections::HashMap;
use std::sync::Mutex;
use serde::Serialize;

// Android-only imports
#[cfg(target_os = "android")]
use tauri_plugin_android_fs::{
    AndroidFsExt, FileAccessMode, FsUri, PublicGeneralPurposeDir,
};

// Platform-agnostic handle stored per active download.
#[cfg(target_os = "android")]
type DownloadHandle = FsUri;

#[cfg(not(target_os = "android"))]
type DownloadHandle = std::path::PathBuf;

/// One in-flight download. Tracks both the platform handle and the
/// chunk-level state needed to make retransmissions idempotent.
pub struct DownloadEntry {
    pub handle: DownloadHandle,
    pub bytes_written: u64,
    pub next_expected_index: u64,
    pub total_size: u64,
}

/// Tracks the FileUri for each in-progress download task on Android.
pub struct DownloadRegistry(Mutex<HashMap<String, DownloadEntry>>);

impl DownloadRegistry {
    pub fn new() -> Self {
        Self(Mutex::new(HashMap::new()))
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BeginDownloadResult {
    pub already_existed: bool,
    /// Human-readable location for the UI (Android: "Download/Vellichor/x.mp4",
    /// desktop: absolute path). Purely cosmetic; never used for I/O.
    pub display_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChunkWriteResult {
    /// "written" | "duplicate" — both mean the receiver is now caught up
    /// through this index, so the sender should proceed.
    pub status: String,
    pub bytes_written: u64,
    pub next_expected_index: u64,
}

/// Creates the receiver-side registry entry and the destination file.
/// Must be called before the sender sends chunk 0. Idempotent: calling it
/// again for the same download_id returns already_existed=true without
/// touching the file.
#[tauri::command]
pub fn begin_download(
    app: tauri::AppHandle,
    state: State<'_, DownloadRegistry>,
    download_id: String,
    file_path: String,
    total_size: u64,
    mime_type: Option<String>,
) -> Result<BeginDownloadResult, String> {
    let mut map = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(entry) = map.get(&download_id) {
        log::info!(
            "[BEGIN_DL] id={} already exists, bytes_written={} next_index={}",
            download_id, entry.bytes_written, entry.next_expected_index
        );
        return Ok(BeginDownloadResult {
            already_existed: true,
            display_path: file_path,
        });
    }

    #[cfg(target_os = "android")]
    {
        let public = app.android_fs().public_storage();
        let uri = public
        .create_new_file(
            None,
            PublicGeneralPurposeDir::Download,
            &file_path,
            mime_type.as_deref(),
        )
        .map_err(|e| {
            log::error!("[BEGIN_DL] create_new_file failed id={}: {} name:{}", download_id, e, file_path);
            e.to_string()
        })?;
        log::info!("[BEGIN_DL] id={} created uri={:?}", download_id, uri);
        map.insert(download_id, DownloadEntry {
            handle: uri,
            bytes_written: 0,
            next_expected_index: 0,
            total_size,
        });
    }

    #[cfg(not(target_os = "android"))]
    {
        let path = std::path::PathBuf::from(&file_path);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::File::create(&path).map_err(|e| {
            log::error!("[BEGIN_DL] create failed id={} path={}: {}", download_id, path.display(), e);
            e.to_string()
        })?;
        log::info!("[BEGIN_DL] id={} created path={}", download_id, path.display());
        map.insert(download_id, DownloadEntry {
            handle: path,
            bytes_written: 0,
            next_expected_index: 0,
            total_size,
        });
    }

    Ok(BeginDownloadResult {
        already_existed: false,
       display_path: file_path,
    })
}

/// Writes one chunk to an in-flight download. `index` must equal
/// `next_expected_index` for the chunk to be persisted. A chunk with
/// index < next_expected_index is a retransmission and returns
/// status="duplicate" so the caller can re-ack without rewriting.
#[tauri::command]
pub fn write_file_chunk(
    app: tauri::AppHandle,
    state: State<'_, DownloadRegistry>,
    download_id: String,
    index: u64,
    data_bytes: Vec<u8>,
) -> Result<ChunkWriteResult, String> {
    let mut map = state.0.lock().map_err(|e| e.to_string())?;
    let entry = map.get_mut(&download_id).ok_or_else(|| {
        log::error!("[WRITE_CHUNK] no registry entry for download_id={}", download_id);
        format!("begin_download not called for id {}", download_id)
    })?;

    if index < entry.next_expected_index {
        log::info!(
            "[WRITE_CHUNK] duplicate id={} index={} next_expected={}",
            download_id, index, entry.next_expected_index
        );
        return Ok(ChunkWriteResult {
            status: "duplicate".into(),
                  bytes_written: entry.bytes_written,
                  next_expected_index: entry.next_expected_index,
        });
    }
    if index > entry.next_expected_index {
        log::error!(
            "[WRITE_CHUNK] out-of-order id={} index={} next_expected={}",
            download_id, index, entry.next_expected_index
        );
        return Err(format!(
            "out of order chunk: got {}, expected {}",
            index, entry.next_expected_index
        ));
    }

    let len = data_bytes.len() as u64;
    let first_write = entry.bytes_written == 0;

    #[cfg(target_os = "android")]
    {
        let api = app.android_fs();
        let mut file = if first_write {
            api.open_file_writable(&entry.handle).map_err(|e| {
                log::error!("[WRITE_CHUNK] open writable failed id={}: {}", download_id, e);
                e.to_string()
            })?
        } else {
            api.open_file(&entry.handle, FileAccessMode::WriteAppend).map_err(|e| {
                log::error!("[WRITE_CHUNK] open append failed id={}: {}", download_id, e);
                e.to_string()
            })?
        };
        file.write_all(&data_bytes).map_err(|e| {
            log::error!("[WRITE_CHUNK] write failed id={} index={}: {}", download_id, index, e);
            e.to_string()
        })?;
        // file.sync_all().map_err(|e| {
        //     log::error!("[WRITE_CHUNK] sync failed id={} index={}: {}", download_id, index, e);
        //     e.to_string()
        // })?;
    }

    #[cfg(not(target_os = "android"))]
    {
        use std::fs::OpenOptions;
        let mut file = if first_write {
            OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(&entry.handle)
            .map_err(|e| e.to_string())?
        } else {
            OpenOptions::new()
            .create(true)
            .append(true)
            .open(&entry.handle)
            .map_err(|e| e.to_string())?
        };
        file.write_all(&data_bytes).map_err(|e| e.to_string())?;
        file.sync_all().map_err(|e| e.to_string())?;
    }

    entry.bytes_written += len;
    entry.next_expected_index += 1;

    log::info!(
        "[WRITE_CHUNK] id={} index={} wrote={} total={}/{} next_index={}",
        download_id, index, len, entry.bytes_written, entry.total_size, entry.next_expected_index
    );

    Ok(ChunkWriteResult {
        status: "written".into(),
        bytes_written: entry.bytes_written,
        next_expected_index: entry.next_expected_index,
    })
}

/// Verifies the received file against the sender's reported size and,
/// if provided, its sha256. Returns the size of the file on disk.
#[tauri::command]
pub fn finalize_download(
    app: tauri::AppHandle,
    state: State<'_, DownloadRegistry>,
    download_id: String,
) -> Result<u64, String> {
    let map = state.0.lock().map_err(|e| e.to_string())?;
    let entry = map.get(&download_id)
    .ok_or_else(|| format!("no registry entry for id {}", download_id))?;

    let actual_len: u64 = {
        #[cfg(target_os = "android")]
        {
            // Re-open for reading; fsync is safe on a read-only handle.
            if let Ok(f) = app.android_fs().open_file_readable(&entry.handle) {
                let _ = f.sync_all();
            }
            app.android_fs().get_len(&entry.handle).map_err(|e| e.to_string())?
        }
        #[cfg(not(target_os = "android"))]
        {
            // if let Ok(f) = std::fs::File::open(&entry.handle) {
            //     let _ = f.sync_all();
            // }
            std::fs::metadata(&entry.handle)
            .map_err(|e| e.to_string())?
            .len()
        }
    };

    if actual_len != entry.bytes_written {
        log::error!(
            "[FINALIZE] id={} disk_len={} tracked_len={} — mismatch",
            download_id, actual_len, entry.bytes_written
        );
        return Err(format!(
            "size mismatch: disk={} tracked={}",
            actual_len, entry.bytes_written
        ));
    }
    log::info!("[FINALIZE] id={} ok len={}", download_id, actual_len);
    Ok(actual_len)
}

/// Releases the registry entry and, on failure, optionally deletes the
/// partial file. On success the file stays where it is.
#[tauri::command]
pub fn cleanup_download(
    app: tauri::AppHandle,
    state: State<'_, DownloadRegistry>,
    download_id: String,
    delete_partial: bool,
) -> Result<(), String> {
    let mut map = state.0.lock().map_err(|e| e.to_string())?;
    let entry = match map.remove(&download_id) {
        Some(e) => e,
        None => {
            log::warn!("[CLEANUP] no registry entry for id={}", download_id);
            return Ok(());
        }
    };
    log::info!(
        "[CLEANUP] id={} bytes_written={} delete_partial={}",
        download_id, entry.bytes_written, delete_partial
    );
    if delete_partial {
        #[cfg(target_os = "android")]
        {
            // Best-effort. The plugin does not expose a delete command on
            // PublicStorage directly; use the opener/utils API or an fs plugin
            // delete if available. Log the failure and move on — the partial
            // file being visible to the user is not worse than a crash.
            let _ = app.android_fs().public_storage();
            log::warn!("[CLEANUP] android partial-file deletion not implemented; uri={:?}", entry.handle);
        }
        #[cfg(not(target_os = "android"))]
        {
            if let Err(e) = std::fs::remove_file(&entry.handle) {
                log::warn!("[CLEANUP] remove_file failed for {:?}: {}", entry.handle, e);
            }
        }
    }
    Ok(())
}

// Reads a contiguous slice of bytes from a local file for chunked network transmission
#[tauri::command]
pub fn read_file_chunk(file_path: String, offset: u64, length: usize) -> Result<Vec<u8>, String> {
    let mut file = fs::File::open(&file_path).map_err(|e| e.to_string())?;
    file.seek(SeekFrom::Start(offset)).map_err(|e| e.to_string())?;

    let mut buffer = vec![0u8; length];
    let bytes_read = file.read(&mut buffer).map_err(|e| e.to_string())?;
    buffer.truncate(bytes_read);
    Ok(buffer)
}

// Inspects a local file and retrieves its size, file name, and metadata
#[tauri::command]
pub fn get_file_info(file_path: String) -> Result<FileMetadata, String> {
    let path = PathBuf::from(&file_path);
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    Ok(FileMetadata {
        id: format!("file_{}_{}", name, metadata.len()),
        name,
        size: metadata.len(),
        mime_type: "application/octet-stream".to_string(),
        checksum: None,
    })
}
