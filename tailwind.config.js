import defaultTheme from "tailwindcss/defaultTheme";

const brandViolet = {
  50: "#f4f2ff",
  100: "#ebe4ff",
  200: "#d9cbff",
  300: "#c0a4ff",
  400: "#a472ff",
  500: "#8648ff",
  600: "#6c2ee6",
  700: "#5722bc",
  800: "#431c93",
  900: "#2d1160",
  950: "#1c0a40",
};

const surface = {
  50: "#f8f8ff",
  100: "#f1f0fb",
  200: "#deddff",
  300: "#c1c0ec",
  400: "#9492c7",
  500: "#6b6a9d",
  600: "#4f4e79",
  700: "#3d3c5f",
  800: "#2c2b46",
  900: "#1b1a2d",
  950: "#101020",
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    screens: {
      xs: "480px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1440px",
      "3xl": "1920px",
    },
    extend: {
      colors: {
        brand: brandViolet,
        surface,
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        glow: "0 30px 80px -25px rgba(134, 72, 255, 0.55)",
      },
      borderRadius: {
        xl: "1.5rem",
      },
    },
  },
  plugins: [],
};
