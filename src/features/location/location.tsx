/**
 * Legacy location picker (AutocompleteService + custom list). The app router
 * lazy-loads `Home_page_location.tsx` instead — prefer extending that screen.
 * Kept for reference / deep links until confirmed unused (rg for imports).
 */
import React, { useState, KeyboardEvent, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { MdMyLocation, MdSearch } from 'react-icons/md';
import { toast } from 'react-hot-toast';
import {
  LocationFinderSkeleton,
  MapPanelSkeleton,
} from '../../components/common/PageSkeletons';

// Google Maps API key from environment variables (Vite syntax)
const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Define libraries as a constant to prevent reloading
const libraries: ("places")[] = ["places"];

// Type definition for geographical coordinates
interface Position {
  lat: number;
  lng: number;
}

const Location: React.FC = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: key,
    libraries,
  });

  const [location, setLocation] = useState<string>('');
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [selectedPredictionIndex, setSelectedPredictionIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default center position (India)
  const defaultCenter: Position = {
    lat: 20.5937,
    lng: 78.9629
  };

  useEffect(() => {
    if (isLoaded) {
      getCurrentLocation();
    }
  }, [isLoaded]);

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '12px'
  };

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: true,
    scaleControl: true,
    streetViewControl: true,
    rotateControl: true,
    fullscreenControl: true
  };

  // Handle keyboard navigation in search results
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (predictions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedPredictionIndex(prev => 
        prev < predictions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedPredictionIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter' && selectedPredictionIndex >= 0) {
      e.preventDefault();
      handlePredictionSelect(predictions[selectedPredictionIndex]);
    }
  };

  const handleLocationSearch = async (input: string) => {
    if (!isLoaded) return;
    
    setLocation(input);
    setSelectedPredictionIndex(-1);
    if (input.length > 2) {
      const service = new google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        { 
          input,
          componentRestrictions: { country: 'IN' } // Restrict to India
        },
        (predictions: google.maps.places.AutocompletePrediction[] | null) => {
          setPredictions(predictions || []);
        }
      );
    } else {
      setPredictions([]);
    }
  };

  const handlePredictionSelect = async (prediction: google.maps.places.AutocompletePrediction) => {
    if (!isLoaded) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ placeId: prediction.place_id }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location) {
        const newPosition = {
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng()
        };
        setSelectedPosition(newPosition);
        setLocation(prediction.description);
        map?.panTo(newPosition);
        setPredictions([]);
        setSelectedPredictionIndex(-1);
      }
    });
  };

  const getCurrentLocation = () => {
    setIsLoading(true);
    setError(null);

    if (navigator.geolocation) {
      const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setSelectedPosition(pos);
          map?.panTo(pos);

          if (isLoaded) {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: pos }, (results, status) => {
              if (status === 'OK' && results?.[0]) {
                setLocation(results[0].formatted_address);
              }
            });
          }
          setIsLoading(false);
        },
        (error) => {
          console.error('Error getting current location:', error);
          let errorMessage = 'Failed to get current location.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Please allow location access to use this feature.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
          }
          setError(errorMessage);
          toast.error(errorMessage);
          setIsLoading(false);
        },
        options
      );
    } else {
      const errorMessage = 'Geolocation is not supported by your browser';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!isLoaded || !e.latLng) return;

    const clickedPos = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng()
    };
    setSelectedPosition(clickedPos);

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: clickedPos }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        setLocation(results[0].formatted_address);
      }
    });
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-red-500">Error loading Google Maps: {loadError.message}</div>
      </div>
    );
  }

  if (!isLoaded) {
    return <LocationFinderSkeleton />;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Find Your Location</h1>
          
          {/* Search Bar */}
          <div className="mb-6 relative">
            <div className="flex items-center">
              <input
                type="text"
                value={location}
                onChange={(e) => handleLocationSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full rounded-xl border border-[#808080] bg-transparent px-4 py-3 pr-20 text-left text-gray-900 placeholder:text-[#808080] focus:border-[#808080] focus:outline-none focus:ring-2"
                placeholder="Search for your location"
              />
              <button
                onClick={getCurrentLocation}
                className="absolute right-12 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full"
                aria-label="Locate me"
              >
                <MdMyLocation className="text-gray-500 text-xl" />
              </button>
              <button
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full"
                aria-label="Search location"
              >
                <MdSearch className="text-xl text-[#808080]" />
              </button>
            </div>

            {/* Predictions dropdown */}
            {predictions.length > 0 && (
              <div className="absolute w-full mt-1 bg-white rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                {predictions.map((prediction, index) => (
                  <div
                    key={prediction.place_id}
                    className={`px-4 py-2 cursor-pointer ${
                      index === selectedPredictionIndex ? 'bg-gray-100' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handlePredictionSelect(prediction)}
                  >
                    {prediction.description}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coordinates Display */}
          {selectedPosition && (
            <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold mb-2">Selected Location Coordinates</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Latitude</p>
                  <p className="font-mono">{selectedPosition.lat.toFixed(6)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Longitude</p>
                  <p className="font-mono">{selectedPosition.lng.toFixed(6)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="h-[400px] bg-gray-100 rounded-lg overflow-hidden">
              <MapPanelSkeleton className="h-full min-h-[400px]" />
            </div>
          ) : error ? (
            <div className="h-[400px] bg-gray-100 rounded-lg flex items-center justify-center text-red-500 p-4 text-center">
              {error}
              <button
                onClick={getCurrentLocation}
                className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Try Again
              </button>
            </div>
          ) : (
            /* Map */
            <div className="rounded-lg overflow-hidden shadow-lg relative">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={selectedPosition || defaultCenter}
                zoom={13}
                onClick={handleMapClick}
                onLoad={setMap}
                options={mapOptions}
              >
                {selectedPosition && (
                  <Marker
                    position={selectedPosition}
                    animation={google.maps.Animation.DROP}
                  />
                )}
              </GoogleMap>
              <button
                onClick={getCurrentLocation}
                className="absolute top-4 right-4 flex items-center gap-1.5 bg-white px-3 py-2 rounded-full shadow-md hover:bg-gray-100 text-sm font-medium text-gray-800"
                aria-label="Locate me"
                title="Locate me"
              >
                <MdMyLocation className="text-gray-700 text-xl shrink-0" />
                <span>Locate me</span>
              </button>
            </div>
          )}

          {/* Confirm Button */}
          {selectedPosition && !isLoading && (
            <div className="mt-6">
              <button 
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-300"
                onClick={() => {
                  // Handle location confirmation here
                  console.log('Selected location:', {
                    address: location,
                    coordinates: selectedPosition
                  });
                }}
              >
                Confirm Location
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Location;
