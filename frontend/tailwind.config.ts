import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#08111f",
        surface: "#0f1b30",
        accent: "#56d4ff",
        accent2: "#7ef0b3",
        text: "#eaf2ff",
        muted: "#8ea3c1",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(86, 212, 255, 0.18), 0 24px 80px rgba(0, 0, 0, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;

