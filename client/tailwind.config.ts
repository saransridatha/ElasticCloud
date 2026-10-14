/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // AWS Squid Ink palette
        'squid': {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#16202c',
          950: '#0d1117',
        },
        'aws': {
          orange: '#ff9900',
          'orange-hover': '#ec7211',
          'orange-dark': '#eb5f07',
          blue: '#232f3e',
          'blue-dark': '#1b2838',
          'blue-light': '#2e3f51',
          teal: '#00a1c9',
          green: '#1a8b5b',
          red: '#d13212',
          yellow: '#f2c744',
        },
        'console': {
          'bg': 'var(--console-bg)',
          'surface': 'var(--console-surface)',
          'surface-alt': 'var(--console-surface-alt)',
          'border': 'var(--console-border)',
          'text': 'var(--console-text)',
          'text-secondary': 'var(--console-text-secondary)',
          'text-muted': 'var(--console-text-muted)',
        },
      },
      fontFamily: {
        sans: ['Amazon Ember', 'Helvetica Neue', 'Roboto', 'Arial', 'sans-serif'],
        mono: ['Source Code Pro', 'Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
