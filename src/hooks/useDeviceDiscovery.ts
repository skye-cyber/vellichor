import { useState, useEffect, useCallback } from 'react';
import { Device, SystemInfo } from '../types';
import { TauriNativeService } from '../services/TauriNativeService';
import { WebRTCService } from '../services/WebRTCService';
import { SettingsService } from '../services/SettingsService';

export const useDeviceDiscovery = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date>(new Date());

  const startScan = useCallback(async () => {
    setIsScanning(true);
    try {
      const [scanned, sys] = await Promise.all([
        TauriNativeService.scanNetwork(),
        TauriNativeService.getSystemInfo(),
      ]);
      setDevices(scanned);
      setSystemInfo(sys);
      setLastScanTime(new Date());
    } catch (e) {
      console.error('Scan failed:', e);
    } finally {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    startScan();
  }, [startScan]);

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
