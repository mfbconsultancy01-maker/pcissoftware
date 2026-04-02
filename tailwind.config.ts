import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'pcis-black': '#000000',
        'pcis-card': 'rgba(30, 30, 30, 0.8)',
        'pcis-gold': '#d4a574',
        'pcis-gold-light': 'rgba(212, 165, 116, 0.2)',
        'pcis-border': 'rgba(255, 255, 255, 0.1)',
        'pcis-text': '#ffffff',
        'pcis-text-secondary': '#888888',
        'pcis-text-muted': '#666666',
      },
    },
  },
  plugins: [],
}
export default config