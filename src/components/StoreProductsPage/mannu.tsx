import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { FaArrowLeft } from "react-icons/fa";
import { IoArrowBack } from "react-icons/io5";
import Spinner from "../../components/common/Spinner";
import { orderService } from "@/services/order.service";

interface Order {
  id: string;
  orderId: string;
  productId: string[];
  product: {
    id: string;
    name: string;
    description: string;
    imagesUrl: string[];
    isDaily: boolean;
    isStore: boolean;
    productId: string;
    sellingPrice: number;
  };
  quantity: number;
  status: "SCHEDULED" | "CANCELLED";
  createdAt: string;
}

const ManageMyStoreProducts: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, []);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);

      const fetchedOrders = await orderService.getOrdersByCustomerId();

      if (fetchedOrders && fetchedOrders.length > 0) {
        // Sort orders by creation date, newest first
        const sortedOrders = fetchedOrders.sort((a: Order, b: Order) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setOrders(sortedOrders);
      } else {
        setOrders([]);
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderOrderCard = (order: Order) => {
    const formattedDate = format(new Date(order.createdAt), 'dd MMM yyyy, HH:mm');
    const isScheduled = order.status === "SCHEDULED";
    const isCancelled = order.status === "CANCELLED";

    return (
      <div
        key={order.id}
        className="bg-white rounded-[16px] p-4 mb-3 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
            {order.product.imagesUrl && order.product.imagesUrl.length > 0 ? (
              <img
                src={order.product.imagesUrl[0]}
                alt={order.product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <span className="text-xl font-medium text-gray-400">
                  {order.product.name?.charAt(0) || "M"}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-medium text-[#1A1A1A] truncate">
                    {order.product.name}
                  </h3>
                  {isCancelled && (
                    <span className="px-2 py-0.5 bg-[#FFE9E9] text-[#B00020] text-xs font-medium rounded-full">
                      Cancelled
                    </span>
                  )}
                  {isScheduled && (
                    <span className="px-2 py-0.5 bg-[#E6F4FF] text-[#0288D1] text-xs font-medium rounded-full">
                      Scheduled
                    </span>
                  )}
                </div>
                <p className="text-[#666666] text-sm">
                  Order ID: {order.orderId}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15.8333 3.33337H4.16667C3.24619 3.33337 2.5 4.07957 2.5 5.00004V16.6667C2.5 17.5872 3.24619 18.3334 4.16667 18.3334H15.8333C16.7538 18.3334 17.5 17.5872 17.5 16.6667V5.00004C17.5 4.07957 16.7538 3.33337 15.8333 3.33337Z"
                  stroke="#666666"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.3333 1.66663V4.99996"
                  stroke="#666666"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6.66669 1.66663V4.99996"
                  stroke="#666666"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2.5 8.33337H17.5"
                  stroke="#666666"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-[#666666] text-xs">Date: {formattedDate}</p>
            </div>

            <p className="text-[#FF5722] font-medium text-sm mb-3">
              ₹{order.product.sellingPrice} × {order.quantity}
            </p>

            <div className="flex gap-2">
              {isScheduled && (
                <button
                  onClick={() => {
                    navigate(`/order-details/${order.id}`);
                  }}
                  className="px-3 py-1.5 bg-[#F5F5F5] text-[#1A1A1A] text-sm font-medium rounded-[8px]"
                >
                  View Details
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={400} />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFFBEB]">
        <div className="max-w-md mx-auto p-4">
          <div className="flex items-center mb-6">
            <button onClick={() => navigate(-1)} className="text-gray-600">
              <FaArrowLeft className="text-xl" />
            </button>
            <h1 className="ml-4 text-xl font-semibold">My Orders</h1>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm text-center">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h2 className="text-xl font-semibold mb-2">No Orders</h2>
            <p className="text-gray-600 mb-6">
              You don't have any orders yet. Place an order to get started.
            </p>
            <button
              onClick={() => navigate("/store")}
              className="bg-green-600 text-white py-3 px-6 rounded-lg font-medium"
            >
              Browse Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBEB]">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <IoArrowBack className="text-xl md:text-2xl" />
            </button>
            <h1 className="text-xl md:text-2xl font-medium">
              My Orders
            </h1>
          </div>
        </div>

        <div className="p-4">
          {/* SCHEDULED Orders */}
          {orders.some((order) => order.status === "SCHEDULED") && (
            <>
              <h2 className="text-lg font-medium mb-3">Scheduled Orders</h2>
              {orders
                .filter((order) => order.status === "SCHEDULED")
                .map(renderOrderCard)}
            </>
          )}

          {/* CANCELLED Orders */}
          {orders.some((order) => order.status === "CANCELLED") && (
            <>
              <h2 className="text-lg font-medium mt-6 mb-3">
                Cancelled Orders
              </h2>
              {orders
                .filter((order) => order.status === "CANCELLED")
                .map(renderOrderCard)}
            </>
          )}
        </div>
      </div>
    </div>
  );
                        } 

export default ManageMyStoreProducts;
