import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaMapMarkerAlt, FaCheck } from "react-icons/fa";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { GoogleMap } from "@react-google-maps/api";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";
import { MdLocationOn } from "react-icons/md";
import { subscriptionService } from "../../services/subscription.service";
import BottomNavigation from "../layout/BottomNav";
import { customerService } from "@/services/getcustomer.service";
import { orderService } from "@/services/order.service";

interface SubscriptionDetails {
  basePackId: string;
  type: "DAILY" | "ALTERNATE" | "Daily" | "Alternate";
  startDate: string;
  amount: number;
  packDetails: {
    name: string;
    description: string;
    imageUrl: string;
    sellingPrice: number;
    contents: Array<{ name: string; quantity: number }>;
  };
  deliveryCount: number;
  walletBalance: number;
  sellingPrice: number;
  remainingAmount?: number;
  deliveryPattern?: string;
}

interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  societyName?: string;
  area?: string;
  phoneNumber?: string;
  coordinates?: string;
}

// interface RechargeModalProps {
//   currentBalance: number;
//   requiredAmount: number;
//   shortfall: number;
//   onClose: () => void;
//   onRecharge: () => void;
// }

// interface ExistingSubscriptionModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onGoHome: () => void;
// }

// interface StatusModalProps {
//   isOpen: boolean;
//   type: 'success' | 'error' | 'loading';
//   message: string;
//   onClose?: () => void;
//   onAction?: () => void;
//   actionLabel?: string;
// }

interface MapViewProps {
  address: Address | null;
}

interface UserData {
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber: string;
  // add other user fields if needed
}

// interface LocationState {
//   selectedAddress?: Address;
//   basePackId?: string;
//   subscriptionData?: any;
//   returnUrl?: string;
// }

// const RechargeModal: React.FC<RechargeModalProps> = ({
//   currentBalance,
//   requiredAmount,
//   shortfall,
//   onClose,
//   onRecharge
// }) => (
//   <AnimatePresence>
//     <motion.div
//       className="fixed inset-0 flex backdrop bg-opacity-50 backdrop-blur-sm items-center justify-center z-50"
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       exit={{ opacity: 0 }}
//     >
//       <motion.div
//         className="bg-white rounded-lg p-6 w-[90%] max-w-md m-4"
//         initial={{ scale: 0.8, opacity: 0 }}
//         animate={{ scale: 1, opacity: 1 }}
//         transition={{ type: "spring", damping: 20 }}
//       >
//         <div className="flex flex-col items-center">
//           <FaWallet className="text-4xl text-orange-500 mb-4" />
//           <h2 className="text-xl font-semibold mb-2 text-center">Insufficient Balance</h2>
//           <p className="text-gray-600 mb-6 text-center">
//             Your wallet balance is low. Please recharge to continue with the subscription.
//           </p>
//           <div className="w-full bg-orange-50 rounded-lg p-4 mb-6">
//             <div className="flex justify-between items-center">
//               <span className="text-gray-600">Required Amount:</span>
//               <span className="font-semibold">₹{requiredAmount}</span>
//             </div>
//             <div className="flex justify-between items-center mt-2">
//               <span className="text-gray-600">Current Balance:</span>
//               <span className="font-semibold">₹{currentBalance}</span>
//             </div>
//             <div className="border-t border-orange-200 my-2" />
//             <div className="flex justify-between items-center">
//               <span className="text-gray-600">Shortage:</span>
//               <span className="font-semibold text-red-500">₹{shortfall}</span>
//             </div>
//           </div>
//           <div className="flex gap-3 w-full">
//             <motion.button
//               whileHover={{ scale: 1.02 }}
//               whileTap={{ scale: 0.98 }}
//               onClick={onClose}
//               className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-lg"
//             >
//               Cancel
//             </motion.button>
//             <motion.button
//               whileHover={{ scale: 1.02 }}
//               whileTap={{ scale: 0.98 }}
//               onClick={onRecharge}
//               className="flex-1 bg-green-600 text-white py-3 rounded-lg"
//             >
//               Recharge Now
//             </motion.button>
//           </div>
//         </div>
//       </motion.div>
//     </motion.div>
//   </AnimatePresence>
// );

