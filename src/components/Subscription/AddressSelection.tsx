import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaArrowLeft, FaMapMarkerAlt, FaCheck } from "react-icons/fa";
import { toast } from "react-hot-toast";
import { addressService, Address } from "../../services/address.service";
import WalletIcon from "../../assets/icon/Wallet.png";
import ProfileIcon from "../../assets/icon/Profile.png";

const AddressSelection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [addressValidation, setAddressValidation] = useState<{
    isValid: boolean;
    message?: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    houseNo: "",
    streetName: "",
    area: "",
    associatedPhoneNumber: "",
    pincode: "",
    city: "",
    district: "",
    state: "",
    coordinates: "",
    setAsDefault: false,
  });
  const isStoreProduct = location.state?.product?.isStore;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      handleAuthError(
        new Error("Authentication required. Please login to continue.")
      );
      return;
    }
    loadAddresses();
  }, []);

  const handleAuthError = (error: Error) => {
    const isAuthError =
      error.message.includes("login") ||
      error.message.includes("session expired");
    if (isAuthError) {
      localStorage.setItem("redirectAfterLogin", location.pathname);
      localStorage.removeItem("selectedDeliveryAddress");
      navigate("/login", {
        state: {
          returnUrl: location.pathname,
          message: error.message,
        },
      });
    } else {
      toast.error(error.message);
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
    try {
      setLoading(true);
      // Call the API to create address
      const newAddress = await addressService.createAddress(formData);
      toast.success("Address added successfully");
      setShowAddForm(false);
      setFormData({
        houseNo: "",
        streetName: "",
        area: "",
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
      const validation = await addressService.validateAddressInDeliveryArea(address.coordinates);
      
      setAddressValidation(validation);
      
      if (!validation.isValid) {
        toast.error(validation.message || 'Address is outside delivery area');
        return false;
      }
      
      toast.success('Address is within delivery area!');
      return true;
    } catch (error) {
      console.error('Error validating address:', error);
      toast.error('Failed to validate address location');
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

    try {
      // Get the current subscription data
      const subscriptionData = localStorage.getItem("currentSubscription");
      if (!subscriptionData && !isStoreProduct) {
        toast.error("Subscription details not found. Please try again.");
        navigate("/");
        return;
      }

      const parsedData = JSON.parse(subscriptionData || "{}");

      // Ensure basePackId is preserved
      if (!parsedData.basePackId && location.state?.basePackId) {
        parsedData.basePackId = location.state?.basePackId;
        localStorage.setItem("currentSubscription", JSON.stringify(parsedData));
      }

      // Navigate to the return URL or default to confirm page
      const returnUrl = location.state?.returnUrl || "/subscription/confirm";
      navigate(returnUrl, {
        state: {
          basePackId: parsedData.basePackId,
          subscriptionData: parsedData,
          selectedAddress: selectedAddress,
          product: location.state?.product,
          metaData: location.state?.metaData,
        },
      });
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBEB]">
      {/* Header */}
      <div className="bg-[#FFFBEB] sticky top-0 z-10 border-b">
        <div className="max-w-[800px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="text-gray-600">
                <FaArrowLeft className="text-xl" />
              </button>
              <span className="text-lg font-medium">
                Select Delivery Address
              </span>
            </div>
            <div className="flex gap-2">
              <button className="w-8 h-8 flex items-center justify-center text-[#015D3A]">
                <img src={WalletIcon} alt="Wallet" className="w-6 h-6" />
              </button>
              <button className="w-8 h-8 flex items-center justify-center text-[#015D3A]">
                <img src={ProfileIcon} alt="Profile" className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[800px] mx-auto p-4">
        {!showAddForm ? (
          <div className="space-y-4">
            {/* Address List */}
            <div className="space-y-4 mb-6">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className={`bg-white rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${selectedAddress?.id === address.id
                    ? "border-2 border-[#015D3A] bg-[#ECFDF5]"
                    : "border border-gray-200"
                    }`}
                  onClick={() => handleAddressSelect(address)}
                >
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-[#ECFDF5] rounded-lg flex items-center justify-center mt-1">
                      <FaMapMarkerAlt className="text-xl text-[#015D3A]" />
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[15px] font-medium text-gray-900">
                          {address.houseNo}, {address.streetName}
                        </h4>
                        {address.isDefault && (
                          <span className="text-xs bg-[#ECFDF5] text-[#015D3A] px-2 py-1 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {address.area}, {address.city}, {address.state} -{" "}
                        {address.pincode}
                      </p>
                      {address.societyName && (
                        <p className="text-sm text-gray-600">
                          {address.societyName}
                        </p>
                      )}
                    </div>
                    {selectedAddress?.id === address.id && (
                      <FaCheck className="text-[#015D3A] text-xl" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Address Validation Status */}
            {addressValidation && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                addressValidation.isValid 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    addressValidation.isValid ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span>{addressValidation.message}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 md:relative md:border-t-0 md:bg-transparent md:p-0">
              <div className="max-w-[800px] mx-auto space-y-3">
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full bg-white border-2 border-[#015D3A] text-[#015D3A] py-3.5 rounded-lg text-[15px] font-medium hover:bg-[#ECFDF5]"
                >
                  Add New Address
                </button>

                <button
                  onClick={handleContinue}
                  disabled={!selectedAddress || isValidatingAddress}
                  className="w-full bg-[#F15A22] text-white py-3.5 rounded-lg text-[15px] font-medium hover:bg-[#F15A22]/90 disabled:opacity-50"
                >
                  {isValidatingAddress ? "Validating Address..." : "Continue"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Form Fields */}
              {[
                { label: "House Number", name: "houseNo", required: true },
                { label: "Street Name", name: "streetName", required: true },
                { label: "Area", name: "area", required: true },
                {
                  label: "Phone Number",
                  name: "associatedPhoneNumber",
                  required: true,
                  type: "tel",
                },
                { label: "City", name: "city", required: true },
                { label: "District", name: "district", required: false },
                { label: "State", name: "state", required: true },
                { label: "Pincode", name: "pincode", required: true },
                { label: "Coordinates", name: "coordinates", required: true },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-[15px] font-medium text-gray-700 mb-1">
                    {field.label} {!field.required && "(Optional)"}
                  </label>
                  <input
                    type={field.type || "text"}
                    name={field.name}
                    value={
                      formData[field.name as keyof typeof formData] as string
                    }
                    onChange={handleInputChange}
                    required={field.required}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#015D3A] focus:ring-1 focus:ring-[#015D3A] text-gray-900"
                  />
                </div>
              ))}

              <div className="flex items-center py-2">
                <input
                  type="checkbox"
                  name="setAsDefault"
                  checked={formData.setAsDefault}
                  onChange={handleInputChange}
                  className="h-5 w-5 text-[#015D3A] focus:ring-[#015D3A] border-gray-300 rounded"
                />
                <label className="ml-3 text-[15px] text-gray-700">
                  Set as default address
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-white border-2 border-gray-300 text-gray-700 py-3.5 rounded-lg text-[15px] font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#F15A22] text-white py-3.5 rounded-lg text-[15px] font-medium hover:bg-[#F15A22]/90 disabled:opacity-50"
                >
                  {loading ? "Adding..." : "Add Address"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddressSelection;
