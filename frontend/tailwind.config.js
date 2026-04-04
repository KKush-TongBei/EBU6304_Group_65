/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Outfit", "system-ui", "sans-serif"],
      },
      colors: {
        ink: { 950: "#0c1222", 900: "#121a2b", 700: "#2d3a52", 500: "#5c6b8a" },
        accent: { DEFAULT: "#3b82f6", dim: "#2563eb" },
        surface: { DEFAULT: "#f1f5f9", card: "#ffffff" },
      },
      boxShadow: {
        soft: "0 4px 24px -4px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
};
