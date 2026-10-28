import React, { useCallback, useEffect, useState } from 'react';
import {
    Wifi,
    Lock,
    Palette,
    Gauge,
    Database,
    Cpu,
    Download,
    Upload,
    RotateCcw,
    Trash2,
    Check,
    // AlertTriangle,
    // FileText,
    // Heart,
    // Server,
    // Smartphone,
    Keyboard,
} from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { SectionHeader } from '../components/SectionHeader';
import { ToggleSetting } from '../components/ToggleSetting';
import { SelectSetting } from '../components/SelectSetting';
import { TauriNativeService } from '../services/TauriNativeService';

export const SettingsScreen: React.FC = () => {
    const {
        settings,
        loading,
        saving,
        cacheInfo,
        history,
        updateSetting,
        resetToDefaults,
        clearCache,
        clearHistory,
        exportSettings,
        importSettings,
    } = useSettings();

    const [notification, setNotification] = useState<string | null>(null);
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importJson, setImportJson] = useState('');
    const [appVersion, setAppVersion] = useState<string | null>(null)

    const showToast = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const handleExport = async () => {
        const json = await exportSettings();
        if (json) {
            await navigator.clipboard.writeText(json);
            showToast('Settings JSON exported to clipboard!');
        }
    };

    const handleImport = async () => {
        try {
            await importSettings(importJson);
            setImportModalOpen(false);
            setImportJson('');
            showToast('Settings imported successfully!');
        } catch {
            showToast('Error importing settings JSON');
        }
    };

    const handleReset = async () => {
        if (window.confirm('Reset all Vellichor settings to defaults?')) {
            await resetToDefaults();
            showToast('Settings reset to factory defaults.');
        }
    };

    const setVersion = useCallback(async () => {
        const version = await TauriNativeService.getVersion()
        if (version) setAppVersion(version)
    }, [])

    useEffect(() => {
        setVersion()
    }, [])

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="animate-spin text-primary font-bold">Loading Settings...</div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-4xl mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-vellichor-border">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Manage networking, security protocols, hardware encoding, and storage.
                    </p>
                </div>

                {saving && (
                    <span className="text-xs text-primary font-bold flex items-center space-x-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        <span>Saving...</span>
                    </span>
                )}
            </div>

            {notification && (
                <div className="p-3.5 rounded-2xl bg-secondary/15 border border-secondary/30 text-secondary text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{notification}</span>
                </div>
            )}

            {/* 1. Connection Section */}
            <section className="space-y-2">
                <SectionHeader
                    title="Connection & Networking"
                    icon={Wifi}
                    showReset
                    onReset={() => updateSetting('autoConnect', true)}
                />
                <div className="rounded-3xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border shadow-sm divide-y divide-gray-100 dark:divide-vellichor-border/50">
                    <ToggleSetting
                        label="Auto-connect"
                        description="Automatically connect to trusted devices on local subnet"
                        value={settings.autoConnect}
                        onValueChange={(val) => updateSetting('autoConnect', val)}
                    />

                    <SelectSetting
                        label="Discovery Mode"
                        description="Strategy used to find nearby Vellichor peers"
                        value={settings.discoveryMode}
                        options={[
                            { label: 'All Local Networks', value: 'all', description: 'mDNS multicast and subnet broadcast' },
                            { label: 'Saved Only', value: 'saved', description: 'Only connect to previously trusted devices' },
                            { label: 'Manual Only', value: 'manual', description: 'Disable automated broadcast scans' },
                        ]}
                        onValueChange={(val) => updateSetting('discoveryMode', val as any)}
                    />

                    <SelectSetting
                        label="Stream Quality Preset"
                        description="Balance between video latency and bandwidth consumption"
                        value={settings.streamQuality}
                        options={[
                            { label: 'Balanced', value: 'balanced', description: '30 FPS @ 1080p (2.5 Mbps)' },
                            { label: 'High Performance', value: 'performance', description: '60 FPS @ 1080p (5.0 Mbps)' },
                            { label: 'Battery Saver', value: 'battery', description: '15 FPS @ 720p (1.0 Mbps)' },
                        ]}
                        onValueChange={(val) => updateSetting('streamQuality', val as any)}
                    />

                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                Signaling Server URL
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Central node for initial WebRTC handshake and rooms
                            </p>
                        </div>
                        <input
                            type="text"
                            value={settings.signalingServerUrl}
                            onChange={(e) => updateSetting('signalingServerUrl', e.target.value)}
                            className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border font-mono text-xs text-gray-800 dark:text-white focus:outline-none focus:border-primary w-full sm:w-64"
                        />
                    </div>
                </div>
            </section>

            {/* 2. Privacy & Security Section */}
            <section className="space-y-2">
                <SectionHeader title="Privacy & Security" icon={Lock} />
                <div className="rounded-3xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border shadow-sm divide-y divide-gray-100 dark:divide-vellichor-border/50">
                    <ToggleSetting
                        label="End-to-End Encryption"
                        description="Encrypt all video frames and control channels over DTLS"
                        value={settings.encryption}
                        warning="Disabling encryption allows network inspection"
                        onValueChange={(val) => updateSetting('encryption', val)}
                    />

                    <ToggleSetting
                        label="Require Pairing Confirmation"
                        description="Require manual 6-digit confirmation before pairing new devices"
                        value={settings.requirePairing}
                        onValueChange={(val) => updateSetting('requirePairing', val)}
                    />

                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                Connection History
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {history.length} saved peer connections in local memory
                            </p>
                        </div>
                        <button
                            onClick={clearHistory}
                            className="flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors gap-1"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className='text-base'>Clear</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* 3. Appearance Section */}
            <section className="space-y-2">
                <SectionHeader title="Appearance & Interface" icon={Palette} />
                <div className="rounded-3xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border shadow-sm divide-y divide-gray-100 dark:divide-vellichor-border/50">
                    <SelectSetting
                        label="App Theme"
                        description="Select interface color mode"
                        value={settings.theme}
                        options={[
                            { label: 'Dark Mode', value: 'dark', description: 'Vellichor signature deep violet dark' },
                            { label: 'Light Mode', value: 'light', description: 'Crisp high-contrast daylight theme' },
                            { label: 'System Default', value: 'system', description: 'Matches OS theme preference' },
                        ]}
                        onValueChange={(val) => updateSetting('theme', val as any)}
                    />

                    <ToggleSetting
                        label="Reduce Animations"
                        description="Simplify transitions to maximize low-spec device responsiveness"
                        value={settings.reduceAnimations}
                        onValueChange={(val) => updateSetting('reduceAnimations', val)}
                    />

                    <ToggleSetting
                        label="Compact View"
                        description="Tighter element spacing to display more controls on screen"
                        value={settings.compactView}
                        onValueChange={(val) => updateSetting('compactView', val)}
                    />
                </div>
            </section>

            {/* 4. Performance Section */}
            <section className="space-y-2">
                <SectionHeader title="Performance & Encoding" icon={Gauge} />
                <div className="rounded-3xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border shadow-sm divide-y divide-gray-100 dark:divide-vellichor-border/50">
                    <SelectSetting
                        label="Default Screen Stream Resolution"
                        value={settings.resolution}
                        options={[
                            { label: '1080p (Full HD)', value: '1080p', description: 'Sharp text for reading' },
                            { label: '720p (HD)', value: '720p', description: 'Optimal for wireless LAN' },
                            { label: 'Native Display', value: 'original', description: 'Unscaled frame buffer' },
                        ]}
                        onValueChange={(val) => updateSetting('resolution', val as any)}
                    />

                    <SelectSetting
                        label="Max Frame Rate"
                        value={String(settings.maxFrameRate)}
                        options={[
                            { label: '60 FPS', value: '60', description: 'Silky smooth cursor and video' },
                            { label: '30 FPS', value: '30', description: 'Half the CPU/GPU workload' },
                        ]}
                        onValueChange={(val) => updateSetting('maxFrameRate', parseInt(val) as any)}
                    />

                    <ToggleSetting
                        label="Hardware Acceleration"
                        description="Use GPU video decoder/encoder acceleration when available"
                        value={settings.hardwareAcceleration}
                        onValueChange={(val) => updateSetting('hardwareAcceleration', val)}
                    />

                    <ToggleSetting
                        label="Keep Screen Awake"
                        description="Prevent device display from sleeping while a remote session is active"
                        value={settings.keepAwake}
                        onValueChange={(val) => updateSetting('keepAwake', val)}
                    />
                </div>
            </section>

            {/* 5. Keyboard & Mobile Input Section */}
            <section className="space-y-2">
                <SectionHeader title="Keyboard & Mobile Input" icon={Keyboard} />
                <div className="rounded-3xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border shadow-sm divide-y divide-gray-100 dark:divide-vellichor-border/50">
                    <ToggleSetting
                        label="Suppress Default Android/Mobile Keyboard"
                        description="Prevents the native system soft keyboard from popping up automatically when editable remote control fields are clicked, keeping the screen unobstructed"
                        value={settings.suppressNativeKeyboard}
                        onValueChange={(val) => updateSetting('suppressNativeKeyboard', val)}
                    />
                </div>
            </section>

            {/* 5. Storage Section */}
            <section className="space-y-2">
                <SectionHeader title="Storage & Downloads" icon={Database} />
                <div className="rounded-3xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border shadow-sm divide-y divide-gray-100 dark:divide-vellichor-border/50">
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                Cache Memory
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {formatBytes(cacheInfo.sizeBytes)} across {cacheInfo.filesCount} cached chunks
                            </p>
                        </div>
                        <button
                            onClick={async () => {
                                await clearCache();
                                showToast('Cache memory cleaned successfully!');
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-vellichor-surface hover:text-primary transition-colors"
                        >
                            Clear Cache
                        </button>
                    </div>

                    <ToggleSetting
                        label="Auto-download Received Files"
                        description="Automatically save incoming files into default download folder"
                        value={settings.autoDownload}
                        onValueChange={(val) => updateSetting('autoDownload', val)}
                    />

                    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                Download Path
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Directory where received transfers are stored
                            </p>
                        </div>
                        <input
                            type="text"
                            disabled
                            value={settings.downloadPath}
                            onChange={(e) => updateSetting('downloadPath', e.target.value)}
                            className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border font-mono text-xs text-gray-800 dark:text-white focus:outline-none focus:border-primary w-full sm:w-64"
                        />
                    </div>
                </div>
            </section>

            {/* 6. Data & Configuration Backup */}
            <section className="space-y-2">
                <SectionHeader title="Data Management" icon={Cpu} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                        onClick={handleExport}
                        className="p-5 rounded-3xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border hover:border-primary text-left transition-all shadow-sm space-y-2"
                    >
                        <div className="flex gap-2 items-center">
                            <Download className="w-5 h-5 text-primary" />
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                                Export Settings
                            </h4>
                        </div>
                        <p className="text-xs text-gray-500">
                            Save configuration JSON to clipboard or backup
                        </p>
                    </button>

                    <button
                        onClick={() => setImportModalOpen(true)}
                        className="p-5 rounded-3xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border hover:border-secondary text-left transition-all shadow-sm space-y-2"
                    >
                        <div className="flex gap-2 items-center">
                            <Upload className="w-5 h-5 text-secondary" />
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                                Import Settings
                            </h4>
                        </div>
                        <p className="text-xs text-gray-500">
                            Restore configuration from a settings JSON backup
                        </p>
                    </button>

                    <button
                        onClick={handleReset}
                        className="p-5 rounded-3xl bg-white dark:bg-vellichor-card border border-red-500/20 hover:border-red-500 text-left transition-all shadow-sm space-y-2"
                    >
                        <div className="flex gap-2 items-center">
                            <RotateCcw className="w-5 h-5 text-red-500" />
                            <h4 className="font-bold text-sm text-red-500">Reset All</h4>
                        </div>
                        <p className="text-xs text-gray-500">
                            Restore defaults and clean cached configurations
                        </p>
                    </button>
                </div>
            </section>

            {/* Footer */}
            <div className="text-center py-6 text-xs text-gray-400 space-y-1">
                <div className="flex items-center justify-center space-x-1.5 font-semibold text-gray-500">
                    <span>Vellichor v{appVersion ? appVersion : '-'}</span>
                    <span>•</span>
                    <span className="text-primary font-bold">Unified</span>
                </div>
                <p>© 2026 Vellichor</p>
            </div>

            {/* Import Modal */}
            {importModalOpen && (
                <div onClick={() => setImportModalOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md bg-white dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border rounded-3xl p-6 shadow-2xl space-y-4">
                        <h3 className="font-bold text-base text-gray-900 dark:text-white">
                            Paste Settings JSON
                        </h3>
                        <textarea
                            rows={8}
                            value={importJson}
                            onChange={(e) => setImportJson(e.target.value)}
                            placeholder='{"settings": { ... }}'
                            className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-xs font-mono text-gray-800 dark:text-white focus:outline-none focus:border-primary"
                        />
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => setImportModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white shadow-sm"
                            >
                                Apply Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
