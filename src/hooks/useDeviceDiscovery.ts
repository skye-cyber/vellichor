import { useState, useEffect, useCallback, useRef } from 'react';
import { Device, SystemInfo } from '../types';
import { TauriNativeService } from '../services/TauriNativeService';
import { SignalingService } from '../services/SignalingService';
import { WebRTCService } from '../services/WebRTCService';
import { SettingsService } from '../services/SettingsService';

export interface OutgoingPairingState {
    device: Device;
    pin: string;
    status: 'waiting' | 'accepted' | 'declined' | 'timeout';
}

export interface IncomingPairingState {
    pin: string;
    fromDevice: Device;
}

export const useDeviceDiscovery = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
    const [lastScanTime, setLastScanTime] = useState<Date>(new Date());
    const [incomingPairingRequest, setIncomingPairingRequest] = useState<IncomingPairingState | null>(null);
    const [outgoingPairing, setOutgoingPairing] = useState<OutgoingPairingState | null>(null);
    const localScanRef = useRef<Device[]>([]);
    const pairingTimeoutRef = useRef<any>(null);

    // Merges local network discovery results with signaling server online peer registry
    const mergeDevices = useCallback((local: Device[], signalingPeers: any[]) => {
        const byId = new Map<string, Device>();
        const idByIp = new Map<string, string>();

        // Local devices: key by ID (always), index by IP
        for (const d of local) {
            if (!d.id) continue;
            byId.set(d.id, d);
            if (d.ip) idByIp.set(d.ip, d.id);
        }

        // Signaling peers: merge with existing by ID, else by IP
        for (const p of signalingPeers) {
            const pid = p.deviceId ?? p.socketId;
            if (!pid) continue;
            // Defensive self-exclusion — fixes your current deviceId-vs-socketId mismatch
            if (pid === SignalingService.myDeviceId) continue;
            if (p.socketId && p.socketId === SignalingService.socketId) continue;

            const existingId = byId.has(pid) ? pid : (p.ip ? idByIp.get(p.ip) : undefined);
            const existing = existingId ? byId.get(existingId) : undefined;

            const merged: Device = {
                ...existing,
                id: pid,
                name: p.name ?? existing?.name ?? 'Vellichor Peer',
                type: (p.deviceType as any) ?? existing?.type ?? 'laptop',
                platform: (p.platform as any) ?? existing?.platform ?? 'linux',
                status: 'online',
                ip: p.ip ?? existing?.ip,                       // no 'Remote (Signaling)' sentinel
                port: p.port ?? existing?.port ?? 42426,        // preserve port (was always 42426 before)
                signalStrength: existing?.signalStrength ?? 90,
                lastSeen: 'just now',
            };

            // If we matched by IP under a stale id, drop the stale entry
            if (existingId && existingId !== pid) byId.delete(existingId);
            byId.set(pid, merged);
            if (merged.ip) idByIp.set(merged.ip, pid);
        }

        setDevices(Array.from(byId.values()));
    }, []);

    const startScan = useCallback(async () => {
        setIsScanning(true);
        try {
            const [scanned, sys] = await Promise.all([
                TauriNativeService.scanNetwork(),
                TauriNativeService.getSystemInfo(),
            ]);

            localScanRef.current = scanned;
            for (const d of scanned) {
                if (d.ip) {
                    SignalingService.registerPeerDevice(d.id, d.ip, d.port || 42426);
                }
            }
            setSystemInfo(sys);
            setLastScanTime(new Date());

            // Register local device profile for mutual pairing handshakes and presence
            if (sys) {
                console.log('[ID] sys.device_id =', sys.device_id);
                console.log('[ID] registerPresence deviceId =', SignalingService.myDeviceId);
                const devId = sys.device_id || `device-${sys.hostname.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                const myDev: Device = {
                    id: devId,
                    name: sys.hostname,
                    type: sys.device_type as any,
                    platform: sys.platform as any,
                    status: 'online',
                    ip: sys.local_ips[0] || '127.0.0.1',
                    signalStrength: 100,
                    lastSeen: 'just now',
                };

                WebRTCService.setMyDevice(myDev);

                // SignalingService.joinRoom(myDev.id); // redundant
                // registerPresence already joins the room first
                SignalingService.registerPresence({
                    deviceId: myDev.id,
                    name: sys.hostname,
                    deviceType: sys.device_type,
                    platform: sys.platform,
                    ip: sys.local_ips[0],
                });
            }

            mergeDevices(scanned, []);
            // console.log("[SCAN] Discovery: ", JSON.stringify(scanned))
        } catch (e) {
            console.error('Scan failed:', e);
        } finally {
            setIsScanning(false);
        }
    }, [mergeDevices]);

    useEffect(() => {
        // Initial signaling connect & scan
        const settings = SettingsService.getSettings();
        SignalingService.connect(settings.signalingServerUrl || 'http://localhost:42426');

        startScan();

        // Listen to signaling peer updates
        const unsubPeers = SignalingService.onPeersUpdate((peers) => {
            mergeDevices(localScanRef.current, peers);
        });

        // Listen to incoming pairing requests from remote devices
        const unsubPairReq = WebRTCService.onPairingRequest((req) => {
            setIncomingPairingRequest({
                pin: req.pin,
                fromDevice: req.fromDevice,
            });
        });

        // Listen to pairing responses from target device
        const unsubPairResp = WebRTCService.onPairingResponse((resp) => {
            if (resp.type === 'accept') {
                console.log("TG:", resp)

                setOutgoingPairing((prev) => {
                    if (!prev) return null;
                    const target = prev.device;
                    WebRTCService.connectToPeer(target.id);
                    setConnectedDevice(target);
                    SettingsService.addConnectionHistory({
                        deviceName: target.name,
                        deviceType: target.type,
                        platform: target.platform,
                        ip: target.ip,
                        lastConnected: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        connectionCount: 1,
                        trusted: true,
                    });

                    // Dismiss after showing success state
                    setTimeout(() => {
                        setOutgoingPairing(null);
                    }, 800);

                    return { ...prev, status: 'accepted' };
                });
            } else if (resp.type === 'decline') {
                setOutgoingPairing((prev) => (prev ? { ...prev, status: 'declined' } : null));
            } else if (resp.type === 'cancel') {
                setIncomingPairingRequest(null);
            }
        });

        // Listen to mutual two-way pairing events from WebRTC data channel handshake
        const unsubPaired = WebRTCService.onPeerPaired(async (peerDevice) => {
            console.log("Unpair:", peerDevice)
            setConnectedDevice(peerDevice);
            await SettingsService.addConnectionHistory({
                deviceName: peerDevice.name,
                deviceType: peerDevice.type,
                platform: peerDevice.platform,
                ip: peerDevice.ip,
                lastConnected: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                connectionCount: 1,
                trusted: true,
            });
        });

        const unsubUnpaired = WebRTCService.onPeerUnpaired(() => {
            setConnectedDevice(null);
        });

        // Listen to WebRTC connection state changes
        const unsubState = WebRTCService.onStateChange((state) => {
            if (state === 'closed' || state === 'disconnected' || state === 'failed') {
                setConnectedDevice(null);
            }
        });

        return () => {
            unsubPeers();
            unsubPairReq();
            unsubPairResp();
            unsubPaired();
            unsubUnpaired();
            unsubState();
            if (pairingTimeoutRef.current) clearTimeout(pairingTimeoutRef.current);
        };
    }, [startScan, mergeDevices]);

    // Initiates mutual pairing with target device by generating a verification PIN and sending prompt
    const initiatePairing = useCallback((device: Device) => {
        if (pairingTimeoutRef.current) clearTimeout(pairingTimeoutRef.current);

        const pin = `${Math.floor(100 + Math.random() * 900)} ${Math.floor(100 + Math.random() * 900)}`;
        if (device.ip && device.ip !== 'Remote (Signaling)') {
            SignalingService.registerPeerDevice(device.id, device.ip, device.port || 42426);
        }
        // console.log("Sent pair request to:", device)
        setOutgoingPairing({
            device,
            pin,
            status: 'waiting',
        });

        WebRTCService.sendPairRequest(device.id, pin);

        // 25 second timeout for response
        pairingTimeoutRef.current = setTimeout(() => {
            setOutgoingPairing((prev) => {
                if (prev && prev.status === 'waiting') {
                    return { ...prev, status: 'timeout' };
                }
                return prev;
            });
        }, 25000);
    }, []);

    // Accepts incoming connection request from remote device
    const acceptPairing = useCallback(async () => {
        console.log("From:", incomingPairingRequest)

        if (!incomingPairingRequest) return;
        const { fromDevice, pin } = incomingPairingRequest;
        console.log("[INC] From:", incomingPairingRequest)
        WebRTCService.sendPairAccept(fromDevice.id, pin);
        await WebRTCService.connectToPeer(fromDevice.id);
        console.log("Accept:", fromDevice)
        setConnectedDevice(fromDevice);

        await SettingsService.addConnectionHistory({
            deviceName: fromDevice.name,
            deviceType: fromDevice.type,
            platform: fromDevice.platform,
            ip: fromDevice.ip,
            lastConnected: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            connectionCount: 1,
            trusted: true,
        });

        setIncomingPairingRequest(null);
    }, [incomingPairingRequest]);

    // Declines incoming connection request
    const declinePairing = useCallback(() => {
        if (!incomingPairingRequest) return;
        WebRTCService.sendPairDecline(
            incomingPairingRequest.fromDevice.id,
            incomingPairingRequest.pin,
            'Connection declined by user'
        );
        setIncomingPairingRequest(null);
    }, [incomingPairingRequest]);

    // Cancels an outgoing pairing request initiated from this device
    const cancelOutgoingPairing = useCallback(() => {
        if (pairingTimeoutRef.current) clearTimeout(pairingTimeoutRef.current);
        if (outgoingPairing) {
            WebRTCService.sendPairCancel(outgoingPairing.device.id, outgoingPairing.pin);
            setOutgoingPairing(null);
        }
    }, [outgoingPairing]);

    const connectToDevice = useCallback(
        async (device: Device) => {
            initiatePairing(device);
        },
        [initiatePairing]
    );

    const disconnectDevice = useCallback(() => {
        WebRTCService.close();
        setConnectedDevice(null);
    }, []);

    return {
        devices,
        isScanning,
        connectedDevice,
        systemInfo,
        lastScanTime,
        startScan,
        connectToDevice,
        disconnectDevice,
        incomingPairingRequest,
        outgoingPairing,
        initiatePairing,
        acceptPairing,
        declinePairing,
        cancelOutgoingPairing,
    };
};
