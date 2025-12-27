/** @type {import('tailwindcss').Config} */
import twAnimate from 'tailwindcss-animate';
import colors from 'tailwindcss/colors';

// eslint-disable-next-line unicorn/prefer-module
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  prefix: '',
  plugins: [twAnimate],

  theme: {
    extend: {
      keyframes: {
        loading: {
          '0%': { left: '-50%', width: '50%' },
          '50%': { left: '25%', width: '75%' },
          '100%': { left: '100%', width: '50%' },
        },
      },
      animation: {
        loading: 'loading 1.5s ease-in-out infinite',
      },
    },
    fontFamily: {
      heading: ['Montserrat', 'Helvetica', 'Arial', 'sans-serif'],
      body: ['Inter', 'Helvetica', 'Arial', 'sans-serif'],
    },

    colors: {
      gray: {
        50: '#F5F5F6',
        100: '#E6E6E7',
        200: '#CFD0D2',
        300: '#ADAEB3',
        400: '#84858C',
        500: '#6D6E76',
        600: '#595961',
        700: '#4C4D52',
        800: '#434347',
        900: '#3B3B3E',
        950: '#252627',
      },

      green: {
        50: '#F6F7F6',
        100: '#E1E6E2',
        200: '#C2CDC5',
        300: '#9CACA0',
        400: '#778a7d',
        500: '#5D6F63',
        600: '#47564C',
        700: '#3D4841',
        800: '#333C36',
        900: '#2D342F',
        950: '#171C19',
      },

      'conveniat-green': '#47564C',

      red: {
        50: '#FFF1F1',
        100: '#FFE4E4',
        200: '#FECDD0',
        300: '#FDA4A9',
        400: '#FB717C',
        500: '#F43F53',
        600: '#E11D3C',
        700: '#C41333',
        800: '#9F1230',
        900: '#881330',
        950: '#4C0514',
      },

      'cevi-red': '#C41333',

      blue: {
        50: '#EFF3FE',
        100: '#E1EAFE',
        200: '#CAD7FB',
        300: '#A9BDF8',
        400: '#8698F3',
        500: '#6A75EA',
        600: '#4D4FDE',
        700: '#403FC3',
        800: '#323394',
        900: '#32347D',
        950: '#1D1D49',
      },

      'cevi-blue': '#323394',

      white: colors.white,

      orange: {
        500: '#FFA500',
      },
    },
  },
};
