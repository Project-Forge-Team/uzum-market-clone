/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // <-- ВАЖНО: именно этот плагин для v4
  },
};

export default config;