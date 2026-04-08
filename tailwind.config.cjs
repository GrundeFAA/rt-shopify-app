/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/routes/dashboard.tsx",
    "./app/modules/dashboard/**/*.{ts,tsx,css}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
