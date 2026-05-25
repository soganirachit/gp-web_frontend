import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCamera } from 'react-icons/fa';
import { customerService } from '@/services/getcustomer.service';
import { editCustomerService } from '@/services/editcustomer.service';
import { useFeatureTheme } from '../../../../context/FeatureThemeContext';
import { formatPhoneForDisplay } from '@/utils/phoneDisplay';
import { resolveMediaUrl } from '@/utils/resolveMediaUrl';
import { UniformPageHeader } from '../../../../components/layout/UniformPageHeader';
import { toast } from 'react-hot-toast';

interface UserDetails {
  name: string;
  email: string;
  phone: string;
}

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const { theme, feature } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';

  const [userDetails, setUserDetails] = useState<UserDetails>({
    name: '',
    email: '',
    phone: '',
  });
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const user = await customerService.getCurrentUser();
        setUserDetails({
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.full_name || '',
          email: user.email || '',
          phone: formatPhoneForDisplay(user.phone),
        });
        setProfileImageUrl(user.profile_image ? resolveMediaUrl(user.profile_image) : null);
      } catch (err) {
        console.error('Failed to fetch customer:', err);
      }
    };
    void fetchCustomer();
  }, []);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Use a JPEG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      toast.error('Profile image must be 5 MB or smaller.');
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const nextPreview = URL.createObjectURL(file);
    previewUrlRef.current = nextPreview;
    setImagePreviewUrl(nextPreview);
    setSelectedImageFile(file);
    setError(null);
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    setError(null);
    try {
      const [firstName, ...rest] = userDetails.name.trim().split(/\s+/);
      const lastName = rest.join(' ');
      const updated = await editCustomerService.editCustomer({
        firstName: firstName || '',
        lastName: lastName || '',
        emailAddress: userDetails.email,
        profileImage: selectedImageFile,
      });
      if (updated.profileImageUrl) {
        setProfileImageUrl(resolveMediaUrl(updated.profileImageUrl));
      }
      setSelectedImageFile(null);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setImagePreviewUrl(null);
      toast.success('Profile updated');
      navigate(`${basePath}/account`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to update profile.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const displayImageSrc = imagePreviewUrl || profileImageUrl;

  return (
    <div className="bg-[#f8f6f1] min-h-screen">
      <div className="max-w-[800px] mx-auto">
        <UniformPageHeader
          title="Edit Profile"
          onBack={() => navigate(`${basePath}/account`)}
          padYClassName="pt-4 pb-4"
        />

        <div className="flex justify-center mt-6">
          <div className="relative">
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-[#f8f6f1]">
              {displayImageSrc ? (
                <img
                  src={displayImageSrc}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <img
                    src={theme.assets.profileBackground}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    aria-hidden
                  />
                  <img
                    src={theme.assets.profileLogo}
                    alt=""
                    className="absolute inset-0 m-auto h-12 w-12 object-contain"
                    aria-hidden
                  />
                </>
              )}
            </div>
            <button
              type="button"
              className="absolute -bottom-1 -right-1 z-20 rounded-full bg-white p-2 text-gray-700 shadow-md"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload profile photo"
            >
              <FaCamera className="text-sm" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageSelect}
            />
          </div>
        </div>

        <div className="mx-4 mt-6 rounded-xl bg-white p-6 shadow-sm">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                value={userDetails.name}
                onChange={(e) => setUserDetails((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Maya Sharma"
                className="w-full rounded-lg bg-gray-100 p-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                value={userDetails.email}
                onChange={(e) => setUserDetails((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="maya@example.com"
                className="w-full rounded-lg bg-gray-100 p-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                value={userDetails.phone}
                disabled
                autoComplete="tel"
                title="Phone number cannot be changed"
                placeholder="+91 00000 00000"
                className="w-full cursor-not-allowed rounded-lg border border-gray-200/80 bg-gray-200/90 p-3 text-base text-gray-600 focus:outline-none focus:ring-0"
              />
            </div>
          </div>
        </div>

        <div className="px-4 mt-6 pb-layout-pb">
          {error && <p className="mb-4 text-center text-red-500">{error}</p>}
          <button
            type="button"
            onClick={() => void handleSaveChanges()}
            className="w-full rounded-xl py-3.5 text-base font-semibold text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: theme.colors.primary }}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
