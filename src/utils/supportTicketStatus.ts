import { normalizeSupportStatus } from "@/services/support.service";

/**
 * Returns true while a customer's support ticket is still actionable — i.e.
 * the conversation hasn't been closed / resolved / cancelled yet. We use this
 * in two places:
 *   1. `CustomerSupport` — to suppress the "Raise ticket" CTA on orders that
 *      already have an open ticket.
 *   2. `OrderDetails` — to decide whether to deep-link the customer into
 *      "Go to Support Chat" or to let them raise a brand-new ticket.
 *
 * Keep the closed / active sets in lock-step with the mobile mirror at
 * `genda-phool-mobile/src/utils/supportTicketStatus.ts`.
 */
export function isActiveSupportTicketStatus(
  status: string | undefined | null,
): boolean {
  const s = normalizeSupportStatus(status);
  if (
    s === "closed" ||
    s === "close" ||
    s === "resolved" ||
    s === "solved" ||
    s === "cancelled" ||
    s === "canceled"
  ) {
    return false;
  }
  return (
    s === "open" ||
    s === "pending" ||
    s === "new" ||
    s === "in_progress" ||
    s === "processing" ||
    s === "assigned" ||
    s === "working" ||
    s === "reopened" ||
    s === "awaiting_reply" ||
    s === "awaiting_customer" ||
    s === "active" ||
    s === "answered" ||
    s === "waiting_on_customer"
  );
}
