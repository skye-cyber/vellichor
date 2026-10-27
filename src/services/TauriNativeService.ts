import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Device, SystemInfo, CacheInfo, InputCommand } from '../types';

export class TauriNativeService {
    // Checks if native Tauri IPC bridge is available
    static isTauri(): boolean {
        try {
            return typeof window !== 'undefined' && isTauri();
        } catch {
            return false;
        }
    }

    // Dynamically queries local IP address using WebRTC candidate discovery for browser fallback
    private static async resolveBrowserLocalIP(): Promise<string | null> {
        if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
            return null;
        }
        return new Promise((resolve) => {
            try {
                const pc = new RTCPeerConnection({ iceServers: [] });
                pc.createDataChannel('');
                pc.createOffer()
                    .then((offer) => pc.setLocalDescription(offer))
                    .catch(() => { });

                const timer = setTimeout(() => {
                    pc.close();
                    resolve(null);
                }, 1000);

                pc.onicecandidate = (e) => {
                    if (!e.candidate) return;
                    const candidateStr = e.candidate.candidate;
                    // Match standard IPv4 addresses excluding loopback and zeroes
                    const match = candidateStr.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
                    if (match && match[1] && match[1] !== '127.0.0.1' && !match[1].startsWith('0.')) {
                        clearTimeout(timer);
                        pc.close();
                        resolve(match[1]);
                    }
                };
            } catch {
                resolve(null);
            }
        });
    }

    // Gathers comprehensive system telemetry, dynamic CPU architecture, and local network IPs
    static async getSystemInfo(): Promise<SystemInfo> {
        // Invoke native Rust backend if running inside Tauri
        if (this.isTauri()) {
            try {
                return await invoke<SystemInfo>('get_system_info');
            } catch (e) {
                console.warn('Native get_system_info invocation failed, using dynamic web fallback:', e);
            }
        }

        console.log('[PLAT] Not Tauri')
        // Dynamic browser & platform detection
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

        // Dynamic architecture derivation
        let arch = 'x86_64';
        if (typeof navigator !== 'undefined') {
            const uad = (navigator as any).userAgentData;
            if (uad && uad.architecture) {
                arch = uad.architecture;
            } else if (userAgent.includes('arm64') || userAgent.includes('aarch64')) {
                arch = 'aarch64';
            } else if (userAgent.includes('arm')) {
                arch = 'arm';
            }
        }

        // Derived hostname based on platform
        let hostname = 'Web Client';
        if (typeof navigator !== 'undefined') {
            const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
            hostname = `${platformName} Device`;
        }

        // Query candidate LAN IP
        const localIP = await this.resolveBrowserLocalIP();
        const local_ips: string[] = localIP ? [localIP] : ['127.0.0.1'];

        // Retrieve or initialize unique client device ID
        let device_id = '';
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('vellichor_device_id');
            if (stored) {
                device_id = stored;
            } else {
                device_id = `device_${Date.now()}`;
                localStorage.setItem('vellichor_device_id', device_id);
            }
        } else {
            device_id = `device_${Date.now()}`;
        }

        return {
            hostname,
            platform,
            arch,
            device_type,
            local_ips,
            device_id,
        };
    }

    // Scans subnet for peer Vellichor devices via native UDP broadcast or local fallback
    static async scanNetwork(): Promise<Device[]> {
        if (this.isTauri()) {
            try {
                const raw = await invoke<any[]>('scan_network');
                const result = raw.map((d: any) => ({
                    id: d.id,
                    name: d.name,
                    type: d.device_type,
                    platform: d.platform,
                    status: (d.status || 'online') as any,
                    ip: d.ip,
                    port: d.port || 42426,
                    signalStrength: d.signal_strength || 80,
                    lastSeen: d.last_seen || 'just now',
                }));
                // console.log("[SCAN] Dev: ", result)
                return result
            } catch (e) {
                console.warn('Native scan_network invocation failed:', e);
            }
        }

        // Browser fallback
        const sys = await this.getSystemInfo();
        const mockSelf: Device = {
            id: sys.device_id || 'local-device',
            name: `${sys.hostname} (This device)`,
            type: sys.device_type as any,
            platform: sys.platform as any,
            status: 'online',
            ip: sys.local_ips[0] || '127.0.0.1',
            port: 42426,
            signalStrength: 100,
            lastSeen: 'just now',
        };
        return [mockSelf];
    }

    // Queries storage cache size
    static async getCacheSize(): Promise<CacheInfo> {
        if (this.isTauri()) {
            try {
                const raw = await invoke<any>('get_cache_size');
                return {
                    sizeBytes: raw.size_bytes,
                    filesCount: raw.files_count,
                    lastCleared: raw.last_cleared,
                };
            } catch (e) {
                console.warn('Native get_cache_size error:', e);
            }
        }

        return {
            sizeBytes: 0,
            filesCount: 0,
            lastCleared: 'Never',
        };
    }

    // Clears disk cache
    static async clearCache(): Promise<boolean> {
        if (this.isTauri()) {
            try {
                return await invoke<boolean>('clear_cache');
            } catch (e) {
                console.warn('Native clear_cache error:', e);
            }
        }

        if (typeof localStorage !== 'undefined') {
            try {
                const devId = localStorage.getItem('vellichor_device_id');
                localStorage.clear();
                if (devId) localStorage.setItem('vellichor_device_id', devId);
                return true;
            } catch {
                return false;
            }
        }
        return true;
    }

    // Synthesizes remote input commands
    static async simulateInput(cmd: InputCommand): Promise<string> {
        if (this.isTauri()) {
            try {
                return await invoke<string>('simulate_input', { cmd });
            } catch (e) {
                console.warn('Native simulate_input error:', e);
            }
        }
        return 'ok';
    }

    // Retrieves stored settings from filesystem or localStorage fallback
    static async getStoredSettings(): Promise<string | null> {
        if (this.isTauri()) {
            try {
                return await invoke<string>('get_stored_settings');
            } catch (e) {
                console.warn('Native get_stored_settings error:', e);
            }
        }

        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem('vellichor_settings');
        }
        return null;
    }

    // Saves user settings configuration to local filesystem
    static async saveStoredSettings(settingsJson: string): Promise<boolean> {
        if (this.isTauri()) {
            try {
                return await invoke<boolean>('save_stored_settings', { settingsJson });
            } catch (e) {
                console.warn('Native save_stored_settings error:', e);
            }
        }

        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('vellichor_settings', settingsJson);
        }
        return true;
    }

    // Resolves the default downloads folder path on the host
    static async getDownloadDirectory(): Promise<string> {
        if (this.isTauri()) {
            try {
                return await invoke<string>('get_download_directory');
            } catch (e) {
                console.warn('Native get_download_directory error:', e);
            }
        }
        return 'Downloads';
    }

    // Writes or appends a chunk of binary data to a destination file on disk
    static async writeFileChunk(
        filePath: string,
        dataBytes: number[] | Uint8Array,
        isInitialChunk: boolean
    ): Promise<boolean> {
        if (this.isTauri()) {
            try {
                const bytesArray = Array.from(dataBytes);
                return await invoke<boolean>('write_file_chunk', {
                    filePath,
                    dataBytes: bytesArray,
                    isInitialChunk,
                });
            } catch (e) {
                console.warn('Native write_file_chunk error:', e);
            }
        }
        return false;
    }

    // Reads a chunk of binary data from a file on disk
    static async readFileChunk(
        filePath: string,
        offset: number,
        length: number
    ): Promise<Uint8Array | null> {
        if (this.isTauri()) {
            try {
                const bytes = await invoke<number[]>('read_file_chunk', {
                    filePath,
                    offset,
                    length,
                });
                return new Uint8Array(bytes);
            } catch (e) {
                console.warn('Native read_file_chunk error:', e);
            }
        }
        return null;
    }

    // Queries file size and metadata from filesystem
    static async getFileInfo(filePath: string): Promise<any> {
        if (this.isTauri()) {
            try {
                return await invoke<any>('get_file_info', { filePath });
            } catch (e) {
                console.warn('Native get_file_info error:', e);
            }
        }
        return null;
    }

    // Sends a signal directly to another peer node via Tauri native HTTP dispatch
    static async sendPeerSignal(
        targetIp: string,
        targetPort: number | undefined,
        payload: any
    ): Promise<boolean> {
        if (this.isTauri()) {
            try {
                console.log('[TauriNativeService] Sending native peer signal to:', targetIp, 'port:', targetPort || 42426);
                return await invoke<boolean>('send_peer_signal', {
                    targetIp,
                    targetPort: targetPort || 42426,
                    payload,
                });
            } catch (e) {
                console.warn('Native send_peer_signal error:', e);
            }
        }
        return false;
    }

    // Listens for incoming peer signals emitted by local Tauri node server
    static async listenPeerSignal(callback: (payload: any) => void): Promise<(() => void) | null> {
        if (this.isTauri()) {
            try {
                console.log('[TauriNativeService] Subscribing to native p2p-signal event...');
                const unlisten = await listen<any>('p2p-signal', (event) => {
                    console.log('[TauriNativeService] Received p2p-signal event:', event.payload);
                    callback(event.payload);
                });
                console.log('[TauriNativeService] Successfully subscribed to p2p-signal event');
                return unlisten;
            } catch (e) {
                console.warn('Native listenPeerSignal error:', e);
            }
        }
        return null;
    }

    // Queries local peer node server telemetry
    static async getNodeStatus(): Promise<any> {
        if (this.isTauri()) {
            try {
                return await invoke<any>('get_node_status');
            } catch (e) {
                console.warn('Native get_node_status error:', e);
            }
        }
        return null;
    }
    static async getVersion(): Promise<string> {
        return invoke<string>('get_app_version');
    }
}
