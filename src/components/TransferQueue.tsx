import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Pause,
  Play,
  X,
  CheckCircle2,
  AlertTriangle,
  File,
} from 'lucide-react';
import { Transfer } from '../types';
import { FileTransferService } from '../services/FileTransferService';

interface TransferQueueProps {
  transfers: Transfer[];
}

export const TransferQueue: React.FC<TransferQueueProps> = ({ transfers }) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (transfers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-vellichor-card flex items-center justify-center text-gray-400">
          <File className="w-8 h-8 opacity-40" />
        </div>
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          No Active Transfers
        </h4>
        <p className="text-xs text-gray-500 max-w-xs">
          Files sent to or received from connected peers will appear here with live speed and chunk tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-3">
      {transfers.map((item) => {
        const isSending = item.direction === 'send';
        const isCompleted = item.status === 'completed';
        const isFailed = item.status === 'failed';
        const isPaused = item.status === 'paused';

        return (
          <div
            key={item.id}
            className="p-4 rounded-3xl bg-white dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 truncate">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isSending
                      ? 'bg-primary/10 text-primary'
                      : 'bg-secondary/10 text-secondary'
                  }`}
                >
                  {isSending ? (
                    <ArrowUpRight className="w-5 h-5" />
                  ) : (
                    <ArrowDownLeft className="w-5 h-5" />
                  )}
                </div>
                <div className="truncate">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {item.file.name}
                  </h4>
                  <div className="flex items-center space-x-2 text-[11px] text-gray-500 font-mono mt-0.5">
                    <span>{formatBytes(item.file.size)}</span>
                    <span>•</span>
                    <span className="capitalize">{item.direction}ing</span>
                    {item.peerName && (
                      <>
                        <span>•</span>
                        <span>{item.peerName}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center space-x-2 shrink-0 ml-2">
                {isCompleted ? (
                  <span className="flex items-center space-x-1 text-xs font-semibold text-secondary px-2.5 py-1 rounded-full bg-secondary/10">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Done</span>
                  </span>
                ) : isFailed ? (
                  <span className="flex items-center space-x-1 text-xs font-semibold text-red-500 px-2.5 py-1 rounded-full bg-red-500/10">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Failed</span>
                  </span>
                ) : (
                  <>
                    <span className="text-xs font-mono font-bold text-primary">
                      {item.speedMb} MB/s
                    </span>
                    <button
                      onClick={() => FileTransferService.togglePause(item.id)}
                      className="p-1.5 rounded-xl bg-gray-100 dark:bg-vellichor-surface text-gray-600 dark:text-gray-300 hover:text-primary transition-colors"
                    >
                      {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => FileTransferService.cancelTransfer(item.id)}
                      className="p-1.5 rounded-xl bg-gray-100 dark:bg-vellichor-surface text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-vellichor-surface overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isCompleted
                      ? 'bg-secondary'
                      : isFailed
                      ? 'bg-red-500'
                      : 'bg-primary'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>
                  {item.currentChunk || 0} / {item.totalChunks || 1} chunks (64KB)
                </span>
                <span>{item.progress}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
