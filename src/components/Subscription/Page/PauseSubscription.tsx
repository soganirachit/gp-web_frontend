import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { BsCalendar4 } from 'react-icons/bs';
import { IoNotifications } from 'react-icons/io5'; // Using notification bell as alert
import { toast } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';
import { subscriptionService } from '../../../services/subscription.service';
import pausebell from '../../../assets/svg/cancelpage/pausebell.svg';

const PauseSubscription: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const subscription = location.state?.subscription;

    const [resumeDate, setResumeDate] = useState<Date | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Redirect if no subscription data
    React.useEffect(() => {
        if (!subscription) {
            navigate('/gp-daily/manage-my-subscription');
        }
    }, [subscription, navigate]);

    const handleConfirmPause = async () => {
        if (!subscription || !resumeDate) return;

        try {
            setIsSubmitting(true);

            // Calculate days to pause
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const selectedDate = new Date(resumeDate);
            selectedDate.setHours(0, 0, 0, 0);

            const diffTime = selectedDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 1) {
                toast.error("Resume date must be in the future");
                setIsSubmitting(false);
                return;
            }

            // Call API
            const response = await subscriptionService.pauseSubscription(subscription.id, diffDays);

            if (response.success) {
                navigate('/gp-daily/subscription-paused', {
                    state: {
                        resumeDate: selectedDate.toISOString()
                    }
                });
            } else {
                toast.error(response.error || "Failed to pause subscription");
            }
        } catch (error: any) {
            console.error("Pause Error:", error);
            toast.error(error.message || "An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!subscription) return null;

    return (
        <div className="min-h-screen bg-[#f8f6f1] flex flex-col pb-20 font-sans">
            <div className="max-w-[800px] mx-auto px-4">
                {/* Header */}
                <div className="pt-4 px-4 flex items-center gap-3 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="hover:bg-gray-100/50 rounded-full p-2 transition-colors -ml-2"
                    >
                        <IoArrowBack className="text-xl text-gray-800" />
                    </button>
                    <h1 className="text-xl font-serif font-bold text-gray-900">Pause Subscription</h1>
                </div>

                <div className="max-w-[800px] mx-auto px-4 flex-1">
                    {/* Product Card */}
                    <div className="bg-white rounded-[24px] p-6 shadow-sm mb-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-1">{subscription.productDetails?.name || "Product Name"}</h2>
                        <p className="text-gray-500 text-sm mb-1">
                            {subscription.type === 'DAILY' ? 'Daily delivery' : 'Custom delivery'} - ₹{subscription.amount || 0}/Pack
                        </p>
                        <p className="text-gray-400 text-xs">
                            Next delivery: Tomorrow 7:00 AM
                        </p>
                    </div>

                    {/* Date Picker Section */}
                    <div className="mb-6">
                        <label className="block text-base font-bold text-gray-900 mb-3">Resume delivery from</label>
                        <div className="relative">
                            <DatePicker
                                selected={resumeDate}
                                onChange={(date) => setResumeDate(date)}
                                minDate={new Date(new Date().setDate(new Date().getDate() + 1))} // Min date tomorrow
                                placeholderText="mm/dd/yyyy"
                                dateFormat="MM/dd/yyyy"
                                className="w-full bg-white border border-gray-200 rounded-[16px] py-3.5 pl-4 pr-10 text-gray-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all font-medium"
                                wrapperClassName="w-full"
                            />
                            <BsCalendar4 className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-900 text-lg pointer-events-none" />
                        </div>
                    </div>

                    {/* Warning Banner */}
                    <div className="bg-[#FFF4E5] rounded-[16px] p-4 mb-8 flex gap-3 items-center">
                        <div className="flex-shrink-0 text-[#FF9800]">
                            <img src={pausebell} alt="Pause Bell" className="w-7 h-7" />
                        </div>
                        <p className="text-[#5A4A3A] text-sm font-semibold leading-relaxed">
                            Pause before 12:00 AM to avoid next day's delivery!
                        </p>
                    </div>

                    {/* Info Section */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 font-serif">Important Information</h3>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-2 text-gray-500 text-sm">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                                <span>You can pause your subscription for up to 30 days</span>
                            </li>
                            <li className="flex items-start gap-2 text-gray-500 text-sm">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                                <span>No charges will be applied during the pause period</span>
                            </li>
                            <li className="flex items-start gap-2 text-gray-500 text-sm">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                                <span>Your subscription will automatically resume on the selected date</span>
                            </li>
                            <li className="flex items-start gap-2 text-gray-500 text-sm">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                                <span>You can modify or cancel the pause anytime before resumption</span>
                            </li>
                        </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 mt-auto">
                        <button
                            onClick={handleConfirmPause}
                            disabled={!resumeDate || isSubmitting}
                            className="flex-1 py-3.5 rounded-[16px] border border-gray-200 bg-white text-gray-600 font-medium text-sm hover:bg-gray-50 disabled:opacity-50"
                        >
                            {isSubmitting ? "Confirming..." : "Confirm"}
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="flex-1 py-3.5 rounded-[16px] bg-[#FF5E5E] text-white font-medium text-sm hover:bg-[#E54545] shadow-sm shadow-red-200"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PauseSubscription;
