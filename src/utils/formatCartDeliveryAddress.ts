/**
 * Single-line delivery address for cart/checkout when city/state/pin are often
 * already duplicated inside street/area fields from the API.
 */
export type CartDeliveryAddressLike = {
  houseNo?: string;
  streetName?: string;
  area?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string | number;
};

function looseCompact(s: string): string {
  return s.toLowerCase().replace(/[\s,:-]+/g, '');
}

export function formatCartDeliveryAddress(address: CartDeliveryAddressLike | null): string {
  if (!address) return '';
  const street = [
    address.houseNo,
    address.streetName,
    address.area,
    address.landmark,
  ]
    .map((x) => (x == null ? '' : String(x).trim()))
    .filter(Boolean)
    .join(', ');
  const cityState = [address.city, address.state]
    .map((x) => (x == null ? '' : String(x).trim()))
    .filter(Boolean)
    .join(', ');
  const pin = String(address.pincode ?? '').trim();
  const tail =
    !cityState && !pin ? '' : !cityState ? pin : !pin ? cityState : `${cityState} - ${pin}`;
  if (!tail) return street;
  if (!street) return tail;
  const st = street.replace(/\s+/g, ' ').trim().toLowerCase();
  const ln = tail.replace(/\s+/g, ' ').trim().toLowerCase();
  if (st.includes(ln)) return street;
  if (looseCompact(st).includes(looseCompact(ln)) && looseCompact(ln).length >= 8) return street;
  return `${street}, ${tail}`;
}
