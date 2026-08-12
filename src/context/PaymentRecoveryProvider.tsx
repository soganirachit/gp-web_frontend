import { ReactNode, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  flushPendingPaymentsKeepalive,
  getPendingPayments,
  PENDING_PAYMENTS_KEY,
  recoverPendingPayments,
} from '../utils/pendingPayments';

interface PaymentRecoveryProviderProps {
  children: ReactNode;
}

/**
 * Global pending-payment recovery — no UI.
 * Runs on startup, app resume, and network reconnect.
 */
export function PaymentRecoveryProvider({ children }: PaymentRecoveryProviderProps) {
  const { isLoggedIn } = useAuth();
  const lastRecoveryAtRef = useRef(0);
  const RECOVERY_DEBOUNCE_MS = 1500;
  const RECOVERY_INTERVAL_MS = 12000;

  const maybeRecover = useCallback(async () => {
    if (!isLoggedIn || !navigator.onLine) return;
    if (getPendingPayments().length === 0) return;

    const now = Date.now();
    if (now - lastRecoveryAtRef.current < RECOVERY_DEBOUNCE_MS) return;
    lastRecoveryAtRef.current = now;

    const result = await recoverPendingPayments();
    if (
      result.recoveredCount > 0 &&
      document.visibilityState !== 'visible' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      const msg =
        result.walletRecoveredCount > 0
          ? `Payment confirmed: ${result.walletRecoveredCount} wallet recharge completed.`
          : `Payment confirmed: ${result.cartRecovered.length} order(s) placed.`;
      try {
        new Notification('Genda Phool', { body: msg });
      } catch {
        /* no-op */
      }
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const startupTimer = window.setTimeout(() => {
      void maybeRecover();
    }, 1000);

    return () => window.clearTimeout(startupTimer);
  }, [isLoggedIn, maybeRecover]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const timer = window.setInterval(() => {
      void maybeRecover();
    }, RECOVERY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isLoggedIn, maybeRecover]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const onResume = () => {
      void maybeRecover();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onResume();
      }
    };

    const onPageShow = () => {
      onResume();
    };

    const onOnline = () => {
      void maybeRecover();
    };

    const onPageHide = () => {
      // Best-effort flush before app/tab is backgrounded or closed.
      flushPendingPaymentsKeepalive();
      void maybeRecover();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === PENDING_PAYMENTS_KEY) {
        void maybeRecover();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onResume);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('online', onOnline);
    window.addEventListener('storage', onStorage);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onResume);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('storage', onStorage);
    };
  }, [isLoggedIn, maybeRecover]);

  return <>{children}</>;
}
