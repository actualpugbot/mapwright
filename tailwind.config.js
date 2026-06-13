/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Refined neutral surface scale + a single calm accent.
        ink: {
          950: "#0a0b0d",
          900: "#101216",
          850: "#15181d",
          800: "#1b1f26",
          700: "#252a33",
          600: "#333a45",
          500: "#4a525f",
          400: "#6b7480",
          300: "#9aa2ad",
          200: "#c5cbd3",
          100: "#e8ebef",
        },
        accent: {
          DEFAULT: "#5b9cff",
          soft: "#3d6fd6",
          glow: "#7db4ff",
        },
        grass: "#7fb238",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.25)",
        panel: "inset 0 1px 0 rgba(255,255,255,0.03)",
      },
    },
  },
  plugins: [],
};
