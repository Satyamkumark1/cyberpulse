// Colour tokens from ux/design-system.md §2. Values are copied verbatim —
// never re-derive or approximate them; the contrast pairings are pre-verified there.

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        navy: { 900: "#0B1B33", 800: "#122745", 700: "#1B3559", 600: "#27456F" },
        "sih-blue": { 600: "#1B5FBF", 500: "#2F76D9", 100: "#E3EDFB" },
        slate: { 50: "#F6F8FB", 100: "#ECF0F6", 200: "#DCE3EC", 400: "#94A3B4", 600: "#556377", 800: "#28374B" },
        teal: { 600: "#0E7C86", 100: "#DDF2F4" },
        risk: {
          high: "#C0392B", "high-bg": "#FBEAE8",
          medium: "#C97A0E", "medium-bg": "#FDF2E2",
          low: "#1F7A47", "low-bg": "#E6F4EC",
          none: "#94A3B4",
        },
        status: {
          success: "#1F7A47",
          warning: "#C97A0E",
          error: "#C0392B",
          info: "#0E7C86",
        },
      },
    },
  },
};
