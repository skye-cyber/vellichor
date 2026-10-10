import React, { useState, useRef, useEffect } from 'react';
import {
  MonitorUp,
  Square,
  Play,
  Settings2,
  Mic,
  Video,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { WebRTCService } from '../services/WebRTCService';

interface ScreenBroadcasterProps {
  activePeerName?: string;
}

export const ScreenBroadcaster: React.FC<ScreenBroadcasterProps> = ({
  activePeerName,
}) => {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [resolution, setResolution] = useState<'720p' | '1080p' | 'original'>('1080p');
  const [fps, setFps] = useState<30 | 60>(60);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const startSharing = async () => {
    setError(null);
    try {
      const stream = await WebRTCService.startScreenCapture({
        resolution,
        fps,
      });

      if (stream) {
        setIsBroadcasting(true);
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream;
        }

        // Listen for user clicking browser "Stop Sharing" floating button
        stream.getVideoTracks()[0].onended = () => {
          stopSharing();
        };
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        setError(err.message || 'Failed to capture screen');
      }
    }
  };

  const stopSharing = () => {
    WebRTCService.stopScreenCapture();
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
    setIsBroadcasting(false);
  };

  return (
    <div className="flex-1 flex flex-col space-y-6">
      {/* Controls Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center space-x-2">
              <MonitorUp className="w-5 h-5 text-primary" />
              <span>Broadcast My Screen</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Stream your display directly to{' '}
              <span className="font-semibold text-primary">
                {activePeerName || 'connected peer'}
              </span>{' '}
              with hardware acceleration.
            </p>
          </div>

          <div>
            {isBroadcasting ? (
              <button
                onClick={stopSharing}
                className="px-6 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm shadow-balanced flex items-center space-x-2 transition-all"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Stop Broadcast</span>
              </button>
            ) : (
              <button
                onClick={startSharing}
                className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm shadow-balanced flex items-center space-x-2 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Screen Share</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Capture Configuration Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100 dark:border-vellichor-border">
          {/* Resolution */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border">
            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Target Resolution
            </label>
            <select
              value={resolution}
              disabled={isBroadcasting}
              onChange={(e) => setResolution(e.target.value as any)}
              className="w-full bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-xs font-semibold rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-primary"
            >
              <option value="1080p">1080p (Full HD)</option>
              <option value="720p">720p (HD Balanced)</option>
              <option value="original">Native Display</option>
            </select>
          </div>

          {/* Frame Rate */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border">
            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Max Frame Rate
            </label>
            <div className="flex space-x-2">
              {[30, 60].map((f) => (
                <button
                  key={f}
                  disabled={isBroadcasting}
                  onClick={() => setFps(f as any)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    fps === f
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {f} FPS
                </button>
              ))}
            </div>
          </div>

          {/* Audio Inclusion */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border flex items-center justify-between">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                System Audio
              </label>
              <span className="text-xs text-gray-500">Include sound</span>
            </div>
            <input
              type="checkbox"
              disabled={isBroadcasting}
              checked={includeAudio}
              onChange={(e) => setIncludeAudio(e.target.checked)}
              className="w-5 h-5 accent-primary rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Live Preview Container */}
      <div className="flex-1 min-h-[300px] bg-black rounded-3xl overflow-hidden border border-gray-800 relative flex items-center justify-center shadow-xl">
        {isBroadcasting ? (
          <>
            <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold tracking-wide animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>LIVE BROADCASTING</span>
            </div>
            <video
              ref={previewVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          </>
        ) : (
          <div className="text-center p-8 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mx-auto">
              <Video className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-semibold text-white">Broadcast Inactive</h4>
            <p className="text-xs text-gray-400 max-w-xs">
              Click &quot;Start Screen Share&quot; above to select your screen, application window, or browser tab.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
