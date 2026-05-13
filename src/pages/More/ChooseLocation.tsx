import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaPen, FaTrash } from "react-icons/fa";
import { MdMyLocation } from "react-icons/md";
import { toast } from "react-hot-toast";
import { addressService, type Address } from "../../services/address.service";
import { SettingsListSkeleton } from "../../components/common/PageSkeletons";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { useFeatureTheme } from "../../context/FeatureThemeContext";
import { UniformPageHeader } from "../../components/layout/UniformPageHeader";
import { formatPhoneForDisplay } from "../../utils/phoneDisplay";
import homeIcon from "../../assets/svg/adressbook/home.svg";
import workIcon from "../../assets/svg/adressbook/office.svg";
import othersIcon from "../../assets/svg/adressbook/others.svg";
import defaultIcon from "../../assets/svg/adressbook/default.svg";
import {
  storeService,
  notifyGpsCatalogLocationUpdated,
} from "../../services/store.service";

const ChooseLocation: React.FC = () => {
  const navigate = useNavigate();
  const { theme, feature } = useFeatureTheme();
  const basePath = feature === "gpStore" ? "/gp-store" : "/gp-daily";
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [applyInProgress, setApplyInProgress] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [browseOverrideId, setBrowseOverrideId] = useState<string | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await addressService.getAllAddresses();
      setAddresses(data);
      setBrowseOverrideId(storeService.getGpStoreCatalogAddressOverrideId());
    } catch (err: unknown) {
      const m =
        err instanceof Error ? err.message : "Failed to load addresses";
      setError(m);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const AddressMap: React.FC<{ coordinates: string }> = ({ coordinates }) => {
    const parts = coordinates.split(",").map((s) => parseFloat(s.trim()));
    const lat = parts[0];
    const lng = parts[1];
    if (!isLoaded || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return (
        <div className="h-full w-full animate-pulse rounded-lg bg-gray-200" />
      );
    }
    return (
      <GoogleMap
        mapContainerStyle={{
          width: "100%",
          height: "100%",
          borderRadius: "0.5rem",
        }}
        center={{ lat, lng }}
        zoom={15}
        options={{
          disableDefaultUI: true,
          draggable: false,
          zoomControl: false,
          scrollwheel: false,
          disableDoubleClickZoom: true,
        }}
      />
    );
  };

  const getTypeIcon = (type: string) => {
    const t = type?.toLowerCase();
    if (t === "home") return homeIcon;
    if (t === "work" || t === "office") return workIcon;
    return othersIcon;
  };

  const handleSelectAddress = async (address: Address) => {
    if (applyInProgress) return;
    try {
      setApplyInProgress(true);
      await storeService.applyBrowseAddressForCatalog(address);
      toast.success("Delivery location updated");
      navigate(-1);
    } catch (e: unknown) {
      const m =
        e instanceof Error
          ? e.message
          : "Could not update location. Try again.";
      toast.error(m, { id: m });
    } finally {
      setApplyInProgress(false);
    }
  };

  const handleUseCurrentGps = async () => {
    if (gpsBusy) return;
    setGpsBusy(true);
    try {
      await storeService.applyUseCurrentGpsForCatalog();
      toast.success("Using your current location for the store");
      setBrowseOverrideId(null);
      navigate(-1);
    } catch (e: unknown) {
      const m =
        e instanceof Error
          ? e.message
          : "Could not use current location";
      toast.error(m, { id: m });
    } finally {
      setGpsBusy(false);
    }
  };

  const handleEdit = (address: Address) => {
    navigate(`${basePath}/addresses/edit`, { state: { address } });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      setActionInProgress(true);
      await addressService.deleteAddress(deleteId);
      if (
        browseOverrideId != null &&
        String(browseOverrideId) === String(deleteId)
      ) {
        storeService.setGpStoreCatalogAddressOverrideId(null);
        notifyGpsCatalogLocationUpdated();
        setBrowseOverrideId(null);
      }
      setAddresses((prev) => prev.filter((a) => a.id !== deleteId));
      setDeleteId(null);
      toast.success("Address deleted");
    } catch {
      // silent
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      setActionInProgress(true);
      await addressService.setDefaultAddress(addressId);
      await load();
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : "Failed to set default";
      toast.error(m, { id: m });
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading) {
    return <SettingsListSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom">
      <div className="mx-auto max-w-[800px] px-4">
        <UniformPageHeader
          title="Choose location"
          onBack={() => navigate(-1)}
          padXClassName="px-4"
          padYClassName="pt-6 pb-4"
          className="-mx-4 sticky top-0 z-10 mb-2"
        />
        {error && (
          <p className="mb-3 text-center text-sm text-red-500">{error}</p>
        )}
        <div className="mb-3 space-y-4">
          {/* Current location (GPS) — no override = active, matches app browse mode */}
          <div
            className={`cursor-pointer rounded-3xl border-2 bg-white p-5 shadow-sm transition ${
              browseOverrideId == null
                ? "border-[#19411f] ring-1 ring-[#19411f]/20"
                : "border-transparent"
            }`}
            onClick={() => void handleUseCurrentGps()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void handleUseCurrentGps();
              }
            }}
            role="button"
            tabIndex={0}
            aria-disabled={gpsBusy}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <MdMyLocation className="text-[#19411f]" size={22} />
                  <h3 className="text-lg font-semibold text-gray-800">
                    Current location
                  </h3>
                  {browseOverrideId == null ? (
                    <span className="rounded-2xl bg-[#E6F4EA] px-2 py-0.5 text-xs font-semibold text-[#1E8E3E]">
                      Active
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-gray-500">
                  {gpsBusy
                    ? "Updating your location…"
                    : "We use your device location to pick the nearest store. Tap to refresh."}
                </p>
              </div>
            </div>
          </div>
        </div>
        {addresses.length === 0 ? (
          <div className="py-6 text-center">
            <p className="mb-3 text-gray-600">No saved addresses</p>
            <button
              type="button"
              onClick={() => navigate(`${basePath}/addresses/add`)}
              className="text-base font-semibold"
              style={{ color: theme.colors.primary }}
            >
              Add a delivery address
            </button>
          </div>
        ) : (
          <div className="mb-4 space-y-4">
            {addresses.map((address) => {
              const icon = getTypeIcon(address.type);
              const addressTypeLower = address.type?.toLowerCase() || "";
              const isGreenBg =
                addressTypeLower !== "work" && addressTypeLower !== "office";
              const iconBgClass = isGreenBg ? "bg-[#ECFDF5]" : "bg-[#EEF2FF]";
              const isSelected =
                browseOverrideId != null &&
                String(address.id) === String(browseOverrideId);
              return (
                <div
                  key={address.id}
                  className={`rounded-3xl bg-white p-5 shadow-sm ${
                    isSelected
                      ? "ring-2 ring-[#19411f] ring-offset-0"
                      : ""
                  }`}
                >
                  <div
                    className="flex cursor-pointer items-start justify-between gap-3"
                    onClick={() => void handleSelectAddress(address)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void handleSelectAddress(address);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${iconBgClass}`}
                        >
                          <img
                            src={icon}
                            alt={address.type}
                            className="h-5 w-5"
                          />
                        </div>
                        <h3 className="text-lg font-semibold capitalize text-gray-800">
                          {address.type || "Others"}
                        </h3>
                        {address.isDefault ? (
                          <span className="rounded-2xl bg-[#E6F4EA] px-2 py-1 text-xs font-semibold text-[#1E8E3E]">
                            Default
                          </span>
                        ) : null}
                        {isSelected ? (
                          <span className="rounded-2xl bg-[#E6F4EA] px-2 py-1 text-xs font-semibold text-[#1E8E3E]">
                            Pinned
                          </span>
                        ) : null}
                      </div>
                      <p className="line-clamp-2 pr-2 text-sm leading-relaxed break-words text-gray-500 [overflow-wrap:anywhere]">
                        {[
                          address.houseNo,
                          address.streetName,
                          address.area,
                          address.landmark,
                          address.city,
                          address.state,
                        ]
                          .filter(Boolean)
                          .join(", ")}{" "}
                        - {address.pincode}
                      </p>
                      <p className="font-base mt-1 mb-3 text-sm text-gray-800">
                        +91 {formatPhoneForDisplay(address.associatedPhoneNumber)}
                      </p>
                    </div>
                    {address.coordinates ? (
                      <div className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        <AddressMap coordinates={address.coordinates} />
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(address)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-[#00A082] hover:opacity-80 disabled:opacity-50"
                      disabled={actionInProgress}
                    >
                      <FaPen className="text-xs" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(address.id)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-[#FF3B30] hover:opacity-80 disabled:opacity-50"
                      disabled={actionInProgress}
                    >
                      <FaTrash className="text-xs" />
                      Delete
                    </button>
                    {!address.isDefault && (
                      <button
                        type="button"
                        onClick={() => void handleSetDefault(address.id)}
                        disabled={actionInProgress}
                        className="flex items-center gap-1.5 text-sm font-semibold text-[#3B82F6] hover:opacity-80 disabled:opacity-50"
                      >
                        <img
                          src={defaultIcon}
                          alt=""
                          className="h-5 w-5"
                        />
                        Set as Default
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate(`${basePath}/addresses/add`)}
          className="mb-8 flex w-full items-center justify-center gap-2 rounded-[20px] py-3.5 text-base font-semibold shadow-sm hover:opacity-90"
          style={{
            backgroundColor: theme.colors.primary,
            color: feature === "gpStore" ? "white" : "black",
          }}
        >
          <span className="text-lg font-light sm:text-xl">+</span>
          Add address
        </button>

        {deleteId && (
          <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="mb-2 text-center text-xl font-bold text-gray-900">
                Confirm Delete
              </h3>
              <p className="mb-6 text-center text-gray-500">
                Are you sure you want to delete this address?
              </p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => void handleDeleteConfirm()}
                  className="w-full rounded-xl bg-red-50 py-3.5 font-semibold text-red-600 transition hover:bg-red-100"
                >
                  Delete Address
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="w-full rounded-xl bg-gray-50 py-3.5 font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChooseLocation;
