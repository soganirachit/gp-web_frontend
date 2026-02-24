import { useEffect, useState } from "react";

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
  modal?: {
    ondismiss: () => void;
  };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, callback: Function) => void;
}

interface CartRazorpayPaymentProps {
  razorpayOrderId: string;
  amount: number; // in paise
  currency: string;
  razorpayKey: string;
  customerName?: string;
  customerEmail?: string;
  customerContact?: string;
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

const CartRazorpayPayment: React.FC<CartRazorpayPaymentProps> = ({
  razorpayOrderId,
  amount,
  currency,
  razorpayKey,
  customerName,
  customerEmail,
  customerContact,
  onSuccess,
  onError,
  className = "w-full py-3 bg-[#FF5722] text-white rounded-lg font-medium",
  buttonText = "Pay Now",
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = () => {
    try {
      setIsLoading(true);

      const options: RazorpayOptions = {
        key: razorpayKey,
        amount: amount,
        currency: currency,
        name: "Genda Phool",
        description: "Store Product Payment",
        order_id: razorpayOrderId,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerContact,
        },
        theme: {
          color: "#2A6B28",
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
            setIsLoading(false);
            onError(new Error("Payment cancelled by user"));
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      onError(
        error instanceof Error
          ? error
          : new Error("Payment initialization failed")
      );
    }
  };

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <button
      onClick={handlePayment}
      className={className}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        buttonText
      )}
    </button>
  );
};

export default CartRazorpayPayment;



