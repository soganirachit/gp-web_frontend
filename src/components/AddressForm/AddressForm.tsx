import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  addressService,
  type Address,
  type AddressInput,
} from "../../services/address.service";

interface AddressFormProps {
  mode: "add" | "edit";
  initialAddress?: Address;
}

const AddressForm: React.FC<AddressFormProps> = ({ mode, initialAddress }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AddressInput>({
    houseNo: "",
    streetName: "",
    area: "",
    city: "",
    state: "",
    pincode: "",
    associatedPhoneNumber: "",
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
      });
    }
  }, [mode, initialAddress]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
