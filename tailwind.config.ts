/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  prefix: '',
  plugins: [],

  // adjust the dark mode selector to include data-theme which is what Payload
  // https://payloadcms.com/blog/how-to-setup-tailwindcss-and-shadcn-ui-in-payload
  darkMode: ['selector', '[data-theme="dark"]', '.dark'],
};
