import React, { useState, useEffect } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { subscriptionService } from "../../services/subscription.service";
import { toast } from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import walletImage from "../../assets/icon/Wallet.png";
import profileImage from "../../assets/icon/Profile.png";
import BottomNavigation from "../layout/BottomNav";
import Low_Balance from "../../assets/icon/LowBalance.png";
import { IoArrowBack } from "react-icons/io5";
import Spinner from "../../components/common/Spinner";
import { format } from "date-fns";
interface Subscription {
  id: string;
  customerId: string;
  type: "DAILY" | "CUSTOM";
  status: "ACTIVE" | "PAUSED" | "CANCELLED" | "INACTIVE";
  startDate: Date;
  endDate?: Date;
  selectedDays: string[];
  basePackId: string;
  productDetails?: {
    name: string;
    description: string;
    imagesUrl: string[];
    contents: {
      id: string;
      name: string;
      quantity: number;
    }[];
  };
  orderContents?: {
    name: string;
    description: string;
    sellingPricePerPackDaily: number;
    sellingPricePerPackAlternate: number;
    contents: {
      id: string;
      name: string;
      quantity: number;
    }[];
  };
  deliveryAddress?: {
    id: string;
    houseNo: string;
    streetName: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    phoneNumber: string;
    societyName?: string;
    district?: string;
    isDefault: boolean;
  };
  amount?: number;
  createdAt: Date;
  walletBalance?: number;
  deliveryPreference?: string;
  deliveryDays?: string[];
}

