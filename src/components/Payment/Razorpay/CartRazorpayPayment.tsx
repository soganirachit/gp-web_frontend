import React, { useEffect, useRef, useState, forwardRef } from "react";
import Spinner from "../../common/Spinner";
import { loadRazorpayScript } from "../../../lib/razorpayLoader";


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

const CartRazorpayPayment = forwardRef<HTMLButtonElement, CartRazorpayPaymentProps>(({
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
}, ref) => {
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      await loadRazorpayScript();

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
            if (isMountedRef.current) {
              setIsLoading(false);
            }
            onError(new Error("Payment cancelled by user"));
          },
        },
      };

      if (typeof window.Razorpay !== 'function') {
        throw new Error('Payment gateway is not ready. Please try again.');
      }

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

  return (
    <button
      ref={ref}
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
});

export default CartRazorpayPayment;