// const ExistingSubscriptionModal: React.FC<ExistingSubscriptionModalProps> = ({
//   isOpen,
//   onClose,
//   onGoHome
// }) => (
//   <AnimatePresence>
//     {isOpen && (
//       <motion.div
//         className="fixed inset-0 flex  bg-opacity-50 backdrop-blur-sm items-center justify-center z-50"
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         exit={{ opacity: 0 }}
//       >
//         <motion.div
//           className="bg-white rounded-lg p-6 w-[90%] max-w-md m-4"
//           initial={{ scale: 0.8, opacity: 0 }}
//           animate={{ scale: 1, opacity: 1 }}
//           transition={{ type: "spring", damping: 20 }}
//         >
//           <div className="flex flex-col items-center">
//             <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
//               <FaBox className="text-3xl text-orange-500" />
//             </div>
//             <h2 className="text-xl font-semibold mb-2 text-center">Existing Subscription Found</h2>
//             <p className="text-gray-600 text-center mb-6">
//               You already have an active subscription at this address. Please manage your existing subscription from the home page.
//             </p>
//             <div className="flex gap-3 w-full">
//               <motion.button
//                 whileHover={{ scale: 1.02 }}
//                 whileTap={{ scale: 0.98 }}
//                 onClick={onClose}
//                 className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-lg"
//               >
//                 Cancel
//               </motion.button>
//               <motion.button
//                 whileHover={{ scale: 1.02 }}
//                 whileTap={{ scale: 0.98 }}
//                 onClick={onGoHome}
//                 className="flex-1 bg-green-600 text-white py-3 rounded-lg"
//               >
//                 Go to Home
//               </motion.button>
//             </div>
//           </div>
//         </motion.div>
//       </motion.div>
//     )}
//   </AnimatePresence>
// );

// const StatusModal: React.FC<StatusModalProps> = ({
//   isOpen,
//   type,
//   message,
//   onClose,
//   onAction,
//   actionLabel
// }) => (
//   <AnimatePresence>
//     {isOpen && (
//       <motion.div
//         className="fixed inset-0 flex  bg-opacity-50 backdrop-blur-sm items-center justify-center z-50"
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         exit={{ opacity: 0 }}
//       >
//         <motion.div
//           className="bg-white rounded-lg p-6 w-[90%] max-w-md m-4"
//           initial={{ scale: 0.8, opacity: 0 }}
//           animate={{ scale: 1, opacity: 1 }}
//           transition={{ type: "spring", damping: 20 }}
//         >
//           <div className="flex flex-col items-center">
//             <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
//               type === 'success' ? 'bg-green-100' :
//               type === 'error' ? 'bg-red-100' :
//               'bg-blue-100'
//             }`}>
//               {type === 'success' && <FaCheck className="text-3xl text-green-500" />}
//               {type === 'error' && <FaBox className="text-3xl text-red-500" />}
//               {type === 'loading' && (
//                 <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
//               )}
//             </div>
//             <h2 className={`text-xl font-semibold mb-2 text-center ${
//               type === 'success' ? 'text-green-600' :
//               type === 'error' ? 'text-red-600' :
//               'text-blue-600'
//             }`}>
//               {type === 'success' ? 'Success!' :
//                type === 'error' ? 'Error' :
//                'Processing...'}
//             </h2>
//             <p className="text-gray-600 text-center mb-6">{message}</p>
//             <div className="flex gap-3 w-full">
//               {onClose && (
//                 <motion.button
//                   whileHover={{ scale: 1.02 }}
//                   whileTap={{ scale: 0.98 }}
//                   onClick={onClose}
//                   className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-lg"
//                 >
//                   Close
//                 </motion.button>
//               )}
//               {onAction && actionLabel && (
//                 <motion.button
//                   whileHover={{ scale: 1.02 }}
//                   whileTap={{ scale: 0.98 }}
//                   onClick={onAction}
//                   className={`flex-1 py-3 rounded-lg text-white ${
//                     type === 'success' ? 'bg-green-600' :
//                     type === 'error' ? 'bg-red-600' :
//                     'bg-blue-600'
//                   }`}
//                 >
//                   {actionLabel}
//                 </motion.button>
//               )}
//             </div>
//           </div>
//         </motion.div>
//       </motion.div>
//     )}
//   </AnimatePresence>
// );

