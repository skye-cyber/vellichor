import { Transfer, TransferFile } from '../types';
import { WebRTCService, encodeChunk, decodeChunk, base64ToArrayBuffer, CHUNK_HEADER_BYTES } from './WebRTCService';
import { TauriNativeService } from './TauriNativeService';
import { SettingsService } from './SettingsService';

const CHUNK_SIZE = 768 * 1024;          // 768 KiB
const WINDOW_SIZE = 1;                 // max in-flight unacked chunks
const ACK_TIMEOUT_MS = 1000;
const READY_TIMEOUT_MS = 5000;
const COMPLETE_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 5;

type SendPhase = 'awaiting_ready' | 'streaming' | 'finalizing' | 'done';

interface SendState {
    phase: SendPhase;
    ackedThrough: number;              // exclusive: next chunk that must be sent is ackedThrough
    retries: Map<number, number>;
    pending: Set<number>;              // indexes sent but not yet acked
    ackTimer?: ReturnType<typeof setTimeout>;
    readyTimer?: ReturnType<typeof setTimeout>;
    completeTimer?: ReturnType<typeof setTimeout>;
}

interface IncomingState {
    bytesWritten: number;
    nextExpectedIndex: number;
    lastProgressAt: number;
    bytesSinceLastReport: number;
}

export class FileTransferServiceClass {
    private transfers = new Map<string, Transfer>();
    private listeners = new Set<(transfers: Transfer[]) => void>();
    private sendStates = new Map<string, SendState>();
    private incoming = new Map<string, IncomingState>();
    private browserBuffers = new Map<string, Uint8Array[]>(); // non-Tauri fallback
    private activeDownloadDir = SettingsService.getSettings().downloadPath;

