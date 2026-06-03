export const BANNER_PLACEMENT_STORE_HOME = "store_home" as const;
/** Client slot id for `/home` offers carousel. */
export const BANNER_PLACEMENT_LANDING_HOME = "landing_home" as const;
/** API `placement` value for landing-page banners (`GET .../banners/?placement=landing`). */
export const BANNER_PLACEMENT_LANDING = "landing" as const;
export const BANNER_PLACEMENT_DAILY_HOME = "daily_home" as const;

export type BannerPlacement =
  | typeof BANNER_PLACEMENT_STORE_HOME
  | typeof BANNER_PLACEMENT_LANDING_HOME
  | typeof BANNER_PLACEMENT_DAILY_HOME;

export interface BannerWithPlacement {
  placement?: string | null;
  sort_order?: number;
}

/** Client-side filter when API returns all placements in one list. */
export function filterBannersByPlacement<T extends BannerWithPlacement>(
  banners: T[],
  placement: BannerPlacement,
): T[] {
  const sorted = [...banners].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  if (placement === BANNER_PLACEMENT_STORE_HOME) {
    return sorted.filter((b) => b.placement === BANNER_PLACEMENT_STORE_HOME);
  }
  if (placement === BANNER_PLACEMENT_DAILY_HOME) {
    return sorted.filter((b) => b.placement === BANNER_PLACEMENT_DAILY_HOME);
  }
  return sorted.filter((b) => isLandingBannerPlacement(b.placement));
}

function normalizeBannerPlacementValue(
  raw: string | null | undefined,
): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
}

/** Landing `/home` — API may send `landing`, legacy `landing_home`, or `home`. */
export function isLandingBannerPlacement(
  raw: string | null | undefined,
): boolean {
  const v = normalizeBannerPlacementValue(raw);
  return (
    !v ||
    v === BANNER_PLACEMENT_LANDING ||
    v === BANNER_PLACEMENT_LANDING_HOME ||
    v === "home"
  );
}
