/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette: white / black / gold / blush pink / light grey.
        // Token names below are historical (from earlier design passes) but
        // now map to this palette — e.g. "green" renders as black, "brass"
        // renders as gold. Renamed the values, not every class name, to
        // avoid touching every file.
        paper: '#FFFFFF',           // main background — white
        paper2: '#EDEDEA',          // secondary background — light grey
        ink: '#171310',             // primary text — near-black
        ink60: 'rgba(23,19,16,0.62)',
        ink40: 'rgba(23,19,16,0.42)',
        green: { DEFAULT: '#171310', dark: '#000000', soft: '#F6EEDA' }, // "primary" = black, soft = pale gold highlight
        brass: { DEFAULT: '#C9A227', soft: '#F3E6C2' },  // gold
        rose: { DEFAULT: '#D98CA5', soft: '#FBE4EC' },   // blush pink
        line: '#E2DFD9',            // borders — light grey
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
