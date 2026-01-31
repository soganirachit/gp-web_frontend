import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import BottomNavigation from '../../layout/BottomNav';
import { format } from 'date-fns';
// Importing assets
import vectorBadge from '../../../assets/All/Vector (1).png';
import cancelIcon from '../../../assets/svg/cancelpage/cancel..svg';
import blackFlowerIcon from '../../../assets/svg/cancelpage/blackflower.svg';

const CancelSubscriptionSuccess: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Subscription info passed from previous page
    const subscription = location.state?.subscription;
    const cancellationDateStr = location.state?.cancellationDate;

    // Fallback data if accessed directly/testing
    const subData = {
        name: subscription?.productDetails?.name || "Rudra Pack",
        price: subscription?.amount || 249,
        cancelledOn: cancellationDateStr ? new Date(cancellationDateStr) : new Date(),
        lastDelivery: subscription?.endDate ? new Date(subscription.endDate) : new Date(Date.now() - 86400000)
    };

    return (
        <div className="min-h-screen bg-[#FFFBEB] flex flex-col pb-20 font-sans">
            <div className="max-w-[500px] w-full mx-auto flex-1 flex flex-col px-4 pt-8">

                {/* Top Success Card */}
                <div className="p-8 mb-4 text-center relative overflow-hidden">

                    {/* Icon Container */}
                    <div className="relative w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className="relative w-full h-full"
                        >
                            <img src={vectorBadge} alt="Badge" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <img src={cancelIcon} alt="Cancelled" className="w-12 h-12" />
                            </div>
                        </motion.div>
                    </div>

                    <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3 font-serif">
                        Subscription Cancelled
                    </h1>

                    <p className="text-[#666666] text-sm leading-relaxed max-w-xs mx-auto">
                        Your subscription has been successfully cancelled. No further charges will be applied.
                    </p>
                </div>

                {/* Cancellation Details Card */}
                <div className="bg-white rounded-[24px] p-6 shadow-sm mb-8">
                    <h2 className="text-left text-lg font-semibold text-gray-900 mb-6">Cancellation Details</h2>

                    {/* Product & Price */}
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-gray-900 text-lg">{subData.name} x1</span>
                        <span className="font-bold text-gray-900 text-lg">₹{subData.price}</span>
                    </div>

                    <div className="border-b border-gray-100 mb-4"></div>

                    {/* Dates */}
                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-[#888888]">Cancelled on:</span>
                            <span className="text-sm font-medium text-gray-900">{format(subData.cancelledOn, 'MM/dd/yyyy')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-[#888888]">Last delivery:</span>
                            <span className="text-sm font-medium text-gray-900">{format(subData.lastDelivery, 'MM/dd/yyyy')}</span>
                        </div>
                    </div>

                    <div className="border-b border-gray-100 mb-4"></div>

                    <p className="text-xs text-[#888888] text-center">
                        You won't be charged from now on.
                    </p>
                </div>

                {/* Next Steps Section */}
                <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 font-serif">
                        What would you like to do next?
                    </h3>

                    <button
                        onClick={() => navigate('/gp-daily/Products')}
                        className="w-full h-[50px] bg-[#FAA222] text-gray-900 py-4 rounded-[20px] font-semibold shadow-sm hover:bg-[#E8911F] flex items-center justify-center gap-3 transition-transform active:scale-95"
                    >
                        <img src={blackFlowerIcon} alt="" className="w-8 h-8 opacity-80" />
                        Explore Other Packs
                    </button>
                </div>

            </div>

            <BottomNavigation />
        </div>
    );
};

export default CancelSubscriptionSuccess;
