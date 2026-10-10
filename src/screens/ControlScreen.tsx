import React, { useState } from 'react';
import {
  Gamepad2,
  MousePointer,
  Keyboard,
  Music,
  AlertCircle,
} from 'lucide-react';
import { Device } from '../types';
import { Touchpad } from '../components/Touchpad';
import { VirtualKeyboard } from '../components/VirtualKeyboard';
import { MediaController } from '../components/MediaController';

interface ControlScreenProps {
  connectedDevice: Device | null;
  onNavigateToDiscovery: () => void;
}

export const ControlScreen: React.FC<ControlScreenProps> = ({
  connectedDevice,
  onNavigateToDiscovery,
}) => {
  const [controlMode, setControlMode] = useState<'touchpad' | 'keyboard' | 'media'>('touchpad');

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 space-y-4 max-w-4xl mx-auto w-full h-full overflow-hidden">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
              <Gamepad2 className="w-5 h-5 text-secondary" />
              <span>Remote Control</span>
            </h2>
            {connectedDevice ? (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                Controlling {connectedDevice.name}
              </span>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Standalone Mode
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Forward cursor drag, keyboard keystrokes, and media playback signals.
          </p>
        </div>

        {/* Mode Selector Pill */}
        <div className="flex p-1 rounded-2xl bg-gray-100 dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border self-start sm:self-auto shrink-0">
          <button
            onClick={() => setControlMode('touchpad')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              controlMode === 'touchpad'
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-primary'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Touchpad</span>
          </button>
          <button
            onClick={() => setControlMode('keyboard')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              controlMode === 'keyboard'
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-primary'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Keyboard</span>
          </button>
          <button
            onClick={() => setControlMode('media')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              controlMode === 'media'
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-primary'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Media</span>
          </button>
        </div>
      </div>

      {!connectedDevice && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 shrink-0">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Simulating input locally. Connect to a remote peer to send control signals over WebRTC.
            </span>
          </div>
          <button
            onClick={onNavigateToDiscovery}
            className="font-bold underline hover:text-amber-700"
          >
            Find Peers
          </button>
        </div>
      )}

      {/* Control Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {controlMode === 'touchpad' && <Touchpad deviceName={connectedDevice?.name} />}
        {controlMode === 'keyboard' && <VirtualKeyboard />}
        {controlMode === 'media' && <MediaController />}
      </div>
    </div>
  );
};
