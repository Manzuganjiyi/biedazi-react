/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        editor: '#FAF9F6',
        'editor-text': '#2C2C2C',
        'editor-secondary': '#6B6B6B',
        'editor-ghost': 'rgba(44, 44, 44, 0.4)',
        'editor-accent': '#4A4A4A',
        'editor-border': '#E0E0E0',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      lineHeight: {
        'editor': '1.8',
      },
      maxWidth: {
        'editor': '720px',
      },
      transitionDuration: {
        '400': '400ms',
      },
      animation: {
        'spin-slow': 'spin 1s linear infinite',
        'paint-right': 'paintRight 1.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'paint-bottom': 'paintBottom 1.6s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'paint-right-rev': 'paintRightRev 0.5s ease-out forwards',
        'paint-bottom-rev': 'paintBottomRev 0.5s ease-out forwards',
        'shimmer': 'shimmer 1.2s ease-out forwards',
      },
      keyframes: {
        paintRight: {
          '0%': { width: '0', opacity: '0' },
          '10%': { opacity: '0.9' },
          '35%': { width: '45%', opacity: '0.95' },
          '70%': { width: '82%', opacity: '0.98' },
          '100%': { width: '100%', opacity: '1' },
        },
        paintBottom: {
          '0%': { height: '0', opacity: '0' },
          '10%': { opacity: '0.9' },
          '35%': { height: '45%', opacity: '0.95' },
          '70%': { height: '82%', opacity: '0.98' },
          '100%': { height: '100%', opacity: '1' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-150%)', opacity: '0' },
          '15%': { opacity: '0.8' },
          '75%': { opacity: '0.9' },
          '100%': { transform: 'translateX(450%)', opacity: '0' },
        },
        paintRightRev: {
          '0%': { width: '100%', opacity: '1' },
          '100%': { width: '0', opacity: '0' },
        },
        paintBottomRev: {
          '0%': { height: '100%', opacity: '1' },
          '100%': { height: '0', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
