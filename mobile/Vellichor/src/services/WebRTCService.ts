import { RTCPeerConnection, RTCDataChannel, RTCSessionDescription } from 'react-native-webrtc';
import { SignalingService } from './SignalingService';

export interface PeerConnection {
  id: string;
  pc: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
}

class WebRTCServiceClass {
  private peers: Map<string, PeerConnection> = new Map();
  private dataListeners: Map<string, (data: any) => void> = new Map();

  // ... existing WebRTC connection methods ...

  async sendData(peerId: string, data: string) {
    const peer = this.peers.get(peerId);
    if (peer && peer.dataChannel && peer.dataChannel.readyState === 'open') {
      peer.dataChannel.send(data);
    } else {
      console.warn('Data channel not ready');
    }
  }

  onData(peerId: string, callback: (data: any) => void) {
    this.dataListeners.set(peerId, callback);
  }

  setupDataChannel(peerId: string, dataChannel: RTCDataChannel) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.dataChannel = dataChannel;
      dataChannel.onmessage = (event) => {
        const callback = this.dataListeners.get(peerId);
        if (callback) {
          try {
            const parsed = JSON.parse(event.data);
            callback(parsed);
          } catch {
            callback(event.data);
          }
        }
      };
    }
  }
}

export const WebRTCService = new WebRTCServiceClass();
