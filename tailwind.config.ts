import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        fidelidade: {
          red: "#E30613",
          darkred: "#B8050F",
          black: "#1A1A1A",
          dark: "#121212",
          gray: "#282828",
          lightgray: "#B3B3B3",
        },
      },
    },
  },
  plugins: [],
};

export default config;
