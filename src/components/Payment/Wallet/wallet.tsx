import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IoWalletOutline, IoArrowBack, } from "react-icons/io5";

import { motion, AnimatePresence } from "framer-motion";
import { walletService } from "../../../services/wallet.service";
import { toast } from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";
import RazorpayPayment from "../../Payment/Rezorpay/RezorpayPayment";
import { IoWarningOutline } from "react-icons/io5";
import { IoMdArrowDown, IoMdArrowUp } from "react-icons/io";
import walletImage from '../../../assets/icon/Wallet.png'; 
import profileImage from '../../../assets/icon/Profile.png';
import BottomNav from "../../layout/BottomNav";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

interface CouponType {
  code: string;
  discount: number;
  description: string;
}

const AVAILABLE_COUPONS: CouponType[] = [
  { code: "FIRST50", discount: 50, description: "₹50 off on first recharge" },
  { code: "SAVE100", discount: 100, description: "₹100 off on recharge above ₹1000" },
  { code: "BONUS20", discount: 20, description: "Flat ₹20 off on any recharge" },
];

const Wallet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, } = useAuth();
  const [customAmount, setCustomAmount] = useState<string>("500");
  const [balance, setBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [showCoupons, setShowCoupons] = useState(false);
  const [, setSelectedCoupon] = useState<CouponType | null>(null);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login to access your wallet");
      navigate("/login", {
        state: {
          returnUrl: location.pathname,
          ...location.state,
        },
      });
      return;
    }

    // Fetch wallet balance if we have a token
    fetchWalletBalance();

    // Check for required amount from subscription
    const state = location.state as {
      requiredAmount?: number;
      returnUrl?: string;
      currentBalance?: number;
    } | null;
    if (state?.requiredAmount) {
      setCustomAmount(state.requiredAmount.toString());
      setReturnUrl(state.returnUrl || null);

      // Show recharge required message with balance details
      if (state.currentBalance !== undefined) {
        toast(
          () => (
            <div>
              <p>Current Balance: ₹{state.currentBalance}</p>
              <p>Required Amount: ₹{state.requiredAmount}</p>
              <p>Please add ₹{state.requiredAmount} to continue</p>
            </div>
          ),
          {
            icon: "💰",
            duration: 5000,
          }
        );
      }
    }
  }, [isLoggedIn, navigate, location.state, location.pathname]);

  const fetchWalletBalance = async () => {
    try {
      setIsLoadingBalance(true);
      const balance = await walletService.getWalletBalance();
      setBalance(balance);
    } catch (error: any) {
      if (error.message.includes("Session expired")) {
        localStorage.removeItem("token");
        toast.error("Session expired. Please login again.");
        navigate("/login", {
          state: {
            returnUrl: location.pathname,
            ...location.state,
          },
        });
      } else {
        toast.error("Failed to fetch wallet balance");
      }
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setCustomAmount(value);
    }
  };

  const handleQuickAmount = (amount: number) => {
    setCustomAmount(amount.toString());
  };

  const handleCouponSelect = (coupon: CouponType) => {
    setSelectedCoupon(coupon);
    setShowCoupons(false);
    toast.success(`Coupon ${coupon.code} applied successfully!`);
  };

  return (
    <div className="min-h-screen bg-[#FFFBEB]">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="hover:bg-gray-100 rounded-full p-2 transition-colors">
              <IoArrowBack className="text-xl md:text-2xl" />
            </button>
            <h1 className="text-xl md:text-2xl font-medium">Wallet</h1>
          </div>
          <div className="flex items-center gap-4">
            <img 
              src={walletImage} 
              alt="Wallet" 
              className="w-10 h-10 md:w-10 md:h-10" 
              onClick={() => navigate('/wallet')}
            />
            <img 
              src={profileImage} 
              alt="Profile" 
              className="w-6 h-6 md:w-8 md:h-8" 
              onClick={() => navigate('/account')}
            />
          </div>
        </div>

        {/* Balance Card */}
        <div className="mx-4 md:mx-6 bg-[#16A34A] text-white rounded-lg p-6 md:p-8 flex items-center gap-4">
          <div className="p-2 md:p-3 bg-white/20 rounded-lg">
            <IoWalletOutline className="text-2xl md:text-3xl" />
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-semibold">₹{isLoadingBalance ? "..." : balance}</div>
            <div className="text-sm md:text-base opacity-80">Available Balance</div>
          </div>
        </div>

        {/* Low Balance Alert */}
        {balance < 100 && (
          <div className="mx-4 md:mx-6 mt-4 bg-[#FFFFFF] p-4 md:p-5 rounded-lg flex items-start gap-3">
            <IoWarningOutline className="text-[#FF5722] text-xl md:text-2xl flex-shrink-0 mt-1" />
            <div className="text-sm md:text-base">
              <div className="text-[#FF5722] font-medium">Low Balance Alert</div>
              <div className="text-gray-600">Your wallet balance is below ₹100. Your subscription will stop after 3 deliveries</div>
            </div>
          </div>
        )}

        {/* Add Money Section */}
        <div className="mx-4 md:mx-6 mt-6">
          <h2 className="text-xl md:text-2xl font-medium mb-4">Add Money</h2>
          <div className="bg-white rounded-lg p-4 md:p-6">
            <div className="mb-4">
              <label className="block text-gray-600 mb-2 md:text-lg">Enter Amount</label>
              <input
                type="text"
                value={customAmount}
                onChange={handleAmountChange}
                className="w-full p-3 md:p-4 border border-gray-200 rounded-lg text-lg md:text-xl"
                placeholder="1000"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-3 md:gap-4 mb-6">
              {QUICK_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleQuickAmount(amount)}
                  className={`py-2 md:py-3 rounded-lg border ${
                    customAmount === amount.toString()
                      ? "border-[#FF5722] text-[#FF5722]"
                      : "border-gray-200 text-gray-600"
                  } md:text-lg`}
                >
                  ₹{amount}
                </button>
              ))}
            </div>

            {/* Proceed Button */}
            <RazorpayPayment
              amount={parseInt(customAmount)}
              onSuccess={async (_data) => {
                toast.success("Payment successful! Your wallet has been updated.");
                await fetchWalletBalance();
                if (returnUrl) {
                  navigate(returnUrl);
                }
              }}
              onError={(error) => {
                toast.error(error.message || "Payment failed. Please try again.");
              }}
              className="w-full py-3.5 md:py-4 bg-[#FF5722] text-white rounded-full font-medium md:text-lg"
              buttonText="Proceed to Pay"
            />
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="mx-4 md:mx-6 mt-8 mb-20">
          <h2 className="text-xl md:text-2xl font-medium mb-4">Recent Transactions</h2>
          <div className="space-y-3 md:space-y-4">
            <div className="bg-white p-4 md:p-5 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-[#E8F5E9] rounded-full">
                  <IoMdArrowDown className="text-[#4CAF50] md:text-xl" />
                </div>
                <div>
                  <div className="font-medium md:text-lg">Wallet Recharge</div>
                  <div className="text-sm md:text-base text-gray-500">10 May 2023 • 2:30 PM</div>
                </div>
              </div>
              <div className="text-[#4CAF50] font-medium md:text-lg">+₹1000</div>
            </div>

            <div className="bg-white p-4 md:p-5 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-[#FFF3E0] rounded-full">
                  <IoMdArrowUp className="text-[#FF5722] md:text-xl" />
                </div>
                <div>
                  <div className="font-medium md:text-lg">Brahma Pack Subscription</div>
                  <div className="text-sm md:text-base text-gray-500">9 May 2023 • 7:00 AM</div>
                </div>
              </div>
              <div className="text-[#FF5722] font-medium md:text-lg">-₹299</div>
            </div>

            <div className="bg-white p-4 md:p-5 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 md:p-3 bg-[#E8F5E9] rounded-full">
                  <IoMdArrowDown className="text-[#4CAF50] md:text-xl" />
                </div>
                <div>
                  <div className="font-medium md:text-lg">Cashback Credited</div>
                  <div className="text-sm md:text-base text-gray-500">5 May 2023 • 11:45 AM</div>
                </div>
              </div>
              <div className="text-[#4CAF50] font-medium md:text-lg">+₹500</div>
            </div>
          </div>
        </div>
      </div>

      {/* Coupon Modal */}
      <AnimatePresence>
        {showCoupons && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowCoupons(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 md:p-8 m-4 w-full max-w-md"
            >
              <h3 className="text-lg md:text-xl font-medium mb-4">Available Coupons</h3>
              <div className="space-y-3 md:space-y-4">
                {AVAILABLE_COUPONS.map((coupon) => (
                  <motion.div
                    key={coupon.code}
                    whileHover={{ scale: 1.02 }}
                    className="border rounded-lg p-4 md:p-5 cursor-pointer hover:border-green-500"
                    onClick={() => handleCouponSelect(coupon)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-green-600 md:text-lg">{coupon.code}</div>
                        <div className="text-sm md:text-base text-gray-600">{coupon.description}</div>
                      </div>
                      <div className="text-lg md:text-xl font-bold text-green-600">₹{coupon.discount}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        <div>
          <BottomNav />
        </div>
    </div>
  );
};

export default Wallet;