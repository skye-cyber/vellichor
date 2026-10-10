export type PlatformType = 'android' | 'ios' | 'windows' | 'macos' | 'linux';
export type DeviceType = 'phone' | 'laptop' | 'tablet';
export type DeviceStatus = 'online' | 'busy' | 'offline';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  platform: PlatformType;
  status: DeviceStatus;
  ip: string;
  signalStrength: number;
  lastSeen: string;
}

export interface AppSettings {
  // Connection
  autoConnect: boolean;
  discoveryMode: 'all' | 'saved' | 'manual';
  streamQuality: 'balanced' | 'performance' | 'battery';
  signalingServerUrl: string;

  // Privacy & Security
  encryption: boolean;
  requirePairing: boolean;
  saveHistory: boolean;

  // Appearance
  theme: 'light' | 'dark' | 'system';
  reduceAnimations: boolean;
  compactView: boolean;

  // Storage
  autoDownload: boolean;
  downloadPath: string;
  maxCacheSize: number;

  // Advanced
  enableDebug: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  keepAwake: boolean;

  // Performance
  maxFrameRate: 30 | 60;
  resolution: '720p' | '1080p' | 'original';
  hardwareAcceleration: boolean;
}

export interface ConnectionHistory {
  id: string;
  deviceName: string;
  deviceType: string;
  platform: PlatformType;
  ip: string;
  lastConnected: string;
  connectionCount: number;
  trusted: boolean;
}

export interface CacheInfo {
  sizeBytes: number;
  filesCount: number;
  lastCleared: string;
}

export interface SystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  device_type: string;
  local_ips: string[];
}

export interface TransferFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
}

export interface Transfer {
  id: string;
  file: TransferFile;
  progress: number;
  speedMb: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed' | 'paused';
  direction: 'send' | 'receive';
  peerId?: string;
  peerName?: string;
  chunkSize?: number;
  totalChunks?: number;
  currentChunk?: number;
  error?: string;
}

export interface InputCommand {
  action: 'mousemove' | 'mousedown' | 'mouseup' | 'click' | 'keypress' | 'scroll';
  x?: number;
  y?: number;
  button?: 'left' | 'right' | 'middle';
  key?: string;
  delta_y?: number;
}
