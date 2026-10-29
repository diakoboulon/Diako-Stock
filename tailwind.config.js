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
      keyframes: {
        flotte: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
      },
      animation: {
        flotte: "flotte 5s ease-in-out infinite",
        flotte2: "flotte 6s ease-in-out -2s infinite",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
    },
  },
  plugins: [],
};
