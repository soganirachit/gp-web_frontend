import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaMinus, FaPlus, FaCheck } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { walletService } from '../../../services/wallet.service';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  description: string;
}

interface DayInfo {
  day: string;
  isSelected: boolean;
  quantity: number;
}

const OrderManagement: React.FC = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedDays, setSelectedDays] = useState<DayInfo[]>([
    { day: 'SUNDAY', isSelected: false, quantity: 1 },
    { day: 'MONDAY', isSelected: true, quantity: 1 },
    { day: 'TUESDAY', isSelected: true, quantity: 1 },
    { day: 'WEDNESDAY', isSelected: true, quantity: 1 },
    { day: 'THURSDAY', isSelected: true, quantity: 1 },
    { day: 'FRIDAY', isSelected: true, quantity: 1 },
    { day: 'SATURDAY', isSelected: false, quantity: 1 },
  ]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [startDate] = useState('14th Mar 2025');
  const [showInsufficientBalanceModal, setShowInsufficientBalanceModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    const savedItems = localStorage.getItem('cartItems');
    if (savedItems) {
      const items = JSON.parse(savedItems);
      setCartItems(items);
      calculateTotal(items);
    }
  }, []);

  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const { balance } = await walletService.getWalletBalance();
        setWalletBalance(balance);
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
      }
    };

    fetchWalletBalance();
  }, []);

  const calculateTotal = (items: CartItem[]) => {
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setTotalAmount(total);
  };

  const handleDaySelection = (index: number) => {
    setSelectedDays(prev => prev.map((day, i) => 
      i === index ? { ...day, isSelected: !day.isSelected } : day
    ));
  };

  const handleDayQuantityChange = (index: number, increment: boolean) => {
    setSelectedDays(prev => prev.map((day, i) => {
      if (i === index) {
        const newQuantity = increment ? day.quantity + 1 : Math.max(1, day.quantity - 1);
        return { ...day, quantity: newQuantity };
      }
      return day;
    }));
  };

  const handlePayment = async () => {
    try {
      setIsProcessingPayment(true);
      
      const selectedCount = selectedDays.filter(day => day.isSelected).length;
      if (selectedCount === 0) {
        toast.error('Please select at least one delivery day');
        return;
      }

      if (walletBalance < totalAmount) {
        setShowInsufficientBalanceModal(true);
        return;
      }

      try {

        setWalletBalance(prev => prev - totalAmount);
        
        const orderDetails = {
          items: cartItems,
          selectedDays: selectedDays.filter(day => day.isSelected),
          totalAmount,
          startDate,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('currentOrder', JSON.stringify(orderDetails));

        const daysText = selectedDays
          .filter(day => day.isSelected)
          .map(day => day.day)
          .join(', ');

        setSuccessMessage(
          `Your weekly subscription will start from ${startDate} on: ${daysText}`
        );
        setShowSuccessModal(true);
      } catch (error) {
        toast.error('Failed to process payment');
      }

    } catch (error) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const InsufficientBalanceModal = () => (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="bg-white rounded-xl p-6 m-4 max-w-md w-full"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
        >
          <h3 className="text-xl font-semibold mb-4">Insufficient Balance</h3>
          <div className="bg-orange-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between mb-2">
              <span>Order Amount:</span>
              <span className="font-semibold">₹{totalAmount}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Wallet Balance:</span>
              <span className="font-semibold">₹{walletBalance}</span>
            </div>
            <div className="border-t border-orange-200 my-2" />
            <div className="flex justify-between text-red-500">
              <span>Required Amount:</span>
              <span className="font-semibold">₹{totalAmount - walletBalance}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowInsufficientBalanceModal(false)}
              className="flex-1 py-3 border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setShowInsufficientBalanceModal(false);
                navigate('/wallet');
              }}
              className="flex-1 bg-green-500 text-white py-3 rounded-lg"
            >
              Recharge Wallet
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <motion.div 
      className="min-h-screen  p-4 relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div className="flex items-center gap-4 mb-6">
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)} 
          className="text-black"
        >
          <FaArrowLeft size={20} />
        </motion.button>
        <h1 className="text-xl font-semibold">Your Order</h1>
      </motion.div>

      <motion.div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        {cartItems.map((item) => (
          <motion.div 
            key={item.id} 
            className="flex gap-4 items-center mb-4 last:mb-0"
            whileHover={{ scale: 1.01 }}
          >
            <motion.img 
              src={item.image} 
              alt={item.name}
              className="w-20 h-20 rounded-lg object-cover"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            />
            <div className="flex-1">
              <h3 className="font-medium text-base mb-1">{item.name}</h3>
              <p className="text-gray-600 text-xs mb-2 line-clamp-1">{item.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">₹{item.price}</span>
                <span className="text-sm font-medium">Qty: {item.quantity}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-medium text-lg mb-4">Delivery Schedule</h2>
        <div className="grid grid-cols-7 gap-2">
          {selectedDays.map((day, index) => (
            <div key={day.day} className="flex flex-col items-center">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleDaySelection(index)}
                className={`w-full p-2 rounded-lg flex flex-col items-center justify-center transition-all ${
                  day.isSelected 
                    ? 'bg-green-50 border-2 border-green-500 text-green-700' 
                    : 'bg-gray-50 border border-gray-200 text-gray-600'
                }`}
              >
                <span className="text-xs font-medium">{day.day.slice(0, 2)}</span>
                {day.isSelected && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1"
                  />
                )}
              </motion.button>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t pt-4">
          <h3 className="font-medium text-base mb-3">Quantity per Day</h3>
          {selectedDays.map((day, index) => (
            day.isSelected && (
              <div key={day.day} className="flex items-center justify-between py-2">
                <span className="font-medium">{day.day}</span>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleDayQuantityChange(index, false)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                  >
                    <FaMinus size={12} />
                  </button>
                  <span className="font-medium w-6 text-center">{day.quantity}</span>
                  <button
                    onClick={() => handleDayQuantityChange(index, true)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                  >
                    <FaPlus size={12} />
                  </button>
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-20">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Starting from</span>
          <span className="font-medium">{startDate}</span>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <span className="text-2xl font-bold">₹{totalAmount}</span>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePayment}
            disabled={isProcessingPayment}
            className="bg-green-500 text-white px-8 py-3 rounded-xl font-medium shadow-sm"
          >
            {isProcessingPayment ? 'Processing...' : 'Confirm Order'}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showSuccessModal && (
          <motion.div 
            className="fixed inset-0 bg-green-500/90 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: 1, 
                rotate: 0,
                transition: {
                  type: "spring",
                  duration: 0.8,
                  bounce: 0.4
                }
              }}
              exit={{ scale: 0, rotate: 180 }}
              className="relative"
            >
              <motion.div 
                className="absolute -inset-4"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
                style={{
                  background: "radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%)"
                }}
              />
              <motion.div 
                className="bg-white rounded-2xl p-8 shadow-2xl relative overflow-hidden"
                initial={{ y: 60 }}
                animate={{ y: 0 }}
              >
                <motion.div 
                  className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 1,
                    ease: "easeOut"
                  }}
                >
                  <FaCheck className="text-green-500 text-4xl" />
                </motion.div>
                <motion.h3 
                  className="text-2xl font-bold mb-4 text-green-800"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Order Confirmed!
                </motion.h3>
                <motion.p 
                  className="text-gray-600 mb-8"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {successMessage}
                </motion.p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowSuccessModal(false);
                    navigate('/');
                  }}
                  className="w-full bg-green-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  Continue Shopping
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showInsufficientBalanceModal && <InsufficientBalanceModal />}
    </motion.div>
  );
};

export default OrderManagement;
