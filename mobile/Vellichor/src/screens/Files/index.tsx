import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Alert,
    //   Animated,
    Modal,
    //   TextInput,
    //   Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import QRCode from 'react-native-qrcode-svg';
import { theme } from '../../theme';
import { FileTransferService, Transfer } from '../../services/FileTransferService';
import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';
import Share from 'react-native-share';
import { styles } from './styles';


const FilesScreen = ({ navigation }: any) => {
    const [activeTab, setActiveTab] = useState<'local' | 'remote' | 'transfers'>('local');
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [files, setFiles] = useState<any[]>([]); // Will be populated from local storage
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [webShareModalVisible, setWebShareModalVisible] = useState(false);
    const [webShareUrl, setWebShareUrl] = useState('');
    const [localFile, setLocalFile] = useState<any>(null);

    useEffect(() => {
        loadLocalFiles();
        const unsubscribe = FileTransferService.subscribe((newTransfers) => {
            setTransfers(newTransfers);
        });
        return unsubscribe;
    }, []);

    const loadLocalFiles = async () => {
        // List files from device directories
        const documentsPath = RNFS.DocumentDirectoryPath;
        const files = await RNFS.readDir(documentsPath);
        setFiles(files.map(f => ({
            id: f.path,
            name: f.name,
            size: f.size,
            type: f.isDirectory() ? 'folder' : 'file',
            modified: new Date(f.mtime).toLocaleString(),
            uri: f.path,
            device: 'Phone',
        })));
    };

    const handlePickFile = async () => {
        try {
            const file = await FileTransferService.pickFile();
            if (file) {
                setLocalFile(file);
                // Optionally start transfer
                Alert.alert('File Selected', file.name, [
                    { text: 'Cancel' },
                    { text: 'Send to Device', onPress: () => startSendToDevice(file) },
                    { text: 'Share via Web', onPress: () => startWebShare(file) },
                ]);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to pick file');
        }
    };

    const startSendToDevice = async (file: any) => {
        // Assuming we have a connected peer
        const peerId = '...'; // Get from connection manager
        await FileTransferService.sendFile(file, peerId);
    };

    const startWebShare = async (file: any) => {
        // Generate unique ID and create shareable URL
        const shareId = Date.now().toString();
        const url = `https://your-signaling-server.com/share/${shareId}`;
        setWebShareUrl(url);
        setWebShareModalVisible(true);
    };

    const renderTransferItem = ({ item }: { item: Transfer }) => (
        <View style={styles.transferCard}>
            <View style={styles.transferHeader}>
                <View style={[styles.fileIcon, { backgroundColor: '#96CEB4' + '20' }]}>
                    <Icon name="file" size={24} color="#96CEB4" />
                </View>
                <View style={styles.transferInfo}>
                    <Text style={styles.transferName}>{item.file.name}</Text>
                    <Text style={styles.transferMeta}>
                        {item.file.size} • {item.direction === 'send' ? 'Sending' : 'Receiving'}
                    </Text>
                </View>
                <View style={[
                    styles.transferStatus,
                    {
                        backgroundColor: item.status === 'completed' ? theme.colors.success + '20' :
                            item.status === 'failed' ? theme.colors.error + '20' : theme.colors.warning + '20'
                    }
                ]}>
                    <Text style={[styles.transferStatusText, {
                        color: item.status === 'completed' ? theme.colors.success :
                            item.status === 'failed' ? theme.colors.error : theme.colors.warning
                    }]}>
                        {item.status === 'completed' ? '✓' : item.status === 'failed' ? '✗' : '↻'} {item.status}
                    </Text>
                </View>
            </View>
            {item.status === 'transferring' && (
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${item.progress}%` }]} />
                    <Text style={styles.progressText}>{Math.round(item.progress)}%</Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header remains same, but add Share button */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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

                <Text style={styles.headerTitle}>Files</Text>
                <TouchableOpacity onPress={handlePickFile} style={styles.headerButton}>
                    <Icon name="plus" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Tab Bar */}
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
            </View>]

            {/* Local files list - now using real files */}
            {activeTab === 'local' && (
                <FlatList
                    data={files}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.fileCard} onPress={() => {/* open file */ }}>
                            <Icon name="file" size={32} color="#96CEB4" />
                            <View style={styles.fileInfo}>
                                <Text style={styles.fileName}>{item.name}</Text>
                                <Text style={styles.fileMeta}>{item.size} B • {item.modified}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    keyExtractor={item => item.id}
                    ListHeaderComponent={
                        <TouchableOpacity style={styles.pickButton} onPress={handlePickFile}>
                            <Icon name="folder-open" size={20} color="#FFF" />
                            <Text style={styles.pickButtonText}>Pick a file to share</Text>
                        </TouchableOpacity>
                    }
                />
            )}

            {/* Remote tab */}
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

            {/* Transfers tab */}
            {activeTab === 'transfers' && (
                <FlatList
                    data={transfers}
                    renderItem={renderTransferItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                />
            )}

            {/* Web Share Modal */}
            <Modal
                visible={webShareModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setWebShareModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Web Share</Text>
                            <TouchableOpacity onPress={() => setWebShareModalVisible(false)}>
                                <Icon name="close" size={24} color={theme.colors.text.primary} />
                            </TouchableOpacity>
                        </View>
                        <QRCode value={webShareUrl} size={200} />
                        <Text style={styles.webUrl}>{webShareUrl}</Text>
                        <TouchableOpacity style={styles.copyButton} onPress={() => {
                            // Copy to clipboard
                            Share.open({ message: webShareUrl });
                        }}>
                            <Icon name="content-copy" size={20} color="#FFF" />
                            <Text style={styles.copyButtonText}>Copy Link</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};


export default FilesScreen;
