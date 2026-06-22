/** @type {import('tailwindcss').Config} */
module.exports = {
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
      xs: '360px', // Budget Android: Redmi 9A, Samsung Galaxy M13, Realme C31
      sm: '390px', // Standard: iPhone 14/15, Pixel 6a, OnePlus Nord
      md: '412px', // Large Android: Samsung Galaxy S22/S23/A54, Pixel 7
      lg: '640px', // Small tablet / landscape phone
      xl: '768px', // Tablet portrait
      '2xl': '1024px', // Tablet landscape / desktop
    },
    /** Standard radii +8px vs default Tailwind scale (cards, buttons, inputs). */
    borderRadius: {
      none: '0',
      sm: '0.625rem',
      DEFAULT: '0.75rem',
      md: '0.875rem',
      lg: '1rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '2rem',
      full: '9999px',
    },
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['IBM Plex Serif', 'Georgia', 'serif'],
        playfair: ['Playfair Display', 'Georgia', 'serif'],
      },
      /** GP Daily section titles — 22px mobile, 24px tablet+ (28px line) */
      fontSize: {
        'gp-section': ['1.375rem', { lineHeight: '1.75rem' }],
        'gp-section-md': ['1.5rem', { lineHeight: '1.75rem' }],
        'gp-body-sm': ['0.8125rem', { lineHeight: '1.45' }],
        'gp-card-title': ['0.75rem', { lineHeight: '1.35' }],
        'gp-card-title-md': ['0.8125rem', { lineHeight: '1.35' }],
        'gp-card-meta': ['0.6875rem', { lineHeight: '1.4' }],
        'gp-card-meta-md': ['0.75rem', { lineHeight: '1.4' }],
        'gp-card-price': ['0.875rem', { lineHeight: '1.3' }],
        'gp-card-price-md': ['0.9375rem', { lineHeight: '1.3' }],
      },
      colors: {
        background: '#f8f6f1',
        'genda-green': '#1d4d2a',
        'genda-gold': '#d4a853',
        'genda-cream': '#f9f5f0',
      },
      // Safe area insets for punch-hole / notch / dynamic-island phones
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
        /** Space above bottom nav / home indicator (52px bar + safe area) */
        'nav-bottom': 'var(--gp-bottom-nav-offset)',
        /** Layout main content padding when bottom nav visible */
        'layout-pb': 'calc(8rem + env(safe-area-inset-bottom, 0px))',
      },
    },
  },
  plugins: [],
};
