import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';
import { Platform } from 'react-native';
import { getConnection, sendData, onData } from './WebRTCService'; // We'll need to implement WebRTC data channel

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  uri: string;
}

export interface Transfer {
  id: string;
  file: FileInfo;
  progress: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed';
  direction: 'send' | 'receive';
  peerId?: string;
  chunkSize?: number;
  totalChunks?: number;
  currentChunk?: number;
}

class FileTransferServiceClass {
  private transfers: Map<string, Transfer> = new Map();
  private listeners: ((transfers: Map<string, Transfer>) => void)[] = [];

  // Pick a file from device
  async pickFile(): Promise<FileInfo | null> {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });
      const file = result[0];
      const stats = await RNFS.stat(file.uri);
      return {
        id: Date.now().toString(),
        name: file.name,
        size: stats.size,
        type: file.type || 'application/octet-stream',
        uri: file.uri,
      };
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        return null;
      }
      throw err;
    }
  }

  // Start sending a file to a connected peer
  async sendFile(file: FileInfo, peerId: string): Promise<Transfer> {
    const transferId = `${Date.now()}-${file.id}`;
    const chunkSize = 64 * 1024; // 64KB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);

    const transfer: Transfer = {
      id: transferId,
      file,
      progress: 0,
      status: 'pending',
      direction: 'send',
      peerId,
      chunkSize,
      totalChunks,
      currentChunk: 0,
    };
    this.transfers.set(transferId, transfer);
    this.notifyListeners();

    // Start transfer in background
    this.processSend(transfer);

    return transfer;
  }

  private async processSend(transfer: Transfer) {
    try {
      transfer.status = 'transferring';
      this.notifyListeners();

      const { file, chunkSize, peerId } = transfer;
      const uri = file.uri;
      let offset = 0;
      let chunkIndex = 0;

      // Send file metadata first
      const metadata = {
        type: 'file_metadata',
        transferId: transfer.id,
        name: file.name,
        size: file.size,
        totalChunks: transfer.totalChunks,
      };
      await sendData(peerId, JSON.stringify(metadata));

      // Read and send chunks
      while (offset < file.size) {
        const end = Math.min(offset + chunkSize, file.size);
        const data = await RNFS.read(uri, offset, end - offset);
        const chunkData = {
          type: 'file_chunk',
          transferId: transfer.id,
          index: chunkIndex,
          data: data, // base64 or arraybuffer
        };
        await sendData(peerId, JSON.stringify(chunkData));

        offset += chunkSize;
        chunkIndex++;
        transfer.currentChunk = chunkIndex;
        transfer.progress = (offset / file.size) * 100;
        this.notifyListeners();
      }

      transfer.status = 'completed';
      transfer.progress = 100;
      this.notifyListeners();
    } catch (error) {
      transfer.status = 'failed';
      this.notifyListeners();
      console.error('Send failed:', error);
    }
  }

  // Handle incoming file transfer
  async handleIncomingTransfer(data: any) {
    if (data.type === 'file_metadata') {
      const transfer: Transfer = {
        id: data.transferId,
        file: {
          id: data.transferId,
          name: data.name,
          size: data.size,
          type: 'application/octet-stream',
          uri: '', // will be built from chunks
        },
        progress: 0,
        status: 'transferring',
        direction: 'receive',
        totalChunks: data.totalChunks,
        currentChunk: 0,
      };
      this.transfers.set(transfer.id, transfer);
      this.notifyListeners();

      // Prepare to write file
      const filePath = `${RNFS.DocumentDirectoryPath}/${data.name}`;
      transfer.file.uri = filePath;
      // Clear if exists
      await RNFS.writeFile(filePath, '', 'utf8');
    } else if (data.type === 'file_chunk') {
      const transfer = this.transfers.get(data.transferId);
      if (transfer && transfer.status === 'transferring') {
        const filePath = transfer.file.uri;
        // Append chunk
        await RNFS.appendFile(filePath, data.data, 'base64');
        transfer.currentChunk = data.index + 1;
        transfer.progress = (transfer.currentChunk / transfer.totalChunks) * 100;
        this.notifyListeners();

        if (transfer.progress >= 100) {
          transfer.status = 'completed';
          this.notifyListeners();
        }
      }
    }
  }

  // Get all transfers
  getTransfers(): Transfer[] {
    return Array.from(this.transfers.values());
  }

  // Subscribe to transfers updates
  subscribe(listener: (transfers: Transfer[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const transfers = this.getTransfers();
    this.listeners.forEach(l => l(transfers));
  }
}

export const FileTransferService = new FileTransferServiceClass();
