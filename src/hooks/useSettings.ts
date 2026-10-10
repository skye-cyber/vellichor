import { useState, useEffect, useCallback } from 'react';
import { SettingsService } from '../services/SettingsService';
import { AppSettings, CacheInfo, ConnectionHistory } from '../types';

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(SettingsService.getSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo>({
    sizeBytes: 0,
    filesCount: 0,
    lastCleared: 'Never',
  });
  const [history, setHistory] = useState<ConnectionHistory[]>([]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      await SettingsService.initialize();
      setSettings(SettingsService.getSettings());
      const cache = await SettingsService.getCacheInfo();
      setCacheInfo(cache);
      const hist = await SettingsService.getConnectionHistory();
      setHistory(hist);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const unsub = SettingsService.subscribe((s) => setSettings(s));
    return unsub;
  }, [loadAll]);

  const updateSetting = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    try {
      setSaving(true);
      const updated = await SettingsService.updateSettings({ [key]: value });
      setSettings(updated);
    } finally {
      setSaving(false);
    }
  }, []);

  const resetToDefaults = useCallback(async () => {
    try {
      setSaving(true);
      const def = await SettingsService.resetToDefaults();
      setSettings(def);
    } finally {
      setSaving(false);
    }
  }, []);

  const clearCache = useCallback(async () => {
    await SettingsService.clearCache();
    const refreshed = await SettingsService.getCacheInfo();
    setCacheInfo(refreshed);
  }, []);

  const clearHistory = useCallback(async () => {
    await SettingsService.clearConnectionHistory();
    setHistory([]);
  }, []);

  const exportSettings = useCallback(async () => {
    return await SettingsService.exportSettings();
  }, []);

  const importSettings = useCallback(async (json: string) => {
    await SettingsService.importSettings(json);
    await loadAll();
  }, [loadAll]);

  return {
    settings,
    loading,
    saving,
    cacheInfo,
    history,
    updateSetting,
    resetToDefaults,
    clearCache,
    clearHistory,
    exportSettings,
    importSettings,
    reload: loadAll,
  };
};
