import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { FaArrowLeft, FaCheck, FaPen, FaTimes, FaTrash } from "react-icons/fa";
import { MdLocationOn, MdMyLocation } from "react-icons/md";
import { IoArrowBack } from "react-icons/io5";
import { toast } from "react-hot-toast";
import { addressService, Address } from "../../services/address.service";
import { GoogleMap } from "@react-google-maps/api";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";
import ReactDOM from "react-dom/client";
import { orderService } from "../../services/order.service";
import { subscriptionService } from "../../services/subscription.service";
import { subscriptionCartService, isSubscriptionCartStoreChangeConfirmation } from "../../services/subscriptionCart.service";
import {
  validateGpDailyDeliveryAreaForAddressId,
  validateGpDailyDeliveryAreaFromCoordinates,
} from "../../services/subscriptionZone.service";
import { messageFromGeolocationPositionError } from "../../utils/geolocationMessages";
import { customerService } from "../../services/getcustomer.service";
import { useFeatureTheme } from "../../context/FeatureThemeContext";
import { useAuth } from "../../context/AuthContext";
import { storeService } from "../../services/store.service";
import {
  GUEST_NEAREST_STORE_PREFIX,
  GUEST_NOT_SERVICEABLE_BODY,
  GUEST_NOT_SERVICEABLE_TITLE,
  GUEST_ORDERING_FOR_SOMEONE_SUBTITLE,
  GUEST_ORDERING_FOR_SOMEONE_TITLE,
} from "../../config/guestBrowseAddressCopy";
import { AddressSelectionSkeleton } from "../common/PageSkeletons";
import { formatPhoneForDisplay } from "../../utils/phoneDisplay";
import { formatCartDeliveryAddress } from "../../utils/formatCartDeliveryAddress";
import homeIcon from "../../assets/svg/adressbook/home.svg";
import workIcon from "../../assets/svg/adressbook/office.svg";
import othersIcon from "../../assets/svg/adressbook/others.svg";
import defaultIcon from "../../assets/svg/adressbook/default.svg";

/** Synthetic id — device GPS selection (not a saved server address). */
import {
  LIVE_DEVICE_ADDRESS_ID,
  resolveLiveDeviceToSavedAddress,
} from "../../utils/addressCoordinates";
import { walletService } from "../../services/wallet.service";
import { setGpDailyPendingSubscriptionCheckout } from "../../utils/gpDailyPendingSubscriptionCheckout";
import { navigateToGpDailyWalletForRecharge } from "../../utils/gpDailyWalletRechargeRedirect";
import {
  InsufficientWalletModal,
  type InsufficientWalletDetails,
} from "../daily/InsufficientWalletModal";
import { guestHasSavedBrowseAddress } from "../../utils/guestAddressEntry";
import { UniformPageHeader } from "../layout/UniformPageHeader";

