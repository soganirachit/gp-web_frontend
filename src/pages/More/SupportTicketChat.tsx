import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { FaPaperPlane, FaImage, FaPhone, FaUser } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import BottomNavigation from '../../components/layout/BottomNav';
import { supportService, SupportTicketDetail, SupportMessage } from '../../services/support.service';
import { orderService } from '../../services/order.service';
import { format } from 'date-fns';
import Spinner from '../../components/common/Spinner';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { useFeatureTheme } from '../../context/FeatureThemeContext';

const SupportTicketChat: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { feature } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';

  const ticketNumber = searchParams.get('ticket');

  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [requestingAgent, setRequestingAgent] = useState(false);
  const [requestingCallback, setRequestingCallback] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);
  const [showCloseTicketModal, setShowCloseTicketModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ticketNumber) {
      fetchTicketDetails();
    } else {
      // If no ticket number, redirect to support page
      navigate(`${basePath}/customer-support`);
    }
  }, [ticketNumber]);



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      if (ticketNumber) {
        const ticketData = await supportService.getTicketDetails(ticketNumber);
        if (ticketData) {
          setTicket(ticketData);
          setMessages(ticketData.messages || []);

          // Fetch order details if order_number exists
          if (ticketData.order_number) {
            try {
              const order = await orderService.getOrderByOrderNumber(ticketData.order_number);
              setOrderDetails(order);
            } catch (error) {
              console.error('Error fetching order details:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !ticketNumber) return;

    try {
      setSending(true);

      const message = await supportService.addMessage(
        ticketNumber,
        newMessage.trim() || undefined,
        selectedImage || undefined
      );

      if (message) {
        setMessages(prev => [...prev, message]);
        setNewMessage('');
        setSelectedImage(null);
        setImagePreview(null);

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // ✅ Scroll ONLY after sending
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleRequestAgent = async () => {
    if (!ticketNumber) return;

    try {
      setRequestingAgent(true);
      const success = await supportService.requestAgent(ticketNumber);
      if (success) {
        toast.success('Agent request sent successfully. An agent will contact you soon.');
        // await fetchTicketDetails(); // Refresh to update agent_requested status
      } else {
        toast.error('Failed to request agent. Please try again.');
      }
    } catch (error) {
      console.error('Error requesting agent:', error);
      toast.error('Failed to request agent. Please try again.');
    } finally {
      setRequestingAgent(false);
    }
  };

  const handleRequestCallback = async () => {
    if (!ticketNumber) return;

    try {
      setRequestingCallback(true);
      const success = await supportService.requestCallback(ticketNumber);
      if (success) {
        toast.success('Callback request sent successfully. We will call you soon.');
        await fetchTicketDetails(); // Refresh to update callback_requested status
      } else {
        toast.error('Failed to request callback. Please try again.');
      }
    } catch (error) {
      console.error('Error requesting callback:', error);
      toast.error('Failed to request callback. Please try again.');
    } finally {
      setRequestingCallback(false);
    }
  };

  const handleCloseTicketClick = () => {
    setShowCloseTicketModal(true);
  };

  const handleCloseTicketConfirm = async () => {
    if (!ticketNumber) return;
    setShowCloseTicketModal(false);

    try {
      setClosingTicket(true);
      const success = await supportService.updateTicketStatus(ticketNumber, 'closed');
      if (success) {
        toast.success('Ticket closed successfully.');
        await fetchTicketDetails(); // Refresh to update status
      } else {
        toast.error('Failed to close ticket. Please try again.');
      }
    } catch (error) {
      console.error('Error closing ticket:', error);
      toast.error('Failed to close ticket. Please try again.');
    } finally {
      setClosingTicket(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        date: format(date, 'MMM d'),
        time: format(date, 'h:mm a'),
      };
    } catch {
      return { date: dateString, time: '' };
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#f8f6f1] flex items-center justify-center z-50">
        <Spinner size={400} />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#f8f6f1] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Ticket not found</p>
          <button
            onClick={() => navigate(`${basePath}/customer-support`)}
            className="px-4 py-2 bg-[#166534] text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#f8f6f1] flex flex-col overflow-hidden">
      <div className="max-w-[800px] mx-auto w-full flex flex-col flex-1">
        {/* Header */}
        <div className="p-0 pt-6 sticky top-0 bg-[#f8f6f1] z-10">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <IoArrowBack size={24} />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">
                {ticket?.subject || 'Support Ticket'}
              </h1>
              {ticket?.order_number && (
                <p className="text-sm text-gray-600">Order: {ticket.order_number}</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons - Request Agent/Callback */}
        {ticket && ticket.status !== 'closed' && (
          <div className="px-4 py-3  mb-2">
            <div className="flex gap-2">
              {/* {!ticket.agent_requested && (
                <button
                  onClick={handleRequestAgent}
                  disabled={requestingAgent}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#166534] text-white rounded-xl font-semibold hover:bg-[#145028] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <FaUser size={16} />
                  {requestingAgent ? 'Requesting...' : 'Request Agent'}
                </button>
              )} */}
              {!ticket.callback_requested && (
                <button
                  onClick={handleRequestCallback}         // ← was missing
                  disabled={requestingCallback}           // ← was missing
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#FCFBF8] border border-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-[#F5F5F5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm leading-none"
                >
                  <FaPhone size={14} className="rotate-90 align-middle" />
                  {requestingCallback ? 'Requesting...' : 'Request Callback'}
                </button>
              )}
              {ticket.status !== 'closed' && (
                <button
                  onClick={handleCloseTicketClick}
                  disabled={closingTicket}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5  bg-[#FCFBF8] text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {closingTicket ? 'Closing...' : 'Close'}
                </button>
              )}
            </div>
            {(ticket.agent_requested || ticket.callback_requested) && (
              <div className="mt-2 text-xs text-gray-600">
                {ticket.agent_requested && <p>✓ Agent requested</p>}
                {ticket.callback_requested && <p>✓ Callback requested</p>}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 px-4 overflow-y-auto pb-[140px]">
          {ticket && (
            <div className="mb-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-sm text-gray-700 space-y-2">
                  {ticket.description?.split('\n').map((line, index) => {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex > -1) {
                      // Extract label and value parts
                      const label = line.substring(0, colonIndex + 1); // include colon
                      const value = line.substring(colonIndex + 1).trim();

                      return (
                        <p key={index}>
                          <span className="font-semibold">{label}</span> {value}
                        </p>
                      );
                    }
                    // If no colon, just render line normally
                    return <p key={index}>{line}</p>;
                  })}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${ticket.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                    ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      ticket.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                    {ticket.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    Created: {formatDate(ticket.created_at)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages
              .filter((message) => message.message !== ticket.description)
              .map((message) => {
                const isInternal = message.is_internal;
                const dateTime = formatDateTime(message.created_at);

                return (
                  <div
                    key={message.id}
                    className={`flex ${isInternal ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-[75%] rounded-2xl p-3 ${isInternal
                      ? 'bg-gray-200 text-gray-900'
                      : 'bg-[#166534] text-white'
                      }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      <div className={`flex items-center gap-2 mt-2 ${isInternal ? 'text-gray-600' : 'text-white/80'
                        }`}>
                        <span className="text-xs">
                          {message.created_by_name}
                        </span>
                        <span className="text-xs">
                          {dateTime.time}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        {ticket && ticket.status !== 'closed' && (
          <div className="fixed bottom-[70px] left-0 right-0 bg-white border-t border-gray-200 p-4 z-30">
            {/* Image Preview */}
            {imagePreview && (
              <div className="mb-3 relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-xl border border-gray-300"
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex gap-3 items-end">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                disabled={sending || !ticketNumber}
              >
                <FaImage size={18} />
              </button>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-[#166534] resize-none"
                rows={1}
                disabled={sending || !ticketNumber}
              />
              <button
                onClick={handleSendMessage}
                disabled={(!newMessage.trim() && !selectedImage) || sending || !ticketNumber}
                className="p-3 bg-[#166534] text-white rounded-xl hover:bg-[#145028] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaPaperPlane size={18} />
              </button>
            </div>
          </div>
        )}

        {ticket && ticket.status === 'closed' && (
          <div className="sticky bottom-0 bg-gray-100 border-t border-gray-200 p-4 text-center">
            <p className="text-gray-600 text-sm">This ticket is closed. You cannot send new messages.</p>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-20">
          <BottomNavigation />
        </div>
      </div>

      {/* Close Ticket Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCloseTicketModal}
        title="Close Ticket"
        message="Are you sure you want to close this ticket?"
        confirmText="Yes, Close"
        cancelText="Cancel"
        onConfirm={handleCloseTicketConfirm}
        onCancel={() => setShowCloseTicketModal(false)}
        confirmButtonColor="#DC2626"
      />
    </div>
  );
};

const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
  } catch {
    return dateString;
  }
};

export default SupportTicketChat;


