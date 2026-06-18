/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          petroleo: '#0F4C5C',
          turquesa: '#14B8A6',
          white: '#FFFFFF',
          lightGray: '#F5F7FA',
          darkGray: '#374151',
        },
        primary: {
          50: '#effbf9',
          100: '#d7f4ef',
          200: '#afe9df',
          300: '#7ad9c8',
          400: '#44c4ac',
          500: '#21b49b',
          600: '#14B8A6',
          700: '#0e9387',
          800: '#0f716a',
          900: '#0F4C5C',
          950: '#082f38',
        },
        slate: {
          950: '#0F172A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '1' },
          '70%': { transform: 'scale(1.15)', opacity: '0' },
          '100%': { transform: 'scale(1.15)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
