import { AxiosError } from "axios";
import api from "./api";
import { getApiUrl } from "../config/api.config";

export type SubscriptionZoneInfo = {
  id: number;
  name: string;
  delivery_fee?: string;
  estimated_delivery_minutes?: number;
};

export type SubscriptionStoreInfo = {
  id: number;
  name: string;
};

export type CheckSubscriptionZoneResponse = {
  eligible: boolean;
  store?: SubscriptionStoreInfo;
  zone?: SubscriptionZoneInfo;
  message?: string;
};

function parseLatLng(coords: string): { lat: number; lng: number } | null {
  const [lat, lng] = coords.split(",").map((s) => Number(String(s).trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function normalizeCheckZonePayload(raw: unknown): CheckSubscriptionZoneResponse {
  const o = raw as Record<string, unknown> | null | undefined;
  const inner = (o?.data as Record<string, unknown> | undefined) ?? o ?? {};
  return {
    eligible: Boolean(inner.eligible),
    store: inner.store as SubscriptionStoreInfo | undefined,
    zone: inner.zone as SubscriptionZoneInfo | undefined,
    message: inner.message != null ? String(inner.message) : undefined,
  };
}

async function enrichStoreFromZoneIfNeeded(
  res: CheckSubscriptionZoneResponse,
): Promise<CheckSubscriptionZoneResponse> {
  let resolvedStore = res.store;
  const zoneId = Number(res.zone?.id);
  const storeIncomplete =
    !resolvedStore?.id ||
    !String(resolvedStore?.name ?? "").trim();
  if (storeIncomplete && Number.isFinite(zoneId) && zoneId > 0) {
    try {
      const byZone = await getSubscriptionStoreByZone(zoneId);
      if (byZone) resolvedStore = byZone;
    } catch {
      /* use check-zone payload only */
    }
  }
  return { ...res, store: resolvedStore };
}

/**
 * POST /subscriptions/check-zone/
 * Body: `{ address_id }` or `{ lat, lng }` — same as mobile `subscriptionZone.service`.
 */
export async function checkSubscriptionZone(
  body: { address_id: number } | { lat: number; lng: number },
): Promise<CheckSubscriptionZoneResponse> {
  const response = await api.post(
    `${getApiUrl()}/subscriptions/check-zone/`,
    body,
  );
  return normalizeCheckZonePayload(response.data);
}

/**
 * GET /subscriptions/store-by-zone/?zone_id=
 */
export async function getSubscriptionStoreByZone(
  zoneId: number,
): Promise<SubscriptionStoreInfo | null> {
  const id = Number(zoneId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const response = await api.get(`${getApiUrl()}/subscriptions/store-by-zone/`, {
    params: { zone_id: id },
  });
  const raw = (response.data as { data?: unknown })?.data ?? response.data;
  const obj = raw as Record<string, unknown> | null | undefined;
  const store = (obj?.store as Record<string, unknown> | undefined) ?? obj;
  const storeId = Number(store?.id);
  if (!Number.isFinite(storeId) || storeId <= 0) return null;
  return {
    id: storeId,
    name: String(store?.name ?? "").trim() || `Store ${storeId}`,
  };
}

export type GpDailyZoneResolution = {
  eligible: boolean;
  storeId: number | null;
  storeName: string | null;
  message?: string;
};

async function toResolution(
  res: CheckSubscriptionZoneResponse,
): Promise<GpDailyZoneResolution> {
  const enriched = await enrichStoreFromZoneIfNeeded(res);
  const sid = Number(enriched.store?.id);
  return {
    eligible: Boolean(enriched.eligible),
    storeId: Number.isFinite(sid) && sid > 0 ? sid : null,
    storeName: enriched.store?.name != null ? String(enriched.store.name) : null,
    message: enriched.message,
  };
}

export async function resolveGpDailyZoneForAddress(
  addressId: number,
): Promise<GpDailyZoneResolution> {
  const res = await checkSubscriptionZone({ address_id: addressId });
  return toResolution(res);
}

export async function resolveGpDailyZoneAtLatLng(
  lat: number,
  lng: number,
): Promise<GpDailyZoneResolution> {
  const res = await checkSubscriptionZone({ lat, lng });
  return toResolution(res);
}

export async function validateGpDailyDeliveryAreaFromCoordinates(
  coordinates: string,
): Promise<{ isValid: boolean; message?: string }> {
  const parsed = parseLatLng(coordinates);
  if (!parsed) {
    return { isValid: false, message: "Invalid coordinates format" };
  }
  try {
    const r = await resolveGpDailyZoneAtLatLng(parsed.lat, parsed.lng);
    return {
      isValid: r.eligible,
      message:
        r.message ||
        (r.eligible
          ? "Address is within delivery area"
          : "Address is outside delivery area"),
    };
  } catch (error) {
    if (error instanceof AxiosError) {
      const msg =
        (error.response?.data as { message?: string } | undefined)?.message ||
        error.message ||
        "Failed to validate address location";
      return { isValid: false, message: msg };
    }
    return { isValid: false, message: "Failed to validate address location" };
  }
}

export async function validateGpDailyDeliveryAreaForAddressId(
  addressId: number,
): Promise<{ isValid: boolean; message?: string }> {
  if (!Number.isFinite(addressId) || addressId <= 0) {
    return { isValid: false, message: "Invalid address" };
  }
  try {
    const r = await resolveGpDailyZoneForAddress(addressId);
    return {
      isValid: r.eligible,
      message:
        r.message ||
        (r.eligible
          ? "Address is within delivery area"
          : "Address is outside delivery area"),
    };
  } catch (error) {
    if (error instanceof AxiosError) {
      const msg =
        (error.response?.data as { message?: string } | undefined)?.message ||
        error.message ||
        "Failed to validate address location";
      return { isValid: false, message: msg };
    }
    return { isValid: false, message: "Failed to validate address location" };
  }
}

/** Prefer `addressId` when logged-in default address is known; else lat/lng string. */
export async function validateGpDailyDeliveryArea(input: {
  addressId?: number;
  coordinates?: string;
}): Promise<{ isValid: boolean; message?: string }> {
  if (
    input.addressId != null &&
    Number.isFinite(input.addressId) &&
    input.addressId > 0
  ) {
    return validateGpDailyDeliveryAreaForAddressId(input.addressId);
  }
  if (input.coordinates?.trim()) {
    return validateGpDailyDeliveryAreaFromCoordinates(input.coordinates.trim());
  }
  return { isValid: false, message: "Invalid coordinates format" };
}
