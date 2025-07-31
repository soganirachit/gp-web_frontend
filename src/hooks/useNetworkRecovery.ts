import { useState, useEffect, useCallback } from 'react';

interface PendingPayment {
  id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  amount: number;
  timestamp: number;
}

const PENDING_PAYMENTS_KEY = 'pending_payments';
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 2000;

export const useNetworkRecovery = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRecovering, setIsRecovering] = useState(false);

  // Store pending payment
  const storePendingPayment = useCallback((payment: Omit<PendingPayment, 'id' | 'timestamp'>) => {
    const pendingPayment: PendingPayment = {
      ...payment,
      id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    const existingPayments = getPendingPayments();
    const updatedPayments = [...existingPayments, pendingPayment];
    localStorage.setItem(PENDING_PAYMENTS_KEY, JSON.stringify(updatedPayments));
    
    return pendingPayment.id;
  }, []);

  // Get pending payments
  const getPendingPayments = useCallback((): PendingPayment[] => {
    try {
      const stored = localStorage.getItem(PENDING_PAYMENTS_KEY);
      if (!stored) return [];
      
      const payments: PendingPayment[] = JSON.parse(stored);
      // Remove payments older than 1 hour
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      return payments.filter(payment => payment.timestamp > oneHourAgo);
    } catch {
      return [];
    }
  }, []);

  // Remove pending payment
  const removePendingPayment = useCallback((paymentId: string) => {
    const existingPayments = getPendingPayments();
    const updatedPayments = existingPayments.filter(p => p.id !== paymentId);
    localStorage.setItem(PENDING_PAYMENTS_KEY, JSON.stringify(updatedPayments));
  }, [getPendingPayments]);

  // Clear all pending payments
  const clearPendingPayments = useCallback(() => {
    localStorage.removeItem(PENDING_PAYMENTS_KEY);
  }, []);

  // Network status listeners
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

  // Retry with exponential backoff
  const retryWithBackoff = useCallback(async (
    operation: () => Promise<boolean>,
    maxAttempts: number = MAX_RETRY_ATTEMPTS
  ): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (!navigator.onLine) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        continue;
      }

      try {
        const success = await operation();
        if (success) return true;
      } catch (error) {
        console.error(`Retry attempt ${attempt} failed:`, error);
      }

      if (attempt < maxAttempts) {
        // Exponential backoff: 2s, 4s, 8s, 16s, 32s
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return false;
  }, []);

  return {
    isOnline,
    isRecovering,
    setIsRecovering,
    storePendingPayment,
    getPendingPayments,
    removePendingPayment,
    clearPendingPayments,
    retryWithBackoff
  };
};