/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // Дублюємо CSS-змінні як Tailwind-токени для зручності
      colors: {
        deep:   "#0e1a0a",
        green:  "#1c3610",
        mid:    "#2d5016",
        light:  "#4a7c2f",
        sage:   "#8aab6e",
        sage2:  "#b5cea0",
        cream:  "#faf8f2",
        cream2: "#f0ebe0",
        cream3: "#e8e0d0",
        pink:   "#dda8ad",
        pinkl:  "#f5dde0",
        gold:   "#c8a84b",
        goldl:  "#f4e3bb",
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans:  ["Jost", "system-ui", "sans-serif"],
        mono:  ["DM Mono", "monospace"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
        "4xl": "24px",
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease both",
        "blink":   "blink 2s infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.3" },
        },
      },
    },
  },
  plugins: [],
};
