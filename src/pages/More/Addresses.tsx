import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {  FaHome, FaBuilding, FaPen, FaTrash, FaMapMarkerAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { addressService, type Address } from '../../services/address.service';
import WalletIcon from '../../assets/icon/Wallet.png';
import ProfileIcon from '../../assets/icon/Profile.png';
import BottomNav from '../../components/layout/BottomNav';
import { IoArrowBack } from 'react-icons/io5';
import { MdLocationOn } from 'react-icons/md';
import { GoogleMap } from '@react-google-maps/api';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import Spinner from '../../components/common/Spinner';

const Addresses: React.FC = () => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const { isLoaded, loadError } = useGoogleMaps();

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await addressService.getAllAddresses();
      setAddresses(data);
    } catch (error: any) {
      setError(error.message || 'Failed to load addresses');
      if (error.message.includes('login')) {
        navigate('/login', { state: { returnUrl: location.pathname } });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      setActionInProgress(true);
      setError(null);
      await addressService.setDefaultAddress(addressId);
      await loadAddresses(); // Reload addresses to get updated state
    } catch (error: any) {
      setError(error.message || 'Failed to set default address');
      if (error.message.includes('login')) {
        navigate('/login', { state: { returnUrl: location.pathname } });
      }
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDeleteClick = (addressId: string) => {
    setAddressToDelete(addressId);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (addressToDelete) {
      try {
        setActionInProgress(true);
        setError(null);
        await addressService.deleteAddress(addressToDelete);
        setAddresses(addresses.filter(addr => addr.id !== addressToDelete));
        setShowDeleteModal(false);
      } catch (error: any) {
        setError(error.message || 'Failed to delete address');
        if (error.message.includes('login')) {
          navigate('/login', { state: { returnUrl: location.pathname } });
        }
      } finally {
        setActionInProgress(false);
        setAddressToDelete(null);
      }
    }
  };

  const handleEdit = (address: Address) => {
    navigate('/addresses/edit', { state: { address } });
  };

  const AddressMap: React.FC<{ coordinates: string }> = ({ coordinates }) => {
    const [lat, lng] = coordinates.split(',').map(Number);
    
    if (!isLoaded) return (
      <div className="w-32 h-32 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#F15A22]"></div>
      </div>
    );

    if (loadError) return (
      <div className="w-32 h-32 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
        <FaMapMarkerAlt className="text-gray-400 text-4xl" />
      </div>
    );

    return (
      <div className="w-32 h-32 bg-gray-100 rounded-xl overflow-hidden">
        <GoogleMap
          mapContainerStyle={{
            width: '100%',
            height: '100%'
          }}
          center={{ lat, lng }}
          zoom={15}
          options={{
            disableDefaultUI: true,
            zoomControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            clickableIcons: false,
            draggable: false
          }}
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <MdLocationOn className="text-[#F15A22] text-3xl drop-shadow-lg" />
          </div>
        </GoogleMap>
      </div>
    );
  };

  const DeleteConfirmationModal = () => (
    <AnimatePresence>
      {showDeleteModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-opacity-50 backdrop-blur z-50 flex items-center justify-center px-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
          >
            <div className="text-center">
              <FaTrash className="mx-auto text-[#F15A22] text-2xl mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Address</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to delete this address? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={actionInProgress}
                  className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg text-[15px] font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={actionInProgress}
                  className="flex-1 bg-[#F15A22] text-white py-3 rounded-lg text-[15px] font-medium hover:bg-[#F15A22]/90 disabled:opacity-50"
                >
                  {actionInProgress ? 'Deleting...' : 'Delete'}
                </button>
              </div>
              {error && (
                <p className="mt-4 text-sm text-red-500">{error}</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen  bg-[#FFFBEB]">
      


      {/* Main Content */}
      <div className="max-w-[800px] mx-auto p-4">
        {loading ? (
          <div className="flex justify-center items-center h-40">
              <Spinner size={400} />
          </div>
        ) : error && !error.includes('login') ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={loadAddresses}
              className="text-[#015D3A] font-medium hover:underline"
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
                  onClick={() => navigate('/addresses/add')}
                  className="text-[#015D3A] font-medium hover:underline"
                >
                  Add your first address
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className="bg-white rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="text-xl font-medium text-gray-900">{address.type}</h3>
                          {address.isDefault && (
                            <span className="text-xs bg-[#ECFDF5] text-[#015D3A] px-2 py-1 rounded-full">
                              Default
                            </span>
                          )}
                          <div className="w-8 h-8 bg-[#ECFDF5] rounded-full flex items-center justify-center">
                            {address.type === 'Home' ? (
                              <FaHome className="text-[#015D3A] text-sm" />
                            ) : (
                              <FaBuilding className="text-[#015D3A] text-sm" />
                            )}
                          </div>
                        </div>
                        <p className="text-gray-600 text-[15px]">{address.houseNo}, {address.streetName}</p>
                        <p className="text-gray-600 text-[15px]">{address.area}, {address.city}</p>
                        <p className="text-gray-600 text-[15px]">{address.state} - {address.pincode}</p>
                        <p className="text-gray-600 text-[15px] mt-2">+91 {address.associatedPhoneNumber}</p>
                      </div>
                      {address.coordinates ? (
                        <AddressMap coordinates={address.coordinates} />
                      ) : (
                        <div className="w-32 h-32 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                          <FaMapMarkerAlt className="text-gray-400 text-4xl" />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => handleEdit(address)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-[#015D3A] text-[#015D3A] rounded-full text-[15px] font-medium hover:bg-[#ECFDF5] disabled:opacity-50"
                        disabled={actionInProgress}
                      >
                        <FaPen className="text-sm" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(address.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-[#F15A22] text-[#F15A22] rounded-full text-[15px] font-medium hover:bg-red-50 disabled:opacity-50"
                        disabled={actionInProgress}
                      >
                        <FaTrash className="text-sm" />
                        Delete
                      </button>
                      {!address.isDefault && (
                        <button
                          onClick={() => handleSetDefault(address.id)}
                          disabled={actionInProgress}
                          className="flex-1 bg-[#F15A22] text-white py-3 px-5 rounded-full text-[15px] font-medium hover:bg-[#F15A22]/90 disabled:opacity-50"
                        >
                          {actionInProgress ? 'Setting...' : 'Set as Default'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Address Button */}
            <button
              onClick={() => navigate('/addresses/add')}
              disabled={actionInProgress}
              className="mt-6 w-full flex items-center justify-center gap-2 text-[#015D3A] py-4 mb-[90px] border-[#015D3A] rounded-xl hover:bg-[#ECFDF5] disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
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
      <DeleteConfirmationModal />
    </div>
  );
};

export default Addresses; 