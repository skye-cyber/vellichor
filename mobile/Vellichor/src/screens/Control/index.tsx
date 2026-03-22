import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';

const { width } = Dimensions.get('window');
const TOUCHPAD_SIZE = width - 48;

const ControlScreen = ({ navigation, route }: any) => {
  const { device } = route.params || { device: { name: 'Unknown Device' } };
  const [mode, setMode] = useState<'touchpad' | 'keyboard' | 'media'>(
    'touchpad',
  );
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      Animated.spring(scale, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    },
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
      useNativeDriver: false,
    }),
    onPanResponderRelease: () => {
      Animated.parallel([
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    },
  });

  const renderTouchpad = () => (
    <View style={styles.touchpadContainer}>
      <Animated.View
        style={[
          styles.touchpad,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scale },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Icon name="cursor-pointer" size={32} color={theme.colors.primary} />
        <Text style={styles.touchpadHint}>Drag to move cursor</Text>
      </Animated.View>

      <View style={styles.touchpadButtons}>
        <TouchableOpacity style={styles.touchpadButton}>
          <Icon name="arrow-left" size={24} color={theme.colors.text.primary} />
          <Text style={styles.buttonLabel}>Left Click</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.touchpadButton}>
          <Icon
            name="arrow-right"
            size={24}
            color={theme.colors.text.primary}
          />
          <Text style={styles.buttonLabel}>Right Click</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderKeyboard = () => (
    <View style={styles.keyboardContainer}>
      <View style={styles.keyboardRow}>
        {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map(key => (
          <TouchableOpacity key={key} style={styles.key}>
            <Text style={styles.keyText}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.keyboardRow}>
        {['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'].map(key => (
          <TouchableOpacity key={key} style={styles.key}>
            <Text style={styles.keyText}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.keyboardRow}>
        {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map(key => (
          <TouchableOpacity key={key} style={styles.key}>
            <Text style={styles.keyText}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.keyboardRow}>
        <TouchableOpacity style={[styles.key, styles.spaceBar]}>
          <Text style={styles.keyText}>Space</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMedia = () => (
    <View style={styles.mediaContainer}>
      <View style={styles.nowPlaying}>
        <Icon name="music" size={48} color={theme.colors.primary} />
        <Text style={styles.nowPlayingTitle}>No media playing</Text>
        <Text style={styles.nowPlayingDetails}>
          Open a media app to control
        </Text>
      </View>

      <View style={styles.mediaControls}>
        <TouchableOpacity style={styles.mediaButton}>
          <Icon
            name="skip-previous"
            size={32}
            color={theme.colors.text.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.mediaButton, styles.playButton]}>
          <Icon name="play" size={40} color={theme.colors.background.primary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.mediaButton}>
          <Icon name="skip-next" size={32} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.volumeControl}>
        <Icon name="volume-low" size={24} color={theme.colors.text.secondary} />
        <View style={styles.volumeBar}>
          <View style={[styles.volumeFill, { width: '70%' }]} />
        </View>
        <Icon
          name="volume-high"
          size={24}
          color={theme.colors.text.secondary}
        />
      </View>
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
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <View style={styles.connectionStatus}>
            <View style={styles.connectionDot} />
            <Text style={styles.connectionText}>Connected</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <Icon
            name="dots-vertical"
            size={24}
            color={theme.colors.text.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.modeSelector}>
        {['touchpad', 'keyboard', 'media'].map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.modeButton, mode === m && styles.modeButtonActive]}
            onPress={() => setMode(m as any)}
          >
            <Icon
              name={
                m === 'touchpad'
                  ? 'gesture-tap'
                  : m === 'keyboard'
                  ? 'keyboard'
                  : 'music'
              }
              size={24}
              color={
                mode === m ? theme.colors.primary : theme.colors.text.secondary
              }
            />
            <Text
              style={[styles.modeText, mode === m && styles.modeTextActive]}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {mode === 'touchpad' && renderTouchpad()}
        {mode === 'keyboard' && renderKeyboard()}
        {mode === 'media' && renderMedia()}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Controlling {device.name} • {device.ip}
        </Text>
      </View>
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
  deviceInfo: {
    alignItems: 'center',
  },
  deviceName: {
    ...theme.typography.h3,
    marginBottom: 4,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success,
    marginRight: 6,
  },
  connectionText: {
    ...theme.typography.caption,
    color: theme.colors.success,
  },
  menuButton: {
    padding: 8,
    marginRight: -8,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.primary,
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: theme.borderRadius.round,
    padding: 4,
    ...theme.shadows.sm,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.round,
  },
  modeButtonActive: {
    backgroundColor: theme.colors.primary + '10',
  },
  modeText: {
    ...theme.typography.body,
    fontSize: 14,
    marginLeft: 8,
    color: theme.colors.text.secondary,
  },
  modeTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  touchpadContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchpad: {
    width: TOUCHPAD_SIZE,
    height: TOUCHPAD_SIZE,
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.md,
  },
  touchpadHint: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    marginTop: 12,
  },
  touchpadButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 16,
  },
  touchpadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.primary,
    padding: 16,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  buttonLabel: {
    ...theme.typography.caption,
    marginLeft: 8,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  key: {
    width: 32,
    height: 48,
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    ...theme.shadows.sm,
  },
  keyText: {
    ...theme.typography.body,
    fontWeight: '500',
  },
  spaceBar: {
    width: 200,
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nowPlaying: {
    alignItems: 'center',
    marginBottom: 48,
  },
  nowPlayingTitle: {
    ...theme.typography.h3,
    marginTop: 16,
    marginBottom: 4,
  },
  nowPlayingDetails: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  mediaControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  mediaButton: {
    padding: 16,
  },
  playButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.round,
    marginHorizontal: 24,
    padding: 20,
  },
  volumeControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeBar: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginHorizontal: 12,
  },
  volumeFill: {
    height: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
  },
});

export default ControlScreen;
