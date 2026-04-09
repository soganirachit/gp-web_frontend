import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa";
import { MdLocationOn, MdMyLocation } from "react-icons/md";
import { IoArrowBack } from "react-icons/io5";
import { toast } from "react-hot-toast";
import { addressService, Address } from "../../services/address.service";
import { GoogleMap } from "@react-google-maps/api";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";
import ReactDOM from "react-dom/client";
import { orderService } from "../../services/order.service";
import { subscriptionService } from "../../services/subscription.service";
import { customerService } from "../../services/getcustomer.service";
import { useFeatureTheme } from "../../context/FeatureThemeContext";
import { AddressSelectionSkeleton } from "../common/PageSkeletons";
import { formatPhoneForDisplay } from "../../utils/phoneDisplay";
import homeIcon from "../../assets/svg/adressbook/home.svg";
import workIcon from "../../assets/svg/adressbook/office.svg";
import othersIcon from "../../assets/svg/adressbook/others.svg";

const AddressSelection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { feature, theme } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [addressValidation, setAddressValidation] = useState<{
    isValid: boolean;
    message?: string;
  } | null>(null);

  // Map related states
  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded, loadError } = useGoogleMaps();
  const isLocationRequestInProgress = useRef(false);
  const lastToastMessage = useRef<string | null>(null);
  const hasInitialized = useRef(false);
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number, lng: number }>({
    lat: 20.5937,
    lng: 78.9629
  });
  const [locationValidation, setLocationValidation] = useState<{
    isValid: boolean;
    message?: string;
  } | null>(null);
  /** Brief on-map hint when GPS / geocode succeeds (replaces toast) */
  const [showMapLocationHint, setShowMapLocationHint] = useState(false);
  /** After saving a new address, show on-screen confirmation (replaces toast) */
  const [showAddressAddedInline, setShowAddressAddedInline] = useState(false);

  const [formData, setFormData] = useState({
    houseNo: "",
    streetName: "",
    area: "",
    landmark: "",
    associatedPhoneNumber: "",
    pincode: "",
    city: "",
    district: "",
    state: "",
    coordinates: "",
    setAsDefault: false,
  });
  const isStoreProduct = location.state?.product?.isStore;
  const [userData, setUserData] = useState<any>(null);

  const getTypeIcon = (type: string) => {
    const t = type?.toLowerCase();
    if (t === "home") return homeIcon;
    if (t === "work" || t === "office") return workIcon;
    return othersIcon;
  };

  /** Same pattern as My Addresses — static preview map per card */
  const AddressThumbnailMap: React.FC<{ coordinates: string }> = ({ coordinates }) => {
    const parts = coordinates.split(",").map((s) => Number(s.trim()));
    const lat = parts[0];
    const lng = parts[1];
    if (!isLoaded || Number.isNaN(lat) || Number.isNaN(lng)) {
      return <div className="h-full w-full animate-pulse rounded-lg bg-gray-200" />;
    }
    return (
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%", borderRadius: "0.5rem" }}
        center={{ lat, lng }}
        zoom={15}
        options={{
          disableDefaultUI: true,
          draggable: false,
          zoomControl: false,
          scrollwheel: false,
          disableDoubleClickZoom: true,
        }}
      />
    );
  };

  useEffect(() => {
    // Prevent double execution in StrictMode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (!localStorage.getItem("phoneNumber")) {
      handleAuthError(
        new Error("Authentication required. Please login to continue.")
      );
      return;
    }
    loadAddresses();

    const loadUserData = async () => {
      try {
        const customers = await customerService.getAllCustomers();
        if (customers && customers.length > 0) {
          setUserData(customers[0]);
        }
      } catch (err) {
        console.error("Failed to fetch customer data:", err);
      }
    };

    loadUserData();
  }, []);



  const handleAuthError = (error: Error) => {
    const isAuthError =
      error.message.includes("login") ||
      error.message.includes("session expired");
    if (isAuthError) {
      localStorage.setItem("redirectAfterLogin", location.pathname);
      localStorage.removeItem("selectedDeliveryAddress");
      navigate(`${basePath}/login`, {
        state: {
          returnUrl: location.pathname,
          message: error.message,
        },
      });
    } else {
      // Prevent duplicate toast messages
      if (lastToastMessage.current !== error.message) {
        lastToastMessage.current = error.message;
        toast.error(error.message);
      }
    }
  };

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const savedAddresses = await addressService.getAllAddresses();
      setAddresses(savedAddresses);

      const storedAddress = localStorage.getItem("selectedDeliveryAddress");
      if (storedAddress) {
        const parsedAddress = JSON.parse(storedAddress);
        const addressExists = savedAddresses.some(
          (addr) => addr.id === parsedAddress.id
        );
        if (addressExists) {
          setSelectedAddress(parsedAddress);
        } else {
          localStorage.removeItem("selectedDeliveryAddress");
        }
      }
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate location before saving
    if (!formData.coordinates) {
      toast.error('Please select a location on the map');
      return;
    }

    // First validate coordinates format
    if (!addressService.validateCoordinatesFormat(formData.coordinates)) {
      toast.error('Invalid coordinates format');
      setLocationValidation({ isValid: false, message: 'Invalid coordinates format' });
      return;
    }

    // Then validate delivery area
    try {
      setIsValidatingAddress(true);
      const validation = await addressService.validateAddressInDeliveryArea(formData.coordinates);
      setLocationValidation(validation);

      if (!validation.isValid) {
        toast.error(validation.message || 'Address is outside delivery area');
        return;
      }

      // If validation passes, proceed with saving
      setLoading(true);

      // Create address data with only the fields that match the AddressInput interface
      const addressData = {
        houseNo: formData.houseNo,
        streetName: formData.streetName,
        area: formData.area,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        district: formData.district,
        associatedPhoneNumber: formData.associatedPhoneNumber,
        coordinates: formData.coordinates,
        setAsDefault: formData.setAsDefault
      };

      const newAddress = await addressService.createAddress(addressData);

      setShowAddressAddedInline(true);
      window.setTimeout(() => setShowAddressAddedInline(false), 5000);

      setShowAddForm(false);

      // Reset form
      setFormData({
        houseNo: "",
        streetName: "",
        area: "",
        landmark: "",
        associatedPhoneNumber: "",
        pincode: "",
        city: "",
        district: "",
        state: "",
        coordinates: "",
        setAsDefault: false,
      });

      await loadAddresses();
      setSelectedAddress(newAddress);
      localStorage.setItem(
        "selectedDeliveryAddress",
        JSON.stringify(newAddress)
      );
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setLoading(false);
      setIsValidatingAddress(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateAddressInDeliveryArea = async (address: Address): Promise<boolean> => {
    if (!address.coordinates) {
      toast.error('Address coordinates not available');
      return false;
    }

    try {
      setIsValidatingAddress(true);

      // First validate coordinates format
      if (!addressService.validateCoordinatesFormat(address.coordinates)) {
        toast.error('Invalid coordinates format');
        setAddressValidation({ isValid: false, message: 'Invalid coordinates format' });
        return false;
      }

      const validation = await addressService.validateAddressInDeliveryArea(address.coordinates);
      setAddressValidation({
        isValid: validation.isValid,
        message:
          validation.message ||
          (validation.isValid ? 'We deliver to this location.' : 'Address is outside delivery area'),
      });

      if (!validation.isValid) {
        toast.error(validation.message || 'Address is outside delivery area');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error validating address:', error);
      toast.error('Failed to validate address location');
      setAddressValidation({ isValid: false, message: 'Failed to validate address location' });
      return false;
    } finally {
      setIsValidatingAddress(false);
    }
  };

  const handleAddressSelect = async (address: Address) => {
    // Validate address before selecting
    const isAddressValid = await validateAddressInDeliveryArea(address);
    if (!isAddressValid) {
      return;
    }

    setSelectedAddress(address);
    localStorage.setItem("selectedDeliveryAddress", JSON.stringify(address));

    // Get the current subscription data
    const subscriptionData = localStorage.getItem("currentSubscription");
    if (subscriptionData) {
      const parsedData = JSON.parse(subscriptionData);
      // Ensure basePackId is preserved
      if (!parsedData.basePackId && location.state?.basePackId) {
        parsedData.basePackId = location.state.basePackId;
        localStorage.setItem("currentSubscription", JSON.stringify(parsedData));
      }
    }

    const returnUrl = location.state?.returnUrl;
    if (returnUrl) {
      navigate(returnUrl, {
        state: {
          basePackId: location.state?.basePackId,
          subscriptionData: location.state?.subscriptionData,
        },
      });
    }
  };

  const createStoreOrder = () => { };

  const handleContinue = async () => {
    if (!selectedAddress) {
      toast.error("Please select an address");
      return;
    }

    // Validate address is within delivery area
    const isAddressValid = await validateAddressInDeliveryArea(selectedAddress);
    if (!isAddressValid) {
      return;
    }

    // try {
    //   // Get the current subscription data
    //   const subscriptionData = localStorage.getItem("currentSubscription");
    //   if (!subscriptionData && !isStoreProduct) {
    //     toast.error("Subscription details not found. Please try again.");
    //     navigate("/");
    //     return;
    //   }

    //   const parsedData = JSON.parse(subscriptionData || "{}");

    //   // Ensure basePackId is preserved
    //   if (!parsedData.basePackId && location.state?.basePackId) {
    //     parsedData.basePackId = location.state?.basePackId;
    //     localStorage.setItem("currentSubscription", JSON.stringify(parsedData));
    //   }

    //   // Navigate to the return URL or default to confirm page
    //   const returnUrl = location.state?.returnUrl || "/subscription/confirm";
    //   navigate(returnUrl, {
    //     state: {
    //       basePackId: parsedData.basePackId,
    //       subscriptionData: parsedData,
    //       selectedAddress: selectedAddress,
    //       product: location.state?.product,
    //       metaData: location.state?.metaData,
    //     },
    //   });
    // } catch (error) {
    //   toast.error("An error occurred. Please try again.");
    // }

    try {
      // Check if coming from cart page (for both gp-store and gp-daily)
      if (location.state?.fromCart) {
        // Save selected address and navigate back to cart
        localStorage.setItem('selectedDeliveryAddress', JSON.stringify(selectedAddress));
        const cartPath = feature === 'gpStore' ? '/gp-store/basket' : '/gp-daily/basket';
        navigate(cartPath, {
          state: {
            selectedAddress: selectedAddress,
            addressUpdated: true,
          },
        });
        return;
      }

      // For store products, handle payment directly
      if (isStoreProduct) {
        // Ensure userData is loaded before proceeding
        let currentUserData = userData;
        if (!currentUserData?.id) {
          try {
            const customers = await customerService.getAllCustomers();
            if (customers && customers.length > 0) {
              currentUserData = customers[0];
              setUserData(customers[0]);
            } else {
              toast.error("Customer information not available. Please refresh the page.");
              return;
            }
          } catch (err) {
            console.error("Failed to fetch customer data:", err);
            toast.error("Failed to load customer information. Please refresh the page.");
            return;
          }
        }

        if (!location.state?.product || !location.state?.metaData) {
          toast.error("Product information not available. Please try again.");
          return;
        }

        // Store product and metaData in localStorage for after Razorpay redirect
        localStorage.setItem("pendingStoreProduct", JSON.stringify(location.state.product));
        localStorage.setItem("pendingStoreMetaData", JSON.stringify(location.state.metaData));
        localStorage.setItem("selectedDeliveryAddress", JSON.stringify(selectedAddress));

        // Set loading to true to show "Processing..." on button
        setLoading(true);

        // Import the RazorpayPayment component dynamically
        const { default: RazorpayPayment } = await import("../Payment/Rezorpay/RezorpayPayment");

        // Handle store product payment directly
        // Use currentUserData (local variable) to avoid closure issues
        const handleStoreProductPayment = async (paymentData: any) => {
          if (!isStoreProduct || !selectedAddress) {
            toast.error("Missing order details or address");
            setLoading(false);
            return;
          }

          // Get fresh userData if needed (in case of redirect or closure issue)
          let customerData = currentUserData;
          if (!customerData?.id && !customerData?.customerId) {
            try {
              const customers = await customerService.getAllCustomers();
              console.log("Fetched customers:", customers);
              if (customers && customers.length > 0) {
                customerData = customers[0];
                console.log("Using customer data:", customerData);
              } else {
                console.error("No customers returned from API");
                toast.error("Customer information not available. Please refresh the page.");
                setLoading(false);
                return;
              }
            } catch (err) {
              console.error("Failed to fetch customer data:", err);
              toast.error("Failed to load customer information. Please refresh the page.");
              setLoading(false);
              return;
            }
          }

          // Log customer data to debug
          console.log("Customer data for order:", {
            hasId: !!customerData?.id,
            customerId: customerData?.id,
            fullData: customerData
          });

          // Get product and metaData from localStorage (after redirect) or location.state
          const storedProduct = localStorage.getItem("pendingStoreProduct");
          const storedMetaData = localStorage.getItem("pendingStoreMetaData");
          const storedAddress = localStorage.getItem("selectedDeliveryAddress");

          let productToUse = location.state?.product;
          let metaDataToUse = location.state?.metaData;
          let addressToUse = selectedAddress;

          if (storedProduct && storedMetaData) {
            try {
              productToUse = JSON.parse(storedProduct);
              metaDataToUse = JSON.parse(storedMetaData);
            } catch (e) {
              console.error("Error parsing stored product data:", e);
            }
          }

          if (storedAddress) {
            try {
              addressToUse = JSON.parse(storedAddress);
            } catch (e) {
              console.error("Error parsing stored address:", e);
            }
          }

          if (!productToUse || !metaDataToUse || !addressToUse) {
            toast.error("Order information not available. Please try again.");
            setLoading(false);
            return;
          }

          const resolvedCustomerId = customerData?.id || customerData?.customerId;
          const resolvedProductId = productToUse.id || productToUse.productId;
          const resolvedQuantity = Number(metaDataToUse.quantity);
          const resolvedDeliveryTime = metaDataToUse.deliveryTime || new Date().toISOString();

          const missingFields = {
            customerId: !resolvedCustomerId && !localStorage.getItem("phoneNumber"),
            productId: !resolvedProductId,
            quantity: !resolvedQuantity || Number.isNaN(resolvedQuantity),
            addressId: !addressToUse.id,
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
            console.error("Missing required order fields:", {
              ...missingFields,
              addressId: addressToUse.id,
              productId: resolvedProductId,
              quantity: resolvedQuantity,
            });
            toast.error("Order information incomplete. Please try again.");
            setLoading(false);
            return;
          }

          try {
            // Build payload - include customerId explicitly and coerce numeric values
            const storeProductPayload: any = {
              customerId: resolvedCustomerId,
              subscriptionId: "",
              productId: resolvedProductId,
              quantity: resolvedQuantity,
              addressId: addressToUse.id,
              deliveredBy: "",
              routeId: "",
              isStore: productToUse.isStore ?? true,
              deliveryTime: resolvedDeliveryTime,
              paymentDetails: {
                razorpay_payment_id: paymentData.razorpay_payment_id,
                razorpay_order_id: paymentData.razorpay_order_id,
                razorpay_signature: paymentData.razorpay_signature,
                paymentMethod: "razorpay",
              }
            };

            console.log("Creating store order with payload:", {
              ...storeProductPayload,
              paymentDetails: { ...storeProductPayload.paymentDetails } // Log without sensitive data
            });

            const { success, orderId, paymentId, amount } = await orderService.createStoreOrderWithPayment(storeProductPayload);
            if (success) {
              // Clear pending store product data from localStorage
              localStorage.removeItem("pendingStoreProduct");
              localStorage.removeItem("pendingStoreMetaData");

              toast.success("Order created successfully!");

              // Store order details for reference
              localStorage.setItem("lastStoreOrder", JSON.stringify({
                orderId,
                paymentId,
                amount,
                product: productToUse,
                address: addressToUse,
                deliveryTime: resolvedDeliveryTime,
                createdAt: new Date().toISOString()
              }));

              // Navigate directly to thank you page
              navigate(`${basePath}/subscription/confirm`, {
                state: {
                  isConfirmed: true,
                  isStoreProduct: true,
                  selectedAddress: addressToUse,
                  product: productToUse,
                  metaData: { ...metaDataToUse, quantity: resolvedQuantity, deliveryTime: resolvedDeliveryTime }
                }
              });
            } else {
              throw new Error("Failed to create order");
            }
          } catch (error: any) {
            console.error("Error creating order:", error);
            toast.error(error.message || "Failed to create order. Please try again.");
            setLoading(false); // Reset loading state on error
          }
        };

        // Create a hidden div to render the payment component
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        tempDiv.style.visibility = 'hidden';
        document.body.appendChild(tempDiv);

        // Render the payment component
        const root = ReactDOM.createRoot(tempDiv);
        root.render(
          <RazorpayPayment
            amount={location.state?.product?.sellingPrice * location.state?.metaData?.quantity || 0}
            purpose="store_product_payment"
            onSuccess={handleStoreProductPayment}
            onError={(error) => {
              toast.error(error.message || "Payment failed. Please try again.");
              document.body.removeChild(tempDiv);
              setLoading(false); // Reset loading state on error
            }}
          />
        );

        // Automatically trigger the payment after component renders
        setTimeout(() => {
          const paymentButton = tempDiv.querySelector('button');
          if (paymentButton) {
            paymentButton.click();
          }
        }, 200);

        return;
      }

      // For subscriptions, confirm directly and show thank you page
      const subscriptionData = localStorage.getItem("currentSubscription");
      if (!subscriptionData) {
        toast.error("Subscription details not found. Please try again.");
        navigate(basePath);
        return;
      }

      const parsedData = JSON.parse(subscriptionData);

      // Validate required fields
      if (!parsedData.basePackId) {
        console.error("Missing basePackId");
        toast.error("Missing base pack ID");
        return;
      }

      if (!parsedData.type) {
        console.error("Missing type");
        toast.error("Missing subscription type");
        return;
      }

      try {
        setLoading(true);

        const startDate = new Date(parsedData.startDate);

        // Prepare initiate request data
        const initiateData = {
          basePackId: String(parsedData.basePackId),
          type: parsedData.type.toUpperCase() as "DAILY" | "CUSTOM",
          startDate: startDate,
          days: parsedData.deliveryCount || 7,
          ...(parsedData.type.toUpperCase() === "CUSTOM" && parsedData.selectedDays && {
            selectedDays: parsedData.selectedDays
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
        const selectedDays = parsedData.selectedDays ||
          (parsedData.type.toUpperCase() === "DAILY"
            ? ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
            : []);

        // Validate custom subscription has delivery days
        if (parsedData.type.toUpperCase() === "CUSTOM" && (!selectedDays || selectedDays.length === 0)) {
          throw new Error("Please select at least one delivery day for custom subscription");
        }

        // Prepare confirm request data
        const qty =
          typeof parsedData.quantity === "number" && parsedData.quantity > 0
            ? Math.floor(parsedData.quantity)
            : Math.max(
                1,
                parseInt(String(parsedData.quantity ?? "1"), 10) || 1,
              );
        const confirmData = {
          basePackId: parsedData.basePackId,
          deliveryAddressId: selectedAddress.id,
          type: parsedData.type.toUpperCase() as "DAILY" | "CUSTOM",
          startDate: startDate,
          selectedDays: selectedDays,
          quantity: qty,
        };

        // Then confirm the subscription
        const confirmResponse = await subscriptionService.confirmSubscription(
          confirmData
        );

        if (confirmResponse.success) {
          const confirmedSubscriptionData = {
            ...confirmResponse.subscription,
            deliveryAddress: selectedAddress,
            confirmedAt: new Date().toISOString(),
            packDetails: parsedData.packDetails,
            type: parsedData.type,
            deliveryCount: parsedData.deliveryCount,
            sellingPrice: parsedData.sellingPrice,
            product: (confirmResponse as any).product,
          };
          localStorage.setItem(
            "lastConfirmedSubscription",
            JSON.stringify(confirmedSubscriptionData)
          );

          toast.success("Subscription confirmed successfully!");

          // Navigate to ConfirmSubscription.tsx to show thank you page
          navigate(`${basePath}/subscription/confirm`, {
            state: {
              isConfirmed: true,
              isStoreProduct: false,
              selectedAddress: selectedAddress,
              subscription: confirmResponse.subscription,
              product: (confirmResponse as any).product,
              subscriptionDetails: parsedData,
            }
          });
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
          toast.error("Insufficient wallet balance");
          navigate(`${basePath}/wallet`, {
            state: {
              returnUrl: `${basePath}/subscription/confirm`,
              requiredAmount: parsedData.amount,
            },
          });
        } else {
          console.error("Detailed error:", {
            message: errorMessage,
            parsedData,
            selectedAddress,
          });
          toast.error(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  // Map related functions
  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const getCurrentLocation = () => {
    // Prevent duplicate calls
    if (isLocationRequestInProgress.current) return;
    isLocationRequestInProgress.current = true;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setSelectedPosition({ lat: latitude, lng: longitude });
          if (mapRef.current) {
            mapRef.current.panTo({ lat: latitude, lng: longitude });
          }

          try {
            const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
            );
            const data = await response.json();

            if (data.results && data.results.length > 0) {
              const formattedAddress: any = {};

              data.results.forEach((result: any) => {
                if (result.address_components) {
                  result.address_components.forEach((component: any) => {
                    component.types.forEach((type: string) => {
                      if (type === 'street_number' && !formattedAddress.houseNo) {
                        formattedAddress.houseNo = component.long_name;
                      }
                      if (type === 'route' && !formattedAddress.streetName) {
                        formattedAddress.streetName = component.long_name;
                      }
                      if (type === 'sublocality_level_1' && !formattedAddress.area) {
                        formattedAddress.area = component.long_name;
                      }
                      if (type === 'locality' && !formattedAddress.city) {
                        formattedAddress.city = component.long_name;
                      }
                      if (type === 'administrative_area_level_1' && !formattedAddress.state) {
                        formattedAddress.state = component.long_name;
                      }
                      if (type === 'postal_code' && !formattedAddress.pincode) {
                        formattedAddress.pincode = component.long_name;
                      }
                      if (type === 'administrative_area_level_2' && !formattedAddress.district) {
                        formattedAddress.district = component.long_name;
                      }
                    });
                  });
                }
              });

              setFormData(prev => ({
                ...prev,
                ...formattedAddress,
                coordinates: `${latitude},${longitude}`
              }));

              setShowMapLocationHint(true);
              window.setTimeout(() => setShowMapLocationHint(false), 4000);
            }
          } catch (error) {
            console.error('Error fetching address:', error);
            const errorMsg = 'Failed to fetch location details';
            if (lastToastMessage.current !== errorMsg) {
              lastToastMessage.current = errorMsg;
              toast.error(errorMsg);
            }
          } finally {
            isLocationRequestInProgress.current = false;
          }
        },
        (error) => {
          console.error('Error accessing location:', error);
          const errorMsg = 'Failed to access location';
          if (lastToastMessage.current !== errorMsg) {
            lastToastMessage.current = errorMsg;
            toast.error(errorMsg);
          }
          isLocationRequestInProgress.current = false;
        }
      );
    } else {
      const errorMsg = 'Geolocation is not supported by your browser';
      if (lastToastMessage.current !== errorMsg) {
        lastToastMessage.current = errorMsg;
        toast.error(errorMsg);
      }
      isLocationRequestInProgress.current = false;
    }
  };

  const handleMapDrag = () => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      if (center) {
        const newPosition = {
          lat: center.lat(),
          lng: center.lng()
        };
        setSelectedPosition(newPosition);
        setFormData(prev => ({
          ...prev,
          coordinates: `${newPosition.lat},${newPosition.lng}`
        }));
        setLocationValidation(null);
      }
    }
  };



  if (loading && addresses.length === 0 && !showAddForm) {
    return <AddressSelectionSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom">
      {/* Header */}
      {/* <div className="bg-[#f8f6f1] sticky top-0 z-10 border-b">
        <div className="max-w-[800px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => showAddForm ? setShowAddForm(false) : navigate(-1)} className="text-gray-600">
                <FaArrowLeft className="text-xl" />
              </button>
              <span className="text-lg font-medium">
                {showAddForm ? "Add New Address" : "Select Delivery Address"}
              </span>
            </div>
            {!showAddForm && (
              <div className="flex gap-2">
                <Link to="/wallet">
                <button className="w-8 h-8 flex items-center justify-center text-[#015D3A]">
                  <img src={WalletIcon} alt="Wallet" className="w-6 h-6" />
                </button>
                </Link>
                <Link to="/account">
                <button className="w-8 h-8 flex items-center justify-center text-[#015D3A]">
                  <img src={ProfileIcon} alt="Profile" className="w-6 h-6" />
                </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div> */}

      {/* Main Content — bottom padding clears fixed bottom nav when scrolling */}
      <div className="mx-auto max-w-[800px] p-4 pb-6">
        {showAddForm ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Map Section */}
            <div className="w-full h-[200px] md:h-[300px] relative rounded-lg overflow-hidden mb-4">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{
                    width: '100%',
                    height: '100%'
                  }}
                  center={selectedPosition}
                  zoom={15}
                  onLoad={onLoad}
                  onUnmount={onUnmount}
                  onDragEnd={handleMapDrag}
                  options={{
                    zoomControl: false,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    disableDefaultUI: true
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <p>Loading map...</p>
                </div>
              )}
              <button
                type="button"
                onClick={getCurrentLocation}
                className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-white text-gray-700 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm hover:bg-gray-50"
              >
                <MdMyLocation className="text-orange-500 h-3 w-3" />
                <span>Use current location</span>
              </button>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
                <MdLocationOn className="text-orange-500 text-4xl drop-shadow-lg animate-bounce" />
              </div>
              {showMapLocationHint && (
                <div
                  className="absolute top-3 left-1/2 z-30 -translate-x-1/2 max-w-[90%] rounded-full px-3 py-1.5 text-center text-xs font-medium text-white shadow-md"
                  style={{ backgroundColor: theme.colors.primary }}
                  role="status"
                >
                  Location detected — adjust pin if needed
                </div>
              )}
            </div>

            {/* Location Validation Status */}
            {locationValidation && (
              <div className={`p-3 rounded-lg text-sm ${locationValidation.isValid
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${locationValidation.isValid ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  <span>{locationValidation.message}</span>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <h3 className="text-gray-700 mb-1 text-sm">Complete Address</h3>
                <input
                  type="text"
                  name="houseNo"
                  placeholder="House/Flat no"
                  value={formData.houseNo}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm"
                  required
                />
              </div>

              <input
                type="text"
                name="streetName"
                placeholder="Street Name, Area"
                value={formData.streetName}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm"
                required
              />

              <div>
                <h3 className="text-gray-700 mb-1 text-sm">Directions/Landmark</h3>
                <input
                  type="text"
                  name="landmark"
                  placeholder="Nearby landmark for easy location"
                  value={formData.landmark}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm"
                />
              </div>

              <div>
                <h3 className="text-gray-700 mb-1 text-sm">Phone Number</h3>
                <div className="flex">
                  <span className="bg-white border border-gray-200 rounded-lg px-3 py-3 text-gray-500 text-sm">+91</span>
                  <input
                    type="tel"
                    name="associatedPhoneNumber"
                    placeholder="Enter your WhatsApp number"
                    value={formData.associatedPhoneNumber}
                    onChange={handleInputChange}
                    className="flex-1 p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm ml-2"

                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="setAsDefault"
                  name="setAsDefault"
                  checked={formData.setAsDefault}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-[#015D3A] rounded border-gray-300 focus:ring-[#015D3A]"
                />
                <label htmlFor="setAsDefault" className="ml-2 text-sm text-gray-700">
                  Set as default address
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#015D3A] text-white py-3 rounded-lg font-medium text-sm disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Address'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col">
            {/* Header — aligned with My Addresses / reference */}
            <div className="-mx-4 mb-4 flex items-center gap-3 border-b border-gray-200 bg-[#f8f6f1] px-4 py-4 sticky top-0 z-10">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="-ml-2 rounded-full p-2 transition-colors hover:bg-black/5"
              >
                <IoArrowBack size={24} className="text-gray-900" />
              </button>
              <h1 className="font-serif text-2xl font-bold text-gray-900">Delivery address</h1>
            </div>

            {showAddressAddedInline && (
              <div
                className="mb-4 flex items-start gap-3 rounded-2xl border border-[#19411F]/20 bg-[#E6F4EA] px-4 py-3"
                role="status"
              >
                <FaCheck className="mt-0.5 flex-shrink-0 text-[#19411F]" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">Address saved</p>
                  <p className="text-xs text-gray-600">You can select it below for delivery.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddressAddedInline(false)}
                  className="flex-shrink-0 rounded-full p-1 text-gray-500 hover:bg-black/5"
                  aria-label="Dismiss"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>
            )}

            {/* Address List — layout matches My Addresses: left details + right map */}
            <div className="mb-6 space-y-4">
              {addresses.map((address) => {
                const icon = getTypeIcon(address.type || "home");
                const addressTypeLower = address.type?.toLowerCase() || "";
                const isGreenBg = addressTypeLower !== "work" && addressTypeLower !== "office";
                const iconBgClass = isGreenBg ? "bg-[#ECFDF5]" : "bg-[#EEF2FF]";
                const isSelected = selectedAddress?.id === address.id;

                return (
                  <div
                    key={address.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleAddressSelect(address)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleAddressSelect(address);
                      }
                    }}
                    className={`cursor-pointer rounded-3xl p-5 shadow-sm transition-all ${
                      isSelected
                        ? "border-2 border-[#19411F] bg-[#F2FEF4]"
                        : "border border-transparent bg-white"
                    }`}
                  >
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${iconBgClass}`}
                          >
                            <img src={icon} alt={address.type || "Address"} className="h-5 w-5" />
                          </div>
                          <h3 className="text-lg font-semibold capitalize text-gray-800">
                            {address.type || "Home"}
                          </h3>
                          {address.isDefault && (
                            <span className="flex-shrink-0 rounded-2xl bg-[#E6F4EA] px-2 py-1 text-xs font-semibold text-[#1E8E3E]">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="mb-1 min-w-0 max-w-full break-words pr-2 text-sm leading-relaxed text-gray-500 line-clamp-2 [overflow-wrap:anywhere]">
                          {[
                            address.houseNo,
                            address.streetName,
                            address.area,
                            address.landmark,
                            address.city,
                            address.state,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                          {address.pincode ? ` - ${address.pincode}` : ""}
                        </p>
                        <p className="text-sm font-medium text-gray-800">
                          {address.associatedPhoneNumber
                            ? `+91 ${formatPhoneForDisplay(address.associatedPhoneNumber)}`
                            : "+91 —"}
                        </p>
                      </div>
                      <div className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {address.coordinates ? (
                          <AddressThumbnailMap coordinates={address.coordinates} />
                        ) : (
                          <div className="h-full w-full bg-gray-200" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Validation Message */}
            {addressValidation && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${addressValidation.isValid
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${addressValidation.isValid ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                  <span>{addressValidation.message}</span>
                </div>
              </div>
            )}

            {/* Bottom Buttons — in document flow so they scroll above bottom nav */}
            <div className="pt-2">
              <div className="mx-auto max-w-[800px] space-y-3">
                <button
                  onClick={() => navigate(`${basePath}/addresses/add`)}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-base font-semibold hover:opacity-90 shadow-sm ${
                    feature === 'gpStore' ? 'text-white' : 'text-gray-900'
                  }`}
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <span className="text-2xl font-semibold">+</span>
                  Add New Address
                </button>

                <button
                  onClick={handleContinue}
                  disabled={!selectedAddress || loading}
                  className={`w-full py-3 rounded-xl text-base font-semibold shadow-sm flex items-center justify-center ${
                    selectedAddress && !loading
                      ? `hover:opacity-90 ${feature === 'gpStore' ? 'text-white' : 'text-gray-900'}`
                      : 'bg-gray-300 cursor-not-allowed text-gray-500'
                  }`}
                  style={selectedAddress && !loading ? { backgroundColor: theme.colors.primary } : {}}
                >
                  {loading ? 'Processing...' : (location.state?.fromCart ? 'Continue' : 'Continue & Pay')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddressSelection;
