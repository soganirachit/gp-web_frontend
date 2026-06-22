import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { clearSessionImageCache } from "../../utils/sessionImageCache";
import {
  GUEST_STORE_UPDATED_EVENT,
  GPS_CATALOG_LOCATION_UPDATED_EVENT,
} from "../../services/store.service";

/** Clears in-memory image cache on route or store changes. */
export function SessionImageCacheManager() {
  const location = useLocation();

  useEffect(() => {
    clearSessionImageCache();
  }, [location.pathname]);

  useEffect(() => {
    const onStoreChange = () => clearSessionImageCache();
    window.addEventListener(GUEST_STORE_UPDATED_EVENT, onStoreChange);
    window.addEventListener(GPS_CATALOG_LOCATION_UPDATED_EVENT, onStoreChange);
    return () => {
      window.removeEventListener(GUEST_STORE_UPDATED_EVENT, onStoreChange);
      window.removeEventListener(
        GPS_CATALOG_LOCATION_UPDATED_EVENT,
        onStoreChange,
      );
    };
  }, []);

  return null;
}
