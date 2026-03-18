/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        mono: ['"Space Mono"', 'monospace'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#e6fbff',
          100: '#ccf7ff',
          200: '#99efff',
          300: '#66e7ff',
          400: '#33dfff',
          500: '#00d4ff',
          600: '#00aacb',
          700: '#007f99',
          800: '#005566',
          900: '#002a33',
        },
        dark: {
          bg:     '#080b0f',
          card:   '#0e1117',
          border: '#1a2030',
          muted:  '#2a3045',
        },
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-ring': 'pulseRing 2s ease-out infinite',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        pulseRing: {
          '0%':   { transform: 'scale(0.95)', opacity: '0.8' },
          '70%':  { transform: 'scale(1.05)', opacity: '0.2' },
          '100%': { transform: 'scale(1.05)', opacity: '0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          from: { boxShadow: '0 0 20px rgba(0, 212, 255, 0.2)' },
          to:   { boxShadow: '0 0 40px rgba(0, 212, 255, 0.5)' },
        },
      },
    },
  },
  plugins: [],
};
