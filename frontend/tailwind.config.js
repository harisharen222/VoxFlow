/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg:         "#0a0a0f",
        surface:    "#0e0e1a",
        card:       "#12121c",
        "card-2":   "#15152a",
        border:     "#1e1e30",
        "border-2": "#2a2d3e",
        accent:     "#6c63ff",
        "accent-2": "#5a52e0",
        "accent-3": "#38bdf8",
        success:    "#22c55e",
        warning:    "#f59e0b",
        danger:     "#ef4444",
        txt:        "#f1f5f9",
        "txt-2":    "#94a3b8",
        "txt-3":    "#475569",
        "txt-4":    "#2a2d3e",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        xl2: "20px",
      },
      backgroundImage: {
        "accent-gradient": "linear-gradient(135deg, #6c63ff, #38bdf8)",
        "card-gradient":   "linear-gradient(145deg, #12121c, #0e0e1a)",
      },
      boxShadow: {
        glow:    "0 0 40px rgba(108,99,255,0.2)",
        "glow-sm": "0 0 20px rgba(108,99,255,0.15)",
        card:    "0 4px 24px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
