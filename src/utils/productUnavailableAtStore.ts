import type { NavigateFunction } from "react-router-dom";
import toast from "react-hot-toast";
import { REQUIRED_TOAST } from "../constants/requiredToastMessages";
import {
  errorMessageFromCatch,
  isHttpNotFoundError,
} from "./apiErrorMessage";

/** Standard customer copy (cart, PDP, deep links). */
export const PRODUCT_UNAVAILABLE_AT_STORE_MESSAGE =
  REQUIRED_TOAST.PRODUCT_UNAVAILABLE_AT_STORE;

export const CATALOG_PRODUCTS_REFRESH_EVENT = "gp-catalog-products-refresh";

/** Product detail 404 — inactive/unavailable catalog rows are omitted from GET /products/{slug}/. */
export function isProductDetailNotFoundError(error: unknown): boolean {
  if (isHttpNotFoundError(error)) return true;
  const msg = errorMessageFromCatch(error, "").toLowerCase();
  return (
    (msg.includes("product") && msg.includes("not found")) ||
    msg.includes("currently unavailable")
  );
}

export function notifyCatalogProductsRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CATALOG_PRODUCTS_REFRESH_EVENT));
}

export function redirectForUnavailableProduct(
  navigate: NavigateFunction,
  basePath: string,
): void {
  toast.error(PRODUCT_UNAVAILABLE_AT_STORE_MESSAGE, {
    id: "product-unavailable-at-store",
  });
  notifyCatalogProductsRefresh();
  navigate(basePath, { replace: true });
}