    constructor() {
        WebRTCService.onData('file-ctl', (data) => this.handleControl(data));
        WebRTCService.onData('file', (data) => {
            if (data instanceof ArrayBuffer) {
                this.handleChunkFrame(data);
                return;
            }
            if (ArrayBuffer.isView(data)) {
                const v = data as ArrayBufferView;
                const copy = new Uint8Array(v.byteLength);
                copy.set(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
                this.handleChunkFrame(copy.buffer);
                return;
            }
            if (data.__binary && typeof data.base64 === 'string') {
                const buf = base64ToArrayBuffer(data.base64);
                if (buf.byteLength < CHUNK_HEADER_BYTES) {
                    console.warn('[TX] short binary frame', buf.byteLength);
                    return;
                }
                this.handleChunkFrame(buf);
                return;
            }
            // Direct-transport fallback: data is a JSON object whose `.data` is the
            // byte array. Rebuild the ArrayBuffer and decode the header as usual.
            if (data && typeof data === 'object' && Array.isArray(data.data)) {
                const bytes = new Uint8Array(data.data);
                this.handleChunkFrame(bytes.buffer);
                return;
            }
            // Last resort: bare number[]. No header → can't route. Log and drop.
            if (Array.isArray(data)) {
                console.warn('[TX] bare byte array on file channel, no header — cannot route', data.length);
                return;
            }
            // Legacy JSON chunk frame.
            this.handleControl(data);
        });

        if (TauriNativeService.isTauri()) {
            TauriNativeService.getDownloadDirectory().then((dir) => {
                this.activeDownloadDir = dir;
            });
        }
    }

    // ---------------------------------------------------------------- picker

    async pickFiles(): Promise<TransferFile[]> {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.onchange = (e: any) => {
                const files: FileList | null = e.target?.files;
                if (!files || files.length === 0) return resolve([]);
                const picked: TransferFile[] = [];
                for (let i = 0; i < files.length; i++) {
                    const f = files[i];
                    picked.push({
                        id: `file-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
                        name: f.name,
                        size: f.size,
                        type: f.type || 'application/octet-stream',
                        rawFile: f,
                    });
                }
                resolve(picked);
            };
            input.click();
        });
    }

    // ---------------------------------------------------------------- send

    async sendFile(file: TransferFile, peerId: string, peerName?: string): Promise<Transfer> {
        if (!file.rawFile) throw new Error('cannot send: missing raw File handle');

        // → "tx-" + 8 chars = 11 chars, safe under the 16-byte header limit
        // padEnd(8, '0') handles the rare case where Math.random().toString(36).slice(2, 10) returns fewer than 8 chars (it can, for very small random values).
        // crypto.randomUUID().slice(0, 8) is another option if you want to avoid Math.random — not cryptographically necessary here, but fine.
        const transferId = `tx-${Math.random().toString(36).slice(2, 10).padEnd(8, '0')}`;
        // or
        // const transferId = `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));

        const transfer: Transfer = {
            id: transferId,
            file,
            progress: 0,
            speedMb: 0,
            etaSeconds: 0,
            status: 'pending',
            direction: 'send',
            peerId,
            peerName: peerName || 'Remote Peer',
            chunkSize: CHUNK_SIZE,
            totalChunks,
            currentChunk: 0,
        };
        const fullBuf = await file.rawFile.arrayBuffer();
        (transfer as any).fullBytes = new Uint8Array(fullBuf);

        this.transfers.set(transferId, transfer);
        this.sendStates.set(transferId, {
            phase: 'awaiting_ready',
            ackedThrough: 0,
            retries: new Map(),
            pending: new Set(),
        });


        this.notify();

        // Announce + wait for ready
        WebRTCService.sendData('file-ctl', {
            type: 'file_metadata',
            transferId,
            name: file.name,
            size: file.size,
            fileType: file.type,
            totalChunks,
        });
        transfer.status = 'waiting_ready';
        this.notify();

        const state = this.sendStates.get(transferId)!;
        state.readyTimer = setTimeout(() => {
            if (state.phase === 'awaiting_ready') {
                this.fail(transferId, 'receiver did not acknowledge metadata (timeout)');
            }
        }, READY_TIMEOUT_MS);

        return transfer;
    }

    private async startStreaming(transferId: string) {
        const transfer = this.transfers.get(transferId);
        const state = this.sendStates.get(transferId);
        if (!transfer || !state) return;
        if (state.phase !== 'awaiting_ready') return;

        state.phase = 'streaming';
        transfer.status = 'transferring';
        this.notify();

        const file = transfer.file.rawFile!;
        const totalChunks = transfer.totalChunks!;
        const startTime = Date.now();
        let bytesAcked = 0;

        const sendChunk = async (index: number) => {
            const start = index * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const blob = file.slice(start, end);
            console.log("[BLOB]", blob, "index=", index)

            const ab = await blob.arrayBuffer();
            console.log("[AB]", ab, "index=", index)
            const frame = encodeChunk(transferId, index, new Uint8Array(ab));

            const ok = WebRTCService.sendData('file', frame);
            if (!ok) {
                console.warn(`[TX_SEND] index=${index} FAILED — channel not open, not adding to pending`);
                return;
            }
            state.pending.add(index);
            console.log(`[TX_SEND] id=${transferId} index=${index} bytes=${ab.byteLength + CHUNK_HEADER_BYTES} sent=${ok}`);
            return ok
        };

        // Fill window initially
        while (
            state.pending.size < WINDOW_SIZE &&
            state.ackedThrough + state.pending.size < totalChunks
        ) {
            const idx = state.ackedThrough + state.pending.size;
            console.log(`[TX_SEND_IDX] idx=${idx}`)
            await sendChunk(idx);
        }
        this.armAckTimeout(transferId);

        // Ack arrival is handled in handleControl. This loop only reacts to state.
        await new Promise<void>((resolve) => {
            const tick = setInterval(() => {
                if (state.phase !== 'streaming' && state.phase !== 'finalizing') {
                    clearInterval(tick);
                    resolve();
                    return;
                }
                // Update speed based on acked bytes
                const elapsed = (Date.now() - startTime) / 1000;
                if (elapsed > 0.5) {
                    transfer.speedMb = +(bytesAcked / (1024 * 1024) / elapsed).toFixed(2);
                    const remaining = transfer.file.size - bytesAcked;
                    const rate = bytesAcked / elapsed;
                    transfer.etaSeconds = rate > 0 ? Math.round(remaining / rate) : 0;
                }
                bytesAcked = Math.min(transfer.file.size, state.ackedThrough * CHUNK_SIZE);
                transfer.progress = Math.min(100, Math.round((bytesAcked / transfer.file.size) * 100));
                transfer.currentChunk = state.ackedThrough;
                this.notify();
                if (state.ackedThrough >= totalChunks && state.phase === 'streaming') {
                    this.beginFinalize(transferId);
                }
            }, 200);
        });
    }

    private armAckTimeout(transferId: string) {
        const state = this.sendStates.get(transferId);
        if (!state) return;
        if (state.ackTimer) clearTimeout(state.ackTimer);
        if (state.pending.size === 0) return;

        state.ackTimer = setTimeout(async () => {
            const s = this.sendStates.get(transferId);
            const t = this.transfers.get(transferId);
            if (!s || !t || s.phase !== 'streaming') return;
            // Retry the oldest un-acked chunk
            const oldest = Math.min(...s.pending);
            const retries = (s.retries.get(oldest) ?? 0) + 1;
            s.retries.set(oldest, retries);
            if (retries > MAX_RETRIES) {
                this.fail(transferId, `chunk ${oldest} not acked after ${MAX_RETRIES} retries`);
                return;
            }
            console.warn(`[TX] chunk ${oldest} unacked, retry ${retries}`);
            await this.sendChunkRaw(transferId, oldest);
            this.armAckTimeout(transferId);
        }, ACK_TIMEOUT_MS);
    }

    private async sendChunkRaw(transferId: string, index: number): Promise<boolean> {
        const transfer = this.transfers.get(transferId);
        if (!transfer) return false;

        const state = this.sendStates.get(transferId);
        if (!state) return false;

        const fullBytes = (transfer as any).fullBytes as Uint8Array | undefined;
        if (!fullBytes) {
            console.warn(`[TX_SEND_RAW] index=${index} — fullBytes not loaded`);
            return false;
        }

        const start = index * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, transfer.file.size);
        const payload = fullBytes.subarray(start, end);   // zero-copy view

        const ok = WebRTCService.sendData(
            'file',
            encodeChunk(transferId, index, payload),
        );
        if (!ok) {
            console.warn(`[TX_SEND_RAW] index=${index} FAILED — channel not open`);
            return false;
        }

        state.pending.add(index);
        console.log(
            `[TX_SEND_RAW] id=${transferId} index=${index} bytes=${payload.byteLength + CHUNK_HEADER_BYTES} sent=${ok}`,
        );
        return ok;
    }

    private beginFinalize(transferId: string) {
        const state = this.sendStates.get(transferId);
        const transfer = this.transfers.get(transferId);
        if (!state || !transfer || state.phase !== 'streaming') return;
        state.phase = 'finalizing';
        transfer.status = 'finalizing';
        this.notify();

        WebRTCService.sendData('file-ctl', {
            type: 'file_complete',
            transferId,
            size: transfer.file.size,
            totalChunks: transfer.totalChunks,
        });
        state.completeTimer = setTimeout(() => {
            if (state.phase === 'finalizing') {
                this.fail(transferId, 'receiver did not confirm completion (timeout)');
            }
        }, COMPLETE_TIMEOUT_MS);
    }

    // ---------------------------------------------------------------- receive

    private async handleControl(data: any) {
        if (!data || typeof data !== 'object' || !data.type) return;
        console.log("Processing Control", data.type)
        switch (data.type) {
            case 'file_metadata':
                return this.onMetadata(data);
            case 'file_ready':
                return this.onReady(data);
            case 'file_chunk_ack':
                return this.onChunkAck(data);
            case 'file_complete':
                return this.onComplete(data);
            case 'file_complete_ack':
                return this.onCompleteAck(data);
            case 'file_control':
                return this.onControl(data);
            case 'file_error':
                return this.onRemoteError(data);
            case 'file_chunk':
                // Legacy path: base64 in JSON. Route to a compat handler.
                return this.onLegacyChunk(data);
        }
    }

    private async onMetadata(data: any) {
        const transferId: string = data.transferId;
        let displayPath = data.name as string;
        let targetPathForFs = data.name as string; // Android: "Vellichor/<name>"
        console.log(`[META] id=${data.transferId} name=${data.name} size=${data.size}`);
        if (TauriNativeService.isTauri()) {
            // Android receives relative path under Download; desktop receives
            // absolute path. Backend's begin_download picks the correct base.
            const sep = this.activeDownloadDir.includes('\\') ? '\\' : '/';
            if (this.activeDownloadDir.startsWith('Download/')) {
                displayPath = `${this.activeDownloadDir}/${data.name}`;
                targetPathForFs = `${this.activeDownloadDir}/${data.name}`;
            } else {
                displayPath = `${this.activeDownloadDir}${sep}${data.name}`;
                targetPathForFs = displayPath;
            }
        }

        const transfer: Transfer = {
            id: transferId,
            file: {
                id: transferId,
                name: data.name,
                size: data.size,
                type: data.fileType,
            },
            progress: 0,
            speedMb: 0,
            etaSeconds: 0,
            status: 'transferring',
            direction: 'receive',
            totalChunks: data.totalChunks,
            currentChunk: 0,
            savedPath: TauriNativeService.isTauri() ? displayPath : undefined,
        };
        this.transfers.set(transferId, transfer);
        this.incoming.set(transferId, {
            bytesWritten: 0,
            nextExpectedIndex: 0,
            lastProgressAt: Date.now(),
            bytesSinceLastReport: 0,
        });
        if (!TauriNativeService.isTauri()) this.browserBuffers.set(transferId, []);
        this.notify();

        if (TauriNativeService.isTauri()) {
            try {
                await TauriNativeService.beginDownload(
                    transferId,
                    targetPathForFs,
                    data.size,
                    data.fileType,
                );
            } catch (e) {
                WebRTCService.sendData('file-ctl', {
                    type: 'file_error', transferId, reason: `begin_download: ${e}`,
                });
                this.fail(transferId, `begin_download failed: ${e}`);
                return;
            }
        }

        WebRTCService.sendData('file-ctl', { type: 'file_ready', transferId });
    }

    private async onReady(data: any) {
        const transferId: string = data.transferId;
        const state = this.sendStates.get(transferId);
        if (!state || state.phase !== 'awaiting_ready') return;
        if (state.readyTimer) { clearTimeout(state.readyTimer); state.readyTimer = undefined; }
        this.startStreaming(transferId);
    }

    private async onChunkAck(data: any) {
        console.log(`[TX_ACK] id=${data.transferId} index=${data.index}`);
        const transferId: string = data.transferId;
        const index: number = data.index;
        const state = this.sendStates.get(transferId);
        const transfer = this.transfers.get(transferId);
        if (!state || !transfer || state.phase !== 'streaming') return;

        state.pending.delete(index);
        state.retries.delete(index);
        if (index === state.ackedThrough) {
            state.ackedThrough++;
            // Drain the window
            while (
                state.pending.size < WINDOW_SIZE &&
                state.ackedThrough + state.pending.size < transfer.totalChunks!
            ) {
                const idx = state.ackedThrough + state.pending.size;
                await this.sendChunkRaw(transferId, idx);
            }
            this.armAckTimeout(transferId);
        }
        // reset timer whenever anything acks; stale retries for old chunks
        // won't fire because pending is empty for them
    }

    private async onComplete(data: any) {
        const transferId: string = data.transferId;
        const transfer = this.transfers.get(transferId);
        const inc = this.incoming.get(transferId);
        if (!transfer || !inc) return;

        try {
            let receivedLen = inc.bytesWritten;
            if (TauriNativeService.isTauri()) {
                receivedLen = await TauriNativeService.finalizeDownload(transferId);
            } else {
                const chunks = this.browserBuffers.get(transferId) || [];
                receivedLen = chunks.reduce((n, c) => n + c.byteLength, 0);
                if (receivedLen !== data.size) {
                    throw new Error(`browser size mismatch: got ${receivedLen} want ${data.size}`);
                }
            }
            WebRTCService.sendData('file-ctl', {
                type: 'file_complete_ack', transferId, bytesReceived: receivedLen,
            });
            transfer.status = 'completed';
            transfer.progress = 100;
            transfer.etaSeconds = 0;
            this.notify();

            if (!TauriNativeService.isTauri()) {
                const chunks = this.browserBuffers.get(transferId) || [];
                const blob = new Blob(chunks as BlobPart[], { type: transfer.file.type });
                this.triggerDownload(transfer.file.name, URL.createObjectURL(blob));
            }
            if (TauriNativeService.isTauri()) {
                await TauriNativeService.cleanupDownload(transferId, false);
            }
            // this.incoming.delete(transferId);
            this.browserBuffers.delete(transferId);
        } catch (e) {
            WebRTCService.sendData('file-ctl', {
                type: 'file_error', transferId, reason: `finalize: ${e}`,
            });
            this.fail(transferId, `finalize failed: ${e}`);
            if (TauriNativeService.isTauri()) {
                await TauriNativeService.cleanupDownload(transferId, true).catch(() => { });
            }
        }
    }

    private async onCompleteAck(data: any) {
        const transferId: string = data.transferId;
        const state = this.sendStates.get(transferId);
        const transfer = this.transfers.get(transferId);
        if (!state || !transfer || state.phase !== 'finalizing') return;
        if (state.completeTimer) clearTimeout(state.completeTimer);
        state.phase = 'done';
        transfer.status = 'completed';
        transfer.progress = 100;
        transfer.etaSeconds = 0;
        this.notify();
    }

    private async onControl(data: any) {
        const transferId: string = data.transferId;
        const transfer = this.transfers.get(transferId);
        if (!transfer) return;
        if (data.action === 'pause') transfer.status = 'paused';
        else if (data.action === 'resume') transfer.status = 'transferring';
        else if (data.action === 'cancel') {
            transfer.status = 'cancelled';
            transfer.error = 'Cancelled by remote peer';
            this.sendStates.delete(transferId);
            // this.incoming.delete(transferId);
            this.browserBuffers.delete(transferId);
            if (TauriNativeService.isTauri()) {
                await TauriNativeService.cleanupDownload(transferId, true).catch(() => { });
            }
        }
        this.notify();
    }

    private async onRemoteError(data: any) {
        const transferId: string = data.transferId;
        this.fail(transferId, `remote: ${data.reason ?? 'unknown error'}`);
    }

    private async onLegacyChunk(data: any) {
        // Old senders still emit `file_chunk` with base64 data on the JSON
        // channel. Route through the binary handler so state tracking is
        // uniform.
        const bin = atob(data.data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        await this.persistChunk(data.transferId, data.index, bytes);
    }

    private async handleChunkFrame(buf: ArrayBuffer) {
        const { transferId, index, payload } = decodeChunk(buf);
        await this.persistChunk(transferId, index, payload);
    }

    private async persistChunk(transferId: string, index: number, payload: Uint8Array) {
        const transfer = this.transfers.get(transferId);
        const inc = this.incoming.get(transferId);
        console.log(`[RX_CHUNK] id="${transferId}" index=${index} bytes=${payload.byteLength} ` +
        `hasTransfer=${!!transfer} hasIncoming=${!!inc} ` +
        `incomingKeys=${JSON.stringify(Array.from(this.incoming.keys()))} ` +
        `transfersKeys=${JSON.stringify(Array.from(this.transfers.keys()))}`);

        if (!transfer || !inc) return;
        console.log("PASS CHECK")
        try {
            if (TauriNativeService.isTauri()) {
                console.log("Write to file")
                const res = await TauriNativeService.writeFileChunk(transferId, index, payload);
                // bytesWritten is authoritative from Rust; use it for speed
                inc.bytesWritten = res.bytesWritten;
                console.log(`[RX_CHUNK_OK] id=${transferId} index=${index} status=${res.status}`);
            } else {
                const chunks = this.browserBuffers.get(transferId)!;
                chunks[index] = payload; // index-based, so retransmits overwrite
                inc.bytesWritten = chunks.reduce((n, c) => n + (c?.byteLength ?? 0), 0);
            }

            // Only ack after the write returned; duplicate acks are safe
            // because the sender treats them idempotently.
            const ok = WebRTCService.sendData('file-ctl', {
                type: 'file_chunk_ack', transferId, index,
            });
            console.log(`[RX_ACK] id=${transferId} index=${index} sent=${ok}`);

            // Progress + speed
            inc.nextExpectedIndex = Math.max(inc.nextExpectedIndex, index + 1);
            transfer.currentChunk = inc.nextExpectedIndex;
            transfer.progress = Math.min(
                100,
                Math.round((inc.nextExpectedIndex / (transfer.totalChunks || 1)) * 100),
            );
            const now = Date.now();
            const elapsedSec = (now - inc.lastProgressAt) / 1000;
            if (elapsedSec > 0.5) {
                const bytesSince = inc.bytesWritten - inc.bytesSinceLastReport;
                transfer.speedMb = +((bytesSince / (1024 * 1024)) / elapsedSec).toFixed(2);
                const remaining = transfer.file.size - inc.bytesWritten;
                const rate = bytesSince / elapsedSec;
                transfer.etaSeconds = rate > 0 ? Math.round(remaining / rate) : 0;
                inc.lastProgressAt = now;
                inc.bytesSinceLastReport = inc.bytesWritten;
            }
            this.notify();
        } catch (e) {
            WebRTCService.sendData('file-ctl', {
                type: 'file_error', transferId, reason: `write chunk ${index}: ${e}`,
            });
            this.fail(transferId, `write chunk failed: ${e}`);
            await TauriNativeService.cleanupDownload(transferId, true).catch(() => { });
        }
    }

    // ---------------------------------------------------------------- user actions

    togglePause(transferId: string) {
        const t = this.transfers.get(transferId);
        if (!t) return;
        if (t.status === 'transferring') {
            t.status = 'paused';
            WebRTCService.sendData('file-ctl', { type: 'file_control', transferId, action: 'pause' });
        } else if (t.status === 'paused') {
            t.status = 'transferring';
            WebRTCService.sendData('file-ctl', { type: 'file_control', transferId, action: 'resume' });
        }
        this.notify();
    }

    async cancelTransfer(transferId: string) {
        const t = this.transfers.get(transferId);
        if (!t) return;
        const wasActive = t.status === 'pending' || t.status === 'waiting_ready'
            || t.status === 'transferring' || t.status === 'paused' || t.status === 'finalizing';
        t.status = 'cancelled';
        t.error = 'Cancelled by user';
        this.sendStates.delete(transferId);
        // this.incoming.delete(transferId);
        this.browserBuffers.delete(transferId);
        this.notify();

        if (wasActive) {
            WebRTCService.sendData('file-ctl', { type: 'file_control', transferId, action: 'cancel' });
        }
        if (TauriNativeService.isTauri()) {
            await TauriNativeService.cleanupDownload(transferId, true).catch((e) => {
                console.warn('[TX] cleanup after cancel failed:', e);
            });
        }
    }

    // ---------------------------------------------------------------- plumbing

    private fail(transferId: string, reason: string) {
        const t = this.transfers.get(transferId);
        if (!t) return;
        t.status = 'failed';
        t.error = reason;
        this.sendStates.delete(transferId);
        this.notify();
        // Do not send file_error here if we already did; callers decide.
    }

    private triggerDownload(filename: string, objectUrl: string) {
        try {
            const a = document.createElement('a');
            a.href = objectUrl; a.download = filename;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        } catch (e) {
            console.warn('auto-download failed:', e);
        }
    }

    getTransfers(): Transfer[] { return Array.from(this.transfers.values()); }

    subscribe(listener: (transfers: Transfer[]) => void): () => void {
        this.listeners.add(listener);
        listener(this.getTransfers());
        return () => { this.listeners.delete(listener); };
    }

    private notify() { const list = this.getTransfers(); this.listeners.forEach((l) => l(list)); }
}

export const FileTransferService = new FileTransferServiceClass();
