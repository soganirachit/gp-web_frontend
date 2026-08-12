/**
 * Large hero illustrations served from public/ as WebP.
 * Replaces bloated Figma SVG exports (multi-MB / thousands of paths).
 * Keep using existing Tailwind sizing — only swap src URLs.
 */
export const OPTIMIZED_ILLUSTRATIONS = {
  dailyScooter: "/daily_scooter.webp",
  truck: "/truck.webp",
  truckHome: "/truckhome.webp",
  garland: "/garland.webp",
  deliveryTruck: "/delivery_truck.webp",
  bottomBanner: "/bottom_banner.webp",
  smallGenda: "/smallgenda.webp",
} as const;
