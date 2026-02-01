import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
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
        cyan: {
          DEFAULT: "hsl(185 100% 50%)",
          50: "hsl(185 100% 95%)",
          100: "hsl(185 100% 85%)",
          200: "hsl(185 100% 75%)",
          300: "hsl(185 100% 65%)",
          400: "hsl(185 100% 55%)",
          500: "hsl(185 100% 50%)",
          600: "hsl(185 100% 40%)",
          700: "hsl(185 100% 30%)",
          800: "hsl(185 100% 20%)",
          900: "hsl(185 100% 10%)",
        },
        violet: {
          DEFAULT: "hsl(270 70% 60%)",
          50: "hsl(270 70% 95%)",
          100: "hsl(270 70% 85%)",
          200: "hsl(270 70% 75%)",
          300: "hsl(270 70% 65%)",
          400: "hsl(270 70% 60%)",
          500: "hsl(270 70% 50%)",
          600: "hsl(270 70% 40%)",
          700: "hsl(270 70% 30%)",
          800: "hsl(270 70% 20%)",
          900: "hsl(270 70% 10%)",
        },
        navy: {
          DEFAULT: "hsl(222 47% 8%)",
          50: "hsl(222 47% 95%)",
          100: "hsl(222 47% 85%)",
          200: "hsl(222 47% 70%)",
          300: "hsl(222 47% 50%)",
          400: "hsl(222 47% 30%)",
          500: "hsl(222 47% 20%)",
          600: "hsl(222 47% 15%)",
          700: "hsl(222 47% 10%)",
          800: "hsl(222 47% 8%)",
          900: "hsl(222 47% 5%)",
        },
        community: {
          DEFAULT: "hsl(var(--community))",
          foreground: "hsl(var(--community-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.9", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.02)" },
        },
        glow: {
          "0%, 100%": { opacity: "0.8" },
          "50%": { opacity: "1" },
        },
        "line-draw": {
          "0%": { width: "0", opacity: "0" },
          "10%": { opacity: "1" },
          "100%": { width: "100%", opacity: "1" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.8s ease-out forwards",
        "fade-out": "fade-out 0.5s ease-out forwards",
        "scale-in": "scale-in 0.5s ease-out",
        breathe: "breathe 4s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite",
        "line-draw": "line-draw 1.5s ease-out forwards",
        "gradient-shift": "gradient-shift 15s ease infinite",
        float: "float 6s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
