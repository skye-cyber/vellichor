import React from 'react';
import {
    Radio,
    Gamepad2,
    FolderSync,
    Settings,
    MonitorPlay,
    Wifi,
    ArrowRight,
    //ShieldCheck,
    //Zap,
    Laptop,
    Smartphone,
} from 'lucide-react';
import { Device, SystemInfo } from '../types';

interface HomeScreenProps {
    devices: Device[];
    connectedDevice: Device | null;
    systemInfo: SystemInfo | null;
    onNavigate: (tab: string) => void;
    onConnectDevice: (device: Device) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
    devices,
    connectedDevice,
    systemInfo,
    onNavigate,
    onConnectDevice,
}) => {
    const features = [
        {
            id: 'discovery',
            icon: Radio,
            title: 'Device Discovery',
            description: 'Discover & pair with local peers over mDNS/SSDP',
            color: '#6C5CE7',
            stat: `${devices.length} nearby`,
        },
        {
            id: 'screen',
            icon: MonitorPlay,
            title: 'Screen Sharing',
            description: 'Bidirectional low-latency screen viewing & broadcast',
            color: '#0984E3',
            stat: 'Up to 60 FPS',
        },
        {
            id: 'control',
            icon: Gamepad2,
            title: 'Remote Control',
            description: 'Touchpad, virtual keyboard & media playback controls',
            color: '#00B894',
            stat: 'Input Forwarding',
        },
        {
            id: 'files',
            icon: FolderSync,
            title: 'File Transfer',
            description: 'Chunked P2P transfer & instant QR Web Share',
            color: '#FD79A8',
            stat: 'Direct DataChannel',
        },
        {
            id: 'settings',
            icon: Settings,
            title: 'Settings & Security',
            description: 'Configure hardware acceleration, encryption & cache',
            color: '#FDCB6E',
            stat: 'Customizable',
        },
    ];

    const isConnected = Boolean(connectedDevice);
    const localIp = systemInfo?.local_ips?.[0];

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
            {/* Welcome Banner */}
            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-vellichor-card sm:p-6 md:p-8">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                            Overview
                        </h2>
                    </div>

                    <span
                        aria-live="polite"
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${isConnected
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                            }`}
                    >
                        <span
                            className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-gray-400'
                                }`}
                            aria-hidden="true"
                        />
                        {isConnected ? 'Connected' : 'Not connected'}
                    </span>
                </div>

                <dl className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
                    <div className="min-w-0 rounded-2xl border border-violet-100 bg-violet-50/60 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
                        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Connected peer
                        </dt>
                        <dd className="mt-2 truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                            {connectedDevice?.name || '0'}
                        </dd>
                    </div>

                    <div className="min-w-0 rounded-2xl border border-gray-100 bg-gray-50 p-3 sm:p-4 dark:border-gray-800 dark:bg-gray-900/70">
                        <dt className="flex text-xs font-medium text-gray-500 dark:text-gray-400">
                            Discovered<span className='hidden sm:flex'>&nbsp; devices</span>
                        </dt>
                        <dd className="mt-1 flex items-baseline gap-2">
                            <span className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                                {devices.length}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {devices.length === 1 ? 'device' : 'devices'}
                            </span>
                        </dd>
                    </div>

                    <div className="min-w-0 rounded-2xl border border-gray-100 bg-gray-50 p-3 sm:p-4 dark:border-gray-800 dark:bg-gray-900/70">
                        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            This device
                        </dt>
                        <dd className="mt-2 truncate text-base text-[12px] sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {systemInfo?.hostname || 'Name N/A'}
                        </dd>
                    </div>

                    <div className="min-w-0 rounded-2xl border border-gray-100 bg-gray-50 p-3 sm:p-4 dark:border-gray-800 dark:bg-gray-900/70">
                        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Local IP address
                        </dt>
                        <dd className="mt-2 truncate font-mono text-[12px] sm:text-sm font-semibold text-gray-900 dark:text-gray-100 select-text">
                            {localIp || 'Unavailable'}
                        </dd>
                    </div>
                </dl>
            </div>


            {/* Network Status Banner */}
            <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border shadow-sm flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="size-6 sm:size-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                        <Wifi className="size-4 sm:size-6" />
                    </div>
                    <div>
                        <h4 className="flex text-sm font-semibold text-gray-900 dark:text-white">
                            <span className='hidden sm:flex'>Local</span>&nbsp;Subnet Connection <span className='hidden sm:flex'>&nbsp;Active</span>
                        </h4>
                        <p className="text-xs text-gray-500">
                            LAN P2P signaling + WebRTC data channels • Ready
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => onNavigate('discovery')}
                    className="px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                    <span>Scan</span><span className='hidden sm:flex'>Network</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Feature Modules Grid */}
            <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1">
                    Feature Modules
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {features.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={feature.id}
                                onClick={() => onNavigate(feature.id)}
                                className="p-5 rounded-3xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border hover:border-primary/50 shadow-sm hover:shadow-balanced cursor-pointer transition-all group flex flex-col justify-between"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm"
                                            style={{ backgroundColor: `${feature.color}15`, color: feature.color }}
                                        >
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-vellichor-surface text-gray-600 dark:text-gray-300">
                                            {feature.stat}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                                            {feature.title}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-vellichor-border flex items-center justify-between text-xs font-semibold text-primary cursor-pointer">
                                    <span>Open Module</span>
                                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Discovered Devices Quick List */}
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Discovered Devices ({devices.length})
                    </h2>
                    <button
                        onClick={() => onNavigate('discovery')}
                        className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                    >
                        View All
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {devices.slice(0, 3).map((device) => (
                        <div
                            key={device.id}
                            className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border flex items-center justify-between shadow-sm"
                        >
                            <div className="flex items-center space-x-2 sm:space-x-3 truncate">
                                <div className="size-8 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    {device?.type === 'phone' ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                                </div>
                                <div className="truncate">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                        {device.name}
                                    </h4>
                                    <p className="text-xs text-gray-500 font-mono mt-0.5 select-text">
                                        {device.ip}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => onConnectDevice(device)}
                                className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shrink-0 ml-2 shadow-sm transition-all cursor-pointer"
                            >
                                {connectedDevice?.id === device.id ? 'Connected' : 'Connect'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
