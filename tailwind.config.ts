import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',  // Target TypeScript and TSX files
    './src/components/**/*.{ts,tsx}',
    './src/pages/**/*.{ts,tsx}',
    './src/layouts/**/*.{ts,tsx}',
    './index.html',
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8f6f1',
      },
    },
  },
  plugins: [],
}

export default config 