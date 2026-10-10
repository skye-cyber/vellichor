import React from 'react';
import {
  Laptop,
  Smartphone,
  Tablet,
  CheckCircle2,
  Clock,
  Wifi,
  Radio,
  ArrowRight,
  MonitorPlay,
  Gamepad2,
  FolderSync,
} from 'lucide-react';
import { Device } from '../types';

interface DeviceCardProps {
  device: Device;
  isConnected: boolean;
  onConnect: (device: Device) => void;
  onQuickAction?: (action: 'stream' | 'control' | 'files', device: Device) => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  isConnected,
  onConnect,
  onQuickAction,
}) => {
  const getDeviceIcon = () => {
    switch (device.type) {
      case 'phone':
        return Smartphone;
      case 'tablet':
        return Tablet;
      case 'laptop':
      default:
        return Laptop;
    }
  };

  const getStatusBadge = () => {
    switch (device.status) {
      case 'online':
        return {
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-500',
          text: 'Online',
        };
      case 'busy':
        return {
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          dot: 'bg-amber-500',
          text: 'Busy',
        };
      case 'offline':
      default:
        return {
          bg: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
          dot: 'bg-gray-400',
          text: 'Offline',
        };
    }
  };

  const Icon = getDeviceIcon();
  const statusInfo = getStatusBadge();

  return (
    <div
      className={`p-4 rounded-2xl border transition-all duration-200 bg-white dark:bg-vellichor-card ${
        isConnected
          ? 'border-secondary shadow-glow-secondary'
          : 'border-gray-200 dark:border-vellichor-border hover:border-primary/50 shadow-sm hover:shadow-balanced'
      }`}
    >
      <div className="flex items-start justify-between">
        {/* Left: Device Icon & Info */}
        <div className="flex items-center space-x-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isConnected
                ? 'bg-secondary/15 text-secondary'
                : 'bg-primary/10 text-primary'
            }`}
          >
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                {device.name}
              </h3>
              {isConnected && (
                <CheckCircle2 className="w-4 h-4 text-secondary fill-secondary/20" />
              )}
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <span className="font-mono">{device.ip}</span>
              <span>•</span>
              <span className="capitalize">{device.platform}</span>
            </div>
          </div>
        </div>

        {/* Right: Status Pill & Signal */}
        <div className="flex flex-col items-end space-y-1">
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border flex items-center space-x-1.5 ${statusInfo.bg}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
            <span>{statusInfo.text}</span>
          </span>
          <div className="flex items-center space-x-1 text-[11px] text-gray-400">
            <Wifi className="w-3 h-3" />
            <span>{device.signalStrength}%</span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-vellichor-border flex items-center justify-between">
        <div className="text-[11px] text-gray-400 flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>Seen {device.lastSeen}</span>
        </div>

        <div className="flex items-center space-x-2">
          {onQuickAction && isConnected && (
            <>
              <button
                onClick={() => onQuickAction('stream', device)}
                title="Screen Share"
                className="p-1.5 rounded-lg bg-gray-100 dark:bg-vellichor-surface hover:text-primary transition-colors text-gray-600 dark:text-gray-300"
              >
                <MonitorPlay className="w-4 h-4" />
              </button>
              <button
                onClick={() => onQuickAction('control', device)}
                title="Remote Control"
                className="p-1.5 rounded-lg bg-gray-100 dark:bg-vellichor-surface hover:text-secondary transition-colors text-gray-600 dark:text-gray-300"
              >
                <Gamepad2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onQuickAction('files', device)}
                title="File Transfer"
                className="p-1.5 rounded-lg bg-gray-100 dark:bg-vellichor-surface hover:text-accent transition-colors text-gray-600 dark:text-gray-300"
              >
                <FolderSync className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={() => onConnect(device)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              isConnected
                ? 'bg-secondary text-white shadow-sm'
                : 'bg-primary text-white hover:bg-primary-hover shadow-balanced-sm'
            }`}
          >
            <span>{isConnected ? 'Active Peer' : 'Connect'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
