import tailwindcssAnimate from "tailwindcss-animate";
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          // Brand gold: backgrounds, borders and decoration (not small text on white)
          DEFAULT: "#C4A35A",
          light: "#E9DDC1",
          // Readable gold for text on white (contrast 4.6:1)
          dark: "#8A6D2F",
        },
        // Warm palette
        ivory: "#FBF7F2",
        champagne: "#F5ECDF",
        blush: {
          DEFAULT: "#F3E4DE",
          light: "#F9F1EE",
        },
        rose: {
          DEFAULT: "#C9998A",
          dark: "#8E5E51", // text on light backgrounds (contrast 5.3:1 on white)
        },
        // Warm neutrals (replace Tailwind's cool greys)
        taupe: {
          100: "#F4EFEB",
          200: "#E8DFD8",
          300: "#D3C6BD",
          400: "#A3958C", // decorative only (strike-through prices, disabled)
          500: "#76655C", // secondary text, AA on white/blush/champagne
          600: "#5F4F47",
          700: "#473A34",
        },
        cocoa: {
          DEFAULT: "#33241F",
          light: "#4A3832",
        },
        brand: {
          black: "#000000",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "Times New Roman", "serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
