/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#059467", // Emerald Green
        "secondary": "#334155", // Slate Blue
        "background-light": "#F8FAFC",
        "background-dark": "#0f231d",
      },
      fontFamily: {
        "display": ["Manrope", "sans-serif"]
      },
      borderRadius: { "DEFAULT": "0.5rem", "lg": "1rem", "xl": "1.5rem", "full": "9999px" },
    },
  },
  plugins: [],
}
