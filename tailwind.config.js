/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './contexts/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        aws: {
          orange: '#FF9900',
          'orange-dark': '#EC7211',
          'squid-ink': '#232F3E',
          anchor: '#161E2D',
          blue: '#146EB4',
          'blue-dark': '#0F5A94',
          white: '#FFFFFF',
          'gray-100': '#F2F3F3',
          'gray-200': '#EAEDED',
          'gray-400': '#AAB7B8',
          'gray-600': '#545B64',
          'gray-900': '#16191F',
          success: '#1D8102',
          error: '#D13212',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
