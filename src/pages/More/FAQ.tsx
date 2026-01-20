import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import faqIcon from '../../assets/svg/faq.svg';
import faqUpIcon from '../../assets/svg/faqup.svg';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  faqs: FAQItem[];
}

const FAQ: React.FC = () => {
  const navigate = useNavigate();
  const [expandedFAQ, setExpandedFAQ] = useState<string>('faq-1-1'); // First FAQ expanded by default

  const faqSections: FAQSection[] = [
    {
      title: 'Subscription Packs & Orders',
      faqs: [
        {
          id: 'faq-1-1',
          question: 'What is the Free Trial Pack Offer? (Code: GPFREE)',
          answer: 'As a promotional offer Genda Phool offers the first delivery (*Applicable only for Puja Flowers Subscription Packs) as free of cost to our first time subscribers. Our Subscription services are post paid and the bill is raised at the last day of the month. Only the amount of successful deliveries will be charged to the customer and the payment needs to be made through our website via our secured payment gateway provider. The Customer doesn\'t have to place a separate order for Subscription. **The maximum discount applicable is Rs. 25/-** If the customer is unhappy with the service or product, they can cancel their subscription anytime. There is no additional fee or hidden charges for Genda Phool Daily Subscription! Simple and straight! Try our Brahma pack today:'
        },
        {
          id: 'faq-1-2',
          question: 'Does Genda Phool Deliver on Sunday?',
          answer: 'Yes, Genda Phool delivers on Sundays as well. We ensure consistent delivery service throughout the week to meet your subscription needs.'
        },
        {
          id: 'faq-1-3',
          question: 'Do you accept cash payment?',
          answer: 'Currently, we accept payments through our secure online payment gateway. Cash on delivery may be available in select areas. Please check during checkout for available payment options.'
        },
        {
          id: 'faq-1-4',
          question: 'How can I pause my Subscription?',
          answer: 'You can pause your subscription anytime through your account dashboard. Navigate to "Manage Subscription" and select the pause option. You can resume it whenever you\'re ready.'
        },
        {
          id: 'faq-1-5',
          question: 'Will subscription include the bill for the days I don\'t wish to take the flowers?',
          answer: 'No, you will only be charged for successful deliveries. If you pause your subscription or skip deliveries, you will not be billed for those days.'
        },
        {
          id: 'faq-1-6',
          question: 'What time does Genda Phool deliver its daily subscription pack?',
          answer: 'Delivery times may vary based on your location, but we typically deliver in the morning hours. Exact delivery time will be communicated to you at the time of subscription setup.'
        },
        {
          id: 'faq-1-7',
          question: 'When will I get my bill?',
          answer: 'Bills are generated at the end of each month. You will receive your bill on the last day of the month through email and can also view it in your account dashboard.'
        },
        {
          id: 'faq-1-8',
          question: 'Do you provide on specific days with ongoing subscription?',
          answer: 'Yes, you can customize your delivery days based on your subscription plan. You can select specific days of the week for delivery during the subscription setup.'
        },
        {
          id: 'faq-1-9',
          question: 'Do you provide alternate day delivery?',
          answer: 'Yes, alternate day delivery options are available. You can choose this option during subscription setup or modify your existing subscription to include alternate day delivery.'
        },
        {
          id: 'faq-1-10',
          question: 'Does the Genda Phool Daily Subscription service include extra or additional delivery fees?',
          answer: 'No, there are no additional delivery fees for Genda Phool Daily Subscription service. The subscription price includes all delivery charges.'
        },
        {
          id: 'faq-1-11',
          question: 'Can I pay in advance?',
          answer: 'Currently, our subscription service operates on a post-paid basis. Bills are generated at the end of the month for successful deliveries. Advance payment options may be available in the future.'
        }
      ]
    },
    {
      title: 'Product & Quality',
      faqs: [
        {
          id: 'faq-2-1',
          question: 'What types of flowers do you offer?',
          answer: 'We offer a wide variety of fresh flowers including Puja Flowers and Exotic Flowers. Our collection includes marigolds, roses, lilies, and many more seasonal varieties.'
        },
        {
          id: 'faq-2-2',
          question: 'How do you ensure flower freshness?',
          answer: 'We source our flowers directly from growers and deliver them fresh to your doorstep. Our flowers are carefully packed and handled to maintain their freshness throughout the delivery process.'
        }
      ]
    }
  ];

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? '' : id);
  };

  return (
    <div className="min-h-screen bg-[#FFFBEB] pb-24">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="px-4 pt-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <IoArrowBack className="text-xl" />
          </button>
          <h1 className="text-xl font-semibold">FAQs</h1>
        </div>

        {/* FAQ Sections */}
        <div className="px-4 py-6 space-y-8">
          {faqSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              {/* Section Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-[#FAA222] rounded-full"></div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {section.title}
                </h2>
              </div>

              {/* FAQ Items */}
              <div className="space-y-2">
                {section.faqs.map((faq) => {
                  const isExpanded = expandedFAQ === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className="bg-white rounded-lg shadow-sm overflow-hidden"
                    >
                      <button
                        onClick={() => toggleFAQ(faq.id)}
                        className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="flex-1 text-sm font-medium text-gray-800 pr-3">
                          {faq.question}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isExpanded ? (
                            <img src={faqUpIcon} alt="Up" className="w-4 h-4 flex-shrink-0" />
                          ) : (
                            <img src={faqIcon} alt="FAQ" className="w-4 h-4 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="px-4 pb-4">
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                              {faq.answer}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FAQ;

