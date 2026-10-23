import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Maximize2,
  Minimize2,
  Tv,
  Activity,
  Layers,
  MousePointer,
  PictureInPicture,
  Wifi,
} from 'lucide-react';
import { WebRTCService, StreamStats } from '../services/WebRTCService';
import { Device } from '../types';

interface ScreenViewerProps {
  device: Device | null;
}

export const ScreenViewer: React.FC<ScreenViewerProps> = ({ device }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hasDirectFrame, setHasDirectFrame] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quality, setQuality] = useState<'720p' | '1080p' | 'auto'>('1080p');
  const [forwardInput, setForwardInput] = useState(true);
  const [stats, setStats] = useState({
    fps: 60,
    latency: 24,
    bitrate: '3.5 Mbps',
    resolution: '1920x1080',
  });

  useEffect(() => {
    // WebRTC stream subscriber (for Android WebView & modern browser peers)
    const unsubStream = WebRTCService.onRemoteStream((stream) => {
      setRemoteStream(stream);
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => {
          console.warn('Video play error (handled):', err);
        });
      }
    });

    // Direct transport frame subscriber (for WebKitGTK on Linux without WebRTC)
    const unsubFrame = WebRTCService.onFrame((frameDataUrl) => {
      setHasDirectFrame(true);
      const canvas = canvasRef.current;
      if (canvas) {
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
        };
        img.src = frameDataUrl;
      }
    });

    const unsubStats = WebRTCService.onStats((newStats: StreamStats) => {
      setStats({
        fps: newStats.fps,
        latency: newStats.latencyMs,
        bitrate: `${(newStats.bitrateKbps / 1000).toFixed(1)} Mbps`,
        resolution: newStats.resolution,
      });
    });

    return () => {
      unsubStream();
      unsubFrame();
      unsubStats();
    };
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current && typeof videoRef.current.requestPictureInPicture === 'function') {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('Picture-in-picture error:', e);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!forwardInput || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    WebRTCService.sendData('control', {
      action: 'mousemove',
      x,
      y,
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!forwardInput) return;
    WebRTCService.sendData('control', {
      action: 'mousedown',
      button: e.button === 2 ? 'right' : e.button === 1 ? 'middle' : 'left',
    });
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!forwardInput) return;
    WebRTCService.sendData('control', {
      action: 'mouseup',
      button: e.button === 2 ? 'right' : e.button === 1 ? 'middle' : 'left',
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!forwardInput) return;
    WebRTCService.sendData('control', {
      action: 'click',
      button: e.button === 2 ? 'right' : 'left',
    });
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!forwardInput) return;
      WebRTCService.sendData('control', {
        action: 'keypress',
        key: e.key,
        code: e.code,
      });
    },
    [forwardInput]
  );

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative flex-1 flex flex-col bg-black rounded-3xl overflow-hidden border border-gray-200 dark:border-vellichor-border shadow-2xl group min-h-[380px] focus:outline-none"
      onMouseMove={handleCanvasMouseMove}
      onMouseDown={handleCanvasMouseDown}
      onMouseUp={handleCanvasMouseUp}
      onClick={handleCanvasClick}
      onContextMenu={(e) => {
        e.preventDefault();
        handleCanvasClick(e);
      }}
    >
      {/* Top Overlay Stats Bar */}
      <div
        className={`absolute ${
          isFullscreen ? 'top-6' : 'top-3'
        } left-3 right-3 z-[50] flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none`}
      >
        <div className="flex items-center space-x-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-white">
          <Activity className="w-3.5 h-3.5 text-secondary animate-pulse" />
          <span className="font-mono font-medium text-[10px] text-emerald-400">{stats.latency}ms RTT</span>
          <span className="font-mono text-[10px] text-gray-300">• {stats.fps} FPS</span>
          <span className="font-mono text-[10px] text-gray-300">• {stats.bitrate}</span>
          <span className="font-mono text-[10px] text-primary hidden sm:inline">• {stats.resolution}</span>
        </div>

        <div className="flex items-center space-x-2 pointer-events-auto">
          {/* Quality selector */}
          <div className="flex bg-black/70 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs text-white">
            {(['720p', '1080p', 'auto'] as const).map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className={`px-2.5 py-1 rounded-lg uppercase text-[9px] font-bold transition-colors ${
                  quality === q
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Picture in Picture */}
          <button
            onClick={togglePiP}
            title="Picture-in-Picture"
            className="p-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-white hover:text-primary transition-colors cursor-pointer"
          >
            <PictureInPicture className="w-3.5 h-3.5" />
          </button>

          {/* Forward input toggle */}
          <button
            onClick={() => setForwardInput(!forwardInput)}
            title={forwardInput ? 'Remote input forwarded' : 'Remote input disabled'}
            className={`p-2 rounded-xl backdrop-blur-md border text-[9px] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
              forwardInput
                ? 'bg-primary border-primary text-white'
                : 'bg-black/70 border-white/10 text-white/60 hover:text-white'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-white hover:text-primary transition-colors cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Video Content, Hardware Canvas, or Standby HUD */}
      {remoteStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain pointer-events-none select-none bg-black"
        />
      ) : hasDirectFrame ? (
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain pointer-events-none select-none bg-black"
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 space-y-4 bg-slate-950">
          <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-primary animate-pulse">
            <Tv className="w-10 h-10" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-white">
              {device ? `Awaiting stream from ${device.name}` : 'No Peer Stream Active'}
            </h4>
            <p className="text-xs text-gray-400 max-w-sm mt-1">
              When the connected peer shares their screen, it will render here in real-time with sub-50ms latency.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400 font-mono">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Dual-Mode Hardware Video Engine Active</span>
          </div>
        </div>
      )}
    </div>
  );
};
