/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Disabled by policy: Light mode only
  content: [
    './apps/web/app/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/web/components/**/*.{js,ts,jsx,tsx,mdx}',
    './packages/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        surface: '#FFFFFF',
        'primary-text': '#172033',
        'secondary-text': '#64748B',
        brand: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        border: '#E2E8F0',
        success: '#16A34A',
        warning: '#D97706',
        error: '#DC2626',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        dropdown: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        modal: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03)',
      },
      borderRadius: {
        card: '0.75rem',
      },
    },
  },
  plugins: [],
};

