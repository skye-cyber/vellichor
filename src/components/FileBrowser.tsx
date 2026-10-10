import React, { useState } from 'react';
import {
  Upload,
  File,
  FileText,
  FileCode,
  Image,
  Music,
  Video,
  Archive,
  Send,
  Share2,
  Trash2,
  Plus,
} from 'lucide-react';
import { TransferFile, Device } from '../types';
import { FileTransferService } from '../services/FileTransferService';

interface FileBrowserProps {
  connectedDevice: Device | null;
  onWebShare: (file: TransferFile) => void;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
  connectedDevice,
  onWebShare,
}) => {
  const [localFiles, setLocalFiles] = useState<TransferFile[]>([
    {
      id: 'demo-1',
      name: 'Project_Design_Mockups.fig',
      size: 14.8 * 1024 * 1024,
      type: 'application/octet-stream',
    },
    {
      id: 'demo-2',
      name: 'Vellichor_Architecture_Diagram.svg',
      size: 420 * 1024,
      type: 'image/svg+xml',
    },
    {
      id: 'demo-3',
      name: 'System_Logs_2026.log',
      size: 85 * 1024,
      type: 'text/plain',
    },
  ]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (name: string, type: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(ext || '')) return Image;
    if (['mp3', 'wav', 'flac'].includes(ext || '')) return Music;
    if (['mp4', 'mkv', 'mov'].includes(ext || '')) return Video;
    if (['zip', 'tar', 'gz', '7z'].includes(ext || '')) return Archive;
    if (['ts', 'js', 'json', 'rs', 'py'].includes(ext || '')) return FileCode;
    return FileText;
  };

  const handlePick = async () => {
    const picked = await FileTransferService.pickFile();
    if (picked) {
      setLocalFiles((prev) => [picked, ...prev]);
      setSelectedIds(new Set([picked.id]));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSendSelected = async () => {
    if (!connectedDevice) return;
    const filesToSend = localFiles.filter((f) => selectedIds.has(f.id));
    for (const f of filesToSend) {
      await FileTransferService.sendFile(f, connectedDevice.id, connectedDevice.name);
    }
    setSelectedIds(new Set());
  };

  return (
    <div className="flex-1 flex flex-col space-y-4">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePick}
            className="px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center space-x-1.5 shadow-balanced transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Select Local Files</span>
          </button>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center space-x-2 animate-fade-in">
            <span className="text-xs text-gray-500 font-semibold px-2">
              {selectedIds.size} selected
            </span>

            {connectedDevice && (
              <button
                onClick={handleSendSelected}
                className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary-hover text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send to {connectedDevice.name}</span>
              </button>
            )}

            <button
              onClick={() => {
                const first = localFiles.find((f) => selectedIds.has(f.id));
                if (first) onWebShare(first);
              }}
              className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Web Share</span>
            </button>
          </div>
        )}
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto space-y-2.5">
        {localFiles.map((file) => {
          const Icon = getFileIcon(file.name, file.type);
          const isSelected = selectedIds.has(file.id);

          return (
            <div
              key={file.id}
              onClick={() => toggleSelect(file.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between bg-white dark:bg-vellichor-card ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/20 shadow-sm'
                  : 'border-gray-200 dark:border-vellichor-border hover:border-gray-300 dark:hover:border-vellichor-border/80'
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="w-4 h-4 accent-primary rounded cursor-pointer shrink-0"
                />
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {file.name}
                  </h4>
                  <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1 shrink-0 ml-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onWebShare(file);
                  }}
                  title="Share link"
                  className="p-2 rounded-xl text-gray-400 hover:text-accent hover:bg-accent/10 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocalFiles((prev) => prev.filter((f) => f.id !== file.id));
                  }}
                  title="Remove from list"
                  className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
