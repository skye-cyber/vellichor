use serde::{Deserialize, Serialize};
use std::fs;
use std::net::UdpSocket;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemInfo {
    pub hostname: String,
    pub platform: String,
    pub arch: String,
    pub device_type: String,
    pub local_ips: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscoveredDevice {
    pub id: String,
    pub name: String,
    pub device_type: String,
    pub platform: String,
    pub status: String,
    pub ip: String,
    pub signal_strength: u8,
    pub last_seen: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CacheInfo {
    pub size_bytes: u64,
    pub files_count: usize,
    pub last_cleared: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InputCommand {
    pub action: String, // "mousemove", "mousedown", "mouseup", "click", "keypress", "scroll"
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub button: Option<String>,
    pub key: Option<String>,
    pub delta_y: Option<f64>,
}

fn get_local_ip_internal() -> Option<String> {
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    socket.local_addr().ok().map(|addr| addr.ip().to_string())
}

#[tauri::command]
fn get_system_info() -> SystemInfo {
    let platform = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();

    let hostname = std::env::var("HOSTNAME")
        .or_else(|_| std::env::var("USER"))
        .unwrap_or_else(|_| "Vellichor-Device".to_string());

    let mut local_ips = Vec::new();
    if let Some(ip) = get_local_ip_internal() {
        local_ips.push(ip);
    }
    if local_ips.is_empty() {
        local_ips.push("127.0.0.1".to_string());
    }

    let device_type = match platform.as_str() {
        "android" | "ios" => "phone",
        _ => "laptop",
    }
    .to_string();

    SystemInfo {
        hostname,
        platform,
        arch,
        device_type,
        local_ips,
    }
}

#[tauri::command]
async fn scan_network() -> Result<Vec<DiscoveredDevice>, String> {
    let my_ip = get_local_ip_internal().unwrap_or_else(|| "192.168.1.100".to_string());
    let parts: Vec<&str> = my_ip.split('.').collect();

    let base_prefix = if parts.len() == 4 {
        format!("{}.{}.{}", parts[0], parts[1], parts[2])
    } else {
        "192.168.1".to_string()
    };

    let devices = vec![
        DiscoveredDevice {
            id: "peer-1".to_string(),
            name: "Workstation (Linux)".to_string(),
            device_type: "laptop".to_string(),
            platform: "linux".to_string(),
            status: "online".to_string(),
            ip: format!("{}.105", base_prefix),
            signal_strength: 95,
            last_seen: "just now".to_string(),
        },
        DiscoveredDevice {
            id: "peer-2".to_string(),
            name: "Galaxy Phone".to_string(),
            device_type: "phone".to_string(),
            platform: "android".to_string(),
            status: "online".to_string(),
            ip: format!("{}.120", base_prefix),
            signal_strength: 84,
            last_seen: "1 min ago".to_string(),
        },
        DiscoveredDevice {
            id: "peer-3".to_string(),
            name: "MacBook Air".to_string(),
            device_type: "laptop".to_string(),
            platform: "macos".to_string(),
            status: "busy".to_string(),
            ip: format!("{}.142", base_prefix),
            signal_strength: 68,
            last_seen: "4 mins ago".to_string(),
        },
    ];

    Ok(devices)
}

#[tauri::command]
fn get_cache_size(app_handle: tauri::AppHandle) -> Result<CacheInfo, String> {
    let cache_dir = app_handle
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?;

    let mut size = 0u64;
    let mut count = 0usize;

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

#[tauri::command]
fn clear_cache(app_handle: tauri::AppHandle) -> Result<bool, String> {
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

#[tauri::command]
fn simulate_input(cmd: InputCommand) -> Result<String, String> {
    log::info!("Simulating input command: {:?}", cmd);
    Ok(format!("Simulated action: {}", cmd.action))
}

#[tauri::command]
fn get_stored_settings(app_handle: tauri::AppHandle) -> Result<String, String> {
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

#[tauri::command]
fn save_stored_settings(app_handle: tauri::AppHandle, settings_json: String) -> Result<bool, String> {
    let config_dir = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;
    let _ = fs::create_dir_all(&config_dir);
    let settings_file = config_dir.join("settings.json");

    fs::write(settings_file, settings_json).map_err(|e| e.to_string())?;
    Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            scan_network,
            get_cache_size,
            clear_cache,
            simulate_input,
            get_stored_settings,
            save_stored_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
