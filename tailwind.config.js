/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./styles/**/*.{css}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4CAF50",
        secondary: "#6FCF97",
        darktext: "#2F3437",
        muted: "#DADDDD",
        offwhite: "#F7F7F5"
      }
    }
  },
  plugins: []
}
