import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Premium organic brand palette - Light green organic theme
        primary: {
          50: '#A8D5BA', // Soft green for badges (was #f0f9f4)
          100: '#A8D5BA', // Soft green for badges (was #dcf2e3)
          200: '#bce4ca',
          300: '#8fcea8',
          400: '#5ab07f',
          500: '#4CAF50', // Main accent color
          600: '#45a049', // Slightly darker for hover states
          700: '#3d8f41',
          800: '#357e39',
          900: '#2d6d31', // Dark green text for badges
          950: '#1e4a21',
        },
        // Soft accent green
        'soft-green': {
          DEFAULT: '#A8D5BA',
          50: '#f0f9f4',
          100: '#e8f5ed',
          200: '#d1ebe0',
          300: '#a8d5ba',
          400: '#7fbf94',
          500: '#5aa973',
        },
        // Organic background colors
        organic: {
          bg: '#F7FBF8', // Primary background
          'bg-alt': '#F4FAF6', // Alternative background
        },
        accent: {
          50: '#fef7ed',
          100: '#fdecd4',
          200: '#fbd6a8',
          300: '#f8b871',
          400: '#f49338',
          500: '#f17511',
          600: '#e25a07',
          700: '#bb4509',
          800: '#95370f',
          900: '#783010',
          950: '#411706',
        },
        neutral: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-out-cubic': 'cubic-bezier(0.33, 1, 0.68, 1)',
      },
    },
  },
  plugins: [],
}

export default config

