/** Sajawat contact + CTA config (override via VITE_* in .env). */
export const SAJAWAT_CONTACT = {
  sajawatBrochureUrl: import.meta.env.VITE_SAJAWAT_BROCHURE_URL || "",
  sajawatContactEmail:
    import.meta.env.VITE_SAJAWAT_CONTACT_EMAIL || "sajawat@mygendaphool.com",
  sajawatContactPhone:
    import.meta.env.VITE_SAJAWAT_CONTACT_PHONE || "+91 98752 00194",
} as const;
