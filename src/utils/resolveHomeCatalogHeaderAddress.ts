import type { Address } from "../services/address.service";
import { composeCompleteAddress } from "../services/address.service";
import { storeService } from "../services/store.service";
import { sanitizeAddressDisplayPart } from "./formatCartDeliveryAddress";

export function formatSavedAddressLine(address: Address): string {
  const line = composeCompleteAddress(address.houseNo, address.streetName);
  const extras = [address.city, address.state, address.pincode]
    .map((p) => sanitizeAddressDisplayPart(p == null ? "" : String(p)))
    .filter(Boolean)
    .filter((p) => !line.toLowerCase().includes(p.toLowerCase()));
  return [line, ...extras].filter(Boolean).join(", ");
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
