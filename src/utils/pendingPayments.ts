/**
 * Shared pending Razorpay payment storage and global recovery.
 * Used by Cart, Wallet, and PaymentRecoveryProvider.
 */
import { paymentService } from '../services/payment.service';
import { walletService } from '../services/wallet.service';

export interface PendingPayment {
  id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  amount: number;
  timestamp: number;
}

export const PENDING_PAYMENTS_KEY = 'pending_payments';

/** Pending payments older than this are ignored and pruned from storage. */
export const PENDING_PAYMENT_TTL_MS = 24 * 60 * 60 * 1000;

const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 2000;

let recoveryInFlight: Promise<PendingRecoveryResult> | null = null;

export interface PendingRecoveryResult {
  recoveredCount: number;
  cartRecovered: Array<{ orderNumber: string; amount: number }>;
  walletRecoveredCount: number;
}

export const CART_PAYMENT_RECOVERED_EVENT = 'gp:pending-cart-payment-recovered';
export const WALLET_PAYMENT_RECOVERED_EVENT = 'gp:wallet-payments-recovered';

const PENDING_CART_RECOVERED_SESSION_KEY = 'gp:pending-cart-recovered';

export interface PendingCartRecoveredSession {
  orderNumber: string;
  amount: number;
  at: number;
}

