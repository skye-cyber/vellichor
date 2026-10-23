import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { DiscoveryScreen } from './screens/DiscoveryScreen';
import { ScreenShareScreen } from './screens/ScreenShareScreen';
import { ControlScreen } from './screens/ControlScreen';
import { FilesScreen } from './screens/FilesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { useDeviceDiscovery } from './hooks/useDeviceDiscovery';
import { useSettings } from './hooks/useSettings';
import { SignalingService } from './services/SignalingService';
import { FileTransferService } from './services/FileTransferService';

export const App: React.FC = () => {
    const [currentTab, setCurrentTab] = useState<string>('home');
    const [isMobileLayout, setIsMobileLayout] = useState<boolean>(() => {
        return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    });
    const [activeTransferCount, setActiveTransferCount] = useState<number>(0);

    const {
        devices,
        isScanning,
        connectedDevice,
        systemInfo,
        startScan,
        connectToDevice,
        disconnectDevice,
    } = useDeviceDiscovery();

    const { settings, updateSetting } = useSettings();

    // Listen to window resize
    useEffect(() => {
        // Set initial theme
        updateSetting('theme', settings.theme)
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setIsMobileLayout(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Connect signaling client
    useEffect(() => {
        if (settings.signalingServerUrl) {
            SignalingService.connect(settings.signalingServerUrl);
        }
        return () => {
            SignalingService.disconnect();
        };
    }, [settings.signalingServerUrl]);

    // Track active transfers for navigation badge
    useEffect(() => {
        const unsub = FileTransferService.subscribe((list) => {
            const active = list.filter((t) => t.status === 'transferring').length;
            setActiveTransferCount(active);
        });
        return unsub;
    }, []);

    return (
        <div className="h-screen w-screen flex flex-col bg-gray-50 dark:bg-vellichor-dark text-gray-900 dark:text-gray-100 overflow-hidden font-sans transition-colors py-8 sm:py-0">
            {/* Top Application Bar */}
            <Navbar
                currentTab={currentTab}
                connectedDevice={connectedDevice}
                systemInfo={systemInfo}
                isMobileLayout={isMobileLayout}
                setIsMobileLayout={setIsMobileLayout}
                theme={settings.theme}
                setTheme={(th) => updateSetting('theme', th)}
                onDisconnect={disconnectDevice}
            />

            {/* Main Workspace Body */}
            <div className="flex-1 flex overflow-hidden">
                {/* Desktop Sidebar (hidden in mobile layout) */}
                {!isMobileLayout && (
                    <Sidebar
                        currentTab={currentTab}
                        setCurrentTab={setCurrentTab}
                        activeTransferCount={activeTransferCount}
                    />
                )}

                {/* Content Viewport */}
                <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-vellichor-dark">
                    {currentTab === 'home' && (
                        <HomeScreen
                            devices={devices}
                            connectedDevice={connectedDevice}
                            systemInfo={systemInfo}
                            onNavigate={(tab) => setCurrentTab(tab)}
                            onConnectDevice={connectToDevice}
                        />
                    )}

                    {currentTab === 'discovery' && (
                        <DiscoveryScreen
                            devices={devices}
                            isScanning={isScanning}
                            connectedDevice={connectedDevice}
                            onRefreshScan={startScan}
                            onConnectDevice={connectToDevice}
                            onNavigateToTab={(tab) => setCurrentTab(tab)}
                        />
                    )}

                    {currentTab === 'screen' && (
                        <ScreenShareScreen
                            connectedDevice={connectedDevice}
                            onNavigateToDiscovery={() => setCurrentTab('discovery')}
                        />
                    )}

                    {currentTab === 'control' && (
                        <ControlScreen
                            connectedDevice={connectedDevice}
                            onNavigateToDiscovery={() => setCurrentTab('discovery')}
                        />
                    )}

                    {currentTab === 'files' && (
                        <FilesScreen
                            connectedDevice={connectedDevice}
                            signalingServerUrl={settings.signalingServerUrl}
                            onNavigateToDiscovery={() => setCurrentTab('discovery')}
                        />
                    )}

                    {currentTab === 'settings' && <SettingsScreen />}
                </main>
            </div>

            {/* Mobile Bottom Navigation (shown only in mobile layout) */}
            {isMobileLayout && (
                <BottomNav
                    currentTab={currentTab}
                    setCurrentTab={setCurrentTab}
                    activeTransferCount={activeTransferCount}
                />
            )}
        </div>
    );
};
