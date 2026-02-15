/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B9FE8',
          hover: '#2B7BC8',
          light: '#6BC5F5',
          dark: '#2B7BC8',
        },
        secondary: {
          DEFAULT: '#5DD5D5',
          hover: '#4DC5C5',
        },
        accent: '#FFD166',
        success: '#7BE495',
        background: {
          light: '#F8FAFC',
          dark: '#0B1120',
        },
        card: {
          light: '#FFFFFF',
          dark: '#151E2F',
        },
        text: {
          // Full names: text-text-main-light / text-text-main-dark
          main: {
            light: '#1E293B',
            dark: '#FFFFFF',
          },
          // Short aliases: text-text-light / text-text-dark
          light: '#1E293B',
          dark: '#FFFFFF',
          muted: {
            light: '#64748B',
            dark: '#E2E8F0',
          },
        },
        border: {
          light: '#E2E8F0',
          dark: '#1E2D45',
        },
        'input-bg': {
          light: '#FFFFFF',
          dark: '#151E2F',
        },
      },
      fontFamily: {
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        'lg': '1rem',
        'xl': '1.5rem',
        '2xl': '2rem',
        '3xl': '2.5rem',
      },
      boxShadow: {
        'soft': '0 8px 32px rgba(59, 159, 232, 0.1)',
        'soft-dark': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'glow': '0 0 20px rgba(59, 159, 232, 0.3)',
        'card-dark': '0 4px 20px rgba(0, 0, 0, 0.25)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #6BC5F5 0%, #3B9FE8 50%, #2B7BC8 100%)',
        'gradient-soft': 'linear-gradient(135deg, rgba(107, 197, 245, 0.1) 0%, rgba(59, 159, 232, 0.1) 100%)',
        'gradient-dark': 'linear-gradient(135deg, #0B1120 0%, #111B2E 50%, #0F1728 100%)',
      },
    },
  },
  plugins: [],
}
