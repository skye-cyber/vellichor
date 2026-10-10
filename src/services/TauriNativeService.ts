import { Device, SystemInfo, CacheInfo, InputCommand } from '../types';

let isTauriEnv = false;
let tauriInvoke: (<T>(cmd: string, args?: Record<string, unknown>) => Promise<T>) | null = null;

// Dynamically check if running in Tauri window
try {
  if (typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) {
    isTauriEnv = true;
    import('@tauri-apps/api/core').then((core) => {
      tauriInvoke = core.invoke;
    }).catch(() => {
      isTauriEnv = false;
    });
  }
} catch {
  isTauriEnv = false;
}

export class TauriNativeService {
  static isTauri(): boolean {
    return isTauriEnv && tauriInvoke !== null;
  }

  static async getSystemInfo(): Promise<SystemInfo> {
    if (this.isTauri() && tauriInvoke) {
      try {
        return await tauriInvoke<SystemInfo>('get_system_info');
      } catch (e) {
        console.warn('Native get_system_info failed, using fallback:', e);
      }
    }

    // Web fallback
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    let platform = 'linux';
    let device_type = 'laptop';

    if (userAgent.includes('android')) {
      platform = 'android';
      device_type = 'phone';
    } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      platform = 'ios';
      device_type = userAgent.includes('ipad') ? 'tablet' : 'phone';
    } else if (userAgent.includes('win')) {
      platform = 'windows';
    } else if (userAgent.includes('mac')) {
      platform = 'macos';
    }

    return {
      hostname: 'Vellichor-Node',
      platform,
      arch: 'x86_64',
      device_type,
      local_ips: ['192.168.1.100', '127.0.0.1'],
    };
  }

  static async scanNetwork(): Promise<Device[]> {
    if (this.isTauri() && tauriInvoke) {
      try {
        const raw = await tauriInvoke<any[]>('scan_network');
        return raw.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.device_type,
          platform: d.platform,
          status: d.status,
          ip: d.ip,
          signalStrength: d.signal_strength,
          lastSeen: d.last_seen,
        }));
      } catch (e) {
        console.warn('Native scan_network failed, fallback to mock peers:', e);
      }
    }

    // Default mock peers on LAN
    return [
      {
        id: '1',
        name: "Skye's Workstation",
        type: 'laptop',
        platform: 'linux',
        status: 'online',
        ip: '192.168.1.105',
        signalStrength: 96,
        lastSeen: 'just now',
      },
      {
        id: '2',
        name: 'Galaxy Tab S8',
        type: 'tablet',
        platform: 'android',
        status: 'online',
        ip: '192.168.1.120',
        signalStrength: 82,
        lastSeen: '2 min ago',
      },
      {
        id: '3',
        name: 'Office MacBook',
        type: 'laptop',
        platform: 'macos',
        status: 'busy',
        ip: '192.168.1.145',
        signalStrength: 65,
        lastSeen: '5 min ago',
      },
    ];
  }

  static async getCacheSize(): Promise<CacheInfo> {
    if (this.isTauri() && tauriInvoke) {
      try {
        const raw = await tauriInvoke<any>('get_cache_size');
        return {
          sizeBytes: raw.size_bytes,
          filesCount: raw.files_count,
          lastCleared: raw.last_cleared,
        };
      } catch (e) {
        console.warn('Native get_cache_size failed:', e);
      }
    }

    return {
      sizeBytes: 154 * 1024 * 1024,
      filesCount: 142,
      lastCleared: 'Yesterday, 14:30',
    };
  }

  static async clearCache(): Promise<boolean> {
    if (this.isTauri() && tauriInvoke) {
      try {
        return await tauriInvoke<boolean>('clear_cache');
      } catch (e) {
        console.warn('Native clear_cache failed:', e);
      }
    }

    // Web simulation
    try {
      if (typeof localStorage !== 'undefined') {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('vellichor_cache_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }
    } catch {
      // Ignore
    }
    return true;
  }

  static async simulateInput(cmd: InputCommand): Promise<string> {
    if (this.isTauri() && tauriInvoke) {
      try {
        return await tauriInvoke<string>('simulate_input', { cmd });
      } catch (e) {
        console.warn('Native simulate_input error:', e);
      }
    }
    return `Simulated input: ${cmd.action}`;
  }

  static async getStoredSettings(): Promise<string> {
    if (this.isTauri() && tauriInvoke) {
      try {
        return await tauriInvoke<string>('get_stored_settings');
      } catch (e) {
        console.warn('Native get_stored_settings error:', e);
      }
    }

    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('vellichor_settings') || '{}';
    }
    return '{}';
  }

  static async saveStoredSettings(settingsJson: string): Promise<boolean> {
    if (this.isTauri() && tauriInvoke) {
      try {
        return await tauriInvoke<boolean>('save_stored_settings', { settingsJson });
      } catch (e) {
        console.warn('Native save_stored_settings error:', e);
      }
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('vellichor_settings', settingsJson);
    }
    return true;
  }
}
