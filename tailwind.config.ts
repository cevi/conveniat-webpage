/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  prefix: '',
  theme: {},
  plugins: [],
  darkMode: ['selector', '[data-theme="dark"]', '.dark'],
}
