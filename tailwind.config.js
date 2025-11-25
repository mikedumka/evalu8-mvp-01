import { fontFamily } from "tailwindcss/defaultTheme";

const spacingScale = {
  px: "1px",
  0: "0px",
  0.5: "calc(var(--spacing) * 0.5)",
  1: "calc(var(--spacing) * 1)",
  1.5: "calc(var(--spacing) * 1.5)",
  2: "calc(var(--spacing) * 2)",
  2.5: "calc(var(--spacing) * 2.5)",
  3: "calc(var(--spacing) * 3)",
  3.5: "calc(var(--spacing) * 3.5)",
  4: "calc(var(--spacing) * 4)",
  5: "calc(var(--spacing) * 5)",
  6: "calc(var(--spacing) * 6)",
  7: "calc(var(--spacing) * 7)",
  8: "calc(var(--spacing) * 8)",
  9: "calc(var(--spacing) * 9)",
  10: "calc(var(--spacing) * 10)",
  11: "calc(var(--spacing) * 11)",
  12: "calc(var(--spacing) * 12)",
  14: "calc(var(--spacing) * 14)",
  16: "calc(var(--spacing) * 16)",
  20: "calc(var(--spacing) * 20)",
  24: "calc(var(--spacing) * 24)",
  28: "calc(var(--spacing) * 28)",
  32: "calc(var(--spacing) * 32)",
  36: "calc(var(--spacing) * 36)",
  40: "calc(var(--spacing) * 40)",
  44: "calc(var(--spacing) * 44)",
  48: "calc(var(--spacing) * 48)",
  52: "calc(var(--spacing) * 52)",
  56: "calc(var(--spacing) * 56)",
  60: "calc(var(--spacing) * 60)",
  64: "calc(var(--spacing) * 64)",
  72: "calc(var(--spacing) * 72)",
  80: "calc(var(--spacing) * 80)",
  96: "calc(var(--spacing) * 96)",
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
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
        sans: ["var(--font-sans)", ...fontFamily.sans],
        heading: ["var(--font-heading)", ...fontFamily.sans],
        mono: ["var(--font-mono)", ...fontFamily.mono],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: spacingScale,
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
