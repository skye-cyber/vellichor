import { AppSettings, ConnectionHistory, CacheInfo } from '../types';
import { TauriNativeService } from './TauriNativeService';

class SettingsServiceClass {
    private static instance: SettingsServiceClass;
    private settings: AppSettings | null = null;
    private listeners: Set<(settings: AppSettings) => void> = new Set();

    private readonly defaultSettings: AppSettings = {
        autoConnect: true,
        discoveryMode: 'all',
        streamQuality: 'balanced',
        signalingServerUrl: 'http://localhost:3000',
        encryption: true,
        requirePairing: true,
        saveHistory: true,
        theme: 'light',
        reduceAnimations: false,
        compactView: false,
        autoDownload: true,
        downloadPath: '~/Downloads/Vellichor',
        maxCacheSize: 500 * 1024 * 1024,
        enableDebug: false,
        logLevel: 'info',
        keepAwake: true,
        maxFrameRate: 60,
        resolution: '1080p',
        hardwareAcceleration: true,
    };

    private constructor() { }

    static getInstance(): SettingsServiceClass {
        if (!SettingsServiceClass.instance) {
            SettingsServiceClass.instance = new SettingsServiceClass();
        }
        return SettingsServiceClass.instance;
    }

    async initialize(): Promise<void> {
        try {
            const stored = await TauriNativeService.getStoredSettings();
            if (stored && stored !== '{}') {
                const parsed = JSON.parse(stored);
                this.settings = { ...this.defaultSettings, ...parsed };
            } else {
                this.settings = { ...this.defaultSettings };
                await this.saveSettings();
            }
            if (this.settings) {
                this.applyTheme(this.settings.theme);
            }
        } catch (e) {
            console.warn('Failed to parse settings, using defaults:', e);
            this.settings = { ...this.defaultSettings };
        }
    }

    getSettings(): AppSettings {
        return this.settings ? { ...this.settings } : { ...this.defaultSettings };
    }

    async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
        if (!this.settings) {
            await this.initialize();
        }
        this.settings = { ...this.settings!, ...updates };

        if (updates.theme) {
            this.applyTheme(updates.theme);
        }

        await this.saveSettings();
        this.notify();
        return this.getSettings();
    }

    private applyTheme(theme: 'light' | 'dark' | 'system') {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;

        if (theme === 'dark') {
            root.classList.add('dark');
        } else if (theme === 'light') {
            root.classList.remove('dark');
        } else {
            // System
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    }

    async resetToDefaults(): Promise<AppSettings> {
        this.settings = { ...this.defaultSettings };
        this.applyTheme(this.settings.theme);
        await this.saveSettings();
        this.notify();
        return this.getSettings();
    }

    private async saveSettings(): Promise<void> {
        if (!this.settings) return;
        try {
            await TauriNativeService.saveStoredSettings(JSON.stringify(this.settings, null, 2));
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    // Connection History
    async getConnectionHistory(): Promise<ConnectionHistory[]> {
        try {
            if (typeof localStorage === 'undefined') return [];
            const data = localStorage.getItem('vellichor_history');
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    async addConnectionHistory(entry: Omit<ConnectionHistory, 'id'>): Promise<void> {
        try {
            const history = await this.getConnectionHistory();
            const newEntry: ConnectionHistory = {
                ...entry,
                id: `hist-${Date.now()}`,
            };
            const updated = [newEntry, ...history.filter((h) => h.ip !== entry.ip)].slice(0, 50);
            localStorage.setItem('vellichor_history', JSON.stringify(updated));
        } catch (e) {
            console.warn('Failed to add connection history:', e);
        }
    }

    async clearConnectionHistory(): Promise<void> {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('vellichor_history');
        }
    }

    // Cache
    async getCacheInfo(): Promise<CacheInfo> {
        return await TauriNativeService.getCacheSize();
    }

    async clearCache(): Promise<boolean> {
        return await TauriNativeService.clearCache();
    }

    // Export / Import
    async exportSettings(): Promise<string> {
        const settings = this.getSettings();
        const history = await this.getConnectionHistory();
        const system = await TauriNativeService.getSystemInfo();

        return JSON.stringify(
            {
                settings,
                history,
                system,
                exportDate: new Date().toISOString(),
                version: '0.1.0',
            },
            null,
            2
        );
    }

    async importSettings(jsonString: string): Promise<void> {
        try {
            const data = JSON.parse(jsonString);
            if (data.settings) {
                await this.updateSettings(data.settings);
            }
            if (data.history && Array.isArray(data.history)) {
                localStorage.setItem('vellichor_history', JSON.stringify(data.history));
            }
        } catch (e) {
            console.error('Failed to import settings:', e);
            throw new Error('Invalid settings JSON format');
        }
    }

    subscribe(listener: (settings: AppSettings) => void): () => void {
        this.listeners.add(listener);
        listener(this.getSettings());
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notify() {
        const current = this.getSettings();
        this.listeners.forEach((l) => l(current));
    }
}

export const SettingsService = SettingsServiceClass.getInstance();
