import { useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { UniformPageHeader } from '../components/layout/UniformPageHeader';

const Privacy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom">
      <SEO
        title="Privacy Policy — Genda Phool"
        description="Privacy Policy for Genda Phool — how we collect, use, and protect your data."
        canonical="https://customerapp.mygendaphool.com/privacy"
        noIndex
      />
      <div className="max-w-[800px] mx-auto">
        <UniformPageHeader
          title="Privacy Policy"
          onBack={() => navigate(-1)}
          padYClassName="pt-6 pb-4"
          className="sticky top-0 z-10"
        />

        <div className="px-4 py-6 space-y-6 text-gray-700">
          <p className="text-sm text-gray-500">Last updated: March 2025</p>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">1. Information We Collect</h2>
            <p className="text-sm leading-relaxed">
              We collect information you provide directly: name, phone number, delivery address, and order history. We also collect usage data such as pages viewed and features used within the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">2. How We Use Your Information</h2>
            <p className="text-sm leading-relaxed">
              Your information is used to process and deliver orders, send order updates, improve our services, and communicate offers. We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">3. Data Storage and Security</h2>
            <p className="text-sm leading-relaxed">
              Your data is stored securely on servers located in India. We implement industry-standard security measures to protect your information from unauthorized access, disclosure, or loss.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">4. Cookies and Tracking</h2>
            <p className="text-sm leading-relaxed">
              We use analytics tools (including Meta Pixel) to understand how users interact with our app. This helps us improve the experience. You can opt out through your device settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">5. Your Rights (DPDP Act 2023)</h2>
            <p className="text-sm leading-relaxed">
              Under the Digital Personal Data Protection Act 2023, you have the right to access, correct, or erase your personal data. To exercise these rights, contact us through in-app support.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">6. Contact</h2>
            <p className="text-sm leading-relaxed">
              For privacy-related questions, please contact our Data Protection team through the in-app support section.
            </p>
          </section>

          <p className="text-xs text-gray-400 pt-4">
            This policy is governed by the laws of India, including the Information Technology Act 2000 and the Digital Personal Data Protection Act 2023.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
