import React, { useState, useEffect } from 'react';
import {
  MonitorPlay,
  MonitorUp,
  Tv,
  CheckCircle2,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { Device } from '../types';
import { ScreenViewer } from '../components/ScreenViewer';
import { ScreenBroadcaster } from '../components/ScreenBroadcaster';
import { WebRTCService, PartnerState } from '../services/WebRTCService';

interface ScreenShareScreenProps {
  connectedDevice: Device | null;
  onNavigateToDiscovery: () => void;
}

export const ScreenShareScreen: React.FC<ScreenShareScreenProps> = ({
  connectedDevice,
  onNavigateToDiscovery,
}) => {
  const [activeTab, setActiveTab] = useState<'watch' | 'broadcast'>('watch');
  const [partnerState, setPartnerState] = useState<PartnerState>({ isBroadcasting: false });

  // Listen to live partner state changes and automatically switch to watch mode when partner streams
  useEffect(() => {
    const unsub = WebRTCService.onPartnerStateChange((state) => {
      setPartnerState(state);
      if (state.isBroadcasting) {
        // Enforce tight-loop pairing: auto-switch to watch mode when partner broadcasts
        setActiveTab('watch');
      }
    });

    return () => unsub();
  }, []);

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 space-y-4 max-w-6xl mx-auto w-full h-full overflow-hidden">
      {/* Top Header & Sub-tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
              <MonitorPlay className="w-5 h-5 text-primary" />
              <span>Screen Sharing</span>
            </h2>
            {connectedDevice ? (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                <span>Connected to {connectedDevice.name}</span>
              </span>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                No Peer Connected
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Low-latency WebRTC RTP video stream with hardware H.264/VP8 encoding.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex p-1 rounded-2xl bg-gray-100 dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border self-start sm:self-auto shrink-0">
          <button
            onClick={() => setActiveTab('watch')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'watch'
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-primary'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>Watch Remote</span>
            {partnerState.isBroadcasting && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            disabled={partnerState.isBroadcasting}
            title={
              partnerState.isBroadcasting
                ? 'Partner is broadcasting. Only one device can broadcast at a time.'
                : undefined
            }
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'broadcast'
                ? 'bg-primary text-white shadow-sm'
                : partnerState.isBroadcasting
                ? 'opacity-40 cursor-not-allowed text-gray-400'
                : 'text-gray-600 dark:text-gray-300 hover:text-primary'
            }`}
          >
            <MonitorUp className="w-4 h-4" />
            <span>Broadcast Mine</span>
          </button>
        </div>
      </div>

      {partnerState.isBroadcasting && activeTab === 'watch' && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center space-x-2 shrink-0">
          <Radio className="w-4 h-4 animate-pulse shrink-0" />
          <span>
            {connectedDevice ? connectedDevice.name : 'Partner'} is currently streaming their screen live.
          </span>
        </div>
      )}

      {!connectedDevice && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 shrink-0">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Connect to a peer device in Discovery to enable bidirectional streaming.
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

      {/* Screen Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto rounded-xl">
        {activeTab === 'watch' ? (
          <ScreenViewer device={connectedDevice} />
        ) : (
          <ScreenBroadcaster
            activePeerName={connectedDevice?.name}
            partnerBroadcasting={partnerState.isBroadcasting}
          />
        )}
      </div>
    </div>
  );
};
