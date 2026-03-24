import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { SEO } from '../components/SEO';

const Terms: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8f6f1] pb-24">
      <SEO
        title="Terms of Service — Genda Phool"
        description="Terms of Service for Genda Phool — fresh flower delivery in Jaipur."
        canonical="https://customerapp.mygendaphool.com/terms"
        noIndex
      />
      <div className="max-w-[800px] mx-auto">
        <div className="p-4 pt-6 sticky top-0 bg-[#f8f6f1] z-10 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
              aria-label="Go back"
            >
              <IoArrowBack size={24} />
            </button>
            <h1 className="text-2xl font-bold font-serif text-gray-900">Terms of Service</h1>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6 text-gray-700">
          <p className="text-sm text-gray-500">Last updated: March 2025</p>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h2>
            <p className="text-sm leading-relaxed">
              By accessing or using the Genda Phool application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Services</h2>
            <p className="text-sm leading-relaxed">
              Genda Phool provides fresh flower delivery and pooja item services in Jaipur. We reserve the right to modify, suspend, or discontinue any part of the service at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Orders and Payments</h2>
            <p className="text-sm leading-relaxed">
              All orders are subject to availability. Prices are inclusive of applicable taxes. Payment must be completed at the time of order. We reserve the right to cancel orders in case of pricing errors or unavailability.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Delivery</h2>
            <p className="text-sm leading-relaxed">
              Delivery is available within our service areas in Jaipur. Delivery times are estimates and may vary. We are not liable for delays caused by circumstances beyond our control.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Refunds and Cancellations</h2>
            <p className="text-sm leading-relaxed">
              Cancellations must be made before the order is dispatched. Refunds for eligible orders will be processed within 5–7 business days to the original payment method.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Contact</h2>
            <p className="text-sm leading-relaxed">
              For questions about these Terms, please contact us through the in-app support or reach out to our customer care team.
            </p>
          </section>

          <p className="text-xs text-gray-400 pt-4">
            These terms are governed by the laws of India. Disputes are subject to jurisdiction of courts in Jaipur, Rajasthan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Terms;
