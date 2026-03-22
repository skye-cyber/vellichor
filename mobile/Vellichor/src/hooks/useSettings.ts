import { useState, useEffect, useCallback } from 'react';
import { SettingsService, AppSettings } from '../services/SettingsService';

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(
    SettingsService.getSettings(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();

    // Subscribe to settings changes
    const unsubscribe = SettingsService.subscribe(newSettings => {
      setSettings(newSettings);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      await SettingsService.initialize();
      setSettings(SettingsService.getSettings());
      setError(null);
    } catch (err) {
      setError('Failed to load settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      try {
        setSaving(true);
        const updated = await SettingsService.updateSettings({ [key]: value });
        setSettings(updated);
        setError(null);
      } catch (err) {
        setError(`Failed to update ${key}`);
        console.error(err);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const updateMultipleSettings = useCallback(
    async (updates: Partial<AppSettings>) => {
      try {
        setSaving(true);
        const updated = await SettingsService.updateSettings(updates);
        setSettings(updated);
        setError(null);
      } catch (err) {
        setError('Failed to update settings');
        console.error(err);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const resetToDefaults = useCallback(async () => {
    try {
      setSaving(true);
      const defaults = await SettingsService.resetToDefaults();
      setSettings(defaults);
      setError(null);
    } catch (err) {
      setError('Failed to reset settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, []);

  const exportSettings = useCallback(async () => {
    try {
      return await SettingsService.exportSettings();
    } catch (err) {
      setError('Failed to export settings');
      console.error(err);
      return null;
    }
  }, []);

  const importSettings = useCallback(async (settingsJson: string) => {
    try {
      setSaving(true);
      await SettingsService.importSettings(settingsJson);
      await loadSettings(); // Reload all settings
      setError(null);
    } catch (err) {
      setError('Failed to import settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    settings,
    loading,
    saving,
    error,
    updateSetting,
    updateMultipleSettings,
    resetToDefaults,
    exportSettings,
    importSettings,
    reloadSettings: loadSettings,
  };
};
