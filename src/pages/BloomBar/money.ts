/**
 * Money and percentage formatting for BloomBar.
 *
 * `n.toLocaleString('en-IN')` renders 0.2 as "0.2", which reads as a typo rather
 * than a price — a real problem once discounts push prices below ₹1. Always two
 * decimals.
 */
export const fmt = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Percentages without a pointless trailing ".0" — "80%", not "80.00%". */
export const fmtPct = (n: number) => String(Number(n.toFixed(2)));
