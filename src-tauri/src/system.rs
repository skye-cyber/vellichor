use crate::types::SystemInfo;
use std::net::UdpSocket;
use std::process::Command;

// Dynamically retrieves all active non-loopback network IPv4 addresses from the system
pub fn get_all_local_ips() -> Vec<String> {
    let mut ips = Vec::new();

    // Query system network interfaces dynamically using 'ip -4 -o addr' on Linux
    if let Ok(output) = Command::new("ip").args(["-4", "-o", "addr"]).output() {
        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines() {
            // Line format: "3: wlo1    inet 10.9.16.220/19 brd 10.9.31.255 scope global..."
            let parts: Vec<&str> = line.split_whitespace().collect();
            if let Some(pos) = parts.iter().position(|&p| p == "inet") {
                if let Some(cidr) = parts.get(pos + 1) {
                    if let Some(ip) = cidr.split('/').next() {
                        if ip != "127.0.0.1" && !ips.contains(&ip.to_string()) {
                            ips.push(ip.to_string());
                        }
                    }
                }
            }
        }
    }

    // Fallback using active UDP socket outbound routing resolution if system tool didn't return any
    if ips.is_empty() {
        if let Some(ip) = get_primary_local_ip() {
            if ip != "127.0.0.1" {
                ips.push(ip);
            }
        }
    }

    // Always append loopback address at the end as fallback
    ips.push("127.0.0.1".to_string());
    ips
}

// Queries the outbound routing IP currently chosen by the kernel
pub fn get_primary_local_ip() -> Option<String> {
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    socket.local_addr().ok().map(|addr| addr.ip().to_string())
}

// Retrieves comprehensive system telemetry including dynamic architecture, platform, and IP bindings
#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    // Dynamic architecture from standard library (e.g. "x86_64", "aarch64", "arm")
    let arch = std::env::consts::ARCH.to_string();

    // Dynamic operating system identification
    let platform = std::env::consts::OS.to_string();

    // Hostname detection with fallback to username or machine label
    let hostname = std::env::var("HOSTNAME")
        .or_else(|_| std::env::var("USER"))
        .unwrap_or_else(|_| "Vellichor-Device".to_string());

    // Dynamic device form factor categorization
    let device_type = match platform.as_str() {
        "android" | "ios" => "phone",
        _ => "laptop",
    }
    .to_string();

    // Collect all dynamic network interface IPv4 addresses
    let local_ips = get_all_local_ips();

    SystemInfo {
        hostname,
        platform,
        arch,
        device_type,
        local_ips,
    }
}
