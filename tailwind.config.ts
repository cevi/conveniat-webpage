/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors';

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  prefix: '',
  plugins: [],

  theme: {
    fontFamily: {
      heading: ['Montserrat', 'Helvetica', 'Arial', 'sans-serif'],
      body: ['Inter', 'Helvetica', 'Arial', 'sans-serif'],
    },

    fontSize: {
      sm: ['16px', '28px'],
      base: ['20px', '28px'],
      lg: ['24px', '32px'],
      xl: ['26px', '42px'],
      cite: ['24px', '28px'],
    },

    colors: {
      'conveniat-text': '#6d6e76',

      'conveniat-green': {
        100: '#e7e8e7',
        200: '#cad1d0',
        300: '#b8bdba',
        400: '#3d5b5a',
        500: '#47564c',
        600: '#3a4a40',
      },

      'cevi-blue': {
        300: '#406eab',
        500: '#003D8F',
      },

      'cevi-red': {
        300: '#E94065',
        500: '#E20031',
      },

      // colors used in the backend
      green: colors.green,
      red: colors.red,
      amber: colors.amber,
      gray: colors.gray,
      white: colors.white,
    },
  },

  // adjust the dark mode selector to include data-theme which is what Payload
  // https://payloadcms.com/blog/how-to-setup-tailwindcss-and-shadcn-ui-in-payload
  darkMode: ['selector', '[data-theme="dark"]', '.dark'],
};
