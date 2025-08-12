import React, { useState, useRef, useCallback, useEffect } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { MdLocationOn, MdMyLocation, MdArrowBack } from "react-icons/md";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";
import { addressService } from "../../services/address.service";

// List of cities where delivery is available
const SERVICED_CITIES = [
  "Delhi",
  "New Delhi",
  "Bengaluru",
  "Mumbai",
  "Pune",
  "Jaipur",
  "Chennai",
  "Hyderabad",
  "Chandigarh",
  "Surat",
  "Nashik",
  "Mysore",
  "Kolkata",
  "Coimbatore",
  "Lucknow",
  "Warangal",
  "Vijayawada",
  "Guntur",
];

// interface PlacePrediction {
//   place_id: string;
//   description: string;
//   structured_formatting: {
//     main_text: string;
//     secondary_text: string;
//   };
// }

const HomePageLocation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnUrl = location.state?.returnUrl || "/Allset";
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  // const [, setLocationPredictions] = useState<PlacePrediction[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [, setIsLoadingLocation] = useState(false);
  const [isLocationServiced, setIsLocationServiced] = useState(true);
  const [isValidatingDeliveryZone, setIsValidatingDeliveryZone] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [, setShowErrorModal] = useState(false);
  // const [useRegularMarker, setUseRegularMarker] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  // const markerRef = useRef<any>(null);
  const [deliveryZoneAvailable, setDeliveryZoneAvailable] = useState(true);

  const { isLoaded, loadError, GOOGLE_MAPS_API_KEY } = useGoogleMaps();

  const [selectedAddress, setSelectedAddress] = useState({
    city: "",
    fullAddress: "",
    district: "",
    state: "",
    pincode: "",
  });

  const [addressDetails, setAddressDetails] = useState({
    houseNo: "",
    apartment: "",
    directions: "",
  });

  const [error, setError] = useState<string | null>(null);

  // const [, setBottomSheetHeight] = useState('auto');
  // const [isDragging, setIsDragging] = useState(false);
  // const bottomSheetRef = useRef<HTMLDivElement>(null);
  // const dragStartY = useRef(0);
  // const dragStartHeight = useRef(0);

  const [selectedLocationType, setSelectedLocationType] = useState<string>("");
  const [otherLocationName, setOtherLocationName] = useState<string>("");

  useEffect(() => {
    // Since we're now using the delivery zone validation API directly,
    // we don't need to fetch polygon data anymore
    setDeliveryZoneAvailable(true);
  }, []);





  useEffect(() => {
    if (localStorage.getItem("needLocation") === "true") {
      setShowLocationModal(true);
    }

    const savedLocation = localStorage.getItem("userLocation");
    const savedCoordinates = localStorage.getItem("userCoordinates");

    if (savedLocation && savedCoordinates) {
      try {
        setLocationSearchQuery(savedLocation);
        const coords = JSON.parse(savedCoordinates);
        setSelectedPosition(coords);
        updateAddressDetails(coords.lat, coords.lng);
      } catch (error) {
        setShowErrorModal(true);
      }
    } else {
      getCurrentLocation();
    }
  }, []);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setSelectedPosition({ lat: latitude, lng: longitude });
          updateMarkerPosition({ lat: latitude, lng: longitude });

          try {
            const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
            console.log("Using API Key:", apiKey ? "Loaded" : "Not Loaded");
            if (!apiKey) {
              console.error("Google Maps API key is not configured.");
              setShowErrorModal(true);
              setIsLoadingLocation(false);
              return;
            }

            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
            );
            const data = await response.json();
            if (data.results && data.results[0]) {
              const address = data.results[0].formatted_address;
              setLocationSearchQuery(address);
              updateAddressDetails(latitude, longitude);
            } else {
              console.error("Geocoding API did not return results:", data);
            }
          } catch (error) {
            console.error("Error fetching address details:", error);
            setShowErrorModal(true);
          }
          setIsLoadingLocation(false);
        },
        (error) => {
          console.error("Error getting current location:", error);
          setShowErrorModal(true);
          setIsLoadingLocation(false);
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      setShowErrorModal(true);
      setIsLoadingLocation(false);
    }
  };

  const updateMarkerPosition = (position: { lat: number; lng: number }) => {
    if (!isLoaded || !window.google?.maps || !mapRef.current) return;
    mapRef.current.panTo(position);
  };

  const updateAddressDetails = async (lat: number, lng: number) => {
    if (!isLoaded || !window.google?.maps) {
      return;
    }

    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });

 

      if (!result?.results?.[0]) {
        console.error("No results found in geocoding response.");
        return;
      }

      const addressComponents = result.results[0].address_components;
      let city = "";
      let district = "";
      let state = "";
      let pincode = "";
      let streetNumber = "";
      let route = "";
      let sublocality = "";
      let fullAddress = result.results[0].formatted_address;

      // Extract address components
      for (const component of addressComponents) {
        const types = component.types;
        if (types.includes("street_number")) {
          streetNumber = component.long_name;
        } else if (types.includes("route")) {
          route = component.long_name;
        } else if (
          types.includes("sublocality_level_1") ||
          types.includes("sublocality")
        ) {
          sublocality = component.long_name;
        } else if (types.includes("locality")) {
          city = component.long_name;
        } else if (types.includes("administrative_area_level_2")) {
          district = component.long_name;
        } else if (types.includes("administrative_area_level_1")) {
          state = component.long_name;
        } else if (types.includes("postal_code")) {
          pincode = component.long_name;
        }
      }

      const newAddressDetails = {
        houseNo: streetNumber,
        apartment: [route, sublocality].filter(Boolean).join(", "),
        directions: "", // Directions are not provided by geocoding
      };

      console.log("Parsed Address Details:", newAddressDetails);

      setSelectedAddress({
        city,
        district,
        state,
        pincode,
        fullAddress,
      });

      setAddressDetails(newAddressDetails);

      setLocationSearchQuery(fullAddress);

      // Check if the point is within delivery zone using the new API
      setIsValidatingDeliveryZone(true);
      try {
        const coordinates = `${lat},${lng}`;
        const validation = await addressService.validateAddressInDeliveryArea(coordinates);
        setIsLocationServiced(validation.isValid);
      } catch (error) {
        console.error("Error validating delivery zone:", error);
        // Fallback to city-based check if API fails
        const isServiced = SERVICED_CITIES.some(
          (servicedCity) =>
            city.toLowerCase().includes(servicedCity.toLowerCase()) ||
            state.toLowerCase().includes(servicedCity.toLowerCase()) ||
            district.toLowerCase().includes(servicedCity.toLowerCase())
        );
        setIsLocationServiced(isServiced);
      } finally {
        setIsValidatingDeliveryZone(false);
      }
    } catch (error) {
      console.error("Error in updateAddressDetails:", error);
      // Only show user-friendly error message
    }
  };

  const handleSaveLocation = async () => {
    try {
      // Clear previous errors
      setError(null);

      // Basic validation
      if (!addressDetails.houseNo.trim()) {
        setError("Please enter house/flat number");
        return;
      }
      
      if (!addressDetails.apartment.trim()) {
        setError("Please enter street name and area");
        return;
      }

      if (!selectedAddress.city) {
        setError("Please select a valid location from the map");
        return;
      }

      if (!selectedPosition) {
        setError("Please select a valid location on the map");
        return;
      }

      // Validate pincode if required
      if (!selectedAddress.pincode || !/^\d{6}$/.test(selectedAddress.pincode)) {
        setError("Please enter a valid 6-digit pincode");
        return;
      }

      // If we reach here, all validations passed
      const addressData = {
        houseNo: addressDetails.houseNo,
        streetName: addressDetails.apartment,
        area: `${selectedAddress.city} ${selectedAddress.pincode || ''}`.trim().substring(0, 20),
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
        district: selectedAddress.district,
        associatedPhoneNumber: localStorage.getItem("phoneNumber") || "",
        coordinates: `${selectedPosition.lat},${selectedPosition.lng}`,
        setAsDefault: true
      };

      // Save address in the background
      await addressService.createAddress(addressData);
      
      // Notify parent components about the address update
      window.dispatchEvent(new Event('addressUpdated'));
      
      // Navigate if location is serviced
      if (isLocationServiced) {
        navigate(returnUrl);
      } else {
        setShowLocationModal(true);
      }
      
    } catch (error) {
      console.error("Error saving address:", error);
      setError("Failed to save address. Please try again.");
    }
  };

  const handleChangeLocation = () => {
    setShowLocationModal(false);
  };

  const handleViewProducts = () => {
    // Even though we're not in the service area, allow them to browse
    navigate("/products");
  };

  const handleMapDrag = () => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      if (center) {
        const newPosition = {
          lat: center.lat(),
          lng: center.lng(),
        };
        setSelectedPosition(newPosition);
        updateMarkerPosition(newPosition);
        updateAddressDetails(newPosition.lat, newPosition.lng);
      }
    }
  };

  // Location not serviced modal
  const LocationNotServicedException = () => {
    return (
      <motion.div
        className="fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="bg-white rounded-xl w-full max-w-md py-8 px-6"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold mb-2">
              Sorry, We are not yet in
            </h2>
            <p className="text-lg font-medium">{selectedAddress.fullAddress}</p>
          </div>

          <div className="text-center mb-6">
            <p className="text-gray-600">
              We are currently delivering in select parts of
            </p>
            <div className="flex flex-wrap justify-center gap-1 mt-2 text-green-600">
              {SERVICED_CITIES.map((city, index) => (
                <React.Fragment key={city}>
                  <span>
                    {city}
                    {index < SERVICED_CITIES.length - 1 ? "," : ""}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleChangeLocation}
              className="w-full py-3 bg-green-500 text-white rounded-lg font-medium"
            >
              Change Location
            </button>
            <div className="w-full py-3 border border-gray-300 text-gray-600 rounded-lg font-medium text-center bg-gray-100 cursor-not-allowed">
              You cannot view products outside our service area.
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Add loading and error states to the map component
  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white">
        <div className="text-red-500 text-xl mb-4">Unable to load map</div>
        <p className="text-gray-600 text-center mb-4">
          {typeof loadError === "string" &&
          loadError.includes("ERR_BLOCKED_BY_CLIENT")
            ? "Please disable your ad blocker or add an exception for this website."
            : "There was a problem loading the map. Please try again."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-green-500 text-white px-4 py-2 rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  // Move console.warn override to a separate utility
  const setupRouterWarningSuppress = () => {
    const originalWarn = console.warn.bind(console);
    console.warn = (...args: any[]) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("React Router Future Flag Warning")
      )
        return;
      originalWarn(...args);
    };
    return originalWarn;
  };

  // Apply the warning suppression
  setupRouterWarningSuppress();

  return (
    <div className="min-h-screen max-w-[800px] mx-auto flex flex-col bg-[#FFFBEB]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FFFBEB] ">
        <div className="max-w-[800px] mx-auto px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 p-2 hover:bg-gray-100 rounded-full"
          >
            <MdArrowBack className="text-xl" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-[800px] mx-auto w-full px-4 pb-4">
        <h1 className="text-2xl font-semibold mb-2">Delivery Address</h1>
        <p className="text-gray-600 mb-6">
          Where should we deliver your flowers?
        </p>

        {/* Map Container */}
        <div className="w-full h-[300px] md:h-[400px] relative rounded-lg overflow-hidden mb-6 shadow-md">
          {isLoaded && selectedPosition ? (
            <GoogleMap
              mapContainerStyle={{
                width: "100%",
                height: "100%",
              }}
              center={selectedPosition}
              zoom={15}
              onLoad={onLoad}
              onUnmount={onUnmount}
              onDragEnd={handleMapDrag}
              options={{
                zoomControl: false,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
              }}
            >
              {/* Marker */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10">
                <div className="flex flex-col items-center">
                  <MdLocationOn className="text-5xl text-[#F15A22]" />
                  <div className="w-3 h-3 -mt-2 bg-black/20 rounded-full shadow-lg"></div>
                </div>
              </div>

              {/* Back Button */}
              <button
                onClick={() => navigate(-1)}
                className="absolute top-4 left-4 bg-white rounded-full p-2 shadow-lg z-10 hover:bg-gray-50"
              >
                <MdArrowBack />
              </button>

              {/* Current Location Button */}
              <button
                onClick={getCurrentLocation}
                className="absolute left-1/2 bottom-4 -translate-x-1/2 bg-white rounded-full px-4 py-2 shadow-lg z-10 hover:bg-gray-50 flex items-center gap-2 text-sm"
              >
                <MdMyLocation className="text-[#F15A22]" />
                <span>Use current location</span>
              </button>
            </GoogleMap>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
          )}
        </div>

        {/* Address Details */}
        <div className="space-y-4 bg-white rounded-lg p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Complete Address</h2>
            {isValidatingDeliveryZone ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#F15A22]"></div>
                <span>Checking delivery zone...</span>
              </div>
            ) : (
              <div className={`text-sm px-2 py-1 rounded-full ${
                isLocationServiced 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {isLocationServiced ? '✓ Delivery Available' : '✗ Outside Delivery Area'}
              </div>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="House/Flat no"
              value={addressDetails.houseNo}
              onChange={(e) =>
                setAddressDetails((prev) => ({
                  ...prev,
                  houseNo: e.target.value,
                }))
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#F15A22]"
            />
            <input
              type="text"
              required
              placeholder="Street Name, Area"
              value={addressDetails.apartment}
              onChange={(e) =>
                setAddressDetails((prev) => ({
                  ...prev,
                  apartment: e.target.value,
                }))
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#F15A22]"
            />
          </div>
          <div>
            <h2 className="font-medium mb-2">Directions/Landmark</h2>
            <input
              type="text"
              required
              placeholder="Nearby landmark for easy location"
              value={addressDetails.directions}
              onChange={(e) =>
                setAddressDetails((prev) => ({
                  ...prev,
                  directions: e.target.value,
                }))
              }
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#F15A22]"
            />
          </div>

          {/* Address Type Selection */}
          <div>
            <h2 className="font-medium mb-2">Address Type</h2>
            <div className="flex flex-wrap gap-3">
              {["Home", "Work", "Others"].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedLocationType(type);
                    if (type !== "Others") {
                      setOtherLocationName("");
                    }
                  }}
                  className={`px-6 py-2 rounded-full border transition-colors ${
                    selectedLocationType === type
                      ? "border-[#F15A22] text-[#F15A22] bg-orange-50"
                      : "border-gray-300 text-gray-600 hover:border-[#F15A22] hover:text-[#F15A22]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Other Location Name Input */}
          {selectedLocationType === "Others" && (
            <input
              type="text"
              placeholder="Enter location name"
              value={otherLocationName}
              onChange={(e) => setOtherLocationName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#F15A22]"
            />
          )}
        </div>

        {/* Error Message Display */}
        {error && (
          <div className="text-red-500 text-sm mt-2 p-2 bg-red-50 rounded">
            {error}
          </div>
        )}

        {/* Confirm Button */}
        <div className="max-w-[800px] w-full mx-auto px-4 mt-4 bottom-4 left-0 right-0 md:static md:px-0 md:mt-6">
          <button
            onClick={handleSaveLocation}
            className="w-full py-3 bg-[#F15A22] text-white rounded-3xl font-medium hover:bg-[#F15A22]/90 transition-colors"
          >
            Confirm Location
          </button>
        </div>
      </div>

      {/* Location Not Serviced Modal */}
      {showLocationModal && !isLocationServiced && (
        <LocationNotServicedException />
      )}
    </div>
  );
};

export default HomePageLocation;
