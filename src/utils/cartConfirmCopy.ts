export const SWITCH_STORE_CONFIRM_TITLE = "Switch Store?";

export const SWITCH_STORE_CONFIRM_MESSAGE =
  "Your basket is tied to a store. After you switch, items that are not sold at the new store will be removed. Items that are available will stay. Continue?";

export const REPLACE_CART_CONFIRM_TITLE = "Replace basket items?";

export const REPLACE_CART_CONFIRM_MESSAGE =
  "Your basket has items from a different location. Items that are not available at the new store will be removed and the rest will be kept.";

export const PRODUCT_UNAVAILABLE_MODAL_TITLE = "Product unavailable";

export function productUnavailableOnStoreMessage(
  productName: string,
  reason?: "out_of_stock" | "store_offline" | "not_at_store",
): string {
  const name = productName.trim() || "This item";
  if (reason === "store_offline") {
    return `${name} cannot be delivered while your store is offline. Remove it from your basket or try again when the store reopens.`;
  }
  if (reason === "not_at_store") {
    return `${name} is not sold at your current store. Remove it from your basket or switch store from Account.`;
  }
  return `${name} is out of stock or no longer available. We will remove it from your basket.`;
}
