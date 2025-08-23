/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-main': '#0D1B2A',
        'bg-panel': '#1E2A38',
        'text-primary': '#E0E1DD',
        'text-secondary': '#8D99AE',
        'accent-1': '#40916C',
        'accent-1-hover': '#52B69A',
        'accent-2': '#FFD166',
        'light-panel': '#F5F7FA',
      },
      fontFamily: {
        'montserrat': ['Montserrat', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 12px rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
};
