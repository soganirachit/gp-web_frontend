import type { Address } from "../services/address.service";

const STORAGE_KEY = "selectedDeliveryAddress";

type StoredPayload = {
  userId: string;
  address: Address;
};

function currentUserId(): string | null {
  try {
    const id = localStorage.getItem("userId")?.trim();
    return id || null;
  } catch {
    return null;
  }
}

/** Persist checkout/browse address for the logged-in user only. */
export function writeSelectedDeliveryAddress(address: Address): void {
  if (typeof localStorage === "undefined") return;
  const userId = currentUserId();
  if (!userId) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(address));
    return;
  }
  const payload: StoredPayload = { userId, address };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

/** Returns null if missing, malformed, or saved for a different user. */
export function readSelectedDeliveryAddress(): Address | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw?.trim()) return null;
    const parsed = JSON.parse(raw) as StoredPayload | Address;
    if (parsed && typeof parsed === "object" && "userId" in parsed && "address" in parsed) {
      const row = parsed as StoredPayload;
      const uid = currentUserId();
      if (!uid || String(row.userId) !== uid) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return row.address;
    }
    return parsed as Address;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearSelectedDeliveryAddress(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
