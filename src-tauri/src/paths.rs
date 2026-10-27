//! Centralized path resolution for vellichor user data.

use std::path::PathBuf;
use tauri::Manager;
use tauri::AppHandle;


/// Defaults for `AppSettings` — must stay in sync with the TS interface.
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    // Connection
    pub auto_connect: bool,
    pub discovery_mode: DiscoveryMode,
    pub stream_quality: StreamQuality,
    pub signaling_server_url: String,

    // Privacy & Security
    pub encryption: bool,
    pub require_pairing: bool,
    pub save_history: bool,

    // Appearance
    pub theme: Theme,
    pub reduce_animations: bool,
    pub compact_view: bool,

    // Storage
    pub auto_download: bool,
    pub download_path: String,
    pub max_cache_size: u64,

    // Advanced
    pub enable_debug: bool,
    pub log_level: LogLevel,
    pub keep_awake: bool,

    // Performance
    pub max_frame_rate: u32,          // 30 | 60
    pub resolution: Resolution,
    pub hardware_acceleration: bool,

    // Keyboard & Mobile Input
    pub suppress_native_keyboard: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum DiscoveryMode { All, Saved, Manual }

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum StreamQuality { Balanced, Performance, Battery }

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Theme { Light, Dark, System }

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum LogLevel { Error, Warn, Info, Debug }

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Resolution { P720, P1080, Original }   // serializes as "p720"? see note below

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            auto_connect: true,
            discovery_mode: DiscoveryMode::All,
            stream_quality: StreamQuality::Balanced,
            signaling_server_url: "ws://127.0.0.1:42427".to_string(),

            encryption: true,
            require_pairing: true,
            save_history: false,

            theme: Theme::System,
            reduce_animations: false,
            compact_view: false,

            auto_download: false,
            download_path: String::new(),      // filled in at runtime with app_data_dir/downloads
            max_cache_size: 512 * 1024 * 1024, // 512 MiB

            enable_debug: false,
            log_level: LogLevel::Info,
            keep_awake: false,

            max_frame_rate: 60,
            resolution: Resolution::P1080,
            hardware_acceleration: true,

            suppress_native_keyboard: false,
        }
    }
}

/// The base directory for all user data.
///
/// Resolves to `~/.vellichor`. If `$HOME` cannot be resolved, falls back
/// to the OS temp directory — see the module doc for why.
pub fn base_dir(app: &AppHandle) -> PathBuf {
    #[cfg(desktop)]
    {
        dirs::home_dir()
        .map(|h| h.join(".vellichor"))
        .unwrap_or_else(|| std::env::temp_dir().join(".vellichor"))
    }
    #[cfg(mobile)]
    {
        app.path().app_data_dir()
        .unwrap_or_else(|_| std::env::temp_dir().join("vellichor"))
    }
}

#[tauri::command]
pub fn get_download_directory(app_handle: tauri::AppHandle) -> Result<String, String> {
    // Android: return a description indicating "public Download/Vellichor", for writing by the plugin
    #[cfg(target_os = "android")]
    {
        // Note: this returns a logical path; actual writes must go through tauri_plugin_android_fs
        // PublicStorage::create_file_in_public_app_dir("Download/Vellichor/xxx")
        return Ok("Download/Vellichor".to_string());
    }

    // Desktop: keep original logic
    #[cfg(not(target_os = "android"))]
    {
        if let Ok(download_dir) = app_handle.path().download_dir() {
            return Ok(download_dir.to_string_lossy().to_string());
        }
        let home = std::env::var("HOME").map_err(|e| e.to_string())?;
        let path = std::path::PathBuf::from(home).join("Downloads/Vellichor");
        let _ = std::fs::create_dir_all(&path);
        Ok(path.to_string_lossy().to_string())
    }
}

// ---- Subdirectory helpers -----------------------------------------------
//
// Each helper returns a path. Callers are responsible for calling
// `create_dir_all` on the parent before writing — that is done once at
// startup by `ensure_data_dirs`, so most callers can assume the parent
// exists.

