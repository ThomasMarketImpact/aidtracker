/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#005F73',
          50: '#F0FDFF',
          100: '#CCFBFF',
          200: '#99F6FF',
          300: '#60EBFF',
          400: '#22D3EE',
          500: '#0891B2',
          600: '#0E7490',
          700: '#005F73',
          800: '#164E63',
          900: '#0C4A6E'
        },
        secondary: {
          DEFAULT: '#0A9396',
          50: '#F0FDFF',
          500: '#0A9396',
          600: '#0891B2'
        },
        accent: {
          DEFAULT: '#94D2BD',
          300: '#94D2BD',
          400: '#7BCCC4'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};
