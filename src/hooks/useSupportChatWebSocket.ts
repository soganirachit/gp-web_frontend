/**
 * WebSocket hook for real-time support ticket chat.
 * Connects to ws(s)://<host>/ws/support/<ticket_number>/?token=<JWT>
 *
 * Server events: chat_message, ticket_status (see SupportChatConsumer).
 * Falls back to polling in the page when WS is unavailable.
 */
import { useEffect, useRef, useCallback } from "react";
import { getApiUrl } from "../config/api.config";
import {
  normalizeSupportMessagePayload,
  type SupportMessage,
} from "../services/support.service";

const WS_ENABLED = import.meta.env.VITE_ENABLE_SUPPORT_CHAT_WEBSOCKET !== "false";

const STAFF_ROLES = new Set([
  "admin",
  "super_admin",
  "support_agent",
  "store_manager",
  "store_staff",
  "production_manager",
  "production_executive",
  "delivery_manager",
  "customer_support_manager",
  "customer_support_executive",
]);

export interface SupportChatWsMessage {
  type: "chat_message";
  id: number;
  ticket_number: string;
  sender?: { id?: number; name?: string; role?: string };
  message: string;
  image?: string | null;
  is_internal?: boolean;
  created_at: string;
}

export interface SupportChatWsStatus {
  type: "ticket_status";
  ticket_number: string;
  status: string;
  closed_by?: string | null;
  closed_at?: string | null;
}

type SupportChatWsPayload = SupportChatWsMessage | SupportChatWsStatus;

function getSupportChatWebSocketUrl(ticketNumber: string): string | null {
  if (!WS_ENABLED) return null;
  let base = getApiUrl() || "";
  if (!base.trim() && import.meta.env.VITE_DEV_PROXY_TARGET) {
    base = `${String(import.meta.env.VITE_DEV_PROXY_TARGET).replace(/\/$/, "")}/api/v1`;
  }
  if (!base) return null;
  const wsOrigin = base.replace(/\/api\/v1.*$/, "").replace(/^http/, "ws");
  return `${wsOrigin}/ws/support/${encodeURIComponent(ticketNumber)}/`;
}

export function mapSupportChatWsMessage(payload: SupportChatWsMessage): SupportMessage {
  const role = String(payload.sender?.role ?? "").toLowerCase();
  const isStaff = STAFF_ROLES.has(role);
  return normalizeSupportMessagePayload({
    id: payload.id,
    message: payload.message,
    is_internal: Boolean(payload.is_internal),
    is_from_customer: !isStaff,
    created_by_name: payload.sender?.name ?? (isStaff ? "Support" : "You"),
    created_at: payload.created_at,
    image: payload.image,
    image_url: payload.image,
  });
}

const MAX_RECONNECT_ATTEMPTS = 5;
const BACKOFF_AFTER_FAILURES_MS = 5 * 60 * 1000;

export function useSupportChatWebSocket(options: {
  enabled: boolean;
  ticketNumber: string | null | undefined;
  token: string | null;
  onMessage?: (message: SupportMessage) => void;
  onStatusChange?: (payload: SupportChatWsStatus) => void;
  reconnectDelayMs?: number;
}) {
  const {
    enabled,
    ticketNumber,
    token,
    onMessage,
    onStatusChange,
    reconnectDelayMs = 3000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failureCountRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);
  onMessageRef.current = onMessage;
  onStatusChangeRef.current = onStatusChange;

  const connect = useCallback(() => {
    if (!enabled || !ticketNumber || !token || !WS_ENABLED) return;
    const wsUrl = getSupportChatWebSocketUrl(ticketNumber);
    if (!wsUrl) return;
    if (failureCountRef.current >= MAX_RECONNECT_ATTEMPTS) return;

    const url = `${wsUrl}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      failureCountRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SupportChatWsPayload;
        if (data.type === "chat_message") {
          if (data.is_internal) return;
          onMessageRef.current?.(mapSupportChatWsMessage(data));
        } else if (data.type === "ticket_status") {
          onStatusChangeRef.current?.(data);
        }
      } catch (e) {
        console.warn("[SupportChat] Invalid WebSocket message:", e);
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (enabled && ticketNumber && token) {
        failureCountRef.current += 1;
        if (failureCountRef.current >= MAX_RECONNECT_ATTEMPTS) {
          reconnectTimeoutRef.current = setTimeout(() => {
            failureCountRef.current = 0;
            connect();
          }, BACKOFF_AFTER_FAILURES_MS);
        } else {
          reconnectTimeoutRef.current = setTimeout(connect, reconnectDelayMs);
        }
      }
    };

    ws.onerror = () => {
      // onclose handles reconnect
    };
  }, [enabled, ticketNumber, token, reconnectDelayMs]);

  useEffect(() => {
    failureCountRef.current = 0;
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);
}
