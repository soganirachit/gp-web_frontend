import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { toast } from 'react-hot-toast';
import { subscriptionService } from "../../../services/subscription.service";
import alertIcon from '../../../assets/svg/cancelpage/alert.svg';
import {
  SUBSCRIPTION_CANCELLATION_TIMING_BODY,
  SUBSCRIPTION_CANCELLATION_TIMING_TITLE,
} from '../../../utils/subscriptionCancellationPolicy';

const CancelSubscriptionReason: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [additionalFeedback, setAdditionalFeedback] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    const subscription = location.state?.subscription;

    const reasons = [
        "Too expensive",
        "Poor quality flowers",
        "Delivery issues",
        "Moving to different location",
        "Temporary pause needed",
        "Found better alternative"
    ];

    const handleSubmit = async () => {
        if (!subscription) {
            toast.error("No subscription found to cancel");
            return;
        }

        try {
            setIsCancelling(true);
            const fullReason = selectedReason + (additionalFeedback ? ` - ${additionalFeedback}` : "");

            await subscriptionService.cancelSubscription(subscription.id, fullReason);

            navigate('/gp-daily/cancel-subscription-success', {
                state: {
                    subscription,
                    cancellationDate: new Date().toISOString()
                }
            });
        } catch (error: any) {
            console.error("Cancellation failed", error);
            toast.error(error.message || "Failed to cancel subscription. Please try again.");
        } finally {
            setIsCancelling(false);
        }
    };

    return (
        <div className="bg-[#f8f6f1] min-h-screen pb-nav-bottom">
            <div className="max-w-[800px] mx-auto px-4">

                {/* Navbar */}
                <div className="pt-4 flex items-center gap-3 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="hover:bg-gray-100/50 rounded-full p-2 transition-colors -ml-2"
                    >
                        <IoArrowBack className="text-xl text-gray-800" />
                    </button>
                    <h1 className="text-xl font-serif font-bold text-gray-900">Cancel Subscription</h1>
                </div>

                {/* Warning Banner */}
                <div className="bg-[#FFEFEF] border border-[#FFD6D6] rounded-[20px] p-4 mb-6 flex gap-3 items-start">
                    <div className="flex-shrink-0 mt-0.5">
                        <img src={alertIcon} alt="Low Balance" className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[#D32F2F] text-sm leading-tight font-semibold mb-2">
                            {SUBSCRIPTION_CANCELLATION_TIMING_TITLE}
                        </p>
                        <p className="text-[#D32F2F] text-sm leading-relaxed font-medium">
                            {SUBSCRIPTION_CANCELLATION_TIMING_BODY}
                        </p>
                        <p className="text-[#D32F2F] text-sm leading-relaxed mt-3">
                            Your subscription will be cancelled and you won&apos;t receive further deliveries after the applicable cutoff above.
                        </p>
                    </div>
                </div>

                {/* White Card Content */}
                <div className="bg-white rounded-[24px] p-6 shadow-sm mb-6">

                    <div className="mb-6">
                        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Help us improve</h2>
                        <p className="text-gray-500 text-sm">
                            Please let us know why you're cancelling so we can serve you better in the future.
                        </p>
                    </div>

                    <div className="space-y-5 mb-8">
                        {reasons.map((reason) => (
                            <label
                                key={reason}
                                className="flex items-center gap-3 cursor-pointer group"
                            >
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${selectedReason === reason
                                    ? 'border-[#FAA222]'
                                    : 'border-orange-200'
                                    }`}>
                                    {selectedReason === reason && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#FAA222]" />
                                    )}
                                </div>
                                <input
                                    type="radio"
                                    name="cancelReason"
                                    value={reason}
                                    checked={selectedReason === reason}
                                    onChange={(e) => setSelectedReason(e.target.value)}
                                    className="hidden"
                                />
                                <span className={`text-base ${selectedReason === reason ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                                    {reason}
                                </span>
                            </label>
                        ))}
                    </div>

                    <div className="mb-4">
                        <h3 className="text-base font-medium text-gray-700 mb-2">Additional feedback (optional)</h3>
                        <textarea
                            value={additionalFeedback}
                            onChange={(e) => setAdditionalFeedback(e.target.value)}
                            placeholder="Tell us more about your experience..."
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#FAA222]/50 min-h-[120px] resize-none text-gray-700 placeholder-gray-400"
                        />
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-4 pb-2">
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedReason || isCancelling}
                        className="flex-1 py-4 rounded-[18px] font-medium text-sm transition-colors border border-gray-200 bg-[#F9F9F9] text-gray-500 hover:bg-gray-100 disabled:opacity-70"
                    >
                        {isCancelling ? "Cancelling..." : "Cancel Subscription"}
                    </button>
                    <button
                        onClick={() => navigate('/gp-daily/manage-my-subscription')}
                        disabled={isCancelling}
                        className="flex-1 py-4 rounded-[18px] bg-[#FAA222] text-gray-900 font-semibold text-sm hover:bg-[#E8911F] transition-colors shadow-sm disabled:opacity-70"
                    >
                        Keep Subscription
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CancelSubscriptionReason;
