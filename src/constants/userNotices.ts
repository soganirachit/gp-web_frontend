/** Longer copy for inline `UserNotice` blocks (not toast-length). */

export const USER_NOTICES = {
  PAYMENT_CANCELLED_TITLE: "Payment cancelled",
  PAYMENT_CANCELLED_BODY:
    "You closed the payment screen. No money was taken. Tap Checkout when you are ready to pay again.",

  PAYMENT_CONFIRMING_TITLE: "Payment received — confirming order",
  PAYMENT_CONFIRMING_BODY:
    "We are confirming your order with our server. This usually takes a few seconds. Please stay on this screen.",

  PAYMENT_UNCONFIRMED_TITLE: "We could not confirm your order yet",
  PAYMENT_UNCONFIRMED_BODY:
    "If money was debited, it is usually refunded within a few days if the order did not complete. Check My Orders or tap Refresh below.",

  WALLET_TOPUP_FAILED_ROW:
    "Not charged. Tap Refresh or try again.",

  WALLET_TOPUP_PENDING_ROW:
    "We are still confirming this top-up. Tap Refresh on Wallet if the balance does not update.",

  PRODUCT_UNAVAILABLE_TITLE: "Product not available",
  PRODUCT_UNAVAILABLE_BODY:
    "This item is not sold at your current store or is out of stock. Browse similar products below.",

  CART_LINE_UNAVAILABLE_TITLE: "Item unavailable",
  CART_LINE_OUT_OF_STOCK:
    "is out of stock or no longer sold at your store. We will remove it from your basket.",
  CART_LINE_STORE_OFFLINE:
    "cannot be delivered right now because your store is offline. Remove it or try again when the store is open.",

  GPS_ADDRESS_TITLE: "Save your delivery location",
  GPS_ADDRESS_BODY:
    "Your current GPS pin is not saved as an address. Save it in Address Book before checkout.",

  ORDERS_LOAD_FAILED_TITLE: "Could not load orders",
  ORDERS_LOAD_FAILED_BODY:
    "Check your connection and try again. Your past orders are still safe on our servers.",

  CHAT_SEND_FAILED_TITLE: "Message not sent",
  CHAT_SEND_FAILED_BODY:
    "Your message was not delivered. Check your connection and tap Send again.",

  WALLET_DAILY_ONLY:
    "Wallet is part of GP Daily subscriptions. Store orders are paid at checkout with UPI/card.",
} as const;
