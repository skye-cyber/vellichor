import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSettings } from '../../hooks/useSettings';
import { SettingsService } from '../../services/SettingsService';
import { SectionHeader } from '../../components/Settings/SectionHeader';
import { ToggleSetting } from '../../components/Settings/ToggleSetting';
import { SelectSetting } from '../../components/Settings/SelectSetting';
import { theme } from '../../theme';

const SettingsScreen = ({ navigation }: any) => {
  const {
    settings,
    loading,
    saving,
    error,
    updateSetting,
    resetToDefaults,
    exportSettings,
    importSettings,
  } = useSettings();

  const [cacheInfo, setCacheInfo] = useState({
    size: 0,
    files: 0,
    lastCleared: '',
  });
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    loadCacheInfo();
    loadHistoryCount();
  }, []);

  const loadCacheInfo = async () => {
    const info = await SettingsService.getCacheInfo();
    setCacheInfo(info);
  };

  const loadHistoryCount = async () => {
    const history = await SettingsService.getConnectionHistory();
    setHistoryCount(history.length);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      `This will clear ${formatBytes(
        cacheInfo.size,
      )} of temporary files. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await SettingsService.clearCache();
              await loadCacheInfo();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ],
    );
  };

  const handleExportSettings = async () => {
    try {
      const exported = await exportSettings();
      if (exported) {
        // Share the exported settings
        Alert.alert('Export Successful', 'Settings copied to clipboard');
        // Here you could also use Share API to share the file
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export settings');
    }
  };

  const handleImportSettings = () => {
    // This would typically open a file picker
    Alert.alert('Import Settings', 'Paste your settings JSON', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Import',
        onPress: async () => {
          // For demo, using mock data
          try {
            await importSettings('{"settings":{}}');
            Alert.alert('Success', 'Settings imported successfully');
          } catch (error) {
            Alert.alert('Error', 'Invalid settings format');
          }
        },
      },
    ]);
  };

  const handleResetAll = () => {
    Alert.alert(
      'Reset All Settings',
      'This will restore all settings to default values. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetToDefaults();
            Alert.alert('Success', 'Settings reset to defaults');
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity
          onPress={handleExportSettings}
          style={styles.headerButton}
        >
          <Icon name="export" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Icon name="alert" size={20} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Connection Section */}
        <View style={styles.section}>
          <SectionHeader
            title="Connection"
            icon="wifi"
            showReset
            onReset={() => updateSetting('autoConnect', true)}
          />
          <View style={styles.sectionContent}>
            <ToggleSetting
              icon="wifi-auto"
              label="Auto-connect"
              description="Automatically connect to known devices"
              value={settings.autoConnect}
              onValueChange={value => updateSetting('autoConnect', value)}
            />

            <SelectSetting
              icon="wifi-marker"
              label="Discovery Mode"
              description="How devices are discovered"
              value={settings.discoveryMode}
              options={[
                {
                  label: 'All Networks',
                  value: 'all',
                  description: 'Discover on any network',
                },
                {
                  label: 'Saved Only',
                  value: 'saved',
                  description: 'Only previously connected',
                },
                {
                  label: 'Manual Only',
                  value: 'manual',
                  description: 'Manually add devices',
                },
              ]}
              onValueChange={value =>
                updateSetting('discoveryMode', value as any)
              }
            />

            <SelectSetting
              icon="quality-high"
              label="Stream Quality"
              description="Balance between quality and performance"
              value={settings.streamQuality}
              options={[
                {
                  label: 'Balanced',
                  value: 'balanced',
                  description: 'Quality & performance balanced',
                },
                {
                  label: 'High Performance',
                  value: 'performance',
                  description: 'Prioritize smoothness',
                },
                {
                  label: 'Battery Saver',
                  value: 'battery',
                  description: 'Reduce power usage',
                },
              ]}
              onValueChange={value =>
                updateSetting('streamQuality', value as any)
              }
            />
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <SectionHeader title="Privacy & Security" icon="lock" />
          <View style={styles.sectionContent}>
            <ToggleSetting
              icon="lock"
              label="End-to-end encryption"
              description="All data is encrypted between devices"
              value={settings.encryption}
              onValueChange={value => updateSetting('encryption', value)}
              warning="Turning off reduces security"
            />

            <ToggleSetting
              icon="handshake"
              label="Require pairing confirmation"
              description="Confirm each new device connection"
              value={settings.requirePairing}
              onValueChange={value => updateSetting('requirePairing', value)}
            />

            <ToggleSetting
              icon="history"
              label="Save connection history"
              description={`Keep record of past connections (${historyCount} saved)`}
              value={settings.saveHistory}
              onValueChange={async value => {
                await updateSetting('saveHistory', value);
                if (!value) {
                  // Clear history when disabled
                  await SettingsService.clearConnectionHistory();
                  setHistoryCount(0);
                }
              }}
            />
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <SectionHeader title="Appearance" icon="palette" />
          <View style={styles.sectionContent}>
            <SelectSetting
              icon="theme-light-dark"
              label="Theme"
              value={settings.theme}
              options={[
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
                {
                  label: 'System',
                  value: 'system',
                  description: 'Follow system setting',
                },
              ]}
              onValueChange={value => updateSetting('theme', value as any)}
            />

            <ToggleSetting
              icon="animation"
              label="Reduce animations"
              description="Minimize motion effects"
              value={settings.reduceAnimations}
              onValueChange={value => updateSetting('reduceAnimations', value)}
            />

            <ToggleSetting
              icon="view-compact"
              label="Compact view"
              description="Show more items on screen"
              value={settings.compactView}
              onValueChange={value => updateSetting('compactView', value)}
            />
          </View>
        </View>

        {/* Performance Section */}
        <View style={styles.section}>
          <SectionHeader title="Performance" icon="speedometer" />
          <View style={styles.sectionContent}>
            <SelectSetting
              icon="video"
              label="Resolution"
              value={settings.resolution}
              options={[
                {
                  label: '720p (HD)',
                  value: '720p',
                  description: 'Good for most connections',
                },
                {
                  label: '1080p (Full HD)',
                  value: '1080p',
                  description: 'Requires strong WiFi',
                },
                {
                  label: 'Original',
                  value: 'original',
                  description: 'Device native resolution',
                },
              ]}
              onValueChange={value => updateSetting('resolution', value as any)}
            />

            <SelectSetting
              icon="refresh"
              label="Frame Rate"
              value={String(settings.maxFrameRate)}
              options={[
                {
                  label: '30 FPS',
                  value: '30',
                  description: 'Smooth, balanced',
                },
                {
                  label: '60 FPS',
                  value: '60',
                  description: 'Very smooth, more power',
                },
              ]}
              onValueChange={value =>
                updateSetting('maxFrameRate', parseInt(value, 2) as 30 | 60)
              }
            />

            <ToggleSetting
              icon="chip"
              label="Hardware acceleration"
              description="Use GPU for encoding/decoding"
              value={settings.hardwareAcceleration}
              onValueChange={value =>
                updateSetting('hardwareAcceleration', value)
              }
            />

            <ToggleSetting
              icon="sleep"
              label="Keep awake"
              description="Prevent screen from sleeping"
              value={settings.keepAwake}
              onValueChange={value => updateSetting('keepAwake', value)}
              warning="May increase battery usage"
            />
          </View>
        </View>

        {/* Storage Section */}
        <View style={styles.section}>
          <SectionHeader title="Storage" icon="database" />
          <View style={styles.sectionContent}>
            <View style={styles.infoItem}>
              <Icon name="cache" size={24} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Cache size</Text>
                <Text style={styles.infoValue}>
                  {formatBytes(cacheInfo.size)}
                </Text>
                <Text style={styles.infoDetail}>{cacheInfo.files} files</Text>
              </View>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleClearCache}
              >
                <Text style={styles.actionButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>

            <ToggleSetting
              icon="download-multiple"
              label="Auto-download"
              description="Automatically save received files"
              value={settings.autoDownload}
              onValueChange={value => updateSetting('autoDownload', value)}
            />

            <View style={styles.infoItem}>
              <Icon name="folder" size={24} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Download folder</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {settings.downloadPath}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Advanced Section */}
        <View style={styles.section}>
          <SectionHeader title="Advanced" icon="tools" />
          <View style={styles.sectionContent}>
            <ToggleSetting
              icon="bug"
              label="Debug mode"
              description="Enable detailed logging"
              value={settings.enableDebug}
              onValueChange={value => updateSetting('enableDebug', value)}
              warning="May affect performance"
            />

            <SelectSetting
              icon="format-list-bulleted"
              label="Log level"
              value={settings.logLevel}
              options={[
                { label: 'Error', value: 'error' },
                { label: 'Warning', value: 'warn' },
                { label: 'Info', value: 'info' },
                { label: 'Debug', value: 'debug' },
              ]}
              onValueChange={value => updateSetting('logLevel', value as any)}
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <SectionHeader title="Data Management" icon="database-export" />
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleExportSettings}
            >
              <Icon name="export" size={32} color={theme.colors.primary} />
              <Text style={styles.actionCardTitle}>Export</Text>
              <Text style={styles.actionCardDescription}>
                Save your settings to a file
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleImportSettings}
            >
              <Icon name="import" size={32} color={theme.colors.primary} />
              <Text style={styles.actionCardTitle}>Import</Text>
              <Text style={styles.actionCardDescription}>
                Restore settings from backup
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, styles.resetCard]}
              onPress={handleResetAll}
            >
              <Icon name="restore" size={32} color={theme.colors.error} />
              <Text style={[styles.actionCardTitle, styles.resetText]}>
                Reset All
              </Text>
              <Text style={[styles.actionCardDescription, styles.resetText]}>
                Restore to factory defaults
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Icon name="heart" size={16} color={theme.colors.error} />
          <Text style={styles.footerText}>Vellichor v0.1.0</Text>
          <Text style={styles.copyright}>© 2024</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: theme.colors.background.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...theme.shadows.sm,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    ...theme.typography.h2,
    fontSize: 20,
  },
  headerButton: {
    padding: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error + '10',
    marginHorizontal: 24,
    marginTop: 16,
    padding: 12,
    borderRadius: theme.borderRadius.md,
  },
  errorText: {
    color: theme.colors.error,
    marginLeft: 8,
    flex: 1,
  },
  savingOverlay: {
    position: 'absolute',
    top: 100,
    right: 24,
    backgroundColor: theme.colors.background.primary,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: theme.borderRadius.round,
    ...theme.shadows.md,
    zIndex: 1000,
  },
  savingText: {
    marginLeft: 8,
    color: theme.colors.text.primary,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionContent: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  infoDetail: {
    fontSize: 12,
    color: theme.colors.text.muted,
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.round,
  },
  actionButtonText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionCard: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    ...theme.shadows.sm,
  },
  resetCard: {
    width: '100%',
    backgroundColor: theme.colors.error + '05',
    borderWidth: 1,
    borderColor: theme.colors.error + '20',
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 12,
    marginBottom: 4,
  },
  actionCardDescription: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  resetText: {
    color: theme.colors.error,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  footerText: {
    ...theme.typography.body,
    color: theme.colors.text.muted,
    marginTop: 8,
    marginBottom: 4,
  },
  copyright: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
  },
});

export default SettingsScreen;
