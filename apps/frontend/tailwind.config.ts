import type { Config } from 'tailwindcss';
import sharedConfig from '../../packages/config/tailwind/index';

const config: Config = {
  ...sharedConfig,
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        yc: {
          bg: '#F5F5EE',
          'bg-alt': '#FAFAF7',
          'bg-card': '#F8F7F2',
          text: '#1C1C1C',
          'text-secondary': '#333333',
          'text-muted': '#666666',
          accent: '#FF6600',
          'accent-hover': '#E55C00',
          border: '#E5E2D9',
        },
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)'
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)'
        },
        border: 'var(--border)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Fraunces', 'serif'],
        'display-alt': ['Libre Baskerville', 'serif'],
      },
      maxWidth: {
        '8xl': '1400px',
      },
    },
  },
};

export default config;
