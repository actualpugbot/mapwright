/** @type {import('tailwindcss').Config} */
// Helper: a color backed by a CSS custom property holding "R G B" channels,
// so Tailwind's opacity modifiers (bg-ink-850/70, ring-accent/40) keep working
// while the actual values swap between light/dark via the `.dark` class.
// The channel values live in src/index.css (:root and .dark).
const v = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Calm "paper" surface scale + one confident blue accent. The scale
        // runs light → dark as the number climbs so that surface classes
        // (bg-ink-950/900/850) read as paper/cards and text classes
        // (text-ink-100/200) read as ink. In dark mode the variables flip so
        // surfaces become deep slate and text becomes light — same class names.
        ink: {
          950: v("--ink-950"), // paper — app background
          900: v("--ink-900"), // sunken surface — fields, segmented track, chips
          850: v("--ink-850"), // surface — floating cards
          800: v("--ink-800"), // faint fill / hairline border
          700: v("--ink-700"), // line-strong — borders, slider track
          600: v("--ink-600"), // faint line — dashed dropzone, footer
          500: v("--ink-500"), // faint text / placeholder
          400: v("--ink-400"), // muted text
          300: v("--ink-300"), // soft ink — secondary text
          200: v("--ink-200"), // strong ink
          100: v("--ink-100"), // ink — primary text
        },
        accent: {
          DEFAULT: v("--accent"),
          soft: v("--accent-soft"), // button hover / press
          glow: v("--accent-glow"), // hover accent for links & icons
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
