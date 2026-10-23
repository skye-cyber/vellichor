use std::fs;
use tauri::Manager;

// Reads persisted user preferences from the application configuration directory
#[tauri::command]
pub fn get_stored_settings(app_handle: tauri::AppHandle) -> Result<String, String> {
    let config_dir = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;
    let settings_file = config_dir.join("settings.json");

    if settings_file.exists() {
        fs::read_to_string(settings_file).map_err(|e| e.to_string())
    } else {
        Ok("{}".to_string())
    }
}

// Persists updated user preferences to disk in the application configuration directory
#[tauri::command]
pub fn save_stored_settings(app_handle: tauri::AppHandle, settings_json: String) -> Result<bool, String> {
    let config_dir = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;

    let _ = fs::create_dir_all(&config_dir);
    let settings_file = config_dir.join("settings.json");

    fs::write(settings_file, settings_json).map_err(|e| e.to_string())?;
    Ok(true)
}
