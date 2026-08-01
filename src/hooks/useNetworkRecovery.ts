import { useState, useEffect, useCallback } from 'react';
import {
  storePendingPayment,
  getPendingPayments,
  removePendingPayment,
  clearPendingPayments,
  retryWithBackoff,
  recoverPendingPayments,
  type PendingPayment,
} from '../utils/pendingPayments';

export type { PendingPayment };

export { recoverPendingPayments };

export const useNetworkRecovery = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const storePending = useCallback(
    (payment: Omit<PendingPayment, 'id' | 'timestamp'>) => storePendingPayment(payment),
    [],
  );

  const getPending = useCallback(() => getPendingPayments(), []);

  const removePending = useCallback(
    (paymentId: string) => removePendingPayment(paymentId),
    [],
  );

  const clearPending = useCallback(() => clearPendingPayments(), []);

  return {
    isOnline,
    isRecovering,
    setIsRecovering,
    storePendingPayment: storePending,
    getPendingPayments: getPending,
    removePendingPayment: removePending,
    clearPendingPayments: clearPending,
    retryWithBackoff,
    recoverPendingPayments,
  };
};
