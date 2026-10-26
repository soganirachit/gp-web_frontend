export interface TransactionType {
  amount: number;
  type: "CREDIT" | "DEBIT";
  description: string;
  walletId: string;
  balanceAfter: number;
  createdAt: string;
  referenceId: string;
  /** Backend wallet_transactions.status — failed top-ups appear without balance change */
  status?: "success" | "failed" | "pending" | string;
  /** Razorpay wallet top-up Payment row — used to poll /payments/razorpay/status/ */
  paymentId?: string;
  razorpayOrderId?: string;
  failureReason?: string;
}