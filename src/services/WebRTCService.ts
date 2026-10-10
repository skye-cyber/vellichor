import { SignalingService } from './SignalingService';

export interface StreamStats {
  fps: number;
  resolution: string;
  bitrateKbps: number;
  latencyMs: number;
}

export type DataListener = (channel: string, data: any) => void;
export type StreamListener = (stream: MediaStream | null) => void;

class WebRTCServiceClass {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private dataListeners: Set<DataListener> = new Set();
  private remoteStreamListeners: Set<StreamListener> = new Set();
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  public activePeerId: string | null = null;
  public connectionState: RTCPeerConnectionState = 'new';
  private stateChangeListeners: Set<(state: RTCPeerConnectionState) => void> = new Set();

  private readonly iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  constructor() {
    SignalingService.onSignal(this.handleIncomingSignal.bind(this));
  }

  private initPeerConnection() {
    if (this.peerConnection) {
      this.close();
    }

    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
    });

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection) {
        this.connectionState = this.peerConnection.connectionState;
        this.stateChangeListeners.forEach((cb) => cb(this.connectionState));
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.activePeerId) {
        SignalingService.sendSignal(this.activePeerId, {
          type: 'candidate',
          candidate: event.candidate,
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.remoteStreamListeners.forEach((cb) => cb(this.remoteStream));
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannels.set(channel.label, channel);

    channel.onmessage = (event) => {
      let parsed = event.data;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        // Leave as string or buffer
      }
      this.dataListeners.forEach((cb) => cb(channel.label, parsed));
    };

    channel.onopen = () => {
      console.log(`DataChannel [${channel.label}] open`);
    };

    channel.onclose = () => {
      console.log(`DataChannel [${channel.label}] closed`);
      this.dataChannels.delete(channel.label);
    };
  }

  async connectToPeer(peerId: string): Promise<void> {
    this.activePeerId = peerId;
    SignalingService.joinRoom(peerId);
    this.initPeerConnection();

    // Create required data channels
    if (this.peerConnection) {
      const controlChannel = this.peerConnection.createDataChannel('control');
      this.setupDataChannel(controlChannel);

      const fileChannel = this.peerConnection.createDataChannel('file');
      this.setupDataChannel(fileChannel);

      // Create Offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      SignalingService.sendSignal(peerId, {
        type: 'offer',
        sdp: offer,
      });
    }
  }

  private async handleIncomingSignal(payload: { from: string; signal: any }) {
    const { from, signal } = payload;
    if (!signal) return;

    if (!this.peerConnection) {
      this.activePeerId = from;
      this.initPeerConnection();
    }

    if (signal.type === 'offer') {
      await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      const answer = await this.peerConnection?.createAnswer();
      if (answer) {
        await this.peerConnection?.setLocalDescription(answer);
        SignalingService.sendSignal(from, {
          type: 'answer',
          sdp: answer,
        });
      }
    } else if (signal.type === 'answer') {
      await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    } else if (signal.type === 'candidate') {
      try {
        await this.peerConnection?.addIceCandidate(new RTCIceCandidate(signal.candidate));
      } catch (e) {
        console.warn('Failed to add ICE candidate:', e);
      }
    }
  }

  sendData(channelName: string, data: any): boolean {
    const channel = this.dataChannels.get(channelName);
    if (channel && channel.readyState === 'open') {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      channel.send(message);
      return true;
    }
    return false;
  }

  async startScreenCapture(options?: { resolution?: '720p' | '1080p' | 'original'; fps?: number }): Promise<MediaStream | null> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen capture not supported in this browser environment');
      }

      let width = 1920;
      let height = 1080;
      if (options?.resolution === '720p') {
        width = 1280;
        height = 720;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          frameRate: { ideal: options?.fps || 30 },
        },
        audio: true,
      });

      this.localStream = stream;

      // Add tracks to peer connection if exists
      if (this.peerConnection) {
        stream.getTracks().forEach((track) => {
          this.peerConnection?.addTrack(track, stream);
        });
      }

      return stream;
    } catch (err) {
      console.error('Error starting screen capture:', err);
      throw err;
    }
  }

  stopScreenCapture() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
  }

  onData(callback: DataListener): () => void {
    this.dataListeners.add(callback);
    return () => {
      this.dataListeners.delete(callback);
    };
  }

  onRemoteStream(callback: StreamListener): () => void {
    this.remoteStreamListeners.add(callback);
    if (this.remoteStream) callback(this.remoteStream);
    return () => {
      this.remoteStreamListeners.delete(callback);
    };
  }

  onStateChange(callback: (state: RTCPeerConnectionState) => void): () => void {
    this.stateChangeListeners.add(callback);
    callback(this.connectionState);
    return () => {
      this.stateChangeListeners.delete(callback);
    };
  }

  close() {
    this.stopScreenCapture();
    this.dataChannels.forEach((ch) => ch.close());
    this.dataChannels.clear();
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
    this.activePeerId = null;
    this.connectionState = 'closed';
    this.stateChangeListeners.forEach((cb) => cb('closed'));
  }
}

export const WebRTCService = new WebRTCServiceClass();
