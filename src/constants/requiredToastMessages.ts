/**
 * Required customer-facing toast / inline messages (mobile-toast-messages-review Excel, Required=Y).
 * Keep exact copy in sync with `mobile-toast-messages-review-excel (1).xlsx` column C.
 */
export const REQUIRED_TOAST = {
  OTP_SENT_WHATSAPP: "OTP sent to your WhatsApp",
  ADDRESS_UPDATED: "Address updated successfully",
  ADDRESS_ADDED: "Address added successfully",
  ADDRESS_DELETED_FULL: "Address deleted successfully.",
  ADDRESS_DELETED: "Address deleted",
  DELIVERY_LOCATION_UPDATED: "Delivery location updated",
  DELIVERY_ADDRESS_UPDATED: "Delivery address updated",
  ADDED_TO_BASKET: "Added to basket",
  COUPON_APPLIED: "Coupon applied successfully",
  COUPON_REMOVED: "Coupon removed",
  PAYMENT_SUCCESSFUL: "Payment successful",
  MONEY_ADDED_WALLET: "Money added to wallet",
  SUBSCRIPTION_RESUMED: "Subscription resumed",
  SUBSCRIPTION_UPDATED: "Subscription updated",
  ACCOUNT_DELETED: "Account deleted successfully",
  MESSAGE_SENT: "Message sent successfully",
  COPIED: "Copied!",
  LOCATION_PERMISSION_DENIED_STILL_MANUAL:
    "Location permission denied. You can still enter address manually.",
  LOCATION_PERMISSION_DENIED_MANUAL:
    "Location permission denied. You can enter address manually.",
  FAILED_GET_LOCATION: "Failed to get location",
  ENTER_FULL_NAME: "Please enter your full name",
  PHONE_TEN_DIGITS: "Phone number must be 10 digits",
  VALID_COMPLETE_ADDRESS: "Please enter a valid complete address",
  PIN_SIX_DIGITS: "PIN code must be 6 digits",
  COULD_NOT_VERIFY_DELIVERY_AREA:
    "Could not verify delivery area. Check your connection and try again.",
  ADDRESS_OUTSIDE_DELIVERY: "Address is outside delivery area",
  FAILED_VALIDATE_ADDRESS: "Failed to validate address location",
  FAILED_UPDATE_ADDRESS: "Failed to update address",
  FAILED_ADD_ADDRESS: "Failed to add address",
  FAILED_SWITCH_ADDRESS: "Failed to switch address",
  TURN_ON_LOCATION: "Turn on location permission to use current location.",
  COULD_NOT_USE_CURRENT_LOCATION: "Could not use current location",
  FAILED_SET_DEFAULT: "Failed to set default",
  FAILED_DELETE_ADDRESS: "Failed to delete address",
  NOT_DELIVERING_LOCATION: "We are not delivering in this location yet.",
  FAILED_SAVE_ADDRESS: "Failed to save address. Please try again.",
  ENTER_FIRST_NAME: "Please enter your first name",
  ENTER_LAST_NAME: "Please enter your last name",
  ENTER_EMAIL: "Please enter your email",
  SELECT_GENDER: "Please select your gender",
  SPECIFY_GENDER: "Please specify your gender",
  FAILED_SAVE_DETAILS: "Failed to save details. Please try again.",
  NOT_ON_WHATSAPP_LOGIN:
    "This number is not registered on WhatsApp. Please use a WhatsApp-enabled number to log in.",
  NOT_ON_WHATSAPP_POLL:
    "This number is not on WhatsApp. Please try with another number.",
  CHOOSE_STORE_BEFORE_BASKET:
    "Choose your store or delivery area before adding items to the basket.",
  FAILED_ADD_TO_BASKET: "Failed to add to basket. Please try again.",
  COULD_NOT_SAVE_MESSAGE: "Could not save message.",
  COULD_NOT_UPDATE_BASKET: "Could not update basket.",
  COULD_NOT_UPDATE_QUANTITY: "Could not update quantity.",
  COULD_NOT_UPDATE_ITEM:
    "Could not update item. Pull to refresh and try again.",
  FAILED_REMOVE_ITEM: "Failed to remove item. Please try again.",
  COULD_NOT_UPDATE_MESSAGE: "Could not update message.",
  FAILED_UPDATE_MESSAGE: "Failed to update message. Please try again.",
  OFFLINE_CHECKOUT: "You're offline. Reconnect to continue checkout.",
  AUTH_REQUIRED: "Authentication required. Please login to continue.",
  ADD_ADDRESS_FROM_BOOK: "Please add a delivery address from Address Book.",
  GPS_NOT_SAVED:
    "Your current location is not saved. Choose a saved address or save this address then try again.",
  NOT_DELIVERING_FROM_STORE:
    "We are not delivering to this address from your current store. Open Account to change store or choose another address.",
  CHOOSE_DELIVERY_ADDRESS_CHECKOUT: "Choose a delivery address before checkout.",
  SELECT_THREE_DAYS: "Please select at least 3 delivery days.",
  WALLET_LOW_SUBSCRIPTION:
    "Your wallet balance is low. Please recharge your wallet before starting this subscription.",
  USE_SWITCH_STORE:
    'Use "Switch store" below for this delivery address or choose another address.',
  CHOOSE_TIME_SLOT: "Please choose an available delivery time slot.",
  DELIVERY_DATE_WITHIN_N: "Please choose a delivery date within the next {N} days.",
  BLOOMBAR_STOCK_CAP: "You've added all {N} we have left",
  NEAREST_STORE_OFFLINE:
    "Sorry for the inconvenience - the nearest store for this address is offline.",
  STORE_OFFLINE: "Sorry for the inconvenience - this store is currently offline.",
  COULD_NOT_VERIFY_STORE: "Could not verify the store for this delivery address.",
  COULD_NOT_SWITCH_STORE_ADDRESS: "Could not switch store for this address.",
  PROMO_NOT_VALID_DAILY: "This promo is not valid on Genda Phool Daily.",
  COUPON_NOT_APPLICABLE: "This coupon is not applicable.",
  FAILED_REMOVE_PROMO: "Failed to remove promo code.",
  ADDRESS_OUTSIDE_OUR_AREA:
    "This address is outside our delivery area. Please choose another address.",
  COULD_NOT_UPDATE_DELIVERY_DETAILS:
    "We could not update your delivery details. Please try again.",
  VALID_TOP_UP_AMOUNT: "Enter a valid top-up amount",
  PAYMENT_NOT_COMPLETED: "Payment could not be completed. Please try again.",
  PAYMENT_NOT_CHARGED:
    "Payment could not be completed. You were not charged. Please try again.",
  PAYMENT_NOT_CONFIRMED:
    "We could not confirm your payment. If money was debited check My Orders or your bank; refunds usually arrive within a few days.",
  COULD_NOT_RESUME: "Could not resume",
  FAILED_SWITCH_STORE: "Failed to switch store",
  STORE_OFFLINE_CHOOSE_ANOTHER:
    "This store is offline. Please choose another store.",
  COULD_NOT_UPDATE_BASKET_STORE: "Could not update your basket for this store.",
  STORE_OUTSIDE_RANGE:
    "This store is outside the delivery range for your address. Update your address or choose a closer store.",
  ALLOW_PHOTOS_PROFILE: "Allow access to your photos to change your profile picture.",
  ALLOW_CAMERA_PROFILE: "Allow camera access to take a profile picture.",
  IMAGE_UNDER_5MB: "Each image must be under 5MB",
  ALLOW_PHOTOS_SUPPORT:
    "Allow photo access in Settings to attach an image to your message.",
  FAILED_SEND_MESSAGE: "Failed to send message. Please try again.",
  CANNOT_OPEN_INVOICE: "Cannot open invoice link.",
  TOO_MANY_REQUESTS: "Too many requests. Please wait a moment and try again.",
  SERVICE_UNAVAILABLE: "Service temporarily unavailable. Please try again shortly.",
  NETWORK_ISSUE: "Network issue or timeout. Check your connection and try again.",
  OTP_DELIVERY_FAILED: "OTP delivery failed. Please tap Resend in a moment.",
  PRESS_AGAIN_TO_EXIT: "Press again to exit",
} as const;

/** Flat list for toast approval policy (excludes template with `{N}`). */
export const ALL_REQUIRED_TOAST_MESSAGES: readonly string[] = Object.values(
  REQUIRED_TOAST,
).filter((m) => !m.includes("{N}"));
