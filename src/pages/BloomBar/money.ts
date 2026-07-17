/**
 * Money and percentage formatting for BloomBar.
 *
 * Whole rupees render bare — "₹150", not "₹150.00" — since nearly every price
 * here is whole and the ".00" is just noise on a phone-sized card.
 *
 * Anything with paise still shows BOTH decimals: `toLocaleString` on its own
 * renders 0.2 as "0.2", which reads as a typo rather than a price, and discounts
 * do push prices below ₹1. So it's two decimals or none — never one.
 */
export const fmt = (n: number) => {
  const decimals = Number.isInteger(n) ? 0 : 2;
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/** Percentages without a pointless trailing ".0" — "80%", not "80.00%". */
export const fmtPct = (n: number) => String(Number(n.toFixed(2)));
