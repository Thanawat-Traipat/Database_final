// Tailwind scans the app and component folders for Figma-exported utility classes.
const config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        manrope: ["var(--font-manrope-next)", "ui-sans-serif", "system-ui"],
        epilogue: ["var(--font-epilogue-next)", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

module.exports = config;
