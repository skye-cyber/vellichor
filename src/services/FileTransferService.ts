import { Transfer, TransferFile } from '../types';
import { WebRTCService } from './WebRTCService';

export class FileTransferServiceClass {
  private transfers: Map<string, Transfer> = new Map();
  private listeners: Set<(transfers: Transfer[]) => void> = new Set();
  private incomingBuffers: Map<string, { chunks: string[]; metadata: any }> = new Map();

  constructor() {
    WebRTCService.onData((channel, data) => {
      if (channel === 'file') {
        this.handleIncomingData(data);
      }
    });
  }

  // Pick file using standard browser file picker
  async pickFile(): Promise<TransferFile | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              size: file.size,
              type: file.type || 'application/octet-stream',
              dataUrl: reader.result as string,
            });
          };
          reader.readAsDataURL(file);
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  }

  async sendFile(file: TransferFile, peerId: string, peerName?: string): Promise<Transfer> {
    const transferId = `tx-${Date.now()}-${file.id}`;
    const chunkSize = 64 * 1024; // 64KB
    const totalChunks = Math.ceil((file.dataUrl?.length || file.size) / chunkSize);

    const transfer: Transfer = {
      id: transferId,
      file,
      progress: 0,
      speedMb: 0,
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

    // Start sending chunks in background
    this.processSend(transfer);
    return transfer;
  }

  private async processSend(transfer: Transfer) {
    const startTime = Date.now();
    try {
      transfer.status = 'transferring';
      this.notify();

      const { file, chunkSize = 64 * 1024, totalChunks = 1 } = transfer;
      const dataString = file.dataUrl || '';

      // Send metadata
      WebRTCService.sendData('file', {
        type: 'file_metadata',
        transferId: transfer.id,
        name: file.name,
        size: file.size,
        fileType: file.type,
        totalChunks,
      });

      let offset = 0;
      let chunkIndex = 0;

      while (offset < dataString.length) {
        if ((transfer.status as string) === 'paused') {
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
        if ((transfer.status as string) === 'failed') break;

        const chunk = dataString.slice(offset, offset + chunkSize);
        WebRTCService.sendData('file', {
          type: 'file_chunk',
          transferId: transfer.id,
          index: chunkIndex,
          data: chunk,
        });

        offset += chunkSize;
        chunkIndex++;
        transfer.currentChunk = chunkIndex;
        transfer.progress = Math.min(100, Math.round((offset / dataString.length) * 100));

        const elapsedSec = (Date.now() - startTime) / 1000;
        if (elapsedSec > 0) {
          transfer.speedMb = parseFloat(((offset / (1024 * 1024)) / elapsedSec).toFixed(1));
        }

        this.notify();
        // Yield thread slightly for smooth streaming
        await new Promise((r) => setTimeout(r, 10));
      }

      transfer.status = 'completed';
      transfer.progress = 100;
      this.notify();
    } catch (err: any) {
      console.error('File send error:', err);
      transfer.status = 'failed';
      transfer.error = err.message || 'Transfer failed';
      this.notify();
    }
  }

  private handleIncomingData(data: any) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'file_metadata') {
      const transferId = data.transferId;
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
        status: 'transferring',
        direction: 'receive',
        totalChunks: data.totalChunks,
        currentChunk: 0,
      };

      this.incomingBuffers.set(transferId, {
        chunks: [],
        metadata: data,
      });
      this.transfers.set(transferId, transfer);
      this.notify();
    } else if (data.type === 'file_chunk') {
      const transfer = this.transfers.get(data.transferId);
      const buffer = this.incomingBuffers.get(data.transferId);

      if (transfer && buffer) {
        buffer.chunks.push(data.data);
        transfer.currentChunk = data.index + 1;
        transfer.progress = Math.min(100, Math.round(((transfer.currentChunk || 0) / (transfer.totalChunks || 1)) * 100));

        if (transfer.progress >= 100) {
          transfer.status = 'completed';
          const fullDataUrl = buffer.chunks.join('');
          transfer.file.dataUrl = fullDataUrl;
          this.triggerDownload(transfer.file.name, fullDataUrl);
          this.incomingBuffers.delete(data.transferId);
        }

        this.notify();
      }
    }
  }

  private triggerDownload(filename: string, dataUrl: string) {
    try {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.warn('Failed to auto-download received file:', e);
    }
  }

  togglePause(transferId: string) {
    const t = this.transfers.get(transferId);
    if (t) {
      if (t.status === 'transferring') {
        t.status = 'paused';
      } else if (t.status === 'paused') {
        t.status = 'transferring';
      }
      this.notify();
    }
  }

  cancelTransfer(transferId: string) {
    const t = this.transfers.get(transferId);
    if (t) {
      t.status = 'failed';
      t.error = 'Cancelled by user';
      this.notify();
    }
  }

  getTransfers(): Transfer[] {
    return Array.from(this.transfers.values());
  }

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
