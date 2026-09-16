import preset from "@cyberpulse/config/tailwind";

/** @type {import('tailwindcss').Config} */
const config = {
  presets: [preset],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
};

export default config;