pub fn config_dir(app: &AppHandle) -> PathBuf {
    base_dir(app).join("config")
}

pub fn logs_dir(app: &AppHandle) -> PathBuf {
    base_dir(app).join("logs")
}

/// Directory where device id lives
pub fn deviceid_dir(app: &AppHandle) -> PathBuf {
    base_dir(app).join("identity")
}

// ---- Specific files -----------------------------------------------------
//
// These are the actual files the app writes. Using named helpers rather
// than string concatenation at call sites means renaming a file is a
// one-line change here, not a grep across the codebase.

pub fn settings_file(app: &AppHandle) -> PathBuf {
    config_dir(app).join("settings.json")
}

pub fn log_file(app: &AppHandle) -> PathBuf {
    logs_dir(app).join("vellichor.log")
}

pub fn deviceid_file(app: &AppHandle) -> PathBuf {
    deviceid_dir(app).join("device_id")
}

/// Ensure every directory the app writes to exists.
///
/// Idempotent. Safe to call on every launch. Called once from `setup()`.
///
/// Creating directories eagerly means command handlers can assume the
/// parent exists and don't need defensive `create_dir_all` calls before
/// every write.
pub fn ensure_data_dirs(app: &AppHandle) -> std::io::Result<PathBuf> {
    let base = base_dir(app);
    std::fs::create_dir_all(&base)?;
    for sub in ["config", "logs", "identity"] {
        std::fs::create_dir_all(base.join(sub))?;
    }
    Ok(base)
}

/// Ensure a JSON file exists with the given initial content.
///
/// Used to seed `settings.json` and `plugin state.json` on first run.
/// No-op if the file already exists.
pub fn ensure_json_file(path: &PathBuf, initial: &str) -> std::io::Result<()> {
    if !path.exists() {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, initial)?;
    }
    Ok(())
}

/// Seed the initial JSON files the app expects to exist on first launch.
///
/// Creates `settings.json` in `config/`. No-op if the file already exists —
/// never overwrites user data.
///
/// Note: the device id file (identity/device_id) and the log file are NOT
/// seeded here — `get_or_create_device_id()` creates the former lazily and
/// the logger creates the latter on first write.
///
/// Called once from `setup()`. Callers should have already run
/// `ensure_data_dirs`; this function will run it again if needed (it's
/// idempotent) so it can be used standalone.
pub fn ensure_data_files(app: &AppHandle) -> std::io::Result<()> {
    ensure_data_dirs(app)?;

    let mut settings = AppSettings::default();
    let settings_json = serde_json::to_string_pretty(&settings)
    .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
    if settings.download_path.is_empty() {
        settings.download_path = get_download_directory(app.clone())
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
    }
    ensure_json_file(&settings_file(app), &settings_json)?;
    ensure_json_file(&log_file(app), "")?;

    Ok(())
}


/// Return the platform's standard media folders that exist on disk.
///
/// Used to seed `libraryFolders` on first launch and on reset. Only
/// returns folders whose paths actually exist — an empty array if
/// none do, which is fine (the user can add one manually).
///
/// Each entry matches the `Folder` shape the frontend expects:
/// `{ id, label, path, itemCount }`.
pub fn default_media_folders() -> Vec<serde_json::Value> {
    use serde_json::json;

    let Some(home) = dirs::home_dir() else {
        return Vec::new();
    };

    // Ordered by how commonly they hold media. The frontend seeds the
    // library from this list; order affects only the display order in
    // Settings → Library.
    let candidates: &[(&str, &str)] = &[
        ("Videos",     "Videos"),
        ("Music",      "Music"),
        ("Downloads",  "Downloads"),
        ("Documents",  "Documents"),
        ("Desktop",    "Desktop"),
    ];

    let mut out = Vec::new();
    for (subdir, label) in candidates {
        let path = home.join(subdir);
        if !path.is_dir() {
            continue;
        }
        let path_str = path.to_string_lossy().to_string();
        out.push(json!({
            "id": format!("default-{}", subdir.to_lowercase()),
            "label": label,
            "path": path_str,
            "itemCount": 0,
        }));
    }
    out
}
