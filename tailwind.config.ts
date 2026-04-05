import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#060816",
        surface: "#0b1120",
        panel: "#101827",
        accent: "#35D7FF",
        accentMuted: "#72839B",
        slate: "#72839B",
        success: "#16C784",
        amber: "#FFB84D",
        danger: "#FF5D73",
        text: "#F4F7FF"
      },
      boxShadow: {
        "panel": "0 20px 60px rgba(4, 6, 12, 0.65)"
      }
    }
  },
  plugins: []
};

export default config;
