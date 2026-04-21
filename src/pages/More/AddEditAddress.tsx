import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MdLocationOn, MdMyLocation } from 'react-icons/md';
import { addressService, Address } from '../../services/address.service';
import { validateGpDailyDeliveryAreaFromCoordinates } from '../../services/subscriptionZone.service';
import { toast } from 'react-hot-toast';
import { GoogleMap, Autocomplete } from '@react-google-maps/api';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';

import { customerService } from '../../services/getcustomer.service';
import { useFeatureTheme } from '../../context/FeatureThemeContext';
import { MapLoadingPlaceholder } from '../../components/common/PageSkeletons';
import { UniformPageHeader } from '../../components/layout/UniformPageHeader';

/** When Google Geocoding REST is unavailable or returns nothing, fill fields from OSM (usage policy: identify app). */
async function reverseGeocodeWithOsm(
  lat: number,
  lng: number,
): Promise<{ formatted: string; line: string; pin: string } | null> {
  const params = new URLSearchParams({
    format: 'json',
    lat: String(lat),
    lon: String(lng),
    'accept-language': 'en',
  });
  const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'GendaPhoolAddressForm/1.0 (https://customerapp.mygendaphool.com)',
    },
  });
  if (!res.ok) return null;
  const d = (await res.json()) as {
    display_name?: string;
    address?: Record<string, string>;
  };
  const addr = d.address || {};
  const roadLine = [addr.house_number, addr.road].filter(Boolean).join(' ').trim();
  const parts = [
    roadLine,
    addr.suburb || addr.neighbourhood,
    addr.city || addr.town || addr.village,
    addr.state,
  ]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
  const line =
    parts.join(', ') ||
    (d.display_name ? d.display_name.split(',').slice(0, 4).join(',').trim() : '');
  const formatted = (d.display_name || line || '').trim();
  if (!formatted && !line) return null;
  const pin = String(addr.postcode || '')
    .replace(/\D/g, '')
    .slice(0, 6);
  return {
    formatted: formatted || line,
    line: line || formatted,
    pin: pin.length === 6 ? pin : '',
  };
}

