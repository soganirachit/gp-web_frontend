/** Brand social destinations (override with VITE_* in .env if needed). */
export const SOCIAL_URLS = {
  facebook:
    import.meta.env.VITE_SOCIAL_FACEBOOK_URL ||
    "https://www.facebook.com/gendaphool.original/",
  instagramMyGendaPhool:
    import.meta.env.VITE_SOCIAL_INSTAGRAM_URL ||
    "https://www.instagram.com/mygendaphool/",
  instagramSajawat:
    import.meta.env.VITE_SOCIAL_INSTAGRAM_SAJAWAT_URL ||
    "https://www.instagram.com/sajawatbygendaphool/",
  whatsapp:
    import.meta.env.VITE_SOCIAL_WHATSAPP_URL ||
    (typeof window !== "undefined"
      ? `${window.location.origin}/`
      : "https://mygendaphool.com/"),
} as const;
