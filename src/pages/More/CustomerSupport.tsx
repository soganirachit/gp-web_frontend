import React, { useState, useEffect } from "react";
import { FaPhoneAlt, FaRegCommentDots, FaPaperPlane } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import walletImage from "../../assets/icon/Wallet.png";
import profileImage from "../../assets/icon/Profile.png";
import BottomNav from "../../components/layout/BottomNav";
import { IoArrowBack } from "react-icons/io5";
import { submitSupportRequest } from "@/services/customer.service";
import { orderService } from "@/services/order.service";

const CustomerSupport: React.FC = () => {
  const navigate = useNavigate();
  const [requestType, setRequestType] = useState("PAYMENT_ISSUES");
  const [message, setMessage] = useState("");
  const [selectOrders, setSelectOrders] = useState("");
  const token = localStorage.getItem("token");

  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await orderService.getOrdersByCustomerId();
        setOrders(data); // Replaced dummy orders with actual fetched data
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      }
    };

    fetchOrders();
  }, []);

  const handleChatSupport = () => {
    // Implement chat support functionality
  };

  const handleCallSupport = () => {
    // Implement call support functionality
    window.location.href = "tel:+91982812293";
  };

  const handleSubmitRequest = async () => {
    if (!message.trim() || message.trim().length < 10) {
      alert("Please write at least 10 characters in your message.");
      return;
    }
    const payload = {
      requestCategory: requestType,
      description: message.trim(),
      orderId: selectOrders || undefined,
      attachments: [],
    };
    await submitSupportRequest(
      payload,
      token || "",
      setMessage,
      setRequestType
    );
  };

  type Order = {
    id: string; // UUID — internal use only
    orderId: string;
    createdAt: string;
    status: string;
    productId: string[];
    quantity: number;
    product: {
      id: string;
      name: string;
      description: string;
      sellingPrice: number;
      productId: string;
      imagesUrl: string[];
      category: string;
      isDaily: boolean;
      isStore: boolean;
    };
  };

  // Check if the selected order has a product with isStore flag true
  const selectedOrder = orders.find(order => order.orderId === selectOrders);
  const isCallButtonEnabled = selectedOrder && selectedOrder.product.isStore;

  return (
    <div className="bg-[#FFFBEB] min-h-screen">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        {/* <div className="p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <IoArrowBack className="text-xl md:text-2xl" />
            </button>
            <h1 className="text-xl md:text-2xl font-medium">
              Request & Support
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <img
              src={walletImage}
              alt="Wallet"
              className="w-10 h-10 md:w-10 md:h-10"
              onClick={() => navigate("/wallet")}
            />
            <img
              src={profileImage}
              alt="Profile"
              className="w-6 h-6 md:w-8 md:h-8"
              onClick={() => navigate("/account")}
            />
          </div>
        </div> */}

        {/* Raise a New Request */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6 mx-4 md:mx-6">
          <h2 className="text-lg md:text-xl font-medium mb-4">
            Raise a New Request
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm md:text-base text-gray-600">
                Orders
              </label>
              {orders.length > 0 ? (
                <select
                  value={selectOrders}
                  onChange={(e) => setSelectOrders(e.target.value)}
                  className="w-full p-2 md:p-3 border-b-2 border-gray-200 focus:outline-none focus:border-orange-500 mt-1 text-base md:text-lg"
                >
                  <option value="">Select an order</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.orderId}>
                      {order.orderId}
                    </option>
                  ))}
                </select>
              ) : (
                <p>No previous orders found.</p>
              )}
            </div>
            <div>
              <label className="text-sm md:text-base text-gray-600">
                Request Type
              </label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="w-full p-2 md:p-3 border-b-2 border-gray-200 focus:outline-none focus:border-orange-500 mt-1 text-base md:text-lg"
              >
                <option value="MISSED_DELIVERY">MISSED_DELIVERY</option>
                <option value="DAMAGED_PRODUCTS"> Product Issue</option>
                <option value="PAYMENT_ISSUES">Account Issue</option>
                <option value="OTHERS">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm md:text-base text-gray-600">
                Your Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-2 md:p-3 border-b-2 border-gray-200 focus:outline-none focus:border-orange-500 mt-1 text-base md:text-lg"
                placeholder="Please describe your issue or request..."
                rows={4}
              />
            </div>
            <button
              onClick={handleSubmitRequest}
              className="w-full bg-orange-500 text-white py-3 md:py-4 rounded-full font-medium flex items-center justify-center gap-2 shadow-md hover:bg-orange-600 transition-colors"
            >
              <FaPaperPlane className="text-lg md:text-xl" />
              Submit Request
            </button>
          </div>

        {/* Support Options */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6 mx-4 md:mx-6">
          <h2 className="text-lg md:text-xl font-medium mb-4">
            How can we help you?
          </h2>
          <div className="flex flex-col gap-4">
            {/* <button
              onClick={handleChatSupport}
              className="flex-1 bg-orange-500 text-white py-3 md:py-4 rounded-full font-medium flex items-center justify-center gap-2 shadow-md hover:bg-orange-600 transition-colors"
            >
              <FaRegCommentDots className="text-lg md:text-xl" />
              Chat with Support
            </button> */}
            <button
              onClick={handleCallSupport}
              disabled={!isCallButtonEnabled}
              className={`flex-1 border border-gray-300 py-3 md:py-4 rounded-full font-medium flex items-center justify-center gap-2 shadow-md transition-colors ${
                isCallButtonEnabled
                  ? 'text-gray-700 hover:bg-gray-50 cursor-pointer'
                  : 'text-gray-400 cursor-not-allowed opacity-50'
              }`}
            >
              <FaPhoneAlt className="text-lg md:text-xl" />
              Call Support
            </button>
            {!isCallButtonEnabled && (
              <p className="text-sm text-gray-500 text-center">
                Please select an order to enable call support
              </p>
            )}
          </div>
        </div>
        </div>

        {/* Your Requests */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6 mx-4 md:mx-6 mb-6">
          <h2 className="text-lg md:text-xl font-medium mb-4">Your Requests</h2>
          <div className="space-y-4">
            {orders.length > 0 ? (
              orders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg p-4 md:p-5 shadow-sm">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium text-gray-800 text-base md:text-lg">
                      {order.orderId}
                    </h3>
                    <span className="text-sm md:text-base bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                      In Progress
                    </span>
                  </div>
                  <p className="text-sm md:text-base text-gray-600 mt-2">
                    Details for this order will be shown here.
                  </p>
                  <button className="text-sm md:text-base text-green-600 mt-2 hover:text-green-700">
                    View Details
                  </button>
                </div>
              ))
            ) : (
              <p>No support requests found.</p>
            )}
          </div>
        </div>
        {/* Navigation */}
        <div>
          <BottomNav />
        </div>
      </div>
    </div>
  );
};

export default CustomerSupport;