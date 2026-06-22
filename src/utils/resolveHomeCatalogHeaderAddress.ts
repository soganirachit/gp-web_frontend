import type { Address } from "../services/address.service";
import { storeService } from "../services/store.service";

export function formatSavedAddressLine(address: Address): string {
  return [
    address.houseNo,
    address.streetName,
    address.area,
    address.city,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Header location row: prefer catalog browse override / explicit selection, then default.
 * Mirrors GP Store home so GP Daily does not revert to default after address pick.
 */
export function pickHomeCatalogHeaderAddress(
  addresses: Address[],
): Address | null {
  const overrideId = storeService.getGpStoreCatalogAddressOverrideId();
  if (overrideId) {
    const fromOverride = addresses.find(
      (a) => String(a.id) === String(overrideId),
    );
    if (fromOverride) return fromOverride;
  }

  const storedRaw = localStorage.getItem("selectedDeliveryAddress");
  if (storedRaw) {
    try {
      const parsed = JSON.parse(storedRaw) as Address;
      if (parsed?.id) {
        const fromList = addresses.find(
          (a) => String(a.id) === String(parsed.id),
        );
        if (fromList) return fromList;
      }
      if (parsed?.streetName || parsed?.area || parsed?.houseNo) {
        return parsed;
      }
    } catch {
      /* ignore malformed cache */
    }
  }

  const defaultAddress = addresses.find((addr) => addr.isDefault);
  if (defaultAddress) return defaultAddress;

  const sorted = [...addresses].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return sorted[0] ?? null;
}
