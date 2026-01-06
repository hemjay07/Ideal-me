/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        dark: {
          bg: '#0a0a0a',
          surface: '#111111',
          border: '#222222',
          text: '#e5e5e5',
          muted: '#888888',
        }
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}
