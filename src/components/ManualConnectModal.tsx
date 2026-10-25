import React, { useState } from 'react';
import { X, Network, ArrowRight } from 'lucide-react';
import { Device } from '../types';

interface ManualConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (device: Device) => void;
}

export const ManualConnectModal: React.FC<ManualConnectModalProps> = ({
  isOpen,
  onClose,
  onConnect,
}) => {
  const [ipAddress, setIpAddress] = useState('192.168.1.');
  const [port, setPort] = useState('42426');
  const [deviceName, setDeviceName] = useState('Manual Device');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipAddress.trim()) return;

    const parsedPort = parseInt(port.trim(), 10) || 42426;
    const cleanIp = ipAddress.trim();
    const manualDevice: Device = {
      id: `manual-${cleanIp.replace(/[^a-z0-9]/gi, '-')}`,
      name: deviceName.trim() || 'Custom Device',
      type: 'laptop',
      platform: 'linux',
      status: 'online',
      ip: cleanIp,
      port: parsedPort,
      signalStrength: 90,
      lastSeen: 'just now',
    };

    onConnect(manualDevice);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-primary font-bold">
            <Network className="w-5 h-5" />
            <span>Connect by IP Address</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-vellichor-card text-gray-400 hover:text-gray-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Device Label
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. Living Room TV or Skynet"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                IP Address
              </label>
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="192.168.1.50"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-sm text-gray-900 dark:text-white font-mono focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Port
              </label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="42426"
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-sm text-gray-900 dark:text-white font-mono focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-vellichor-card transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary hover:bg-primary-hover text-white shadow-balanced flex items-center space-x-2 transition-all"
            >
              <span>Connect</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
