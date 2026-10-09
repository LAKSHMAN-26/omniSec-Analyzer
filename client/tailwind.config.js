/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0B0F19",
        panelBg: "#111827",
        panelBorder: "#1F2937",
        cyberCyan: "#06B6D4",
        cyberViolet: "#8B5CF6",
        cyberGreen: "#10B981",
        cyberAmber: "#F59E0B",
        cyberRed: "#EF4444"
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}
