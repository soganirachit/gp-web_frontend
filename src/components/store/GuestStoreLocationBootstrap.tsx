import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  GUEST_NEED_CITY_PICKER_CODE,
  storeService,
} from "../../services/store.service";
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
 * Logged-out users: on entering GP Store / GP Daily shopping routes, request browser location and
 * assign nearest store when in coverage; otherwise open the city picker (mandatory until a city is chosen).
 */
export const GuestStoreLocationBootstrap: React.FC = () => {
  const { pathname } = useLocation();
  const { isLoggedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<GuestAreaModalVariant>("outside_service");
  const [dismissible, setDismissible] = useState(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (isLoggedIn) {
      setOpen(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isGuestShoppingPath(pathname)) {
      setOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!isGuestShoppingPath(pathname) || isLoggedIn) return;
    if (storeService.getTemporaryStoreId()) return;
    if (inFlightRef.current) return;

    let cancelled = false;
    inFlightRef.current = true;

    void (async () => {
      try {
        await storeService.getStoreFromLocation();
        if (cancelled) return;
        if (!storeService.getStoreIdForProducts()) {
          setVariant("outside_service");
          setDismissible(false);
          setOpen(true);
        }
      } catch (e: unknown) {
        if (cancelled) return;
        const code =
          e && typeof e === "object" && "code" in e
            ? String((e as { code?: string }).code)
            : "";
        const msg = e instanceof Error ? e.message : "";
        const denied =
          msg.toLowerCase().includes("denied") ||
          msg.toLowerCase().includes("permission");
        if (denied || code !== GUEST_NEED_CITY_PICKER_CODE) {
          setVariant("need_location");
        } else {
          setVariant("outside_service");
        }
        setDismissible(false);
        setOpen(true);
      } finally {
        inFlightRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
      inFlightRef.current = false;
    };
  }, [pathname, isLoggedIn]);

  useEffect(() => {
    const onManualOpen = (ev: Event) => {
      const ce = ev as CustomEvent<GpOpenGuestAreaModalDetail>;
      const d = ce.detail;
      setVariant(d?.variant ?? "need_location");
      setDismissible(d?.dismissible !== false);
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
    />
  );
};
