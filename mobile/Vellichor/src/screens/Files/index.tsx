import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Animated,
  //   Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';

// const { width } = Dimensions.get('window');

interface FileItem {
  id: string;
  name: string;
  size: string;
  type: 'image' | 'video' | 'document' | 'audio' | 'other';
  modified: string;
  device: string;
  status?: 'transferring' | 'completed' | 'pending';
  progress?: number;
}

const FilesScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<'local' | 'remote' | 'transfers'>(
    'local',
  );
  //   const [refreshing, setRefreshing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [files, setFiles] = useState<FileItem[]>([
    {
      id: '1',
      name: 'Vacation Photo.jpg',
      size: '3.2 MB',
      type: 'image',
      modified: '2 hours ago',
      device: 'Phone',
    },
    {
      id: '2',
      name: 'Project Presentation.pptx',
      size: '8.7 MB',
      type: 'document',
      modified: 'Yesterday',
      device: 'Laptop',
    },
    {
      id: '3',
      name: 'Conference Recording.mp4',
      size: '156 MB',
      type: 'video',
      modified: '3 days ago',
      device: 'Phone',
    },
    {
      id: '4',
      name: 'Background Music.mp3',
      size: '5.1 MB',
      type: 'audio',
      modified: 'Last week',
      device: 'Laptop',
    },
    {
      id: '5',
      name: 'Document.pdf',
      size: '1.2 MB',
      type: 'document',
      modified: '2 weeks ago',
      device: 'Phone',
    },
  ]);

  const [transfers, setTransfers] = useState<FileItem[]>([
    {
      id: 't1',
      name: 'Large Video.mp4',
      size: '450 MB',
      type: 'video',
      modified: 'In progress',
      device: 'Phone → Laptop',
      status: 'transferring',
      progress: 45,
    },
    {
      id: 't2',
      name: 'Photos.zip',
      size: '120 MB',
      type: 'document',
      modified: 'Completed',
      device: 'Laptop → Phone',
      status: 'completed',
      progress: 100,
    },
  ]);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return 'file-image';
      case 'video':
        return 'file-video';
      case 'audio':
        return 'file-music';
      case 'document':
        return 'file-document';
      default:
        return 'file';
    }
  };

  const getFileColor = (type: string) => {
    switch (type) {
      case 'image':
        return '#FF6B6B';
      case 'video':
        return '#4ECDC4';
      case 'audio':
        return '#45B7D1';
      case 'document':
        return '#96CEB4';
      default:
        return '#A8A8A8';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId],
    );
  };

  const renderFileItem = ({
    item,
    index,
  }: {
    item: FileItem;
    index: number;
  }) => {
    const isSelected = selectedFiles.includes(item.id);
    const scaleAnim = new Animated.Value(1);

    const handlePress = () => {
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      ]).start();

      if (selectedFiles.length > 0) {
        toggleFileSelection(item.id);
      } else {
        // Open file preview
        Alert.alert('Open File', `Would you like to open ${item.name}?`);
      }
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePress}
          onLongPress={() => toggleFileSelection(item.id)}
          style={[styles.fileCard, isSelected && styles.fileCardSelected]}
        >
          <View
            style={[
              styles.fileIcon,
              { backgroundColor: getFileColor(item.type) + '20' },
            ]}
          >
            <Icon
              name={getFileIcon(item.type)}
              size={32}
              color={getFileColor(item.type)}
            />
          </View>

          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.fileMeta}>
              <Text style={styles.fileSize}>{item.size}</Text>
              <Text style={styles.fileDot}>•</Text>
              <Text style={styles.fileModified}>{item.modified}</Text>
            </View>
            <Text style={styles.fileDevice}>{item.device}</Text>
          </View>

          {selectedFiles.length > 0 ? (
            <View
              style={[styles.checkbox, isSelected && styles.checkboxChecked]}
            >
              {isSelected && <Icon name="check" size={16} color="#FFF" />}
            </View>
          ) : (
            <Icon
              name="dots-vertical"
              size={24}
              color={theme.colors.text.secondary}
            />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderTransferItem = ({ item }: { item: FileItem }) => (
    <View style={styles.transferCard}>
      <View style={styles.transferHeader}>
        <View
          style={[
            styles.fileIcon,
            { backgroundColor: getFileColor(item.type) + '20' },
          ]}
        >
          <Icon
            name={getFileIcon(item.type)}
            size={24}
            color={getFileColor(item.type)}
          />
        </View>
        <View style={styles.transferInfo}>
          <Text style={styles.transferName}>{item.name}</Text>
          <Text style={styles.transferMeta}>
            {item.size} • {item.device}
          </Text>
        </View>
        <View
          style={[
            styles.transferStatus,
            {
              backgroundColor:
                item.status === 'completed'
                  ? theme.colors.success + '20'
                  : theme.colors.warning + '20',
            },
          ]}
        >
          <Text
            style={[
              styles.transferStatusText,
              {
                color:
                  item.status === 'completed'
                    ? theme.colors.success
                    : theme.colors.warning,
              },
            ]}
          >
            {item.status === 'completed' ? '✓' : '↻'} {item.status}
          </Text>
        </View>
      </View>

      {item.status === 'transferring' && item.progress && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
          <Text style={styles.progressText}>{item.progress}%</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Files</Text>
        {selectedFiles.length > 0 ? (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton}>
              <Icon name="share" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Icon name="delete" size={24} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.headerButton}>
            <Icon name="magnify" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabBar}>
        {['local', 'remote', 'transfers'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {tab === 'transfers' && transfers.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{transfers.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'local' && (
        <FlatList
          data={files}
          renderItem={renderFileItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.storageHeader}>
              <View style={styles.storageInfo}>
                <Icon name="database" size={20} color={theme.colors.primary} />
                <Text style={styles.storageText}>Phone Storage</Text>
              </View>
              <View style={styles.storageBar}>
                <View style={[styles.storageUsed, { width: '45%' }]} />
              </View>
              <Text style={styles.storageDetails}>45.2 GB used of 128 GB</Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {selectedFiles.length} selected
              </Text>
            </View>
          }
        />
      )}

      {activeTab === 'remote' && (
        <View style={styles.remoteContainer}>
          <Icon name="devices" size={64} color={theme.colors.primary} />
          <Text style={styles.remoteTitle}>Remote Devices</Text>
          <Text style={styles.remoteText}>
            Connect to a device to browse its files
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() => navigation.navigate('Discovery')}
          >
            <Icon name="wifi" size={20} color="#FFF" />
            <Text style={styles.connectButtonText}>Find Devices</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'transfers' && (
        <FlatList
          data={transfers}
          renderItem={renderTransferItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.primary,
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: theme.borderRadius.round,
    padding: 4,
    ...theme.shadows.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.round,
  },
  activeTab: {
    backgroundColor: theme.colors.primary + '10',
  },
  tabText: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  list: {
    padding: 24,
    paddingTop: 16,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.sm,
  },
  fileCardSelected: {
    backgroundColor: theme.colors.primary + '08',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    ...theme.typography.body,
    fontWeight: '500',
    marginBottom: 4,
  },
  fileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  fileSize: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  fileDot: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    marginHorizontal: 6,
  },
  fileModified: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  fileDevice: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    fontSize: 11,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.text.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  storageHeader: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows.sm,
  },
  storageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  storageText: {
    ...theme.typography.body,
    fontWeight: '500',
    marginLeft: 8,
  },
  storageBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    marginBottom: 8,
  },
  storageUsed: {
    height: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  storageDetails: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  remoteContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  remoteTitle: {
    ...theme.typography.h2,
    marginTop: 24,
    marginBottom: 8,
  },
  remoteText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.round,
    ...theme.shadows.md,
  },
  connectButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  transferCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.sm,
  },
  transferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transferInfo: {
    flex: 1,
    marginLeft: 12,
  },
  transferName: {
    ...theme.typography.body,
    fontWeight: '500',
    marginBottom: 2,
  },
  transferMeta: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  transferStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  transferStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  progressContainer: {
    marginTop: 12,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    position: 'relative',
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressText: {
    position: 'absolute',
    right: 0,
    top: -18,
    fontSize: 10,
    color: theme.colors.text.secondary,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
});

export default FilesScreen;
