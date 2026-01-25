/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
      },
    },
  },
  plugins: [],
}