const SuccessCheckmark = () => (
  <motion.div
    className="relative w-16 h-16 mx-auto mb-4"
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ duration: 0.5, type: "spring", bounce: 0.5 }}
  >
    <motion.div
      className="absolute inset-0 bg-[#E6F7EE] opacity-20 rounded-full"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1.2, opacity: 0.2 }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        repeatType: "reverse",
      }}
    />
    <motion.div
      className="absolute inset-2 bg-[#E6F7EE] rounded-full flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          delay: 0.5,
          type: "spring",
          stiffness: 200,
          damping: 15,
        }}
      >
        <FaCheck className="text-2xl text-green-600" />
      </motion.div>
    </motion.div>
  </motion.div>
);

const MapView: React.FC<MapViewProps> = ({ address }) => {
  const { isLoaded, loadError } = useGoogleMaps();

  if (!isLoaded) {
    return (
      <div className="w-full h-[250px] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#F15A22]"></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full h-[250px] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        <FaMapMarkerAlt className="text-gray-400 text-4xl" />
      </div>
    );
  }

  // Get coordinates from the address.coordinates field
  let center = { lat: 20.5937, lng: 78.9629 }; // Default to India's center

  if (address?.coordinates) {
    const [lat, lng] = address.coordinates.split(",").map(Number);
    if (!isNaN(lat) && !isNaN(lng)) {
      center = { lat, lng };
    }
  }

  return (
    <div className="w-full h-[250px] rounded-lg overflow-hidden relative">
      <GoogleMap
        mapContainerStyle={{
          width: "100%",
          height: "100%",
        }}
        center={center}
        zoom={16}
        options={{
          zoomControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          draggable: false,
          scrollwheel: false,
          disableDoubleClickZoom: true,
          disableDefaultUI: true,
          gestureHandling: "none",
          clickableIcons: false,
        }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <MdLocationOn className="text-[#F15A22] text-4xl drop-shadow-lg" />
        </div>
      </GoogleMap>
      {/* Overlay to prevent any map interactions */}
      <div className="absolute inset-0 bg-transparent" />
    </div>
  );
};

const ConfirmSubscription: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // const locationState = location.state as LocationState;
  const [loading, setLoading] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] =
    useState<SubscriptionDetails | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false); // <-- Add this line
  // const [successMessage] = useState('');
  // const [showSuccessModal, setShowSuccessModal] = useState(false);
  // const [, setWalletBalance] = useState<number>(0);
  // const [showRechargeModal, setShowRechargeModal] = useState(false);
  // const [rechargeDetails, ] = useState<{
  //   currentBalance: number;
  //   requiredAmount: number;
  //   shortfall: number;
  // } | null>(null);
  // const [showExistingSubscriptionModal, setShowExistingSubscriptionModal] = useState(false);

  const [, setStatusModal] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "loading";
    message: string;
  }>({
    isOpen: false,
    type: "loading",
    message: "",
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        try {
          const customers = await customerService.getAllCustomers();
          if (customers && customers.length > 0) {
            setUserData(customers[0]);
          }
        } catch (err) {
          console.error("Failed to fetch customer data:", err);
        }

        // Get subscription details from multiple sources
        const details = localStorage.getItem("currentSubscription");
        const address = localStorage.getItem("selectedDeliveryAddress");
        const urlParams = new URLSearchParams(window.location.search);
        const queryBasePackId = urlParams.get("basePackId");
        const locationState = window.history.state?.usr;

        // console.log('Raw data sources:', {
        //   details,
        //   address,
        //   queryBasePackId,
        //   locationState
        // });
        if (!details) {
          console.error("No subscription details found");
          toast.error("No subscription details found");
          navigate("/");
          return;
        }

        try {
          const parsedDetails = JSON.parse(details);
          const normalizedDetails: SubscriptionDetails = {
            basePackId:
              parsedDetails.basePackId ||
              queryBasePackId ||
              locationState?.basePackId,
            type:
              parsedDetails.type ||
              (parsedDetails.deliveryCount === 7 ? "DAILY" : "ALTERNATE"),
            startDate: parsedDetails.startDate,
            amount: parsedDetails.amount || parsedDetails.sellingPrice,
            packDetails: parsedDetails.packDetails,
            deliveryCount: parsedDetails.deliveryCount || 7,
            walletBalance: parsedDetails.walletBalance || 0,
            sellingPrice: parsedDetails.sellingPrice,
            remainingAmount: parsedDetails.remainingAmount,
            deliveryPattern:
              parsedDetails.type === "DAILY" ? "Every day" : "Alternate days",
          };

          // console.log('Normalized subscription details:', normalizedDetails);

          // Validate required fields
          if (!normalizedDetails.basePackId) {
            console.error(
              "Missing basePackId in subscription details:",
              normalizedDetails
            );
            toast.error("Invalid subscription details");
            navigate("/");
            return;
          }

          // Update localStorage with complete normalized details
          localStorage.setItem(
            "currentSubscription",
            JSON.stringify(normalizedDetails)
          );
          setSubscriptionDetails(normalizedDetails);

          // Check for address from location state first, then localStorage
          let addressToUse = locationState?.selectedAddress;

          if (!addressToUse && address) {
            try {
              addressToUse = JSON.parse(address);
            } catch (e) {
              console.error("Error parsing address:", e);
            }
          }

          // console.log('Selected address:', addressToUse);

          if (!addressToUse) {
            navigate("/subscription/confirm", {
              state: {
                selectedAddress: address,
                basePackId: normalizedDetails.basePackId,
                subscriptionData: normalizedDetails,
              },
            });
            return;
          }

          setSelectedAddress(addressToUse);
        } catch (error) {
          console.error("Error processing subscription details:", error);
          navigate("/");
        }
      } catch (error: any) {
        console.error("Error in loadData:", error);
        navigate("/");
      }
    };

    loadData();
  }, [navigate, location.state]);

  const handleConfirm = async () => {
    const isStoreProduct = location?.state?.product?.isStore;
    if (!isStoreProduct) {
      if (!subscriptionDetails || !selectedAddress) {
        toast.error("Missing subscription details or address");
        return;
      }
      // Validate required fields
      if (!subscriptionDetails.basePackId) {
        console.error("Missing basePackId");
        toast.error("Missing base pack ID");
        return;
      }

      if (!subscriptionDetails.type) {
        console.error("Missing type");
        toast.error("Missing subscription type");
        return;
      }

      try {
        setLoading(true);

        const startDate = new Date(subscriptionDetails.startDate);

        // Prepare initiate request data with explicit type conversion
        const initiateData = {
          basePackId: String(subscriptionDetails.basePackId),
          type: subscriptionDetails.type.toUpperCase() as "DAILY" | "ALTERNATE",
          startDate: startDate,
          days: subscriptionDetails.deliveryCount || 7,
        };

        // First initiate the subscription
        const initiateResponse = await subscriptionService.initiateSubscription(
          initiateData
        );

        if (!initiateResponse.success) {
          throw new Error(
            initiateResponse.message || "Failed to initiate subscription"
          );
        }

        // Format selected days based on subscription type
        const selectedDays =
          subscriptionDetails.type.toUpperCase() === "DAILY"
            ? [
                "MONDAY",
                "TUESDAY",
                "WEDNESDAY",
                "THURSDAY",
                "FRIDAY",
                "SATURDAY",
                "SUNDAY",
              ]
            : ["MONDAY", "WEDNESDAY", "FRIDAY", "SUNDAY"];

        // Prepare confirm request data
        const confirmData = {
          basePackId: subscriptionDetails.basePackId,
          deliveryAddressId: selectedAddress.id,
          type: subscriptionDetails.type.toUpperCase() as "DAILY" | "ALTERNATE",
          startDate: startDate,
          selectedDays: selectedDays,
        };

        // Log the confirm request data
        // Then confirm the subscription
        const confirmResponse = await subscriptionService.confirmSubscription(
          confirmData
        );
        if (confirmResponse.success) {
          const confirmedSubscription = {
            ...confirmResponse.subscription,
            deliveryAddress: selectedAddress,
            confirmedAt: new Date().toISOString(),
            packDetails: subscriptionDetails.packDetails,
            type: subscriptionDetails.type,
            deliveryCount: subscriptionDetails.deliveryCount,
            sellingPrice: subscriptionDetails.sellingPrice,
          };
          localStorage.setItem(
            "lastConfirmedSubscription",
            JSON.stringify(confirmedSubscription)
          );
          setStatusModal({
            isOpen: true,
            type: "success",
            message: "Subscription confirmed successfully!",
          });
          toast.success("Subscription confirmed successfully!");
          setIsConfirmed(true); // <-- Show thank you section
        } else {
          throw new Error(
            confirmResponse.error || "Failed to confirm subscription"
          );
        }
      } catch (error: any) {
        console.error("Subscription error:", error);
        // Enhanced error handling with more specific messages
        const errorMessage =
          error.message ||
          "An error occurred while processing your subscription";
        if (
          errorMessage.includes("P2002") ||
          errorMessage.includes("Unique constraint failed") ||
          errorMessage.includes("deliveryAddressId")
        ) {
          toast.error(
            "You already have an active subscription at this address"
          );
          navigate("/");
        } else if (errorMessage.includes("Authentication required")) {
          toast.error("Please login to continue");
          navigate("/login", {
            state: { returnUrl: "/subscription/confirm" },
          });
        } else if (errorMessage.includes("Insufficient wallet balance")) {
          toast.error("Insufficient wallet balance");
          navigate("/wallet", {
            state: {
              returnUrl: "/subscription/confirm",
              requiredAmount: subscriptionDetails.amount,
            },
          });
        } else {
          console.error("Detailed error:", {
            message: errorMessage,
            subscriptionDetails,
            selectedAddress,
          });
          toast.error(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    } else {
      const storeProductPayload = {
        customerId: location.state.selectedAddress.customerId,
        subscriptionId: "",
        productId: location.state.product.id,
        quantity: location.state.metaData.quantity,
        addressId: location.state.selectedAddress.id,
        deliveredBy: "",
        routeId: "",
        isStore: location.state.product.isStore,
      };
      try {
        if (!selectedAddress) {
          toast.error("Missing subscription details or address");
          return;
        }
        const { success } = await orderService.createOrder(
          storeProductPayload
        );
        if (success) {
          setStatusModal({
            isOpen: true,
            type: "success",
            message: "Order created successfully!",
          });
          toast.success("Order created successfully!");
          setIsConfirmed(true);
        }
      } catch (error) {
        console.error("Error creating order:", error);
      }
    }
  };
  // const handleRecharge = () => {
  //   if (!rechargeDetails) return;

  //   // Store pending subscription
  //   localStorage.setItem('pendingSubscription', JSON.stringify({
  //     ...subscriptionDetails,
  //     deliveryAddress: selectedAddress,
  //     requiredAmount: rechargeDetails.requiredAmount,
  //     currentBalance: rechargeDetails.currentBalance,
  //     shortfall: rechargeDetails.shortfall
  //   }));

  //   // Navigate to wallet with required amount
  //   navigate('/wallet', {
  //     state: {
  //       requiredAmount: rechargeDetails.shortfall,
  //       returnUrl: '/subscription/confirm',
  //       subscriptionType: subscriptionDetails?.type,
  //       days: subscriptionDetails?.type === 'Daily' ? 30 : 15
  //     }
  //   });
  // };

  // Success Modal Component
  // const SuccessModal = () => (
  //   <AnimatePresence>
  //     <motion.div
  //       className="fixed inset-0 flex  bg-opacity-50 backdrop-blur-sm items-center justify-center z-50"
  //       initial={{ opacity: 0 }}
  //       animate={{ opacity: 1 }}
  //       exit={{ opacity: 0 }}
  //     >
  //       <motion.div
  //         className="bg-white rounded-lg p-6 w-[90%] max-w-md m-4"
  //         initial={{ scale: 0.8, opacity: 0 }}
  //         animate={{ scale: 1, opacity: 1 }}
  //         transition={{ type: "spring", damping: 20 }}
  //       >
  //         <div className="flex flex-col items-center">
  //           <motion.div
  //             className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4"
  //             initial={{ scale: 0 }}
  //             animate={{ scale: 1 }}
  //             transition={{
  //               type: "spring",
  //               stiffness: 200,
  //               damping: 15,
  //               delay: 0.2
  //             }}
  //           >
  //             <motion.div
  //               initial={{ scale: 0 }}
  //               animate={{ scale: 1, rotate: 360 }}
  //               transition={{ delay: 0.4, duration: 0.6 }}
  //             >
  //               <FaCheck className="text-green-600 text-4xl" />
  //             </motion.div>
  //           </motion.div>

  //           <motion.h2
  //             className="text-2xl font-semibold mb-2 text-center text-green-600"
  //             initial={{ opacity: 0, y: 20 }}
  //             animate={{ opacity: 1, y: 0 }}
  //             transition={{ delay: 0.5 }}
  //           >
  //             Subscription Confirmed!
  //           </motion.h2>

  //           <motion.p
  //             className="text-gray-600 mb-6 text-center"
  //             initial={{ opacity: 0, y: 20 }}
  //             animate={{ opacity: 1, y: 0 }}
  //             transition={{ delay: 0.6 }}
  //           >
  //             {subscriptionDetails?.deliveryPattern
  //               ? `Your ${subscriptionDetails.deliveryPattern.toLowerCase()} subscription has been confirmed!`
  //               : 'Your subscription has been confirmed successfully!'}
  //           </motion.p>

  //           <motion.div
  //             className="w-full bg-green-50 rounded-lg p-4 mb-6"
  //             initial={{ opacity: 0, y: 20 }}
  //             animate={{ opacity: 1, y: 0 }}
  //             transition={{ delay: 0.7 }}
  //           >
  //             <p className="text-sm text-green-800 font-medium mb-2">Subscription Details</p>
  //             <p className="text-sm text-gray-600">
  //               Type: {subscriptionDetails?.type}<br />
  //               Start Date: {new Date(subscriptionDetails?.startDate || '').toLocaleDateString()}<br />
  //               Pack: {subscriptionDetails?.packDetails.name}
  //             </p>
  //           </motion.div>

  //           <motion.p
  //             className="text-sm text-gray-500 text-center"
  //             initial={{ opacity: 0 }}
  //             animate={{ opacity: 1 }}
  //             transition={{ delay: 0.8 }}
  //           >
  //             Redirecting to home page...
  //           </motion.p>
  //         </div>
  //       </motion.div>
  //     </motion.div>
  //   </AnimatePresence>
  // );

  // const renderDeliveryAddress = () => {
  //   if (!selectedAddress) {
  //     return (
  //       <div className="text-center py-6">
  //         <div className="text-red-500 mb-4">Please select a delivery address</div>
  //         <button
  //           onClick={() => navigate('/address-selection')}
  //           className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
  //         >
  //           Select Address
  //         </button>
  //       </div>
  //     );
  //   }

  //   return (
  //     <div className="space-y-4">
  //       {/* Selected Address Card */}
  //       <div className="bg-gray-50 rounded-lg p-4">
  //         <div className="flex items-start justify-between">
  //           <div className="flex-1">
  //             {/* Address Details */}
  //             <div className="space-y-2">
  //               <div className="flex items-start gap-3">
  //                 <div>
  //                   <div className="mt-2 space-y-1">
  //                     <p className="text-gray-800">{selectedAddress.street}</p>
  //                     {selectedAddress.societyName && (
  //                       <p className="text-gray-600">{selectedAddress.societyName}</p>
  //                     )}
  //                     <p className="text-gray-600">
  //                       {selectedAddress.area && `${selectedAddress.area}, `}
  //                       {selectedAddress.city}
  //                     </p>
  //                     <p className="text-gray-600">
  //                       {selectedAddress.state} - {selectedAddress.pincode}
  //                     </p>
  //                     {selectedAddress.phoneNumber && (
  //                       <p className="text-gray-600 mt-2">
  //                         <span className="font-medium">Phone: </span>
  //                         {selectedAddress.phoneNumber}
  //                       </p>
  //                     )}
  //                   </div>
  //                 </div>
  //               </div>
  //             </div>
  //           </div>
  //         </div>
  //       </div>

  //       {/* Change Address Button */}
  //       <button
  //         onClick={() => navigate('/address-selection')}
  //         className="w-full border-2 border-green-500 text-green-600 py-2 rounded-lg text-sm font-medium
  //           hover:bg-green-50 transition-colors"
  //       >
  //         Change Delivery Address
  //       </button>
  //     </div>
  //   );
  // };

  if (!subscriptionDetails || !selectedAddress) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#FFFBEB] relative max-w-[800px] mx-auto">
      <div className="bg-[#FFFBEB] mx-4 rounded-xl pb-24">
        {/* Show confirm buttons if not confirmed */}
        {!isConfirmed && (
          <div className="px-4 pt-4">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full bg-[#F15A22] text-white py-3.5 rounded-full text-[15px] font-medium mb-3 hover:bg-[#E04D15] transition-colors disabled:opacity-50"
            >
              {loading ? "Confirming..." : "Confirm Subscription11"}
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full text-[#015D3A] text-[15px] mt-3 font-medium hover:opacity-80 transition-opacity"
            >
              Back to Home
            </button>
          </div>
        )}
        {/* Show thank you + details if confirmed */}
        {isConfirmed && (
          <>
            <div className="pt-8 pb-6 mt-[90px] text-center">
              <SuccessCheckmark />
              <motion.h1
                className="text-2xl font-semibold mb-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                Thank you,{" "}
                {userData
                  ? `${userData.firstName} ${userData.lastName}`
                  : "User"}
                !
              </motion.h1>
              <motion.p
                className="text-gray-600 text-sm leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                Your subscription has been confirmed. Get
                <br />
                ready for fresh flowers every morning.
              </motion.p>
            </div>
            <motion.div
              className="bg-white rounded-lg mx-4 p-4 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <h2 className="text-[15px] font-medium mb-3">Delivering to</h2>
              <div className="flex items-start gap-3">
                <FaMapMarkerAlt className="text-gray-400 mt-1" />
                <p className="text-gray-600 text-sm leading-relaxed">
                  {selectedAddress?.street}
                  {selectedAddress?.area && `${selectedAddress.area}, `}
                  {selectedAddress?.city}
                </p>
              </div>
              <div className="mt-4 overflow-hidden rounded-lg">
                <MapView address={selectedAddress} />
              </div>
            </motion.div>
            <motion.div
              className="bg-white rounded-lg mx-4 p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
            >
              <h2 className="text-[15px] font-medium mb-4">
                Your Subscription
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Pack</span>
                  <span className="text-gray-800 text-sm">
                    {subscriptionDetails?.packDetails?.name}
                  </span>
                  <span></span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Frequency</span>
                  <span className="text-gray-800 text-sm">
                    {subscriptionDetails?.type === "DAILY"
                      ? "Daily • Mon-Sat"
                      : "Alternate Days"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">First Delivery</span>
                  <span className="text-gray-800 text-sm">
                    {new Date(
                      subscriptionDetails?.startDate || ""
                    ).toLocaleDateString("en-US", {
                      weekday: "short",
                      hour: "numeric",
                      minute: "numeric",
                      hour12: true,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Price</span>
                  <span className="text-gray-800 text-sm">
                    ₹{subscriptionDetails?.packDetails?.sellingPrice ?? "N/A"}
                    /Pack
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Bottom Navigation */}
            <div className="mb-10 md:mb-10">
              <BottomNavigation />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConfirmSubscription;
