import toast from "react-hot-toast";
import type { CartSwitchStoreResponse } from "../services/cart.service";

export function countRemovedCartSwitchItems(
  res: CartSwitchStoreResponse | null | undefined,
): number {
  const arr = res?.data?.removed_items ?? res?.removed_items;
  return Array.isArray(arr) ? arr.length : 0;
}

/** After user confirms switching fulfilment store from basket (Store or Daily). */
export function toastAfterSuggestedStoreSwitch(
  storeName: string,
  removedCount: number,
): void {
  const name = storeName.trim() || "this store";
  if (removedCount > 0) {
    toast.success(
      `Switched to ${name}. ${removedCount} item${removedCount === 1 ? "" : "s"} not sold here ${removedCount === 1 ? "was" : "were"} removed.`,
      { id: "cart-store-switch-removed" },
    );
    return;
  }
  toast.success(
    `Switched to ${name}. Your basket items are available at this store.`,
    { id: "cart-store-switch-ok" },
  );
}

/** After store change from Account settings (with or without confirmation modal). */
export function toastAfterSettingsStoreSwitch(removedCount: number): void {
  if (removedCount > 0) {
    toast.success(
      `Store updated. ${removedCount} item${removedCount === 1 ? "" : "s"} not sold at this store ${removedCount === 1 ? "was" : "were"} removed from your basket.`,
      { id: "settings-store-switch-removed" },
    );
    return;
  }
  toast.success(
    "Store updated. All items in your basket are available at this store.",
    { id: "settings-store-switch-ok" },
  );
}
