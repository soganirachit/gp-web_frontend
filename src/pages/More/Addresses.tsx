import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPen, FaTrash } from 'react-icons/fa';
import { IoArrowBack } from 'react-icons/io5';
import { BsCheckSquareFill } from 'react-icons/bs';
import { addressService, type Address } from '../../services/address.service';
import BottomNav from '../../components/layout/BottomNav';
import Spinner from '../../components/common/Spinner';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';

// Import SVG icons
import homeIcon from '../../assets/svg/adressbook/home.svg';
import workIcon from '../../assets/svg/adressbook/office.svg';
import othersIcon from '../../assets/svg/adressbook/others.svg';
import defaultIcon from '../../assets/svg/adressbook/default.svg';
import { useFeatureTheme } from '../../context/FeatureThemeContext';

const Addresses: React.FC = () => {
  const navigate = useNavigate();
  const { theme, feature } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  // Helper to get icon based on type
  const getTypeIcon = (type: string) => {
    const t = type?.toLowerCase();
    if (t === 'home') return homeIcon;
    if (t === 'work' || t === 'office') return workIcon;
    return othersIcon;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f6f1] flex items-center justify-center">
        <Spinner size={400} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6f1] px-4">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="py-4 flex items-center mb-2">
          <button
            onClick={() => navigate(-1)}
            className="hover:bg-gray-100 rounded-full p-2 transition-colors mr-3"
          >
            <IoArrowBack className="text-xl" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-800">My Address</h1>
        </div>

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
                <div className="space-y-4 mb-24">
                  {addresses.map((address) => {
                    const icon = getTypeIcon(address.type);
                    const isGreenBg = ['home', 'others'].includes(address.type?.toLowerCase());
                    const iconBgClass = isGreenBg ? 'bg-[#ECFDF5]' : 'bg-[#EEF2FF]';

                    return (
                      <div
                        key={address.id}
                        className="bg-white rounded-3xl p-5 shadow-sm"
                      >
                        <div className="flex justify-between items-start gap-3">

                          {/* Left Details Section */}
                          <div className="flex-1 min-w-0">
                            {/* Header: Icon + Type + Default Badge */}
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-10 h-10 rounded-full ${iconBgClass} flex items-center justify-center flex-shrink-0`}>
                                <img src={icon} alt={address.type} className="w-5 h-5" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-800 capitalize">
                                {address.type || 'Others'}
                              </h3>

                              {address.isDefault && (
                                <span className="bg-[#E6F4EA] text-[#1E8E3E] text-xs px-2 py-1 rounded-2xl font-semibold">
                                  Default
                                </span>
                              )}

                            </div>

                            {/* Address Text */}
                            <p className="text-gray-500 text-sm leading-relaxed mb-1 pr-2 break-words">
                              {[
                                address.houseNo,
                                address.streetName,
                                address.area,
                                address.landmark,
                                address.city,
                                address.state
                              ].filter(Boolean).join(', ')} - {address.pincode}
                            </p>

                            {/* Phone Text */}
                            <p className="text-gray-800 font-base text-sm mb-4">
                              +91 {address.associatedPhoneNumber}
                            </p>
                          </div>

                          {/* Right Map Section */}
                          {address.coordinates && (
                            <div className="w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                              <AddressMap coordinates={address.coordinates} />
                            </div>
                          )}
                        </div>

                        {/* Action Buttons Row */}
                        <div className="flex items-center gap-6 mt-2">
                          <button
                            onClick={() => handleEdit(address)}
                            className="flex items-center gap-1.5 text-[#00A082] font-semibold text-sm hover:opacity-80 disabled:opacity-50"
                            disabled={actionInProgress}
                          >
                            <FaPen className="text-xs" />
                            Edit
                          </button>

                          <button
                            onClick={() => handleDeleteClick(address.id)}
                            className="flex items-center gap-1.5 text-[#FF3B30] font-semibold text-sm hover:opacity-80 disabled:opacity-50"
                            disabled={actionInProgress}
                          >
                            <FaTrash className="text-xs" />
                            Delete
                          </button>

                          {!address.isDefault && (
                            <button
                              onClick={() => handleSetDefault(address.id)}
                              disabled={actionInProgress}
                              className="flex items-center gap-1.5 text-[#3B82F6] font-semibold text-sm hover:opacity-80 disabled:opacity-50"
                            >
                              <img src={defaultIcon} alt="default" className="w-5 h-5" />
                              Set as Default
                            </button>
                          )}
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
                <span className="text-xl font-light">+</span>
                Add New Address
              </button>
            </>
          )}
        </div>

        {/* Bottom Navigation */}
        <div>
          <BottomNav />
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