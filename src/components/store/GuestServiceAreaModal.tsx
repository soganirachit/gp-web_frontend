import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { IoClose, IoLocationOutline } from "react-icons/io5";
import {
  CityOption,
  notifyGuestTemporaryStoreUpdated,
  storeService,
  Store,
} from "../../services/store.service";
import {
  GUEST_AREA_MODAL_TITLE,
  guestAreaSubtitleForVariant,
  type GuestAreaModalVariant,
} from "../../config/guestAreaModalCopy";
import { useFeatureTheme } from "../../context/FeatureThemeContext";
import { resolveGpDailyZoneAtLatLng } from "../../services/subscriptionZone.service";

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (full.length !== 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Random pick from `stores` — caller must pass only stores in the selected city. */
function pickRandomStore(stores: Store[]): Store | null {
  if (!stores.length) return null;
  return stores[Math.floor(Math.random() * stores.length)]!;
}

async function resolveDailyGuestStoreIdFromCityStores(
  stores: Store[],
): Promise<number | null> {
  const sorted = [...stores].sort((a, b) => a.name.localeCompare(b.name));
  for (const s of sorted) {
    const lat = parseFloat(String(s.latitude ?? ""));
    const lng = parseFloat(String(s.longitude ?? ""));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    try {
      const r = await resolveGpDailyZoneAtLatLng(lat, lng);
      if (r.eligible && r.storeId != null && r.storeId > 0) return r.storeId;
    } catch {
      /* try next store in city */
    }
  }
  return null;
}

export interface GuestServiceAreaModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional override; defaults to current feature theme primary. */
  primaryColor?: string;
  variant?: GuestAreaModalVariant;
  /** If false, overlay and close button do not dismiss (city pick still calls onClose). */
  dismissible?: boolean;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelVariants = {
  hidden: { opacity: 0, y: 36, scale: 0.92 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      damping: 22,
      stiffness: 320,
      mass: 0.85,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.96,
    transition: { duration: 0.18 },
  },
};

/**
 * Logged-out users outside delivery coverage (or without location): pick a city.
 * GP Store: a random online store in that city is assigned. GP Daily: prefer the
 * subscription zone store resolved from a store location in that city, then fall back
 * to a random store in the city.
 */
export const GuestServiceAreaModal: React.FC<GuestServiceAreaModalProps> = ({
  open,
  onClose,
  primaryColor: primaryColorProp,
  variant = "outside_service",
  dismissible = true,
}) => {
  const { theme, feature } = useFeatureTheme();
  const primary = primaryColorProp ?? theme.colors.primary;

  const chrome = useMemo(() => {
    const borderSoft = hexToRgba(primary, 0.22);
    const borderStrong = hexToRgba(primary, 0.45);
    const rowBg = hexToRgba(primary, 0.06);
    const rowHover = hexToRgba(primary, 0.1);
    return { borderSoft, borderStrong, rowBg, rowHover };
  }, [primary]);

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [apiCities, setApiCities] = useState<CityOption[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setApiCities([]);
    setCitiesLoading(false);
    setCitiesError(null);
    setLoading(false);
    setError(null);
  }, []);

  const loadCities = useCallback(async () => {
    setCitiesLoading(true);
    setCitiesError(null);
    try {
      const list = await storeService.getUniqueCitiesFromOnlineStores();
      setApiCities(list);
      if (list.length === 0) {
        setCitiesError("No cities available from stores right now.");
      }
    } catch (e: unknown) {
      setCitiesError(
        e instanceof Error ? e.message : "Failed to load cities. Try again.",
      );
      setApiCities([]);
    } finally {
      setCitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    void loadCities();
  }, [open, loadCities, reset]);

  const dismissFromChrome = () => {
    if (!dismissible) return;
    reset();
    onClose();
  };

  const completeWithStore = () => {
    reset();
    onClose();
  };

  const finalizeStore = (storeId: number) => {
    storeService.setTemporaryStoreId(storeId);
    notifyGuestTemporaryStoreUpdated();
    completeWithStore();
    if (feature === "gpDaily") {
      if (!pathname.startsWith("/gp-daily")) {
        navigate("/gp-daily", { replace: true });
      }
    } else if (!pathname.startsWith("/gp-store")) {
      navigate("/gp-store", { replace: true });
    }
  };

  const onCityPick = async (city: CityOption) => {
    setLoading(true);
    setError(null);
    try {
      const storesInCity = await storeService.getStoresInCity(city.name);
      if (storesInCity.length === 0) {
        setError(`No active store found in ${city.name} right now. Try another city.`);
        return;
      }
      let storeId: number | null = null;
      if (feature === "gpDaily") {
        storeId = await resolveDailyGuestStoreIdFromCityStores(storesInCity);
      }
      if (storeId == null) {
        const store = pickRandomStore(storesInCity);
        if (!store) {
          setError(`No active store found in ${city.name} right now. Try another city.`);
          return;
        }
        storeId = store.id;
      }
      finalizeStore(storeId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load stores.");
    } finally {
      setLoading(false);
    }
  };

  const primaryButtonHover =
    feature === "gpDaily"
      ? "hover:bg-[#DD7600]"
      : "hover:bg-[#1e4d1c]";

  const subtitle = guestAreaSubtitleForVariant(variant);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="guest-area-overlay"
          role="presentation"
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:bg-black/50 sm:p-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.22 }}
          onClick={dismissFromChrome}
        >
          <motion.div
            key="guest-area-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-service-area-title"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`relative flex max-h-[min(88dvh,720px)] w-full max-w-md flex-col overflow-hidden rounded-t-[22px] shadow-2xl ring-1 ring-black/5 sm:max-h-[min(85vh,640px)] sm:rounded-2xl ${theme.classes.authPageBackground}`}
            style={{
              borderTop: `4px solid ${primary}`,
              boxShadow: `0 24px 48px -12px ${hexToRgba(primary, 0.22)}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {dismissible ? (
              <button
                type="button"
                onClick={dismissFromChrome}
                className="absolute right-3 top-3 z-10 rounded-full p-2 text-gray-500 transition-colors hover:bg-black/5"
                style={{ color: primary }}
                aria-label="Close"
              >
                <IoClose className="text-2xl" />
              </button>
            ) : null}

            <div className="shrink-0 px-5 pb-1 pt-5 sm:pt-6">
              <div
                className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full sm:hidden"
                style={{ backgroundColor: hexToRgba(primary, 0.35) }}
                aria-hidden
              />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06, duration: 0.28 }}
                className="flex items-start gap-3"
              >
                <div
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: hexToRgba(primary, 0.12) }}
                  aria-hidden
                >
                  <IoLocationOutline className="h-5 w-5" style={{ color: primary }} />
                </div>
                <div className="min-w-0 flex-1 pr-2">
                  <h2
                    id="guest-service-area-title"
                    className="text-lg font-bold leading-snug text-gray-900 sm:text-xl"
                  >
                    {GUEST_AREA_MODAL_TITLE}
                  </h2>
                  <motion.p
                    className="mt-1.5 text-sm leading-relaxed text-gray-600"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.28 }}
                  >
                    {subtitle}
                  </motion.p>
                </div>
              </motion.div>
            </div>

            {citiesError ? (
              <motion.div
                className="mx-5 mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.25 }}
              >
                <p>{citiesError}</p>
                <button
                  type="button"
                  onClick={() => void loadCities()}
                  disabled={citiesLoading}
                  className={`mt-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${theme.classes.primaryButton} ${primaryButtonHover}`}
                >
                  Retry
                </button>
              </motion.div>
            ) : null}

            {error ? (
              <motion.div
                className="mx-5 mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-2">
              {citiesLoading ? (
                <motion.div
                  className="flex flex-col items-center justify-center gap-3 py-12"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, duration: 0.3 }}
                >
                  <div
                    className="h-9 w-9 animate-spin rounded-full border-2 border-gray-200 border-t-transparent"
                    style={{ borderTopColor: primary }}
                    aria-hidden
                  />
                  <p className="text-sm text-gray-600">Loading cities…</p>
                </motion.div>
              ) : (
                <ul className="space-y-2 pt-1">
                  {apiCities.map((city, index) => (
                    <motion.li
                      key={`${city.id}-${city.name}`}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.12 + Math.min(index * 0.042, 0.42),
                        duration: 0.32,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void onCityPick(city)}
                        className="w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-medium text-gray-900 transition-colors disabled:opacity-60"
                        style={{
                          backgroundColor: chrome.rowBg,
                          borderColor: chrome.borderSoft,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = chrome.rowHover;
                          e.currentTarget.style.borderColor = chrome.borderStrong;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = chrome.rowBg;
                          e.currentTarget.style.borderColor = chrome.borderSoft;
                        }}
                      >
                        <span className="block">{city.name}</span>
                        {city.state ? (
                          <span className="text-xs font-normal text-gray-500">
                            {city.state}
                          </span>
                        ) : null}
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>

            {loading ? (
              <motion.div
                className="absolute inset-0 flex items-center justify-center rounded-2xl backdrop-blur-[1px]"
                style={{ backgroundColor: hexToRgba("#fff", 0.75) }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div
                  className="h-9 w-9 animate-spin rounded-full border-2 border-gray-200 border-t-transparent"
                  style={{ borderTopColor: primary }}
                  aria-hidden
                />
              </motion.div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
