import React from 'react';
import {
    Wifi,
    WifiOff,
    Laptop,
    Smartphone,
    Moon,
    Sun,
    Monitor,
    Unplug,
} from 'lucide-react';
import { Device, SystemInfo } from '../types';
import appIcon from '../../assets/vellichor_transparent.png';

interface NavbarProps {
    currentTab: string;
    connectedDevice: Device | null;
    systemInfo: SystemInfo | null;
    isMobileLayout: boolean;
    setIsMobileLayout: (val: boolean) => void;
    theme: 'light' | 'dark' | 'system';
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    onDisconnect: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
    connectedDevice,
    systemInfo,
    isMobileLayout,
    setIsMobileLayout,
    theme,
    setTheme,
    onDisconnect,
}) => {
    const toggleTheme = () => {
        if (theme === 'dark') setTheme('light');
        else setTheme('dark');
    };

    return (
        <header className="h-16 px-4 md:px-6 bg-white dark:bg-vellichor-surface border-b border-gray-200 dark:border-vellichor-border flex items-center justify-between shrink-0 z-30 transition-colors">
            {/* Brand */}
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    <img className='rounded-full' src={appIcon} alt="App icon" />
                </div>
                <div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:block">
                        Cross-Device Screen & Control
                    </p>
                </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center space-x-2">
                {/* Center Device / Status indicator */}
                <div className="flex items-center space-x-2">
                    {connectedDevice ? (
                        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/30 text-secondary text-xs font-medium">
                            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                            <span className="truncate max-w-[120px] sm:max-w-[200px]">
                                Connected: {connectedDevice.name}
                            </span>
                            <button
                                onClick={onDisconnect}
                                title="Disconnect"
                                className="p-1 hover:bg-secondary/20 rounded-full transition-colors text-gray-500 hover:text-red-500"
                            >
                                <Unplug className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-xs text-gray-500 dark:text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <span className="hidden sm:inline">No Peer Connected</span>
                            <span className="sm:hidden">Idle</span>
                        </div>
                    )}
                </div>
                {/* Local IP info */}
                {systemInfo && systemInfo.local_ips.length > 0 && (
                    <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-vellichor-card text-xs text-gray-500 dark:text-gray-400 font-mono">
                        <Wifi className="w-3.5 h-3.5 text-secondary" />
                        <span>{systemInfo.local_ips[0]}</span>
                    </div>
                )}

                {/* Layout Switcher (Desktop vs Mobile Preview) */}
                <button
                    onClick={() => setIsMobileLayout(!isMobileLayout)}
                    title={isMobileLayout ? 'Switch to Desktop Layout' : 'Preview Mobile Layout'}
                    className={`p-2 rounded-lg border transition-colors ${isMobileLayout
                        ? 'hidden sm:block bg-primary/10 border-primary text-primary'
                        : 'bg-gray-100 dark:bg-vellichor-card border-gray-200 dark:border-vellichor-border text-gray-600 dark:text-gray-300 hover:border-primary/50'
                        }`}
                >
                    {isMobileLayout ? (
                        <Smartphone className="w-4 h-4" />
                    ) : (
                        <Monitor className="w-4 h-4" />
                    )}
                </button>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    title="Toggle Light/Dark Theme"
                    className="p-2 rounded-lg bg-gray-100 dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                >
                    {theme === 'dark' ? (
                        <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                        <Moon className="w-4 h-4" />
                    )}
                </button>
            </div>
        </header>
    );
};
