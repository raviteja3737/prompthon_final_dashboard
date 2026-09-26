/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./neo_brutalist_mark_scoring_portal.tsx"
  ],
  theme: {
    extend: {
      colors: {
        neoYellow: '#FFE600',
        neoCyan: '#00F0FF',
        neoPink: '#FF66C4',
        neoGreen: '#00F5A0',
        neoBg: '#FFFDF0',
      }
    },
  },
  plugins: [],
}
