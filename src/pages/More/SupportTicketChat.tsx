import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { FaPaperPlane, FaImage, FaPhone, FaUser } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import {
  supportService,
  SupportTicketDetail,
  SupportMessage,
  getResolvedMessageImageUris,
  normalizeSupportStatus,
  formatSupportStatusLabel,
} from '../../services/support.service';
import { format } from 'date-fns';
import { SettingsListSkeleton } from '../../components/common/PageSkeletons';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { useFeatureTheme } from '../../context/FeatureThemeContext';
import {
  resolveSupportBackNavigation,
  type SupportNavState,
} from '../../utils/supportNavigation';
import { REQUIRED_TOAST } from '../../constants/requiredToastMessages';
import { useSupportChatWebSocket } from '../../hooks/useSupportChatWebSocket';

const MESSAGE_IMAGE_ROW = 200;
const MESSAGE_IMAGE_GAP = 2;

const CLOSED_SUPPORT_STATUSES = new Set([
  "closed",
  "close",
  "resolved",
  "solved",
  "cancelled",
  "canceled",
]);

function isSupportTicketClosedLike(statusNorm: string): boolean {
  return CLOSED_SUPPORT_STATUSES.has(statusNorm);
}

function supportStatusPillClass(statusNorm: string): string {
  if (
    statusNorm === "open" ||
    statusNorm === "pending" ||
    statusNorm === "new" ||
    statusNorm === "reopened" ||
    statusNorm === "awaiting_reply" ||
    statusNorm === "awaiting_customer" ||
    statusNorm === "active"
  ) {
    return "bg-yellow-100 text-yellow-800";
  }
  if (CLOSED_SUPPORT_STATUSES.has(statusNorm)) {
    return "bg-green-100 text-green-800";
  }
  if (
    statusNorm === "in_progress" ||
    statusNorm === "processing" ||
    statusNorm === "assigned" ||
    statusNorm === "working" ||
    statusNorm === "answered" ||
    statusNorm === "waiting_on_customer"
  ) {
    return "bg-blue-100 text-blue-800";
  }
  return "bg-gray-100 text-gray-800";
}

type ImageGalleryState = { uris: string[]; index: number } | null;

