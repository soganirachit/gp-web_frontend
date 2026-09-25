import toast from "react-hot-toast";
import {
  errorMessageFromCatch,
  isCartLineUnavailableMessage,
  isStoreOrderingClosedError,
} from "./apiErrorMessage";
import { invalidateOrderingOfflineCache } from "./homeLocationHeroState";

type CheckoutFailureKind = "store_offline" | "unavailable_lines" | "other";

/**
 * Show checkout API failures on both toast and the cart inline error.
 * Store-closed must never be mapped to the "remove unavailable items" overlay.
 */
export function presentCheckoutFailure(opts: {
  error: unknown;
  fallback: string;
  setDeliveryStoreOffline: (value: boolean) => void;
  setCheckoutInlineError: (value: string | null) => void;
  onUnavailableLines?: () => void;
}): CheckoutFailureKind {
  const msg = errorMessageFromCatch(opts.error, opts.fallback);
  if (isStoreOrderingClosedError(opts.error, msg)) {
    invalidateOrderingOfflineCache();
    opts.setDeliveryStoreOffline(true);
    opts.setCheckoutInlineError(msg);
    toast.error(msg);
    return "store_offline";
  }
  if (isCartLineUnavailableMessage(msg)) {
    toast.error("Remove unavailable items from your basket before checkout.");
    opts.onUnavailableLines?.();
    return "unavailable_lines";
  }
  opts.setCheckoutInlineError(msg);
  toast.error(msg);
  return "other";
}
