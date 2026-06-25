import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaUser, FaCamera } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { REQUIRED_TOAST } from '../../constants/requiredToastMessages';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    dateOfBirth: '',
    gender: ''
  });

  useEffect(() => {
    // Load profile data from localStorage
    const name = localStorage.getItem('userName') || '';
    const phone = localStorage.getItem('phoneNumber') || '';
    setProfileData(prev => ({
      ...prev,
      fullName: name,
      phoneNumber: phone
    }));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      // Here you would typically make an API call to update the profile
      // For now, we'll just update localStorage
      localStorage.setItem('userName', profileData.fullName);
      
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const openPhotoPicker = async (
    input: HTMLInputElement | null,
    deniedToast: string,
  ) => {
    if (!input) return;
    try {
      if ('showPicker' in input) {
        await (input as HTMLInputElement & { showPicker: () => Promise<void> }).showPicker();
      } else {
        input.click();
      }
    } catch (e: unknown) {
      const name = (e as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        toast.error(deniedToast);
      }
    }
  };

  const handleChooseFromLibrary = () => {
    setShowPhotoOptions(false);
    void openPhotoPicker(galleryInputRef.current, REQUIRED_TOAST.ALLOW_PHOTOS_PROFILE);
  };

  const handleTakePhoto = async () => {
    setShowPhotoOptions(false);
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
        });
        stream.getTracks().forEach((track) => track.stop());
      }
      void openPhotoPicker(cameraInputRef.current, REQUIRED_TOAST.ALLOW_CAMERA_PROFILE);
    } catch (e: unknown) {
      const name = (e as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        toast.error(REQUIRED_TOAST.ALLOW_CAMERA_PROFILE);
      } else {
        void openPhotoPicker(cameraInputRef.current, REQUIRED_TOAST.ALLOW_CAMERA_PROFILE);
      }
    }
  };

  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success('Profile picture updated');
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(-1)}
              className="text-gray-600"
            >
              <FaArrowLeft size={20} />
            </motion.button>
            <h1 className="text-xl font-semibold">Profile</h1>
          </div>
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className="text-green-600 font-medium"
          >
            {isEditing ? 'Save' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Profile Picture Section */}
      <div className="bg-white p-6 mt-2 flex flex-col items-center">
        <div className="relative">
          <div className="w-24 h-24 bg-green-200 rounded-full flex items-center justify-center">
            <FaUser className="text-green-600 text-3xl" />
          </div>
          {isEditing && (
            <>
              <button
                type="button"
                className="absolute bottom-0 right-0 bg-green-600 text-white p-2 rounded-full"
                onClick={() => setShowPhotoOptions((v) => !v)}
                aria-label="Change profile picture"
              >
                <FaCamera size={16} />
              </button>
              {showPhotoOptions ? (
                <div className="absolute top-full mt-2 right-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[10rem] overflow-hidden">
                  <button
                    type="button"
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    onClick={handleChooseFromLibrary}
                  >
                    Photo library
                  </button>
                  <button
                    type="button"
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 border-t"
                    onClick={() => void handleTakePhoto()}
                  >
                    Take photo
                  </button>
                </div>
              ) : null}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelected}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoSelected}
              />
            </>
          )}
        </div>
      </div>

      {/* Profile Form */}
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <label className="text-sm text-gray-500">Full Name</label>
            <input
              type="text"
              name="fullName"
              value={profileData.fullName}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full mt-1 text-gray-800 focus:outline-none disabled:bg-transparent"
              placeholder="Enter your full name"
            />
          </div>

          <div className="p-4 border-b">
            <label className="text-sm text-gray-500">Phone Number</label>
            <input
              type="tel"
              name="phoneNumber"
              value={profileData.phoneNumber}
              disabled
              className="w-full mt-1 text-gray-800 focus:outline-none disabled:bg-transparent"
            />
          </div>

          <div className="p-4 border-b">
            <label className="text-sm text-gray-500">Email</label>
            <input
              type="email"
              name="email"
              value={profileData.email}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full mt-1 text-gray-800 focus:outline-none disabled:bg-transparent"
              placeholder="Enter your email"
            />
          </div>

          <div className="p-4 border-b">
            <label className="text-sm text-gray-500">Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={profileData.dateOfBirth}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full mt-1 text-gray-800 focus:outline-none disabled:bg-transparent"
            />
          </div>

          <div className="p-4">
            <label className="text-sm text-gray-500">Gender</label>
            <select
              name="gender"
              value={profileData.gender}
              onChange={handleInputChange}
              disabled={!isEditing}
              className="w-full mt-1 text-gray-800 focus:outline-none disabled:bg-transparent"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Delete Account Button */}
      <div className="p-4 mt-4">
        <button
          onClick={() => toast.error('This feature is not available yet')}
          className="w-full py-3 text-red-500 font-medium border-2 border-red-500 rounded-lg"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
};

export default Profile; 