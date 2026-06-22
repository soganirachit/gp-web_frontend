/** Stop words when matching typed address to map reverse-geocode. */
const STOPWORDS = new Set([
  "road",
  "rd",
  "street",
  "st",
  "nagar",
  "colony",
  "sector",
  "phase",
  "near",
  "opp",
  "opposite",
  "india",
  "rajasthan",
]);

export type MapPinAnchor = {
  lat: number;
  lng: number;
  formattedAddress: string;
  completeAddress: string;
  pincode?: string;
  city?: string;
  state?: string;
};

function tokenizeForMatch(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/**
 * Ensures the user-typed complete address refers to the same locality as the map pin.
 * Prevents saving a pin in Jaipur while typing an address in another city.
 */
export function validateTypedAddressMatchesMapPin(
  typedComplete: string,
  typedPincode: string,
  anchor: MapPinAnchor | null,
): { ok: true } | { ok: false; message: string } {
  const typed = typedComplete.trim();
  if (!typed || typed.length < 5) {
    return { ok: false, message: "Please enter a valid complete address" };
  }
  if (!anchor?.formattedAddress?.trim()) {
    return { ok: true };
  }

  const pin = typedPincode.replace(/\D/g, "").slice(0, 6);
  const anchorPin = (anchor.pincode || "").replace(/\D/g, "").slice(0, 6);
  if (anchorPin.length === 6 && pin.length === 6 && pin !== anchorPin) {
    return {
      ok: false,
      message: `ZIP code must match the map location (${anchorPin}). Move the pin or update your ZIP.`,
    };
  }

  const typedTokens = new Set(tokenizeForMatch(typed));
  const anchorText = [
    anchor.formattedAddress,
    anchor.completeAddress,
    anchor.city,
    anchor.state,
    anchor.pincode,
  ]
    .filter(Boolean)
    .join(" ");
  const anchorTokens = tokenizeForMatch(anchorText);
  if (anchorTokens.length === 0) {
    return { ok: true };
  }

  const overlap = anchorTokens.filter((t) => typedTokens.has(t));
  const required = Math.min(2, anchorTokens.length);
  if (overlap.length < required) {
    return {
      ok: false,
      message:
        "Complete address must match the area pinned on the map. Move the pin or edit the address to the same locality.",
    };
  }

  return { ok: true };
}
