/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.html", // public klasöründeki tüm html dosyaları
    "./src/**/*.{js,jsx,ts,tsx}", // src klasöründeki js dosyaları
  ],
  theme: {
    extend: {},
  },
  plugins: [require("@tailwindcss/forms")],
};
