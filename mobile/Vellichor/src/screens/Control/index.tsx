import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  PanResponder,
  Animated,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';
import { styles } from './styles';

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
    <View style={styles.keyboardInputWrapper}>
      <View style={styles.keyboardInputBox}>
        <TextInput style={styles.keyboardTextInput} placeholder='Type text'/>
      </View>
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

export default ControlScreen;
