/**
 * BloomBar pending-payment stash and guest recovery.
 *
 * Why this is separate from utils/pendingPayments.ts rather than an extra `kind`
 * field on it: that module and PaymentRecoveryProvider are both auth-coupled — the
 * provider opens with `if (!isLoggedIn) return;` and recovery routes into
 * paymentService.verifyPayment / walletService.recoverPendingPayment, both of which
 * need a JWT. BloomBar is a guest flow, so it can use neither. Relaxing that auth
 * gate would change live store and wallet recovery behaviour, which is the one thing
 * this work must not do. The cost of keeping them apart is this file.
 *
 * The DISTINCT storage key is the isolation mechanism, and it is doing real work:
 * PaymentRecoveryProvider is mounted app-wide in App.tsx, so it runs on BloomBar
 * routes too. Store recovery reads only PENDING_PAYMENTS_KEY ('pending_payments')
 * and clearPendingPayments() removes only that key, so neither side can ever see —
 * let alone POST — the other's razorpay_order_id. Never import storePendingPayment
 * here: it fires fireAndForgetKeepaliveRecovery against the store/wallet endpoints.
 */
import { base44 } from '../services/bloombar.service';

/** Deliberately NOT 'pending_payments' — see the note above. */
export const BLOOMBAR_PENDING_KEY = 'bloombar_pending_payment';

/** Razorpay orders stop being payable long before this; a stale entry just wastes a poll. */
export const BLOOMBAR_PENDING_TTL_MS = 24 * 60 * 60 * 1000;

export interface BloomBarPendingPayment {
  razorpay_order_id: string;
  /** Absent when the handler never ran — dismissal, or a killed tab. */
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  timestamp: number;
}

export interface BloomBarRecoveryResult {
  recovered: boolean;
  orderNumber?: string;
}

/**
 * localStorage throws in private-mode Safari and when site data is blocked. A
 * recovery convenience must never take the checkout page down with it, so every
 * read and write here is guarded and degrades to "no stash".
 */
function readStash(): BloomBarPendingPayment | null {
  try {
    const raw = localStorage.getItem(BLOOMBAR_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BloomBarPendingPayment;
    if (!parsed?.razorpay_order_id || typeof parsed.timestamp !== 'number') return null;
    if (Date.now() - parsed.timestamp > BLOOMBAR_PENDING_TTL_MS) {
      clearBloomBarPending();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getBloomBarPending(): BloomBarPendingPayment | null {
  return readStash();
}

/**
 * Called BEFORE the Razorpay modal opens. From this point the order can be recovered
 * without the handler ever running, which is the whole failure this addresses.
 */
export function storeBloomBarPending(razorpayOrderId: string): void {
  try {
    localStorage.setItem(
      BLOOMBAR_PENDING_KEY,
      JSON.stringify({ razorpay_order_id: razorpayOrderId, timestamp: Date.now() }),
    );
  } catch {
    /* stash unavailable — the webhook and reconcile still create the order */
  }
}

/** Upgrade the stash with the ids the handler received, so recovery can retry verify. */
export function attachBloomBarPaymentIds(ids: {
  razorpay_payment_id: string;
  razorpay_signature: string;
}): void {
  const existing = readStash();
  if (!existing) return;
  try {
    localStorage.setItem(
      BLOOMBAR_PENDING_KEY,
      JSON.stringify({ ...existing, ...ids }),
    );
  } catch {
    /* no-op */
  }
}

export function clearBloomBarPending(): void {
  try {
    localStorage.removeItem(BLOOMBAR_PENDING_KEY);
  } catch {
    /* no-op */
  }
}

/**
 * Two-step recovery, same shape as the store's tryRecoverCartPayment: verify first
 * when we hold the signature, then fall back to polling.
 *
 * `sync` is passed on the status poll so Razorpay itself is consulted for the window
 * before the webhook lands. Both paths are idempotent server-side — fulfilment locks
 * the Payment row and returns the existing order if one exists — so racing the
 * webhook here is safe and expected.
 */
export async function tryRecoverBloomBarPayment(): Promise<BloomBarRecoveryResult> {
  const pending = readStash();
  if (!pending) return { recovered: false };

  if (pending.razorpay_payment_id && pending.razorpay_signature) {
    try {
      const order = await base44.entities.Order.verify({
        razorpay_order_id: pending.razorpay_order_id,
        razorpay_payment_id: pending.razorpay_payment_id,
        razorpay_signature: pending.razorpay_signature,
      });
      if (order?.order_number) {
        clearBloomBarPending();
        return { recovered: true, orderNumber: order.order_number };
      }
    } catch {
      /* fall through to the poll — verify is the optimisation, not the authority */
    }
  }

  try {
    const status = await base44.entities.Order.paymentStatus(pending.razorpay_order_id, {
      sync: true,
    });
    if (status.status === 'success' && status.order_number) {
      clearBloomBarPending();
      return { recovered: true, orderNumber: status.order_number };
    }
    // 'failed' is a settled outcome (underpayment refusal) — stop polling for it.
    if (status.status === 'failed') {
      clearBloomBarPending();
    }
  } catch {
    /* 404 means no such BloomBar checkout; anything else is transient. Keep the
       stash either way — the TTL prunes it, and a wrong drop loses the recovery. */
  }

  return { recovered: false };
}
