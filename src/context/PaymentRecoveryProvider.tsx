import { ReactNode, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  getPendingPayments,
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

  const maybeRecover = useCallback(async () => {
    if (!isLoggedIn || !navigator.onLine) return;
    if (getPendingPayments().length === 0) return;

    const now = Date.now();
    if (now - lastRecoveryAtRef.current < RECOVERY_DEBOUNCE_MS) return;
    lastRecoveryAtRef.current = now;

    await recoverPendingPayments();
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

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onResume);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('online', onOnline);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onResume);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('online', onOnline);
    };
  }, [isLoggedIn, maybeRecover]);

  return <>{children}</>;
}
