import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/pages/**/*.{ts,tsx}',
    './src/layouts/**/*.{ts,tsx}',
    './index.html',
  ],
  theme: {
    // Override Tailwind's default screens so sm/md/lg map to real Indian phone widths.
    // Default sm=640px is tablet territory; Indian phones range 360–412px.
    screens: {
      // Mobile-first Indian phone breakpoints
      'xs':     '360px',   // Budget Android: Redmi 9A, Samsung Galaxy M13, Realme C31
      'sm':     '390px',   // Standard: iPhone 14/15, Pixel 6a, OnePlus Nord
      'md':     '412px',   // Large Android: Samsung Galaxy S22/S23/A54, Pixel 7
      'lg':     '640px',   // Small tablet / landscape phone
      'xl':     '768px',   // Tablet portrait
      '2xl':    '1024px',  // Tablet landscape / desktop
    },
    extend: {
      /** Fluid type for section titles — ~17–22px across 360–420px without per-breakpoint classes */
      fontSize: {
        'gp-section': ['clamp(1.0625rem, 2.85vw, 1.375rem)', { lineHeight: '1.28' }],
        'gp-body-sm': ['0.8125rem', { lineHeight: '1.45' }],
      },
      colors: {
        background: '#f8f6f1',
      },
      // Safe area insets for punch-hole / notch / dynamic-island phones
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top':    'env(safe-area-inset-top)',
        'safe-left':   'env(safe-area-inset-left)',
        'safe-right':  'env(safe-area-inset-right)',
        /** Space above bottom nav / home indicator (6rem nav + safe area) */
        'nav-bottom': 'calc(6rem + env(safe-area-inset-bottom, 0px))',
        /** Layout main content padding when bottom nav visible */
        'layout-pb': 'calc(8rem + env(safe-area-inset-bottom, 0px))',
      },
    },
  },
  plugins: [],
}

export default config
