import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaMapMarkerAlt, FaCheck, FaClock, FaBox, FaRupeeSign } from "react-icons/fa";
import ordercnfSvg from "../../assets/svg/gp_daily svg/ordercnf.svg";
import paycnfSvg from "../../assets/svg/gp_daily svg/paycnf.svg";
import clockSvg from "../../assets/svg/gp_daily svg/clock.svg";
import allsetLogo from "../../assets/All/allset_logo.png";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";
import { subscriptionService } from "../../services/subscription.service";
import { customerService } from "@/services/getcustomer.service";
import { orderService } from "@/services/order.service";
import RazorpayPayment from "../Payment/Razorpay/RazorpayPayment";
import { useFeatureTheme } from "../../context/FeatureThemeContext";
import Spinner from "../common/Spinner";
import { SubscriptionFlowSkeleton } from "../common/PageSkeletons";
import { formatCartDeliveryAddress } from "../../utils/formatCartDeliveryAddress";
import { formatDeliveryAddressOrFallback } from "../../utils/formatDeliveryAddress";
import { formatNextDeliveryDateLine } from "../../utils/subscriptionNextDelivery";
import { computeFirstSubscriptionDeliveryDateFromWeekdayInts } from "../../utils/subscriptionFirstDeliveryDate";
import { navigateToGpDailyWalletForRecharge } from "../../utils/gpDailyWalletRechargeRedirect";
import {
  InsufficientWalletModal,
  type InsufficientWalletDetails,
} from "../daily/InsufficientWalletModal";

export type SubscriptionConfirmOrderLine = {
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  unitLabel?: string;
  lineSubtotal: number;
};

export type SubscriptionConfirmOrderSummary = {
  lines: SubscriptionConfirmOrderLine[];
  subtotal: number;
  deliveryFee: number;
  couponCode?: string | null;
  couponDiscount: number;
  total: number;
};

function formatConfirmRupee(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
}

interface SubscriptionDetails {
  basePackId: string;
  type: "DAILY" | "CUSTOM" | "Daily" | "custom";
  startDate: string;
  quantity?: number;
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
  selectedDays?: string[];
  days?: string[];
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
  themeColor?: string;
}

interface UserData {
  id?: string;
  customerId?: string;
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
    className="relative w-20 h-20 mx-auto mb-4"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ 
      type: "spring",
      stiffness: 260,
      damping: 20,
      delay: 0.2 
    }}
  >
    <img
      src={allsetLogo}
      alt="Success"
      className="w-20 h-20 object-contain select-none"
      style={{
        imageRendering: 'auto',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0) scale(1)',
      }}
    />
  </motion.div>
);

