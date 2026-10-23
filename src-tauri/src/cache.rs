use crate::types::CacheInfo;
use std::fs;
use tauri::Manager;

// Computes the total byte size and entry count of files stored in the application cache directory
#[tauri::command]
pub fn get_cache_size(app_handle: tauri::AppHandle) -> Result<CacheInfo, String> {
    let cache_dir = app_handle
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?;

    let mut size = 0u64;
    let mut count = 0usize;

    // Traverse directory and accumulate file metadata
    if cache_dir.exists() {
        if let Ok(entries) = fs::read_dir(&cache_dir) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    size += metadata.len();
                    count += 1;
                }
            }
        }
    } else {
        let _ = fs::create_dir_all(&cache_dir);
    }

    Ok(CacheInfo {
        size_bytes: size,
        files_count: count,
        last_cleared: "Never".to_string(),
    })
}

// Clears all temporary cache files from the application cache directory
#[tauri::command]
pub fn clear_cache(app_handle: tauri::AppHandle) -> Result<bool, String> {
    let cache_dir = app_handle
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?;

    if cache_dir.exists() {
        if let Ok(entries) = fs::read_dir(&cache_dir) {
            for entry in entries.flatten() {
                let _ = fs::remove_file(entry.path());
            }
        }
    }
    Ok(true)
}
