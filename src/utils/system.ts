import { TauriNativeService } from '../services/TauriNativeService';

export type Platform = 'laptop' | 'phone' | 'tablet' | null;

let PLATFORM: Platform = null;
let inflight: Promise<Platform> | null = null;
const listeners = new Set<(p: Platform) => void>();

/**
 * Kick off the platform fetch. Safe to call multiple times; only one
 * fetch is in flight at a time. Resolves with the platform (or null on
 * failure).
 */
export const fetchPlatform = async (): Promise<Platform> => {
    if (PLATFORM) return PLATFORM;
    if (inflight) return inflight;
    inflight = (async () => {
        try {
            const sys = await TauriNativeService.getSystemInfo();
            PLATFORM = (sys?.device_type as Platform) ?? null;
        } catch (e) {
            console.warn('[PLAT] getSystemInfo failed:', e);
            PLATFORM = null;
        } finally {
            inflight = null;
        }
        listeners.forEach((l) => l(PLATFORM));
        return PLATFORM;
    })();
    return inflight;
};

/**
 * Set the platform explicitly (e.g. from tests, or a hardcoded override).
 */
export const setPlatform = (plat: Platform): void => {
    PLATFORM = plat;
    listeners.forEach((l) => l(PLATFORM));
};

/**
 * Synchronous read of the cached value. May be null on first call,
 * before fetchPlatform() resolves.
 */
export const getPlatformSync = (): Platform => PLATFORM;

/**
 * Subscribe to platform changes. Fires immediately with the current
 * value (which may be null), and again when fetchPlatform resolves.
 * Returns an unsubscribe function.
 */
export const onPlatformChange = (cb: (p: Platform) => void): (() => void) => {
    listeners.add(cb);
    cb(PLATFORM);
    return () => { listeners.delete(cb); };
};

/**
 * Async getter. Awaits the fetch if not cached.
 */
export const getPlatform = async (): Promise<Platform> => {
    if (PLATFORM) return PLATFORM;
    return fetchPlatform();
};
