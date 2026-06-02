import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    screens: {
      xs: "375px",
      sm: "576px",
      md: "768px",
      lg: "992px",
      xl: "1280px",
      "2xl": "1920px"
    },
    extend: {
      colors: {
        qidra: {
          dark: "var(--qidra-dark)",
          white: "var(--qidra-white)",
          accent: "var(--qidra-accent)",
          accent80: "var(--qidra-accent-80)",
          accent8: "var(--qidra-accent-8)",
          accentLight: "var(--qidra-accent-light)",
          grayBlueDark: "var(--qidra-gray-blue-dark)",
          grayBlue: "var(--qidra-gray-blue)",
          grayMedium: "var(--qidra-gray-medium)",
          grayLight: "var(--qidra-gray-light)",
          red: "var(--qidra-red)",
          green: "var(--qidra-green)",
          gold: "var(--qidra-gold)",
          forest: "var(--qidra-forest)"
        }
      },
      borderRadius: {
        qidra: "8px"
      },
      boxShadow: {
        qidra: "0 18px 50px rgba(19, 24, 38, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
