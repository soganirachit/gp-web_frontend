import { useState, useEffect } from 'react';
import { useCart } from './BloomBarCartContext';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Minus, Trash2, Phone, Mail, User, Lock, QrCode, Hash } from 'lucide-react';
import { Link } from 'react-router-dom';
import { loadRazorpayScript } from '@/lib/razorpayLoader';
import BloomBarOrderSummaryRow from './components/BloomBarOrderSummaryRow';
import BloomBarConfirmation from './BloomBarConfirmation';




export default function BloomBarBasket() {
  const { items, itemCount, total, updateQuantity, removeItem, clearCart, kioskContext, storeContext, sessionId } =
    useCart();
  // Source of the basket decides the checkout fields + payload:
  //   store QR  → asks Room + Name + Phone, sends store_id + customer_room
  //   kiosk QR  → asks Name + Phone + Email, sends kiosk_id
  const isStore = !!storeContext;
  const storeId = storeContext?.store?.id != null ? String(storeContext.store.id) : '';
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '', room: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');

  // Totals come from the backend (admin-configured tax) — same source-of-truth
  // pattern as the store/daily cart. No local fallback: if the backend doesn't
  // return totals, they stay null and we never fabricate a tax/total.
  type Totals = { subtotal: number; tax: number; total: number; discount: number };
  const [totals, setTotals] = useState<Totals | null>(null);

  const itemsKey = items.map(i => `${i.product_id}:${i.quantity}`).join(',');

  useEffect(() => {
    if (items.length === 0) {
      setTotals(null);
      return;
    }
    let cancelled = false;
    setTotals(null);
    (async () => {
      try {
        const t = await base44.entities.Cart.getTotals({
          kiosk_id: isStore ? undefined : kioskContext?.kioskId || '',
          store_id: isStore ? storeId : undefined,
          campaign: isStore ? 'store' : kioskContext?.campaign || 'direct',
          items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        });
        if (!cancelled) {
          // Prefer the backend's explicit discount; otherwise derive it from the
          // gap between (subtotal + tax) and the charged total so any promo the
          // server applies still surfaces on the summary.
          const derived = t.subtotal + t.tax_amount - t.total_amount;
          const discount =
            t.discount_amount != null && t.discount_amount > 0
              ? t.discount_amount
              : derived > 0.009
                ? derived
                : 0;
          setTotals({ subtotal: t.subtotal, tax: t.tax_amount, total: t.total_amount, discount });
        }
      } catch {
        // Backend totals unavailable — leave null, do not invent any amount.
        if (!cancelled) setTotals(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, isStore, storeId, kioskContext?.kioskId, kioskContext?.campaign]);

  const tax = totals?.tax ?? null;
  const grandTotal = totals?.total ?? null;
  const discount = totals?.discount ?? 0;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.whatsapp.trim() || !/^\d{10}$/.test(form.whatsapp.replace(/\s/g, '')))
      e.whatsapp = 'Valid 10-digit number required';
    if (isStore) {
      if (!form.room.trim()) e.room = 'Room number is required';
    } else if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Invalid email';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePayment = async () => {
    if (!validate()) return;
    if (grandTotal == null) {
      alert('Could not load the order total. Please try again in a moment.');
      return;
    }
    setLoading(true);

    try {
      await loadRazorpayScript();
    } catch {
      setLoading(false);
      alert('Failed to load payment gateway. Please check your connection and try again.');
      return;
    }

    // Deferred-order pattern: this only opens a Razorpay order. The BloomBar order
    // is created by the backend on successful verify (see handler below), so an
    // abandoned or declined payment never leaves a stuck "Pending" order.
    const checkout = {
      kiosk_id: isStore ? undefined : kioskContext?.kioskId || '',
      store_id: isStore ? storeId : undefined,
      campaign: isStore ? 'store' : kioskContext?.campaign || 'direct',
      customer_name: form.name,
      customer_email: isStore ? '' : form.email,
      customer_whatsapp: form.whatsapp,
      customer_room: isStore ? form.room : undefined,
      items,
      session_id: sessionId,
    };

    let init;
    try {
      init = await base44.entities.Order.create(checkout);
    } catch (err) {
      setLoading(false);
      const resp = (err as { response?: { data?: { message?: string; errors?: Record<string, unknown> } } })
        ?.response?.data;
      const detail =
        resp?.message ||
        (resp?.errors ? Object.values(resp.errors).flat().join(' ') : '') ||
        'Please check your connection and try again.';
      alert(`Could not start payment. ${detail}`);
      return;
    }

    const options = {
      key: init.key,
      amount: init.amount,
      currency: 'INR',
      order_id: init.razorpay_order_id,
      name: 'Genda Phool',
      description: `Flowers from ${
        (kioskContext?.kiosk as { name?: string })?.name ||
        (storeContext?.store as { store_name?: string })?.store_name ||
        'Genda Phool'
      }`,
      image: 'https://images.unsplash.com/photo-1490750967868-88df5691cc2b?w=100&h=100&fit=crop',
      handler: async (response: RazorpayResponse) => {
        try {
          const order = await base44.entities.Order.verify({
            ...checkout,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          clearCart();
          setCustomerName(form.name);
          setOrderId(order.order_number || order.id);
        } catch {
          alert('Payment received but confirmation failed. Please contact support with your payment ID: ' + response.razorpay_payment_id);
        } finally {
          setLoading(false);
        }
      },
      prefill: { name: form.name, email: isStore ? '' : form.email, contact: `+91${form.whatsapp}` },
      theme: { color: '#1d4d2a' },
      // Abandon/decline: no order was ever created, so just stop the spinner.
      modal: {
        ondismiss: () => { setLoading(false); },
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => { setLoading(false); });
      rzp.open();
    } catch {
      setLoading(false);
      alert('Could not open payment gateway. Please try again.');
    }
  };

  if (orderId) return <BloomBarConfirmation orderId={orderId} customerName={customerName} />;

  if (itemCount === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center bg-genda-cream">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <span className="text-7xl block mb-4">🌸</span>
          <h2 className="font-playfair text-2xl font-semibold mb-2">Your basket is empty</h2>
          <p className="text-gray-500 mb-8">Scan a flower QR to start building your bouquet</p>
          <Link
            to="/bloombar/scan-next"
            className="py-3 px-8 genda-gradient text-white rounded-2xl font-medium"
          >
            Start Scanning
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-genda-cream pb-[calc(10rem+env(safe-area-inset-bottom))] max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-5 py-4 flex items-center gap-3">
        <Link to="/bloombar" className="p-1.5 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-playfair text-xl font-semibold">My Basket</h1>
        <span className="ml-auto text-xs bg-genda-green text-white font-medium px-2.5 py-1 rounded-full">
          {itemCount} items
        </span>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {/* Items */}
        <AnimatePresence>
          {items.map(item => (
            <motion.div
              key={item.product_id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="bg-white rounded-2xl p-4 premium-shadow"
            >
              <div className="flex gap-3">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.product_name}
                    className="w-20 h-20 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-genda-cream flex items-center justify-center text-3xl">
                    🌸
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    {item.product_name} ×{item.quantity}
                  </p>
                  <p className="text-genda-green font-bold text-base mt-0.5">
                    ₹{item.price.toLocaleString('en-IN')} each
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Subtotal:{' '}
                    <span className="font-semibold text-gray-800">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => removeItem(item.product_id)}
                  className="self-start p-1.5 text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center"
                  >
                    {item.quantity === 1 ? (
                      <Trash2 size={12} className="text-red-400" />
                    ) : (
                      <Minus size={12} />
                    )}
                  </button>
                  <span className="font-semibold min-w-[1.5rem] text-center tabular-nums">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                    className="w-8 h-8 rounded-full genda-gradient text-white flex items-center justify-center"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Scan more */}
        <Link
          to="/bloombar/scan-next"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-genda-green/40 text-genda-green text-sm font-medium"
        >
          <QrCode size={16} />
          Scan another flower
        </Link>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl p-4 premium-shadow">
          <h3 className="font-semibold text-sm mb-3">Order Summary</h3>
          <div className="space-y-2">
            <BloomBarOrderSummaryRow label="Subtotal" value={`₹${total.toLocaleString('en-IN')}`} />

            {discount > 0 && (
              <BloomBarOrderSummaryRow
                label="Discount"
                value={`−₹${discount.toLocaleString('en-IN')}`}
                valueClassName="text-genda-green font-semibold"
              />
            )}

            <BloomBarOrderSummaryRow
              label="Tax"
              value={tax != null ? `₹${tax.toLocaleString('en-IN')}` : '—'}
            />
            <BloomBarOrderSummaryRow
              label="Total"
              value={grandTotal != null ? `₹${grandTotal.toLocaleString('en-IN')}` : '—'}
              isTotal
            />
          </div>
        </div>

        {/* Contact Details */}
        <div className="bg-white rounded-2xl p-4 premium-shadow">
          <h3 className="font-semibold text-sm mb-4">Your Details</h3>
          <div className="space-y-3">
            <div>
              <div
                className={`flex items-center gap-3 border rounded-xl px-4 py-3 bg-genda-cream ${
                  errors.name ? 'border-red-400' : 'border-gray-200'
                }`}
              >
                <User size={16} className="text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Your Name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="flex-1 bg-transparent outline-none text-sm"
                />
              </div>
              {errors.name && <p className="text-red-500 text-xs mt-1 px-1">{errors.name}</p>}
            </div>

            <div>
              <div
                className={`flex items-center gap-3 border rounded-xl px-4 py-3 bg-genda-cream ${
                  errors.whatsapp ? 'border-red-400' : 'border-gray-200'
                }`}
              >
                <Phone size={16} className="text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-400">+91</span>
                <input
                  type="tel"
                  placeholder="WhatsApp Number"
                  value={form.whatsapp}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      whatsapp: e.target.value.replace(/\D/g, '').slice(0, 10),
                    }))
                  }
                  className="flex-1 bg-transparent outline-none text-sm"
                />
              </div>
              {errors.whatsapp && (
                <p className="text-red-500 text-xs mt-1 px-1">{errors.whatsapp}</p>
              )}
            </div>

            {isStore ? (
              <div>
                <div
                  className={`flex items-center gap-3 border rounded-xl px-4 py-3 bg-genda-cream ${
                    errors.room ? 'border-red-400' : 'border-gray-200'
                  }`}
                >
                  <Hash size={16} className="text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Room Number"
                    value={form.room}
                    onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
                    className="flex-1 bg-transparent outline-none text-sm"
                  />
                </div>
                {errors.room && <p className="text-red-500 text-xs mt-1 px-1">{errors.room}</p>}
              </div>
            ) : (
              <div>
                <div
                  className={`flex items-center gap-3 border rounded-xl px-4 py-3 bg-genda-cream ${
                    errors.email ? 'border-red-400' : 'border-gray-200'
                  }`}
                >
                  <Mail size={16} className="text-gray-400 flex-shrink-0" />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="flex-1 bg-transparent outline-none text-sm"
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1 px-1">{errors.email}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 py-1">
          <span className="text-xs text-gray-500">Pay via</span>
          {['UPI', 'Cards', 'Wallets', 'NetBanking'].map(m => (
            <span
              key={m}
              className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 font-medium"
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Sticky Pay Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-40">
        <div className="max-w-lg mx-auto">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handlePayment}
          disabled={loading || grandTotal == null}
          className="w-full py-4 genda-gradient text-white font-semibold text-base rounded-2xl premium-shadow flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Processing...</span>
            </>
          ) : grandTotal == null ? (
            <>
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Calculating total…</span>
            </>
          ) : (
            <>
              <Lock size={16} />
              <span>Pay ₹{grandTotal.toLocaleString('en-IN')} Securely</span>
            </>
          )}
        </motion.button>
        <p className="text-center text-xs text-gray-500 mt-2">Powered by Razorpay · 256-bit SSL</p>
        </div>
      </div>
    </div>
  );
}