function ImageLightbox({
  gallery,
  onClose,
}: {
  gallery: { uris: string[]; index: number };
  onClose: () => void;
}) {
  const uris = gallery.uris;
  const len = uris.length;
  const [index, setIndex] = useState(gallery.index);

  useEffect(() => {
    setIndex(gallery.index);
  }, [gallery.index, gallery.uris.join('|')]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(len - 1, i + 1));
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [len, onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/95"
      role="dialog"
      aria-modal
      aria-label="Image viewer"
    >
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between p-3 text-white">
        <span className="text-sm font-medium" aria-live="polite">
          {index + 1} / {len}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-2xl leading-none text-white hover:bg-white/10"
        >
          ×
        </button>
      </div>
      <div
        className="flex min-h-0 flex-1 cursor-zoom-out items-center justify-center p-4 pt-14"
        onClick={onClose}
        role="presentation"
      >
        <img
          src={uris[index]}
          alt=""
          className="max-h-full max-w-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="flex justify-center gap-6 pb-6">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="text-sm font-medium text-white/90 disabled:opacity-30"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={index >= len - 1}
          onClick={() => setIndex((i) => Math.min(len - 1, i + 1))}
          className="text-sm font-medium text-white/90 disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}

type AttachmentGridProps = {
  uris: string[];
  onOpen: (i: number, all: string[]) => void;
};

function MessageAttachmentGrid({ uris, onOpen }: AttachmentGridProps) {
  if (uris.length === 0) return null;
  if (uris.length === 1) {
    return (
      <button
        type="button"
        onClick={() => onOpen(0, uris)}
        className="relative w-full cursor-zoom-in overflow-hidden rounded-lg bg-gray-200"
        style={{ height: MESSAGE_IMAGE_ROW, maxWidth: '100%' }}
        aria-label="View attachment"
      >
        <img
          src={uris[0]}
          alt=""
          className="h-full w-full object-cover"
        />
      </button>
    );
  }
  const more = uris.length - 2;
  return (
    <div
      className="flex w-full min-w-0 overflow-hidden rounded-lg"
      style={{ height: MESSAGE_IMAGE_ROW, gap: MESSAGE_IMAGE_GAP }}
    >
      <button
        type="button"
        onClick={() => onOpen(0, uris)}
        className="h-full min-w-0 flex-1 cursor-zoom-in overflow-hidden bg-gray-200 p-0"
        aria-label="View first image"
      >
        <img src={uris[0]} alt="" className="h-full w-full object-cover" />
      </button>
      <button
        type="button"
        onClick={() => onOpen(1, uris)}
        className="relative h-full min-w-0 flex-1 cursor-zoom-in overflow-hidden bg-gray-200 p-0"
        aria-label="View gallery"
      >
        <img src={uris[1]} alt="" className="h-full w-full object-cover" />
        {more > 0 ? (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/40"
            aria-hidden
          >
            <span className="text-3xl font-bold text-white">+{more}</span>
          </div>
        ) : null}
      </button>
    </div>
  );
}

const SupportTicketChat: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { feature } = useFeatureTheme();
  const basePath = feature === 'gpStore' ? '/gp-store' : '/gp-daily';
  const isDailySupport = feature === 'gpDaily';
  /** App `SupportTicketDetailScreen` daily: #FFB043 bubble, #1a1a1a text, rgba(0,0,0,0.55) time. */
  const DAILY_SUPPORT_ORANGE = '#FFB043';
  const supportNavState = (location.state ?? {}) as SupportNavState;

  const ticketNumber = searchParams.get('ticket');

  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [imageGallery, setImageGallery] = useState<ImageGalleryState>(null);
  const [requestingAgent, setRequestingAgent] = useState(false);
  const [requestingCallback, setRequestingCallback] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);
  const [showCloseTicketModal, setShowCloseTicketModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accessToken] = useState(() => localStorage.getItem('access_token'));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSupportBack = (ticketClosed: boolean) => {
    const orderNum =
      ticket?.order_number ??
      searchParams.get('order_number') ??
      undefined;
    const { path, replace } = resolveSupportBackNavigation({
      returnTo: supportNavState.returnTo,
      orderNumber: orderNum,
      basePath,
      replace: ticketClosed,
      ticketClosed,
    });
    navigate(path, { replace });
  };

  useEffect(() => {
    if (ticketNumber) {
      fetchTicketDetails();
    } else {
      navigate(`${basePath}/customer-support`);
    }
  }, [ticketNumber]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [messages]);

  const appendIncomingMessage = useCallback((msg: SupportMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const fetchTicketDetails = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      if (ticketNumber) {
        const ticketData = await supportService.getTicketDetails(ticketNumber);
        if (ticketData) {
          setTicket(ticketData);
          setMessages(ticketData.messages || []);
        }
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useSupportChatWebSocket({
    enabled: Boolean(ticketNumber && ticket && !loading),
    ticketNumber,
    token: accessToken,
    onMessage: appendIncomingMessage,
    onStatusChange: (payload) => {
      setTicket((prev) =>
        prev ? { ...prev, status: payload.status } : prev,
      );
    },
  });

  /** Poll as fallback when WebSocket is unavailable (same pattern as admin panel). */
  useEffect(() => {
    if (!ticketNumber || loading) return;
    const id = window.setInterval(() => {
      void fetchTicketDetails(false);
    }, 10000);
    return () => window.clearInterval(id);
  }, [ticketNumber, loading]);

  const clearFilePreviews = (urls: string[]) => {
    for (const u of urls) {
      if (u.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(u);
        } catch {
          /* ignore */
        }
      }
    }
  };

  const handleAttachImageClick = async () => {
    const input = fileInputRef.current;
    if (!input) return;
    try {
      const pickerInput = input as HTMLInputElement & {
        showPicker?: () => Promise<void>;
      };
      if (typeof pickerInput.showPicker === 'function') {
        await pickerInput.showPicker();
      } else {
        input.click();
      }
    } catch (e: unknown) {
      const name = (e as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        toast.error(REQUIRED_TOAST.ALLOW_PHOTOS_SUPPORT);
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    const next: File[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      if (file.size > 5 * 1024 * 1024) {
        toast.error(REQUIRED_TOAST.IMAGE_UNDER_5MB);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      next.push(file);
    }
    setFilePreviewUrls((prev) => {
      clearFilePreviews(prev);
      return next.map((f) => URL.createObjectURL(f));
    });
    setSelectedFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePickedFiles = () => {
    clearFilePreviews(filePreviewUrls);
    setFilePreviewUrls([]);
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async () => {
    if (!ticketNumber) return;
    const messageText = newMessage.trim();
    if (!messageText && selectedFiles.length === 0) return;

    if (filePreviewUrls.length) {
      clearFilePreviews(filePreviewUrls);
    }
    setFilePreviewUrls([]);
    const toSend = [...selectedFiles];
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setNewMessage('');

    try {
      setSending(true);
      let allOk = true;
      if (toSend.length === 0) {
        const res = await supportService.addMessage(
          ticketNumber,
          messageText || undefined,
        );
        allOk = Boolean(res);
      } else {
        for (let i = 0; i < toSend.length; i++) {
          const piece = i === 0 ? messageText : '';
          const res = await supportService.addMessage(
            ticketNumber,
            piece || undefined,
            toSend[i],
          );
          if (!res) {
            allOk = false;
            break;
          }
        }
      }
      if (allOk) {
        await fetchTicketDetails(false);
        scrollToBottom();
      } else {
        toast.error('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
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
        toast.success('Agent requested. We’ll contact you soon.');
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
    return <SettingsListSkeleton />;
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#f8f6f1] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Ticket not found</p>
          <button
            onClick={() => handleSupportBack(true)}
            className={
              isDailySupport
                ? "px-4 py-2 bg-[#FFB043] text-[#222222] rounded-lg font-medium"
                : "px-4 py-2 bg-[#166534] text-white rounded-lg"
            }
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const ticketSt = normalizeSupportStatus(ticket.status);

  return (
    <div className="support-docked-shell">
      <div className="support-docked-inner">
        {/* Header — in flow so composer can sit directly above bottom nav */}
        <div className="z-20 shrink-0 bg-white shadow-sm">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start gap-3 mb-3">
              <button
                onClick={() => handleSupportBack(isSupportTicketClosedLike(ticketSt))}
                className="-ml-2 mr-3 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#374151] transition-colors hover:bg-gray-100"
                type="button"
                aria-label="Go back"
              >
                <IoArrowBack size={24} />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="font-ibm-plex-serif mb-1 text-[22px] font-semibold leading-7 tracking-normal text-[#111827]">
                  Support
                </h1>
                {ticket?.subject?.trim() ? (
                  <p
                    className="mt-0.5 text-xs font-medium text-gray-500 line-clamp-2"
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {ticket.subject.trim()}
                  </p>
                ) : null}
              </div>
            </div>
            
            {/* Action Buttons - Request Agent/Callback */}
            {ticket && !isSupportTicketClosedLike(ticketSt) && (
              <div className="flex gap-2 mb-2">
                {!ticket.callback_requested && (
                  <button
                    onClick={handleRequestCallback}
                    disabled={requestingCallback}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#FCFBF8] border border-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-[#F5F5F5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm leading-none"
                  >
                    <FaPhone size={14} className="rotate-90 align-middle" />
                    {requestingCallback ? 'Requesting...' : 'Request Callback'}
                  </button>
                )}
                {!isSupportTicketClosedLike(ticketSt) && (
                  <button
                    onClick={handleCloseTicketClick}
                    disabled={closingTicket}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#FCFBF8] text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {closingTicket ? 'Closing...' : 'Close'}
                  </button>
                )}
              </div>
            )}
            
            {/* Status Indicators */}
            {(ticket?.agent_requested || ticket?.callback_requested) && (
              <div className="flex flex-wrap gap-3 mt-2 text-xs">
                {ticket.agent_requested && (
                  <div className="flex items-center gap-1.5 text-green-600 font-medium">
                    <span className="text-green-500">✓</span>
                    <span>Agent requested</span>
                  </div>
                )}
                {ticket.callback_requested && (
                  <div className="flex items-center gap-1.5 text-green-600 font-medium">
                    <span className="text-green-500">✓</span>
                    <span>Callback requested</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Messages — scrollable; ends above composer */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-2">
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
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold ${supportStatusPillClass(ticketSt)}`}
                  >
                    {formatSupportStatusLabel(ticket.status)}
                  </span>
                  <span className="text-xs text-gray-500">
                    Created: {formatDate(ticket.created_at)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {messages
              .filter((message) => {
                if (message.is_internal === true) {
                  return false;
                }
                const descNorm = (ticket?.description ?? '')
                  .replace(/\r\n/g, '\n')
                  .trim();
                if (descNorm) {
                  const msgNorm = (message.message ?? '')
                    .replace(/\r\n/g, '\n')
                    .trim();
                  if (msgNorm === descNorm) return false;
                }
                const imageUris = getResolvedMessageImageUris(message);
                if (!message.message?.trim() && imageUris.length === 0) {
                  return false;
                }
                return true;
              })
              .sort((a, b) => {
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              })
              .map((message) => {
                const dateTime = formatDateTime(message.created_at);
                const imageUris = getResolvedMessageImageUris(message);
                const isUserMessage = message.is_from_customer === true;
                const userBubbleClasses =
                  isUserMessage && isDailySupport
                    ? `shadow-md text-[#1a1a1a]`
                    : isUserMessage
                      ? 'bg-gradient-to-br from-[#166534] to-[#145028] text-white shadow-md'
                      : 'bg-white text-gray-800 border border-gray-100 shadow-sm';
                const userBubbleStyle =
                  isUserMessage && isDailySupport
                    ? { backgroundColor: DAILY_SUPPORT_ORANGE }
                    : undefined;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isUserMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`w-fit max-w-[min(75%,20rem)] rounded-2xl px-3 py-2 shadow-sm transition-all ${userBubbleClasses}`}
                      style={userBubbleStyle}
                    >
                      <div className="flex flex-col gap-2">
                        {imageUris.length > 0 ? (
                          <MessageAttachmentGrid
                            uris={imageUris}
                            onOpen={(i, all) =>
                              setImageGallery({ uris: all, index: i })
                            }
                          />
                        ) : null}
                        {(message.message || imageUris.length > 0) && (
                          <div className="flex items-end gap-2">
                            {message.message ? (
                              <p
                                className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${
                                  isUserMessage && isDailySupport
                                    ? 'text-[#1a1a1a]'
                                    : isUserMessage
                                      ? 'text-white'
                                      : 'text-gray-800'
                                }`}
                              >
                                {message.message}
                              </p>
                            ) : null}
                            <span
                              className={`shrink-0 text-[10px] font-medium whitespace-nowrap ${
                                isUserMessage && isDailySupport
                                  ? 'text-[rgba(0,0,0,0.55)]'
                                  : isUserMessage
                                    ? 'text-white/80'
                                    : 'text-gray-500'
                              }`}
                            >
                              {dateTime.time}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input — docked above global bottom nav via parent height */}
        {ticket && !isSupportTicketClosedLike(ticketSt) && (
          <div className="support-composer-dock z-30 p-3 sm:p-4">
            {filePreviewUrls.length > 0 ? (
              <div className="mb-3">
                {filePreviewUrls.length === 1 ? (
                  <div className="relative inline-block">
                    <img
                      src={filePreviewUrls[0]}
                      alt="Preview"
                      className="h-32 w-32 rounded-xl border border-gray-300 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageGallery({
                          uris: [filePreviewUrls[0]],
                          index: 0,
                        });
                      }}
                      className="absolute inset-0 rounded-xl"
                      aria-label="View full size"
                    />
                    <button
                      type="button"
                      onClick={removePickedFiles}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div>
                    <MessageAttachmentGrid
                      uris={filePreviewUrls}
                      onOpen={(i, all) => setImageGallery({ uris: all, index: i })}
                    />
                    <div className="mt-2 text-right">
                      <button
                        type="button"
                        onClick={removePickedFiles}
                        className="text-sm font-medium text-amber-700 hover:text-gray-900"
                      >
                        Remove all
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex items-end gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => void handleAttachImageClick()}
                className="rounded-xl bg-gray-100 p-3 text-gray-700 transition-colors hover:bg-gray-200"
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
                    void handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                className={
                  isDailySupport
                    ? 'min-h-[44px] max-h-[min(7.5rem,28dvh)] flex-1 resize-none rounded-xl border border-gray-300 p-3 focus:border-[#FFB043] focus:outline-none'
                    : 'min-h-[44px] max-h-[min(7.5rem,28dvh)] flex-1 resize-none rounded-xl border border-gray-300 p-3 focus:border-[#166534] focus:outline-none'
                }
                rows={2}
                disabled={sending || !ticketNumber}
              />
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={
                  (!newMessage.trim() && selectedFiles.length === 0) ||
                  sending ||
                  !ticketNumber
                }
                className={
                  isDailySupport
                    ? 'rounded-xl bg-[#FFB043] p-3 text-[#222222] transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
                    : 'rounded-xl bg-[#166534] p-3 text-white transition-colors hover:bg-[#145028] disabled:cursor-not-allowed disabled:opacity-50'
                }
              >
                <FaPaperPlane size={18} />
              </button>
            </div>
          </div>
        )}

        {(ticket && isSupportTicketClosedLike(ticketSt)) && (
          <div className="support-composer-dock shrink-0 bg-gray-100 p-3 sm:p-4 text-center">
            <p className="text-gray-600 text-sm">
              This ticket is closed. You cannot send new messages.
            </p>
          </div>
        )}
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
      {imageGallery != null && imageGallery.uris.length > 0 ? (
        <ImageLightbox
          gallery={imageGallery}
          onClose={() => setImageGallery(null)}
        />
      ) : null}
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