const AddressSelection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { feature, theme } = useFeatureTheme();
  const { isLoggedIn } = useAuth();
  const isGuestBrowse =
    (location.state as { guestBrowse?: boolean } | null)?.guestBrowse === true;
  const guestAlreadySavedAddress =
    !isLoggedIn && guestHasSavedBrowseAddress();
  const isGuestEntry = !isLoggedIn && !guestAlreadySavedAddress;
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [insufficientWalletModal, setInsufficientWalletModal] =
    useState<InsufficientWalletDetails | null>(null);
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

  /** GP Daily from-cart: server may require explicit confirm before clearing incompatible subscription cart lines. */
  const [dailyCartFromAddressModal, setDailyCartFromAddressModal] = useState<{
    address: Address;
    message: string;
  } | null>(null);
  const [confirmingDailyCartStoreChange, setConfirmingDailyCartStoreChange] = useState(false);
  /** Browser geolocation + reverse geocode — shown as first card when available. */
  const [liveDeviceLocation, setLiveDeviceLocation] = useState<{
    lat: number;
    lng: number;
    formattedAddress: string;
  } | null>(null);
  const liveGeoRequestedRef = useRef(false);

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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  /** Default / current delivery address first — matches home header logic. */
  const displayAddresses = useMemo(() => {
    return [...addresses].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return 0;
    });
  }, [addresses]);

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

    if (isGuestEntry) {
      setLoading(false);
      setShowAddForm(true);
      return;
    }

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
  }, [isGuestEntry]);

  useEffect(() => {
    if (!isLoaded || showAddForm || loadError) return;
    if (liveGeoRequestedRef.current) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    liveGeoRequestedRef.current = true;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let formatted = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          if (window.google?.maps?.Geocoder) {
            const geocoder = new google.maps.Geocoder();
            const res = await geocoder.geocode({ location: { lat, lng } });
            const first = res.results?.[0]?.formatted_address;
            if (first?.trim()) formatted = first.trim();
          }
        } catch {
          /* keep coordinate fallback */
        }
        setLiveDeviceLocation({ lat, lng, formattedAddress: formatted });
      },
      (err) => {
        toast.error(messageFromGeolocationPositionError(err), { id: "live-device-geo" });
      },
      { enableHighAccuracy: false, timeout: 20_000, maximumAge: 120_000 },
    );
  }, [isLoaded, showAddForm, loadError]);

  const buildLiveDeviceAddress = useCallback(
    (lat: number, lng: number, formattedAddress: string): Address => ({
      id: LIVE_DEVICE_ADDRESS_ID,
      userId: "",
      houseNo: "",
      streetName: "",
      landmark: "",
      area: formattedAddress,
      city: "",
      state: "",
      pincode: "",
      associatedPhoneNumber: "",
      isDefault: false,
      type: "Others",
      coordinates: `${lat},${lng}`,
      createdAt: "",
      updatedAt: "",
    }),
    [],
  );

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

      const sorted = [...savedAddresses].sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return 0;
      });
      const storedAddress = localStorage.getItem("selectedDeliveryAddress");
      if (storedAddress) {
        try {
          const parsedAddress = JSON.parse(storedAddress);
          const resolvedStored = resolveLiveDeviceToSavedAddress(
            parsedAddress,
            savedAddresses,
          );
          const addressExists =
            String(resolvedStored.id) === LIVE_DEVICE_ADDRESS_ID ||
            savedAddresses.some((addr) => addr.id === resolvedStored.id);
          if (addressExists) {
            if (resolvedStored.id !== parsedAddress.id) {
              localStorage.setItem(
                "selectedDeliveryAddress",
                JSON.stringify(resolvedStored),
              );
            }
            setSelectedAddress(resolvedStored);
          } else {
            localStorage.removeItem("selectedDeliveryAddress");
            setSelectedAddress(sorted[0] ?? null);
          }
        } catch {
          localStorage.removeItem("selectedDeliveryAddress");
          setSelectedAddress(sorted[0] ?? null);
        }
      } else if (sorted.length > 0) {
        setSelectedAddress(sorted[0]);
      }
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSavedAddress = (e: React.MouseEvent, address: Address) => {
    e.stopPropagation();
    navigate(`${basePath}/addresses/edit`, { state: { address } });
  };

  const handleDeleteSavedClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const handleDeleteSavedConfirm = async () => {
    if (!deleteId) return;
    try {
      setActionInProgress(true);
      await addressService.deleteAddress(deleteId);
      setDeleteId(null);
      await loadAddresses();
      window.dispatchEvent(new Event("addressUpdated"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not delete address");
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSetDefaultSaved = async (e: React.MouseEvent, addressId: string) => {
    e.stopPropagation();
    try {
      setActionInProgress(true);
      await addressService.setDefaultAddress(addressId);
      await loadAddresses();
      window.dispatchEvent(new Event("addressUpdated"));
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Could not set default address",
      );
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const coordinates =
      formData.coordinates ||
      `${selectedPosition.lat},${selectedPosition.lng}`;

    // Validate location before saving
    if (!coordinates) {
      toast.error('Please select a location on the map');
      return;
    }

    // First validate coordinates format
    if (!addressService.validateCoordinatesFormat(coordinates)) {
      toast.error('Invalid coordinates format');
      setLocationValidation({ isValid: false, message: 'Invalid coordinates format' });
      return;
    }

    if (isGuestEntry) {
      try {
        setIsValidatingAddress(true);
        const line = [formData.houseNo, formData.streetName, formData.area, formData.landmark]
          .map((s) => String(s || "").trim())
          .filter(Boolean)
          .join(", ");
        const catalog = feature === "gpStore" ? "store" : "daily";
        const result = await storeService.applyGuestBrowseAddress(
          {
            formattedLine: line || "Delivery address",
            coordinates,
            label: "Delivery address",
          },
          catalog,
        );
        if (result.serviceable) {
          const msg = result.storeName
            ? `${GUEST_NEAREST_STORE_PREFIX} ${result.storeName}`
            : "Delivery area confirmed";
          toast.success(msg);
          window.dispatchEvent(new Event("addressUpdated"));
          navigate(basePath, { replace: true });
          return;
        }
        setLocationValidation({
          isValid: false,
          message: result.message || GUEST_NOT_SERVICEABLE_BODY,
        });
        toast.error(GUEST_NOT_SERVICEABLE_TITLE);
      } catch {
        toast.error(GUEST_NOT_SERVICEABLE_TITLE);
      } finally {
        setIsValidatingAddress(false);
      }
      return;
    }

    // Then validate delivery area
    try {
      setIsValidatingAddress(true);
      const validation =
        feature === "gpStore"
          ? await addressService.validateAddressInDeliveryArea(coordinates)
          : await validateGpDailyDeliveryAreaFromCoordinates(coordinates);
      if (feature !== "gpStore") {
        // No out-of-zone copy on address screens; basket shows eligibility if needed.
        setLocationValidation(
          validation.isValid
            ? validation
            : null,
        );
      } else {
        setLocationValidation(validation);
      }

      if (!validation.isValid && feature === "gpStore") {
        setLocationValidation({
          isValid: false,
          message: validation.message || "Address is outside delivery area",
        });
        return;
      }

      // GP Daily: allow saving any pin (cart shows same out-of-zone banner as the app).
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

      const validation =
        feature === "gpStore"
          ? await addressService.validateAddressInDeliveryArea(address.coordinates)
          : await (async () => {
              const aid = address.id ? parseInt(String(address.id), 10) : NaN;
              if (Number.isFinite(aid) && aid > 0) {
                return validateGpDailyDeliveryAreaForAddressId(aid);
              }
              return validateGpDailyDeliveryAreaFromCoordinates(
                address.coordinates!,
              );
            })();
      if (!validation.isValid) {
        if (feature !== "gpStore") {
          setAddressValidation(null);
          return true;
        }
        setAddressValidation({
          isValid: false,
          message:
            validation.message || "Address is outside delivery area",
        });
        return false;
      }
      setAddressValidation({
        isValid: true,
        message:
          validation.message || "We deliver to this location.",
      });
      return true;
    } catch (error) {
      console.error('Error validating address:', error);
      setAddressValidation({ isValid: false, message: 'Failed to validate address location' });
      return false;
    } finally {
      setIsValidatingAddress(false);
    }
  };

  const handleAddressSelect = async (address: Address) => {
    const addressToUse = resolveLiveDeviceToSavedAddress(address, addresses);

    if (
      String(addressToUse.id) === LIVE_DEVICE_ADDRESS_ID &&
      !location.state?.fromHome
    ) {
      toast.error(
        location.state?.fromCart
          ? "Save your current location as an address to use it for checkout."
          : "Save your current location as an address to use it for delivery.",
      );
      return;
    }

    // Validate address before selecting
    const isAddressValid = await validateAddressInDeliveryArea(addressToUse);
    if (!isAddressValid) {
      return;
    }

    setSelectedAddress(addressToUse);
    localStorage.setItem("selectedDeliveryAddress", JSON.stringify(addressToUse));

    if (location.state?.fromHome) {
      try {
        if (String(addressToUse.id) === LIVE_DEVICE_ADDRESS_ID) {
          await storeService.applyUseCurrentGpsForCatalog();
          toast.success("Using your current location for the store");
        } else {
          await storeService.applyBrowseAddressForCatalog(addressToUse);
          toast.success("Delivery location updated");
        }
        navigate(basePath, { replace: true });
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Could not update location. Try again.";
        toast.error(msg);
      }
      return;
    }

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
      return;
    }

    await proceedWithValidatedAddress(addressToUse);
  };

  const createStoreOrder = () => { };

  const proceedWithValidatedAddress = async (address: Address) => {
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
        if (
          feature !== "gpStore" &&
          address?.id &&
          String(address.id) !== LIVE_DEVICE_ADDRESS_ID
        ) {
          try {
            const z = await subscriptionCartService.checkSubscriptionZone(
              Number(address.id),
            );
            if (Boolean((z as { eligible?: boolean })?.eligible)) {
              const raw = await subscriptionCartService.setDeliveryAddress(
                Number(address.id),
                false,
              );
              if (isSubscriptionCartStoreChangeConfirmation(raw)) {
                const msg =
                  typeof raw.message === "string" && raw.message.trim()
                    ? raw.message.trim()
                    : `Your delivery address maps to ${raw.new_store?.name ?? "a different store"}. Continuing will clear items in your daily basket that may not be available there.`;
                setDailyCartFromAddressModal({ address, message: msg });
                return;
              }
            }
          } catch {
            /* non-fatal — cart page will re-check zone */
          }
        }

        localStorage.setItem("selectedDeliveryAddress", JSON.stringify(address));
        const cartPath = feature === "gpStore" ? "/gp-store/basket" : "/gp-daily/basket";
        navigate(cartPath, {
          state: {
            selectedAddress: address,
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
        localStorage.setItem("selectedDeliveryAddress", JSON.stringify(address));

        // Set loading to true to show "Processing..." on button
        setLoading(true);

        // Import the RazorpayPayment component dynamically
        const { default: RazorpayPayment } = await import("../Payment/Rezorpay/RezorpayPayment");

        // Handle store product payment directly
        // Use currentUserData (local variable) to avoid closure issues
        const handleStoreProductPayment = async (paymentData: any) => {
          if (!isStoreProduct || !address) {
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
          let addressToUse = address;

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
          deliveryAddressId: address.id,
          type: parsedData.type.toUpperCase() as "DAILY" | "CUSTOM",
          startDate: startDate,
          selectedDays: selectedDays,
          quantity: qty,
        };

        const pricePerPack =
          Number(parsedData.pricePerPack) || Number(parsedData.amount) || 0;
        const deliveryCount = Number(parsedData.deliveryCount) || 7;
        const totalRequired = pricePerPack * deliveryCount * qty;
        const { balance: walletBalance } = await walletService.getWalletBalance();

        if (Number.isFinite(totalRequired) && walletBalance < totalRequired) {
          const shortage = totalRequired - walletBalance;
          setGpDailyPendingSubscriptionCheckout({
            kind: "address_confirm",
            requiredAmount: totalRequired,
            returnPath: `${basePath}/address-selection`,
            confirmPayload: {
              basePackId: String(parsedData.basePackId),
              deliveryAddressId: String(address.id),
              type: parsedData.type.toUpperCase() as "DAILY" | "CUSTOM",
              startDate: startDate.toISOString(),
              selectedDays,
              quantity: qty,
            },
            packDetails: parsedData.packDetails,
            subscriptionType: parsedData.type,
            deliveryCount: parsedData.deliveryCount,
            sellingPrice: parsedData.sellingPrice,
          });
          setLoading(false);
          setInsufficientWalletModal({
            currentBalance: walletBalance,
            requiredAmount: totalRequired,
            shortageAmount: shortage,
          });
          return;
        }

        // Then confirm the subscription
        const confirmResponse = await subscriptionService.confirmSubscription(
          confirmData
        );

        if (confirmResponse.success) {
          const confirmedSubscriptionData = {
            ...confirmResponse.subscription,
            deliveryAddress: address,
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
              selectedAddress: address,
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
          const pricePerPack =
            Number(parsedData.pricePerPack) || Number(parsedData.amount) || 0;
          const deliveryCount = Number(parsedData.deliveryCount) || 7;
          const qty =
            typeof parsedData.quantity === "number" && parsedData.quantity > 0
              ? Math.floor(parsedData.quantity)
              : 1;
          const totalRequired = pricePerPack * deliveryCount * qty;
          const selectedDaysErr =
            parsedData.selectedDays ||
            (parsedData.type?.toUpperCase() === "DAILY"
              ? [
                  "MONDAY",
                  "TUESDAY",
                  "WEDNESDAY",
                  "THURSDAY",
                  "FRIDAY",
                  "SATURDAY",
                  "SUNDAY",
                ]
              : []);
          setGpDailyPendingSubscriptionCheckout({
            kind: "address_confirm",
            requiredAmount: totalRequired,
            returnPath: `${basePath}/address-selection`,
            confirmPayload: {
              basePackId: String(parsedData.basePackId),
              deliveryAddressId: String(address.id),
              type: parsedData.type.toUpperCase() as "DAILY" | "CUSTOM",
              startDate: new Date(parsedData.startDate).toISOString(),
              selectedDays: selectedDaysErr,
              quantity: qty,
            },
            packDetails: parsedData.packDetails,
            subscriptionType: parsedData.type,
            deliveryCount: parsedData.deliveryCount,
            sellingPrice: parsedData.sellingPrice,
          });
          void walletService.getWalletBalance().then(({ balance }) => {
            setInsufficientWalletModal({
              currentBalance: balance,
              requiredAmount: totalRequired,
              shortageAmount: Math.max(0, totalRequired - balance),
            });
          });
        } else {
          console.error("Detailed error:", {
            message: errorMessage,
            parsedData,
            address,
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

  /** Merge Geocoding API JSON `results` into address form fields (used by GPS and map drag). */
  const applyGeocodeJsonToForm = (data: { results?: unknown[] }, lat: number, lng: number) => {
    if (!data.results?.length) return;
    const formattedAddress: Record<string, string> = {};

    (data.results as { address_components?: google.maps.GeocoderAddressComponent[] }[]).forEach(
      (result) => {
        if (!result.address_components) return;
        result.address_components.forEach((component) => {
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
    );

    setFormData((prev) => ({
      ...prev,
      ...formattedAddress,
      coordinates: `${lat},${lng}`,
    }));
  };

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
              applyGeocodeJsonToForm(data, latitude, longitude);

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
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    if (!center) return;
    const lat = center.lat();
    const lng = center.lng();
    setSelectedPosition({ lat, lng });
    setLocationValidation(null);

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setFormData((prev) => ({ ...prev, coordinates: `${lat},${lng}` }));
      return;
    }

    void (async () => {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
        );
        const data = await response.json();
        applyGeocodeJsonToForm(data, lat, lng);
      } catch (error) {
        console.error('Error reverse-geocoding map position:', error);
        setFormData((prev) => ({ ...prev, coordinates: `${lat},${lng}` }));
      }
    })();
  };



  if (loading && addresses.length === 0 && !showAddForm) {
    return <AddressSelectionSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom">
      {/* Main Content — bottom padding clears fixed bottom nav when scrolling */}
      <div className="mx-auto max-w-[800px] p-4 pb-nav-bottom">
        {showAddForm ? (
          <>
            <UniformPageHeader
              title={
                isGuestEntry ? "Add delivery address" : "Add New Address"
              }
              onBack={() =>
                isGuestEntry ? navigate(-1) : setShowAddForm(false)
              }
              className="-mx-4 mb-2 sticky top-0 z-20"
            />
          <form onSubmit={handleSubmit} className="space-y-4">
            {isGuestEntry ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">
                  {GUEST_ORDERING_FOR_SOMEONE_TITLE}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {GUEST_ORDERING_FOR_SOMEONE_SUBTITLE}
                </p>
              </div>
            ) : null}
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
                <span>Locate me</span>
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
              <div
                className={`p-3 rounded-lg text-sm ${
                  locationValidation.isValid
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      locationValidation.isValid ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
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

              {!isGuestEntry ? (
                <>
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
                </>
              ) : null}

              <button
                type="submit"
                disabled={loading || isValidatingAddress}
                className="w-full py-3 rounded-lg font-medium text-sm disabled:opacity-50"
                style={{
                  backgroundColor: theme.colors.primary,
                  color: feature === "gpDaily" ? "#111827" : "#ffffff",
                }}
              >
                {isValidatingAddress
                  ? 'Checking delivery area...'
                  : loading
                    ? 'Saving...'
                    : isGuestEntry
                      ? 'Confirm address'
                      : 'Save Address'}
              </button>
            </div>
          </form>
          </>
        ) : (
          <div className="flex flex-col">
            {/* Header — aligned with My Addresses / reference */}
            <div className="-mx-4 mb-4 flex items-center gap-3 bg-[#f8f6f1] px-4 py-4 sticky top-0 z-10">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="-ml-2 rounded-full p-2 transition-colors hover:bg-black/5"
              >
                <IoArrowBack size={24} className="text-gray-900" />
              </button>
              <h1 className="font-serif text-2xl font-bold text-gray-900">Choose location</h1>
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
              {liveDeviceLocation ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    void handleAddressSelect(
                      buildLiveDeviceAddress(
                        liveDeviceLocation.lat,
                        liveDeviceLocation.lng,
                        liveDeviceLocation.formattedAddress,
                      ),
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      void handleAddressSelect(
                        buildLiveDeviceAddress(
                          liveDeviceLocation.lat,
                          liveDeviceLocation.lng,
                          liveDeviceLocation.formattedAddress,
                        ),
                      );
                    }
                  }}
                  className={`cursor-pointer rounded-3xl p-5 shadow-sm transition-all ${
                    selectedAddress?.id === LIVE_DEVICE_ADDRESS_ID
                      ? "border-2 border-[#19411F] bg-[#F2FEF4] ring-1 ring-[#19411F]/20"
                      : "border border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#DCFCE7]">
                          <MdMyLocation className="h-5 w-5 text-[#166534]" aria-hidden />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Current Location</h3>
                        {selectedAddress?.id === LIVE_DEVICE_ADDRESS_ID ? (
                          <span className="flex-shrink-0 rounded-2xl bg-[#DCFCE7] px-2 py-1 text-xs font-semibold text-[#166534]">
                            Selected
                          </span>
                        ) : null}
                      </div>
                      <p className="mb-1 min-w-0 max-w-full text-sm leading-relaxed text-gray-700 [overflow-wrap:anywhere]">
                        {liveDeviceLocation.formattedAddress}
                      </p>
                    
                    </div>
                    <div className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {isLoaded ? (
                        <AddressThumbnailMap
                          coordinates={`${liveDeviceLocation.lat},${liveDeviceLocation.lng}`}
                        />
                      ) : (
                        <div className="h-full w-full animate-pulse bg-gray-200" />
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
              {displayAddresses.map((address) => {
                const icon = getTypeIcon(address.type || "home");
                const addressTypeLower = address.type?.toLowerCase() || "";
                const isGreenBg = addressTypeLower !== "work" && addressTypeLower !== "office";
                const iconBgClass = isGreenBg ? "bg-[#ECFDF5]" : "bg-[#EEF2FF]";
                const isSelected = selectedAddress?.id === address.id;
                const phoneDisplay = formatPhoneForDisplay(address.associatedPhoneNumber);
                const phoneDigits = phoneDisplay.replace(/\D/g, "");
                const showPhoneLine = phoneDigits.length === 10;

                return (
                  <div
                    key={address.id}
                    className={`rounded-3xl p-5 shadow-sm transition-all ${
                      isSelected
                        ? "border-2 border-[#19411F] bg-[#F2FEF4] ring-1 ring-[#19411F]/20"
                        : "border border-gray-200 bg-white"
                    }`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleAddressSelect(address)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          void handleAddressSelect(address);
                        }
                      }}
                      className="cursor-pointer"
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
                            {isSelected ? (
                              <span className="flex-shrink-0 rounded-2xl bg-[#DCFCE7] px-2 py-1 text-xs font-semibold text-[#166534]">
                                Selected
                              </span>
                            ) : null}
                          </div>
                          <p className="mb-1 min-w-0 max-w-full break-words pr-2 text-sm leading-relaxed text-gray-500 line-clamp-2 [overflow-wrap:anywhere]">
                            {formatCartDeliveryAddress({
                              houseNo: address.houseNo,
                              streetName: address.streetName,
                              area: address.area,
                              landmark: address.landmark,
                              city: address.city,
                              state: address.state,
                              pincode: address.pincode,
                            })}
                          </p>
                          {showPhoneLine ? (
                            <p className="mt-0.5 text-sm font-medium text-gray-800">
                              <span className="whitespace-nowrap">+91 {phoneDisplay}</span>
                            </p>
                          ) : null}
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
                    <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-gray-100 pt-3">
                      <button
                        type="button"
                        onClick={(e) => handleEditSavedAddress(e, address)}
                        disabled={actionInProgress}
                        className="flex items-center gap-1.5 text-sm font-semibold text-[#00A082] hover:opacity-80 disabled:opacity-50"
                      >
                        <FaPen className="text-xs" aria-hidden />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSavedClick(e, String(address.id))}
                        disabled={actionInProgress}
                        className="flex items-center gap-1.5 text-sm font-semibold text-[#FF3B30] hover:opacity-80 disabled:opacity-50"
                      >
                        <FaTrash className="text-xs" aria-hidden />
                        Delete
                      </button>
                      {!address.isDefault ? (
                        <button
                          type="button"
                          onClick={(e) => void handleSetDefaultSaved(e, String(address.id))}
                          disabled={actionInProgress}
                          className="flex items-center gap-1.5 text-sm font-semibold text-[#3B82F6] hover:opacity-80 disabled:opacity-50"
                        >
                          <img src={defaultIcon} alt="" className="h-5 w-5" />
                          Set as Default
                        </button>
                      ) : null}
                      {address.isDefault ? (
                        <span className="inline-flex items-center rounded-2xl bg-[#E6F4EA] px-2 py-1 text-xs font-semibold text-[#1E8E3E]">
                          Default
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Validation Message */}
            {addressValidation && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm ${
                  addressValidation.isValid
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      addressValidation.isValid ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span>{addressValidation.message}</span>
                </div>
              </div>
            )}

            {/* Bottom Buttons — in document flow so they scroll above bottom nav */}
            <div className="pt-2">
              <div className="mx-auto max-w-[800px] space-y-3">
                <button
                  onClick={() => navigate(`${basePath}/addresses/add`)}
                  className={`w-full flex h-[48px] items-center justify-center gap-2 rounded-xl text-base font-semibold hover:opacity-90 shadow-sm ${
                    feature === 'gpStore' ? 'text-white' : 'text-gray-900'
                  }`}
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <span className="text-xl font-semibold leading-none">+</span>
                  Add New Address
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {deleteId ? (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-center text-xl font-bold text-gray-900">
              Confirm Delete
            </h3>
            <p className="mb-6 text-center text-gray-500">
              Are you sure you want to delete this address?
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => void handleDeleteSavedConfirm()}
                disabled={actionInProgress}
                className="w-full rounded-xl bg-red-50 py-3.5 font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                Delete Address
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                disabled={actionInProgress}
                className="w-full rounded-xl bg-gray-50 py-3.5 font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {dailyCartFromAddressModal ? (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gp-address-daily-cart-store-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="gp-address-daily-cart-store-title" className="text-lg font-semibold text-gray-900">
              Address changed
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">
              {dailyCartFromAddressModal.message}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                disabled={confirmingDailyCartStoreChange}
                onClick={async () => {
                  const m = dailyCartFromAddressModal;
                  if (!m) return;
                  setConfirmingDailyCartStoreChange(true);
                  try {
                    const raw = await subscriptionCartService.setDeliveryAddress(
                      Number(m.address.id),
                      true,
                    );
                    if (isSubscriptionCartStoreChangeConfirmation(raw)) {
                      toast.error("Could not confirm address change. Try again.");
                      return;
                    }
                    setDailyCartFromAddressModal(null);
                    localStorage.setItem(
                      "selectedDeliveryAddress",
                      JSON.stringify(m.address),
                    );
                    navigate("/gp-daily/basket", {
                      state: {
                        selectedAddress: m.address,
                        addressUpdated: true,
                      },
                    });
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : "Could not confirm address change.",
                    );
                  } finally {
                    setConfirmingDailyCartStoreChange(false);
                  }
                }}
                className="rounded-xl bg-gray-900 py-3 text-center text-base font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {confirmingDailyCartStoreChange ? "Please wait…" : "Continue"}
              </button>
              <button
                type="button"
                disabled={confirmingDailyCartStoreChange}
                onClick={() => setDailyCartFromAddressModal(null)}
                className="rounded-xl border border-gray-200 py-3 text-center text-base font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
            returnUrl: `${basePath}/address-selection`,
          });
        }}
      />

    </div>
  );
};

export default AddressSelection;
