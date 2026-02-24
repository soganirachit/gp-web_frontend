import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import BottomNavigation from '../../components/layout/BottomNav';
import { supportService, TicketQuestion, PredefinedAnswers } from '../../services/support.service';
import { useFeatureTheme } from '../../context/FeatureThemeContext';
import Spinner from '../../components/common/Spinner';

const TicketQuestionForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { feature } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';

  const orderId = searchParams.get('order_id');
  const orderNumber = searchParams.get('order_number');

  const [questions, setQuestions] = useState<TicketQuestion[]>([]);
  const [answers, setAnswers] = useState<PredefinedAnswers>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const fetchedQuestions = await supportService.getTicketQuestions();
      // Sort by order field
      const sortedQuestions = fetchedQuestions.sort((a, b) => a.order - b.order);
      setQuestions(sortedQuestions);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    // Map question to answer key based on question text
    const questionText = question.question_text.toLowerCase();
    let answerKey: keyof PredefinedAnswers;

    if (questionText.includes('type of issue') || questionText.includes('issue type')) {
      answerKey = 'issue_type';
    } else if (questionText.includes('item') && questionText.includes('affected')) {
      answerKey = 'affected_items';
    } else if (questionText.includes('describe') || questionText.includes('problem')) {
      answerKey = 'description'; // API uses "description" not "problem_description"
    } else if (questionText.includes('notice') || questionText.includes('when')) {
      answerKey = 'noticed_when';
    } else {
      // Fallback: use question ID or order
      answerKey = 'issue_type'; // Default fallback
    }

    setAnswers(prev => ({
      ...prev,
      [answerKey]: value
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!orderId) {
      alert('Order ID is missing');
      return;
    }

    // Validate all questions are answered
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const questionText = currentQuestion.question_text.toLowerCase();
    let answerKey: keyof PredefinedAnswers;
    
    if (questionText.includes('type of issue') || questionText.includes('issue type')) {
      answerKey = 'issue_type';
    } else if (questionText.includes('item') && questionText.includes('affected')) {
      answerKey = 'affected_items';
    } else if (questionText.includes('describe') || questionText.includes('problem')) {
      answerKey = 'problem_description';
    } else if (questionText.includes('notice') || questionText.includes('when')) {
      answerKey = 'noticed_when';
    } else {
      answerKey = 'issue_type';
    }

    if (!answers[answerKey]) {
      alert('Please answer this question before submitting');
      return;
    }

    // Check if all required questions are answered
    const requiredAnswers = ['issue_type', 'affected_items', 'description', 'noticed_when'];
    const allAnswered = requiredAnswers.every(key => answers[key as keyof PredefinedAnswers]);

    if (!allAnswered) {
      alert('Please answer all questions before submitting');
      return;
    }

    try {
      setSubmitting(true);
      const ticket = await supportService.createTicket(parseInt(orderId), answers);
      
      if (ticket) {
        // Navigate to chat screen
        navigate(`${basePath}/customer-support/chat?ticket=${ticket.ticket_number}`);
      } else {
        alert('Failed to create ticket. Please try again.');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFBEB] flex items-center justify-center">
        <Spinner size={400} />
      </div>
    );
  }

  if (!orderId || !orderNumber) {
    return (
      <div className="min-h-screen bg-[#FFFBEB] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Order information is missing</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-[#166534] text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFFBEB] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No questions available</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-[#166534] text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const questionText = currentQuestion.question_text.toLowerCase();
  let answerKey: keyof PredefinedAnswers;
  
  if (questionText.includes('type of issue') || questionText.includes('issue type')) {
    answerKey = 'issue_type';
  } else if (questionText.includes('item') && questionText.includes('affected')) {
    answerKey = 'affected_items';
  } else if (questionText.includes('describe') || questionText.includes('problem')) {
    answerKey = 'description'; // API uses "description" not "problem_description"
  } else if (questionText.includes('notice') || questionText.includes('when')) {
    answerKey = 'noticed_when';
  } else {
    answerKey = 'issue_type';
  }

  const currentAnswer = answers[answerKey] || '';

  return (
    <div className="min-h-screen bg-[#FFFBEB] flex flex-col">
      <div className="max-w-[800px] mx-auto w-full flex flex-col flex-1">
        {/* Header */}
        <div className="p-4 pt-6 sticky top-0 bg-[#FFFBEB] z-10">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <IoArrowBack size={24} />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">Support Request</h1>
              <p className="text-sm text-gray-600">Order: {orderNumber}</p>
            </div>
          </div>
          {/* Progress indicator */}
          <div className="flex gap-2 mt-4">
            {questions.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-2 rounded-full ${
                  index === currentQuestionIndex
                    ? 'bg-[#166534]'
                    : index < currentQuestionIndex
                    ? 'bg-green-400'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>

        {/* Question Form */}
        <div className="flex-1 px-4 pb-24 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 shadow-sm mt-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {currentQuestion.question_text}
            </h2>

            {currentQuestion.question_type === 'choice' && currentQuestion.choices ? (
              <div className="space-y-3">
                {currentQuestion.choices.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => handleAnswerChange(currentQuestion.id, choice)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                      currentAnswer === choice
                        ? 'border-[#166534] bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium text-gray-900">{choice}</span>
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="Type your answer here..."
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#166534] resize-none"
                rows={6}
              />
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
          <div className="flex gap-3">
            {currentQuestionIndex > 0 && (
              <button
                onClick={handlePrevious}
                className="flex-1 py-3 px-4 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Previous
              </button>
            )}
            {currentQuestionIndex < questions.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!currentAnswer}
                className="flex-1 py-3 px-4 bg-[#166534] text-white rounded-xl font-semibold hover:bg-[#145028] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!currentAnswer || submitting}
                className="flex-1 py-3 px-4 bg-[#166534] text-white rounded-xl font-semibold hover:bg-[#145028] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="sticky bottom-0 z-20">
          <BottomNavigation />
        </div>
      </div>
    </div>
  );
};

export default TicketQuestionForm;

