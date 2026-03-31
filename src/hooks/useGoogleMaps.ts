import { useLoadScript, type Libraries } from '@react-google-maps/api';
import { useEffect, useState } from 'react';

const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

export const useGoogleMaps = () => {
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [isApiAvailable, setIsApiAvailable] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Prevent analytics and CSP errors
  useEffect(() => {
    // Block analytics requests that trigger ad blockers
    const script = document.createElement('script');
    script.textContent = `
      window.__GOOGLE_MAPS_ANALYTICS__ = false;
      window.__GOOGLE_MAPS_EXPERIMENTS__ = false;
    `;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
    version: 'weekly',
    preventGoogleFontsLoading: true,
    // Add parameters to prevent analytics
    language: 'en',
    region: 'IN',
    // Add channel parameter for debugging
    channel: 'app'
  });

  // Check API availability
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setApiError('API key is missing');
      setIsApiAvailable(false);
      return;
    }

    const checkApiAvailability = () => {
      try {
        if (window.google?.maps) {
          setIsApiAvailable(true);
          setApiError(null);
        } else if (isLoaded) {
          setIsApiAvailable(true);
          setApiError(null);
        } else if (loadError) {
          // Don't set error for ad blocker related issues
          if (!loadError.toString().includes('ERR_BLOCKED_BY_CLIENT')) {
            setApiError(loadError.toString());
          }
          setIsApiAvailable(false);
        }
      } catch (err) {
        const error = err as Error;
        if (!error.toString().includes('ERR_BLOCKED_BY_CLIENT')) {
          setApiError(error.message);
        }
        setIsApiAvailable(false);
      }
    };

    checkApiAvailability();
  }, [GOOGLE_MAPS_API_KEY, isLoaded, loadError]);

  return {
    isLoaded: isLoaded && isApiAvailable && !apiError,
    loadError: apiError || loadError,
    GOOGLE_MAPS_API_KEY,
    isApiAvailable
  };
};

export default useGoogleMaps; 