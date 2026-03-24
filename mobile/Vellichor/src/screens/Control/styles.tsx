import { StyleSheet, Dimensions } from 'react-native';
import { theme } from '../../theme';

const { width } = Dimensions.get('window');
const TOUCHPAD_SIZE = width - 48;

export const styles = StyleSheet.create({
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
    keyboardInputWrapper: {
        flex: 1,
        //       justifyContent: 'center',
    },
    keyboardContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    keyboardInputBox: {
        padding: 2,
//         borderWidth: 2,
        height: "20%",
        borderRadius: 10
    },
    keyboardTextInput: {
        height: '100%',
        color: '#222',
        outlineWidth: 2,
        borderRadius: 10,
        outlineColor: "#222",
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
