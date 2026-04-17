/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg:         "#F8F9FB",
        card:       "#FFFFFF",
        "card-2":   "#F1F3F7",
        border:     "#E5E7EB",
        "border-2": "#D1D5DB",
        accent:     "#4F46E5",
        "accent-2": "#4338CA",
        "accent-3": "#3730A3",
        success:    "#10B981",
        warning:    "#F59E0B",
        danger:     "#EF4444",
        txt:        "#111827",
        "txt-2":    "#4B5563",
        "txt-3":    "#6B7280",
        "txt-4":    "#9CA3AF",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        xl2: "20px",
      },
      boxShadow: {
        soft: "0 4px 20px rgba(0, 0, 0, 0.03)",
        glow: "0 0 30px rgba(79, 70, 229, 0.15)",
        "glow-sm": "0 0 15px rgba(79, 70, 229, 0.1)",
      },
    },
  },
  plugins: [],
};
