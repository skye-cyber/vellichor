export function formatSpeed(mbPerSec: number): string {
  if (!isFinite(mbPerSec) || mbPerSec <= 0) return '0 KB/s';
  const kbps = mbPerSec * 1024;
  if (kbps < 1) return `${(kbps * 1024).toFixed(0)} B/s`;
  if (kbps < 1024) return `${kbps.toFixed(kbps < 10 ? 1 : 0)} KB/s`;
  return `${mbPerSec.toFixed(mbPerSec < 10 ? 2 : 1)} MB/s`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

export function formatEta(seconds: number): string {
  if (!seconds || !isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
