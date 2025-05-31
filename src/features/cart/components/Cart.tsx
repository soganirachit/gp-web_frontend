import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FaTimes, FaPlus, FaMinus } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  description?: string;
  category?: string;
}

interface CartProps {
  items: CartItem[];
  showCart: boolean;
  setShowCart: (show: boolean) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
}

const CART_STORAGE_KEY = 'gendaphool_cart';

const Cart: React.FC<CartProps> = ({
  items,
  showCart,
  setShowCart,
  updateQuantity,
  removeFromCart
}) => {
  const navigate = useNavigate();
  const { isLoggedIn, phoneNumber } = useAuth();

  // Load cart items from localStorage when component mounts
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      // Update cart items in parent component if they exist in localStorage
      if (parsedCart.length > 0 && items.length === 0) {
        parsedCart.forEach((item: CartItem) => {
          updateQuantity(item.id, item.quantity);
        });
      }
    }
  }, []);

  // Save cart items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Calculate total price of items in cart
  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = () => {
    if (!isLoggedIn) {
      navigate('/login');
      setShowCart(false);
      return;
    }

    // Save cart data to localStorage before navigation
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(`cartTotal_${phoneNumber}`, getTotalPrice().toString());
    navigate('/orders');
    setShowCart(false);
  };

  if (!showCart) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-opacity-50 z-50"
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl"
      >
        <div className="p-4 flex justify-between items-center border-b">
          <h2 className="text-xl font-semibold font-bitter">Your Cart</h2>
          <button
            onClick={() => setShowCart(false)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {!isLoggedIn ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4 font-bitter">Please log in to view your cart</p>
              <button
                onClick={() => {
                  navigate('/login');
                  setShowCart(false);
                }}
                className="bg-green-800 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-bitter"
              >
                Log In
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-gray-500 font-bitter">Your cart is empty</p>
          ) : (
            <div className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="flex items-center space-x-4 bg-white p-3 rounded-lg shadow-sm">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium font-bitter text-gray-800">{item.name}</h3>
                    <p className="text-green-800 font-bold font-bitter">₹{item.price}</p>
                    <div className="flex items-center mt-2 bg-gray-50 rounded-lg w-fit">
                      <button
                        onClick={() => {
                          const newQuantity = Math.max(1, item.quantity - 1);
                          updateQuantity(item.id, newQuantity);
                        }}
                        className="p-2 text-green-800 hover:bg-gray-100 rounded-l-lg transition-colors"
                      >
                        <FaMinus size={12} />
                      </button>
                      <span className="px-6 py-1 font-medium font-bitter text-gray-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-2 text-green-800 hover:bg-gray-100 rounded-r-lg transition-colors"
                      >
                        <FaPlus size={12} />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-all"
                  >
                    <FaTimes />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && isLoggedIn && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium font-bitter text-gray-800">Total:</span>
              <span className="text-xl font-bold font-bitter text-green-800">₹{getTotalPrice()}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full bg-green-800 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-bitter flex items-center justify-center space-x-2"
            >
              <span>Proceed to Checkout</span>
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Cart;
