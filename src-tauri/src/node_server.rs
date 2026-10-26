use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::{mpsc, Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

pub const DEFAULT_NODE_PORT: u16 = 42426;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PeerPresence {
    #[serde(default)]
    pub socket_id: String,
    pub device_id: String,
    pub name: String,
    pub device_type: String,
    pub platform: String,
    pub ip: Option<String>,
    #[serde(default)]
    pub last_seen: u64,
}

struct ClientHandle {
    sender: mpsc::Sender<tungstenite::Message>,
    device_id: Mutex<Option<String>>,
    rooms: Mutex<HashSet<String>>,
}

// Active connected WebSocket clients registry
static WS_CLIENTS: Mutex<Option<HashMap<String, Arc<ClientHandle>>>> = Mutex::new(None);

// Registered peer presence registry
static ACTIVE_PEERS: Mutex<Option<HashMap<String, PeerPresence>>> = Mutex::new(None);

// Recent signals buffer for web browser clients that poll
static RECENT_SIGNALS: Mutex<Option<VecDeque<(u64, serde_json::Value)>>> = Mutex::new(None);

fn push_recent_signal(signal: serde_json::Value) {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    if let Ok(mut lock) = RECENT_SIGNALS.lock() {
        if lock.is_none() {
            *lock = Some(VecDeque::with_capacity(100));
        }
        if let Some(queue) = lock.as_mut() {
            if queue.len() >= 100 {
                queue.pop_front();
            }
            queue.push_back((now, signal));
        }
    }
}

fn get_recent_signals_since(since: u64) -> Vec<serde_json::Value> {
    let mut results = Vec::new();
    if let Ok(lock) = RECENT_SIGNALS.lock() {
        if let Some(queue) = lock.as_ref() {
            for (ts, val) in queue {
                if *ts > since {
                    results.push(val.clone());
                }
            }
        }
    }
    results
}

// Global WebSocket client registry helpers
fn register_ws_client(client_id: &str, sender: mpsc::Sender<tungstenite::Message>) -> Arc<ClientHandle> {
    let handle = Arc::new(ClientHandle {
        sender,
        device_id: Mutex::new(None),
        rooms: Mutex::new(HashSet::new()),
    });

    if let Ok(mut lock) = WS_CLIENTS.lock() {
        if lock.is_none() {
            *lock = Some(HashMap::new());
        }
        if let Some(clients) = lock.as_mut() {
            clients.insert(client_id.to_string(), Arc::clone(&handle));
        }
    }

    handle
}

fn unregister_ws_client(client_id: &str) {
    if let Ok(mut lock) = WS_CLIENTS.lock() {
        if let Some(clients) = lock.as_mut() {
            clients.remove(client_id);
        }
    }
}

fn add_client_room(client_id: &str, room: &str) {
    if let Ok(lock) = WS_CLIENTS.lock() {
        if let Some(clients) = lock.as_ref() {
            if let Some(handle) = clients.get(client_id) {
                if let Ok(mut rooms) = handle.rooms.lock() {
                    rooms.insert(room.to_string());
                }
            }
        }
    }
}

fn set_client_device_id(client_id: &str, device_id: &str) {
    if let Ok(lock) = WS_CLIENTS.lock() {
        if let Some(clients) = lock.as_ref() {
            if let Some(handle) = clients.get(client_id) {
                if let Ok(mut dev) = handle.device_id.lock() {
                    *dev = Some(device_id.to_string());
                }
                if let Ok(mut rooms) = handle.rooms.lock() {
                    rooms.insert(device_id.to_string());
                }
            }
        }
    }
}

fn broadcast_ws_message(msg: tungstenite::Message, exclude_id: Option<&str>) {
    if let Ok(lock) = WS_CLIENTS.lock() {
        if let Some(clients) = lock.as_ref() {
            for (id, handle) in clients.iter() {
                if let Some(exclude) = exclude_id {
                    if id == exclude {
                        continue;
                    }
                }
                let _ = handle.sender.send(msg.clone());
            }
        }
    }
}

fn forward_ws_signal(target_id: &str, signal_json: &serde_json::Value, exclude_id: Option<&str>) -> bool {
    use log::{debug, error, info, warn};

    let mut delivered = false;
    let msg = tungstenite::Message::Text(signal_json.to_string().into());

    let signal_type = signal_json
    .get("type")
    .and_then(|v| v.as_str())
    .unwrap_or("<none>");
    let signal_to = signal_json
    .get("to")
    .and_then(|v| v.as_str())
    .unwrap_or("<none>");

    info!(
        "[WS] forward_ws_signal: target={:?}, exclude={:?}, type={:?}, msg.to={:?}",
        target_id, exclude_id, signal_type, signal_to
    );

    let lock = match WS_CLIENTS.lock() {
        Ok(l) => l,
        Err(e) => {
            error!(
                "[WS] forward_ws_signal: failed to lock WS_CLIENTS: {} — nothing delivered",
                e
            );
            return false;
        }
    };

    let clients = match lock.as_ref() {
        Some(c) => c,
        None => {
            warn!(
                "[WS] forward_ws_signal: WS_CLIENTS is None — no clients registered, nothing delivered to target={:?}",
                target_id
            );
            return false;
        }
    };

    debug!(
        "[WS] forward_ws_signal: scanning {} connected client(s) for target={:?}",
           clients.len(),
           target_id
    );

    for (id, handle) in clients.iter() {
        if let Some(exclude) = exclude_id {
            if id == exclude {
                debug!(
                    "[WS] forward_ws_signal: skipping excluded client id={:?}",
                    id
                );
                continue;
            }
        }

        let matches_id = id == target_id;
        let matches_dev = handle
        .device_id
        .lock()
        .map(|d| d.as_deref() == Some(target_id))
        .unwrap_or(false);
        let matches_room = handle
        .rooms
        .lock()
        .map(|r| r.contains(target_id))
        .unwrap_or(false);

        if matches_id || matches_dev || matches_room {
            debug!(
                "[WS] forward_ws_signal: matched client id={:?} (by id={}, dev={}, room={})",
                   id, matches_id, matches_dev, matches_room
            );

            match handle.sender.send(msg.clone()) {
                Ok(_) => {
                    delivered = true;
                    info!(
                        "[WS] forward_ws_signal: delivered {:?} to client id={:?}",
                        signal_type, id
                    );
                }
                Err(e) => {
                    warn!(
                        "[WS] forward_ws_signal: send failed to client id={:?}: {} — client likely disconnected",
                        id, e
                    );
                }
            }
        } else {
            debug!(
                "[WS] forward_ws_signal: client id={:?} did not match target={:?}",
                id, target_id
            );
        }
    }

    if delivered {
        info!(
            "[WS] forward_ws_signal: completed — target={:?}, type={:?}, delivered=true",
            target_id, signal_type
        );
    } else {
        warn!(
            "[WS] forward_ws_signal: completed — target={:?}, type={:?}, delivered=false (no matching client)",
              target_id, signal_type
        );
    }

    delivered
}

// Active peers registry helpers
fn upsert_active_peer(peer: PeerPresence) {
    if let Ok(mut lock) = ACTIVE_PEERS.lock() {
        if lock.is_none() {
            *lock = Some(HashMap::new());
        }
        if let Some(peers) = lock.as_mut() {
            peers.insert(peer.device_id.clone(), peer);
        }
    }
}

fn remove_active_peer(device_id: &str) {
    if let Ok(mut lock) = ACTIVE_PEERS.lock() {
        if let Some(peers) = lock.as_mut() {
            peers.remove(device_id);
        }
    }
}

pub fn get_active_peers() -> Vec<PeerPresence> {
    if let Ok(lock) = ACTIVE_PEERS.lock() {
        if let Some(peers) = lock.as_ref() {
            return peers.values().cloned().collect();
        }
    }
    Vec::new()
}

fn broadcast_peers_update(exclude: Option<&str>) {
    let peers = get_active_peers();
    let msg_json = serde_json::json!({
        "type": "peers-update",
        "peers": peers
    });
    broadcast_ws_message(tungstenite::Message::Text(msg_json.to_string().into()), exclude);
}

// Starts the decentralized peer node TCP/HTTP/WebSocket signaling server on every running Vellichor device
pub fn start_node_server(app_handle: AppHandle) {
    thread::spawn(move || {
        let listener = match TcpListener::bind(format!("0.0.0.0:{}", DEFAULT_NODE_PORT)) {
            Ok(l) => {
                log::info!("Vellichor peer node server listening on port {}", DEFAULT_NODE_PORT);
                l
            }
            Err(e) => {
                log::warn!("Could not bind node server on port {}: {}", DEFAULT_NODE_PORT, e);
                // Try fallback port 42427
                match TcpListener::bind("0.0.0.0:42427") {
                    Ok(l) => {
                        log::info!("Vellichor peer node server listening on fallback port 42427");
                        l
                    }
                    Err(e2) => {
                        log::error!("Failed to start peer node server: {}", e2);
                        return;
                    }
                }
            }
        };

        let app_arc = Arc::new(app_handle);

        for stream_res in listener.incoming() {
            match stream_res {
                Ok(stream) => {
                    let app_clone = Arc::clone(&app_arc);
                    thread::spawn(move || {
                        handle_connection(stream, app_clone);
                    });
                }
                Err(e) => {
                    log::warn!("Node server connection accept error: {}", e);
                }
            }
        }
    });
}

fn handle_connection(stream: TcpStream, app_handle: Arc<AppHandle>) {
    use log::{debug, error, info, warn};

    // Log the peer address if available, for correlation with other logs.
    let peer_addr = stream
    .peer_addr()
    .map(|a| a.to_string())
    .unwrap_or_else(|_| "<unknown>".to_string());
    info!("[SERVER] handle_connection: incoming connection from {}", peer_addr);

    match stream.set_read_timeout(Some(Duration::from_secs(5))) {
        Ok(_) => debug!(
            "[SERVER] {}: read timeout set to 5s",
            peer_addr
        ),
        Err(e) => warn!(
            "[SERVER] {}: failed to set read timeout: {} (kind: {:?})",
                        peer_addr,
                        e,
                        e.kind()
        ),
    }

    match stream.set_write_timeout(Some(Duration::from_secs(5))) {
        Ok(_) => debug!(
            "[SERVER] {}: write timeout set to 5s",
            peer_addr
        ),
        Err(e) => warn!(
            "[SERVER] {}: failed to set write timeout: {} (kind: {:?})",
                        peer_addr,
                        e,
                        e.kind()
        ),
    }

    // Peek the initial bytes of incoming TCP stream to detect WebSocket upgrade
    let mut peek_buf = [0u8; 1024];
    let peek_len = match stream.peek(&mut peek_buf) {
        Ok(n) if n > 0 => {
            debug!(
                "[SERVER] {}: peeked {} initial byte(s) for protocol detection",
                   peer_addr, n
            );
            n
        }
        Ok(_) => {
            warn!(
                "[SERVER] {}: peek returned 0 bytes (empty stream), dropping connection",
                  peer_addr
            );
            return;
        }
        Err(e) => {
            warn!(
                "[SERVER] {}: peek failed: {} (kind: {:?}), dropping connection",
                  peer_addr,
                  e,
                  e.kind()
            );
            return;
        }
    };

    let peek_str = String::from_utf8_lossy(&peek_buf[..peek_len]).to_lowercase();
    let is_ws_upgrade = peek_str.contains("upgrade: websocket")
    || (peek_str.contains("upgrade") && peek_str.contains("websocket"));

    // Log a short preview of the first line (request line) to help diagnose
    // protocol misdetection. Truncate to keep logs readable.
    let first_line = peek_str.lines().next().unwrap_or("");
    let first_line_preview = if first_line.len() > 120 {
        format!("{}…", &first_line[..120])
    } else {
        first_line.to_string()
    };

    if is_ws_upgrade {
        info!(
            "[SERVER] {}: detected WebSocket upgrade (request line: {:?}) → handle_websocket_connection",
              peer_addr, first_line_preview
        );
        handle_websocket_connection(stream, app_handle);
    } else {
        info!(
            "[SERVER] {}: treating as HTTP request (request line: {:?}) → handle_http_connection",
              peer_addr, first_line_preview
        );
        handle_http_connection(stream, app_handle);
    }

    debug!(
        "[SERVER] {}: handle_connection returning (dispatched to {})",
           peer_addr,
           if is_ws_upgrade { "websocket handler" } else { "http handler" }
    );
}

// Handles upgraded WebSocket connections (RFC 6455)
fn handle_websocket_connection(stream: TcpStream, app_handle: Arc<AppHandle>) {
    let _ = stream.set_read_timeout(Some(Duration::from_millis(100)));
    let _ = stream.set_write_timeout(Some(Duration::from_secs(5)));

    let mut ws = match tungstenite::accept(stream) {
        Ok(w) => w,
        Err(e) => {
            log::warn!("WebSocket handshake error: {}", e);
            return;
        }
    };

    let client_id = format!(
        "ws-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_micros())
            .unwrap_or(0)
    );

    let (tx, rx) = mpsc::channel::<tungstenite::Message>();
    let _handle = register_ws_client(&client_id, tx.clone());

    // 1. Send welcome & connection acknowledge
    let welcome = serde_json::json!({
        "type": "connect",
        "socketId": client_id,
        "message": "Connected to Vellichor node WebSocket server"
    });
    let _ = tx.send(tungstenite::Message::Text(welcome.to_string().into()));

    // 2. Send current registered active peers
    let current_peers = get_active_peers();
    let peers_msg = serde_json::json!({
        "type": "peers-update",
        "peers": current_peers
    });
    let _ = tx.send(tungstenite::Message::Text(peers_msg.to_string().into()));

    // 3. Replay recent signals from last 15 seconds to ensure signals arriving during connection setup are not missed
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    let recent = get_recent_signals_since(now_ms.saturating_sub(15_000));
    if !recent.is_empty() {
        log::info!("[WS] Replaying {} recent signal(s) to newly connected client {}", recent.len(), client_id);
        for sig in recent {
            let replay_msg = if sig.get("type").is_some() {
                sig
            } else {
                serde_json::json!({
                    "type": "signal",
                    "from": sig.get("from").cloned().unwrap_or(serde_json::Value::String("remote".into())),
                    "fromDeviceId": sig.get("fromDeviceId").cloned(),
                    "signal": sig.get("signal").cloned().unwrap_or(sig.clone()),
                    "to": sig.get("to").cloned()
                })
            };
            let _ = tx.send(tungstenite::Message::Text(replay_msg.to_string().into()));
        }
    }

    let mut registered_device_id: Option<String> = None;

    loop {
        // Drain outgoing messages from channel to write over WebSocket
        while let Ok(msg) = rx.try_recv() {
            if let Err(e) = ws.send(msg) {
                log::debug!("WS write error for client {}: {}", client_id, e);
                break;
            }
        }

        // Read incoming WebSocket frames
        match ws.read() {
            Ok(tungstenite::Message::Text(text)) => {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                    let msg_type = val.get("type").and_then(|v| v.as_str()).unwrap_or("");

                    match msg_type {
                        "join-room" => {
                            if let Some(room) = val.get("room").and_then(|v| v.as_str()) {
                                add_client_room(&client_id, room);
                            }
                        }
                        "register-presence" => {
                            let presence_val = val.get("presence").or(Some(&val));
                            if let Some(p) = presence_val {
                                if let Ok(mut peer) = serde_json::from_value::<PeerPresence>(p.clone()) {
                                    peer.socket_id = client_id.clone();
                                    peer.last_seen = SystemTime::now()
                                        .duration_since(UNIX_EPOCH)
                                        .map(|d| d.as_millis() as u64)
                                        .unwrap_or(0);

                                    registered_device_id = Some(peer.device_id.clone());
                                    set_client_device_id(&client_id, &peer.device_id);
                                    upsert_active_peer(peer.clone());
                                    // Exclude self from echo
                                    broadcast_peers_update(Some(&client_id));

                                    let _ = app_handle.emit("peer-presence-update", &peer);
                                }
                            }
                        }
                        "get-peers" => {
                            let peers = get_active_peers();
                            let resp = serde_json::json!({
                                "type": "peers-update",
                                "peers": peers
                            });
                            let _ = tx.send(tungstenite::Message::Text(resp.to_string().into()));
                        }
                        "signal" => {
                            let to = val.get("to").and_then(|v| v.as_str());
                            let room_id = val.get("roomId").and_then(|v| v.as_str());
                            let signal_payload = val.get("signal").cloned().unwrap_or(serde_json::Value::Null);

                            let forwarded = serde_json::json!({
                                "type": "signal",
                                "from": client_id,
                                "fromDeviceId": registered_device_id.clone().unwrap_or_else(|| client_id.clone()),
                                "signal": signal_payload,
                                "to": to,
                                "roomId": room_id
                            });

                            // Forward outgoing signal to destination WebSocket clients (excluding sender)
                            if let Some(target) = to {
                                forward_ws_signal(target, &forwarded, Some(&client_id));
                            } else if let Some(room) = room_id {
                                forward_ws_signal(room, &forwarded, Some(&client_id));
                            } else {
                                broadcast_ws_message(
                                    tungstenite::Message::Text(forwarded.to_string().into()),
                                    Some(&client_id),
                                );
                            }
                        }
                        _ => {}
                    }
                }
            }
            Ok(tungstenite::Message::Binary(bin)) => {
                // Direct binary frame transport (ADR-001)
                let _ = app_handle.emit("p2p-direct-binary", bin.to_vec());
            }
            Ok(tungstenite::Message::Ping(data)) => {
                let _ = ws.send(tungstenite::Message::Pong(data));
            }
            Ok(tungstenite::Message::Close(_)) => {
                break;
            }
            Err(tungstenite::Error::Io(ref e))
                if e.kind() == std::io::ErrorKind::WouldBlock
                    || e.kind() == std::io::ErrorKind::TimedOut =>
            {
                // Timeout on read, briefly yield before pumping channel
                thread::sleep(Duration::from_millis(5));
            }
            Err(tungstenite::Error::ConnectionClosed)
            | Err(tungstenite::Error::AlreadyClosed) => {
                break;
            }
            Err(e) => {
                log::debug!("WS read error for {}: {}", client_id, e);
                break;
            }
            _ => {}
        }
    }

    // Unregister client and notify peer departures
    unregister_ws_client(&client_id);
    if let Some(ref dev_id) = registered_device_id {
        remove_active_peer(dev_id);
        broadcast_peers_update(None);
    }
}

