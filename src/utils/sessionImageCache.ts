const loadedUrls = new Set<string>();
const preloadCache = new Map<string, HTMLImageElement>();

export function isSessionImageLoaded(url: string | null | undefined): boolean {
  const u = String(url ?? "").trim();
  return u.length > 0 && loadedUrls.has(u);
}

export function markSessionImageLoaded(url: string | null | undefined): void {
  const u = String(url ?? "").trim();
  if (!u) return;
  loadedUrls.add(u);
}

export function preloadSessionImage(url: string | null | undefined): void {
  const u = String(url ?? "").trim();
  if (!u || typeof window === "undefined") return;
  if (loadedUrls.has(u) || preloadCache.has(u)) return;
  const img = new Image();
  img.decoding = "sync";
  img.loading = "eager";
  img.onload = () => markSessionImageLoaded(u);
  img.onerror = () => {
    preloadCache.delete(u);
  };
  img.src = u;
  preloadCache.set(u, img);
}

export function clearSessionImageCache(): void {
  loadedUrls.clear();
  preloadCache.clear();
}
