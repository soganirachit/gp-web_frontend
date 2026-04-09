import { useEffect, useState } from "react";
import Spinner from "../../common/Spinner";
import { loadRazorpayScript } from "../../../lib/razorpayLoader";
import { walletService } from "../../../services/wallet.service";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

// Type declaration for Razorpay
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayResponse) => void;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, callback: Function) => void;
  // Add other methods if needed
}

interface RazorpayPaymentProps {
  amount: number;
  purpose?: string;
  onSuccess: (data: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    payment_status: string;
  }) => void;
  onError: (error: Error) => void;
  className?: string;
  buttonText?: string;
  disabled?: boolean;
}

const RazorpayPayment: React.FC<RazorpayPaymentProps> = ({
  amount,
  purpose = "wallet_recharge",
  onSuccess,
  onError,
  className = "w-full py-3 bg-[#FF5722] text-white rounded-lg font-medium",
  buttonText = "Pay Now",
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      const data = await walletService.createRazorpayOrder(amount, purpose);

      if (!data.order?.id) {
        throw new Error("Could not create Razorpay order");
      }

      await loadRazorpayScript();

      const { order, key_id, customer } = data;

      const options = {
        key: key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Genda Phool",
        description: purpose === "store_product_payment" ? "Store Product Payment" : "Wallet Recharge",
        order_id: order.id,
        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.contact,
        },
        notes: order.notes,
        theme: {
          color: "#FFFBEB",
        },
        handler: function (response: RazorpayResponse) {
          // Payment completed successfully on Razorpay side
          onSuccess({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            payment_status: "completed",
          });
        },
        modal: {
          ondismiss: function () {
            // Payment modal was closed by user
            onError(new Error("Payment cancelled by user"));
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
    } catch (error) {
      onError(
        error instanceof Error
          ? error
          : new Error("Payment initialization failed")
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRazorpayScript().catch(() => {});
  }, []);

  return (
    <button
      onClick={handlePayment}
      className={className}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <Spinner size={24} variant="light" className="flex-shrink-0" />
      ) : (
        buttonText
      )}
    </button>
  );
};

export default RazorpayPayment;