// Handles standard HTTP request endpoints
fn handle_http_connection(mut stream: TcpStream, app_handle: Arc<AppHandle>) {
    use log::{debug, error, info, warn};

    let peer_addr = stream
    .peer_addr()
    .map(|a| a.to_string())
    .unwrap_or_else(|_| "<unknown>".to_string());
    info!("[HTTP] {}: handling HTTP connection", peer_addr);

    let mut reader = BufReader::new(match stream.try_clone() {
        Ok(s) => s,
                                    Err(e) => {
                                        error!(
                                            "[HTTP] {}: failed to clone stream for reader: {} (kind: {:?})",
                                               peer_addr,
                                               e,
                                               e.kind()
                                        );
                                        return;
                                    }
    });

    let mut request_line = String::new();
    if let Err(e) = reader.read_line(&mut request_line) {
        warn!(
            "[HTTP] {}: failed to read request line: {} (kind: {:?})",
              peer_addr,
              e,
              e.kind()
        );
        return;
    }
    if request_line.is_empty() {
        warn!("[HTTP] {}: empty request line, dropping connection", peer_addr);
        return;
    }
    debug!(
        "[HTTP] {}: request line: {:?}",
        peer_addr,
        request_line.trim_end()
    );

    let parts: Vec<&str> = request_line.split_whitespace().collect();
    if parts.len() < 2 {
        warn!(
            "[HTTP] {}: malformed request line (only {} part(s)): {:?}",
              peer_addr,
              parts.len(),
              request_line.trim_end()
        );
        return;
    }

    let method = parts[0];
    let path = parts[1];
    info!("[HTTP] {}: {} {}", peer_addr, method, path);

    let mut content_length = 0usize;
    loop {
        let mut header_line = String::new();
        if reader.read_line(&mut header_line).is_err()
            || header_line == "\r\n"
            || header_line == "\n"
            || header_line.is_empty()
            {
                break;
            }
            let lower = header_line.to_lowercase();
        if lower.starts_with("content-length:") {
            if let Some(val_str) = lower.split(':').nth(1) {
                content_length = val_str.trim().parse::<usize>().unwrap_or(0);
                debug!(
                    "[HTTP] {}: parsed Content-Length = {}",
                    peer_addr, content_length
                );
            } else {
                warn!(
                    "[HTTP] {}: Content-Length header present but unparseable: {:?}",
                    peer_addr,
                    header_line.trim_end()
                );
            }
        }
    }

    // CORS preflight options
    if method == "OPTIONS" {
        debug!("[HTTP] {}: responding to CORS preflight (OPTIONS)", peer_addr);
        let response = "HTTP/1.1 204 No Content\r\n\
Access-Control-Allow-Origin: *\r\n\
Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n\
Access-Control-Allow-Headers: Content-Type, Authorization, *\r\n\
Access-Control-Max-Age: 86400\r\n\
Connection: close\r\n\r\n";
        if let Err(e) = stream.write_all(response.as_bytes()) {
            error!(
                "[HTTP] {}: failed to write OPTIONS response: {} (kind: {:?})",
                   peer_addr,
                   e,
                   e.kind()
            );
        }
        let _ = stream.flush();
        info!("[HTTP] {}: OPTIONS preflight completed (204)", peer_addr);
        return;
    }

    // Health / node info endpoint
    if method == "GET" && (path == "/health" || path == "/api/status" || path == "/") {
        info!("[HTTP] {}: serving node info at {}", peer_addr, path);
        let my_sys = crate::system::get_system_info();
        let body = serde_json::json!({
            "status": "healthy",
            "node": "vellichor",
            "port": DEFAULT_NODE_PORT,
            "device": {
                "id": my_sys.device_id,
                "name": my_sys.hostname,
                "platform": my_sys.platform,
                "type": my_sys.device_type,
                "ips": my_sys.local_ips
            }
        });
        let body_str = body.to_string();
        debug!(
            "[HTTP] {}: node info response body ({} bytes)",
               peer_addr,
               body_str.len()
        );
        let response = format!(
            "HTTP/1.1 200 OK\r\n\
Content-Type: application/json\r\n\
Content-Length: {}\r\n\
Access-Control-Allow-Origin: *\r\n\
Connection: close\r\n\r\n{}",
body_str.len(),
                               body_str
        );
        if let Err(e) = stream.write_all(response.as_bytes()) {
            error!(
                "[HTTP] {}: failed to write node info response: {} (kind: {:?})",
                   peer_addr,
                   e,
                   e.kind()
            );
        }
        let _ = stream.flush();
        info!("[HTTP] {}: node info served (200)", peer_addr);
        return;
    }

    // Active peers list endpoint
    if method == "GET" && (path == "/api/peers" || path == "/peers") {
        info!("[HTTP] {}: listing active peers", peer_addr);
        let peers = get_active_peers();
        let body_str = serde_json::to_string(&peers).unwrap_or_else(|e| {
            warn!(
                "[HTTP] {}: failed to serialize peers list: {} — returning empty array",
                peer_addr, e
            );
            "[]".to_string()
        });
        debug!(
            "[HTTP] {}: peers response body: {}",
            peer_addr, body_str
        );
        let response = format!(
            "HTTP/1.1 200 OK\r\n\
Content-Type: application/json\r\n\
Content-Length: {}\r\n\
Access-Control-Allow-Origin: *\r\n\
Connection: close\r\n\r\n{}",
body_str.len(),
                               body_str
        );
        if let Err(e) = stream.write_all(response.as_bytes()) {
            error!(
                "[HTTP] {}: failed to write peers response: {} (kind: {:?})",
                   peer_addr,
                   e,
                   e.kind()
            );
        }
        let _ = stream.flush();
        info!("[HTTP] {}: peers list served (200)", peer_addr);
        return;
    }

    // Incoming peer signal endpoint
    if method == "POST" && (path == "/api/signal" || path == "/signal") {
        info!(
            "[HTTP] {}: incoming signal POST ({} body bytes)",
              peer_addr, content_length
        );
        let mut body = vec![0u8; content_length];
        if content_length > 0 {
            if let Err(e) = reader.read_exact(&mut body) {
                error!(
                    "[HTTP] {}: failed to read signal body ({} bytes): {} (kind: {:?})",
                       peer_addr,
                       content_length,
                       e,
                       e.kind()
                );
                return;
            }
        }
        let body_preview = String::from_utf8_lossy(&body);
        debug!(
            "[HTTP] {}: signal body preview: {}",
            peer_addr,
            if body_preview.len() > 512 {
                format!("{}…", &body_preview[..512])
            } else {
                body_preview.to_string()
            }
        );

        if let Ok(parsed) = serde_json::from_slice::<serde_json::Value>(&body) {
            info!(
                "[HTTP] {}: parsed signal (type: {:?}, to: {:?})",
                  peer_addr,
                  parsed.get("signal").and_then(|s| s.get("type")).and_then(|v| v.as_str()),
                  parsed.get("to").and_then(|v| v.as_str())
            );

            // Push to recent signals ring buffer
            push_recent_signal(parsed.clone());
            debug!("[HTTP] {}: signal pushed to recent buffer", peer_addr);

            // Emit signal to frontend webview
            if let Err(e) = app_handle.emit("p2p-signal", &parsed) {
                warn!(
                    "[HTTP] {}: failed to emit p2p-signal to frontend: {}",
                    peer_addr, e
                );
            } else {
                debug!("[HTTP] {}: emitted p2p-signal to frontend", peer_addr);
            }

            // Also broadcast incoming signal to all connected WebSocket clients on this device
            let ws_msg = if parsed.get("type").is_some() {
                parsed.clone()
            } else {
                serde_json::json!({
                    "type": "signal",
                    "from": parsed.get("from").cloned().unwrap_or(serde_json::Value::String("remote".into())),
                    "fromDeviceId": parsed.get("fromDeviceId").cloned(),
                    "signal": parsed.get("signal").cloned().unwrap_or(parsed.clone()),
                    "to": parsed.get("to").cloned()
                })
            };

            // An incoming HTTP signal from a remote peer is addressed to THIS local node.
            // Always broadcast it to all local WebSocket clients connected to this node!
            info!(
                "[HTTP] {}: broadcasting incoming remote signal to all local WS clients (to={:?}, type={:?})",
                peer_addr,
                ws_msg.get("to"),
                ws_msg.get("signal").and_then(|s| s.get("type"))
            );
            broadcast_ws_message(tungstenite::Message::Text(ws_msg.to_string().into()), None);

            let resp = "{\"success\":true}";
            let response = format!(
                "HTTP/1.1 200 OK\r\n\
Content-Type: application/json\r\n\
Content-Length: {}\r\n\
Access-Control-Allow-Origin: *\r\n\
Connection: close\r\n\r\n{}",
resp.len(),
                                   resp
            );
            if let Err(e) = stream.write_all(response.as_bytes()) {
                error!(
                    "[HTTP] {}: failed to write signal 200 response: {} (kind: {:?})",
                       peer_addr,
                       e,
                       e.kind()
                );
            }
            let _ = stream.flush();
            info!("[HTTP] {}: signal handled (200)", peer_addr);
            return;
        } else {
            warn!(
                "[HTTP] {}: received signal body was not valid JSON ({} bytes) — falling through",
                  peer_addr,
                  body.len()
            );
        }
    }

    // Polling endpoint for web browser clients
    if method == "GET" && path.starts_with("/api/poll") {
        let mut since = 0u64;
        if let Some(pos) = path.find("since=") {
            let num_str = &path[pos + 6..];
            let end = num_str.find('&').unwrap_or(num_str.len());
            since = num_str[..end].parse::<u64>().unwrap_or(0);
        }
        debug!("[HTTP] {}: poll request with since={}", peer_addr, since);

        let mut filtered = Vec::new();
        if let Ok(lock) = RECENT_SIGNALS.lock() {
            if let Some(queue) = lock.as_ref() {
                for (ts, val) in queue {
                    if *ts > since {
                        filtered.push(val.clone());
                    }
                }
            } else {
                debug!("[HTTP] {}: RECENT_SIGNALS buffer is None", peer_addr);
            }
        } else {
            warn!("[HTTP] {}: failed to lock RECENT_SIGNALS", peer_addr);
        }

        debug!(
            "[HTTP] {}: returning {} signal(s) for since={}",
               peer_addr,
               filtered.len(),
               since
        );
        let body_str = serde_json::to_string(&filtered).unwrap_or_else(|e| {
            warn!(
                "[HTTP] {}: failed to serialize poll results: {} — returning empty array",
                peer_addr, e
            );
            "[]".to_string()
        });
        let response = format!(
            "HTTP/1.1 200 OK\r\n\
Content-Type: application/json\r\n\
Content-Length: {}\r\n\
Access-Control-Allow-Origin: *\r\n\
Connection: close\r\n\r\n{}",
body_str.len(),
                               body_str
        );
        if let Err(e) = stream.write_all(response.as_bytes()) {
            error!(
                "[HTTP] {}: failed to write poll response: {} (kind: {:?})",
                   peer_addr,
                   e,
                   e.kind()
            );
        }
        let _ = stream.flush();
        info!(
            "[HTTP] {}: poll served (200, {} signal(s))",
              peer_addr,
              filtered.len()
        );
        return;
    }

    // Default 404
    warn!(
        "[HTTP] {}: no route matched for {} {} — returning 404",
        peer_addr, method, path
    );
    let not_found = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
    if let Err(e) = stream.write_all(not_found.as_bytes()) {
        error!(
            "[HTTP] {}: failed to write 404 response: {} (kind: {:?})",
               peer_addr,
               e,
               e.kind()
        );
    }
    let _ = stream.flush();
}

