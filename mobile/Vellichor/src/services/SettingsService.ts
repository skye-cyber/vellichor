import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import DeviceInfo from 'react-native-device-info';

// Import native modules for actual device control
const { ScreenCaptureModule, InputInjectorModule } = NativeModules;

export interface AppSettings {
  // Connection settings
  autoConnect: boolean;
  discoveryMode: 'all' | 'saved' | 'manual';
  streamQuality: 'balanced' | 'performance' | 'battery';

  // Privacy & Security
  encryption: boolean;
  requirePairing: boolean;
  saveHistory: boolean;

  // Appearance
  theme: 'light' | 'dark' | 'system';
  reduceAnimations: boolean;
  compactView: boolean;

  // Storage
  autoDownload: boolean;
  downloadPath: string;
  maxCacheSize: number;

  // Advanced
  enableDebug: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  keepAwake: boolean;

  // Performance
  maxFrameRate: 30 | 60;
  resolution: '720p' | '1080p' | 'original';
  hardwareAcceleration: boolean;
}

export interface ConnectionHistory {
  id: string;
  deviceName: string;
  deviceType: string;
  lastConnected: string;
  connectionCount: number;
  trusted: boolean;
}

export interface CacheInfo {
  size: number;
  files: number;
  lastCleared: string;
}

class SettingsServiceClass {
  private static instance: SettingsServiceClass;
  private settings: AppSettings | null = null;
  private listeners: ((settings: AppSettings) => void)[] = [];

  private constructor() {}

  static getInstance(): SettingsServiceClass {
    if (!SettingsServiceClass.instance) {
      SettingsServiceClass.instance = new SettingsServiceClass();
    }
    return SettingsServiceClass.instance;
  }

  // Default settings
  private readonly defaultSettings: AppSettings = {
    autoConnect: true,
    discoveryMode: 'all',
    streamQuality: 'balanced',
    encryption: true,
    requirePairing: true,
    saveHistory: false,
    theme: 'system',
    reduceAnimations: false,
    compactView: false,
    autoDownload: false,
    downloadPath:
      Platform.OS === 'android'
        ? '/storage/emulated/0/Download/Vellichor'
        : '/Documents/Vellichor',
    maxCacheSize: 1024 * 1024 * 500, // 500 MB
    enableDebug: false,
    logLevel: 'info',
    keepAwake: false,
    maxFrameRate: 60,
    resolution: '1080p',
    hardwareAcceleration: true,
  };

  // Initialize settings
  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('@vellichor_settings');
      if (stored) {
        this.settings = JSON.parse(stored);
      } else {
        this.settings = { ...this.defaultSettings };
        await this.saveSettings();
      }

