import React from 'react';
import { ShieldCheck, Check, X, Laptop, Smartphone, Tablet } from 'lucide-react';
import { Device } from '../types';

interface IncomingPairingModalProps {
  request: {
    pin: string;
    fromDevice: Device;
  };
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingPairingModal: React.FC<IncomingPairingModalProps> = ({
  request,
  onAccept,
  onDecline,
}) => {
  const { pin, fromDevice } = request;

  const renderDeviceIcon = () => {
    switch (fromDevice.type) {
      case 'phone':
        return <Smartphone className="w-8 h-8 text-primary" />;
      case 'tablet':
        return <Tablet className="w-8 h-8 text-primary" />;
      default:
        return <Laptop className="w-8 h-8 text-primary" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-vellichor-border/50 pb-4">
          <div className="flex items-center space-x-2 text-primary font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span>Incoming Connection Request</span>
          </div>
          <button
            onClick={onDecline}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-vellichor-card text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Device Information Card */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            {renderDeviceIcon()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {fromDevice.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              wants to pair and connect to your device.
            </p>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-vellichor-card text-gray-600 dark:text-gray-300 uppercase">
              {fromDevice.platform}
            </span>
            <span className="text-[11px] font-mono text-gray-400">
              {fromDevice.ip}
            </span>
          </div>
        </div>

        {/* Verification PIN Code Box */}
        <div className="py-4 px-6 rounded-2xl bg-gray-50 dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-center space-y-1.5">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Verification PIN
          </p>
          <div className="text-3xl font-mono font-bold tracking-widest text-primary select-all">
            {pin}
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-400">
            Verify that this 6-digit code matches the code displayed on <span className="font-semibold text-gray-700 dark:text-gray-300">{fromDevice.name}</span>.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={onDecline}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-vellichor-card border border-gray-200 dark:border-vellichor-border transition-colors cursor-pointer"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-balanced flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Accept Connection</span>
          </button>
        </div>
      </div>
    </div>
  );
};
