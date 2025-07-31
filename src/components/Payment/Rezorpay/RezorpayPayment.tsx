import { useEffect, useState } from "react";
import axios from "axios";

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
      // Call your backend to create an order
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/wallet/create-razorpay-order`,
        { amount },
        {
          headers: {
            Authorization: localStorage.getItem("token"), // Your auth token
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message);
      }

      const { order, key_id, customer } = response.data;

      const options = {
        key: key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Genda Phool",
        description: "Wallet Recharge",
        order_id: order.id,
        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.contact,
        },
        notes: order.notes,
        theme: {
          color: "#3399cc",
        },
        handler: function (response: RazorpayResponse) {
          // Since we're using webhooks for verification,
          // just pass payment details to the parent component
          onSuccess({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            payment_status: "initiated",
          });
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

export default RazorpayPayment;
