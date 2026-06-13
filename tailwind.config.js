/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Calm "paper" surface scale (light) + one confident blue accent.
        // The scale runs light → dark as the number climbs so that
        // surface classes (bg-ink-950/900/850) read as paper/cards and text
        // classes (text-ink-100/200) read as ink.
        ink: {
          950: "#eceeeb", // paper — app background
          900: "#f2f4f1", // sunken surface — fields, segmented track, chips
          850: "#ffffff", // surface — floating cards
          800: "#e8ebe6", // faint fill / hairline border
          700: "#dde1dc", // line-strong — borders, slider track
          600: "#c2c8c1", // faint line — dashed dropzone, footer
          500: "#9aa4ae", // faint text / placeholder
          400: "#6c7884", // muted text
          300: "#3a4750", // soft ink — secondary text
          200: "#28333c", // strong ink
          100: "#1c2730", // ink — primary text
        },
        accent: {
          DEFAULT: "#2f74e0",
          soft: "#1f63cf", // darker — button hover / press
          glow: "#1f63cf", // hover accent for links & icons
        },
        // Brand cube gradient (blue → teal).
        brand: {
          a: "#3b82f6",
          b: "#1fb6ac",
        },
        grass: "#7fb238",
      },
      fontFamily: {
        sans: [
          "Hanken Grotesk",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          "Bricolage Grotesque",
          "Hanken Grotesk",
          "system-ui",
          "sans-serif",
        ],
        mono: ["B612 Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        // Soft, layered elevation tuned for a light canvas.
        soft: "0 6px 22px rgba(24,36,45,0.07), 0 1px 3px rgba(24,36,45,0.05)",
        float: "0 14px 40px rgba(24,36,45,0.12), 0 2px 8px rgba(24,36,45,0.06)",
        panel: "inset 0 1px 0 rgba(255,255,255,0.6)",
      },
    },
  },
  plugins: [],
};