const AddEditAddress: React.FC = () => {
  const navigate = useNavigate();
  const { feature, theme } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  const location = useLocation();
  const isEdit = location.pathname.includes('edit');
  const existingAddress = location.state?.address as Address | undefined;
  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded, loadError } = useGoogleMaps();
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const isLocationRequestInProgress = useRef(false);
  const lastToastMessage = useRef<string | null>(null);
  const hasInitialized = useRef(false);

  const [selectedPosition, setSelectedPosition] = useState<{ lat: number, lng: number }>({
    lat: 20.5937,
    lng: 78.9629
  });

  const [formData, setFormData] = useState<{
    completeAddress: string;
    floor: string;
    landmark: string;
    type: 'Home' | 'Work' | 'Others' | string;
  }>({
    completeAddress: '',
    floor: '',
    landmark: '',
    type: 'Home',
  });

  const [deliveryAddress, setDeliveryAddress] = useState('');

  const [selectedType, setSelectedType] = useState<'Home' | 'Work' | 'Others'>('Home');
  const [customTypeName, setCustomTypeName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingLocation, setIsValidatingLocation] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pincode, setPincode] = useState('');

  const [isLocating, setIsLocating] = useState(false);
  const [showMapLocationHint, setShowMapLocationHint] = useState(false);
  const [locationValidation, setLocationValidation] = useState<{
    isValid: boolean;
    message?: string;
  } | null>(null);

  useEffect(() => {
    // Prevent double execution in StrictMode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (isEdit && existingAddress) {
      // Construct fullAddress, avoiding duplication
      // If area is the same as streetName, don't include it twice
      const addressParts = [
        existingAddress.houseNo,
        existingAddress.streetName
      ].filter(Boolean);
      
      // Only add area if it's different from streetName and not empty
      if (existingAddress.area && 
          existingAddress.area.trim() !== existingAddress.streetName?.trim() &&
          existingAddress.area.trim() !== 'unknown') {
        addressParts.push(existingAddress.area);
      }
      
      const fullAddress = addressParts.join(', ');

      const addressType = existingAddress.type || 'Home';
      setFormData({
        completeAddress: fullAddress || '',
        floor: '',
        landmark: existingAddress.area && existingAddress.area !== existingAddress.streetName 
          ? existingAddress.area 
          : '',
        type: addressType,
      });
      // If type is "Others" or a custom type (not Home/Work), set it to Others and store custom name
      if (addressType === 'Others' || (addressType !== 'Home' && addressType !== 'Work')) {
        setSelectedType('Others');
        setCustomTypeName(addressType === 'Others' ? '' : addressType);
      } else {
        setSelectedType(addressType as 'Home' | 'Work');
      }
      setDeliveryAddress(fullAddress || '');
      setPincode(existingAddress.pincode || '');
      // If editing, use the name/phone from the address record if available
      if (existingAddress.name) {
        setName(existingAddress.name);
      }
      if (existingAddress.associatedPhoneNumber) {
        setPhone(existingAddress.associatedPhoneNumber);
      }
      
      // Parse and set coordinates from existing address
      if (existingAddress.coordinates) {
        try {
          const [lat, lng] = existingAddress.coordinates.split(',').map(Number);
          if (!isNaN(lat) && !isNaN(lng)) {
            setSelectedPosition({ lat, lng });
            // Update map center when map is loaded
            if (mapRef.current) {
              mapRef.current.panTo({ lat, lng });
            }
          }
        } catch (error) {
          console.error('Error parsing coordinates:', error);
        }
      }
    } else {
      getCurrentLocation();
    }

    // Fetch user details for default name/phone
    const fetchUserDetails = async () => {
      // Don't overwrite if editing (values already set from existing address)
      if (isEdit && existingAddress) return;

      try {
        const customers = await customerService.getAllCustomers();
        if (customers.length > 0) {
          const user = customers[0];
          // Set name if available
          if (user.firstName || user.lastName) {
            setName(`${user.firstName} ${user.lastName}`.trim());
          }
          // Set phone if available
          if (user.phoneNumber) {
            setPhone(user.phoneNumber);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user details:', error);
      }
    };

    fetchUserDetails();
  }, [isEdit, existingAddress]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // If editing and we have coordinates, center the map on them
    if (isEdit && existingAddress?.coordinates) {
      try {
        const [lat, lng] = existingAddress.coordinates.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          map.panTo({ lat, lng });
          map.setZoom(15);
        }
      } catch (error) {
        console.error('Error centering map on coordinates:', error);
      }
    }
  }, [isEdit, existingAddress]);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const validateForm = () => {
    if (!name.trim()) {
      toast.error('Please enter your full name');
      return false;
    }
    if (!phone.trim()) {
      toast.error('Please enter your phone number');
      return false;
    }
    if (!formData.completeAddress.trim()) {
      toast.error('Please enter a complete address');
      return false;
    }
    if (!pincode.trim()) {
      toast.error('Please enter a zip code');
      return false;
    }
    return true;
  };

  const validateLocation = async (): Promise<boolean> => {
    try {
      setIsValidatingLocation(true);
      const coordinates = `${selectedPosition.lat},${selectedPosition.lng}`;

      // First validate coordinates format
      if (!addressService.validateCoordinatesFormat(coordinates)) {
        toast.error('Invalid coordinates format');
        setLocationValidation({ isValid: false, message: 'Invalid coordinates format' });
        return false;
      }

      const validation =
        feature === 'gpStore'
          ? await addressService.validateAddressInDeliveryArea(coordinates)
          : await validateGpDailyDeliveryAreaFromCoordinates(coordinates);
      if (!validation.isValid) {
        if (feature !== 'gpStore') {
          setLocationValidation(null);
          return true;
        }
        setLocationValidation({
          isValid: false,
          message: validation.message || 'Address is outside delivery area',
        });
        toast.error(validation.message || 'Address is outside delivery area');
        return false;
      }

      setLocationValidation({
        isValid: true,
        message: validation.message || 'We deliver to this location.',
      });
      return true;
    } catch (error) {
      console.error('Error validating location:', error);
      toast.error('Failed to validate address location');
      setLocationValidation({ isValid: false, message: 'Failed to validate address location' });
      return false;
    } finally {
      setIsValidatingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Validate location before saving
    const isLocationValid = await validateLocation();
    if (!isLocationValid) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Parse completeAddress to extract components
      const addressParts = formData.completeAddress.split(',').map(s => s.trim());
      const houseNo = addressParts[0] || 'unknown';
      const streetName = addressParts.slice(1).join(', ') || 'unknown';

      // Determine the final type: use custom name if provided, otherwise use selected type
      // If Others is selected and custom name is provided, use the custom name
      // If Others is selected but no custom name, still use "Others"
      // Otherwise, use the selected type (Home or Work)
      const finalType = selectedType === 'Others' 
        ? (customTypeName.trim() || 'Others')
        : selectedType;

      const addressData = {
        name: name, // Include name in payload
        associatedPhoneNumber: phone, // Use the state variable
        city: 'unknown',
        coordinates: `${selectedPosition.lat},${selectedPosition.lng}`,
        district: 'unknown',
        houseNo: houseNo,
        area: formData.landmark || 'unknown',
        state: 'Unknown',
        pincode: pincode, // Use the state variable
        streetName: streetName,
        type: finalType as any, // Allow custom type names (e.g., "friends")
        setAsDefault: false // explicitly initialize as false
      };

      if (isEdit && existingAddress?.id) {
        // Exclude setAsDefault for update if it causes issues, or the backend doesn't support it on update
        const { setAsDefault, ...updateData } = addressData;
        await addressService.updateAddress(existingAddress.id, updateData);
        toast.success('Address updated successfully');
      } else {
        await addressService.createAddress(addressData);
        toast.success('Address added successfully');
      }
      navigate(`${basePath}/addresses`);
    } catch (error) {
      console.error('Failed to save address:', error);
      toast.error(isEdit ? 'Failed to update address' : 'Failed to add address');
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Apply a Geocoder / Places result to search box, pin line, and pincode (same shape as Autocomplete). */
  const applyGeocodedPlaceToForm = (place: google.maps.GeocoderResult) => {
    const formattedAddress = place.formatted_address || '';
    setDeliveryAddress(formattedAddress);
    setSearchQuery(formattedAddress);

    const addressComponents: Record<string, string> = {};
    place.address_components?.forEach((component) => {
      component.types.forEach((type: string) => {
        if (type === 'street_number' && !addressComponents.houseNo) {
          addressComponents.houseNo = component.long_name;
        }
        if (type === 'route' && !addressComponents.streetName) {
          addressComponents.streetName = component.long_name;
        }
        if (
          (type === 'sublocality_level_1' ||
            type === 'sublocality' ||
            type === 'neighborhood') &&
          !addressComponents.area
        ) {
          addressComponents.area = component.long_name;
        }
        if (type === 'premise' && !addressComponents.premise) {
          addressComponents.premise = component.long_name;
        }
        if ((type === 'locality' || type === 'postal_town') && !addressComponents.city) {
          addressComponents.city = component.long_name;
        }
        if (type === 'administrative_area_level_1' && !addressComponents.state) {
          addressComponents.state = component.long_name;
        }
      });
    });

    const areaPart = addressComponents.area || addressComponents.premise || '';
    const completeAddr = [
      addressComponents.houseNo,
      addressComponents.streetName,
      areaPart,
      addressComponents.city,
      addressComponents.state,
    ]
      .map((s) => String(s || '').trim())
      .filter(Boolean)
      .join(', ');

    const line = completeAddr.length > 0 ? completeAddr : formattedAddress;
    setFormData((prev) => ({
      ...prev,
      completeAddress: line,
    }));

    const pin = place.address_components?.find((c) =>
      c.types.includes('postal_code')
    )?.long_name;
    if (pin) setPincode(pin);
  };

  const getCurrentLocation = () => {
    if (isLocationRequestInProgress.current) return;
    isLocationRequestInProgress.current = true;
    setIsLocating(true);

    if (!navigator.geolocation) {
      const errorMsg = 'Geolocation is not supported by your browser';
      if (lastToastMessage.current !== errorMsg) {
        lastToastMessage.current = errorMsg;
        toast.error(errorMsg);
      }
      isLocationRequestInProgress.current = false;
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setSelectedPosition({ lat: latitude, lng: longitude });
          if (mapRef.current) {
            mapRef.current.panTo({ lat: latitude, lng: longitude });
          }

          const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
          let filled = false;
          if (apiKey) {
            try {
              const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${encodeURIComponent(apiKey)}`,
              );
              const data = await response.json();
              if (data.status === 'OK' && data.results?.[0]) {
                applyGeocodedPlaceToForm(data.results[0]);
                filled = true;
              }
            } catch (_) {
              /* try OSM */
            }
          }
          if (!filled) {
            try {
              const osm = await reverseGeocodeWithOsm(latitude, longitude);
              if (osm) {
                setDeliveryAddress(osm.formatted);
                setSearchQuery(osm.formatted);
                setFormData((prev) => ({ ...prev, completeAddress: osm.line }));
                if (osm.pin) setPincode(osm.pin);
              }
            } catch (_) {
              /* ignore */
            }
          }
          setShowMapLocationHint(true);
          window.setTimeout(() => setShowMapLocationHint(false), 4000);
        } catch (error) {
          console.error('Error fetching address:', error);
          const errorMsg = 'Failed to fetch location details';
          if (lastToastMessage.current !== errorMsg) {
            lastToastMessage.current = errorMsg;
            toast.error(errorMsg);
          }
        } finally {
          isLocationRequestInProgress.current = false;
          setIsLocating(false);
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
        setIsLocating(false);
      }
    );
  };

  const reverseGeocodeMapCenter = async (lat: number, lng: number) => {
    if (window.google?.maps) {
      try {
        const geocoder = new google.maps.Geocoder();
        const { results } = await geocoder.geocode({ location: { lat, lng } });
        if (results?.[0]) {
          applyGeocodedPlaceToForm(results[0]);
          return;
        }
      } catch (error) {
        console.error('Reverse geocode failed:', error);
      }
    }
    try {
      const osm = await reverseGeocodeWithOsm(lat, lng);
      if (osm) {
        setDeliveryAddress(osm.formatted);
        setSearchQuery(osm.formatted);
        setFormData((prev) => ({ ...prev, completeAddress: osm.line }));
        if (osm.pin) setPincode(osm.pin);
      }
    } catch (_) {
      /* ignore */
    }
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
        setLocationValidation(null);
        void reverseGeocodeMapCenter(newPosition.lat, newPosition.lng);
      }
    }
  };

  const onLoadAutocomplete = useCallback((autocomplete: google.maps.places.Autocomplete) => {
    setAutocomplete(autocomplete);
  }, []);

  const onPlaceChanged = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) {
        return;
      }
      const location = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      };
      setSelectedPosition(location);
      if (mapRef.current) {
        mapRef.current.panTo(location);
        mapRef.current.setZoom(15);
      }
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white">
        <div className="text-red-500 text-xl mb-4">
          Unable to load map
        </div>
        <button
          onClick={() => window.location.reload()}
          className="text-white px-4 py-2 rounded-lg"
          style={{ backgroundColor: theme.colors.primary }}
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

  return (
    <div className="min-h-screen bg-[#f8f6f1] px-4">
      <div className="max-w-[800px] mx-auto">
        <UniformPageHeader
          title="Enter Address Details"
          onBack={() => navigate(`${basePath}/addresses`)}
          padXClassName="px-0"
          padYClassName="py-4"
        />

        {/* Map Section */}
        <div className="w-full h-[300px] relative rounded-lg overflow-hidden mb-4 bg-[#F5F5DC]">
          {/* Search Bar inside Map */}
          <div className="absolute top-3 left-3 right-3 z-30">
            {isLoaded ? (
              <Autocomplete
                onLoad={(autocomplete) => {
                  setAutocomplete(autocomplete);
                }}
                onPlaceChanged={() => {
                  if (!autocomplete) return;
                  const place = autocomplete.getPlace();
                  if (!place.geometry?.location) return;
                  const location = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                  };
                  setSelectedPosition(location);
                  if (mapRef.current) {
                    mapRef.current.panTo(location);
                    mapRef.current.setZoom(15);
                  }
                  applyGeocodedPlaceToForm(place as google.maps.GeocoderResult);
                }}
                fields={['address_components', 'geometry', 'formatted_address']}
              >
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search anything...."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-3 pl-4 pr-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent shadow-md text-left"
                    style={{ '--tw-ring-color': theme.colors.primary } as React.CSSProperties}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.primary;
                      e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
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
                  className="w-full p-3 pl-4 pr-10 border border-gray-300 rounded-lg bg-gray-100"
                />
              </div>
            )}
          </div>
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
              disableDefaultUI: true,
              // Allow map dragging freely (pin is fixed at center; move map to move pin)
              draggable: true,
              gestureHandling: 'greedy',
              scrollwheel: true
            }}
          />
          {/* Fixed Marker — tip at map center (matches getCenter() after drag) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-20">
            <div className="relative">
              {/* shadow */}
              <div className="absolute left-1/2 top-[44px] h-3 w-7 -translate-x-1/2 rounded-full bg-black/15 blur-[6px]" />
              {/* pulse ring */}
              <div
                className="absolute left-1/2 top-[44px] h-6 w-6 rounded-full"
                style={{ backgroundColor: theme.colors.primary, animation: 'gpPinPulse 1.6s ease-out infinite' }}
              />
              {/* pin */}
              <svg width="34" height="48" viewBox="0 0 24 34" fill="none" aria-hidden className="drop-shadow-[0_8px_16px_rgba(0,0,0,0.14)]">
                <path
                  d="M12 33C12 33 22 21.6 22 13C22 6.37258 17.5228 1 12 1C6.47715 1 2 6.37258 2 13C2 21.6 12 33 12 33Z"
                  fill={theme.colors.primary}
                />
                <circle cx="12" cy="13" r="5.2" fill="white" opacity="0.98" />
                <circle cx="12" cy="13" r="2.2" fill={theme.colors.primary} opacity="0.9" />
              </svg>
            </div>
          </div>
          {/* Locate Me Button - At the bottom */}
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={isLocating}
            aria-busy={isLocating}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-sm hover:bg-gray-50 z-20 disabled:opacity-60 disabled:pointer-events-none"
          >
            <MdMyLocation className={`h-4 w-4 ${isLocating ? 'animate-pulse' : ''}`} />
            <span>{isLocating ? 'Locating' : 'Locate Me'}</span>
          </button>
          {/* Paper airplane icon button (top right) */}
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={isLocating}
            aria-label={isLocating ? 'Locating' : 'Locate me'}
            className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-md hover:bg-gray-50 z-10 disabled:opacity-50 disabled:pointer-events-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>

        {showMapLocationHint && (
          <div
            className="mb-3 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 shadow-sm"
            role="status"
          >
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M16.667 5.833L8.333 14.167 3.333 9.167" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="flex-1 min-w-0 truncate font-semibold">
              Location detected
              <span className="font-medium"> — drag map to adjust pin</span>
            </span>
            <button
              type="button"
              onClick={() => setShowMapLocationHint(false)}
              className="flex-shrink-0 text-xs font-semibold text-green-700/80 hover:text-green-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {locationValidation && (
          <div
            className={`mb-4 rounded-xl border p-3 text-sm ${
              locationValidation.isValid
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
            role="status"
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  locationValidation.isValid ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              {locationValidation.message}
            </div>
          </div>
        )}

        {/* Form Fields - Updated Layout */}
        <div className="space-y-4">
          {deliveryAddress && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
              <p className="text-gray-600 text-sm mb-1">Selected map address</p>
              <p className="text-gray-800 font-medium">{deliveryAddress}</p>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-gray-700 mb-2 text-sm font-bold">
              Full Name*
            </label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-[#FFFBF7]"
              style={{ '--tw-ring-color': theme.colors.primary } as React.CSSProperties}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.colors.primary;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-gray-700 mb-2 text-sm font-bold">
              Phone Number*
            </label>
            <input
              type="tel"
              placeholder="00000 00000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-[#FFFBF7]"
              style={{ '--tw-ring-color': theme.colors.primary } as React.CSSProperties}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.colors.primary;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Complete Address */}
          <div>
            <label className="block text-gray-700 mb-2 text-sm font-bold">
              Complete Address *
            </label>
            <textarea
              placeholder="House/Flat No., Building Name, Area, City, State"
              value={formData.completeAddress}
              onChange={(e) => setFormData({ ...formData, completeAddress: e.target.value })}
              rows={3}
              className="w-full p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm resize-none focus:outline-none focus:ring-2 focus:border-transparent bg-[#FFFBF7]"
              style={{ '--tw-ring-color': theme.colors.primary } as React.CSSProperties}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.colors.primary;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Zip Code */}
          <div>
            <label className="block text-gray-700 mb-2 text-sm font-bold">
              Zip Code*
            </label>
            <input
              type="text"
              placeholder="302021"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-[#FFFBF7]"
              style={{ '--tw-ring-color': theme.colors.primary } as React.CSSProperties}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.colors.primary;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>


          {/* Floor (Optional) */}
          <div>
            <label className="block text-gray-700 mb-2 text-sm font-bold">
              Floor (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., 2nd Floor"
              value={formData.floor}
              onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-[#FFFBF7]"
              style={{ '--tw-ring-color': theme.colors.primary } as React.CSSProperties}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.colors.primary;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Nearby Landmark (Optional) */}
          <div>
            <label className="block text-gray-700 mb-2 text-sm font-bold">
              Nearby Landmark (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Near City Mall"
              value={formData.landmark}
              onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-[#FFFBF7]"
              style={{ '--tw-ring-color': theme.colors.primary } as React.CSSProperties}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.colors.primary;
                e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-3 text-sm font-bold">
              Tag this location Type
            </label>
            <div className="flex gap-3 w-2/3 items-center flex-wrap">
              {['Home', 'Work', 'Others'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedType(type as 'Home' | 'Work' | 'Others');
                    if (type !== 'Others') {
                      setFormData(prev => ({ ...prev, type: type as 'Home' | 'Work' }));
                      setCustomTypeName(''); // Clear custom name when switching away from Others
                    } else {
                      setFormData(prev => ({ ...prev, type: 'Others' }));
                    }
                  }}
                  className={`py-2.5 px-2 rounded-2xl border-2 transition-colors text-sm font-semibold whitespace-nowrap ${selectedType === type
                    ? ''
                    : 'border-gray-200 bg-[#F3F4F6] text-gray-500'
                    }`}
                  style={selectedType === type ? {
                    borderColor: theme.colors.primary,
                    backgroundColor: theme.colors.primary,
                    color: feature === 'gpStore' ? 'white' : 'black',
                    flex: type === 'Others' ? '0 0 auto' : '1'
                  } : {
                    flex: type === 'Others' ? '0 0 auto' : '1'
                  }}
                >
                  {type}
                </button>
              ))}
              {/* Show custom name input inline when "Others" is selected */}
              {selectedType === 'Others' && (
                <input
                  type="text"
                  placeholder="Save as"
                  value={customTypeName}
                  onChange={(e) => {
                    setCustomTypeName(e.target.value);
                    // Update formData type with custom name or "Others" if empty
                    setFormData(prev => ({ 
                      ...prev, 
                      type: e.target.value.trim() || 'Others'
                    }));
                  }}
                  className="flex-1 min-w-[120px] py-2.5 px-3 rounded-2xl border-2 border-gray-200 bg-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ 
                    '--tw-ring-color': theme.colors.primary,
                    borderColor: customTypeName ? theme.colors.primary : '#e5e7eb'
                  } as React.CSSProperties}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = theme.colors.primary;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = customTypeName ? theme.colors.primary : '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Confirm Button */}
        <div className="mt-6 mb-24">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isValidatingLocation}
            className={`w-full py-4 rounded-[20px] font-medium transition-colors ${isSubmitting || isValidatingLocation
              ? 'bg-gray-400 cursor-not-allowed'
              : ''
              }`}
            style={isSubmitting || isValidatingLocation ? {} : {
              backgroundColor: theme.colors.primary,
              color: feature === 'gpStore' ? 'white' : 'black'
            }}
          >
            {isValidatingLocation ? 'Validating Location...' :
              isSubmitting ? 'Saving Address...' : 'Confirm Location And Proceed'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddEditAddress; 