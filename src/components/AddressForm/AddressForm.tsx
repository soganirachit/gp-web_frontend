import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaMapMarkerAlt } from "react-icons/fa";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  addressService,
  type Address,
  type AddressInput,
} from "../../services/address.service";
import Spinner from "../common/Spinner";

interface AddressFormProps {
  mode: "add" | "edit";
  initialAddress?: Address;
}

const AddressForm: React.FC<AddressFormProps> = ({ mode, initialAddress }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [validatingCoordinates, setValidatingCoordinates] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message?: string;
  } | null>(null);
  const [formData, setFormData] = useState<AddressInput>({
    houseNo: "",
    streetName: "",
    area: "",
    city: "",
    state: "",
    pincode: "",
    associatedPhoneNumber: "",
    coordinates: "",
  });

  useEffect(() => {
    if (mode === "edit" && initialAddress) {
      setFormData({
        houseNo: initialAddress.houseNo,
        streetName: initialAddress.streetName,
        area: initialAddress.area,
        city: initialAddress.city,
        state: initialAddress.state,
        pincode: initialAddress.pincode,
        associatedPhoneNumber: initialAddress.associatedPhoneNumber,
        coordinates: initialAddress.coordinates || "",
      });
    }
  }, [mode, initialAddress]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear validation result when coordinates change
    if (name === "coordinates") {
      setValidationResult(null);
    }
  };

  const validateCoordinates = async () => {
    if (!formData.coordinates) {
      toast.error("Please enter coordinates first");
      return;
    }

    try {
      setValidatingCoordinates(true);
      const validation = await addressService.validateAddressInDeliveryArea(formData.coordinates);
      setValidationResult({
        isValid: validation.isValid,
        message:
          validation.message ||
          (validation.isValid ? 'We deliver to this location.' : 'Outside delivery area'),
      });
    } catch (error) {
      toast.error("Failed to validate coordinates");
      setValidationResult({ isValid: false, message: "Validation failed" });
    } finally {
      setValidatingCoordinates(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate address before saving if coordinates are available
      if (formData.coordinates) {
        const validation = await addressService.validateAddressBeforeSave(formData);
        if (!validation.isValid) {
          toast.error(validation.message || "Address validation failed");
          setLoading(false);
          return;
        }
      }

      if (mode === "add") {
        await addressService.createAddress(formData);
        toast.success("Address added successfully");
      } else if (mode === "edit" && initialAddress) {
        await addressService.updateAddress(initialAddress.id, formData);
        toast.success("Address updated successfully");
      }
      navigate("/addresses");
    } catch (error) {
      toast.error("Failed to save address");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="text-gray-600"
          >
            <FaArrowLeft size={20} />
          </motion.button>
          <h1 className="text-xl font-semibold">
            {mode === "add" ? "Add New Address" : "Edit Address"}
          </h1>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 max-w-lg mx-auto">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="houseNo"
              className="block text-sm font-medium text-gray-700"
            >
              House/Flat No.
            </label>
            <input
              type="text"
              id="houseNo"
              name="houseNo"
              value={formData.houseNo}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <label
              htmlFor="streetName"
              className="block text-sm font-medium text-gray-700"
            >
              Street Name
            </label>
            <input
              type="text"
              id="streetName"
              name="streetName"
              value={formData.streetName}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <label
              htmlFor="area"
              className="block text-sm font-medium text-gray-700"
            >
              Area/Locality
            </label>
            <input
              type="text"
              id="area"
              name="area"
              value={formData.area}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium text-gray-700"
            >
              City
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <label
              htmlFor="state"
              className="block text-sm font-medium text-gray-700"
            >
              State
            </label>
            <input
              type="text"
              id="state"
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <label
              htmlFor="pincode"
              className="block text-sm font-medium text-gray-700"
            >
              Pin code
            </label>
            <input
              type="text"
              id="pincode"
              name="pincode"
              value={formData.pincode}
              onChange={handleInputChange}
              required
              pattern="[0-9]{6}"
              maxLength={6}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <label
              htmlFor="phoneNumber"
              className="block text-sm font-medium text-gray-700"
            >
              Phone Number
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.associatedPhoneNumber}
              onChange={handleInputChange}
              required
              pattern="[0-9]{10}"
              maxLength={10}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            />
          </div>

          <div>
            <label
              htmlFor="coordinates"
              className="block text-sm font-medium text-gray-700"
            >
              Coordinates (Optional)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                id="coordinates"
                name="coordinates"
                value={formData.coordinates || ""}
                onChange={handleInputChange}
                placeholder="latitude,longitude (e.g., 26.9124,75.7873)"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
              />
              <button
                type="button"
                onClick={validateCoordinates}
                disabled={validatingCoordinates || !formData.coordinates}
                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <FaMapMarkerAlt size={12} />
                {validatingCoordinates ? "Validating..." : "Validate"}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Format: latitude,longitude (e.g., 26.9124,75.7873)
            </p>
            {validationResult && (
              <div className={`mt-2 p-2 rounded text-xs ${
                validationResult.isValid 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {validationResult.message}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {loading ? (
              <Spinner size={20} variant="light" className="flex-shrink-0" />
            ) : mode === "add" ? (
              "Add Address"
            ) : (
              "Update Address"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddressForm;