const MapView: React.FC<MapViewProps> = ({ address, themeColor: _themeColor = "#F15A22" }) => {
  const { isLoaded, loadError } = useGoogleMaps();

  if (!isLoaded) {
    return (
      <div className="w-full h-[250px] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        <Spinner size={32} />
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
  let hasValidCoords = false;

  if (address?.coordinates) {
    const parts = address.coordinates.split(",").map((s) => Number(String(s).trim()));
    const lat = parts[0];
    const lng = parts[1];
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      center = { lat, lng };
      hasValidCoords = true;
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
        zoom={hasValidCoords ? 18 : 16}
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
        {hasValidCoords ? <Marker position={center} /> : null}
      </GoogleMap>
      {/* Overlay to prevent any map interactions */}
      <div className="absolute inset-0 bg-transparent" />
    </div>
  );
};

const ConfirmSubscription: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { feature, theme } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  // const locationState = location.state as LocationState;
  const [loading, setLoading] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] =
    useState<SubscriptionDetails | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [storeProduct, setStoreProduct] = useState<any>(null);
  const [storeMetaData, setStoreMetaData] = useState<any>(null);
  const [confirmedSubscriptionData, setConfirmedSubscriptionData] = useState<any>(null);
  const [confirmedProductData, setConfirmedProductData] = useState<any>(null);
  const [insufficientWalletModal, setInsufficientWalletModal] =
    useState<InsufficientWalletDetails | null>(null);

  const [, setStatusModal] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "loading";
    message: string;
  }>({
    isOpen: false,
    type: "loading",
    message: "",
  });
  const isStoreProduct = location?.state?.product?.isStore || storeProduct?.isStore;

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

        // For store products, load from localStorage or location.state
        if (location?.state?.product?.isStore || localStorage.getItem("pendingStoreProduct")) {
          const storedProduct = localStorage.getItem("pendingStoreProduct");
          const storedMetaData = localStorage.getItem("pendingStoreMetaData");
          
          if (storedProduct && storedMetaData) {
            try {
              setStoreProduct(JSON.parse(storedProduct));
              setStoreMetaData(JSON.parse(storedMetaData));
            } catch (e) {
              console.error("Error parsing stored product data:", e);
            }
          } else if (location?.state?.product) {
            setStoreProduct(location.state.product);
            setStoreMetaData(location.state.metaData);
            // Store in localStorage for after Razorpay redirect
            localStorage.setItem("pendingStoreProduct", JSON.stringify(location.state.product));
            if (location.state.metaData) {
              localStorage.setItem("pendingStoreMetaData", JSON.stringify(location.state.metaData));
            }
          }
        }

        // Check if coming from confirmed subscription (from AddressSelection)
        if (location?.state?.isConfirmed && !location?.state?.isStoreProduct) {
          // Subscription was confirmed in AddressSelection, show thank you page
          setIsConfirmed(true);
          if (location.state.subscription) {
            setConfirmedSubscriptionData(location.state.subscription);
          }
          if (location.state.product) {
            setConfirmedProductData(location.state.product);
          }
          if (location.state.selectedAddress) {
            setSelectedAddress(location.state.selectedAddress);
          }
          if (location.state.subscriptionDetails) {
            setSubscriptionDetails(location.state.subscriptionDetails);
          }
          return; // Don't load other data, just show thank you page
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
        if (!details && !isStoreProduct) {
          console.error("No subscription details found");
          toast.error("No subscription details found");
          navigate(basePath);
          return;
        }

        try {
          const parsedDetails = JSON.parse(details || "{}");
          const normalizedDetails: SubscriptionDetails = {
            basePackId:
              parsedDetails.basePackId ||
              queryBasePackId ||
              locationState?.basePackId,
            type:
              parsedDetails.type ||
              (parsedDetails.deliveryCount === 7 ? "DAILY" : "CUSTOM"),
            startDate: parsedDetails.startDate,
            amount: parsedDetails.amount || parsedDetails.sellingPrice,
            packDetails: parsedDetails.packDetails,
            deliveryCount: parsedDetails.deliveryCount || 7,
            walletBalance: parsedDetails.walletBalance || 0,
            sellingPrice: parsedDetails.sellingPrice,
            remainingAmount: parsedDetails.remainingAmount,
            deliveryPattern:
              parsedDetails.type === "DAILY" ? "Every day" : "Custom days",
            // Ensure selectedDays is properly included
            selectedDays: parsedDetails.selectedDays ||
              (parsedDetails.type === "CUSTOM" ? [] :
                ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"])
          };

          // console.log('Normalized subscription details:', normalizedDetails);

          // Validate required fields
          if (!normalizedDetails.basePackId && !isStoreProduct) {
            console.error(
              "Missing basePackId in subscription details:",
              normalizedDetails
            );
            toast.error("Invalid subscription details");
            navigate(basePath);
            return;
          }

          // Update localStorage with complete normalized details
          localStorage.setItem(
            "currentSubscription",
            JSON.stringify(normalizedDetails)
          );
          setSubscriptionDetails(normalizedDetails);

          // Check for address from location state first, then localStorage
          let addressToUse = locationState?.selectedAddress || location?.state?.selectedAddress;

          if (!addressToUse && address) {
            try {
              addressToUse = JSON.parse(address);
            } catch (e) {
              console.error("Error parsing address:", e);
            }
          }

          // For store products, also check if address is in location.state
          if (!addressToUse && isStoreProduct && location?.state?.selectedAddress) {
            addressToUse = location.state.selectedAddress;
            // Store in localStorage for after Razorpay redirect
            localStorage.setItem("selectedDeliveryAddress", JSON.stringify(addressToUse));
          }

          // console.log('Selected address:', addressToUse);

          if (!addressToUse && !isStoreProduct) {
            navigate(`${basePath}/subscription/confirm`, {
              state: {
                selectedAddress: address,
                basePackId: normalizedDetails.basePackId,
                subscriptionData: normalizedDetails,
              },
            });
            return;
          }

          if (addressToUse) {
            setSelectedAddress(addressToUse);
          }
        } catch (error) {
          console.error("Error processing subscription details:", error);
          navigate(basePath);
        }
      } catch (error: any) {
        console.error("Error in loadData:", error);
        navigate(basePath);
      }
    };

    loadData();
  }, [navigate, location.state]);

  const handleConfirm = async () => {
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
          type: subscriptionDetails.type.toUpperCase() as "DAILY" | "CUSTOM",
          startDate: startDate,
          days: subscriptionDetails.deliveryCount || 7,
          // Include selectedDays for CUSTOM subscriptions
          ...(subscriptionDetails.type.toUpperCase() === "CUSTOM" && subscriptionDetails.selectedDays && {
            selectedDays: subscriptionDetails.selectedDays
          })
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
        const selectedDays = subscriptionDetails.selectedDays ||
          (subscriptionDetails.type.toUpperCase() === "DAILY"
            ? ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
            : []);

        // Validate custom subscription has delivery days
        if (subscriptionDetails.type.toUpperCase() === "CUSTOM" && (!selectedDays || selectedDays.length === 0)) {
          throw new Error("Please select at least one delivery day for custom subscription");
        }

        const qty =
          typeof subscriptionDetails.quantity === "number" &&
          subscriptionDetails.quantity > 0
            ? Math.floor(subscriptionDetails.quantity)
            : Math.max(
                1,
                parseInt(String(subscriptionDetails.quantity ?? "1"), 10) || 1,
              );
        // Prepare confirm request data
        const confirmData = {
          basePackId: subscriptionDetails.basePackId,
          deliveryAddressId: selectedAddress.id,
          type: subscriptionDetails.type.toUpperCase() as "DAILY" | "CUSTOM",
          startDate: startDate,
          selectedDays: selectedDays,
          quantity: qty,
        };

        // Log the confirm request data
        // Then confirm the subscription
        const confirmResponse = await subscriptionService.confirmSubscription(
          confirmData
        );
        if (confirmResponse.success) {
          // Store the backend response data
          setConfirmedSubscriptionData(confirmResponse.subscription);
          // Handle product from response (it may be in the response object directly)
          const responseWithProduct = confirmResponse as any;
          if (responseWithProduct.product) {
            setConfirmedProductData(responseWithProduct.product);
          }
          
          const confirmedSubscription = {
            ...confirmResponse.subscription,
            deliveryAddress: selectedAddress,
            confirmedAt: new Date().toISOString(),
            packDetails: subscriptionDetails.packDetails,
            type: subscriptionDetails.type,
            deliveryCount: subscriptionDetails.deliveryCount,
            sellingPrice: subscriptionDetails.sellingPrice,
            product: responseWithProduct.product,
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
          navigate(basePath);
        } else if (errorMessage.includes("Authentication required")) {
          toast.error("Please login to continue");
          navigate(`${basePath}/login`, {
            state: { returnUrl: `${basePath}/subscription/confirm` },
          });
        } else if (errorMessage.includes("Insufficient wallet balance")) {
          const totalRequired =
            Number(subscriptionDetails.sellingPrice || subscriptionDetails.amount) *
            Number(subscriptionDetails.deliveryCount || 7);
          const currentBalance = Number(subscriptionDetails.walletBalance) || 0;
          setInsufficientWalletModal({
            currentBalance,
            requiredAmount: totalRequired,
            shortageAmount: Math.max(0, totalRequired - currentBalance),
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
    }
    // For store products, we don't create order here - it will be created after payment
  };

  const handleStoreProductPayment = async (paymentData: any) => {
    if (!isStoreProduct || !selectedAddress || !storeProduct || !storeMetaData) {
      toast.error("Missing order details or address");
      return;
    }

    const resolvedCustomerId = userData?.id || userData?.customerId;
    if (!resolvedCustomerId) {
      toast.error("Customer information not available. Please refresh the page.");
      return;
    }

    const resolvedProductId = storeProduct.id || (storeProduct as any)?.productId;
    const resolvedQuantity = Number(storeMetaData.quantity);
    const resolvedDeliveryTime = storeMetaData.deliveryTime || new Date().toISOString();

    const missingFields = {
      customerId: !resolvedCustomerId && !localStorage.getItem("phoneNumber"),
      productId: !resolvedProductId,
      quantity: !resolvedQuantity || Number.isNaN(resolvedQuantity),
      addressId: !selectedAddress.id,
      paymentDetailsMissing:
        !paymentData?.razorpay_payment_id ||
        !paymentData?.razorpay_order_id ||
        !paymentData?.razorpay_signature,
    };

    if (
      missingFields.customerId ||
      missingFields.productId ||
      missingFields.quantity ||
      missingFields.addressId ||
      missingFields.paymentDetailsMissing
    ) {
      console.error("Missing required order fields (store confirm):", {
        ...missingFields,
        addressId: selectedAddress.id,
        productId: resolvedProductId,
        quantity: resolvedQuantity,
      });
      toast.error("Order information incomplete. Please try again.");
      return;
    }

    setIsProcessingPayment(true);

    try {
      const storeProductPayload = {
        customerId: resolvedCustomerId,
        subscriptionId: "",
        productId: resolvedProductId,
        quantity: resolvedQuantity,
        addressId: selectedAddress.id,
        deliveredBy: "",
        routeId: "",
        isStore: storeProduct.isStore ?? true,
        deliveryTime: resolvedDeliveryTime,
        paymentDetails: {
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_signature: paymentData.razorpay_signature,
          paymentMethod: "razorpay",
        }
      };

      const { success, orderId, paymentId, amount } = await orderService.createStoreOrderWithPayment(storeProductPayload);
      if (success) {
        setStatusModal({
          isOpen: true,
          type: "success",
          message: "Order created successfully!",
        });
        toast.success("Order created successfully!");
        setIsConfirmed(true);

        // Clear pending store product data from localStorage
        localStorage.removeItem("pendingStoreProduct");
        localStorage.removeItem("pendingStoreMetaData");

        // Store order details for reference
        localStorage.setItem("lastStoreOrder", JSON.stringify({
          orderId,
          paymentId,
          amount,
          product: storeProduct,
          address: selectedAddress,
          deliveryTime: resolvedDeliveryTime,
          createdAt: new Date().toISOString()
        }));
      } else {
        throw new Error("Failed to create order");
      }
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error(error.message || "Failed to create order. Please try again.");
    } finally {
      setIsProcessingPayment(false);
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
    return <SubscriptionFlowSkeleton />;
  }

  const checkoutSub = confirmedSubscriptionData || location?.state?.subscription;
  const orderSummary = (location?.state as { orderSummary?: SubscriptionConfirmOrderSummary })
    ?.orderSummary;
  const checkoutAddr = (checkoutSub?.delivery_address ?? checkoutSub?.address) || null;
  const checkoutItems: any[] = Array.isArray(checkoutSub?.items) ? checkoutSub.items : [];
  const deliveryDaysInts: number[] = Array.isArray(checkoutSub?.delivery_days)
    ? checkoutSub.delivery_days
    : [];
  const deliveryDaysDisplay: string[] = Array.isArray(checkoutSub?.delivery_days_display)
    ? checkoutSub.delivery_days_display
    : [];
  const fee = orderSummary
    ? Number(orderSummary.deliveryFee) || 0
    : Number(checkoutSub?.delivery_fee ?? 0) || 0;
  const itemsTotal = orderSummary
    ? Number(orderSummary.subtotal) || 0
    : checkoutItems.reduce((sum, it) => {
        const lineSubtotal = Number(it?.subtotal);
        if (Number.isFinite(lineSubtotal) && lineSubtotal > 0) return sum + lineSubtotal;
        const qty = Number(it?.quantity ?? 1);
        const unit = Number(it?.unit_price ?? 0);
        return sum + qty * unit;
      }, 0);
  const couponDiscount = Math.max(
    0,
    Number(
      orderSummary?.couponDiscount ??
        (location?.state as { couponDiscount?: number })?.couponDiscount ??
        checkoutSub?.coupon_discount ??
        0,
    ) || 0,
  );
  const couponCode =
    orderSummary?.couponCode ??
    (location?.state as { couponCode?: string })?.couponCode ??
    checkoutSub?.coupon_code ??
    null;
  const grandTotal = orderSummary
    ? Math.max(0, Number(orderSummary.total) || 0)
    : Math.max(0, itemsTotal + fee - couponDiscount);

  const displayLines: SubscriptionConfirmOrderLine[] = orderSummary?.lines?.length
    ? orderSummary.lines
    : checkoutItems.map((it) => {
        const qty = Number(it?.quantity ?? 1);
        const unitPrice = Number(it?.unit_price ?? 0);
        const lineSubtotal = Number(it?.subtotal);
        const productName = String(it?.product?.name ?? "Pack");
        const variantName =
          it?.variant_name != null && String(it.variant_name).trim()
            ? String(it.variant_name).trim()
            : undefined;
        return {
          productName,
          variantName,
          quantity: qty,
          unitPrice,
          unitLabel: String(it?.product?.unit ?? "Pack"),
          lineSubtotal:
            Number.isFinite(lineSubtotal) && lineSubtotal > 0
              ? lineSubtotal
              : qty * unitPrice,
        };
      });

  const nextDeliveryDisplayLine =
    deliveryDaysInts.length > 0
      ? formatNextDeliveryDateLine(
          computeFirstSubscriptionDeliveryDateFromWeekdayInts(deliveryDaysInts),
        )
      : null;

  return (
    <div className="min-h-screen bg-[#f8f6f1] flex justify-center items-center px-4 pb-nav-bottom">
      <div className="bg-[#f8f6f1] w-full max-w-[800px] rounded-xl">
        {/* Show confirm buttons if not confirmed */}
        {!isConfirmed && (
          <div className="px-4 pt-4">
            {isStoreProduct ? (
              <>
                <RazorpayPayment
                  amount={(storeProduct?.sellingPrice || 0) * (storeMetaData?.quantity || 1)}
                  purpose="store_product_payment"
                  onSuccess={handleStoreProductPayment}
                  onError={(error) => {
                    toast.error(error.message || "Payment failed. Please try again.");
                  }}
                  className="w-full bg-[#F15A22] text-white py-3.5 rounded-full text-[15px] font-medium mb-3 hover:bg-[#E04D15] transition-colors disabled:opacity-50"
                  buttonText={
                    isProcessingPayment ? "Processing..." : "Pay & Confirm Order"
                  }
                  disabled={isProcessingPayment}
                />
                <button
                  onClick={() => navigate(basePath)}
                  className="w-full text-[#015D3A] text-[15px] mt-3 font-medium hover:opacity-80 transition-opacity"
                >
                  Back to Home
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="w-full text-white py-3.5 rounded-full text-[15px] font-medium mb-3 hover:opacity-90 transition-colors disabled:opacity-50"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  {loading ? "Confirming..." : "Confirm Subscription"}
                </button>
                <button
                  onClick={() => navigate(basePath)}
                  className="w-full text-[#015D3A] text-[15px] mt-3 font-medium hover:opacity-80 transition-opacity"
                >
                  Back to Home
                </button>
              </>
            )}
          </div>
        )}

        {/* Show thank you + details if confirmed */}
        {isConfirmed && !isStoreProduct && (
          <>
            <div className="pt-8 pb-4 text-center">
              <SuccessCheckmark />
              <motion.h1
                className="text-3xl font-bold text-gray-900 mb-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Thank you
              </motion.h1>
              <motion.p
                className="text-gray-900 text-base"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                Your daily flower subscription is confirmed.
              </motion.p>
            </div>

            {/* Subscription Details Card */}
            <motion.div
              className="bg-white rounded-xl mx-4 p-4 mb-4 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              {/* Address Section */}
              <div className="mb-4">
                <div className="flex items-start gap-3 mb-3">
                  <FaMapMarkerAlt className="text-gray-600 mt-1 flex-shrink-0 text-lg" />
                  <p className="text-gray-900 text-sm leading-relaxed">
                    {checkoutAddr
                      ? checkoutAddr.address_line1 || checkoutAddr.address_line2
                        ? formatDeliveryAddressOrFallback(
                            checkoutAddr as Record<string, unknown>
                          )
                        : formatCartDeliveryAddress({
                            houseNo: checkoutAddr.houseNo,
                            streetName: checkoutAddr.streetName,
                            area: checkoutAddr.area || checkoutAddr.landmark,
                            city: checkoutAddr.city,
                            state: checkoutAddr.state,
                            pincode: checkoutAddr.pincode,
                          })
                      : selectedAddress
                        ? formatCartDeliveryAddress({
                            streetName: selectedAddress.street,
                            area: selectedAddress.area,
                            city: selectedAddress.city,
                            state: selectedAddress.state,
                            pincode: selectedAddress.pincode,
                          })
                        : "Address not available"}
                  </p>
                </div>
                <div className="mt-3 overflow-hidden -mx-4">
                  <MapView
                    address={
                      selectedAddress ||
                      (checkoutAddr
                        ? {
                            id: String(checkoutAddr.id ?? ''),
                            street: String(checkoutAddr.address_line2 ?? checkoutAddr.streetName ?? ''),
                            area: String(checkoutAddr.landmark ?? checkoutAddr.area ?? ''),
                            city: String(checkoutAddr.city ?? ''),
                            state: String(checkoutAddr.state ?? ''),
                            pincode: String(checkoutAddr.pincode ?? ''),
                            coordinates: `${checkoutAddr.latitude ?? ''},${checkoutAddr.longitude ?? ''}`,
                          }
                        : null)
                    }
                    themeColor={theme.colors.primary}
                  />
                </div>
              </div>

              {/* Delivery Time */}
              <div className="flex items-start gap-3 mb-4">
              <img src={clockSvg} alt="Clock" className="w-6 h-6 opacity-80" />
                <p className="text-gray-900 text-sm">
                  {nextDeliveryDisplayLine ?? "Next delivery date unavailable"}
                </p>
              </div>

              {/* Selected Days */}
              <div className="mb-4">
                <div className="grid grid-cols-7 gap-1.5 w-full">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                    // Map display names to API format (3-letter abbreviations)
                    const dayToApiFormat: { [key: string]: string } = {
                      'Mon': 'MON',
                      'Tue': 'TUE',
                      'Wed': 'WED',
                      'Thu': 'THU',
                      'Fri': 'FRI',
                      'Sat': 'SAT',
                      'Sun': 'SUN'
                    };
                    
                    // Also map to full names for backward compatibility
                    const dayToFullName: { [key: string]: string } = {
                      'Mon': 'MONDAY',
                      'Tue': 'TUESDAY',
                      'Wed': 'WEDNESDAY',
                      'Thu': 'THURSDAY',
                      'Fri': 'FRIDAY',
                      'Sat': 'SATURDAY',
                      'Sun': 'SUNDAY'
                    };
                    
                    const dayAbbrev = dayToApiFormat[day]; // "MON", "TUE", etc.
                    const dayFull = dayToFullName[day]; // "MONDAY", "TUESDAY", etc.
                    
                    // Check if day is in deliveryDays array from API response
                    // Handle both confirmedSubscriptionData and subscription from location.state
                    const subscriptionData = checkoutSub;
                    const deliveryPreference =
                      typeof subscriptionData?.deliveryPreference === 'string'
                        ? subscriptionData.deliveryPreference
                        : null;
                    
                    // Day is selected if:
                    // 1. deliveryPreference is 'DAILY' (all days selected), OR
                    // 2. The day is in the deliveryDays array (check both 3-letter abbrev and full name)
                    let isSelected = false;
                    if (deliveryPreference === 'DAILY') {
                      isSelected = true;
                    } else if (deliveryDaysInts.length > 0) {
                      const mapShortToInt: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
                      isSelected = deliveryDaysInts.includes(mapShortToInt[day]);
                    } else if (deliveryDaysDisplay.length > 0) {
                      // Fallback: display list
                      isSelected = deliveryDaysDisplay.some((d) => String(d).toLowerCase().startsWith(day.toLowerCase()));
                    }
                    
                    return (
                      <button
                        key={day}
                        className={`py-2 rounded-2xl text-sm font-semibold transition-colors ${
                          isSelected
                            ? 'text-black'
                            : 'bg-gray-100 text-gray-700 border-2 border-gray-300'
                        }`}
                        style={isSelected ? { backgroundColor: theme.colors.primary } : {}}
                        disabled
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2 mb-4">
                {displayLines.map((line, idx) => {
                  const unitLabel = line.unitLabel || "Pack";
                  const label = line.variantName
                    ? `${line.productName} (${line.variantName})`
                    : line.productName;
                  return (
                    <div
                      key={`${label}-${idx}`}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        <img
                          src={ordercnfSvg}
                          alt=""
                          className="mt-0.5 h-5 w-5 shrink-0 opacity-80"
                          aria-hidden
                        />
                        <span className="min-w-0 text-xs font-medium leading-snug text-gray-900 line-clamp-2">
                          {label} x {line.quantity}
                        </span>
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-xs font-medium text-gray-900">
                        ₹{formatConfirmRupee(line.unitPrice)}/{unitLabel}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-gray-600 text-sm">Delivery fee</span>
                  <span className="text-gray-900 text-sm font-medium">₹{formatConfirmRupee(fee)}</span>
                </div>
                {couponDiscount > 0 ? (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-gray-600 text-sm">
                      Promo{couponCode ? ` (${couponCode})` : ""}
                    </span>
                    <span className="text-sm font-medium text-green-700">
                      -₹{formatConfirmRupee(couponDiscount)}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Total Amount */}
              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-3">
                  <img src={paycnfSvg} alt="Payment" className="w-6 h-6 opacity-80" />
                  <span className="text-gray-900 text-sm font-medium">Total Amount</span>
                </div>
                <span className="text-gray-900 text-lg font-medium">
                  ₹{formatConfirmRupee(grandTotal)}
                </span>
              </div>
            </motion.div>

            {/* Explore more packs */}
            <motion.div
              className="px-4 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3 }}
            >
              <button
                onClick={() => navigate(`${basePath}/explore-more`)}
                className="w-full text-grey-900 py-3.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: theme.colors.primary }}
              >
                Explore More Packs
              </button>
            </motion.div>

            {/* Customer Care Info */}
            {/* <motion.p
              className="text-center text-gray-600 text-xs mb-24"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              Our customer care is available 24/7
            </motion.p> */}

          </>
        )}
      </div>

      <InsufficientWalletModal
        open={insufficientWalletModal != null}
        details={insufficientWalletModal}
        onClose={() => setInsufficientWalletModal(null)}
        onRecharge={() => {
          const details = insufficientWalletModal;
          setInsufficientWalletModal(null);
          if (!details) return;
          navigateToGpDailyWalletForRecharge(navigate, basePath, {
            shortageAmount: details.shortageAmount,
            currentBalance: details.currentBalance,
            totalRequired: details.requiredAmount,
            returnUrl: `${basePath}/subscription/confirm`,
          });
        }}
      />
    </div>
  );
};

export default ConfirmSubscription;
