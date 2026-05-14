/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./components/**/*.{ts,tsx}",
    "./tabs/**/*.{ts,tsx}",
    "./sidepanel.tsx"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0066FF",
        "primary-hover": "#0052CC",
        border: "#E5E5E5",
        background: "#FFFFFF",
        "background-secondary": "#FAFAFA",
        "background-tertiary": "#F5F5F5",
        text: {
          primary: "#333333",
          secondary: "#666666",
          tertiary: "#999999"
        },
        success: "#5fe65fff",
        error: "#e43636ff"
      },
      spacing: {
        "sidebar": "360px"
      },
      animation: {
        "slide-in": "slideIn 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
        "slide-out": "slideOut 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)"
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" }
        },
        slideOut: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" }
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
}
