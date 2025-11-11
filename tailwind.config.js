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
  darkMode: ["class"],
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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        brand: brandViolet,
        surface,
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
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
