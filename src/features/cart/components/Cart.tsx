import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoArrowBack, IoCreateOutline } from 'react-icons/io5';
import { BsCalendar4 } from 'react-icons/bs';
import { MdLocationOn } from 'react-icons/md';
import { FaTag, FaPlus, FaMinus, FaEllipsisV } from 'react-icons/fa';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useFeatureTheme } from '../../../context/FeatureThemeContext';
import { addressService, Address } from '../../../services/address.service';
import BottomNav from '../../../components/layout/BottomNav';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, addDays, isToday, isTomorrow } from 'date-fns';
import toast from 'react-hot-toast';
import CartRazorpayPayment from '../../../components/Payment/Rezorpay/CartRazorpayPayment';
import { paymentService } from '../../../services/payment.service';
import { orderService } from '../../../services/order.service';
import { customerService } from '../../../services/getcustomer.service';

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useAuth();
  const { feature } = useFeatureTheme();
  const {
    items,
    deliveryInfo,
    removeFromCart,
    updateQuantity,
    updateCustomizedMessage,
    updateDeliveryInfo,
    getTotalPrice,
    syncCartToAPI,
    loadCartFromAPI,
    clearCart,
    isSyncing,
  } = useCart();

  const [defaultAddress, setDefaultAddress] = useState<Address | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateOption, setSelectedDateOption] = useState<'today' | 'tomorrow' | 'dayAfter' | 'pickDate'>('tomorrow');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('8-11 AM');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editMessage, setEditMessage] = useState<string>('');
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [shouldTriggerPayment, setShouldTriggerPayment] = useState(false);
  const [razorpayOrderId, setRazorpayOrderId] = useState<string | null>(null);
  const [razorpayKey, setRazorpayKey] = useState<string>('');
  const [razorpayAmount, setRazorpayAmount] = useState<number>(0);
  const [customerInfo, setCustomerInfo] = useState<{ name?: string; email?: string; contact?: string }>({});
  const paymentButtonRef = useRef<HTMLDivElement>(null);

  // Trigger payment button click when shouldTriggerPayment becomes true
  useEffect(() => {
    if (shouldTriggerPayment && paymentButtonRef.current) {
      // Small delay to ensure the button is rendered
      setTimeout(() => {
        paymentButtonRef.current?.click();
      }, 100);
    }
  }, [shouldTriggerPayment]);

  // Time slots
  const timeSlots = ['8-11 AM', '11 AM-2 PM', '2-6 PM', '6-9 PM'];

  // Load cart from API when component mounts (if logged in)
  useEffect(() => {
    if (isLoggedIn) {
      loadCartFromAPI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Fetch default address or use selected address from navigation
  useEffect(() => {
    const fetchAddress = async () => {
      if (!isLoggedIn) {
        setIsLoadingAddress(false);
        return;
      }

      // Check if we have a selected address from navigation (coming back from address-selection)
      if (location.state?.selectedAddress) {
        setDefaultAddress(location.state.selectedAddress);
        setIsLoadingAddress(false);
        return;
      }

      // Check localStorage for selected address
      const storedAddress = localStorage.getItem('selectedDeliveryAddress');
      if (storedAddress) {
        try {
          const parsedAddress = JSON.parse(storedAddress);
          setDefaultAddress(parsedAddress);
          setIsLoadingAddress(false);
          return;
        } catch (error) {
          console.error('Error parsing stored address:', error);
        }
      }

      try {
        setIsLoadingAddress(true);
        const addresses = await addressService.getAllAddresses();
        const defaultAddr = addresses.find(addr => addr.isDefault) || addresses[0];
        setDefaultAddress(defaultAddr || null);
      } catch (error) {
        console.error('Error fetching address:', error);
        setDefaultAddress(null);
      } finally {
        setIsLoadingAddress(false);
      }
    };

    fetchAddress();
  }, [isLoggedIn, location.state]);

  // Initialize delivery info if not set
  useEffect(() => {
    if (!deliveryInfo) {
      const tomorrow = addDays(new Date(), 1);
      updateDeliveryInfo({
        deliveryDate: format(tomorrow, 'dd MMM yyyy'),
        timeSlot: '8-11 AM',
        selectedDate: tomorrow,
      });
      setSelectedDateOption('tomorrow');
      setSelectedTimeSlot('8-11 AM');
    } else {
      // Sync state with deliveryInfo
      if (deliveryInfo.selectedDate) {
        // Convert to Date if it's a string (from localStorage)
        const dateObj = deliveryInfo.selectedDate instanceof Date 
          ? deliveryInfo.selectedDate 
          : new Date(deliveryInfo.selectedDate);
        
        if (isToday(dateObj)) {
          setSelectedDateOption('today');
        } else if (isTomorrow(dateObj)) {
          setSelectedDateOption('tomorrow');
        } else {
          const dayAfter = addDays(new Date(), 2);
          if (format(dateObj, 'yyyy-MM-dd') === format(dayAfter, 'yyyy-MM-dd')) {
            setSelectedDateOption('dayAfter');
          } else {
            setSelectedDateOption('pickDate');
          }
        }
      }
      setSelectedTimeSlot(deliveryInfo.timeSlot);
    }
  }, [deliveryInfo, updateDeliveryInfo]);

  const handleDateOptionSelect = (option: 'today' | 'tomorrow' | 'dayAfter' | 'pickDate') => {
    setSelectedDateOption(option);
    
    if (option === 'pickDate') {
      setShowDatePicker(true);
      return;
    }

    let selectedDate: Date;
    switch (option) {
      case 'today':
        selectedDate = new Date();
        break;
      case 'tomorrow':
        selectedDate = addDays(new Date(), 1);
        break;
      case 'dayAfter':
        selectedDate = addDays(new Date(), 2);
        break;
      default:
        selectedDate = addDays(new Date(), 1);
    }

    updateDeliveryInfo({
      deliveryDate: format(selectedDate, 'dd MMM yyyy'),
      timeSlot: selectedTimeSlot,
      selectedDate,
    });
  };

  const handleDatePickerChange = (date: Date | null) => {
    if (date) {
      setShowDatePicker(false);
      updateDeliveryInfo({
        deliveryDate: format(date, 'dd MMM yyyy'),
        timeSlot: selectedTimeSlot,
        selectedDate: date,
      });
    }
  };

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  const handleTimeSlotSelect = (slot: string) => {
    setSelectedTimeSlot(slot);
    if (deliveryInfo) {
      updateDeliveryInfo({
        ...deliveryInfo,
        timeSlot: slot,
      });
    }
  };

  const handleEditItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      setEditingItemId(itemId);
      setEditQuantity(item.quantity);
      setEditMessage(item.customizedMessage || '');
    }
    setOpenMenuId(null);
  };

  const handleSaveEdit = async (itemId: string) => {
    try {
      await updateQuantity(itemId, editQuantity);
      if (editMessage.trim() !== '') {
        await updateCustomizedMessage(itemId, editMessage);
      } else {
        await updateCustomizedMessage(itemId, '');
      }
      setEditingItemId(null);
      toast.success('Item updated successfully');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditQuantity(1);
    setEditMessage('');
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await removeFromCart(itemId);
      setOpenMenuId(null);
      toast.success('Item removed from cart');
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Failed to remove item. Please try again.');
    }
  };

  const handleEditAddress = () => {
    const addressPath = feature === 'gpStore' ? '/gp-store/address-selection' : '/gp-daily/address-selection';
    navigate(addressPath, {
      state: {
        fromCart: true,
      },
    });
  };

  const handleCheckout = async () => {
    const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
    
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!deliveryInfo) {
      toast.error('Please select delivery date and time');
      return;
    }

    // If user is not logged in, redirect to login
    if (!isLoggedIn) {
      const cartPath = `${basePath}/basket`;
      navigate(`${basePath}/login`, {
        state: {
          returnUrl: cartPath,
          fromCart: true, // Flag to indicate we need to sync cart after login
        },
      });
      return;
    }

    // User is logged in - sync cart to API first
    try {
      console.log('Checkout: Syncing cart to API...');
      console.log('UI Cart items:', items.map(i => ({ id: i.id, productId: i.productId, quantity: i.quantity, apiCartItemId: i.apiCartItemId })));
      await syncCartToAPI();
      console.log('Checkout: Cart synced successfully, reloading to verify...');
      await loadCartFromAPI();
      console.log('Checkout: Cart reloaded, verifying sync...');
      console.log('API Cart items after sync:', items.map(i => ({ id: i.id, productId: i.productId, quantity: i.quantity, apiCartItemId: i.apiCartItemId })));
      toast.success('Cart synced successfully');
    } catch (error: any) {
      console.error('Error syncing cart:', error);
      toast.error('Failed to sync cart. Please try again.');
      return;
    }

    if (!defaultAddress) {
      toast.error('Please add a delivery address');
      navigate(`${basePath}/addresses`);
      return;
    }

    // Step 1: Create Razorpay order (creates PendingCheckout)
    try {
      setIsProcessingPayment(true);
      
      // Convert delivery date to YYYY-MM-DD format
      let deliveryDateFormatted: string | undefined;
      if (deliveryInfo.selectedDate) {
        deliveryDateFormatted = format(deliveryInfo.selectedDate, 'yyyy-MM-dd');
      } else if (deliveryInfo.deliveryDate) {
        // Try to parse the formatted date string
        try {
          const date = new Date(deliveryInfo.deliveryDate);
          deliveryDateFormatted = format(date, 'yyyy-MM-dd');
        } catch {
          // If parsing fails, use tomorrow as default
          deliveryDateFormatted = format(addDays(new Date(), 1), 'yyyy-MM-dd');
        }
      }

      // Map time slot to delivery_slot_id (optional - can be fetched from API)
      // For now, we'll skip delivery_slot_id and let the backend handle it
      const checkoutData = {
        delivery_address_id: Number(defaultAddress.id),
        delivery_date: deliveryDateFormatted,
        delivery_instructions: deliveryInfo.deliveryDate ? `${deliveryInfo.deliveryDate} - ${deliveryInfo.timeSlot}` : deliveryInfo.timeSlot,
        customer_notes: '',
        // delivery_slot_id: undefined, // Optional - can be fetched from /delivery/slots/available/
      };

      // Verify token exists before making the call
      const token = localStorage.getItem('token');
      console.log('Cart - Checkout: Token check', { 
        hasToken: !!token,
        tokenLength: token?.length,
        isLoggedIn 
      });
      
      if (!token) {
        throw new Error('Authentication required. Please login again.');
      }
      
      console.log('Creating checkout order with data:', checkoutData);
      const checkoutResponse = await paymentService.createCheckoutOrder(checkoutData);
      
      console.log('Checkout order created:', checkoutResponse);
      
      // Get Razorpay key from environment or API response
      const razorpayKey = checkoutResponse.key_id || import.meta.env.VITE_RAZORPAY_KEY || '';
      if (!razorpayKey) {
        throw new Error('Razorpay key not found. Please configure VITE_RAZORPAY_KEY in environment variables.');
      }

      // Store payment details for Razorpay
      setRazorpayOrderId(checkoutResponse.razorpay_order_id);
      setRazorpayKey(razorpayKey);
      setRazorpayAmount(checkoutResponse.amount);
      
      // Step 2: Trigger Razorpay payment
      setShouldTriggerPayment(true);
      setIsProcessingPayment(false);
    } catch (error: any) {
      console.error('Error creating checkout order:', error);
      toast.error(error.message || 'Failed to initiate payment. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = async (paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    payment_status: string;
  }) => {
    setIsProcessingPayment(true);
    setShouldTriggerPayment(false);

    try {
      // Step 3: Verify payment and create order
      console.log('Verifying payment with data:', {
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
      });

      const verifyResponse = await paymentService.verifyPayment({
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
      });

      console.log('Payment verified, order created:', verifyResponse);

      if (verifyResponse.order && verifyResponse.payment) {
        // Clear cart after successful order
        clearCart();
        
        toast.success('Order placed successfully!');
        
        // Navigate to success page or orders page
        const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
        navigate(`${basePath}/payment-success`, {
          state: {
            orderId: verifyResponse.order.order_number,
            orderNumber: verifyResponse.order.order_number,
            amount: razorpayAmount / 100, // Convert from paise to rupees
          },
        });
      } else {
        throw new Error('Order creation failed');
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast.error(error.message || 'Failed to verify payment. Please contact support.');
      
      // Optional: Check payment status if verification fails
      if (paymentData.razorpay_order_id) {
        try {
          console.log('Checking payment status as fallback...');
          const statusResponse = await paymentService.getPaymentStatus(paymentData.razorpay_order_id);
          console.log('Payment status:', statusResponse);
          
          if (statusResponse.status === 'completed' && statusResponse.order_number) {
            // Payment was successful, order was created
            clearCart();
            toast.success('Order placed successfully!');
            const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
            navigate(`${basePath}/payment-success`, {
              state: {
                orderId: statusResponse.order_number,
                orderNumber: statusResponse.order_number,
                amount: parseFloat(statusResponse.amount),
              },
            });
            return;
          }
        } catch (statusError) {
          console.error('Error checking payment status:', statusError);
        }
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentError = (error: Error) => {
    toast.error(error.message || 'Payment failed. Please try again.');
    setIsProcessingPayment(false);
    setShouldTriggerPayment(false);
  };

  const calculateSubtotal = () => {
    return getTotalPrice();
  };

  const deliveryFee = 50;
  const tax = 70;
  const surcharge = 30;
  const subtotal = calculateSubtotal();
  const total = subtotal + deliveryFee + tax + surcharge;

  // Format address for display
  const formatAddress = (address: Address | null): string => {
    if (!address) return '';
    const parts = [
      address.houseNo,
      address.streetName,
      address.area,
      address.city,
      address.state,
      address.pincode,
    ].filter(Boolean);
    return parts.join(', ');
  };

  // Redirect to login if not logged in - check both isLoggedIn and token directly
  // This is a fallback in case ProtectedRoute doesn't catch it
  const token = localStorage.getItem('token');
  const phoneNumber = localStorage.getItem('phoneNumber');
  const isActuallyLoggedIn = !!(token && phoneNumber);
  
  if (!isLoggedIn || !isActuallyLoggedIn) {
    const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
    const currentPath = location.pathname;
    // Use Navigate component for immediate redirect
    return (
      <Navigate 
        to={`${basePath}/login`} 
        state={{ 
          returnUrl: currentPath,
          fromCart: true 
        }} 
        replace 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBEB]">
      <div className="max-w-[800px] mx-auto pb-20">
        {/* Header */}
        <div className="sticky top-0 bg-[#FFFBEB] z-10 px-4 py-4 flex items-center gap-3 border-b border-gray-200">
          <button
            onClick={() => navigate(-1)}
            className="hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <IoArrowBack className="text-xl" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">My Basket</h1>
        </div>

        <div className="px-4 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Your cart is empty</p>
              <button
                onClick={() => navigate('/gp-store/products')}
                className="mt-4 bg-[#2A6B28] text-white px-6 py-2 rounded-lg hover:bg-[#1e5a1c] transition-colors"
              >
                Browse Products
              </button>
            </div>
          ) : (
            <>
              {/* Product Items */}
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-[25px] p-4 shadow-sm relative">
                  <div className="flex gap-4">
                    {/* Product Image */}
                  <img
                    src={item.image}
                    alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80';
                      }}
                    />

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 text-base">
                          {item.name} x{item.quantity}
                        </h3>
                        {/* Kebab Menu */}
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <FaEllipsisV className="text-gray-600" />
                          </button>
                          {openMenuId === item.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[120px]">
                      <button
                                  onClick={() => handleEditItem(item.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                                >
                                  Edit
                      </button>
                      <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 rounded-b-lg"
                      >
                                  Delete
                      </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {deliveryInfo && (
                        <div className="text-sm text-gray-600 mb-1">
                          <div>Delivery: {deliveryInfo.deliveryDate}</div>
                          <div>Time Slot: {deliveryInfo.timeSlot}</div>
                        </div>
                      )}

                      <div className="text-lg font-bold text-gray-900 mb-2">
                        ₹{item.price} each
                      </div>

                      {item.customizedMessage && !editingItemId && (
                        <div className="text-sm text-gray-600">
                          Customized Message: {item.customizedMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Edit Section */}
                  {editingItemId === item.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                      {/* Quantity Editor */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Quantity</label>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setEditQuantity(Math.max(1, editQuantity - 1))}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                          >
                            <FaMinus className="text-gray-600 text-xs" />
                          </button>
                          <span className="text-base font-semibold text-gray-900 min-w-[2rem] text-center">
                            {editQuantity}
                          </span>
                          <button
                            onClick={() => setEditQuantity(editQuantity + 1)}
                            className="w-8 h-8 rounded-full bg-[#2A6B28] hover:bg-[#1e5a1c] text-white flex items-center justify-center transition-colors"
                          >
                            <FaPlus className="text-white text-xs" />
                          </button>
                        </div>
                      </div>

                      {/* Customized Message Editor */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Customized Message (optional)
                        </label>
                        <textarea
                          value={editMessage}
                          onChange={(e) => {
                            if (e.target.value.length <= 500) {
                              setEditMessage(e.target.value);
                            }
                          }}
                          placeholder="Add a personalized message..."
                          className="w-full p-3 rounded-lg border-2 border-gray-200 focus:border-[#2A6B28] focus:outline-none resize-none text-sm"
                          rows={3}
                          maxLength={500}
                        />
                        <div className="text-xs text-gray-500 mt-1 text-right">
                          {editMessage.length}/500
                        </div>
                      </div>

                      {/* Save/Cancel Buttons */}
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          className="flex-1 px-4 py-2 bg-[#2A6B28] text-white rounded-lg hover:bg-[#1e5a1c] transition-colors text-sm font-medium"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Delivery Date and Time Slot Selection */}
              <div className="bg-white rounded-[25px] p-4 shadow-sm relative">
                <h3 className="text-base font-semibold text-gray-900 mb-3">Delivery Date</h3>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <button
                    onClick={() => handleDateOptionSelect('today')}
                    className={`px-1.5 py-1.5 rounded-xl text-[12px] font-medium transition-colors ${
                      selectedDateOption === 'today'
                        ? 'bg-[#2A6B28] text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => handleDateOptionSelect('tomorrow')}
                    className={`px-1.5 py-1.5 rounded-xl text-[12px] font-medium transition-colors ${
                      selectedDateOption === 'tomorrow'
                        ? 'bg-[#2A6B28] text-white'
                        : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    Tomorrow
                  </button>
                  <button
                    onClick={() => handleDateOptionSelect('dayAfter')}
                    className={`px-1.5 py-1.5 rounded-xl text-[12px] font-medium transition-colors ${
                      selectedDateOption === 'dayAfter'
                        ? 'bg-[#2A6B28] text-white'
                        : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    Day After
                  </button>
                  <button
                    onClick={() => handleDateOptionSelect('pickDate')}
                    className={`px-1.5 py-1.5 rounded-xl text-[12px] font-medium transition-colors flex items-center justify-center gap-1 ${
                      selectedDateOption === 'pickDate'
                        ? 'bg-[#2A6B28] text-white'
                        : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    <BsCalendar4 className="text-xs" />
                    Pick Date
                  </button>
                </div>

                {/* Date Picker Overlay */}
                {showDatePicker && (
                  <>
                    <div
                      className="fixed inset-0 bg-black bg-opacity-20 z-40"
                      onClick={() => setShowDatePicker(false)}
                    />
                    <div
                      ref={datePickerRef}
                      className="absolute left-4 right-4 top-full mt-2 bg-white rounded-xl shadow-2xl z-50 p-4 border border-gray-200"
                    >
                      <style>{`
                        .react-datepicker {
                          border: none !important;
                          font-family: inherit;
                        }
                        .react-datepicker__header {
                          background-color: white !important;
                          border-bottom: 1px solid #e5e7eb !important;
                          padding-top: 0.75rem;
                        }
                        .react-datepicker__current-month {
                          font-weight: 600;
                          color: #111827;
                          margin-bottom: 0.5rem;
                        }
                        .react-datepicker__day-name {
                          color: #6b7280;
                          font-weight: 500;
                          width: 2.5rem;
                          line-height: 2.5rem;
                        }
                        .react-datepicker__day {
                          width: 2.5rem;
                          line-height: 2.5rem;
                          margin: 0.125rem;
                          border-radius: 50%;
                          color: #111827;
                        }
                        .react-datepicker__day:hover {
                          border-radius: 50%;
                          background-color: #f3f4f6;
                        }
                        .react-datepicker__day--selected,
                        .react-datepicker__day--keyboard-selected {
                          background-color: #2A6B28 !important;
                          color: white !important;
                          border-radius: 50%;
                        }
                        .react-datepicker__day--today {
                          font-weight: 600;
                        }
                        .react-datepicker__navigation {
                          top: 1rem;
                        }
                        .react-datepicker__navigation-icon::before {
                          border-color: #6b7280;
                        }
                      `}</style>
                      <DatePicker
                        selected={deliveryInfo?.selectedDate || null}
                        onChange={handleDatePickerChange}
                        minDate={new Date()}
                        inline
                        calendarClassName="!border-0 !shadow-none"
                        className="w-full"
                      />
                    </div>
                  </>
                )}

                <h3 className="text-base font-semibold text-gray-900 mb-3 mt-4">Time Slot</h3>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => handleTimeSlotSelect(slot)}
                      className={`px-1.5 py-1.5 rounded-xl text-[12px] font-medium transition-colors ${
                        selectedTimeSlot === slot
                          ? 'bg-[#2A6B28] text-white'
                          : 'bg-white text-gray-700 border border-gray-200'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery Details */}
              <div className="bg-white rounded-[25px] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">Delivery Details</h3>
                  <button
                    onClick={handleEditAddress}
                    className="text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <IoCreateOutline className="text-xl" />
                  </button>
                </div>
                {isLoadingAddress ? (
                  <p className="text-sm text-gray-500">Loading address...</p>
                ) : defaultAddress ? (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MdLocationOn className="text-[#2A6B28] text-lg" />
                      <span className="text-sm font-medium text-gray-900">{defaultAddress.type}</span>
                    </div>
                    <p className="text-sm text-gray-600 ml-7">{formatAddress(defaultAddress)}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">No address found</p>
                    <button
                      onClick={handleEditAddress}
                      className="text-sm text-[#2A6B28] font-medium hover:underline"
                    >
                      Add Address
                    </button>
            </div>
          )}
        </div>

              {/* Add Promo Code */}
              <div className="bg-white rounded-[25px] p-4 shadow-sm border-2 border-[#2A6B28]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FaTag className="text-[#2A6B28] text-lg" />
                    <span className="text-base font-medium text-gray-900">Add Promo Code</span>
                  </div>
                  <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <FaPlus className="text-[#2A6B28] text-lg" />
                  </button>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-[25px] p-4 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Delivery Fee</span>
                    <span>₹{deliveryFee}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Tax</span>
                    <span>₹{tax}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Surcharge</span>
                    <span>₹{surcharge}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-[#2A6B28]">₹{total.toLocaleString('en-IN')}</span>
                </div>
            </div>

              {/* Razorpay Payment Component - Hidden, triggered when shouldTriggerPayment is true */}
            {shouldTriggerPayment && razorpayOrderId && razorpayKey && (
              <div className="hidden" ref={paymentButtonRef}>
                <CartRazorpayPayment
                  razorpayOrderId={razorpayOrderId}
                  amount={razorpayAmount}
                  currency="INR"
                  razorpayKey={razorpayKey}
                  customerName={customerInfo.name}
                  customerEmail={customerInfo.email}
                  customerContact={customerInfo.contact}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  buttonText=""
                  disabled={isProcessingPayment}
                />
              </div>
            )}

              {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={isProcessingPayment}
                className="w-full bg-[#2A6B28] text-white py-4 rounded-[25px] text-base font-semibold hover:bg-[#1e5a1c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isProcessingPayment ? 'Processing...' : 'Checkout'}
            </button>
            </>
          )}
        </div>
      </div>
      <BottomNav />
          </div>
  );
};

export default Cart;
