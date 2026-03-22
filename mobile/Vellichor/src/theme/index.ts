export const theme = {
  colors: {
    // Primary colors
    primary: '#6C5CE7', // Soft purple
    secondary: '#00B894', // Mint green
    accent: '#FD79A8', // Pink

    // Backgrounds
    background: {
      primary: '#FFFFFF',
      secondary: '#F8F9FA',
      tertiary: '#F1F3F5',
      dark: '#1A1B1E',
    },

    // Text
    text: {
      primary: '#2D3436',
      secondary: '#636E72',
      inverse: '#FFFFFF',
      muted: '#B2BEC3',
    },

    // Status
    success: '#00B894',
    warning: '#FDCB6E',
    error: '#D63031',
    info: '#0984E3',

    // UI Elements
    card: '#FFFFFF',
    border: '#DFE6E9',
    shadow: '#000000',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
    },
    caption: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
      color: '#636E72',
    },
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 999,
  },

  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  animation: {
    spring: {
      damping: 15,
      mass: 1,
      stiffness: 150,
    },
    timing: {
      duration: 300,
      easing: 'easeInOut',
    },
  },
};

export type Theme = typeof theme;
