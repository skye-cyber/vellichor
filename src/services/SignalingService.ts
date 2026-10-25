import { TauriNativeService } from './TauriNativeService';

export type SignalCallback = (data: { from: string; fromDeviceId?: string; signal: any }) => void;
export type ConnectionStatusCallback = (connected: boolean, socketId?: string) => void;
export type PeersUpdateCallback = (peers: any[]) => void;

export interface RegisteredPresence {
  deviceId: string;
  name: string;
  deviceType: string;
  platform: string;
  ip?: string;
}

export interface PeerEndpoint {
  ip: string;
  port: number;
}

class SignalingServiceClass {
  private ws: WebSocket | null = null;
  private joinedRooms: Set<string> = new Set();
  private signalListeners: Set<SignalCallback> = new Set();
  private statusListeners: Set<ConnectionStatusCallback> = new Set();
  private peerListeners: Set<PeersUpdateCallback> = new Set();
  private peerEndpoints: Map<string, PeerEndpoint> = new Map();
  private recentSignalHashes: Map<string, number> = new Map();

  private serverUrl: string = 'http://localhost:42426';
  private wsUrl: string = 'ws://localhost:42426/ws';
  private myPresence: RegisteredPresence | null = null;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private pollTimer: any = null;
  private nativeUnlisten: (() => void) | null = null;
  private lastPollTimestamp: number = 0;

  public isConnected: boolean = false;
  public socketId: string | null = null;

  constructor() {
    this.initNativeListener();
    this.startPollingFallback();
  }

  // Wires up native Tauri event bridge for peer signals
  public async initNativeListener() {
    if (this.nativeUnlisten) return;

    if (typeof window !== 'undefined' && TauriNativeService.isTauri()) {
      try {
        console.log('[SignalingService] Attaching native listenPeerSignal...');
        const unlisten = await TauriNativeService.listenPeerSignal((payload) => {
          console.log('[SignalingService] Received native p2p-signal event:', payload);
          this.handleIncomingSignal(payload);
        });
        if (unlisten) {
          this.nativeUnlisten = unlisten;
          console.log('[SignalingService] Native listenPeerSignal attached successfully');
          if (!this.isConnected) {
            this.isConnected = true;
            this.notifyStatus(true, this.socketId || 'tauri-node');
          }
        }
      } catch (err) {
        console.warn('[SignalingService] Failed to attach native signal listener:', err);
      }
    }
  }

  // Fallback poller against local node server's /api/poll to catch any missed signals
  private startPollingFallback() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.lastPollTimestamp = Date.now() - 5000;

