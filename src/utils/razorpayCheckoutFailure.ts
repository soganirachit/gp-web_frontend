import { REQUIRED_TOAST } from '../constants/requiredToastMessages';
import { paymentService, type PaymentStatusResponse } from '../services/payment.service';
import { removePendingPaymentsByOrderId } from './pendingPayments';
import { PAYMENT_MODAL_DISMISSED } from './razorpayModalDismiss';
import {
  markRazorpayCheckoutClosed,
  markRazorpayCheckoutOpen,
} from './razorpayCheckoutSession';

export { PAYMENT_MODAL_DISMISSED };

export function isPaymentModalDismissed(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message === PAYMENT_MODAL_DISMISSED;
}

/** User closed Razorpay (X → Yes exit) without a payment id — no status polling. */
export function handlePlainRazorpayDismiss(
  razorpayOrderId: string | null | undefined,
): void {
  markRazorpayCheckoutClosed();
  suppressPaymentRecoveryAfterDismiss();
  if (razorpayOrderId) {
    removePendingPaymentsByOrderId(razorpayOrderId);
    void paymentService.abandonCheckout(razorpayOrderId);
  }
}

let paymentRecoverySuppressedUntil = 0;

/** Skip global recovery polling briefly after user cancels Razorpay. */
export function suppressPaymentRecoveryAfterDismiss(ms = 60_000): void {
  paymentRecoverySuppressedUntil = Date.now() + ms;
}

export function isPaymentRecoverySuppressed(): boolean {
  return Date.now() < paymentRecoverySuppressedUntil;
}

export function markStoreCheckoutPaymentStarted(): void {
  markRazorpayCheckoutOpen();
}

export function getPlainDismissUserMessage(): string {
  return REQUIRED_TOAST.PAYMENT_NOT_CHARGED;
}

/** Bounded recovery when payment may have completed (verify failed / UPI on phone). */
export async function pollStoreCheckoutRecovery(
  razorpayOrderId: string,
  maxPolls = 5,
  intervalMs = 1000,
): Promise<PaymentStatusResponse | null> {
  return paymentService.pollUntilFulfilled(razorpayOrderId, maxPolls, intervalMs, {
    sync: true,
  });
}
