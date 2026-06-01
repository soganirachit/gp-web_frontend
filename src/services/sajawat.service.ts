import api from "./api";

export type SajawatMediaType = "photo" | "video";

export type SajawatGalleryMedia = {
  id: number;
  media_type: SajawatMediaType;
  title: string;
  url: string;
  thumbnail_url: string;
  sort_order: number;
  categoryId: number;
  categoryName: string;
};

export type SajawatGalleryCategory = {
  id: number;
  name: string;
  sort_order: number;
  media: SajawatGalleryMedia[];
};

export type SajawatGalleryData = {
  categories: SajawatGalleryCategory[];
};

function normalizeMediaType(raw: unknown): SajawatMediaType {
  const t = String(raw ?? "").toLowerCase();
  return t === "video" ? "video" : "photo";
}

function parseMedia(
  raw: Record<string, unknown>,
  categoryId: number,
  categoryName: string,
): SajawatGalleryMedia | null {
  const url = String(raw.url ?? "").trim();
  if (!url) return null;
  const thumb = String(raw.thumbnail_url ?? raw.url ?? "").trim() || url;
  return {
    id: Number(raw.id) || 0,
    media_type: normalizeMediaType(raw.media_type),
    title: String(raw.title ?? "").trim(),
    url,
    thumbnail_url: thumb,
    sort_order: Number(raw.sort_order) || 0,
    categoryId,
    categoryName,
  };
}

function parseGalleryPayload(payload: unknown): SajawatGalleryData {
  const root = (payload as { data?: unknown })?.data ?? payload;
  const rawCategories = (root as { categories?: unknown })?.categories;
  if (!Array.isArray(rawCategories)) {
    return { categories: [] };
  }

  const categories: SajawatGalleryCategory[] = rawCategories
    .map((cat) => {
      const c = cat as Record<string, unknown>;
      const id = Number(c.id) || 0;
      const name = String(c.name ?? "").trim();
      const mediaRaw = Array.isArray(c.media) ? c.media : [];
      const media = mediaRaw
        .map((m) =>
          parseMedia(m as Record<string, unknown>, id, name),
        )
        .filter((m): m is SajawatGalleryMedia => m != null)
        .sort((a, b) => a.sort_order - b.sort_order);
      return {
        id,
        name,
        sort_order: Number(c.sort_order) || 0,
        media,
      };
    })
    .filter((c) => c.id > 0 && c.name)
    .sort((a, b) => a.sort_order - b.sort_order);

  return { categories };
}

let galleryInFlight: Promise<SajawatGalleryData> | null = null;
let galleryCache: { value: SajawatGalleryData; ts: number } | null = null;
const GALLERY_CACHE_TTL_MS = 5 * 60 * 1000;

export async function fetchSajawatGalleryCached(): Promise<SajawatGalleryData> {
  if (galleryCache && Date.now() - galleryCache.ts <= GALLERY_CACHE_TTL_MS) {
    return galleryCache.value;
  }
  if (galleryInFlight) return galleryInFlight;

  galleryInFlight = (async () => {
    try {
      const response = await api.get("/sajawat/gallery/");
      const value = parseGalleryPayload(response.data);
      galleryCache = { value, ts: Date.now() };
      return value;
    } catch {
      const value: SajawatGalleryData = { categories: [] };
      galleryCache = { value, ts: Date.now() };
      return value;
    } finally {
      galleryInFlight = null;
    }
  })();

  return galleryInFlight;
}

export function flattenSajawatGalleryMedia(
  data: SajawatGalleryData,
): SajawatGalleryMedia[] {
  return data.categories.flatMap((c) => c.media);
}

export const SAJAWAT_GALLERY_PREVIEW_COUNT = 5;
