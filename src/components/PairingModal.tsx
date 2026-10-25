import React from 'react';
import { X, ShieldCheck, Check, AlertCircle, RotateCw, Loader2 } from 'lucide-react';
import { Device } from '../types';

export interface PairingModalProps {
  device: Device;
  pin: string;
  status?: 'waiting' | 'accepted' | 'declined' | 'timeout';
  onCancel: () => void;
  onRetry?: () => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  device,
  pin,
  status = 'waiting',
  onCancel,
  onRetry,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border rounded-3xl p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-vellichor-border/50 pb-4">
          <div className="flex items-center space-x-2 text-primary font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span>Device Pairing</span>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-vellichor-card text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content based on status */}
        {status === 'waiting' && (
          <div className="text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Connecting to {device.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                A connection prompt has been sent to{' '}
                <span className="font-semibold text-gray-700 dark:text-gray-300">{device.name}</span>.
                Waiting for the remote device to accept...
              </p>
            </div>

            {/* Verification Code */}
            <div className="py-4 px-6 rounded-2xl bg-gray-50 dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-center space-y-1">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Verification PIN
              </p>
              <div className="text-3xl font-mono font-bold tracking-widest text-primary select-all">
                {pin}
              </div>
              <p className="text-[11px] text-gray-400">
                Confirm this verification code matches the prompt on {device.name}.
              </p>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                onClick={onCancel}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-vellichor-card border border-gray-200 dark:border-vellichor-border transition-colors cursor-pointer"
              >
                Cancel Request
              </button>
            </div>
          </div>
        )}

        {status === 'accepted' && (
          <div className="text-center space-y-4 py-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-500 animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Pairing Successful!
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Connected and synchronized with{' '}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{device.name}</span>.
              </p>
            </div>
          </div>
        )}

        {status === 'declined' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Connection Declined
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{device.name}</span> declined the connection request.
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              <button
                onClick={onCancel}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {status === 'timeout' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Connection Timed Out
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                No response was received from{' '}
                <span className="font-semibold text-gray-700 dark:text-gray-300">{device.name}</span>. Ensure both devices are online and on the same network.
              </p>
            </div>
            <div className="pt-2 flex justify-center space-x-3">
              <button
                onClick={onCancel}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-vellichor-card border border-gray-200 dark:border-vellichor-border transition-colors cursor-pointer"
              >
                Close
              </button>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-hover text-white flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
