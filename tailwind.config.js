/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        indigo: {
          deep: "#1E2A4A",
        },
        bronze: {
          DEFAULT: "#C08A34",
          light: "#E4B85C"
        },
        clay: "#B54E3A",
        bone: "#F5F1E8",
        ink: "#161A22",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
    },
  },
  plugins: [],
};
