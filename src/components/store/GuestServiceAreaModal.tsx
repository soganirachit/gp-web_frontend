import React, { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IoClose } from "react-icons/io5";
import {
  GUEST_SERVICE_CITIES,
  CityOption,
  notifyGuestTemporaryStoreUpdated,
  storeService,
  Store,
} from "../../services/store.service";

type Step = "cities" | "stores";

export interface GuestServiceAreaModalProps {
  open: boolean;
  onClose: () => void;
  /** Primary green from theme */
  primaryColor?: string;
}

/**
 * Logged-out users outside delivery coverage (or without location): pick a city, then a store.
 */
export const GuestServiceAreaModal: React.FC<GuestServiceAreaModalProps> = ({
  open,
  onClose,
  primaryColor = "#19411F",
}) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [step, setStep] = useState<Step>("cities");
  const [pickedCity, setPickedCity] = useState<CityOption | null>(null);
  const [cityStores, setCityStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep("cities");
    setPickedCity(null);
    setCityStores([]);
    setLoading(false);
    setError(null);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const finalizeStore = (storeId: number) => {
    storeService.setTemporaryStoreId(storeId);
    notifyGuestTemporaryStoreUpdated();
    handleClose();
    if (!pathname.startsWith("/gp-store")) {
      navigate("/gp-store", { replace: true });
    }
  };

  const onCityPick = async (city: CityOption) => {
    setPickedCity(city);
    setLoading(true);
    setError(null);
    try {
      const stores = await storeService.getStoresInCity(city.name);
      if (stores.length === 0) {
        setError(`No active store found in ${city.name} right now. Try another city.`);
        setLoading(false);
        return;
      }
      if (stores.length === 1) {
        finalizeStore(stores[0].id);
        return;
      }
      setCityStores(stores);
      setStep("stores");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load stores.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-service-area-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl max-h-[min(90vh,560px)] flex flex-col">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 rounded-full p-2 text-gray-500 hover:bg-gray-100 z-10"
          aria-label="Close"
        >
          <IoClose className="text-2xl" />
        </button>

        <div className="px-5 pt-6 pb-2 shrink-0">
          <h2
            id="guest-service-area-title"
            className="text-lg font-semibold text-gray-900 pr-10"
          >
            {step === "cities"
              ? "We’re not in your area yet"
              : `Stores in ${pickedCity?.name ?? ""}`}
          </h2>
          {step === "cities" ? (
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              Coming soon to more cities. Until then, choose a city we serve to browse products
              and checkout.
            </p>
          ) : (
            <p className="mt-2 text-sm text-gray-600">
              Pick a store to see its catalogue.
            </p>
          )}
        </div>

        {error ? (
          <div className="mx-5 mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">
          {step === "cities" ? (
            <ul className="space-y-2 pt-1">
              {GUEST_SERVICE_CITIES.map((city) => (
                <li key={`${city.id}-${city.name}`}>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => onCityPick(city)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-800 hover:border-gray-300 hover:bg-white disabled:opacity-60"
                  >
                    <span className="block">{city.name}</span>
                    <span className="text-xs font-normal text-gray-500">{city.state}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2 pt-1">
              {cityStores.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => finalizeStore(s.id)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm hover:bg-gray-50 disabled:opacity-60"
                    style={{ borderColor: `${primaryColor}33` }}
                  >
                    <span className="font-medium text-gray-900">{s.name}</span>
                    {s.address ? (
                      <span className="mt-0.5 block text-xs text-gray-500 line-clamp-2">
                        {s.address}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {step === "stores" ? (
          <div className="border-t border-gray-100 px-5 py-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setStep("cities");
                setCityStores([]);
                setPickedCity(null);
                setError(null);
              }}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← Back to cities
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70">
            <div
              className="h-9 w-9 animate-spin rounded-full border-2 border-gray-200 border-t-transparent"
              style={{ borderTopColor: primaryColor }}
              aria-hidden
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};