    this.pollTimer = setInterval(async () => {
      try {
        // Only poll if window is defined
        if (typeof window === 'undefined') return;
        const base = this.serverUrl.startsWith('ws')
          ? this.serverUrl.replace(/^ws/, 'http')
          : this.serverUrl;
        const cleanBase = base.replace(/\/ws\/?$/, '');
        const res = await fetch(`${cleanBase}/api/poll?since=${this.lastPollTimestamp}`);
        if (res.ok) {
          const signals = await res.json();
          if (Array.isArray(signals) && signals.length > 0) {
            this.lastPollTimestamp = Date.now();
            for (const item of signals) {
              console.log('[SignalingService] Discovered signal via HTTP poll:', item);
              const payload = item.signal
                ? item
                : {
                    from: item.from || 'remote',
                    fromDeviceId: item.fromDeviceId,
                    signal: item,
                  };
              this.handleIncomingSignal(payload);
            }
          }
        }
      } catch {
        // Quietly ignore polling failures (server might still be starting)
      }
    }, 1500);
  }

  // Normalizes an HTTP/HTTPS or hostname URL to a standard WebSocket ws:// or wss:// endpoint
  private resolveWsUrl(url: string): string {
    let resolved = url.trim();
    if (!resolved) {
      resolved = 'http://localhost:42426';
    }

    if (resolved.startsWith('https://')) {
      resolved = 'wss://' + resolved.slice(8);
    } else if (resolved.startsWith('http://')) {
      resolved = 'ws://' + resolved.slice(7);
    } else if (!resolved.startsWith('ws://') && !resolved.startsWith('wss://')) {
      resolved = 'ws://' + resolved;
    }

    // Strip trailing slash
    if (resolved.endsWith('/')) {
      resolved = resolved.slice(0, -1);
    }

    // Ensure /ws path
    if (!resolved.endsWith('/ws')) {
      resolved = `${resolved}/ws`;
    }

    return resolved;
  }

  // Registers known peer device IP and port for direct native dispatch
  registerPeerDevice(deviceId: string, ip: string, port: number = 42426) {
    if (!deviceId || !ip) return;
    const cleanIp = ip.split(':')[0].trim();
    const finalPort = port || 42426;
    console.log(`[SignalingService] Registering peer endpoint: ${deviceId} -> ${cleanIp}:${finalPort}`);
    this.peerEndpoints.set(deviceId, { ip: cleanIp, port: finalPort });
    this.peerEndpoints.set(cleanIp, { ip: cleanIp, port: finalPort });
  }

  connect(url?: string) {
    if (url) {
      this.serverUrl = url;
    }
    const targetWsUrl = this.resolveWsUrl(this.serverUrl);

    // Ensure native listener is attached whenever connect() is called
    this.initNativeListener();

    // Avoid thrashing/closing an already open or connecting socket to the same endpoint
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) &&
      this.wsUrl === targetWsUrl
    ) {
      console.log('[SignalingService] Already connected/connecting to', targetWsUrl);
      return;
    }

    this.wsUrl = targetWsUrl;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    try {
      console.log('[SignalingService] Connecting WebSocket to', this.wsUrl);
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[SignalingService] WebSocket connected successfully');
        this.isConnected = true;
        this.notifyStatus(true, this.socketId || undefined);

        // Start 15s keepalive heartbeat
        this.startHeartbeat();

        // Resubscribe to all active rooms
        this.joinedRooms.forEach((room) => {
          this.sendWsMessage({ type: 'join-room', room });
        });

        // Re-register presence if set
        if (this.myPresence) {
          this.emitPresence();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWsPacket(data);
        } catch (e) {
          console.warn('[SignalingService] Failed to parse WebSocket packet:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[SignalingService] WebSocket notice:', err);
      };

      this.ws.onclose = () => {
        console.log('[SignalingService] WebSocket closed');
        this.stopHeartbeat();
        this.socketId = null;

        // Keep isConnected true if Tauri native backend is available
        if (!TauriNativeService.isTauri()) {
          this.isConnected = false;
          this.notifyStatus(false);
        }

        // Schedule auto-reconnect in 2 seconds
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 2000);
        }
      };
    } catch (e) {
      console.warn('[SignalingService] Failed to initialize WebSocket client:', e);
      if (!this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.connect();
        }, 3000);
      }
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendWsMessage({ type: 'ping' });
      }
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private sendWsMessage(data: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch (e) {
        console.warn('[SignalingService] WebSocket send error:', e);
      }
    }
    return false;
  }

  // Handles incoming structured messages from WebSocket
  private handleWsPacket(packet: any) {
    if (!packet || typeof packet !== 'object') return;

    switch (packet.type) {
      case 'connect':
        this.socketId = packet.socketId || this.socketId;
        console.log('[SignalingService] Assigned socketId:', this.socketId);
        this.notifyStatus(true, this.socketId || undefined);
        break;

      case 'peers-update':
        if (Array.isArray(packet.peers)) {
          // Register peer endpoints
          packet.peers.forEach((peer: any) => {
            if (peer.deviceId && peer.ip) {
              this.registerPeerDevice(peer.deviceId, peer.ip, peer.port || 42426);
            }
          });
          this.peerListeners.forEach((cb) => cb(packet.peers));
        }
        break;

      case 'signal':
        this.handleIncomingSignal({
          from: packet.from || 'peer',
          fromDeviceId: packet.fromDeviceId,
          signal: packet.signal,
        });
        break;

      case 'pong':
        break;

      default:
        break;
    }
  }

  // Deduplicates and dispatches incoming peer signals to all registered listeners
  public handleIncomingSignal(payload: { from: string; fromDeviceId?: string; signal: any }) {
    if (!payload || !payload.signal) return;

    // Ignore signals originating from this device
    if (this.myPresence) {
      const myId = this.myPresence.deviceId;
      if (payload.fromDeviceId && payload.fromDeviceId === myId) return;
      if (payload.from && payload.from === myId) return;
      if (payload.signal?.fromDevice?.id && payload.signal.fromDevice.id === myId) return;
    }

    // Deduplicate duplicate signals arriving from both WebSocket, native IPC, and HTTP poll
    const sigType = payload.signal.type || '';
    const pin = payload.signal.pin || '';
    const dev = payload.fromDeviceId || payload.from || '';
    const key = `${dev}_${sigType}_${pin}_${JSON.stringify(payload.signal).slice(0, 48)}`;

    const now = Date.now();
    const lastSeen = this.recentSignalHashes.get(key);
    if (lastSeen && now - lastSeen < 1500) {
      return;
    }
    this.recentSignalHashes.set(key, now);

    // Evict old hash entries
    if (this.recentSignalHashes.size > 200) {
      this.recentSignalHashes.forEach((ts, k) => {
        if (now - ts > 10000) {
          this.recentSignalHashes.delete(k);
        }
      });
    }

    console.log('[SignalingService] Dispatching signal to listeners:', {
      type: sigType,
      pin,
      from: dev,
      listenersCount: this.signalListeners.size,
    });

    this.signalListeners.forEach((cb) => cb(payload));
  }

  registerPresence(presence: RegisteredPresence) {
    this.myPresence = presence;
    if (presence.deviceId) {
      this.joinRoom(presence.deviceId);
    }
    this.emitPresence();
  }

  private emitPresence() {
    if (this.myPresence) {
      this.sendWsMessage({
        type: 'register-presence',
        presence: this.myPresence,
      });
      this.sendWsMessage({
        type: 'get-peers',
      });
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    if (this.nativeUnlisten) {
      this.nativeUnlisten();
      this.nativeUnlisten = null;
    }

    this.isConnected = false;
    this.socketId = null;
    this.notifyStatus(false);
  }

  joinRoom(roomId: string) {
    if (!roomId) return;
    this.joinedRooms.add(roomId);
    this.sendWsMessage({
      type: 'join-room',
      room: roomId,
    });
  }

  // Sends signal across WebSocket and direct native peer TCP transport
  sendSignal(targetId: string, signal: any) {
    const payload = {
      type: 'signal',
      to: targetId,
      roomId: targetId,
      signal,
    };

    // 1. Send over local/remote WebSocket
    this.sendWsMessage(payload);

    // 2. Direct native dispatch if in Tauri and peer IP is known
    if (TauriNativeService.isTauri()) {
      const endpoint = this.peerEndpoints.get(targetId);
      let targetIp: string | null = null;
      let targetPort: number = 42426;

      if (endpoint) {
        targetIp = endpoint.ip;
        targetPort = endpoint.port;
      } else if (/^(\d{1,3}\.){3}\d{1,3}$/.test(targetId)) {
        // targetId is an IP address
        targetIp = targetId;
      }

      if (targetIp) {
        console.log(`[SignalingService] Direct native peer dispatch to ${targetIp}:${targetPort}`);
        TauriNativeService.sendPeerSignal(targetIp, targetPort, {
          from: this.socketId || this.myPresence?.deviceId || 'local',
          fromDeviceId: this.myPresence?.deviceId,
          to: targetId,
          signal,
        }).catch((err) => {
          console.warn(`[SignalingService] Direct native peer signal to ${targetIp} notice:`, err);
        });
      }
    }
  }

  onSignal(callback: SignalCallback): () => void {
    this.signalListeners.add(callback);
    return () => {
      this.signalListeners.delete(callback);
    };
  }

  onPeersUpdate(callback: PeersUpdateCallback): () => void {
    this.peerListeners.add(callback);
    return () => {
      this.peerListeners.delete(callback);
    };
  }

  onStatusChange(callback: ConnectionStatusCallback): () => void {
    this.statusListeners.add(callback);
    callback(this.isConnected, this.socketId || undefined);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private notifyStatus(connected: boolean, id?: string) {
    this.statusListeners.forEach((cb) => cb(connected, id));
  }
}

export const SignalingService = new SignalingServiceClass();
