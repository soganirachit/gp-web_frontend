import { REQUIRED_TOAST } from "./requiredToastMessages";
import { errorMessageFromCatch } from "../utils/apiErrorMessage";

/** Short, customer-safe fallbacks when API copy is missing or too technical. */
export const CUSTOMER_ERRORS = {
  GENERIC_TRY_AGAIN: "Something went wrong. Please try again.",
  PRODUCT_INFO_MISSING: "Product information is not available right now.",
  SUBSCRIPTION_PROCEED_FAILED: "We could not continue with your subscription. Please try again.",
  SESSION_LOGIN_REQUIRED: REQUIRED_TOAST.AUTH_REQUIRED,
  SAVE_ADDRESS_FAILED: REQUIRED_TOAST.FAILED_SAVE_ADDRESS,
} as const;

export function customerErrorFromCatch(
  err: unknown,
  fallback: string = CUSTOMER_ERRORS.GENERIC_TRY_AGAIN,
): string {
  const msg = errorMessageFromCatch(err, fallback);
  if (/session expired|authentication required/i.test(msg)) {
    return CUSTOMER_ERRORS.SESSION_LOGIN_REQUIRED;
  }
  return msg;
}
