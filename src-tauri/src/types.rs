use serde::{Deserialize, Serialize};

// System information containing dynamic hardware, architecture, and network IPs
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemInfo {
    pub hostname: String,
    pub platform: String,
    pub arch: String,
    pub device_type: String,
    pub local_ips: Vec<String>,
    pub device_id: String,
}

// Discovered device representation across LAN UDP broadcast and ARP discovery
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
    pub port: u16,
}

// Cache storage information for the application cache directory
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CacheInfo {
    pub size_bytes: u64,
    pub files_count: usize,
    pub last_cleared: String,
}

// Simulation command for remote cursor movement, clicks, and keystrokes
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InputCommand {
    pub action: String, // "mousemove", "mousedown", "mouseup", "click", "keypress", "scroll"
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub button: Option<String>,
    pub key: Option<String>,
    pub delta_y: Option<f64>,
}

// UDP discovery broadcast datagram message structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiscoveryMessage {
    pub msg_type: String, // "DISCOVERY_REQUEST" | "DISCOVERY_RESPONSE"
    pub id: String,
    pub name: String,
    pub device_type: String,
    pub platform: String,
    pub port: u16,
    pub ip: Option<String>,
}

// Metadata for file transfer operations
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileMetadata {
    pub id: String,
    pub name: String,
    pub size: u64,
    pub mime_type: String,
    pub checksum: Option<String>,
}
