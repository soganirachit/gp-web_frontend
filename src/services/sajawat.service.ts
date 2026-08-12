import api from "./api";
import { resolveMediaUrl } from "../utils/resolveMediaUrl";

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
  description: string;
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
  const rawUrl = String(raw.url ?? "").trim();
  if (!rawUrl) return null;
  const url = resolveMediaUrl(rawUrl);
  const thumbRaw = String(raw.thumbnail_url ?? raw.url ?? "").trim() || rawUrl;
  const thumb = resolveMediaUrl(thumbRaw);
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
        description: String(c.description ?? "").trim(),
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

export type SajawatLeadPayload = {
  name: string;
  email?: string;
  phone?: string;
  event_date?: string;
  message?: string;
};

export type SajawatLeadSubmitResult = {
  ok: true;
  message: string;
  sheetWarning?: string;
};

function parseLeadSubmitResponse(data: unknown): SajawatLeadSubmitResult {
  const root = data as {
    success?: boolean;
    message?: string;
    data?: { sheet_warning?: string };
  };
  const message =
    (typeof root.message === "string" && root.message.trim()) ||
    "Thank you! We will contact you shortly.";
  const sheetWarning =
    typeof root.data?.sheet_warning === "string"
      ? root.data.sheet_warning.trim()
      : undefined;
  return { ok: true, message, sheetWarning: sheetWarning || undefined };
}

function leadSubmitErrorMessage(error: unknown): string {
  const ax = error as {
    response?: { data?: { message?: string; errors?: Record<string, unknown> } };
  };
  const data = ax.response?.data;
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message.trim();
  }
  const errors = data?.errors;
  if (errors && typeof errors === "object") {
    const parts: string[] = [];
    for (const val of Object.values(errors)) {
      if (Array.isArray(val)) {
        parts.push(...val.map(String));
      } else if (typeof val === "string") {
        parts.push(val);
      }
    }
    if (parts.length > 0) return parts.join(" ");
  }
  return "Could not submit your request. Please try again.";
}

/** Saves lead in DB and appends a row to the linked Google Sheet (when configured on server). */
export async function submitSajawatLead(
  payload: SajawatLeadPayload,
): Promise<SajawatLeadSubmitResult> {
  const response = await api.post("/sajawat/leads/", {
    name: payload.name.trim(),
    email: payload.email?.trim() || "",
    phone: payload.phone?.trim() || "",
    event_date: payload.event_date?.trim() || "",
    message: payload.message?.trim() || "",
  });
  return parseLeadSubmitResponse(response.data);
}

export { leadSubmitErrorMessage as sajawatLeadSubmitErrorMessage };
