/** Sajawat contact + CTA config (override via VITE_* in .env). */
export const SAJAWAT_CONTACT = {
  whatsappBusinessNumber:
    import.meta.env.VITE_SAJAWAT_WHATSAPP_NUMBER || "919876543210",
  sajawatBrochureUrl: import.meta.env.VITE_SAJAWAT_BROCHURE_URL || "",
  sajawatContactEmail:
    import.meta.env.VITE_SAJAWAT_CONTACT_EMAIL || "hello@sajawat.com",
  sajawatContactPhone:
    import.meta.env.VITE_SAJAWAT_CONTACT_PHONE || "+91 12345 67890",
} as const;

export function buildSajawatWaMeUrl(message: string): string {
  const digits = SAJAWAT_CONTACT.whatsappBusinessNumber.replace(/\D/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function openSajawatWhatsApp(message: string): void {
  const url = buildSajawatWaMeUrl(message);
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}
