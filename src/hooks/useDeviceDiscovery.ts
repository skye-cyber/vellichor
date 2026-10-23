import { useState, useEffect, useCallback, useRef } from 'react';
import { Device, SystemInfo } from '../types';
import { TauriNativeService } from '../services/TauriNativeService';
import { SignalingService } from '../services/SignalingService';
import { WebRTCService } from '../services/WebRTCService';
import { SettingsService } from '../services/SettingsService';

export const useDeviceDiscovery = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date>(new Date());
  const localScanRef = useRef<Device[]>([]);

  // Merges local network discovery results with signaling server online peer registry
  const mergeDevices = useCallback((local: Device[], signalingPeers: any[]) => {
    const map = new Map<string, Device>();

    // Add locally discovered devices first
    for (const d of local) {
      map.set(d.id, d);
      if (d.ip) map.set(d.ip, d);
    }

    // Merge signaling peers (active online peers on signaling server)
    for (const p of signalingPeers) {
      // Don't list ourselves if we match our device ID or socket ID
      if (p.deviceId === SignalingService.socketId) continue;

      const existing = map.get(p.deviceId) || (p.ip ? map.get(p.ip) : null);
      const mergedDevice: Device = {
        id: p.deviceId || p.socketId,
        name: p.name || existing?.name || 'Vellichor Peer',
        type: (p.deviceType as any) || existing?.type || 'laptop',
        platform: (p.platform as any) || existing?.platform || 'linux',
        status: 'online',
        ip: p.ip || existing?.ip || 'Remote (Signaling)',
        signalStrength: existing?.signalStrength || 90,
        lastSeen: 'just now',
      };

      map.set(mergedDevice.id, mergedDevice);
      if (mergedDevice.ip && mergedDevice.ip !== 'Remote (Signaling)') {
        map.set(mergedDevice.ip, mergedDevice);
      }
    }

    // Return unique devices by ID
    const unique = Array.from(new Set(Array.from(map.values()).map((d) => d.id)))
      .map((id) => map.get(id)!)
      .filter(Boolean);

    setDevices(unique);
  }, []);

  const startScan = useCallback(async () => {
    setIsScanning(true);
    try {
      const [scanned, sys] = await Promise.all([
        TauriNativeService.scanNetwork(),
        TauriNativeService.getSystemInfo(),
      ]);

      localScanRef.current = scanned;
      setSystemInfo(sys);
      setLastScanTime(new Date());

      // Register local device profile for mutual pairing handshakes and presence
      if (sys) {
        const myDev: Device = {
          id: `device-${sys.hostname.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: sys.hostname,
          type: sys.device_type as any,
          platform: sys.platform as any,
          status: 'online',
          ip: sys.local_ips[0] || '127.0.0.1',
          signalStrength: 100,
          lastSeen: 'just now',
        };

        WebRTCService.setMyDevice(myDev);

        SignalingService.registerPresence({
          deviceId: myDev.id,
          name: sys.hostname,
          deviceType: sys.device_type,
          platform: sys.platform,
          ip: sys.local_ips[0],
        });
      }

      mergeDevices(scanned, []);
    } catch (e) {
      console.error('Scan failed:', e);
    } finally {
      setIsScanning(false);
    }
  }, [mergeDevices]);

  useEffect(() => {
    // Initial signaling connect & scan
    const settings = SettingsService.getSettings();
    SignalingService.connect(settings.signalingServerUrl || 'http://localhost:3000');

    startScan();

    // Listen to signaling peer updates
    const unsubPeers = SignalingService.onPeersUpdate((peers) => {
      mergeDevices(localScanRef.current, peers);
    });

    // Listen to mutual two-way pairing events from WebRTC data channel handshake
    const unsubPaired = WebRTCService.onPeerPaired(async (peerDevice) => {
      setConnectedDevice(peerDevice);
      await SettingsService.addConnectionHistory({
        deviceName: peerDevice.name,
        deviceType: peerDevice.type,
        platform: peerDevice.platform,
        ip: peerDevice.ip,
        lastConnected: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        connectionCount: 1,
        trusted: true,
      });
    });

    const unsubUnpaired = WebRTCService.onPeerUnpaired(() => {
      setConnectedDevice(null);
    });

    // Listen to WebRTC connection state changes
    const unsubState = WebRTCService.onStateChange((state) => {
      if (state === 'closed' || state === 'disconnected' || state === 'failed') {
        setConnectedDevice(null);
      }
    });

    return () => {
      unsubPeers();
      unsubPaired();
      unsubUnpaired();
      unsubState();
    };
  }, [startScan, mergeDevices]);

  const connectToDevice = useCallback(
    async (device: Device) => {
      try {
        await WebRTCService.connectToPeer(device.id);
        setConnectedDevice(device);

        // Add to history
        await SettingsService.addConnectionHistory({
          deviceName: device.name,
          deviceType: device.type,
          platform: device.platform,
          ip: device.ip,
          lastConnected: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          connectionCount: 1,
          trusted: true,
        });
      } catch (err) {
        console.error('Failed to connect to device:', err);
      }
    },
    []
  );

  const disconnectDevice = useCallback(() => {
    WebRTCService.close();
    setConnectedDevice(null);
  }, []);

  return {
    devices,
    isScanning,
    connectedDevice,
    systemInfo,
    lastScanTime,
    startScan,
    connectToDevice,
    disconnectDevice,
  };
};
