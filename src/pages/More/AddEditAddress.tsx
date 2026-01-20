import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { MdLocationOn, MdMyLocation } from 'react-icons/md';
import { addressService, Address } from '../../services/address.service';
import { toast } from 'react-hot-toast';
import { GoogleMap, Autocomplete } from '@react-google-maps/api';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';

import { customerService } from '../../services/getcustomer.service';

const AddEditAddress: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.pathname.includes('edit');
  const existingAddress = location.state?.address as Address | undefined;
  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded, loadError } = useGoogleMaps();
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedPosition, setSelectedPosition] = useState<{ lat: number, lng: number }>({
    lat: 20.5937,
    lng: 78.9629
  });

  const [formData, setFormData] = useState({
    completeAddress: '',
    floor: '',
    landmark: '',
    type: 'Home' as 'Home' | 'Work' | 'Others',
  });

  const [deliveryAddress, setDeliveryAddress] = useState('');

  const [selectedType, setSelectedType] = useState<'Home' | 'Work' | 'Others'>('Home');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingLocation, setIsValidatingLocation] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pincode, setPincode] = useState('');

  const [locationValidation, setLocationValidation] = useState<{
    isValid: boolean;
    message?: string;
  } | null>(null);

  useEffect(() => {
    if (isEdit && existingAddress) {
      const fullAddress = [
        existingAddress.houseNo,
        existingAddress.streetName,
        existingAddress.area
      ].filter(Boolean).join(', ');

      setFormData({
        completeAddress: fullAddress || '',
        floor: '',
        landmark: existingAddress.area || '',
        type: existingAddress.type || 'Home',
      });
      setSelectedType(existingAddress.type || 'Home');
      setDeliveryAddress(fullAddress || '');
      setPincode(existingAddress.pincode || '');
      // If editing, use the name/phone from the address record if available
      if (existingAddress.name) {
        setName(existingAddress.name);
      }
      if (existingAddress.associatedPhoneNumber) {
        setPhone(existingAddress.associatedPhoneNumber);
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
  }, []);

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

      const validation = await addressService.validateAddressInDeliveryArea(coordinates);
      setLocationValidation(validation);

      if (!validation.isValid) {
        toast.error(validation.message || 'Address is outside delivery area');
        return false;
      }

      toast.success('Address is within delivery area!');
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
      navigate(-1);
    } catch (error) {
      console.error('Failed to save address:', error);
      toast.error(isEdit ? 'Failed to update address' : 'Failed to add address');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              // Get formatted address from the first result
              if (data.results[0].formatted_address) {
                const fullAddress = data.results[0].formatted_address;
                setDeliveryAddress(fullAddress);

                // Extract components for completeAddress field
                const addressComponents: any = {};
                data.results.forEach((result: any) => {
                  if (result.address_components) {
                    result.address_components.forEach((component: any) => {
                      component.types.forEach((type: string) => {
                        if (type === 'street_number' && !addressComponents.houseNo) {
                          addressComponents.houseNo = component.long_name;
                        }
                        if (type === 'route' && !addressComponents.streetName) {
                          addressComponents.streetName = component.long_name;
                        }
                        if (type === 'sublocality_level_1' && !addressComponents.area) {
                          addressComponents.area = component.long_name;
                        }
                      });
                    });
                  }
                });

                // Build complete address string
                const completeAddr = [
                  addressComponents.houseNo,
                  addressComponents.streetName,
                  addressComponents.area
                ].filter(Boolean).join(', ');

                if (completeAddr) {
                  setFormData(prev => ({
                    ...prev,
                    completeAddress: completeAddr
                  }));
                  // Fix: use 'place' variable which is available in this scope?
                  // Actually 'place' variable is defined in the closure above in autocomplete logic?
                  // Wait, looking at the code structure...
                  // This is inside getCurrentLocation which calls Geocoding API.
                  // It returns 'data' which has results. It is NOT using 'place' object from Google Places API directly here.
                  // It uses 'data.results[0]'.

                  const result = data.results[0];
                  const pin = result.address_components?.find((c: any) => c.types.includes('postal_code'))?.long_name;
                  if (pin) setPincode(pin);
                }
              }
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
        // Clear previous validation when user moves the map
        setLocationValidation(null);
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
          className="bg-orange-500 text-white px-4 py-2 rounded-lg"
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBEB] px-4">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="py-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="hover:bg-gray-100 rounded-full p-2 transition-colors mr-3"
          >
            <IoArrowBack className="text-xl" />
          </button>
          <h1 className="text-xl font-semibold">
            Enter Address Details
          </h1>
        </div>

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

                    // Update delivery address and form data
                    const formattedAddress = place.formatted_address || '';
                    setDeliveryAddress(formattedAddress);
                    setSearchQuery(formattedAddress);

                    // Extract address components for completeAddress field
                    const addressComponents: any = {};
                    place.address_components?.forEach(component => {
                      component.types.forEach((type: string) => {
                        if (type === 'street_number' && !addressComponents.houseNo) {
                          addressComponents.houseNo = component.long_name;
                        }
                        if (type === 'route' && !addressComponents.streetName) {
                          addressComponents.streetName = component.long_name;
                        }
                        if ((type === 'sublocality_level_1' || type === 'sublocality') && !addressComponents.area) {
                          addressComponents.area = component.long_name;
                        }
                      });
                    });

                    // Build complete address string
                    const completeAddr = [
                      addressComponents.houseNo,
                      addressComponents.streetName,
                      addressComponents.area
                    ].filter(Boolean).join(', ');

                    if (completeAddr) {
                      setFormData(prev => ({
                        ...prev,
                        completeAddress: completeAddr
                      }));

                      // Set pincode from autocomplete
                      const pin = place.address_components?.find(c => c.types.includes('postal_code'))?.long_name;
                      if (pin) setPincode(pin);
                    }
                  }
                }}
                fields={['address_components', 'geometry', 'formatted_address']}
              >
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search anything...."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-3 pl-4 pr-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-md"
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
              disableDefaultUI: true
            }}
          />
          {/* Fixed Marker - Black */}
          <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
            <MdLocationOn className="text-black text-5xl drop-shadow-lg" />
          </div>
          {/* Locate Me Button - At the bottom */}
          <button
            onClick={getCurrentLocation}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-sm hover:bg-gray-50 z-20"
          >
            <MdMyLocation className="h-4 w-4" />
            <span>Locate Me</span>
          </button>
          {/* Paper airplane icon button (top right) */}
          <button
            onClick={getCurrentLocation}
            className="absolute top-3 right-3 bg-white rounded-full p-2 shadow-md hover:bg-gray-50 z-10"
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

        {/* Delivering to Section */}
        {deliveryAddress && (
          <div className="mb-4">
            <p className="text-gray-600 text-sm mb-1">Delivering to</p>
            <p className="text-gray-800 font-medium">{deliveryAddress}</p>
          </div>
        )}

        {/* Form Fields - Updated Layout */}
        <div className="space-y-4">

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
              className="w-full p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[#FFFBF7]"
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
              className="w-full p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[#FFFBF7]"
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
              className="w-full p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[#FFFBF7]"
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
              className="w-full p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[#FFFBF7]"
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
              className="w-full p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[#FFFBF7]"
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
              className="w-full p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-[#FFFBF7]"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-3 text-sm font-bold">
              Tag this location Type
            </label>
            <div className="flex gap-3 w-2/3">
              {['Home', 'Work', 'Others'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedType(type as 'Home' | 'Work' | 'Others');
                    setFormData(prev => ({ ...prev, type: type as 'Home' | 'Work' | 'Others' }));
                  }}
                  className={`flex-1 py-2.5 px-2 rounded-2xl border-2 transition-colors text-sm font-semibold whitespace-nowrap ${selectedType === type
                    ? 'border-[#FAA222] bg-[#FAA222] text-gray-800'
                    : 'border-gray-200 bg-[#F3F4F6] text-gray-500'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Confirm Button */}
        <div className="mt-6 mb-24">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isValidatingLocation}
            className={`w-full py-4 rounded-[20px] font-medium transition-colors ${isSubmitting || isValidatingLocation
              ? 'bg-gray-400 text-grey-700 cursor-not-allowed'
              : 'bg-[#FAA222] hover:bg-[#DD7600] text-grey-500'
              }`}
          >
            {isValidatingLocation ? 'Validating Location...' :
              isSubmitting ? 'Saving Address...' : 'Cofirm Location And Proceed'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddEditAddress; 