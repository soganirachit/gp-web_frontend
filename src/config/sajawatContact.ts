/** Sajawat contact + CTA config (override via VITE_* in .env). */
export const SAJAWAT_CONTACT = {
  sajawatBrochureUrl: import.meta.env.VITE_SAJAWAT_BROCHURE_URL || "",
  sajawatContactEmail:
    import.meta.env.VITE_SAJAWAT_CONTACT_EMAIL || "hello@sajawat.com",
  sajawatContactPhone:
    import.meta.env.VITE_SAJAWAT_CONTACT_PHONE || "+91 12345 67890",
} as const;
