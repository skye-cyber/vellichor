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
  Clock,
  ShieldCheck,
  Sparkles,
  Lock,
} from 'lucide-react';
import { WebRTCService } from '../services/WebRTCService';

interface ScreenBroadcasterProps {
  activePeerName?: string;
  partnerBroadcasting?: boolean;
}

export const ScreenBroadcaster: React.FC<ScreenBroadcasterProps> = ({
  activePeerName,
  partnerBroadcasting,
}) => {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [resolution, setResolution] = useState<'720p' | '1080p' | 'original'>('1080p');
  const [fps, setFps] = useState<30 | 60>(60);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [useSynthetic, setUseSynthetic] = useState(false);
  const [allowControl, setAllowControl] = useState(true);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    WebRTCService.allowRemoteControl = allowControl;
  }, [allowControl]);

  useEffect(() => {
    if (isBroadcasting) {
      setDurationSeconds(0);
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isBroadcasting]);

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startSharing = async () => {
    if (partnerBroadcasting) {
      setError('Partner device is broadcasting. Simultaneous broadcasting is locked.');
      return;
    }

    setError(null);
    try {
      const stream = await WebRTCService.startScreenCapture({
        resolution,
        fps,
        useSyntheticFallback: useSynthetic,
      });

      if (stream) {
        setIsBroadcasting(true);
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream;
          previewVideoRef.current.play().catch(() => {});
        }

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            stopSharing();
          };
        }
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
                className="px-6 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm shadow-balanced flex items-center space-x-2 transition-all cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Stop Broadcast</span>
              </button>
            ) : (
              <button
                onClick={startSharing}
                disabled={partnerBroadcasting}
                className={`px-6 py-3 rounded-2xl font-semibold text-sm shadow-balanced flex items-center space-x-2 transition-all ${
                  partnerBroadcasting
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary-hover text-white cursor-pointer'
                }`}
              >
                {partnerBroadcasting ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Broadcasting Locked</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Start Screen Share</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {partnerBroadcasting && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center space-x-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>
              {activePeerName || 'Partner'} is currently streaming their screen. To avoid stream conflicts, only one peer can broadcast at a time. Switch to &quot;Watch Remote&quot; to view their display.
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Capture Configuration Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100 dark:border-vellichor-border">
          {/* Stream Source Mode */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border">
            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Capture Source
            </label>
            <select
              value={useSynthetic ? 'synthetic' : 'system'}
              disabled={isBroadcasting || partnerBroadcasting}
              onChange={(e) => setUseSynthetic(e.target.value === 'synthetic')}
              className="w-full bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-xs font-semibold rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-primary"
            >
              <option value="system">Display / Window (Native)</option>
              <option value="synthetic">Interactive Demo Display</option>
            </select>
          </div>

          {/* Resolution */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border">
            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Target Resolution
            </label>
            <select
              value={resolution}
              disabled={isBroadcasting || partnerBroadcasting}
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
                  disabled={isBroadcasting || partnerBroadcasting}
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

          {/* Remote Control Permission */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border flex items-center justify-between">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Remote Control
              </label>
              <span className="text-[11px] text-gray-500">Allow peer mouse/keys</span>
            </div>
            <input
              type="checkbox"
              checked={allowControl}
              disabled={isBroadcasting}
              onChange={(e) => setAllowControl(e.target.checked)}
              className="w-5 h-5 accent-primary rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Live Preview Container */}
      <div className="flex-1 min-h-[320px] bg-black rounded-3xl overflow-hidden border border-gray-800 relative flex items-center justify-center shadow-xl">
        {isBroadcasting ? (
          <>
            <div className="absolute top-4 left-4 z-10 flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold tracking-wide animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white" />
                <span>LIVE BROADCAST</span>
              </div>
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-mono">
                <Clock className="w-3 h-3 text-secondary" />
                <span>{formatDuration(durationSeconds)}</span>
              </div>
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
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              {partnerBroadcasting
                ? 'Partner is currently sharing their screen. Simultaneous sharing is locked.'
                : 'Click "Start Screen Share" above to begin streaming your display or interactive virtual desktop to peer.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
