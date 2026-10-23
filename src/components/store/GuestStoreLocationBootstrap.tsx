import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  GP_OPEN_GUEST_AREA_MODAL_EVENT,
  type GuestAreaModalVariant,
  type GpOpenGuestAreaModalDetail,
} from "../../config/guestAreaModalCopy";
import { GuestServiceAreaModal } from "./GuestServiceAreaModal";

const GP_STORE_SHOPPING_PATHS =
  /^\/gp-store\/?$|^\/gp-store\/products|^\/gp-store\/product\/|^\/gp-store\/explore-more/;

const GP_DAILY_GUEST_SHOPPING_PATHS =
  /^\/gp-daily\/?$|^\/gp-daily\/Products|^\/gp-daily\/product\/|^\/gp-daily\/explore-more/i;

function isGuestShoppingPath(pathname: string): boolean {
  return (
    GP_STORE_SHOPPING_PATHS.test(pathname) ||
    GP_DAILY_GUEST_SHOPPING_PATHS.test(pathname)
  );
}

/**
 * Guest city / area modal. GPS auto-resolve lives in LocationSessionHost;
 * this host only displays the picker when that flow asks for a city.
 */
export const GuestStoreLocationBootstrap: React.FC = () => {
  const { pathname } = useLocation();
  const { isLoggedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<GuestAreaModalVariant>("outside_service");
  const [dismissible, setDismissible] = useState(false);
  const [redirectToAddressAfterPick, setRedirectToAddressAfterPick] =
    useState(false);
  useEffect(() => {
    if (isLoggedIn) {
      setOpen(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isGuestShoppingPath(pathname) && pathname !== "/home") {
      setOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    const onManualOpen = (ev: Event) => {
      const ce = ev as CustomEvent<GpOpenGuestAreaModalDetail>;
      const d = ce.detail;
      setVariant(d?.variant ?? "need_location");
      setDismissible(d?.dismissible !== false);
      setRedirectToAddressAfterPick(d?.redirectToAddressAfterPick === true);
      setOpen(true);
    };
    window.addEventListener(GP_OPEN_GUEST_AREA_MODAL_EVENT, onManualOpen);
    return () =>
      window.removeEventListener(GP_OPEN_GUEST_AREA_MODAL_EVENT, onManualOpen);
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <GuestServiceAreaModal
      open={open}
      onClose={handleClose}
      variant={variant}
      dismissible={dismissible}
      redirectToAddressAfterPick={redirectToAddressAfterPick}
    />
  );
};
