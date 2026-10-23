use crate::types::FileMetadata;
use std::fs::{self, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::PathBuf;
use tauri::Manager;

// Resolves the default downloads destination directory on the host operating system
#[tauri::command]
pub fn get_download_directory(app_handle: tauri::AppHandle) -> Result<String, String> {
    if let Ok(download_dir) = app_handle.path().download_dir() {
        return Ok(download_dir.to_string_lossy().to_string());
    }

    // Fallback to user home Downloads folder
    let home = std::env::var("HOME").map_err(|e| e.to_string())?;
    let path = PathBuf::from(home).join("Downloads");
    let _ = fs::create_dir_all(&path);
    Ok(path.to_string_lossy().to_string())
}

// Appends or writes a chunk of binary data to the designated destination file
#[tauri::command]
pub fn write_file_chunk(
    file_path: String,
    data_bytes: Vec<u8>,
    is_initial_chunk: bool,
) -> Result<bool, String> {
    let path = PathBuf::from(&file_path);

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
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
