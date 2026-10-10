import React, { useState, useEffect } from 'react';
import {
  FolderSync,
  Upload,
  ArrowUpDown,
  Share2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Device, Transfer, TransferFile } from '../types';
import { FileTransferService } from '../services/FileTransferService';
import { FileBrowser } from '../components/FileBrowser';
import { TransferQueue } from '../components/TransferQueue';
import { WebShareModal } from '../components/WebShareModal';

interface FilesScreenProps {
  connectedDevice: Device | null;
  signalingServerUrl?: string;
  onNavigateToDiscovery: () => void;
}

export const FilesScreen: React.FC<FilesScreenProps> = ({
  connectedDevice,
  signalingServerUrl,
  onNavigateToDiscovery,
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'transfers'>('files');
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [webShareFile, setWebShareFile] = useState<TransferFile | null>(null);

  useEffect(() => {
    const unsub = FileTransferService.subscribe((list) => {
      setTransfers(list);
    });
    return unsub;
  }, []);

  const activeCount = transfers.filter((t) => t.status === 'transferring').length;

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 space-y-4 max-w-5xl mx-auto w-full h-full overflow-hidden">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
              <FolderSync className="w-5 h-5 text-accent" />
              <span>File Transfer</span>
            </h2>
            {connectedDevice ? (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                Peer: {connectedDevice.name}
              </span>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Web Share Active
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            P2P 64KB block transfers over WebRTC with CRC verification & instant QR web downloads.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex p-1 rounded-2xl bg-gray-100 dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border self-start sm:self-auto shrink-0">
          <button
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeTab === 'files'
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-primary'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Files Explorer</span>
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all relative ${
              activeTab === 'transfers'
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-primary'
            }`}
          >
            <ArrowUpDown className="w-4 h-4" />
            <span>Transfers</span>
            {activeCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-accent text-[10px] font-extrabold text-white">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {!connectedDevice && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 shrink-0">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Connect to a device to send direct P2P files, or generate QR Web Share links below.
            </span>
          </div>
          <button
            onClick={onNavigateToDiscovery}
            className="font-bold underline hover:text-amber-700"
          >
            Find Peers
          </button>
        </div>
      )}

      {/* Main Files View */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {activeTab === 'files' ? (
          <FileBrowser
            connectedDevice={connectedDevice}
            onWebShare={(file) => setWebShareFile(file)}
          />
        ) : (
          <TransferQueue transfers={transfers} />
        )}
      </div>

      {/* Web Share QR Code Modal */}
      {webShareFile && (
        <WebShareModal
          file={webShareFile}
          serverUrl={signalingServerUrl}
          onClose={() => setWebShareFile(null)}
        />
      )}
    </div>
  );
};
