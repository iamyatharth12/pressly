/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "#131313",
        surface: "#201f1f",
        "surface-high": "#2a2a2a",
        primary: "#adc6ff",
        "primary-strong": "#4b8eff",
        "on-primary": "#002e69",
        text: "#e5e2e1",
        muted: "#c1c6d7",
        outline: "#8b90a0",
        success: "#34c759"
      },
      fontFamily: {
        sans: ["Lexend", "Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 18px 50px rgba(0, 0, 0, 0.45)"
      }
    }
  },
  plugins: []
};
