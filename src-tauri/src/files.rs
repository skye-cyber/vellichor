use crate::types::FileMetadata;
use std::fs::{self, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::PathBuf;
use tauri::{Manager, State};
use std::collections::HashMap;
use std::sync::Mutex;

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

/// Tracks the FileUri for each in-progress download task on Android.
pub struct DownloadRegistry(Mutex<HashMap<String, DownloadHandle>>);

impl DownloadRegistry {
    pub fn new() -> Self {
        Self(Mutex::new(HashMap::new()))
    }
}

#[tauri::command]
pub fn write_file_chunk(
    app: tauri::AppHandle,
    state: State<'_, DownloadRegistry>,
    download_id: String,
    file_path: String,       // Desktop: absolute path. Android: "Vellichor/movie.mp4"
    data_bytes: Vec<u8>,
    is_initial_chunk: bool,
) -> Result<bool, String> {
    #[cfg(target_os = "android")]
    {
        write_chunk_android(app, state, download_id, file_path, data_bytes, is_initial_chunk)
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, state, download_id);   // unused on desktop
        write_chunk_desktop(file_path, data_bytes, is_initial_chunk)
    }
}

// ---------------------------------------------------------------------------
// Android path
// ---------------------------------------------------------------------------

#[cfg(target_os = "android")]
fn write_chunk_android(
    app: tauri::AppHandle,
    state: State<'_, DownloadRegistry>,
    download_id: String,
    file_path: String,
    data_bytes: Vec<u8>,
    is_initial_chunk: bool,
) -> Result<bool, String> {
    let api = app.android_fs();
    let public = api.public_storage();

    log::info!(
        "[WRITE_ANDROID] download_id={} path={} initial={} bytes={}",
        download_id, file_path, is_initial_chunk, data_bytes.len()
    );

    let mut map = state.0.lock().map_err(|e| {
        log::error!("[WRITE_ANDROID] registry lock poisoned: {}", e);
        e.to_string()
    })?;

    let uri = if is_initial_chunk {
        log::info!("[WRITE_ANDROID] creating new file: {}", file_path);
        let uri = public
        .create_new_file(
            None,
            PublicGeneralPurposeDir::Download,
            &file_path,
            None, // mime inferred from extension by the plugin
        )
        .map_err(|e| {
            log::error!("[WRITE_ANDROID] create_new_file failed: {}", e);
            e.to_string()
        })?;
        log::info!("[WRITE_ANDROID] created uri={:?}", uri);
        map.insert(download_id.clone(), uri.clone());
        log::info!("[WRITE_ANDROID] registered download_id={}", download_id);
        uri
    } else {
        let uri = map.get(&download_id).cloned().ok_or_else(|| {
            let msg = format!(
                "no active download for id {} — initial chunk must be sent first",
                download_id
            );
            log::error!("[WRITE_ANDROID] {}", msg);
            msg
        })?;
        log::info!("[WRITE_ANDROID] appending to uri={:?}", uri);
        uri
    };

    // For the first chunk, use truncating writable — file was just created, so
    // either mode works, but writable is unambiguous.
    // For subsequent chunks, use FileAccessMode::Append if it exists; otherwise
    // fall back to opening with the append-capable variant exposed by the plugin.
    let mut file: std::fs::File = if is_initial_chunk {
        api.open_file_writable(&uri).map_err(|e| {
            log::error!("[WRITE_ANDROID] open_file_writable failed: {}", e);
            e.to_string()
        })?
    } else {
        api.open_file(&uri, FileAccessMode::WriteAppend).map_err(|e| {
            log::error!("[WRITE_ANDROID] open_file(Append) failed: {}", e);
            e.to_string()
        })?
    };

    file.write_all(&data_bytes).map_err(|e| {
        log::error!("[WRITE_ANDROID] write_all failed: {}", e);
        e.to_string()
    })?;

    log::info!(
        "[WRITE_ANDROID] wrote {} bytes, download_id={} initial={}",
        data_bytes.len(), download_id, is_initial_chunk
    );
    Ok(true)
}

// ---------------------------------------------------------------------------
// Desktop path (unchanged behavior)
// ---------------------------------------------------------------------------

#[cfg(not(target_os = "android"))]
fn write_chunk_desktop(
    file_path: String,
    data_bytes: Vec<u8>,
    is_initial_chunk: bool,
) -> Result<bool, String> {
    use std::fs::OpenOptions;

    let path = std::path::PathBuf::from(&file_path);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let mut file = if is_initial_chunk {
        OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&path)
        .map_err(|e| e.to_string())?
    } else {
        OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?
    };

    file.write_all(&data_bytes).map_err(|e| e.to_string())?;
    Ok(true)
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn cleanup_download(
    state: State<'_, DownloadRegistry>,
    download_id: String,
) -> Result<(), String> {
    let mut map = state.0.lock().map_err(|e| e.to_string())?;
    if map.remove(&download_id).is_some() {
        log::info!("[CLEANUP] removed download_id={}", download_id);
    } else {
        log::warn!("[CLEANUP] no registry entry for download_id={}", download_id);
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
