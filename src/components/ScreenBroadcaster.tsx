import React, { useState, useRef, useEffect } from 'react';
import {
    MonitorUp, Square, Play, Video, AlertCircle, Clock, Lock,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { WebRTCService } from '../services/WebRTCService';
import { TauriNativeService } from '../services/TauriNativeService';
import { listen } from '@tauri-apps/api/event';

interface MonitorInfo {
    id: string;
    name: string;
    width: number;
    height: number;
    isPrimary: boolean;
}

interface ScreenBroadcasterProps {
    activePeerName?: string;
    partnerBroadcasting?: boolean;
}

export const ScreenBroadcaster: React.FC<ScreenBroadcasterProps> = ({
    activePeerName,
    partnerBroadcasting,
}) => {
    // ---- platform detection ----
    const [_platform, setPlatform] = useState<string | null>(null);
    const [isAndroid, setIsAndroid] = useState(false);
    const [platformChecked, setPlatformChecked] = useState(false);

    // ---- capture state ----
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [fps, setFps] = useState<30 | 60>(30);
    const [useSynthetic, setUseSynthetic] = useState(false);
    const [allowControl, setAllowControl] = useState(true);
    const [durationSeconds, setDurationSeconds] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // ---- monitor picker ----
    const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
    const [selectedMonitor, setSelectedMonitor] = useState<string | null>(null);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // A ref-based counter so the interval callback sees updates without
    // re-creating the interval on every state change.
    const lastCounterRef = useRef(-1);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const decodingRef = useRef(false);
    // -------------------------------------------------------------------
    // 1. Detect platform on mount
    // -------------------------------------------------------------------
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const sys = await TauriNativeService.getSystemInfo();
                if (cancelled) return;
                const p = sys?.platform ?? 'unknown';
                console.log('[BDR] platform=', p);
                setPlatform(p);
                setIsAndroid(p === 'android');
            } catch (e) {
                if (cancelled) return;
                console.error('[BDR] getSystemInfo failed', e);
                setPlatform('unknown');
                setIsAndroid(false);
            } finally {
                if (!cancelled) setPlatformChecked(true);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // -------------------------------------------------------------------
    // 2. Load monitors on desktop
    // -------------------------------------------------------------------
    useEffect(() => {
        if (!platformChecked || isAndroid) return;
        invoke<MonitorInfo[]>('list_monitors')
            .then((m) => {
                console.log('[BDR] monitors=', m);
                setMonitors(m);
                if (m.length > 0) setSelectedMonitor(m[0].id);
            })
            .catch((e) => {
                console.error('[BDR] list_monitors failed', e);
                setError(`Failed to list monitors: ${e}`);
            });
    }, [platformChecked, isAndroid]);

    // -------------------------------------------------------------------
    // 3. Duration timer
    // -------------------------------------------------------------------
    useEffect(() => {
        if (isBroadcasting) {
            setDurationSeconds(0);
            timerRef.current = setInterval(() => setDurationSeconds((p) => p + 1), 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isBroadcasting]);

    useEffect(() => {
        if (!isBroadcasting) return;
        if (useSynthetic && !isAndroid) return;

        let unlisten: (() => void) | undefined;
        let cancelled = false;

        const setup = async () => {
            unlisten = await listen<{
                counter: number; width: number; height: number; byteLength: number;
            }>('frame-published', (event) => {
                if (cancelled) return;
                const { counter } = event.payload;
                if (counter === lastCounterRef.current) return;
                lastCounterRef.current = counter;

                // Drop if previous frame is still decoding.
                if (decodingRef.current) return;
                decodingRef.current = true;

//                 const url = `stream://localhost/frame.jpg?t=${counter}`;
                const url = isAndroid
                ? `http://stream.localhost/frame.jpg?t=${counter}`
                : `stream://localhost/frame.jpg?t=${counter}`;
                console.log("URL", url)
                const img = new Image();
                img.onload = () => {
                    const canvas = canvasRef.current;
                    if (canvas) {
                        if (canvas.width !== img.width || canvas.height !== img.height) {
                            canvas.width = img.width;
                            canvas.height = img.height;
                        }
                        canvas.getContext('2d')?.drawImage(img, 0, 0);
                    }
                    decodingRef.current = false;
                };
                img.onerror = () => {
                    console.warn('[BDR] frame decode failed', url);
                    decodingRef.current = false;
                };
                img.src = url;

            });
            if (cancelled) unlisten?.();
        };

            setup();

            return () => {
                cancelled = true;
                unlisten?.();
            };
    }, [isBroadcasting, useSynthetic, isAndroid]);

    // -------------------------------------------------------------------
    // 5. Allow-control prop sync
    // -------------------------------------------------------------------
    useEffect(() => {
        WebRTCService.allowRemoteControl = allowControl;
    }, [allowControl]);

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const r = s % 60;
        return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
    };

    // -------------------------------------------------------------------
    // 6. Start
    // -------------------------------------------------------------------
    const startSharing = async () => {
        if (partnerBroadcasting) {
            setError('Partner device is broadcasting. Simultaneous broadcasting is locked.');
            return;
        }
        if (!isAndroid && !useSynthetic && !selectedMonitor) {
            setError('No monitor selected');
            return;
        }
        setError(null);
        console.log('[BDR] startSharing, isAndroid=', isAndroid, 'useSynthetic=', useSynthetic, 'monitor=', selectedMonitor);

        try {
            if (isAndroid) {
                console.log('[BDR] → start_android_screen_stream');
                await invoke('start_android_screen_stream');
            } else if (useSynthetic) {
                console.log('[BDR] → synthetic startScreenCapture');
                const stream = await WebRTCService.startScreenCapture({
                    resolution: '1080p', fps, useSyntheticFallback: true,
                });
                if (!stream) throw new Error('Synthetic stream failed to start');
                setIsBroadcasting(true);
                WebRTCService.updateMyState({
                    isBroadcasting: true, broadcastResolution: '1080p', broadcastFps: fps,
                });
                return;
            } else {
                console.log('[BDR] → start_screen_stream id=', selectedMonitor);
                await invoke('start_screen_stream', {
                    id: selectedMonitor!,
                    fps,
                    quality: 75,
                });
            }

            // Reset the counter so the first frame triggers an update.
            lastCounterRef.current = -1;
            setIsBroadcasting(true);
            console.log('[BDR] broadcasting=', !isBroadcasting);

            WebRTCService.updateMyState({
                isBroadcasting: true, broadcastResolution: '1080p', broadcastFps: fps,
            });
        } catch (err: any) {
            console.error('[BDR] start failed', err);
            setError(err?.message ?? String(err));
        }
    };

    // -------------------------------------------------------------------
    // 7. Stop
    // -------------------------------------------------------------------
    const stopSharing = async () => {
        console.log('[BDR] stopSharing');
        try { await invoke('stop_screen_stream'); } catch { /* ignore */ }
        WebRTCService.stopScreenCapture();
        setIsBroadcasting(false);
        lastCounterRef.current = -1;
        WebRTCService.updateMyState({ isBroadcasting: false });
    };

    // -------------------------------------------------------------------
    // 8. Render
    // -------------------------------------------------------------------
    if (!platformChecked) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-500">
                Detecting platform…
            </div>
        );
    }

    const showMonitorPicker = !isAndroid && !useSynthetic;

    return (
        <div className="flex-1 flex flex-col space-y-6">
            <div className="p-6 rounded-3xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                            <MonitorUp className="w-5 h-5 text-primary" />
                            <span>{isAndroid ? 'Share My Screen' : 'Broadcast My Screen'}</span>
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {isAndroid
                                ? 'Share your entire screen. Android will ask for permission each time.'
                                : <>Stream your display to <span className="font-semibold text-primary">{activePeerName || 'connected peer'}</span>.</>}
                        </p>
                    </div>
                    <div>
                        {isBroadcasting ? (
                            <button onClick={stopSharing}
                                className="px-6 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm shadow-balanced flex items-center space-x-2 transition-all cursor-pointer">
                                <Square className="w-4 h-4 fill-white" />
                                <span>Stop Broadcast</span>
                            </button>
                        ) : (
                            <button onClick={startSharing} disabled={partnerBroadcasting}
                                className={`px-6 py-3 rounded-2xl font-semibold text-sm shadow-balanced flex items-center space-x-2 transition-all ${partnerBroadcasting
                                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                                    : 'bg-primary hover:bg-primary-hover text-white cursor-pointer'}`}>
                                {partnerBroadcasting ? (
                                    <><Lock className="w-4 h-4" /><span>Broadcasting Locked</span></>
                                ) : (
                                    <><Play className="w-4 h-4 fill-white" /><span>Start Screen Share</span></>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {partnerBroadcasting && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center space-x-2">
                        <Lock className="w-4 h-4 shrink-0" />
                        <span>{activePeerName || 'Partner'} is currently streaming their screen.</span>
                    </div>
                )}

                {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100 dark:border-vellichor-border">
                    {!isAndroid && (
                        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border">
                            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Capture Source</label>
                            <select value={useSynthetic ? 'synthetic' : 'system'} disabled={isBroadcasting || partnerBroadcasting}
                                onChange={(e) => setUseSynthetic(e.target.value === 'synthetic')}
                                className="appearance-none w-full bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-xs font-semibold rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-primary">
                                <option value="system">Display (Native)</option>
                                <option value="synthetic">Interactive Demo Display</option>
                            </select>
                        </div>
                    )}

                    {showMonitorPicker && (
                        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border">
                            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Monitor</label>
                            <select value={selectedMonitor ?? ''} disabled={isBroadcasting || partnerBroadcasting}
                                onChange={(e) => setSelectedMonitor(e.target.value)}
                                className="appearance-none w-full bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-xs font-semibold rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:border-primary">
                                {monitors.length === 0
                                    ? <option value="">No monitors</option>
                                    : monitors.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name} ({m.width}×{m.height}){m.isPrimary ? ' — primary' : ''}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}

                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border">
                        <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Max Frame Rate</label>
                        <div className="flex space-x-2">
                            {[30, 60].map((f) => (
                                <button key={f} disabled={isBroadcasting || partnerBroadcasting}
                                    onClick={() => setFps(f as any)}
                                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${fps === f
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-gray-600 dark:text-gray-300'}`}>
                                    {f} FPS
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border flex items-center justify-between">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Remote Control</label>
                            <span className="text-[11px] text-gray-500">Allow peer mouse/keys</span>
                        </div>
                        <input type="checkbox" checked={allowControl} disabled={isBroadcasting}
                            onChange={(e) => setAllowControl(e.target.checked)}
                            className="w-5 h-5 accent-primary rounded cursor-pointer" />
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div className="flex-1 min-h-[320px] bg-black rounded-3xl overflow-hidden border border-gray-800 relative flex items-center justify-center shadow-xl">
                <canvas
                    ref={canvasRef}
                    className={`w-full h-full object-contain ${isBroadcasting ? '' : 'hidden'}`}
                />
                {isBroadcasting ? (
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
                ) : (
                    <div className="text-center p-8 space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mx-auto">
                            <Video className="w-8 h-8" />
                        </div>
                        <h4 className="text-sm font-semibold text-white">Broadcast Inactive</h4>
                        <p className="text-xs text-gray-400 max-w-xs mx-auto">
                            {partnerBroadcasting
                                ? 'Partner is currently sharing their screen. Simultaneous sharing is locked.'
                                : isAndroid
                                    ? 'Tap "Start Screen Share" to grant permission and begin broadcasting.'
                                    : 'Click "Start Screen Share" above to begin streaming your display to the peer.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
