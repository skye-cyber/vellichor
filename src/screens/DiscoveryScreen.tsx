import React, { useState } from 'react';
import {
  Radio,
  RotateCw,
  Search,
  Plus,
  Wifi,
  Laptop,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { Device } from '../types';
import { DeviceCard } from '../components/DeviceCard';
import { PairingModal } from '../components/PairingModal';
import { ManualConnectModal } from '../components/ManualConnectModal';

interface DiscoveryScreenProps {
  devices: Device[];
  isScanning: boolean;
  connectedDevice: Device | null;
  onRefreshScan: () => void;
  onConnectDevice: (device: Device) => void;
  onNavigateToTab: (tab: string) => void;
}

export const DiscoveryScreen: React.FC<DiscoveryScreenProps> = ({
  devices,
  isScanning,
  connectedDevice,
  onRefreshScan,
  onConnectDevice,
  onNavigateToTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [pairingTarget, setPairingTarget] = useState<Device | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const filteredDevices = devices.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.ip.includes(searchQuery);
    const matchesPlatform =
      filterPlatform === 'all' || d.platform === filterPlatform;
    return matchesSearch && matchesPlatform;
  });

  const handleDeviceConnectClick = (device: Device) => {
    setPairingTarget(device);
  };

  const handleQuickAction = (
    action: 'stream' | 'control' | 'files',
    device: Device
  ) => {
    if (connectedDevice?.id !== device.id) {
      onConnectDevice(device);
    }
    if (action === 'stream') onNavigateToTab('screen');
    else if (action === 'control') onNavigateToTab('control');
    else if (action === 'files') onNavigateToTab('files');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Top Banner & Scan Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Radio className={`w-7 h-7 ${isScanning ? 'animate-pulse' : ''}`} />
            </div>
            {isScanning && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-secondary animate-ping" />
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Local Device Discovery
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                mDNS / SSDP
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {isScanning
                ? 'Scanning subnet for active Vellichor nodes...'
                : `Found ${devices.length} devices available on this local network.`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-gray-100 dark:bg-vellichor-surface hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Connect by IP</span>
          </button>

          <button
            onClick={onRefreshScan}
            disabled={isScanning}
            className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-balanced flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Rescan'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by device name or IP..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-xs text-gray-900 dark:text-white focus:outline-none focus:border-primary shadow-sm"
          />
        </div>

        {/* Platform Filter Pills */}
        <div className="flex items-center space-x-1.5 self-start sm:self-auto overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
          {['all', 'linux', 'windows', 'macos', 'android', 'ios'].map((plat) => (
            <button
              key={plat}
              onClick={() => setFilterPlatform(plat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors shrink-0 ${
                filterPlatform === plat
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-gray-600 dark:text-gray-400 hover:border-primary/50'
              }`}
            >
              {plat}
            </button>
          ))}
        </div>
      </div>

      {/* Device Cards Grid */}
      {filteredDevices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              isConnected={connectedDevice?.id === device.id}
              onConnect={handleDeviceConnectClick}
              onQuickAction={handleQuickAction}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 rounded-3xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-vellichor-surface text-gray-400 flex items-center justify-center mx-auto">
            <Radio className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-gray-900 dark:text-white">
            No Devices Found
          </h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Make sure your devices are on the same Wi-Fi or LAN subnet, or use &quot;Connect by IP&quot; to specify a direct address.
          </p>
          <button
            onClick={onRefreshScan}
            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold shadow-sm inline-flex items-center space-x-1.5 mt-2"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Modals */}
      {pairingTarget && (
        <PairingModal
          device={pairingTarget}
          onConfirm={() => {
            onConnectDevice(pairingTarget);
            setPairingTarget(null);
          }}
          onCancel={() => setPairingTarget(null)}
        />
      )}

      <ManualConnectModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onConnect={(device) => {
          onConnectDevice(device);
        }}
      />
    </div>
  );
};
