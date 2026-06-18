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
          50: '#eff4ff',
          100: '#dbe6fe',
          200: '#bfd0fe',
          300: '#93b0fd',
          400: '#6085fa',
          500: '#3b5ff6',
          600: '#1B4FD8',
          700: '#1a3fb8',
          800: '#1b3695',
          900: '#1c2f75',
          950: '#141f4d',
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
