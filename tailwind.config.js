/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        hand: ['"Gochi Hand"', 'cursive'],
        inter: ['"Inter"', "sans-serif"],
        cherry: ['"Cherry Bomb One"', 'system-ui']
      }
    },
  },
  plugins: [],
};
