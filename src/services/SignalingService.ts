import { io, Socket } from 'socket.io-client';

export type SignalCallback = (data: { from: string; signal: any }) => void;
export type ConnectionStatusCallback = (connected: boolean, socketId?: string) => void;

class SignalingServiceClass {
  private socket: Socket | null = null;
  private currentRoomId: string | null = null;
  private signalListeners: Set<SignalCallback> = new Set();
  private statusListeners: Set<ConnectionStatusCallback> = new Set();
  private serverUrl: string = 'http://localhost:3000';
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
        reconnectionAttempts: 5,
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

      this.socket.on('signal', (data: { from: string; signal: any }) => {
        this.signalListeners.forEach((cb) => cb(data));
      });
    } catch (e) {
      console.warn('Failed to initialize socket connection:', e);
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

  sendSignal(roomId: string, signal: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit('signal', { roomId, signal });
    }
  }

  onSignal(callback: SignalCallback): () => void {
    this.signalListeners.add(callback);
    return () => {
      this.signalListeners.delete(callback);
    };
  }

  onStatusChange(callback: ConnectionStatusCallback): () => void {
    this.statusListeners.add(callback);
    // Notify immediate state
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
