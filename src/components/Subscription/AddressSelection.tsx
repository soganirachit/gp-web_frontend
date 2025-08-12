import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { FaArrowLeft, FaMapMarkerAlt, FaCheck } from "react-icons/fa";
import { MdLocationOn, MdMyLocation } from "react-icons/md";
import { toast } from "react-hot-toast";
import { addressService, Address } from "../../services/address.service";
import { GoogleMap } from "@react-google-maps/api";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";
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
  
  // Map related states
  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded, loadError } = useGoogleMaps();
  const [selectedPosition, setSelectedPosition] = useState<{lat: number, lng: number}>({
    lat: 20.5937,
    lng: 78.9629
  });
  const [locationValidation, setLocationValidation] = useState<{
    isValid: boolean;
    message?: string;
  } | null>(null);
  
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
      
      toast.success("Address added successfully");
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

  // Map related functions
  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const getCurrentLocation = () => {
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
              
              toast.success('Location detected successfully');
            }
          } catch (error) {
            console.error('Error fetching address:', error);
            toast.error('Failed to fetch location details');
          }
        },
        (error) => {
          console.error('Error accessing location:', error);
          toast.error('Failed to access location');
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
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

  return (
    <div className="min-h-screen bg-[#FFFBEB]">
      {/* Header */}
      <div className="bg-[#FFFBEB] sticky top-0 z-10 border-b">
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
      </div>

      {/* Main Content */}
      <div className="max-w-[800px] mx-auto p-4">
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
            </div>

            {/* Location Validation Status */}
            {locationValidation && (
              <div className={`p-3 rounded-lg text-sm ${
                locationValidation.isValid 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    locationValidation.isValid ? 'bg-green-500' : 'bg-red-500'
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
          <div className="space-y-4">
            {/* Existing address list and continue button */}
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
              disabled={!selectedAddress || loading}
              className={`w-full bg-[#F15A22] text-white py-3.5 rounded-lg text-[15px] font-medium hover:bg-[#F15A22]/90 disabled:opacity-50 ${
                selectedAddress && !loading
                  ? 'bg-[#015D3A] hover:bg-[#014931]'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {loading ? 'Processing...' : 'Continue'}
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
