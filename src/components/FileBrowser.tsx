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
  const [localFiles, setLocalFiles] = useState<TransferFile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (name: string, _type: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext || '')) return Image;
    if (['mp3', 'wav', 'flac', 'aac'].includes(ext || '')) return Music;
    if (['mp4', 'mkv', 'mov', 'webm'].includes(ext || '')) return Video;
    if (['zip', 'tar', 'gz', '7z', 'rar'].includes(ext || '')) return Archive;
    if (['ts', 'js', 'json', 'rs', 'py', 'c', 'cpp', 'html', 'css'].includes(ext || '')) return FileCode;
    return FileText;
  };

  const handlePick = async () => {
    const pickedFiles = await FileTransferService.pickFiles();
    if (pickedFiles.length > 0) {
      setLocalFiles((prev) => [...pickedFiles, ...prev]);
      const newIds = new Set(selectedIds);
      pickedFiles.forEach((p) => newIds.add(p.id));
      setSelectedIds(newIds);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const dropped: TransferFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        dropped.push({
          id: `file-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          rawFile: file,
        });
      }
      setLocalFiles((prev) => [...dropped, ...prev]);
      const newIds = new Set(selectedIds);
      dropped.forEach((d) => newIds.add(d.id));
      setSelectedIds(newIds);
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

  const handleSendSingle = async (file: TransferFile) => {
    if (!connectedDevice) return;
    await FileTransferService.sendFile(file, connectedDevice.id, connectedDevice.name);
  };

  const handleRemove = (id: string) => {
    setLocalFiles((prev) => prev.filter((f) => f.id !== id));
    const next = new Set(selectedIds);
    next.delete(id);
    setSelectedIds(next);
  };

  return (
    <div
      className="flex-1 flex flex-col space-y-4"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay Indicator */}
      {isDragging && (
        <div className="p-6 rounded-3xl border-2 border-dashed border-primary bg-primary/10 flex flex-col items-center justify-center text-primary text-center animate-pulse">
          <Upload className="w-8 h-8 mb-2" />
          <span className="text-sm font-bold">Drop files here to stage for transfer</span>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePick}
            className="px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center space-x-1.5 shadow-balanced transition-all cursor-pointer"
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
                className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary-hover text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
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
              className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
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
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                isSelected
                  ? 'bg-primary/5 dark:bg-primary/10 border-primary shadow-sm'
                  : 'bg-white dark:bg-vellichor-card border-gray-200 dark:border-vellichor-border hover:border-gray-300 dark:hover:border-vellichor-border/80'
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-vellichor-surface text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {file.name}
                  </h4>
                  <div className="flex items-center space-x-2 text-[11px] text-gray-500 font-mono mt-0.5">
                    <span>{formatBytes(file.size)}</span>
                    <span>•</span>
                    <span className="uppercase">{file.name.split('.').pop() || 'FILE'}</span>
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div
                className="flex items-center space-x-1.5 shrink-0 ml-2"
                onClick={(e) => e.stopPropagation()}
              >
                {connectedDevice && (
                  <button
                    onClick={() => handleSendSingle(file)}
                    title={`Send directly to ${connectedDevice.name}`}
                    className="p-2 rounded-xl text-gray-400 hover:text-secondary hover:bg-secondary/10 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => onWebShare(file)}
                  title="Share via Local Web Link / QR"
                  className="p-2 rounded-xl text-gray-400 hover:text-accent hover:bg-accent/10 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleRemove(file.id)}
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
