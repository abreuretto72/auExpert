import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0D0E16',
          deep: '#08090F',
          card: '#161826',
        },
        border: {
          DEFAULT: '#2A2D3E',
        },
        text: {
          DEFAULT: '#F0EDF5',
          muted: '#A89FB5',
          dim: '#6B6478',
        },
        ametista: '#8F7FA8',
        jade: '#4FA89E',
        warning: '#D4A574',
        danger: '#C2645E',
        success: '#7FA886',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
