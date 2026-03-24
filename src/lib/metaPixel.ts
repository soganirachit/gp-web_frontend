// Meta Pixel ID — set VITE_META_PIXEL_ID in your .env file
export const META_PIXEL_ID =
  import.meta.env.VITE_META_PIXEL_ID || 'REPLACE_WITH_YOUR_PIXEL_ID';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export function initMetaPixel(): void {
  if (typeof window === 'undefined' || window.fbq) return;

  /* eslint-disable */
  (function (f: any, b: Document, e: string, v: string) {
    let n: any, t: HTMLScriptElement, s: HTMLElement;
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0] as HTMLElement;
    s.parentNode!.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq('init', META_PIXEL_ID);
  window.fbq('track', 'PageView');
}

function safeTrack(event: string, data?: Record<string, any>): void {
  try {
    if (typeof window === 'undefined' || !window.fbq) return;
    window.fbq('track', event, data);
  } catch {
    // Pixel errors must never crash the app
  }
}

// ─── Standard Events ──────────────────────────────────────────────────────────

export function trackPageView(): void {
  safeTrack('PageView');
}

export function trackViewContent(product: {
  id: number | string;
  name: string;
  category: string;
  price: number;
}): void {
  safeTrack('ViewContent', {
    content_ids: [String(product.id)],
    content_name: product.name,
    content_category: product.category,
    content_type: 'product',
    value: product.price,
    currency: 'INR',
  });
}

export function trackAddToCart(item: {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
}): void {
  safeTrack('AddToCart', {
    content_ids: [String(item.id)],
    content_name: item.name,
    content_type: 'product',
    value: item.price * item.quantity,
    currency: 'INR',
    num_items: item.quantity,
  });
}

export function trackSearch(query: string): void {
  safeTrack('Search', { search_string: query });
}

export function trackInitiateCheckout(
  items: Array<{ id: number | string; price: number; quantity: number }>,
  totalValue: number
): void {
  safeTrack('InitiateCheckout', {
    content_ids: items.map((i) => String(i.id)),
    content_type: 'product',
    num_items: items.reduce((sum, i) => sum + i.quantity, 0),
    value: totalValue,
    currency: 'INR',
  });
}

export function trackPurchase(
  orderId: string,
  items: Array<{ id: number | string; price: number; quantity: number }>,
  totalValue: number
): void {
  safeTrack('Purchase', {
    content_ids: items.map((i) => String(i.id)),
    content_type: 'product',
    value: totalValue,
    currency: 'INR',
    num_items: items.reduce((sum, i) => sum + i.quantity, 0),
    order_id: orderId,
  });
}
