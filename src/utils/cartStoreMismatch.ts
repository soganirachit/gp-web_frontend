import { addressService } from "../services/address.service";
import { cartService } from "../services/cart.service";
import { storeService } from "../services/store.service";
import {
  subscriptionCartService,
  type DailyCart,
  isSubscriptionCartStoreChangeConfirmation,
  normalizeSubscriptionCartSetAddressResponse,
} from "../services/subscriptionCart.service";
import { pickHomeCatalogHeaderAddress } from "./resolveHomeCatalogHeaderAddress";

export type CartChannel = "gpStore" | "gpDaily";

export type CartStoreMismatchInfo = {
  hasMismatch: boolean;
  cartStoreId: number | null;
  browseStoreId: number | null;
  cartItemCount: number;
};

/** Store id implied by the user's current browse / delivery location (not the cart). */
export function resolveBrowseCatalogStoreId(
  channel: CartChannel,
): number | null {
  if (channel === "gpStore") {
    return storeService.getStoreIdForProducts();
  }
  return storeService.getTemporaryStoreId();
}

function normalizeStoreId(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function detectCartStoreMismatch(
  channel: CartChannel,
): Promise<CartStoreMismatchInfo> {
  const browseStoreId = resolveBrowseCatalogStoreId(channel);
  let cartStoreId: number | null = null;
  let cartItemCount = 0;

  if (channel === "gpStore") {
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const cart = await cartService.getCartData();
        cartStoreId = normalizeStoreId(cart.store);
        cartItemCount =
          cart.items?.length ??
          (typeof cart.items_count === "number" ? cart.items_count : 0);
      } catch {
        /* treat as empty */
      }
    }
  } else {
    try {
      const cart: DailyCart = await subscriptionCartService.getDailyCart();
      cartStoreId = normalizeStoreId(cart.store_id);
      cartItemCount = cart.items?.length ?? 0;
    } catch {
      /* treat as empty */
    }
  }

  const hasMismatch =
    cartItemCount > 0 &&
    browseStoreId != null &&
    cartStoreId != null &&
    browseStoreId !== cartStoreId;

  return { hasMismatch, cartStoreId, browseStoreId, cartItemCount };
}

async function resolveBrowseDeliveryAddressId(): Promise<number | null> {
  try {
    const addresses = await addressService.getAllAddresses();
    const addr = pickHomeCatalogHeaderAddress(addresses);
    const id = Number(addr?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

/** Align server cart with the browse location's store (after user confirms replace). */
export async function replaceCartForBrowseStore(
  channel: CartChannel,
  targetStoreId: number,
): Promise<void> {
  if (channel === "gpStore") {
    await cartService.switchCartStore(targetStoreId);
    const selected = storeService.getSelectedStoreId();
    if (selected !== targetStoreId) {
      await storeService.switchStore(targetStoreId);
    }
    return;
  }
  const addressId = await resolveBrowseDeliveryAddressId();
  if (addressId == null) {
    throw new Error("Choose a delivery address first.");
  }
  const raw = await subscriptionCartService.setDeliveryAddress(addressId, true);
  const normalized = normalizeSubscriptionCartSetAddressResponse(raw);
  if (isSubscriptionCartStoreChangeConfirmation(normalized)) {
    throw new Error("Could not align your daily basket with this delivery location.");
  }
}
