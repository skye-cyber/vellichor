import { io, Socket } from 'socket.io-client';

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

class SignalingServiceClass {
  private socket: Socket | null = null;
  private currentRoomId: string | null = null;
  private signalListeners: Set<SignalCallback> = new Set();
  private statusListeners: Set<ConnectionStatusCallback> = new Set();
  private peerListeners: Set<PeersUpdateCallback> = new Set();
  private serverUrl: string = 'http://localhost:3000';
  private myPresence: RegisteredPresence | null = null;
  public isConnected: boolean = false;
  public socketId: string | null = null;

  connect(url?: string) {
    if (url) this.serverUrl = url;

    if (this.socket) {
      this.socket.disconnect();
    }

    try {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 5000,
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        this.socketId = this.socket?.id || null;
        this.notifyStatus(true, this.socketId || undefined);

        if (this.currentRoomId) {
          this.joinRoom(this.currentRoomId);
        }

        if (this.myPresence) {
          this.emitPresence();
        }
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        this.socketId = null;
        this.notifyStatus(false);
      });

      this.socket.on('connect_error', (err) => {
        console.warn('Signaling server connection error:', err.message);
        this.isConnected = false;
        this.notifyStatus(false);
      });

      this.socket.on('signal', (data: { from: string; fromDeviceId?: string; signal: any }) => {
        this.signalListeners.forEach((cb) => cb(data));
      });

      this.socket.on('peers-update', (peers: any[]) => {
        this.peerListeners.forEach((cb) => cb(peers));
      });
    } catch (e) {
      console.warn('Failed to initialize socket connection:', e);
    }
  }

  registerPresence(presence: RegisteredPresence) {
    this.myPresence = presence;
    if (this.socket && this.isConnected) {
      this.emitPresence();
    }
  }

  private emitPresence() {
    if (this.socket && this.isConnected && this.myPresence) {
      this.socket.emit('register-presence', this.myPresence);
      this.socket.emit('get-peers');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.socketId = null;
    this.notifyStatus(false);
  }

  joinRoom(roomId: string) {
    this.currentRoomId = roomId;
    if (this.socket && this.isConnected) {
      this.socket.emit('join-room', roomId);
    }
  }

  sendSignal(targetId: string, signal: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit('signal', {
        to: targetId,
        roomId: targetId,
        signal,
      });
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
