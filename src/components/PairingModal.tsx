import React, { useState } from 'react';
import { X, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import { Device } from '../types';

interface PairingModalProps {
  device: Device;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PairingModal: React.FC<PairingModalProps> = ({
  device,
  onConfirm,
  onCancel,
}) => {
  const [pin, setPin] = useState('749 201');
  const [isVerifying, setIsVerifying] = useState(false);

  const handlePair = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onConfirm();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-primary font-bold">
            <ShieldCheck className="w-5 h-5" />
            <span>Device Pairing Request</span>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-vellichor-card text-gray-400 hover:text-gray-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
            🔒
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Connect to {device.name}?
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
            Please confirm that the 6-digit verification code below matches the code displayed on{' '}
            <span className="font-semibold text-gray-700 dark:text-gray-300">{device.name}</span>.
          </p>
        </div>

        {/* PIN Code Box */}
        <div className="py-4 px-6 rounded-2xl bg-gray-50 dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-center">
          <span className="text-3xl font-mono font-bold tracking-widest text-primary">
            {pin}
          </span>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-vellichor-card transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePair}
            disabled={isVerifying}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary hover:bg-primary-hover text-white shadow-balanced flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            {isVerifying ? (
              <span>Verifying...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Confirm & Pair</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
