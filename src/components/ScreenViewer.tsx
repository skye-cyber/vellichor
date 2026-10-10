import React, { useRef, useState, useEffect } from 'react';
import {
    Maximize2,
    Minimize2,
    Tv,
    Activity,
    Layers,
    MousePointer,
    RotateCcw,
} from 'lucide-react';
import { WebRTCService } from '../services/WebRTCService';
import { Device } from '../types';

interface ScreenViewerProps {
    device: Device | null;
}

export const ScreenViewer: React.FC<ScreenViewerProps> = ({ device }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [quality, setQuality] = useState<'720p' | '1080p' | 'auto'>('1080p');
    const [forwardInput, setForwardInput] = useState(true);
    const [stats, setStats] = useState({
        fps: 60,
        latency: 28,
        bitrate: '4.2 Mbps',
        resolution: '1920x1080',
    });

    useEffect(() => {
        const unsub = WebRTCService.onRemoteStream((stream) => {
            setRemoteStream(stream);
            if (videoRef.current && stream) {
                videoRef.current.srcObject = stream;
            }
        });

        return () => {
            unsub();
        };
    }, []);

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false));
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!forwardInput || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        WebRTCService.sendData('control', {
            action: 'mousemove',
            x,
            y,
        });
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!forwardInput) return;
        WebRTCService.sendData('control', {
            action: 'click',
            button: e.button === 2 ? 'right' : 'left',
        });
    };

    return (
        <div
            ref={containerRef}
            className="relative flex-1 flex flex-col bg-black rounded-3xl overflow-hidden border border-gray-200 shadow-2xl group min-h-[360px] rounded-xl"
            onMouseMove={handleCanvasMouseMove}
            onClick={handleCanvasClick}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Top Overlay Stats Bar */}
            <div className={`absolute ${isFullscreen ? 'top-6' : 'top-1'} left-1 right-1 z-[50] flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none`}>
                <div className="flex items-center space-x-2 bg-black/10 dark:bg-black/60 backdrop-blur-md gap-1 px-0.5 py-1.5 rounded-xl border border-white/10 text-[11px] text-gray-500 dark:text-white">
                    <Activity className="w-3.5 h-3.5 text-secondary animate-pulse" />
                    <span className="font-mono font-medium text-[9px]">{stats.latency}ms</span>
                    <span className={`font-mono text-[9px] ${isFullscreen ? '' : 'hidden'}`}>{stats.fps}FPS</span>
                <span className="font-mono text-[9px]">{stats.bitrate}</span>
            </div>

            <div className="flex items-center space-x-2 pointer-events-auto">
                {/* Quality selector */}
                <div className="flex bg-black/10 dark:bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10 text-xs text-gray-500 dark:text-white">
                    {(['720p', '1080p', 'auto'] as const).map((q) => (
                        <button
                            key={q}
                            onClick={() => setQuality(q)}
                            className={`px-2.5 py-1 rounded-lg uppercase text-[9px] font-bold transition-colors ${quality === q
                                ? 'bg-primary text-white'
                                : 'text-gray-500 dark:text-white/70 hover:text-gray-600 dark:hover:text-white'
                                }`}
                        >
                            {q}
                        </button>
                    ))}
                </div>

                {/* Forward input toggle */}
                <button
                    onClick={() => setForwardInput(!forwardInput)}
                    title={forwardInput ? 'Remote input enabled' : 'Remote input disabled'}
                    className={`p-2 rounded-xl backdrop-blur-md border text-[9px] font-semibold flex items-center space-x-1.5 transition-colors ${forwardInput
                        ? 'bg-primary border-primary text-white'
                        : 'bg-black/10 dark:bg-black/60 border-white/10 text-gray-500 dark:text-white hover:text-white'
                        }`}
                >
                    <MousePointer className="w-3.5 h-3.5" />
                </button>

                {/* Fullscreen toggle */}
                <button
                    onClick={toggleFullscreen}
                    className="p-2 rounded-xl bg-black/10 dark:bg-black/60 backdrop-blur-md border border-white/10 text-gray-500 dark:text-white hover:text-primary transition-colors"
                >
                    {isFullscreen ? (
                        <Minimize2 className="w-4 h-4" />
                    ) : (
                        <Maximize2 className="w-4 h-4" />
                    )}
                </button>
            </div>
        </div>

            {/* Video Content or Standby Canvas */ }
    {
        remoteStream ? (
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
            />
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 space-y-4 bg-white dark:bg-slate-950">
                <div className="w-20 h-20 rounded-3xl bg-white/5 border border-gray-100 dark:border-gray-200 flex items-center justify-center text-primary animate-pulse">
                    <Tv className="w-10 h-10" />
                </div>
                <div>
                    <h4 className="text-base font-semibold text-white">
                        {device ? `Awaiting stream from ${device.name}` : 'No Peer Stream Active'}
                    </h4>
                    <p className="text-xs text-gray-500 max-w-sm mt-1">
                        When the connected peer shares their screen, it will render here in real-time with sub-100ms latency.
                    </p>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500 font-mono">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span>Hardware Accelerated Decoder Active</span>
                </div>
            </div>
        )
    }
        </div >
    );
};
