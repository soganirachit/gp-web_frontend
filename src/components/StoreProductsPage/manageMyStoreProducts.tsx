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
import Low_Balance from "../../assets/icon/LowBalance.png";
import { ManageStoreSkeleton } from "../common/PageSkeletons";
import { format } from "date-fns";
import { orderService } from "@/services/order.service";
import { useFeatureTheme } from "../../context/FeatureThemeContext";
import { UniformPageHeader } from "../layout/UniformPageHeader";
import { pickPrimaryImageUrl, type ProductImageLike } from "../../utils/pickPrimaryImageUrl";

interface order {
  id: string;
  orderId: string;
  status: "SCHEDULED" | "CANCELLED" | "PAUSED" | "COMPLETED" | "DELIVERED" | "REJECTED";
  createdAt: string;
  deliveryTime: string;
  product: {
    id: string;
    name: string;
    description: string;
    sellingPrice: number;
    productId: string;
    imagesUrl: string[];
    primary_image_variants?: ProductImageLike["primary_image_variants"];
    category: string;
    isDaily: boolean;
    isStore: boolean;
  };
  quantity: number;
}

const ManageMyStoreProducts: React.FC = () => {
  const navigate = useNavigate();
  const { feature } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  const [isLoading, setIsLoading] = useState(true);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSuccessToast] = useState(false);
  const [orders, setOrders] = useState<order[]>([]);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<order | null>(null);

  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] =
    useState(false);
  const [balanceDetails] = useState({
    currentBalance: 0,
    requiredAmount: 0,
    shortageAmount: 0,
    subscriptionType: "Daily" as "DAILY" | "CUSTOM",
    days: 7,
  });

  // const [cancellationReason, setCancellationReason] = useState("");

  useEffect(() => {
    fetchOrderDetails();
  }, []);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);

      const fetchedOrders = await orderService.getOrders({
        order_type: "subscription",
      });

      if (fetchedOrders && fetchedOrders.length > 0) {
        // Sort orders by creation date, newest first
        const sortedOrders = fetchedOrders.sort(
          (a: order, b: order) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setOrders(sortedOrders);
      } else {
        setOrders([]);
      }
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // const handlePause = async () => {
  //   if (!selectedOrder || !customStartDate) return;

  //   try {
  //     setIsLoading(true);

  //     // Calculate pause duration in days
  //     const today = new Date();
  //     today.setHours(0, 0, 0, 0);

  //     const resumeDate = new Date(customStartDate);
  //     resumeDate.setHours(0, 0, 0, 0);

  //     // Calculate the difference in days
  //     const diffTime = resumeDate.getTime() - today.getTime();
  //     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  //     if (diffDays < 1) {
  //       alert("Resume date must be at least 1 day from today");
  //       return;
  //     }

  //     // Call the API to pause the subscription
  //     const response = await subscriptionService.pauseSubscription(
  //       selectedOrder.id,
  //       diffDays
  //     );

  //     if (response.success) {
  //       setShowPauseModal(false);
  //       // Navigate to the paused subscription landing page
  //       navigate("/Pause-Subscription");
  //     } else {
  //       alert(response.error || "Failed to pause subscription");
  //     }
  //   } catch (error) {
  //     console.error("Error pausing subscription:", error);
  //     alert("An error occurred while pausing your subscription");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handleResume = async (subscriptionId: string) => {
    try {
      await subscriptionService.toggleSubscriptionStatus(subscriptionId);
      await fetchOrderDetails();
      toast.success("Subscription resumed successfully");
    } catch (error: any) {
      if (error.message?.includes("login")) {
        toast.error("Please login to resume subscription");
      } else {
        toast.error(error.message || "Failed to resume subscription");
      }
    }
  };

  const handleCancel = async () => {
    try {
      const orderId = selectedOrder?.id;

      if (!orderId) {
        toast.error("Order ID not found");
        return;
      }

      const response = await orderService.cancelOrder(orderId);

      if (response.success) {
        setShowCancelModal(false);
        // setCancellationReason("");
        navigate(basePath);
      } else {
        toast.error(response.error || "Failed to cancel order");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel subscription");
    }
  };

  const handleRechargeWallet = () => {
    setShowInsufficientBalanceModal(false);
    navigate(`${basePath}/wallet`, {
      state: {
        requiredAmount: balanceDetails.shortageAmount,
        currentBalance: balanceDetails.currentBalance,
        returnUrl: `${basePath}/product/${selectedOrder?.id}`,
        // subscriptionType: selectedOrder?.type,
        minimumDays: 7,
        // maximumDays: selectedOrder?.type === "DAILY" ? 30 : 14,
        totalRequired: balanceDetails.requiredAmount,
      },
    });
  };

  const renderSubscriptionCard = (order: order) => {
    const formattedDate = order.deliveryTime 
      ? format(new Date(order.deliveryTime), "dd MMM yyyy, HH:mm")
      : "No delivery time set";
    
    const isScheduled = order.status === "SCHEDULED";
    const isCancelled = order.status === "CANCELLED";

    const thumbUrl =
      pickPrimaryImageUrl(order.product as ProductImageLike, "thumb") ||
      order.product.imagesUrl?.[0];

    return (
      <div
        key={order.id}
        className="bg-white rounded-[16px] p-4 mb-3 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
            {thumbUrl ? (
              <img
                src={thumbUrl}
                alt={order.product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <span className="text-xl font-medium text-gray-400">
                  {order.product.name?.charAt(0) || "M"}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-medium text-[#1A1A1A] truncate">
                    {order.product.name}
                  </h3>
                  {isCancelled && (
                    <span className="px-2 py-0.5 bg-[#FFF3CD] text-red-600 text-xs font-medium rounded-full">
                      Cancelled
                    </span>
                  )}
                  {isScheduled && (
                    <span className="px-2 py-0.5 bg-yellow-200 text-yellow-600 text-xs font-medium rounded-full">
                      Scheduled
                    </span>
                  )}
                </div>
                <p className="text-[#666666] text-sm">
                  {order.product.isDaily}
                </p>
              </div>
            </div>

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
              <p className="text-[#666666] text-xs">Date: {formattedDate}</p>
            </div>

            <p className="text-[#FF5722] font-medium text-sm mb-3">
              ₹{order.product.sellingPrice}
            </p>

            <div className="flex gap-2">
              {isScheduled && (
                <>
                  {/* <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowPauseModal(true);
                    }}
                    className="flex-1 py-1.5 rounded-full bg-[#FFF3CD] text-[#FF5722] text-sm font-medium"
                  >
                    Pause
                  </button> */}

                  <button
                    onClick={() => {
                      setSelectedOrder(order);
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
              {isCancelled && (
                <>
                  <button
                    onClick={() => handleResume(order.id)}
                    className="flex-1 py-1.5 rounded-full bg-[#006D3B] text-white text-sm font-medium"
                  >
                    Resume
                  </button>

                  <button
                    onClick={() => {
                      setSelectedOrder(order);
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

  // Filter orders for delivery history - only show completed/cancelled/delivered/rejected orders
  const deliveryHistoryOrders = orders.filter((order) => 
    order.status === "COMPLETED" || 
    order.status === "CANCELLED" || 
    order.status === "DELIVERED" || 
    order.status === "REJECTED"
  );

  if (isLoading) {
    return <ManageStoreSkeleton />;
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f6f1]">
        <div className="max-w-md mx-auto p-4">
          {/* <div className="flex items-center mb-6">
            <button onClick={() => navigate(-1)} className="text-gray-600">
              <FaArrowLeft className="text-xl" />
            </button>
            <h1 className="ml-4 text-xl font-semibold">My store Products</h1>
          </div> */}

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
            <h2 className="text-xl font-semibold mb-2">No Store Products</h2>
            <p className="text-gray-600 mb-6">
              You don't have any Store Products.
            </p>
            <button
              onClick={() => navigate(basePath)}
              className="bg-green-600 text-white py-3 px-6 rounded-lg font-medium"
            >
              Browse store Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className="max-w-[800px] mx-auto">
        <UniformPageHeader
          title="Manage Store"
          onBack={() => navigate(-1)}
          padYClassName="pt-6 pb-4"
          className="sticky top-0 z-10"
          trailing={
            <>
              <img
                src={walletImage}
                alt="Wallet"
                className="w-10 h-10 md:w-10 md:h-10 cursor-pointer"
                onClick={() => navigate(`${basePath}/wallet`)}
              />
              <img
                src={profileImage}
                alt="Profile"
                className="w-6 h-6 md:w-8 md:h-8 cursor-pointer"
                onClick={() => navigate(`${basePath}/account`)}
              />
            </>
          }
        />

        <div className="p-4">
          {/* Product Button */}
          <div className="mb-6">
            <button
              onClick={() => navigate(basePath)}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center"
            >
              Browse Other Products
            </button>
          </div>

          {/* SCHEDULED Orders */}
          {orders.some((order) => order.status === "SCHEDULED") && (
            <>
              <h2 className="text-lg font-medium mb-3">
                Active store products
              </h2>

              {orders
                .filter((order) => order.status === "SCHEDULED")
                .map(renderSubscriptionCard)}
            </>
          )}

          {/* Paused orders */}
          {/* {orders.some((sub) => sub.status === "PAUSED") && (
            <>
              <h2 className="text-lg font-medium mt-6 mb-3">Paused orders</h2>
              {orders
                .filter((sub) => sub.status === "PAUSED")
                .map(renderSubscriptionCard)}
            </>
          )} */}

          {/* Delivery History - Only show completed/cancelled/delivered/rejected orders */}
          {deliveryHistoryOrders.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-medium mb-4">Delivery History</h2>
              <div className="space-y-4">
                {deliveryHistoryOrders.map((delivery: any, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl p-4 grid grid-cols-3 items-center"
                  >
                    {/* Column 1: Product Name and Date */}
                    <div>
                      <p className="font-medium">{delivery?.product.name}</p>
                      <p className="text-gray-600 text-sm mt-1">
                        {format(new Date(delivery.deliveryTime), "MMMM d, yyyy")}
                      </p>
                    </div>

                    {/* Column 2: Status */}
                    <div className="text-center">
                      <span
                        className={`text-sm font-medium ${delivery.status === "SCHEDULED"
                            ? "text-yellow-600"
                            : delivery.status === "DELIVERED" || delivery.status === "COMPLETED"
                              ? "text-green-600"
                              : delivery.status === "REJECTED" || delivery.status === "CANCELLED"
                                ? "text-red-600"
                                : "text-gray-600"
                          }`}
                      >
                        {delivery.status}
                      </span>
                    </div>

                    {/* Column 3: Support Button */}
                    <div className="text-right">
                      <button
                        onClick={() => navigate(`${basePath}/customer-support`)}
                        className="text-red-500 text-sm font-medium"
                      >
                        Support
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Pause Modal */}
        {/* <AnimatePresence>
          {showPauseModal && selectedOrder && (
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
        </AnimatePresence> */}

        {/* Cancel Modal */}
        <AnimatePresence>
          {showCancelModal && selectedOrder && (
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
                          Cancel store product?
                        </h2>
                        <p className="text-gray-600 text-sm">
                          This store product will be removed right away and
                          won't appear in your listings.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancel}
                      className="flex-1 py-3.5 rounded-full border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    // disabled={!cancellationReason}
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
        {/* <AnimatePresence>
          {showSuccessToast && selectedOrder && (
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
                Your {selectedOrder.product?.name} subscription has been paused
                successfully.
              </p>
              <p className="text-green-600 font-medium mt-2 text-sm">
                Awesome!
              </p>
            </motion.div>
          )}
        </AnimatePresence> */}

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

export default ManageMyStoreProducts;