      // Apply initial settings to device
      if (this.settings) await this.applySettings(this.settings);
    } catch (error) {
      console.error('Failed to initialize settings:', error);
      this.settings = { ...this.defaultSettings };
    }
  }

  // Get current settings
  getSettings(): AppSettings {
    if (!this.settings) {
      return { ...this.defaultSettings };
    }
    return { ...this.settings };
  }

  // Update settings
  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    if (!this.settings) {
      await this.initialize();
    }

    this.settings = { ...this.settings!, ...updates };
    await this.saveSettings();
    await this.applySettings(updates);
    this.notifyListeners();

    return this.getSettings();
  }

  // Reset to defaults
  async resetToDefaults(): Promise<AppSettings> {
    this.settings = { ...this.defaultSettings };
    await this.saveSettings();
    await this.applySettings(this.settings);
    this.notifyListeners();
    return this.getSettings();
  }

  // Save to storage
  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        '@vellichor_settings',
        JSON.stringify(this.settings),
      );
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  // Apply settings to actual device features
  private async applySettings(updates: Partial<AppSettings>): Promise<void> {
    try {
      // Apply stream quality
      if (updates.streamQuality) {
        await this.applyStreamQuality(updates.streamQuality);
      }

      // Apply theme
      if (updates.theme) {
        await this.applyTheme(updates.theme);
      }

      // Apply keep awake
      if (updates.keepAwake !== undefined) {
        await this.setKeepAwake(updates.keepAwake);
      }

      // Apply hardware acceleration
      if (updates.hardwareAcceleration !== undefined) {
        await this.setHardwareAcceleration(updates.hardwareAcceleration);
      }

      // Apply frame rate
      if (updates.maxFrameRate) {
        await this.setFrameRate(updates.maxFrameRate);
      }
    } catch (error) {
      console.error('Failed to apply settings:', error);
    }
  }

  // Individual setting applications
  private async applyStreamQuality(
    quality: 'balanced' | 'performance' | 'battery',
  ): Promise<void> {
    // Implement actual stream quality logic
    const config = {
      balanced: { fps: 30, resolution: '1080p', bitrate: 2000000 },
      performance: { fps: 60, resolution: '1080p', bitrate: 4000000 },
      battery: { fps: 15, resolution: '720p', bitrate: 1000000 },
    };

    // Call native module if available
    if (ScreenCaptureModule?.setQuality) {
      await ScreenCaptureModule.setQuality(config[quality]);
    }
  }

  private async applyTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    // Will be handled by UI, but we can notify
    console.log('Theme changed to:', theme);
  }

  private async setKeepAwake(enable: boolean): Promise<void> {
    if (enable) {
      // Keep screen awake
      NativeModules?.KeepAwake?.activate();
    } else {
      NativeModules?.KeepAwake?.deactivate();
    }
  }

  private async setHardwareAcceleration(enable: boolean): Promise<void> {
    if (ScreenCaptureModule?.setHardwareAcceleration) {
      await ScreenCaptureModule.setHardwareAcceleration(enable);
    }
  }

  private async setFrameRate(fps: 30 | 60): Promise<void> {
    if (ScreenCaptureModule?.setFrameRate) {
      await ScreenCaptureModule.setFrameRate(fps);
    }
  }

  // Connection history management
  async getConnectionHistory(): Promise<ConnectionHistory[]> {
    try {
      const history = await AsyncStorage.getItem('@vellichor_history');
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  }

  async addConnectionHistory(
    entry: Omit<ConnectionHistory, 'id'>,
  ): Promise<void> {
    try {
      const history = await this.getConnectionHistory();
      const newEntry: ConnectionHistory = {
        ...entry,
        id: Date.now().toString(),
      };

      const updated = [newEntry, ...history].slice(0, 50); // Keep last 50
      await AsyncStorage.setItem('@vellichor_history', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }

  async clearConnectionHistory(): Promise<void> {
    await AsyncStorage.removeItem('@vellichor_history');
  }

  // Cache management
  async getCacheInfo(): Promise<CacheInfo> {
    try {
      // Implement actual cache size calculation
      const cacheDir =
        Platform.OS === 'android'
          ? '/data/user/0/com.vellichor/cache'
          : '/Library/Caches';

      // This would need native module to calculate actual size
      return {
        size: 150 * 1024 * 1024, // Mock: 150 MB
        files: 234,
        lastCleared: new Date().toISOString(),
      };
    } catch {
      return { size: 0, files: 0, lastCleared: '' };
    }
  }

  async clearCache(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        // Clear Android cache
        NativeModules?.CacheManager?.clearCache();
      } else {
        // Clear iOS cache
        NativeModules?.CacheManager?.clearCache();
      }

      // Clear temporary files
      await AsyncStorage.removeItem('@vellichor_temp');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  // Export/Import settings
  async exportSettings(): Promise<string> {
    const settings = this.getSettings();
    const history = await this.getConnectionHistory();

    const exportData = {
      settings,
      history,
      device: {
        platform: Platform.OS,
        version: Platform.Version,
        deviceId: await DeviceInfo.getDeviceId(),
      },
      timestamp: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importSettings(settingsJson: string): Promise<void> {
    try {
      const imported = JSON.parse(settingsJson);
      if (imported.settings) {
        await this.updateSettings(imported.settings);
      }
      if (imported.history) {
        await AsyncStorage.setItem(
          '@vellichor_history',
          JSON.stringify(imported.history),
        );
      }
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw error;
    }
  }

  // Listeners
  subscribe(listener: (settings: AppSettings) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    if (this.settings) {
      this.listeners.forEach(listener => listener(this.settings!));
    }
  }
}

export const SettingsService = SettingsServiceClass.getInstance();
