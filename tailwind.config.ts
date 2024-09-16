import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{html,js,ts,jsx,tsx,vue}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
