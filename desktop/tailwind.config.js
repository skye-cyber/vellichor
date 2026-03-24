/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class' /*'[data-mode="dark"]'],*/,
  content: ['*.html', 'src/**/**.jsx', 'src/**/**.tsx'],
  theme: {
    screens: {
      sxs: '256px',
      xs: '384px',
      sm: '512px', //previously 640px
      md: '768px',
      sd: '896px',
      lg: '1024px',
      '2lg': '1152px',
      xl: '1280px',
      '2xl': '1536px',
    },
    fontFamily: {
      display: ['Source Serif Pro', 'Georgia', 'serif'],
      body: ['Synonym', 'system-ui', 'sans-serif'],
      sans: ['"Inter", sans-serif'],
    },
    extend: {
      boxShadow: {
        'balanced-sm':
          '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        balanced:
          '0 2px 6px 0 rgba(0, 0, 0, 0.1), 0 1px 3px 0 rgba(0, 0, 0, 0.08)',
        'balanced-md':
          '0 4px 12px 0 rgba(0, 0, 0, 0.1), 0 2px 6px 0 rgba(0, 0, 0, 0.08)',
        'balanced-lg':
          '0 8px 24px 0 rgba(0, 0, 0, 0.1), 0 4px 12px 0 rgba(0, 0, 0, 0.08)',
        'balanced-xl':
          '0 12px 36px 0 rgba(0, 0, 0, 0.1), 0 6px 18px 0 rgba(0, 0, 0, 0.08)',
        'balanced-2xl':
          '0 24px 48px 0 rgba(0, 0, 0, 0.1), 0 12px 24px 0 rgba(0, 0, 0, 0.08)',

        // Even more balanced (centered)
        'centered-sm': '0 0 3px 0 rgba(0, 0, 0, 0.1)',
        centered: '0 0 6px 0 rgba(0, 0, 0, 0.1)',
        'centered-md': '0 0 12px 0 rgba(0, 0, 0, 0.1)',
        'centered-lg': '0 0 24px 0 rgba(0, 0, 0, 0.1)',
        'centered-xl': '0 0 36px 0 rgba(0, 0, 0, 0.15)',

        // Soft balanced shadows
        soft: '0 2px 8px rgba(0, 0, 0, 0.08)',
        'soft-md': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'soft-lg': '0 8px 32px rgba(0, 0, 0, 0.1)',
      },
      fontSize: {
        h1: '36',
        h2: '2rem',
        h3: '1.75rem',
        h4: '1.5rem',
        h5: '1.25rem',
        h6: '1rem',
      },
      fontWeight: {
        h1: '700',
        h2: '600',
        h3: '500',
        h4: '400',
        h5: '300',
        h6: '200',
      },
      zIndex: {
        1: '1',
        5: '5',
        10: '10',
        15: '15',
        20: '20',
        25: '25',
        30: '30',
        35: '35',
        40: '40',
        41: '41',
        45: '45',
        51: '51',
      },
      animation: {
        bounce: 'bounce 0.5s infinite',
        'bounce-100': 'bounce 0.5s 100ms infinite',
        'bounce-200': 'bounce 0.5s 200ms infinite',
        'bounce-300': 'bounce 0.5s 300ms infinite',
        'bounce-400': 'bounce 0.5s 400ms infinite',
        'bounce-500': 'bounce 0.5s 500ms infinite',
        'bounce-600': 'bounce 0.5s 600ms infinite',
        heartpulse: 'heartpulse 1s infinite',
        spin: 'spin 2s linear infinite',
        'spin-200': 'spin 0.5s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        gradient: 'gradient 15s ease infinite',
      },

      keyframes: {
        bounce: {
          '0%': { opacity: 1 },
          '50%': { opacity: 0.5 },
          '100%': { opacity: 1 },
        },
        heartpulse: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },

        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        gradient: {
          '0%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
          '100%': { 'background-position': '0% 50%' },
        },
      },
      backgroundSize: {
        '300%': '300%',
      },
    },
    /*gradientColorStops: {
                *          'gradient-primary': '#00b4d8',
                *          'gradient-secondary': '#00ffcc',
},*/
  },
  plugins: [
    function ({ addUtilities }) {
      const newUtilities = {
        '.text-glow': {
          'text-shadow':
            '0 0 10px rgba(129, 140, 248, 0.6), 0 0 20px rgba(129, 140, 248, 0.3)',
        },
        '.text-glow-sm': {
          'text-shadow': '0 0 5px rgba(129, 140, 248, 0.5)',
        },
        '.text-glow-lg': {
          'text-shadow':
            '0 0 15px rgba(129, 140, 248, 0.8), 0 0 30px rgba(129, 140, 248, 0.4)',
        },
      };

      addUtilities(newUtilities, ['responsive', 'hover']);
    },
  ],
};
