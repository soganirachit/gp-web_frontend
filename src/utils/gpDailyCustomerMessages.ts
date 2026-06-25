/** Customer-safe copy — never expose internal zone or store identifiers in toasts. */
import { REQUIRED_TOAST } from "../constants/requiredToastMessages";

export const GP_DAILY_ZONE_ELIGIBLE_TOAST =
  "Great! We can deliver to this address.";

export const GP_DAILY_ZONE_STALE_TOAST =
  "Please update your delivery address to continue.";

export const GP_DAILY_ZONE_CHECK_ERROR_TOAST = REQUIRED_TOAST.COULD_NOT_VERIFY_DELIVERY_AREA;

export const GP_DAILY_ADDRESS_OUTSIDE_ZONE_TOAST = REQUIRED_TOAST.ADDRESS_OUTSIDE_OUR_AREA;

export const GP_DAILY_DELIVERY_DETAILS_ERROR_TOAST =
  REQUIRED_TOAST.COULD_NOT_UPDATE_DELIVERY_DETAILS;

export const GP_DAILY_STORE_UPDATED_TOAST =
  "Delivery settings updated for your address.";
