/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",  // kept so .dark class is valid; frozen to light in useTheme.ts
  theme: {
    extend: {
      colors: {
        // ── Claymorphism semantic tokens ──
        clay: {
          canvas:    "var(--bg-clay-canvas)",
          surface:   "var(--bg-clay-surface)",
          recessed:  "var(--bg-clay-recessed)",
          primary:   "var(--text-clay-primary)",
          secondary: "var(--text-clay-secondary)",
        },
        // ── Legacy aliases (keep during migration; map to clay equivalents) ──
        app:            "var(--bg-clay-canvas)",
        surface:        "var(--bg-clay-surface)",
        "surface-solid":"var(--bg-clay-surface)",
        recessed:       "var(--bg-clay-recessed)",
        elevated:       "var(--bg-clay-surface)",
        muted:          "var(--bg-clay-recessed)",
        border:         "var(--border-default)",
        ink:            "#172033",
        coral:          "#f9735b",
        // ── Brand ──
        primary: {
          DEFAULT:    "var(--color-primary)",
          hover:      "var(--color-primary-hover)",
          foreground: "var(--color-primary-foreground)",
        },
        danger:  "var(--color-danger)",
        warning: "var(--color-warning)",
        success: "var(--color-success)",
        // ── Palette ──
        brand: {
          50:  "#ecfdf5",
          100: "#d1fae5",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          900: "#064e3b",
        },
      },

      textColor: {
        primary:   "var(--text-clay-primary)",
        secondary: "var(--text-clay-secondary)",
        muted:     "var(--text-clay-secondary)",
      },

      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)",
      },

      fontFamily: {
        sans:    ['"DM Sans"',  "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Nunito"',   "ui-sans-serif", "system-ui", "sans-serif"],
      },

      boxShadow: {
        // ── Clay shadow system ──
        //    Multi-layer: outer drop + inner highlight + inner depth
        "clay-surface": [
          "0 8px 32px rgba(124,58,237,0.05)",
          "inset 0 2px 0 rgba(255,255,255,0.75)",
          "inset 0 -2px 0 rgba(229,224,239,0.4)",
        ].join(", "),

        "clay-card": [
          "0 2px 0 rgba(255,255,255,0.8)",
          "0 12px 40px rgba(51,47,58,0.08)",
          "0 4px 12px rgba(51,47,58,0.04)",
          "inset 0 2px 4px rgba(255,255,255,0.9)",
          "inset 0 -4px 8px rgba(229,224,239,0.4)",
        ].join(", "),

        // Primary button — violet glow + raised look
        "clay-btn": [
          "0 8px 24px rgba(124,58,237,0.25)",
          "0 2px 8px rgba(124,58,237,0.15)",
          "inset 0 2px 4px rgba(255,255,255,0.35)",
          "inset 0 -3px 6px rgba(0,0,0,0.12)",
        ].join(", "),

        // Alias: "clay-button" maps to same as clay-btn
        "clay-button": [
          "0 8px 24px rgba(124,58,237,0.25)",
          "0 2px 8px rgba(124,58,237,0.15)",
          "inset 0 2px 4px rgba(255,255,255,0.35)",
          "inset 0 -3px 6px rgba(0,0,0,0.12)",
        ].join(", "),

        // Recessed / pressed well
        "clay-pressed": [
          "inset 0 4px 10px rgba(51,47,58,0.08)",
          "inset 0 1px 4px rgba(51,47,58,0.05)",
          "inset 0 0 0 1px rgba(229,224,239,0.6)",
          "0 1px 2px rgba(255,255,255,0.9)",
        ].join(", "),

        // Hover lift effect
        "clay-hover": [
          "0 20px 48px rgba(51,47,58,0.1)",
          "0 8px 20px rgba(51,47,58,0.06)",
          "inset 0 2px 4px rgba(255,255,255,0.9)",
          "inset 0 -4px 8px rgba(229,224,239,0.4)",
        ].join(", "),

        // Legacy
        soft:  "0 4px 24px rgba(124,58,237,0.04)",
        card:  "0 1px 3px rgba(124,58,237,0.02), 0 4px 12px rgba(124,58,237,0.04)",
        nav:   "0 -4px 16px rgba(124,58,237,0.05)",
      },

      borderRadius: {
        "2.5xl": "1.125rem",
        "3xl":   "1.5rem",
        "4xl":   "2rem",
        "5xl":   "2.5rem",
        "6xl":   "3rem",
        "7xl":   "3.75rem",
      },
    },
  },
  plugins: [],
};
