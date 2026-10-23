import { Transfer, TransferFile } from '../types';
import { WebRTCService } from './WebRTCService';
import { TauriNativeService } from './TauriNativeService';

export class FileTransferServiceClass {
  private transfers: Map<string, Transfer> = new Map();
  private listeners: Set<(transfers: Transfer[]) => void> = new Set();
  private incomingBuffers: Map<string, { chunks: Uint8Array[]; targetPath?: string; metadata: any }> = new Map();
  private activeDownloadDir: string = 'Downloads';

  constructor() {
    // Intercept incoming data on WebRTC file data channel
    WebRTCService.onData((channel, data) => {
      if (channel === 'file') {
        this.handleIncomingData(data);
      }
    });

    // Query native download directory when running in Tauri
    if (TauriNativeService.isTauri()) {
      TauriNativeService.getDownloadDirectory().then((dir) => {
        this.activeDownloadDir = dir;
      });
    }
  }

  // Opens file picker allowing multi-file selection without loading full files into memory
  async pickFiles(): Promise<TransferFile[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;

      input.onchange = (e: any) => {
        const files: FileList | null = e.target?.files;
        if (!files || files.length === 0) {
          resolve([]);
          return;
        }

        const picked: TransferFile[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          picked.push({
            id: `file-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            rawFile: file,
          });
        }
        resolve(picked);
      };

      input.click();
    });
  }

  // Initiates streaming chunked file transmission to the connected peer
  async sendFile(file: TransferFile, peerId: string, peerName?: string): Promise<Transfer> {
    const transferId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const chunkSize = 64 * 1024; // 64KB standard block size
    const totalChunks = Math.ceil(file.size / chunkSize) || 1;

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
      chunkSize,
      totalChunks,
      currentChunk: 0,
    };

    this.transfers.set(transferId, transfer);
    this.notify();

    // Start background chunked streaming
    this.processSend(transfer);
    return transfer;
  }

  // Streams 64KB slices over WebRTC data channel with real-time speed and ETA calculation
  private async processSend(transfer: Transfer) {
    const startTime = Date.now();
    try {
      transfer.status = 'transferring';
      this.notify();

      const { file, chunkSize = 64 * 1024, totalChunks = 1 } = transfer;

      // Announce file metadata to the receiver
      WebRTCService.sendData('file', {
        type: 'file_metadata',
        transferId: transfer.id,
        name: file.name,
        size: file.size,
        fileType: file.type,
        totalChunks,
      });

      let bytesSent = 0;
      let chunkIndex = 0;

      while (bytesSent < file.size) {
        // Handle pause status
        if ((transfer.status as string) === 'paused') {
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }

        // Abort if transfer failed or cancelled
        if ((transfer.status as string) === 'failed') break;

        const sliceEnd = Math.min(bytesSent + chunkSize, file.size);
        let chunkBase64 = '';

        if (file.rawFile) {
          // Stream slice directly from File blob without holding full payload in RAM
          const blobSlice = file.rawFile.slice(bytesSent, sliceEnd);
          const arrayBuffer = await blobSlice.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          chunkBase64 = btoa(binary);
        } else if (file.dataUrl) {
          chunkBase64 = file.dataUrl.slice(bytesSent, sliceEnd);
        }

        // Send chunk frame
        WebRTCService.sendData('file', {
          type: 'file_chunk',
          transferId: transfer.id,
          index: chunkIndex,
          data: chunkBase64,
        });

        bytesSent = sliceEnd;
        chunkIndex++;
        transfer.currentChunk = chunkIndex;
        transfer.progress = Math.min(100, Math.round((bytesSent / file.size) * 100));

        const elapsedSec = (Date.now() - startTime) / 1000;
        if (elapsedSec > 0) {
          const speed = (bytesSent / (1024 * 1024)) / elapsedSec;
          transfer.speedMb = parseFloat(speed.toFixed(1));

          const remainingBytes = file.size - bytesSent;
          const bytesPerSec = bytesSent / elapsedSec;
          transfer.etaSeconds = bytesPerSec > 0 ? Math.round(remainingBytes / bytesPerSec) : 0;
        }

        this.notify();
        // Yield execution loop slightly to maintain responsive UI
        await new Promise((r) => setTimeout(r, 6));
      }

      if ((transfer.status as string) !== 'failed') {
        transfer.status = 'completed';
        transfer.progress = 100;
        transfer.etaSeconds = 0;
        this.notify();
      }
    } catch (err: any) {
      console.error('File send error:', err);
      transfer.status = 'failed';
      transfer.error = err.message || 'Transfer failed';
      this.notify();
    }
  }

  // Handles incoming metadata, chunks, and control frames from remote peer
  private async handleIncomingData(data: any) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'file_metadata') {
      const transferId = data.transferId;
      let targetPath = undefined;

      // In Tauri runtime, write chunks directly into Downloads directory
      if (TauriNativeService.isTauri()) {
        const sep = this.activeDownloadDir.includes('\\') ? '\\' : '/';
        targetPath = `${this.activeDownloadDir}${sep}${data.name}`;
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
        savedPath: targetPath,
      };

      this.incomingBuffers.set(transferId, {
        chunks: [],
        targetPath,
        metadata: data,
      });

      this.transfers.set(transferId, transfer);
      this.notify();
    } else if (data.type === 'file_chunk') {
      const transfer = this.transfers.get(data.transferId);
      const buffer = this.incomingBuffers.get(data.transferId);

      if (transfer && buffer) {
        // Decode base64 chunk
        const binaryString = atob(data.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // If native Tauri filesystem is available, write chunk directly to disk
        if (buffer.targetPath && TauriNativeService.isTauri()) {
          const isInitial = data.index === 0;
          await TauriNativeService.writeFileChunk(buffer.targetPath, bytes, isInitial);
        } else {
          // Accumulate in memory for browser webview download
          buffer.chunks.push(bytes);
        }

        transfer.currentChunk = data.index + 1;
        transfer.progress = Math.min(
          100,
          Math.round(((transfer.currentChunk || 0) / (transfer.totalChunks || 1)) * 100)
        );

        if (transfer.progress >= 100) {
          transfer.status = 'completed';
          transfer.etaSeconds = 0;

          // In browser, trigger automatic download from accumulated buffer
          if (!buffer.targetPath && buffer.chunks.length > 0) {
            const blob = new Blob(buffer.chunks as BlobPart[], { type: transfer.file.type });
            const objectUrl = URL.createObjectURL(blob);
            this.triggerDownload(transfer.file.name, objectUrl);
          }

          this.incomingBuffers.delete(data.transferId);
        }

        this.notify();
      }
    } else if (data.type === 'file_control') {
      const transfer = this.transfers.get(data.transferId);
      if (transfer) {
        if (data.action === 'pause') {
          transfer.status = 'paused';
        } else if (data.action === 'resume') {
          transfer.status = 'transferring';
        } else if (data.action === 'cancel') {
          transfer.status = 'failed';
          transfer.error = 'Cancelled by remote peer';
        }
        this.notify();
      }
    }
  }

  // Triggers browser file download from Blob object URL
  private triggerDownload(filename: string, objectUrl: string) {
    try {
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (e) {
      console.warn('Failed to auto-download received file:', e);
    }
  }

  // Toggles pause and resume state on active transfer
  togglePause(transferId: string) {
    const t = this.transfers.get(transferId);
    if (t) {
      if (t.status === 'transferring') {
        t.status = 'paused';
        WebRTCService.sendData('file', {
          type: 'file_control',
          transferId,
          action: 'pause',
        });
      } else if (t.status === 'paused') {
        t.status = 'transferring';
        WebRTCService.sendData('file', {
          type: 'file_control',
          transferId,
          action: 'resume',
        });
      }
      this.notify();
    }
  }

  // Cancels an active or pending file transfer
  cancelTransfer(transferId: string) {
    const t = this.transfers.get(transferId);
    if (t) {
      t.status = 'failed';
      t.error = 'Cancelled by user';
      WebRTCService.sendData('file', {
        type: 'file_control',
        transferId,
        action: 'cancel',
      });
      this.incomingBuffers.delete(transferId);
      this.notify();
    }
  }

  // Returns array of all active and historical transfers
  getTransfers(): Transfer[] {
    return Array.from(this.transfers.values());
  }

  // Subscribes listener to transfer state updates
  subscribe(listener: (transfers: Transfer[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getTransfers());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = this.getTransfers();
    this.listeners.forEach((l) => l(list));
  }
}

export const FileTransferService = new FileTransferServiceClass();