function stashCartRecoveredForBasket(orderNumber: string, amount: number): void {
  try {
    const payload: PendingCartRecoveredSession = {
      orderNumber,
      amount,
      at: Date.now(),
    };
    sessionStorage.setItem(PENDING_CART_RECOVERED_SESSION_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota errors */
  }
}

/** Basket pages call on mount if global recovery completed before the listener attached. */
export function consumePendingCartRecoveredSession(): PendingCartRecoveredSession | null {
  try {
    const raw = sessionStorage.getItem(PENDING_CART_RECOVERED_SESSION_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_CART_RECOVERED_SESSION_KEY);
    const parsed = JSON.parse(raw) as PendingCartRecoveredSession;
    if (!parsed?.orderNumber) return null;
    if (Date.now() - (parsed.at ?? 0) > PENDING_PAYMENT_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readRawPendingPayments(): PendingPayment[] {
  try {
    const stored = localStorage.getItem(PENDING_PAYMENTS_KEY);
    if (!stored) return [];
    const payments = JSON.parse(stored) as PendingPayment[];
    if (!Array.isArray(payments)) return [];
    return payments;
  } catch {
    return [];
  }
}

function writePendingPayments(payments: PendingPayment[]): void {
  if (payments.length === 0) {
    localStorage.removeItem(PENDING_PAYMENTS_KEY);
    return;
  }
  localStorage.setItem(PENDING_PAYMENTS_KEY, JSON.stringify(payments));
}

/** Returns non-expired pending payments and prunes expired entries from storage. */
export function getPendingPayments(): PendingPayment[] {
  const payments = readRawPendingPayments();
  const cutoff = Date.now() - PENDING_PAYMENT_TTL_MS;
  const active = payments.filter((p) => p.timestamp > cutoff);
  if (active.length !== payments.length) {
    writePendingPayments(active);
  }
  return active;
}

export function storePendingPayment(
  payment: Omit<PendingPayment, 'id' | 'timestamp'>,
): string {
  const pendingPayment: PendingPayment = {
    ...payment,
    id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };
  const existing = getPendingPayments();
  writePendingPayments([...existing, pendingPayment]);
  return pendingPayment.id;
}

export function removePendingPayment(paymentId: string): void {
  const updated = getPendingPayments().filter((p) => p.id !== paymentId);
  writePendingPayments(updated);
}

export function clearPendingPayments(): void {
  localStorage.removeItem(PENDING_PAYMENTS_KEY);
}

export async function retryWithBackoff(
  operation: () => Promise<boolean>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (!navigator.onLine) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      continue;
    }

    try {
      const success = await operation();
      if (success) return true;
    } catch (error) {
      console.error(`Retry attempt ${attempt} failed:`, error);
    }

    if (attempt < maxAttempts) {
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return false;
}

async function tryRecoverCartPayment(
  payment: PendingPayment,
): Promise<{ recovered: boolean; orderNumber?: string }> {
  const verifyPayload = {
    razorpay_order_id: payment.razorpay_order_id,
    razorpay_payment_id: payment.razorpay_payment_id,
    razorpay_signature: payment.razorpay_signature,
  };

  try {
    const res = await paymentService.verifyPayment(verifyPayload);
    if (res.order?.order_number) {
      return { recovered: true, orderNumber: res.order.order_number };
    }
  } catch {
    /* fall through to poll */
  }

  try {
    const status = await paymentService.pollUntilFulfilled(
      payment.razorpay_order_id,
      5,
      2000,
    );
    if (status?.order_number) {
      return { recovered: true, orderNumber: status.order_number };
    }
  } catch {
    /* fall through */
  }

  return { recovered: false };
}

async function tryRecoverWalletPayment(payment: PendingPayment): Promise<boolean> {
  return walletService.recoverPendingPayment({
    razorpay_payment_id: payment.razorpay_payment_id,
    razorpay_order_id: payment.razorpay_order_id,
    razorpay_signature: payment.razorpay_signature,
    amount: payment.amount,
  });
}

function dispatchCartRecovered(orderNumber: string, amount: number): void {
  stashCartRecoveredForBasket(orderNumber, amount);
  window.dispatchEvent(
    new CustomEvent(CART_PAYMENT_RECOVERED_EVENT, {
      detail: { orderNumber, amount },
    }),
  );
}

function dispatchWalletRecovered(count: number): void {
  window.dispatchEvent(
    new CustomEvent(WALLET_PAYMENT_RECOVERED_EVENT, {
      detail: { recoveredCount: count },
    }),
  );
}

/**
 * Recover all pending payments. Cart paths run before wallet paths per entry.
 * Uses a module-level mutex to prevent concurrent recovery runs.
 */
export async function recoverPendingPayments(): Promise<PendingRecoveryResult> {
  if (recoveryInFlight) {
    return recoveryInFlight;
  }

  const run = async (): Promise<PendingRecoveryResult> => {
    const result: PendingRecoveryResult = {
      recoveredCount: 0,
      cartRecovered: [],
      walletRecoveredCount: 0,
    };

    if (!localStorage.getItem('access_token')) {
      return result;
    }

    const pending = getPendingPayments();
    if (pending.length === 0) {
      return result;
    }

    for (const payment of pending) {
      try {
        let cartAttempt: { recovered: boolean; orderNumber?: string } = { recovered: false };
        const cartOk = await retryWithBackoff(async () => {
          cartAttempt = await tryRecoverCartPayment(payment);
          return cartAttempt.recovered;
        }, 3);
        if (cartOk) {
          removePendingPayment(payment.id);
          result.recoveredCount += 1;
          const amountRupees = payment.amount / 100;
          if (cartAttempt.orderNumber) {
            result.cartRecovered.push({
              orderNumber: cartAttempt.orderNumber,
              amount: amountRupees,
            });
            dispatchCartRecovered(cartAttempt.orderNumber, amountRupees);
          }
          continue;
        }
      } catch (error) {
        console.error('Cart pending payment recovery failed:', payment.razorpay_order_id, error);
      }

      try {
        const walletOk = await retryWithBackoff(
          async () => tryRecoverWalletPayment(payment),
          3,
        );
        if (walletOk) {
          removePendingPayment(payment.id);
          result.recoveredCount += 1;
          result.walletRecoveredCount += 1;
        }
      } catch (error) {
        console.error('Wallet pending payment recovery failed:', payment.razorpay_payment_id, error);
      }
    }

    if (result.walletRecoveredCount > 0) {
      dispatchWalletRecovered(result.walletRecoveredCount);
    }

    return result;
  };

  recoveryInFlight = run().finally(() => {
    recoveryInFlight = null;
  });

  return recoveryInFlight;
}
