import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Animated,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';

interface Device {
  id: string;
  name: string;
  type: 'phone' | 'laptop' | 'tablet';
  platform: 'android' | 'ios' | 'windows' | 'macos' | 'linux';
  status: 'online' | 'offline' | 'busy';
  ip: string;
  signalStrength: number;
  lastSeen: string;
}

const DiscoveryScreen = ({ navigation }: any) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scanAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startScan();
    return () => stopScan();
  }, []);

  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      scanAnim.setValue(1);
    }
  }, [isScanning]);

  const startScan = () => {
    setIsScanning(true);
    // Simulate device discovery
    setTimeout(() => {
      const mockDevices: Device[] = [
        {
          id: '1',
          name: "Skye's Laptop",
          type: 'laptop',
          platform: 'linux',
          status: 'online',
          ip: '192.168.1.105',
          signalStrength: 95,
          lastSeen: 'now',
        },
        {
          id: '2',
          name: 'Office PC',
          type: 'laptop',
          platform: 'windows',
          status: 'busy',
          ip: '192.168.1.120',
          signalStrength: 70,
          lastSeen: '2 min ago',
        },
        {
          id: '3',
          name: 'Living Room Tablet',
          type: 'tablet',
          platform: 'android',
          status: 'online',
          ip: '192.168.1.150',
          signalStrength: 40,
          lastSeen: 'now',
        },
      ];
      setDevices(mockDevices);
      setIsScanning(false);
    }, 3000);
  };

  const stopScan = () => {
    setIsScanning(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    startScan();
    setTimeout(() => setRefreshing(false), 3000);
  };

  const getDeviceIcon = (type: string, platform: string) => {
    if (type === 'laptop') return 'laptop';
    if (type === 'tablet') return 'tablet';
    if (platform === 'android') return 'cellphone-android';
    if (platform === 'ios') return 'cellphone-iphone';
    return 'cellphone';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return theme.colors.success;
      case 'busy':
        return theme.colors.warning;
      default:
        return theme.colors.text.muted;
    }
  };

  const renderDevice = ({ item, index }: { item: Device; index: number }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Control', { device: item })}
        >
          <View style={styles.deviceCard}>
            <View
              style={[
                styles.deviceIcon,
                { backgroundColor: `${theme.colors.primary}10` },
              ]}
            >
              <Icon
                name={getDeviceIcon(item.type, item.platform)}
                size={32}
                color={theme.colors.primary}
              />
            </View>

            <View style={styles.deviceInfo}>
              <View style={styles.deviceHeader}>
                <Text style={styles.deviceName}>{item.name}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(item.status) + '20' },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(item.status) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(item.status) },
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.deviceDetails}>
                {item.ip} · {item.platform} · {item.signalStrength}% signal
              </Text>
              <Text style={styles.lastSeen}>Last seen: {item.lastSeen}</Text>
            </View>

            <Icon
              name="chevron-right"
              size={24}
              color={theme.colors.text.secondary}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device Discovery</Text>
        <TouchableOpacity onPress={startScan} disabled={isScanning}>
          <Animated.View style={{ transform: [{ scale: scanAnim }] }}>
            <Icon
              name="refresh"
              size={24}
              color={
                isScanning ? theme.colors.primary : theme.colors.text.secondary
              }
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <View style={styles.scanInfo}>
        <Icon name="wifi-marker" size={20} color={theme.colors.primary} />
        <Text style={styles.scanText}>
          {isScanning
            ? 'Scanning for devices on your network...'
            : `Found ${devices.length} device${
                devices.length !== 1 ? 's' : ''
              }`}
        </Text>
        {isScanning && (
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            style={styles.scanLoader}
          />
        )}
      </View>

      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="devices" size={64} color={theme.colors.text.muted} />
            <Text style={styles.emptyTitle}>No Devices Found</Text>
            <Text style={styles.emptyText}>
              {isScanning
                ? 'Scanning your network...'
                : 'Tap the refresh icon to start scanning for devices'}
            </Text>
          </View>
        }
      />
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
  scanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 8,
    padding: 16,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  scanText: {
    ...theme.typography.body,
    flex: 1,
    marginLeft: 12,
  },
  scanLoader: {
    marginLeft: 12,
  },
  list: {
    padding: 24,
    paddingTop: 8,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.sm,
  },
  deviceIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    ...theme.typography.h3,
    fontSize: 16,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.round,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  deviceDetails: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  lastSeen: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    ...theme.typography.h3,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
});

export default DiscoveryScreen;