// Sends an outgoing P2P signal directly to another peer node's embedded server
#[tauri::command]
pub async fn send_peer_signal(
    target_ip: String,
    target_port: Option<u16>,
    payload: serde_json::Value,
) -> Result<bool, String> {
    let port = target_port.unwrap_or(DEFAULT_NODE_PORT);
    let addr = format!("{}:{}", target_ip, port);
    log::info!("[SERVER] Target: {}", addr);

    // Log the payload being sent (truncated for safety).
    let payload_preview = payload.to_string();
    log::info!(
        "[SERVER] Sending signal to {} — payload ({} bytes): {}",
              addr,
              payload_preview.len(),
              if payload_preview.len() > 512 {
                  format!("{}…", &payload_preview[..512])
              } else {
                  payload_preview.clone()
              }
    );

    let socket_addr = match addr.parse::<std::net::SocketAddr>() {
        Ok(sa) => {
            log::info!("[SERVER] Parsed address directly: {}", sa);
            sa
        }
        Err(parse_err) => {
            log::info!(
                "[SERVER] Direct parse failed ({}), attempting DNS resolution for {}",
                      parse_err,
                      addr
            );
            use std::net::ToSocketAddrs;
            match addr.to_socket_addrs().map(|mut i| i.next()) {
                Ok(Some(sa)) => {
                    log::info!("[SERVER] Resolved address: {}", sa);
                    sa
                }
                Ok(None) => {
                    log::error!("[SERVER] DNS resolution returned no addresses for {}", addr);
                    return Err(format!("Invalid peer socket address: {}", addr));
                }
                Err(e) => {
                    log::error!("[SERVER] DNS resolution failed for {}: {}", addr, e);
                    return Err(format!("Invalid peer socket address: {}", addr));
                }
            }
        }
    };

    log::info!(
        "[SERVER] Connecting to peer at {} (timeout: 3s)",
              socket_addr
    );

    let mut stream = match TcpStream::connect_timeout(&socket_addr, Duration::from_secs(3)) {
        Ok(s) => {
            log::info!("[SERVER] TCP connection established to {}", socket_addr);
            s
        }
        Err(e) => {
            log::error!(
                "[SERVER] Failed to connect to peer {}: {} (kind: {:?})",
                       socket_addr,
                       e,
                       e.kind()
            );
            return Err(format!("Could not connect to peer {}: {}", addr, e));
        }
    };

    let body = match serde_json::to_vec(&payload) {
        Ok(b) => {
            log::info!("[SERVER] Serialized payload body: {} bytes", b.len());
            b
        }
        Err(e) => {
            log::error!("[SERVER] Failed to serialize payload: {}", e);
            return Err(e.to_string());
        }
    };

    let req = format!(
        "POST /api/signal HTTP/1.1\r\n\
Host: {}\r\n\
Content-Type: application/json\r\n\
Content-Length: {}\r\n\
Connection: close\r\n\r\n",
addr,
body.len()
    );

    log::info!(
        "[SERVER] Writing HTTP request headers to {} (Content-Length: {})",
              socket_addr,
              body.len()
    );

    if let Err(e) = stream.write_all(req.as_bytes()) {
        log::error!(
            "[SERVER] Failed to write request headers to {}: {} (kind: {:?})",
                   socket_addr,
                   e,
                   e.kind()
        );
        return Err(e.to_string());
    }

    log::info!(
        "[SERVER] Writing {} body bytes to {}",
        body.len(),
              socket_addr
    );

    if let Err(e) = stream.write_all(&body) {
        log::error!(
            "[SERVER] Failed to write request body to {}: {} (kind: {:?})",
                   socket_addr,
                   e,
                   e.kind()
        );
        return Err(e.to_string());
    }

    if let Err(e) = stream.flush() {
        log::error!(
            "[SERVER] Failed to flush stream to {}: {} (kind: {:?})",
                   socket_addr,
                   e,
                   e.kind()
        );
        return Err(e.to_string());
    }

    log::info!(
        "[SERVER] Signal successfully sent to {} — closing connection",
        socket_addr
    );

    Ok(true)
}

// Queries local peer node server status
#[tauri::command]
pub fn get_node_status() -> serde_json::Value {
    let my_sys = crate::system::get_system_info();
    serde_json::json!({
        "running": true,
        "port": DEFAULT_NODE_PORT,
        "device_id": my_sys.device_id,
        "hostname": my_sys.hostname,
        "local_ips": my_sys.local_ips
    })
}
