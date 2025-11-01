/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,vue}',
    './node_modules/naive-ui/dist/*.css'
  ],
  theme: {
    extend: {
      colors: {
        grok: '#FF6B6B',
        claude: '#4ECDC4',
        chatgpt: '#1A56DB',
        gemini: '#845EF7'
      }
    }
  },
  plugins: []
};
