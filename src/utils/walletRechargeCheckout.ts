import { loadRazorpayScript } from "../lib/razorpayLoader";
import { walletService } from "../services/wallet.service";

/** Opens Razorpay for wallet top-up; returns true when payment is verified. */
export async function rechargeWalletInApp(amountRupees: number): Promise<boolean> {
  const effectiveAmount = Math.max(1, Math.ceil(amountRupees));
  const data = await walletService.createRazorpayOrder(
    effectiveAmount,
    "wallet_recharge",
  );

  if (!data.order?.id || !data.key_id) {
    throw new Error("Unable to start payment. Missing Razorpay order details.");
  }

  await loadRazorpayScript();

  const paymentResult = await new Promise<{
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }>((resolve, reject) => {
    const { order, key_id, customer } = data;
    const options = {
      key: key_id,
      amount: order.amount,
      currency: order.currency,
      name: "Genda Phool",
      description: "Wallet Recharge",
      order_id: order.id,
      prefill: {
        name: customer?.name,
        email: customer?.email,
        contact: customer?.contact,
      },
      notes: order.notes,
      theme: {
        color: "#FAA222",
      },
      handler: (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        resolve(response);
      },
      modal: {
        ondismiss: () => {
          reject(new Error("Payment cancelled by user"));
        },
      },
    };

    if (typeof window.Razorpay !== 'function') {
      reject(new Error("Razorpay SDK unavailable"));
      return;
    }
    const razorpayInstance = new window.Razorpay(options);
    razorpayInstance.open();
  });

  await walletService.verifyPayment({
    razorpay_payment_id: paymentResult.razorpay_payment_id,
    razorpay_order_id: paymentResult.razorpay_order_id,
    razorpay_signature: paymentResult.razorpay_signature,
    amount: effectiveAmount,
  });

  return true;
}
