import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { FaPaperPlane } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { supportService, TicketQuestion, PredefinedAnswers } from '../../services/support.service';
import { useFeatureTheme } from '../../context/FeatureThemeContext';
import { SettingsListSkeleton } from '../../components/common/PageSkeletons';
import {
  UNIFORM_PAGE_HEADER_BACK_BUTTON_CLASS,
  UNIFORM_PAGE_HEADER_TITLE_CLASS,
} from '../../components/layout/UniformPageHeader';

interface ChatMessage {
  id: string;
  type: 'question' | 'answer';
  content: string;
  questionId?: string;
  timestamp: Date;
}

const DAILY_ACCENT = '#FAA222';
const USER_ANSWER_GREEN = '#166534';

const TicketQuestionForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { feature, basePath: contextBasePath } = useFeatureTheme();
  const supportBasePath = location.pathname.startsWith('/gp-daily')
    ? '/gp-daily'
    : location.pathname.startsWith('/gp-store')
      ? '/gp-store'
      : contextBasePath;
  const isDailySupport =
    feature === 'gpDaily' || location.pathname.startsWith('/gp-daily');
  /** Progress + send use Daily orange vs Store green; user answer bubbles stay brand green. */
  const accentColor = isDailySupport ? DAILY_ACCENT : USER_ANSWER_GREEN;

  const progressActiveClass = useMemo(
    () => (isDailySupport ? 'bg-[#FAA222]' : 'bg-[#166534]'),
    [isDailySupport],
  );

  const orderId = searchParams.get('order_id');
  const orderNumber = searchParams.get('order_number');

  const [questions, setQuestions] = useState<TicketQuestion[]>([]);
  const [answers, setAnswers] = useState<PredefinedAnswers>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
    fetchQuestions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const fetchedQuestions = await supportService.getTicketQuestions();
      setQuestions(fetchedQuestions);
      
      // Add first question as a chat message
      if (fetchedQuestions.length > 0) {
        setChatMessages([{
          id: 'q-0',
          type: 'question',
          content: fetchedQuestions[0].question,
          questionId: fetchedQuestions[0].id,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: string, value: string, label: string) => {
    // Save answer
    const answerKey = questionId as keyof PredefinedAnswers;
    const updatedAnswers = {
      ...answers,
      [answerKey]: value
    };
    setAnswers(updatedAnswers);

    // Add answer as chat message
    setChatMessages(prev => [...prev, {
      id: `a-${Date.now()}`,
      type: 'answer',
      content: label,
      questionId: questionId,
      timestamp: new Date()
    }]);

    // Move to next question after a short delay, passing updated answers
    setTimeout(() => {
      moveToNextQuestion(updatedAnswers);
    }, 500);
  };

  const handleTextAnswerSend = () => {
    if (!textInput.trim()) return;

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const answerKey = currentQuestion.id as keyof PredefinedAnswers;
    const answerValue = textInput.trim();
    
    // Save answer
    const updatedAnswers = {
      ...answers,
      [answerKey]: answerValue
    };
    setAnswers(updatedAnswers);

    // Add answer as chat message
    setChatMessages(prev => [...prev, {
      id: `a-${Date.now()}`,
      type: 'answer',
      content: answerValue,
      questionId: currentQuestion.id,
      timestamp: new Date()
    }]);

    // Clear input
    setTextInput('');

    // Move to next question after a short delay, passing updated answers
    setTimeout(() => {
      moveToNextQuestion(updatedAnswers);
    }, 500);
  };

  const moveToNextQuestion = (updatedAnswers?: PredefinedAnswers) => {
    const answersToCheck = updatedAnswers || answers;
    
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      
      // Add next question as chat message
      const nextQuestion = questions[nextIndex];
      setChatMessages(prev => [...prev, {
        id: `q-${nextIndex}`,
        type: 'question',
        content: nextQuestion.question,
        questionId: nextQuestion.id,
        timestamp: new Date()
      }]);
    } else {
      // All questions answered, check and submit
      // Use the updated answers if provided, otherwise use current state
      const finalAnswers = updatedAnswers || answers;
      handleSubmit(finalAnswers);
    }
  };

  const handleSubmit = async (answersToSubmit?: PredefinedAnswers) => {
    if (!orderId) {
      toast.error('Order ID is missing');
      return;
    }

    // Use provided answers or current state
    const finalAnswers = answersToSubmit || answers;
    
    // Check if all required questions are answered
    const requiredAnswers = ['issue_type', 'affected_items', 'description', 'noticed_when'];
    const allAnswered = requiredAnswers.every(key => {
      const answer = finalAnswers[key as keyof PredefinedAnswers];
      return answer !== undefined && answer !== null && answer !== '';
    });

    if (!allAnswered) {
      console.log('Missing answers:', finalAnswers);
      console.log('Required:', requiredAnswers);
      // Wait a bit and try again with current state
      setTimeout(() => {
        const currentAnswers = answers;
        const retryAllAnswered = requiredAnswers.every(key => {
          const answer = currentAnswers[key as keyof PredefinedAnswers];
          return answer !== undefined && answer !== null && answer !== '';
        });
        if (retryAllAnswered) {
          handleSubmit(currentAnswers);
        }
      }, 200);
      return;
    }

    try {
      setSubmitting(true);
      const ticket = await supportService.createTicket(parseInt(orderId), finalAnswers);
      
      if (ticket) {
        // Navigate to chat screen
        navigate(
          `${supportBasePath}/customer-support/chat?ticket=${ticket.ticket_number}`,
        );
      } else {
        toast.error('Failed to create ticket. Please try again.');
        setSubmitting(false);
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return <SettingsListSkeleton />;
  }

  if (!orderId || !orderNumber) {
    return (
      <div className="min-h-screen bg-[#f8f6f1] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Order information is missing</p>
          <button
            onClick={() => navigate(`${supportBasePath}/customer-support`)}
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
      <div className="min-h-screen bg-[#f8f6f1] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No questions available</p>
          <button
            onClick={() => navigate(`${supportBasePath}/customer-support`)}
            className="px-4 py-2 bg-[#166534] text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id as keyof PredefinedAnswers] : '';

  // Calculate bottom offset for input bar based on options
  const hasOptions = !submitting && currentQuestion && !currentAnswer && currentQuestion.type === 'choice' && currentQuestion.options;
  const optionsCount = hasOptions && currentQuestion.options ? currentQuestion.options.length : 0;
  const optionsHeight = optionsCount * 40 + 16; // Approximate height per option + padding
  const inputBarHeight = 80;
  const totalBottomHeight = (hasOptions ? optionsHeight : 0) + inputBarHeight;

  return (
    <div className="fixed inset-0 bg-[#f8f6f1] flex flex-col overflow-hidden">
      <div className="max-w-[800px] mx-auto w-full h-full flex flex-col relative">
        {/* Header */}
        <div className="p-4 pt-6 flex-shrink-0 bg-[#f8f6f1] z-10">
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => navigate(`${supportBasePath}/customer-support`)}
              className={[
                UNIFORM_PAGE_HEADER_BACK_BUTTON_CLASS,
                isDailySupport ? "text-[#FAA222]" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <IoArrowBack size={24} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className={UNIFORM_PAGE_HEADER_TITLE_CLASS}>Support Request</h1>
              <p className="text-sm text-gray-600">Order: {orderNumber}</p>
            </div>
          </div>
          {/* Progress indicator */}
          <div className="flex gap-2 mt-4">
            {questions.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-1.5 rounded-full ${
                  index <= currentQuestionIndex ? progressActiveClass : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {currentQuestionIndex + 1} of {questions.length} questions
          </p>
        </div>

        {/* Chat Messages - Scrollable area */}
        <div 
          className="flex-1 px-4 py-4 overflow-y-auto min-h-0"
          style={{ paddingBottom: `${totalBottomHeight}px` }}
        >
          <div className="space-y-4">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'question' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl p-4 ${
                    message.type === 'question' ? 'bg-gray-200 text-gray-900' : 'text-white'
                  }`}
                  style={
                    message.type === 'answer'
                      ? { backgroundColor: USER_ANSWER_GREEN }
                      : undefined
                  }
                >
                  <p className="text-base whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {submitting && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-900 rounded-2xl p-4">
                  <p className="text-base">Creating your support ticket...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Choice Options - Fixed above input bar */}
        {/* Bottom Container (Options + Input) */}
{!submitting && currentQuestion && !currentAnswer && (
  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 max-w-[800px] mx-auto">

    {/* Choice Options */}
    {currentQuestion.type === 'choice' && currentQuestion.options && (
      <div className="px-4 py-3 bg-[#f8f6f1]">
        <div className="space-y-2">
          {currentQuestion.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                handleAnswerSelect(currentQuestion.id, option.value, option.label)
              }
              className={`w-full text-center p-2 rounded-lg border border-gray-200 bg-white transition-colors text-sm ${
                isDailySupport
                  ? 'hover:border-amber-400 hover:bg-amber-50/80'
                  : 'hover:border-[#166534] hover:bg-green-50'
              }`}
            >
              <span className="font-medium text-gray-900">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Text Input */}
    <div className="p-3 bg-white">
      <div className="flex gap-2 items-end">
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleTextAnswerSend();
            }
          }}
          placeholder={
            currentQuestion.type === 'choice'
              ? "Or type your answer..."
              : currentQuestion.placeholder || "Type your answer..."
          }
          className={`flex-1 h-12 p-2 border border-gray-300 rounded-xl focus:outline-none resize-none bg-gray-50 text-sm ${
            isDailySupport ? 'focus:border-amber-500' : 'focus:border-[#166534]'
          }`}
          rows={1}
        />
        <button
          type="button"
          onClick={handleTextAnswerSend}
          disabled={!textInput.trim()}
          className="p-2.5 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 hover:opacity-90"
          style={{ backgroundColor: accentColor }}
        >
          <FaPaperPlane size={16} />
        </button>
      </div>
    </div>
  </div>
)}

      
      </div>
    </div>
  );
};

export default TicketQuestionForm;
