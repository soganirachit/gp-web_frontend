/**
 * Account "Select Store" is visit-sticky, same idea as Manual location:
 * keep the pick while switching pages; drop it on a new document load
 * (hard refresh / app start) so GPS / location store can take over again.
 *
 * Module memory dies on reload. SPA navigation keeps the same heap.
 */

export const STORE_VISIT_OVERRIDE_UPDATED_EVENT = "gp-store-visit-override-updated";

let visitOverrideStoreId: number | null = null;

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STORE_VISIT_OVERRIDE_UPDATED_EVENT));
}

export function getStoreVisitOverrideId(): number | null {
  if (visitOverrideStoreId == null) return null;
  if (!Number.isFinite(visitOverrideStoreId) || visitOverrideStoreId <= 0) {
    return null;
  }
  return visitOverrideStoreId;
}

export function setStoreVisitOverrideId(id: number | null): void {
  const next =
    id != null && Number.isFinite(Number(id)) && Number(id) > 0
      ? Number(id)
      : null;
  if (visitOverrideStoreId === next) return;
  visitOverrideStoreId = next;
  notify();
}

export function clearStoreVisitOverride(): void {
  setStoreVisitOverrideId(null);
}

/** Test helper: pretend this is a fresh document load. */
export function resetStoreVisitOverrideForTests(): void {
  visitOverrideStoreId = null;
}

/**
 * Preference for Account / catalog store during a visit.
 * Override (Account pick) wins until reload; then location / nearest / saved.
 */
export function preferStoreIdForVisit(input: {
  overrideId: number | null;
  sessionId: number | null;
  nearestId: number | null;
  savedId: number | null;
  selectableIds: number[];
}): number | null {
  const selectable = new Set(input.selectableIds);
  const take = (id: number | null, requireSelectable: boolean) => {
    if (id == null || !Number.isFinite(id) || id <= 0) return null;
    if (requireSelectable && !selectable.has(id)) return null;
    return id;
  };
  return (
    take(input.overrideId, false) ??
    take(input.sessionId, true) ??
    take(input.nearestId, true) ??
    take(input.savedId, false) ??
    input.selectableIds[0] ??
    null
  );
}