const ManageMySubscription: React.FC = () => {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSuccessToast] = useState(false);

  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);

  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] =
    useState(false);
  const [balanceDetails] = useState({
    currentBalance: 0,
    requiredAmount: 0,
    shortageAmount: 0,
    subscriptionType: "Daily" as "DAILY" | "CUSTOM",
    days: 7,
  });

  const [cancellationReason, setCancellationReason] = useState("");
  const [, setShowReasonError] = useState(false);

  // Days of the week
  // const daysOfWeek = ['Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    fetchSubscriptionDetails();
  }, []);

  // Helper function to calculate next delivery date
  const calculateNextDeliveryDate = (subscription: Subscription) => {
    // If subscription is paused or inactive, return null
    if (subscription.status === "PAUSED" || subscription.status === "INACTIVE") {
      return null;
    }

    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Map days to numbers for calculation - handle various formats
    const dayMap: { [key: string]: number } = {
      'sunday': 0, 'sun': 0,
      'monday': 1, 'mon': 1,
      'tuesday': 2, 'tue': 2, 'tues': 2,
      'wednesday': 3, 'wed': 3,
      'thursday': 4, 'thu': 4, 'thur': 4, 'thurs': 4,
      'friday': 5, 'fri': 5,
      'saturday': 6, 'sat': 6
    };

    // For DAILY delivery preference or type
    if (subscription.deliveryPreference === "DAILY" || subscription.type === "DAILY") {
      // For daily delivery (Mon-Sat), find next weekday
      let nextDeliveryDate = new Date(today);
      nextDeliveryDate.setDate(today.getDate() + 1);
      
      // If tomorrow is Sunday, skip to Monday
      if (nextDeliveryDate.getDay() === 0) {
        nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 1);
      }
      
      return nextDeliveryDate;
    } 
    
    // For CUSTOM delivery preference or type
    if (subscription.deliveryPreference === "CUSTOM" || subscription.type === "CUSTOM") {
      let subscribedDays: number[] = [];
      
      // Try to get delivery days from multiple possible sources
      const deliveryDays = subscription.deliveryDays || subscription.selectedDays || [];
      
      if (deliveryDays.length > 0) {
        subscribedDays = deliveryDays.map(day => {
          const dayKey = day.toLowerCase().trim();
          return dayMap[dayKey] !== undefined ? dayMap[dayKey] : -1;
        }).filter(day => day !== -1);
      }
      
      // If no custom days found, default to Mon-Sun for custom subscriptions
      if (subscribedDays.length === 0) {
        subscribedDays = [1, 2, 3, 4, 5, 6, 7]; // Mon-Sun
      }

      // Find the next delivery day
      let daysToAdd = 1;
      
      // Look for the next subscribed day within the next 7 days
      while (daysToAdd <= 7) {
        const nextDay = (currentDay + daysToAdd) % 7;
        if (subscribedDays.includes(nextDay)) {
          const nextDeliveryDate = new Date(today);
          nextDeliveryDate.setDate(today.getDate() + daysToAdd);
          return nextDeliveryDate;
        }
        daysToAdd++;
      }
    }

    // Fallback: if no specific preference, default to tomorrow (skip Sunday)
    let nextDeliveryDate = new Date(today);
    nextDeliveryDate.setDate(today.getDate() + 1);
    
    // If tomorrow is Sunday, skip to Monday
    if (nextDeliveryDate.getDay() === 0) {
      nextDeliveryDate.setDate(nextDeliveryDate.getDate() + 1);
    }
    
    return nextDeliveryDate;
  };

  // Helper function to format next delivery display
  const getNextDeliveryDisplay = (subscription: Subscription) => {
    const nextDate = calculateNextDeliveryDate(subscription);
    
    if (!nextDate) {
      // Only show "No upcoming delivery" for paused/inactive subscriptions
      if (subscription.status === "PAUSED" || subscription.status === "INACTIVE") {
        return "No upcoming delivery";
      }
      // For active subscriptions, show default message
      return "Next: Tomorrow, 7:00 AM";
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Check if it's tomorrow
    if (nextDate.toDateString() === tomorrow.toDateString()) {
      return "Next: Tomorrow, 7:00 AM";
    } else {
      // Format the date
      const dayName = nextDate.toLocaleDateString('en-US', { weekday: 'long' });
      const formattedDate = format(nextDate, 'MMM d');
      return `Next: ${dayName}, ${formattedDate}, 7:00 AM`;
    }
  };

  const fetchSubscriptionDetails = async () => {
    try {
      setIsLoading(true);
      const fetchedSubscriptions =
        await subscriptionService.getCustomerSubscriptions();

      if (fetchedSubscriptions && fetchedSubscriptions.length > 0) {
        // Sort subscriptions: active first, then paused, then cancelled
        const sortedSubscriptions = fetchedSubscriptions.sort((a, b) => {
          if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
          if (a.status !== "ACTIVE" && b.status === "ACTIVE") return 1;
          if (a.status === "PAUSED" && b.status === "CANCELLED") return -1;
          if (a.status === "CANCELLED" && b.status === "PAUSED") return 1;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ); // Newest first
        });
        setSubscriptions(sortedSubscriptions);
        setSelectedSubscription(sortedSubscriptions[0]);
      } else {
        setSubscriptions([]);
        setSelectedSubscription(null);
        toast.success("You don't have any subscriptions");
      }
    } catch (error: any) {
      toast.error(
        error.message ||
        "Failed to fetch subscription details. Please try again later."
      );
      setSubscriptions([]);
      setSelectedSubscription(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    if (!selectedSubscription || !customStartDate) return;

    try {
      setIsLoading(true);

      // Calculate pause duration in days
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const resumeDate = new Date(customStartDate);
      resumeDate.setHours(0, 0, 0, 0);

      // Calculate the difference in days
      const diffTime = resumeDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 1) {
        alert("Resume date must be at least 1 day from today");
        return;
      }

      // Call the API to pause the subscription
      const response = await subscriptionService.pauseSubscription(
        selectedSubscription.id,
        diffDays
      );

      if (response.success) {
        setShowPauseModal(false);
        // Navigate to the paused subscription landing page
        navigate("/Pause-Subscription");
      } else {
        alert(response.error || "Failed to pause subscription");
      }
    } catch (error) {
      console.error("Error pausing subscription:", error);
      alert("An error occurred while pausing your subscription");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async (subscriptionId: string) => {
    try {
      await subscriptionService.toggleSubscriptionStatus(subscriptionId);
      await fetchSubscriptionDetails();
      alert("Subscription resumed successfully");
    } catch (error: any) {
      if (error.message?.includes("login")) {
        alert("Please login to resume subscription");
      } else {
        alert(error.message || "Failed to resume subscription");
      }
    }
  };

  const handleCancel = async () => {
    if (!cancellationReason.trim()) {
      setShowReasonError(true);
      return;
    }
    try {
      // Pass cancellation reason in the correct format
      await subscriptionService.cancelSubscription(
        selectedSubscription!.id,
        cancellationReason
      );
      setShowCancelModal(false);
      setCancellationReason("");
      // Navigate to cancel landing page instead of fetching subscriptions
      navigate("/cancel-subscription");
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel subscription");
    }
  };

  const handleRechargeWallet = () => {
    setShowInsufficientBalanceModal(false);
    navigate("/wallet", {
      state: {
        requiredAmount: balanceDetails.shortageAmount,
        currentBalance: balanceDetails.currentBalance,
        returnUrl: `/product/${selectedSubscription?.id}`,
        subscriptionType: selectedSubscription?.type,
        minimumDays: 7,
        maximumDays: selectedSubscription?.type === "DAILY" ? 30 : 14,
        totalRequired: balanceDetails.requiredAmount,
      },
    });
  };

  const renderSubscriptionCard = (subscription: Subscription) => {
    const formattedAmount = subscription?.amount
      ? subscription.amount.toFixed(2)
      : "0.00";
    const isActive = subscription.status === "ACTIVE";
    const isPaused =
      subscription.status === "PAUSED" || subscription.status === "INACTIVE";

    return (
      <div
        key={subscription.id}
        className="bg-white rounded-[16px] p-4 mb-3 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
            {subscription.productDetails?.imagesUrl ? (
              <img
                src={subscription.productDetails.imagesUrl[0]}
                alt={subscription.productDetails.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <span className="text-xl font-medium text-gray-400">
                  {subscription.productDetails?.name?.charAt(0) || "M"}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-medium text-[#1A1A1A] truncate">
                    {subscription.productDetails?.name || "Marigold Puja"}
                  </h3>
                  {isPaused && (
                    <span className="px-2 py-0.5 bg-[#FFF3CD] text-[#664D03] text-xs font-medium rounded-full">
                      Paused
                    </span>
                  )}
                  {isActive && (
                    <span className="px-2 py-0.5 bg-[#DCFCE7] text-[#166534] text-xs font-medium rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[#666666] text-sm">
                  {subscription.deliveryPreference === "DAILY"
                    ? "Daily • mon-sun"
                    : subscription.deliveryPreference === "CUSTOM" && subscription.deliveryDays?.length
                      ? `Custom • ${subscription.deliveryDays.map(day => day.toLowerCase()).join(", ")}`
                      : "Custom • No specific days"}
                </p>
              </div>
            </div>

            {/* Next delivery section - only show for active subscriptions */}
            {isActive && (
              <div className="flex items-center gap-2 mb-3">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15.8333 3.33337H4.16667C3.24619 3.33337 2.5 4.07957 2.5 5.00004V16.6667C2.5 17.5872 3.24619 18.3334 4.16667 18.3334H15.8333C16.7538 18.3334 17.5 17.5872 17.5 16.6667V5.00004C17.5 4.07957 16.7538 3.33337 15.8333 3.33337Z"
                    stroke="#666666"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13.3333 1.66663V4.99996"
                    stroke="#666666"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.66669 1.66663V4.99996"
                    stroke="#666666"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2.5 8.33337H17.5"
                    stroke="#666666"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-[#666666] text-xs">
                  {getNextDeliveryDisplay(subscription)}
                </p>
              </div>
            )}

            {/* Commented out the hardcoded next delivery for paused subscriptions */}
            {/* {isPaused && (
              <div className="flex items-center gap-2 mb-3">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15.8333 3.33337H4.16667C3.24619 3.33337 2.5 4.07957 2.5 5.00004V16.6667C2.5 17.5872 3.24619 18.3334 4.16667 18.3334H15.8333C16.7538 18.3334 17.5 17.5872 17.5 16.6667V5.00004C17.5 4.07957 16.7538 3.33337 15.8333 3.33337Z"
                    stroke="#666666"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13.3333 1.66663V4.99996"
                    stroke="#666666"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.66669 1.66663V4.99996"
                    stroke="#666666"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2.5 8.33337H17.5"
                    stroke="#666666"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-[#666666] text-xs">Next: Tomorrow, 7:00 AM</p>
              </div>
            )} */}

            <p className="text-[#FF5722] font-medium text-sm mb-3">
              ₹{formattedAmount}/pack
            </p>

            <div className="flex gap-2">
              {isActive && (
                <>
                  <button
                    onClick={() => {
                      setSelectedSubscription(subscription);
                      setShowPauseModal(true);
                    }}
                    className="flex-1 py-1.5 rounded-full bg-[#FFF3CD] text-[#FF5722] text-sm font-medium"
                  >
                    Pause
                  </button>
                  {/* <button
                    onClick={() => {
                      setSelectedSubscription(subscription);
                      setShowDetailsModal(true);
                    }}
                    className="flex-1 py-1.5 rounded-full border border-[#006D3B] text-[#006D3B] text-sm font-medium"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M14.166 2.5H5.83268C4.91221 2.5 4.16602 3.24619 4.16602 4.16667V15.8333C4.16602 16.7538 4.91221 17.5 5.83268 17.5H14.166C15.0865 17.5 15.8327 16.7538 15.8327 15.8333V4.16667C15.8327 3.24619 15.0865 2.5 14.166 2.5Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M7.5 5.83337H12.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M7.5 9.16663H12.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M7.5 12.5H10"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Modify
                    </div>
                  </button> */}
                  <button
                    onClick={() => {
                      setSelectedSubscription(subscription);
                      setShowCancelModal(true);
                    }}
                    className="flex-1 py-1.5 rounded-full border border-red-500 text-red-500 text-sm font-medium"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M15 5L5 15"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M5 5L15 15"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Cancel
                    </div>
                  </button>
                </>
              )}
              {isPaused && (
                <>
                  <button
                    onClick={() => handleResume(subscription.id)}
                    className="flex-1 py-1.5 rounded-full bg-[#006D3B] text-white text-sm font-medium"
                  >
                    Resume
                  </button>

                  {/* <button
                    onClick={() => {
                      setSelectedSubscription(subscription);
                      setShowDetailsModal(true);
                    }}
                    className="flex-1 py-1.5 rounded-full border border-[#1F2937] text-[#1F2937] text-sm font-medium"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M14.166 2.5H5.83268C4.91221 2.5 4.16602 3.24619 4.16602 4.16667V15.8333C4.16602 16.7538 4.91221 17.5 5.83268 17.5H14.166C15.0865 17.5 15.8327 16.7538 15.8327 15.8333V4.16667C15.8327 3.24619 15.0865 2.5 14.166 2.5Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M7.5 5.83337H12.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M7.5 9.16663H12.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M7.5 12.5H10"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Modify
                    </div>
                  </button> */}

                  <button
                    onClick={() => {
                      setSelectedSubscription(subscription);
                      setShowCancelModal(true);
                    }}
                    className="flex-1 py-1.5 rounded-full border border-red-500 text-red-500 text-sm font-medium"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M15 5L5 15"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M5 5L15 15"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Cancel
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={400} />
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFFBEB]">
        <div className="max-w-md mx-auto p-4">
          <div className="flex items-center mb-6">
            <button onClick={() => navigate(-1)} className="text-gray-600">
              <FaArrowLeft className="text-xl" />
            </button>
            <h1 className="ml-4 text-xl font-semibold">My Subscription</h1>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm text-center">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h2 className="text-xl font-semibold mb-2">No Subscriptions</h2>
            <p className="text-gray-600 mb-6">
              You don't have any subscriptions. Subscribe to a base pack to get
              started.
            </p>
            <button
              onClick={() => navigate("/products?category=pujaflowers")}
              className="bg-green-600 text-white py-3 px-6 rounded-lg font-medium"
            >
              Browse Subscribe Packs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBEB]">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <IoArrowBack className="text-xl md:text-2xl" />
            </button>
            <h1 className="text-xl md:text-2xl font-medium">
              Manage Subscription
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <img
              src={profileImage}
              alt="Profile"
              className="w-6 h-6 md:w-8 md:h-8"
              onClick={() => navigate("/account")}
            />
          </div>
        </div>

        <div className="p-4">
          {/* Product Button */}
          <div className="mb-6">
            <button
              onClick={() => navigate("/products?category=pujaflowers")}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Browse Other Products
            </button>
          </div>

          {/* Active Subscriptions */}
          {subscriptions.some((sub) => sub.status === "ACTIVE") && (
            <>
              <h2 className="text-lg font-medium mb-3">Active Subscriptions</h2>
              {subscriptions
                .filter((sub) => sub.status === "ACTIVE")
                .map(renderSubscriptionCard)}
            </>
          )}

          {/* Paused Subscriptions */}
          {subscriptions.some(
            (sub) => sub.status === "PAUSED" || sub.status === "INACTIVE"
          ) && (
              <>
                <h2 className="text-lg font-medium mt-6 mb-3">
                  Paused Subscriptions
                </h2>
                {subscriptions
                  .filter(
                    (sub) => sub.status === "PAUSED" || sub.status === "INACTIVE"
                  )
                  .map(renderSubscriptionCard)}
              </>
            )}

          {/* Delivery History - Only show completed or cancelled subscriptions */}
          {subscriptions.some(
            (sub) => sub.status === "CANCELLED"
          ) && (
            <div className="mt-8">
              <h2 className="text-lg font-medium mb-4">Delivery History</h2>
              <div className="space-y-4">
                {subscriptions
                  .filter((delivery: any) => delivery.status === "CANCELLED")
                  .map((delivery: any, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-xl p-4 grid grid-cols-3 items-center"
                    >
                      {/* Column 1: Product Name and Date (Date below Name) */}
                      <div>
                        {/* Product Name styled with font-medium */}
                        <p className="font-medium">{delivery.productDetails.name}</p>
                        {/* Date styled with text-sm */}
                        <p className="text-sm text-gray-600 mt-1">
                          {format(new Date(delivery.startDate), "MMMM d, yyyy")}
                        </p>
                      </div>

                      {/* Column 2: Status */}
                      <div className="text-center">
                        <span
                          className={`text-sm font-medium ${delivery.status === "ACTIVE" ? "text-green-600" : "text-red-600"
                            }`}
                        >
                          {delivery.status}
                        </span>
                      </div>

                      {/* Column 3: Created Date and Support Button */}
                      <div className="text-right">
                        {/* <span className="text-gray-500 text-sm">
                {format(new Date(delivery.createdAt), "MMMM d, yyyy")}
              </span> */}
                        <div className="mt-2">
                          <button
                            onClick={() => navigate("/support")}
                            className="text-red-500 text-sm font-medium"
                          >
                            Support
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

        </div>

        {/* Bottom Navigation */}
        <div className="mb-10 md:mb-10">
          <BottomNavigation />
        </div>

        {/* Details Modal */}
        {/* <AnimatePresence>
          {showDetailsModal && selectedSubscription && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-xl w-full max-w-md"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-medium">Modify Subscription</h2>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mb-6">
                    <label className="block text-gray-700 mb-2">Quantity</label>
                    <div className="flex items-center gap-4">
                      <button className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-xl">
                        -
                      </button>
                      <span className="text-xl font-medium">1</span>
                      <button className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-xl">
                        +
                      </button>
                    </div>
                  </div>

                 
                  <div className="mb-6">
                    <label className="block text-gray-700 mb-2">
                      Select Delivery Type
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="deliveryType"
                            className="w-5 h-5 text-green-600"
                          />
                          <span>Daily Delivery</span>
                        </div>
                        <span className="text-gray-600">₹50/Pack</span>
                      </label>

                      <label className="flex items-center justify-between p-4 bg-green-50 rounded-lg cursor-pointer">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="deliveryType"
                            className="w-5 h-5 text-green-600"
                            checked
                          />
                          <span>Custom Days</span>
                        </div>
                        <span className="text-gray-600">₹70/Pack</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2 mb-8">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                      (day, index) => (
                        <button
                          key={day}
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm
                          ${
                            index < 6
                              ? "bg-green-600 text-white"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {day[0]}
                        </button>
                      )
                    )}
                  </div>

               
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="flex-1 py-3 rounded-xl border-2 border-gray-300 font-medium"
                    >
                      Cancel
                    </button>
                    <button className="flex-1 py-3 rounded-xl bg-[#FF5722] text-white font-medium">
                      Save Changes
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence> */}

        {/* Pause Modal */}
        <AnimatePresence>
          {showPauseModal && selectedSubscription && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-xl w-full max-w-md"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-medium">Pause Subscription</h2>
                    <button
                      onClick={() => setShowPauseModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mb-6">
                    <label className="block text-gray-700 mb-2">
                      Resume delivery from
                    </label>
                    <DatePicker
                      selected={customStartDate}
                      onChange={(date) => setCustomStartDate(date)}
                      minDate={new Date()}
                      placeholderText="mm/dd/yyyy"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h3 className="font-medium mb-3">
                      What happens when you pause?
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• Your subscription will be paused immediately</li>
                      <li>
                        • No deliveries will be made until the resume date
                      </li>
                      <li>• You won't be charged during the pause period</li>
                      <li>
                        • Your subscription will automatically resume on the
                        selected date
                      </li>
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPauseModal(false)}
                      className="flex-1 py-3 rounded-xl border-2 border-gray-300 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePause}
                      className="flex-1 py-3 rounded-xl bg-[#FF5722] text-white font-medium"
                      disabled={!customStartDate}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cancel Modal */}
        <AnimatePresence>
          {showCancelModal && selectedSubscription && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-3xl w-full max-w-md p-6"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
              >
                <div className="mb-6">
                  {/* Warning Section */}
                  <div className="bg-[#FFF3CD] rounded-2xl p-4 mb-6">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                        <img src={Low_Balance} alt="" className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-medium text-gray-900 mb-1">
                          Cancel Subscription?
                        </h2>
                        <p className="text-gray-600 text-sm">
                          Your subscription will be cancelled immediately and
                          you won't receive any further deliveries.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Help us improve section */}
                  <div className="mb-6">
                    <h3 className="text-xl font-medium text-gray-900 mb-3">
                      Help us improve
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Why are you cancelling?
                    </p>

                    <div className="space-y-3">
                      {[
                        "Too expensive",
                        "Quality issues",
                        "Delivery timing issues",
                        "Moving to a different location",
                        "Taking a break",
                        "Other",
                      ].map((reason) => (
                        <button
                          key={reason}
                          onClick={() => setCancellationReason(reason)}
                          className={`w-full p-4 rounded-2xl text-left transition-all ${cancellationReason === reason
                              ? "bg-[#FFF3CD] border-[#FF5722] border text-[#FF5722]"
                              : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
                            }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancel}
                      className="flex-1 py-3.5 rounded-full border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                      disabled={!cancellationReason}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setShowCancelModal(false)}
                      className="flex-1 py-3.5 rounded-full bg-[#FF5722] text-white font-medium hover:bg-[#F4511E] transition-colors"
                    >
                      Keep Subscription
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Toast */}
        <AnimatePresence>
          {showSuccessToast && selectedSubscription && (
            <motion.div
              className="fixed top-4 left-4 right-4 bg-white rounded-xl p-4 shadow-lg max-w-sm mx-auto"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h3 className="font-semibold text-base mb-1">
                Subscription Paused!
              </h3>
              <p className="text-sm text-gray-600">
                Your {selectedSubscription.productDetails?.name} subscription
                has been paused successfully.
              </p>
              <p className="text-green-600 font-medium mt-2 text-sm">
                Awesome!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Insufficient Balance Modal */}
        <AnimatePresence>
          {showInsufficientBalanceModal && (
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-xl w-full max-w-xs sm:max-w-sm p-4"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
              >
                <h2 className="text-lg font-semibold mb-3">
                  Insufficient Balance
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Your current balance is insufficient to subscribe. Please
                  recharge your wallet.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleRechargeWallet}
                    className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium
                      hover:bg-green-700 transition-colors"
                  >
                    Recharge Wallet
                  </button>
                  <button
                    onClick={() => setShowInsufficientBalanceModal(false)}
                    className="flex-1 border-2 border-gray-300 py-2.5 rounded-xl text-sm font-medium
                      hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ManageMySubscription;