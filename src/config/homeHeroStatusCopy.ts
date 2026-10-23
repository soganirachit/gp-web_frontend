export const STORE_OFFLINE_HERO_TITLE = "Currently offline";
export const STORE_OFFLINE_HERO_SUBTITLE = "We will be back soon";

export const STORE_OFFLINE_CART_TITLE = "Store is currently offline";
export const STORE_OFFLINE_CART_BODY =
  "We will be back soon. You can keep items in your basket, but placing an order isn't available right now.";

/** Checkout / subscribe CTA only — never use this to block Add to Basket. */
export const STORE_OFFLINE_ORDER_BUTTON_LABEL = "Store offline";

export function comingSoonGreeting(firstName?: string): string {
  const name = firstName?.trim() || "there";
  return `Coming soon, ${name}!`;
}

export const AREA_COMING_SOON_HERO_TITLE = "Coming soon, there!";
export const AREA_COMING_SOON_MESSAGE =
  "We'll be in your neighbourhood soon with a basket of fresh flowers!";
export const AREA_COMING_SOON_HINT = "Try changing your location";

/** @deprecated Use AREA_COMING_SOON_HINT. */
export const AREA_COMING_SOON_HERO_SUBTITLE = AREA_COMING_SOON_HINT;

export type HomeHeroStatusVariant = "store_offline" | "area_coming_soon";
