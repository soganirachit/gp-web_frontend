import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { useFeatureTheme } from '../../context/FeatureThemeContext';
import { faqService, FAQ as FAQItem } from '../../services/faq.service';
import Spinner from '../../components/common/Spinner';

interface FAQSection {
  title: string;
  category: string;
  faqs: FAQItem[];
}

const FAQ: React.FC = () => {
  const navigate = useNavigate();
  const [expandedFAQ, setExpandedFAQ] = useState<string>('');
  const [faqSections, setFaqSections] = useState<FAQSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useFeatureTheme();

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        setIsLoading(true);
        const faqs = await faqService.getAllFaqs();
        
        // Group FAQs by category
        const categoryMap = new Map<string, FAQItem[]>();
        
        faqs.forEach(faq => {
          const category = faq.category_display || faq.category;
          if (!categoryMap.has(category)) {
            categoryMap.set(category, []);
          }
          categoryMap.get(category)!.push(faq);
        });
        
        // Convert to sections array and sort by category
        const sections: FAQSection[] = Array.from(categoryMap.entries())
          .map(([category, faqs]) => ({
            title: category,
            category: category.toLowerCase(),
            faqs: faqs.sort((a, b) => a.sort_order - b.sort_order)
          }))
          .sort((a, b) => a.title.localeCompare(b.title));
        
        setFaqSections(sections);
        
        // Expand first FAQ if available
        if (sections.length > 0 && sections[0].faqs.length > 0) {
          setExpandedFAQ(`faq-${sections[0].faqs[0].id}`);
        }
      } catch (error) {
        console.error('Error loading FAQs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFAQs();
  }, []);

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? '' : id);
  };

  return (
    <div className="min-h-screen bg-[#f8f6f1] pb-24">
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
          {isLoading ? (
            <div className="min-h-[400px] flex items-center justify-center bg-[#f8f6f1]">
              <Spinner size={400} />
            </div>
          ) : faqSections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No FAQs available at the moment.</p>
            </div>
          ) : (
            faqSections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-1 h-6 rounded-full"
                    style={{ backgroundColor: theme.colors.primary }}
                  ></div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {section.title}
                  </h2>
                </div>

                {/* FAQ Items */}
                <div className="space-y-2">
                  {section.faqs.map((faq) => {
                    const faqId = `faq-${faq.id}`;
                    const isExpanded = expandedFAQ === faqId;
                    return (
                      <div
                        key={faq.id}
                        className="bg-white rounded-lg shadow-sm overflow-hidden"
                      >
                        <button
                          onClick={() => toggleFAQ(faqId)}
                          className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="flex-1 text-sm font-medium text-gray-800 pr-3">
                            {faq.question}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isExpanded ? (
                              <img src={theme.assets.faqUpIcon} alt="Up" className="w-4 h-4 flex-shrink-0" />
                            ) : (
                              <img src={theme.assets.faqIcon} alt="FAQ" className="w-4 h-4 flex-shrink-0" />
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FAQ;

