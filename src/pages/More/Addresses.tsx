import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPen, FaTrash } from 'react-icons/fa';
import { addressService, type Address } from '../../services/address.service';
import { SettingsListSkeleton } from '../../components/common/PageSkeletons';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

// Import SVG icons
import homeIcon from '../../assets/svg/adressbook/home.svg';
import workIcon from '../../assets/svg/adressbook/office.svg';
import othersIcon from '../../assets/svg/adressbook/others.svg';
import defaultIcon from '../../assets/svg/adressbook/default.svg';
import { useFeatureTheme } from '../../context/FeatureThemeContext';
import { UniformPageHeader } from '../../components/layout/UniformPageHeader';
import { formatPhoneForDisplay } from '../../utils/phoneDisplay';
import { formatCartDeliveryAddress } from '../../utils/formatCartDeliveryAddress';
import { storeService } from '../../services/store.service';

const Addresses: React.FC = () => {
  const navigate = useNavigate();
  const { theme, feature } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [catalogPinId, setCatalogPinId] = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  const loadAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await addressService.getAllAddresses();
      setAddresses(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load addresses');
      if (err.message?.includes('login')) {
        navigate(`${basePath}/login`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [navigate]);

  useEffect(() => {
    if (feature !== 'gpStore') {
      setCatalogPinId(null);
      return;
    }
    setCatalogPinId(storeService.getGpStoreCatalogAddressOverrideId());
  }, [feature, addresses]);

  const handleEdit = (address: Address) => {
    navigate(`${basePath}/addresses/edit`, { state: { address } });
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      setActionInProgress(true);
      await addressService.deleteAddress(deleteId);
      setAddresses(addresses.filter(a => a.id !== deleteId));
      setDeleteId(null);
    } catch (error: any) {
      // Error handling
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      setActionInProgress(true);
      setError(null);
      await addressService.setDefaultAddress(addressId);
      await loadAddresses();
    } catch (error: any) {
      setError(error.message || 'Failed to set default address');
      if (error.message.includes('login')) {
        navigate(`${basePath}/login`, { state: { returnUrl: location.pathname } });
      }
    } finally {
      setActionInProgress(false);
    }
  };

  const AddressMap: React.FC<{ coordinates: string }> = ({ coordinates }) => {
    const [lat, lng] = coordinates.split(',').map(Number);

    if (!isLoaded) return <div className="w-full h-full bg-gray-200 animate-pulse rounded-lg" />;

    return (
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
        center={{ lat, lng }}
        zoom={16}
        options={{
          disableDefaultUI: true,
          draggable: false,
          zoomControl: false,
          scrollwheel: false,
          disableDoubleClickZoom: true,
        }}
      >
        <Marker position={{ lat, lng }} />
      </GoogleMap>
    );
  };

  // Helper to get icon based on type
  const getTypeIcon = (type: string) => {
    const t = type?.toLowerCase();
    if (t === 'home') return homeIcon;
    if (t === 'work' || t === 'office') return workIcon;
    return othersIcon;
  };

  if (loading) {
    return <SettingsListSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom">
      <div className="max-w-[800px] mx-auto px-4">
        <UniformPageHeader
          title="My Addresses"
          onBack={() => navigate(`${basePath}/account`)}
          padXClassName="px-4"
          padYClassName="pt-6 pb-4"
          className="-mx-4 sticky top-0 z-10 mb-2"
        />

        {/* Main Content */}
        <div>
          {error && !error.includes('login') ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={loadAddresses}
                  className="font-medium hover:underline"
                  style={{ color: theme.colors.primary }}
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No addresses found</p>
                  <button
                    onClick={() => navigate(`${basePath}/addresses/add`)}
                    className="font-medium hover:underline"
                    style={{ color: theme.colors.primary }}
                  >
                    Add your first address
                  </button>
                </div>
              ) : (
                <div className="space-y-4 mb-4">
                  {addresses.map((address) => {
                    const icon = getTypeIcon(address.type);
                    // Use green background for Home, Others, and all custom types (anything that's not Work)
                    const addressTypeLower = address.type?.toLowerCase() || '';
                    const isGreenBg = addressTypeLower !== 'work' && addressTypeLower !== 'office';
                    const iconBgClass = isGreenBg ? 'bg-[#ECFDF5]' : 'bg-[#EEF2FF]';

                    const isCatalogPinned =
                      feature === 'gpStore' &&
                      catalogPinId != null &&
                      String(address.id) === String(catalogPinId);

                    return (
                      <div
                        key={address.id}
                        className="bg-white rounded-3xl p-5 shadow-sm"
                      >
                        <div className="flex justify-between items-start gap-3">

                          {/* Left Details Section */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-10 h-10 rounded-full ${iconBgClass} flex items-center justify-center flex-shrink-0`}>
                                <img src={icon} alt={address.type} className="w-5 h-5" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-800 capitalize">
                                {address.type || 'Others'}
                              </h3>
                            </div>

                            <p className="text-gray-500 text-sm leading-relaxed mb-1 pr-2 break-words line-clamp-2 [overflow-wrap:anywhere]">
                              {formatCartDeliveryAddress({
                                houseNo: address.houseNo,
                                streetName: address.streetName,
                                area: address.area,
                                landmark: address.landmark,
                                city: address.city,
                                state: address.state,
                                pincode: address.pincode,
                              })}
                            </p>

                            <div className="mb-4 flex min-w-0 flex-wrap items-center gap-2">
                              {(() => {
                                const digits = formatPhoneForDisplay(
                                  address.associatedPhoneNumber,
                                ).replace(/\D/g, '');
                                const last10 =
                                  digits.length >= 10 ? digits.slice(-10) : '';
                                const hasPhone = last10.length === 10;
                                if (!hasPhone && !isCatalogPinned) return null;
                                return (
                                  <>
                                    {hasPhone ? (
                                      <p className="min-w-0 shrink text-sm font-normal text-gray-800">
                                        +91 {last10.slice(0, 5)} {last10.slice(5)}
                                      </p>
                                    ) : null}
                                    {/* {isCatalogPinned ? (
                                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                                        <span className="rounded-2xl bg-[#E6F4EA] px-2 py-1 text-xs font-semibold text-[#1E8E3E]">
                                          Active
                                        </span>
                                      </div>
                                    ) : null} */}
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          {address.coordinates && (
                            <div className="w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                              <AddressMap coordinates={address.coordinates} />
                            </div>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-gray-100 pt-3">
                          <button
                            type="button"
                            onClick={() => handleEdit(address)}
                            className="flex items-center gap-1.5 text-[#00A082] font-semibold text-sm hover:opacity-80 disabled:opacity-50"
                            disabled={actionInProgress}
                          >
                            <FaPen className="text-xs" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteClick(address.id)}
                            className="flex items-center gap-1.5 text-[#FF3B30] font-semibold text-sm hover:opacity-80 disabled:opacity-50"
                            disabled={actionInProgress}
                          >
                            <FaTrash className="text-xs" />
                            Delete
                          </button>

                          {!address.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(address.id)}
                              disabled={actionInProgress}
                              className="flex items-center gap-1.5 text-[#3B82F6] font-semibold text-sm hover:opacity-80 disabled:opacity-50"
                            >
                              <img src={defaultIcon} alt="" className="w-5 h-5" />
                              Set as Default
                            </button>
                          )}

                          {address.isDefault ? (
                            <span className="inline-flex items-center rounded-2xl bg-[#E6F4EA] px-2 py-1 text-xs font-semibold text-[#1E8E3E]">
                              Default
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add New Address Button */}
              <button
                onClick={() => navigate(`${basePath}/addresses/add`)}
                disabled={actionInProgress}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[20px] text-base font-semibold hover:opacity-90 disabled:opacity-50 mb-8 shadow-sm"
                style={{ 
                  backgroundColor: theme.colors.primary,
                  color: feature === 'gpStore' ? 'white' : 'black'
                }}
              >
                <span className="text-lg sm:text-xl font-light">+</span>
                <span className="hidden xs:inline">Add New Address</span>
                <span className="xs:hidden">Add Address</span>
              </button>
            </>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
                Confirm Delete
              </h3>
              <p className="text-gray-500 text-center mb-6">
                Are you sure you want to delete this address?
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleDeleteConfirm}
                  className="w-full py-3.5 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors"
                >
                  Delete Address
                </button>
                <button
                  onClick={() => setDeleteId(null)}
                  className="w-full py-3.5 bg-gray-50 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
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

export default Addresses;