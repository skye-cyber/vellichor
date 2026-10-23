import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, QrCode } from 'lucide-react';
import { TransferFile } from '../types';

interface WebShareModalProps {
  file: TransferFile | null;
  serverUrl?: string;
  onClose: () => void;
}

export const WebShareModal: React.FC<WebShareModalProps> = ({
  file,
  serverUrl = 'http://localhost:3000',
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  if (!file) return null;

  const shareUrl = `${serverUrl}/share/${file.id}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate simple stylized SVG QR matrix placeholder
  const renderQrSvg = () => {
    return (
      <svg
        viewBox="0 0 160 160"
        className="w-44 h-44 mx-auto p-2 bg-white rounded-2xl shadow-inner border border-gray-200"
      >
        <rect width="160" height="160" fill="#FFFFFF" />
        {/* Corner 1 */}
        <rect x="10" y="10" width="40" height="40" fill="#6C5CE7" rx="6" />
        <rect x="18" y="18" width="24" height="24" fill="#FFFFFF" rx="3" />
        <rect x="24" y="24" width="12" height="12" fill="#6C5CE7" rx="2" />

        {/* Corner 2 */}
        <rect x="110" y="10" width="40" height="40" fill="#6C5CE7" rx="6" />
        <rect x="118" y="18" width="24" height="24" fill="#FFFFFF" rx="3" />
        <rect x="124" y="24" width="12" height="12" fill="#6C5CE7" rx="2" />

        {/* Corner 3 */}
        <rect x="10" y="110" width="40" height="40" fill="#6C5CE7" rx="6" />
        <rect x="18" y="118" width="24" height="24" fill="#FFFFFF" rx="3" />
        <rect x="24" y="124" width="12" height="12" fill="#6C5CE7" rx="2" />

        {/* Dynamic Pattern Elements */}
        <rect x="60" y="20" width="12" height="12" fill="#222" rx="2" />
        <rect x="80" y="20" width="16" height="10" fill="#222" rx="2" />
        <rect x="60" y="45" width="20" height="12" fill="#222" rx="2" />
        <rect x="90" y="40" width="10" height="20" fill="#222" rx="2" />

        <rect x="20" y="65" width="14" height="14" fill="#222" rx="2" />
        <rect x="40" y="70" width="20" height="12" fill="#222" rx="2" />
        <rect x="70" y="65" width="24" height="24" fill="#6C5CE7" rx="4" />
        <rect x="100" y="70" width="18" height="14" fill="#222" rx="2" />
        <rect x="130" y="65" width="14" height="18" fill="#222" rx="2" />

        <rect x="60" y="100" width="16" height="16" fill="#222" rx="2" />
        <rect x="85" y="110" width="18" height="12" fill="#222" rx="2" />
        <rect x="110" y="105" width="14" height="24" fill="#222" rx="2" />
        <rect x="130" y="125" width="16" height="16" fill="#6C5CE7" rx="3" />
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white dark:bg-vellichor-surface border border-gray-200 dark:border-vellichor-border rounded-3xl p-6 shadow-2xl space-y-6 text-center">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-primary font-bold text-sm">
            <QrCode className="w-4 h-4" />
            <span>Instant Web Share</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-vellichor-card text-gray-400 hover:text-gray-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code */}
        <div>{renderQrSvg()}</div>

        <div>
          <h4 className="font-bold text-base text-gray-900 dark:text-white truncate">
            {file.name}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Scan QR code or open link on any mobile or desktop browser on this network.
          </p>
        </div>

        {/* Copy Link Input Bar */}
        <div className="flex items-center space-x-2 p-2 rounded-2xl bg-gray-50 dark:bg-vellichor-card border border-gray-200 dark:border-vellichor-border">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 bg-transparent px-2 text-xs font-mono text-gray-700 dark:text-gray-300 focus:outline-none truncate"
          />
          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all ${
              copied
                ? 'bg-secondary text-white'
                : 'bg-primary text-white hover:bg-primary-hover shadow-sm'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
