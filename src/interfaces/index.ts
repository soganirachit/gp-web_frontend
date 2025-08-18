export interface TransactionType {
  amount: number;
  type: "CREDIT" | "DEBIT";
  description: string;
  walletId: string;
  balanceAfter: number;
  createdAt: string;
  referenceId: string;
}