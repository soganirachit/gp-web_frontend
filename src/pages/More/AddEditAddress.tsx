import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { MdLocationOn, MdMyLocation } from 'react-icons/md';
import { addressService, Address } from '../../services/address.service';
import { toast } from 'react-hot-toast';
import { GoogleMap } from '@react-google-maps/api';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';

const AddEditAddress: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.pathname.includes('edit');
  const existingAddress = location.state?.address as Address | undefined;
  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded, loadError } = useGoogleMaps();

  const [selectedPosition, setSelectedPosition] = useState<{lat: number, lng: number}>({
    lat: 20.5937,
    lng: 78.9629
  });

  const [formData, setFormData] = useState({
    houseNo: '',
    streetName: '',
    landmark: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    phoneNumber: '',
    type: 'Home' as 'Home' | 'Work' | 'Others'
  });

  const [selectedType, setSelectedType] = useState<'Home' | 'Work' | 'Others'>('Home');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit && existingAddress) {
      setFormData({
        houseNo: existingAddress.houseNo || '',
        streetName: existingAddress.streetName || '',
        landmark: existingAddress.landmark || '',
        area: existingAddress.area || '',
        city: existingAddress.city || '',
        state: existingAddress.state || '',
        pincode: existingAddress.pincode || '',
        phoneNumber: existingAddress.phoneNumber || '',
        type: existingAddress.type || 'Home'
      });
      setSelectedType(existingAddress.type || 'Home');
    }
    getCurrentLocation();
  }, [isEdit, existingAddress]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const validateForm = () => {
    const requiredFields = ['houseNo', 'streetName'];
    const emptyFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (emptyFields.length > 0) {
      toast.error(`Please fill in all required fields`);
      return false;
    }

    if (formData.phoneNumber && !/^\d{10}$/.test(formData.phoneNumber)) {
      toast.error('Please enter a valid 10-digit phone number');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const addressData = {
        ...formData,
        type: selectedType,
        coordinates: `${selectedPosition.lat},${selectedPosition.lng}`
      };

      if (isEdit && existingAddress?.id) {
        await addressService.updateAddress(existingAddress.id, addressData);
        toast.success('Address updated successfully');
      } else {
        await addressService.createAddress(addressData);
        toast.success('Address added successfully');
      }
      navigate('/addresses');
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
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();
            
            if (data.results && data.results[0]) {
              const addressComponents = data.results[0].address_components;
              const formattedAddress: any = {};
              
              addressComponents.forEach((component: any) => {
                const type = component.types[0];
                if (type === 'street_number') formattedAddress.houseNo = component.long_name;
                if (type === 'route') formattedAddress.streetName = component.long_name;
                if (type === 'sublocality_level_1') formattedAddress.area = component.long_name;
                if (type === 'locality') formattedAddress.city = component.long_name;
                if (type === 'administrative_area_level_1') formattedAddress.state = component.long_name;
                if (type === 'postal_code') formattedAddress.pincode = component.long_name;
              });

              setFormData(prev => ({
                ...prev,
                ...formattedAddress
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
        <div className="py-4 md:p-6 flex items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold mb-2">
              <span className="flex items-center">
                <button onClick={() => navigate(-1)} className="hover:bg-gray-100 rounded-full p-2 transition-colors mr-2 md:mr-4">
                  <IoArrowBack className="text-xl md:text-2xl" />
                </button>
                Edit/Add Address
              </span>
            </h1>
            <p className="text-gray-600 mb-4 md:mb-6 ml-10 md:ml-9 text-sm md:text-base">Where should we deliver your flowers?</p>
          </div>
        </div>

        {/* Map Section */}
        <div className="w-full h-[200px] md:h-[300px] relative rounded-lg overflow-hidden mb-4 md:mb-6">
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
          <button
            onClick={getCurrentLocation}
            className="absolute bottom-2 md:bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-gray-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm flex items-center gap-1 md:gap-2 shadow-sm hover:bg-gray-50"
          >
            <MdMyLocation className="text-orange-500 h-3 w-3 md:h-4 md:w-4" />
            <span>Use current location</span>
          </button>
          {/* Fixed Marker */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
            <MdLocationOn className="text-orange-500 text-4xl md:text-5xl drop-shadow-lg animate-bounce" />
          </div>
        </div>

        {/* Complete Address Section */}
        <div className="space-y-4 md:space-y-6">
          <div>
            <h3 className="text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Complete Address</h3>
            <input
              type="text"
              placeholder="House/Flat no"
              value={formData.houseNo}
              onChange={(e) => setFormData({ ...formData, houseNo: e.target.value })}
              className="w-full p-2 md:p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm md:text-base"
            />
          </div>

          <input
            type="text"
            placeholder="Street Name, Area"
            value={formData.streetName}
            onChange={(e) => setFormData({ ...formData, streetName: e.target.value })}
            className="w-full p-2 md:p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm md:text-base"
          />

          <div>
            <h3 className="text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Directions/Landmark</h3>
            <input
              type="text"
              placeholder="Nearby landmark for easy location"
              value={formData.landmark}
              onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
              className="w-full p-2 md:p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-sm md:text-base"
            />
          </div>

          <div>
            <h3 className="text-gray-700 mb-1 md:mb-2 text-sm md:text-base">Receiver's Phone (Optional)</h3>
            <div className="flex">
              <span className="bg-white border border-gray-200 rounded-lg px-3 py-2 md:py-3 text-gray-500 text-sm md:text-base">+91</span>
              <input
                type="tel"
                placeholder="Enter your WhatsApp number"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="flex-1 p-2 md:p-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 ml-2 text-sm md:text-base"
              />
            </div>
          </div>

          {/* Address Type Selection */}
          <div className="flex gap-3">
            {['Home', 'Work', 'Others'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type as 'Home' | 'Work' | 'Others')}
                className={`flex-1 py-2 px-4 rounded-full border transition-colors ${
                  selectedType === type
                    ? 'border-orange-500 text-orange-500'
                    : 'border-gray-300 text-gray-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Confirm Button */}
        <div className="mt-6 md:mb-9">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full py-4 rounded-full font-medium transition-colors ${
              isSubmitting
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddEditAddress; 