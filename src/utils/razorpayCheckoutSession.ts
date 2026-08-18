/** Set while Razorpay modal is open — skips slow global payment recovery on focus. */
let razorpayCheckoutOpenCount = 0;

export function markRazorpayCheckoutOpen(): void {
  razorpayCheckoutOpenCount += 1;
}

export function markRazorpayCheckoutClosed(): void {
  razorpayCheckoutOpenCount = Math.max(0, razorpayCheckoutOpenCount - 1);
}

export function isRazorpayCheckoutOpen(): boolean {
  return razorpayCheckoutOpenCount > 0;
}
