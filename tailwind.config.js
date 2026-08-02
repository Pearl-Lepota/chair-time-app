/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F5F0E6',
        paper2: '#EBE2CE',
        ink: '#262019',
        ink60: 'rgba(38,32,25,0.62)',
        ink40: 'rgba(38,32,25,0.4)',
        green: { DEFAULT: '#2F4A3C', dark: '#1E2F27', soft: '#DCE5DD' },
        brass: { DEFAULT: '#B8863B', soft: '#F1E3C6' },
        rose: { DEFAULT: '#B4485F', soft: '#F3DEE2' },
        line: '#DCD1B9',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
