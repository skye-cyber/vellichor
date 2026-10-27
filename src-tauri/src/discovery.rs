use crate::system::{get_primary_local_ip, get_system_info};
use crate::types::{DiscoveredDevice, DiscoveryMessage};
use std::collections::HashMap;
use std::fs;
use std::net::UdpSocket;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::{Duration, Instant};
use crate::paths;
use crate::device_id::get_or_create_device_id;


static DISCOVERY_STARTED: AtomicBool = AtomicBool::new(false);

// Background UDP listener daemon that responds to discovery probes from other Vellichor instances
pub fn ensure_discovery_listener_running() {
    if DISCOVERY_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }

    thread::spawn(move || {
        let socket = match UdpSocket::bind("0.0.0.0:42424") {
            Ok(s) => s,
            Err(e) => {
                log::warn!("Could not bind UDP discovery socket on port 42424: {}", e);
                return;
            }
        };
        let _ = socket.set_broadcast(true);
        let my_id = get_or_create_device_id();
        let my_sys = get_system_info();
        let mut buf = [0u8; 2048];

        loop {
            if let Ok((len, src)) = socket.recv_from(&mut buf) {
                if let Ok(msg) = serde_json::from_slice::<DiscoveryMessage>(&buf[..len]) {
                    // Only respond to request packets from other devices
                    if msg.msg_type == "DISCOVERY_REQUEST" && msg.id != my_id {
                        let response = DiscoveryMessage {
                            msg_type: "DISCOVERY_RESPONSE".to_string(),
                            id: my_id.clone(),
                            name: my_sys.hostname.clone(),
                            device_type: my_sys.device_type.clone(),
                            platform: my_sys.platform.clone(),
                            port: crate::node_server::DEFAULT_NODE_PORT,
                            ip: get_primary_local_ip(),
                        };
                        if let Ok(resp_bytes) = serde_json::to_vec(&response) {
                            let _ = socket.send_to(&resp_bytes, src);
                        }
                    }
                }
            }
        }
    });
}

// Scans local network interfaces using UDP broadcast datagrams and the kernel ARP cache
#[tauri::command]
pub async fn scan_network() -> Result<Vec<DiscoveredDevice>, String> {
    ensure_discovery_listener_running();
    let my_id = get_or_create_device_id();
    let my_sys = get_system_info();

    // Normalize once. If we can't determine our own IP, we still run the scan,
    // but the self-guards degrade to ID-only matching (still correct, just weaker).
    let my_ip: Option<String> = get_primary_local_ip();

    // Helper: is this IP address ours?
    let is_self_ip = |candidate: Option<&str>| -> bool {
        match (candidate, my_ip.as_deref()) {
            (Some(c), Some(m)) => c == m,
            _ => false,
        }
    };

    // Collect broadcast targets including universal broadcast and interface subnets
    let mut broadcast_addrs = vec!["255.255.255.255:42424".to_string()];

    if let Ok(output) = std::process::Command::new("ip").args(["-4", "-o", "addr"]).output() {
        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines() {
            if let Some(idx) = line.find("brd ") {
                let rest = &line[idx + 4..];
                if let Some(brd_ip) = rest.split_whitespace().next() {
                    broadcast_addrs.push(format!("{}:42424", brd_ip));
                }
            }
        }
    }

    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    let _ = socket.set_broadcast(true);
    let _ = socket.set_read_timeout(Some(Duration::from_millis(600)));

    let req = DiscoveryMessage {
        msg_type: "DISCOVERY_REQUEST".to_string(),
        id: my_id.clone(),
        name: my_sys.hostname.clone(),
        device_type: my_sys.device_type.clone(),
        platform: my_sys.platform.clone(),
        port: crate::node_server::DEFAULT_NODE_PORT,
        // Pass the Option through directly — the field is Option<String>
        ip: my_ip.clone(),
    };
    let req_bytes = serde_json::to_vec(&req).map_err(|e| e.to_string())?;

    for brd in &broadcast_addrs {
        let _ = socket.send_to(&req_bytes, brd);
    }

    // Inspect kernel ARP table (/proc/net/arp) to identify active connected LAN peers
    let mut arp_ips = Vec::new();
    if let Ok(arp_content) = fs::read_to_string("/proc/net/arp") {
        for line in arp_content.lines().skip(1) {
            let cols: Vec<&str> = line.split_whitespace().collect();
            if cols.len() >= 6 {
                let ip = cols[0];
                let flags = cols[2];
                let mac = cols[3];
                let iface = cols[5];

                if flags == "0x2" && mac != "00:00:00:00:00:00" {
                    // Skip our own IP — some kernels list the local interface in the ARP cache.
                    // `ip` here is &str, so compare against my_ip.as_deref().
                    if is_self_ip(Some(ip)) {
                        continue;
                    }
                    let _ = socket.send_to(&req_bytes, format!("{}:42424", ip));
                    arp_ips.push((ip.to_string(), mac.to_string(), iface.to_string()));
                }
            }
        }
    }

    let mut devices: HashMap<String, DiscoveredDevice> = HashMap::new();

    // Listen for UDP responses within the probing window
    let mut buf = [0u8; 2048];
    let start = Instant::now();
    while start.elapsed() < Duration::from_millis(700) {
        if let Ok((len, src)) = socket.recv_from(&mut buf) {
            if let Ok(msg) = serde_json::from_slice::<DiscoveryMessage>(&buf[..len]) {
                if msg.msg_type == "DISCOVERY_RESPONSE" && msg.id != my_id {
                    let src_ip = src.ip().to_string();
                    let sender_ip = msg.ip.clone().unwrap_or_else(|| src_ip.clone());

                    // Drop our own traffic even if the ID mismatched (mobile multi-homed /
                    // stale-ID case). Check both the payload-advertised IP and the socket source.
                    if is_self_ip(Some(sender_ip.as_str())) || is_self_ip(Some(src_ip.as_str())) {
                        continue;
                    }

                    let dev = DiscoveredDevice {
                        id: msg.id.clone(),
                        name: msg.name,
                        device_type: msg.device_type,
                        platform: msg.platform,
                        status: "online".to_string(),
                        ip: sender_ip,
                        signal_strength: 95,
                        last_seen: "just now".to_string(),
                        port: msg.port,
                    };
                    devices.insert(msg.id, dev);
                }
            }
        }
    }

    // Include confirmed active ARP peers on local subnets if not already discovered via UDP
    for (ip, _mac, iface) in arp_ips {
        break; // For now skip
        if ip.ends_with(".1") && iface.starts_with("wl") {
            continue;
        }

        // Never fabricate a device for ourselves — this is the +1-per-scan bug.
        if is_self_ip(Some(ip.as_str())) {
            continue;
        }

        let already_found = devices.values().any(|d: &DiscoveredDevice| d.ip == ip);
        if !already_found {
            let (dev_type, platform, name) = if iface.starts_with("xa") || iface.starts_with("ap") {
                ("phone".to_string(), "android".to_string(), format!("Android Device ({})", ip))
            } else {
                ("laptop".to_string(), "linux".to_string(), format!("LAN Device ({})", ip))
            };

            let dev = DiscoveredDevice {
                id: format!("peer-{}", ip.replace('.', "-")),
                name,
                device_type: dev_type,
                platform,
                status: "online".to_string(),
                ip: ip.clone(),
                signal_strength: 88,
                last_seen: "just now".to_string(),
                port: crate::node_server::DEFAULT_NODE_PORT,
            };
            devices.insert(dev.id.clone(), dev);
        }
    }

    Ok(devices.into_values().collect())
}
