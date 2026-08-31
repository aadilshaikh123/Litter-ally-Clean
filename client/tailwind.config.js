/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // One brand ramp, replacing the six ad-hoc gradients and seven
        // hand-picked button colours the old screens each invented locally.
        brand: {
          50: "#eefbf3", 100: "#d6f5e2", 200: "#b0eac9", 300: "#7bd9a9",
          400: "#44c085", 500: "#1fa66a", 600: "#128554", 700: "#106a46",
          800: "#105439", 900: "#0e4530",
        },
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          muted:   "rgb(var(--surface-muted) / <alpha-value>)",
          raised:  "rgb(var(--surface-raised) / <alpha-value>)",
        },
        content: {
          DEFAULT: "rgb(var(--content) / <alpha-value>)",
          muted:   "rgb(var(--content-muted) / <alpha-value>)",
          subtle:  "rgb(var(--content-subtle) / <alpha-value>)",
        },
        line: "rgb(var(--line) / <alpha-value>)",
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.25rem" },
      boxShadow: {
        card: "0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px rgb(0 0 0 / 0.06)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};
