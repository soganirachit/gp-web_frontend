import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { IoArrowBack } from 'react-icons/io5';

import { basePackService, BasePack } from '../../../services/basepack.service';
import { subscriptionService } from '../../../services/subscription.service';
import Spinner from '../../../components/common/Spinner';


interface Subscription {
  id: string;
  type: "DAILY" | "CUSTOM";
  status: string;
  startDate: Date;
  selectedDays: string[];
  deliveryDays?: string[];
  deliveryPreference?: string;
  amount?: number;
  imagesUrl: string[];
  productDetails?: {
    name: string;
    description: string;
    imagesUrl: string[];
  };
  orderContents?: {
    name: string;
    description: string;
    sellingPricePerPackDaily: number;
    sellingPricePerPackAlternate: number;
    contents: {
      id: string;
      name: string;
      quantity: number;
    }[];
  };
}

const ModifySubscription: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subscription } = location.state || { subscription: null } as { subscription: Subscription | null };

  const [quantity, setQuantity] = useState(1); // Default to 1 as quantity isn't explicitly in the interface but logically needed
  const [deliveryType, setDeliveryType] = useState<'daily' | 'custom'>('daily');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [addOns, setAddOns] = useState<{ [key: string]: number }>({});
  const [availableAddOns, setAvailableAddOns] = useState<BasePack[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Initialize state from subscription data
  useEffect(() => {
    if (subscription) {
      // Determine Delivery Type
      const isCustom = subscription.type === 'CUSTOM' || subscription.deliveryPreference === 'CUSTOM';
      setDeliveryType(isCustom ? 'custom' : 'daily');

      // Determine Selected Days
      // Check for stored days in various formats
      let currentDays: string[] = [];
      if (subscription.deliveryDays && subscription.deliveryDays.length > 0) {
        currentDays = subscription.deliveryDays;
      } else if (subscription.selectedDays && subscription.selectedDays.length > 0) {
        currentDays = subscription.selectedDays;
      }

      // Normalize days to match our 'Mon', 'Tue' format if needed
      const dayMap: { [key: string]: string } = {
        'monday': 'Mon', 'mon': 'Mon',
        'tuesday': 'Tue', 'tue': 'Tue',
        'wednesday': 'Wed', 'wed': 'Wed',
        'thursday': 'Thu', 'thu': 'Thu',
        'friday': 'Fri', 'fri': 'Fri',
        'saturday': 'Sat', 'sat': 'Sat',
        'sunday': 'Sun', 'sun': 'Sun'
      };
      const normalizedDays = currentDays.map(d => dayMap[d.toLowerCase()] || d);

      // If daily, select all days, else select specific days
      if (!isCustom) {
        // For daily, visual UI might disable selection, but logically it's all days
        setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
      } else {
        setSelectedDays(normalizedDays);
      }
    }
  }, [subscription]);

  // Fetch Add-ons (Products)
  useEffect(() => {
    const fetchAddOns = async () => {
      try {
        setIsLoading(true);
        const products = await basePackService.getAllBasePacks();
        setAvailableAddOns(products.slice(0, 3));
      } catch (error) {
        console.error("Failed to fetch add-ons", error);
        toast.error("Failed to load add-ons");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAddOns();
  }, []);

  const handleDayToggle = (day: string) => {
    if (selectedDays.includes(day)) {
      if (deliveryType === 'custom' && selectedDays.length <= 3) {
        toast.error("You must select at least 3 days");
        return;
      }
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1) {
      setQuantity(newQuantity);
    }
  };

  const handleAddOnQuantityChange = (id: string, change: number) => {
    const currentQty = addOns[id] || 0;
    const newQty = currentQty + change;
    if (newQty <= 0) {
      const newAddOns = { ...addOns };
      delete newAddOns[id];
      setAddOns(newAddOns);
    } else {
      setAddOns({ ...addOns, [id]: newQty });
    }
  };

  const handleSaveChanges = async () => {
    if (!subscription) return;

    // Validate min 3 days for custom
    if (deliveryType === 'custom' && selectedDays.length < 3) {
      toast.error("Please select at least 3 delivery days");
      return;
    }

    try {
      setIsUpdating(true);

      // Map short day names to full uppercase names for API
      const dayMap: { [key: string]: string } = {
        'Mon': 'MONDAY',
        'Tue': 'TUESDAY',
        'Wed': 'WEDNESDAY',
        'Thu': 'THURSDAY',
        'Fri': 'FRIDAY',
        'Sat': 'SATURDAY',
        'Sun': 'SUNDAY'
      };

      const apiSelectedDays = selectedDays.map(day => dayMap[day]);
      const subscriptionType = deliveryType === 'daily' ? 'DAILY' : 'CUSTOM';

      await subscriptionService.updateSubscription(subscription.id, {
        type: subscriptionType,
        selectedDays: apiSelectedDays,
        status: subscription.status as any, // Preserve existing status
      });

      toast.success("Subscription updated successfully!");
      navigate('/gp-daily/manage-my-subscription');
    } catch (error: any) {
      console.error("Error updating subscription:", error);
      toast.error(error.message || "Failed to update subscription");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f8f6f1]">
        <Spinner size={400} />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f6f1]">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No subscription data found.</p>
          <button onClick={() => navigate('/gp-daily/manage-my-subscription')} className="text-blue-600 underline">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const productName = subscription.productDetails?.name || "Subscription Pack";
  const productImage = subscription.productDetails?.imagesUrl?.[0] || "https://t4.ftcdn.net/jpg/05/65/22/45/360_F_565224520_XvHkj0jS5jI4jZg7jZg7jZg7jZg7jZg7.jpg";

  return (
    <div className="min-h-screen bg-[#f8f6f1] font-sans">
      <div className="max-w-[800px] mx-auto p-4 md:p-6 pb-24">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-800">
            <IoArrowBack className="text-2xl" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-800 font-serif">Modify Subscription</h1>
        </div>

        {/* Product Card */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-xl overflow-hidden shadow-sm bg-white">
            <img
              src={productImage}
              alt={productName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-medium text-gray-900 font-serif mb-2">{productName}</h2>

            <div className="flex items-center justify-between">
              <span className="text-gray-600 font-serif text-lg">Quantity</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-2xl text-gray-500 shadow-sm font-bold"
                >
                  -
                </button>
                <span className="font-semibold text-lg w-4 text-center">{quantity}</span>
                <button
                  onClick={() => handleQuantityChange(1)}
                  className="w-8 h-8 rounded-full bg-[#FAA222] text-gray-900 flex items-center justify-center shadow-sm font-bold text-2xl"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-gray-200 mb-6" />

        {/* Delivery Schedule */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 font-serif mb-1">Delivery Schedule</h3>
          <p className="text-sm text-gray-500 mb-4">Choose your preferred delivery frequency</p>

          <div className="space-y-3">
            {/* Daily Delivery Option */}
            <div
              onClick={() => {
                setDeliveryType('daily');
                setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
              }}
              className={`bg-white rounded-2xl p-4 flex items-center justify-between border-2 transition-colors cursor-pointer ${deliveryType === 'daily' ? 'border-[#FAA222]' : 'border-transparent'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${deliveryType === 'daily' ? 'border-[#FAA222]' : 'border-gray-300'
                  }`}>
                  {deliveryType === 'daily' && <div className="w-2.5 h-2.5 rounded-full bg-[#FAA222]" />}
                </div>
                <span className="text-gray-700 font-medium">Daily Delivery</span>
              </div>
              <span className="text-gray-400 font-medium">₹{subscription?.orderContents?.sellingPricePerPackDaily || 50}/Pack</span>
            </div>

            {/* Custom Days Option */}
            <div
              onClick={() => setDeliveryType('custom')}
              className={`bg-white rounded-2xl p-4 flex items-center justify-between border-2 transition-colors cursor-pointer ${deliveryType === 'custom' ? 'border-[#FAA222]' : 'border-transparent'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${deliveryType === 'custom' ? 'border-[#FAA222]' : 'border-gray-300'
                  }`}>
                  {deliveryType === 'custom' && <div className="w-2.5 h-2.5 rounded-full bg-[#FAA222]" />}
                </div>
                <span className="text-gray-700 font-medium">Custom Days</span>
              </div>
              <span className="text-gray-400 font-medium">₹{subscription?.orderContents?.sellingPricePerPackAlternate || 70}/Pack</span>
            </div>
          </div>
        </div>

        {/* Select Days */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-800 font-serif mb-3">Select Days</h3>
          <div className="flex rounded-xl p-1 gap-2 w-full overflow-x-auto">
            {days.map(day => (
              <button
                key={day}
                onClick={() => handleDayToggle(day)}
                disabled={deliveryType === 'daily'}
                className={`h-12 flex-1 min-w-[40px] rounded-2xl flex  items-center justify-center font-medium transition-colors text-sm ${deliveryType === 'daily'
                  ? 'bg-[#FAA222] text-gray-900 cursor-not-allowed'
                  : selectedDays.includes(day)
                    ? 'bg-[#FAA222] text-text-gray-900 shadow-sm'
                    : 'bg-white border-[3px] border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Add-Ons */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-800 font-serif mb-1">Add-Ons</h3>
          <p className="text-sm text-gray-500 mb-4">Enhance your experience</p>

          <div className="space-y-3">
            {availableAddOns.map(addon => {
              const qty = addOns[addon.id] || 0;
              const imageUrl = addon.imagesUrl || '/placeholder.svg';
              return (
                <div key={addon.id} className="bg-white rounded-2xl p-3 flex items-center gap-3 border-2 border-gray-200">
                  <img src={imageUrl} alt={addon.name} className="w-14 h-14 rounded-lg object-cover bg-gray-100" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{addon.name}</h4>
                    <p className="text-gray-500 text-sm">₹{addon.sellingPrice}/pc</p>
                  </div>

                  {qty === 0 ? (
                    <button
                      onClick={() => handleAddOnQuantityChange(addon.id, 1)}
                      className="bg-[#FAA222] w-20 text-gray-900 text-sm font-medium px-4 py-2 rounded-xl shadow-sm hover:opacity-90"
                    >
                      Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleAddOnQuantityChange(addon.id, -1)}
                        className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-black"
                      >
                        -
                      </button>
                      <span className="font-medium w-3 text-center">{qty}</span>
                      <button
                        onClick={() => handleAddOnQuantityChange(addon.id, 1)}
                        className="w-8 h-8 rounded-full bg-[#FAA222] text-black flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center gap-4 mt-8">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 py-4 rounded-2xl border border-gray-200 text-gray-500 font-medium bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={isUpdating}
            className={`flex-1 py-4 rounded-2xl bg-[#FAA222] text-black font-semibold shadow-sm hover:bg-[#e5931f] disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModifySubscription;
