import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { GoogleMap, Autocomplete } from "@react-google-maps/api";
import { MdLocationOn, MdMyLocation, MdArrowBack } from "react-icons/md";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useGoogleMaps } from "../../hooks/useGoogleMaps";
import { addressService } from "../../services/address.service";
import { validateGpDailyDeliveryAreaFromCoordinates } from "../../services/subscriptionZone.service";
import {
  storeService,
  type CityOption,
} from "../../services/store.service";
import { useFeatureTheme } from "../../context/FeatureThemeContext";
import {
  GEO_MSG_GEOCODE_EMPTY,
  GEO_MSG_NETWORK,
  GEO_MSG_UNSUPPORTED,
  isLikelyNetworkError,
  messageFromGeolocationPositionError,
} from "../../utils/geolocationMessages";
import Spinner from "../../components/common/Spinner";
import { GP_SEARCH_ICON_CLASSES } from "../../components/common/SearchBar";
import {
  MapLoadingPlaceholder,
  MapPanelSkeleton,
} from "../../components/common/PageSkeletons";
import {
  ONBOARDING_STYLE_PLACES_AUTOCOMPLETE_OPTIONS,
  attachPlacesAutocompleteToMapBounds,
  panMapToPlaceResult,
} from "../../utils/googlePlacesAutocompleteConfig";

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
  const { theme, feature } = useFeatureTheme();
  const returnUrl = location.state?.returnUrl || "/Allset";
  const placesAutocompleteMountKey = useMemo(() => location.key, [location.key]);
  const placesSearchInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  // const [, setLocationPredictions] = useState<PlacePrediction[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [, setIsLoadingLocation] = useState(false);
  const [isLocationServiced, setIsLocationServiced] = useState(true);
  const [isValidatingDeliveryZone, setIsValidatingDeliveryZone] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  // const [useRegularMarker, setUseRegularMarker] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  // const markerRef = useRef<any>(null);
  const [deliveryZoneAvailable, setDeliveryZoneAvailable] = useState(true);

  const { isLoaded, loadError } = useGoogleMaps();

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

  const [servicedCities, setServicedCities] = useState<CityOption[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const LOCATE_ME_MAP_ZOOM = 16;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setCitiesLoading(true);
      try {
        const list = await storeService.getUniqueCitiesFromOnlineStores();
        if (!cancelled) setServicedCities(list);
      } catch {
        if (!cancelled) setServicedCities([]);
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Since we're now using the delivery zone validation API directly,
    // we don't need to fetch polygon data anymore
    setDeliveryZoneAvailable(true);
  }, []);





  useEffect(() => {
    if (localStorage.getItem("needLocation") === "true") {
      setShowLocationModal(true);
    }
  }, []);

  // Hydrate saved coordinates / geocode only after the Maps script is ready.
  useEffect(() => {
    if (!isLoaded) return;
    const savedLocation = localStorage.getItem("userLocation");
    const savedCoordinates = localStorage.getItem("userCoordinates");
    if (savedLocation && savedCoordinates) {
      try {
        const coords = JSON.parse(savedCoordinates);
        setSelectedPosition(coords);
        void (async () => {
          await updateAddressDetails(coords.lat, coords.lng);
          if (placesSearchInputRef.current) {
            placesSearchInputRef.current.value = savedLocation;
          }
        })();
      } catch {
        setError(
          "Saved location could not be loaded. Search for your address on the map or allow location again.",
        );
        return;
      }
      return;
    }
    getCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once when `isLoaded` becomes true
  }, [isLoaded]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    attachPlacesAutocompleteToMapBounds(autocompleteRef.current, map);
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const panMapToPosition = useCallback(
    (position: { lat: number; lng: number }, zoom = LOCATE_ME_MAP_ZOOM) => {
      if (!isLoaded || !mapRef.current) return;
      mapRef.current.panTo(position);
      const currentZoom = mapRef.current.getZoom();
      if (currentZoom == null || currentZoom < zoom) {
        mapRef.current.setZoom(zoom);
      }
    },
    [isLoaded],
  );

  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    setError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const coords = { lat: latitude, lng: longitude };
          setSelectedPosition(coords);
          panMapToPosition(coords, LOCATE_ME_MAP_ZOOM);

          try {
            const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

            if (!apiKey) {
              console.error("Google Maps API key is not configured.");
              setError(
                "Maps are not configured on this build. Please search for your address on the map.",
              );
              setIsLoadingLocation(false);
              return;
            }

            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`,
            );
            if (!response.ok) {
              setError(GEO_MSG_NETWORK);
              setIsLoadingLocation(false);
              return;
            }
            const data = await response.json();
            if (data.status === "ZERO_RESULTS" || !data.results?.[0]) {
              setError(GEO_MSG_GEOCODE_EMPTY);
              setIsLoadingLocation(false);
              return;
            }
            const address = data.results[0].formatted_address;
            if (placesSearchInputRef.current) {
              placesSearchInputRef.current.value = address;
            }
            updateAddressDetails(latitude, longitude);
          } catch (error) {
            console.error("Error fetching address details:", error);
            setError(
              isLikelyNetworkError(error)
                ? GEO_MSG_NETWORK
                : "We couldn't load that address. Try searching on the map.",
            );
          }
          setIsLoadingLocation(false);
        },
        (geoErr) => {
          console.error("Error getting current location:", geoErr);
          setError(messageFromGeolocationPositionError(geoErr));
          setIsLoadingLocation(false);
        },
        { enableHighAccuracy: false, timeout: 20_000, maximumAge: 60_000 },
      );
    } else {
      setError(GEO_MSG_UNSUPPORTED);
      setIsLoadingLocation(false);
    }
  };

  const updateMarkerPosition = (position: { lat: number; lng: number }) => {
    panMapToPosition(position);
  };

  const updateAddressDetails = async (lat: number, lng: number) => {
    if (!isLoaded || !window.google?.maps) {
      return;
    }

    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });

 

      if (!result?.results?.[0]) {
        setError(GEO_MSG_GEOCODE_EMPTY);
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

      

      setSelectedAddress({
        city,
        district,
        state,
        pincode,
        fullAddress,
      });

      setAddressDetails(newAddressDetails);

      if (placesSearchInputRef.current) {
        placesSearchInputRef.current.value = fullAddress;
      }

      setSelectedLocationType((prev) => prev || "Home");

      // Check if the point is within delivery zone using the new API
      setIsValidatingDeliveryZone(true);
      try {
        const coordinates = `${lat},${lng}`;
        const validation =
          feature === "gpStore"
            ? await addressService.validateAddressInDeliveryArea(coordinates)
            : await validateGpDailyDeliveryAreaFromCoordinates(coordinates);
        setIsLocationServiced(validation.isValid);
      } catch (error) {
        console.error("Error validating delivery zone:", error);
        setIsLocationServiced(false);
      } finally {
        setIsValidatingDeliveryZone(false);
      }
    } catch (error) {
      console.error("Error in updateAddressDetails:", error);
      setError(
        isLikelyNetworkError(error)
          ? GEO_MSG_NETWORK
          : GEO_MSG_GEOCODE_EMPTY,
      );
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
              We are currently delivering in selected parts of
            </p>
            {citiesLoading ? (
              <div className="mt-3 flex justify-center">
                <Spinner size={24} />
              </div>
            ) : servicedCities.length > 0 ? (
              <p
                className="mt-2 text-base font-medium leading-relaxed"
                style={{ color: theme.colors.primary }}
              >
                {servicedCities.map((city) => city.name).join(", ")}
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                Check back soon as we expand to more areas.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={handleChangeLocation}
              className={`w-full py-3 rounded-lg font-medium ${theme.classes.primaryButton} ${theme.classes.primaryButtonHover}`}
            >
              Change Location
            </button>
            {/* <div className="w-full py-3 border border-gray-300 text-gray-600 rounded-lg font-medium text-center bg-gray-100 cursor-not-allowed">
              You cannot view products outside our service area.
            </div> */}
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
          className={`px-4 py-2 rounded-lg ${theme.classes.primaryButton} ${theme.classes.primaryButtonHover}`}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <MapLoadingPlaceholder />
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

  const onPlaceChanged = () => {
    const ac = autocompleteRef.current;
    if (!ac) return;
    const place = ac.getPlace();
    if (!place.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    setSelectedPosition({ lat, lng });
    panMapToPlaceResult(place, mapRef.current);
    void updateAddressDetails(lat, lng);
  };

  return (
    <div
      className={`min-h-screen max-w-[800px] mx-auto flex flex-col pb-nav-bottom ${theme.classes.authPageBackground}`}
    >
      {/* Header — same pattern as AddEditAddress / Addresses (back + title aligned) */}
      <div className="flex flex-1 flex-col px-4 pb-4">
        <div
          className={`sticky top-0 z-10 -mx-4 mb-2 px-4 pb-3 pt-5 ${theme.classes.authPageBackground}`}
        >
          <div className="flex items-start gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="-ml-2 shrink-0 rounded-full p-2 text-gray-600 transition-colors hover:bg-black/5"
              aria-label="Go back"
            >
              <MdArrowBack className="text-xl" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold leading-tight text-gray-900">
                Delivery Address
              </h1>
              <p className="mt-1.5 text-base leading-snug text-gray-600">
                Where should we deliver your flowers?
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="relative">
            {isLoaded ? (
              <Autocomplete
                key={placesAutocompleteMountKey}
                options={ONBOARDING_STYLE_PLACES_AUTOCOMPLETE_OPTIONS}
                onLoad={(ac) => {
                  autocompleteRef.current = ac;
                  attachPlacesAutocompleteToMapBounds(ac, mapRef.current);
                }}
                onPlaceChanged={onPlaceChanged}
              >
                <div className="relative">
                  <input
                    ref={placesSearchInputRef}
                    type="text"
                    placeholder="Search for a location..."
                    defaultValue=""
                    className="w-full rounded-xl border border-[#808080] bg-transparent p-3 pl-4 pr-10 text-left text-gray-900 placeholder:text-[#808080] focus:border-[#808080] focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': theme.colors.primary } as React.CSSProperties}
                  />
                  <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${GP_SEARCH_ICON_CLASSES}`}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-full w-full"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>
              </Autocomplete>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Loading map..."
                  disabled
                  className="w-full rounded-xl border border-[#808080] bg-transparent p-3 pl-4 pr-10 text-left text-gray-400"
                />
                <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${GP_SEARCH_ICON_CLASSES}`}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-full w-full"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>

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

              {/* Locate me */}
              <button
                onClick={getCurrentLocation}
                className="absolute left-1/2 bottom-4 -translate-x-1/2 bg-white rounded-full px-4 py-2 shadow-lg z-10 hover:bg-gray-50 flex items-center gap-2 text-sm"
              >
                <MdMyLocation className="text-[#F15A22]" />
                <span>Locate me</span>
              </button>
            </GoogleMap>
          ) : (
            <div className="w-full h-full min-h-[200px]">
              <MapPanelSkeleton className="h-full min-h-full" />
            </div>
          )}
        </div>

        

        {/* Address Details */}
        <div className="space-y-4 bg-white rounded-lg p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Complete Address</h2>
            {isValidatingDeliveryZone ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Spinner size={16} />
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
        <div className="mt-4 w-full md:mt-6">
          <button
            onClick={handleSaveLocation}
            className={`w-full py-3 rounded-3xl font-medium transition-colors ${theme.classes.primaryButton} ${theme.classes.primaryButtonHover}`}
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
