import { useState } from 'react';
import { useCart } from './BloomBarCartContext';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, Mail, User, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import BloomBarConfirmation from './BloomBarConfirmation';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const TAX_RATE = 0.05;

export default function BloomBarCheckout() {
  const { items, total, clearCart, hotelContext, sessionId } = useCart();
  const [form, setForm] = useState({ name: '', email: '', whatsapp: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const tax = Math.round(total * TAX_RATE);
  // Kiosk = walk-up purchase, customer takes product immediately — no delivery fee
  const grandTotal = total + tax;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.whatsapp.trim() || !/^\d{10}$/.test(form.whatsapp.replace(/\s/g, '')))
      e.whatsapp = 'Valid 10-digit number required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const loadRazorpay = () =>
    new Promise<boolean>(resolve => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handlePayment = async () => {
    if (!validate()) return;
    setLoading(true);
    setOrderError(null);

    const loaded = await loadRazorpay();
    if (!loaded) {
      setLoading(false);
      alert('Failed to load payment gateway. Please check your connection and try again.');
      return;
    }

    try {
      // Creates order + Razorpay order in one service call; returns key, razorpay_order_id, amount
      const order = await base44.entities.Order.create({
        hotel_id: hotelContext?.hotelId || '',
        kiosk_id: hotelContext?.kioskId || '',
        campaign: hotelContext?.campaign || 'direct',
        session_id: sessionId,
        customer_name: form.name,
        customer_email: form.email,
        customer_whatsapp: form.whatsapp,
        items,
        subtotal: total,
        status: 'pending',
      });

      const options = {
        key: order.key as string,
        amount: order.amount as number,
        currency: 'INR',
        order_id: order.razorpay_order_id as string,
        name: 'Genda Phool',
        description: `Flowers from ${(hotelContext?.hotel as { name?: string })?.name || 'Kiosk'}`,
        image: 'https://images.unsplash.com/photo-1490750967868-88df5691cc2b?w=100&h=100&fit=crop',
        handler: async (response: Record<string, string>) => {
          await base44.entities.Order.update(order.id as string, {
            status: 'paid',
            payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            session_id: sessionId,
          });
          clearCart();
          setOrderId(order.id as string);
          setLoading(false);
        },
        prefill: { name: form.name, email: form.email, contact: `+91${form.whatsapp}` },
        theme: { color: '#1d4d2a' },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      setOrderError('Could not place order. Please try again.');
      setLoading(false);
    }
  };

  if (orderId) return <BloomBarConfirmation orderId={orderId} customerName={form.name} />;

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <span className="text-6xl mb-4">🌸</span>
        <h2 className="font-playfair text-2xl mb-4">Your basket is empty</h2>
        <Link to="/bloombar" className="py-3 px-8 genda-gradient text-white rounded-2xl">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-genda-cream pb-40">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-5 py-4 flex items-center gap-3">
        <Link to="/bloombar/basket" className="p-1.5 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-playfair text-xl font-semibold">Checkout</h1>
        <div className="ml-auto flex items-center gap-1 text-xs text-gray-500">
          <Lock size={12} />
          <span>Secure</span>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Order preview */}
        <div className="bg-white rounded-2xl p-4 premium-shadow">
          <h3 className="font-semibold text-sm mb-3">Your Basket</h3>
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.product_id} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {item.product_name} ×{item.quantity}
                </span>
                <span className="font-medium">
                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-3 mt-3 border-t border-gray-100 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Subtotal</span>
              <span>₹{total.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Tax (5%)</span>
              <span>₹{tax}</span>
            </div>
            <div className="flex justify-between font-semibold mt-1">
              <span>Total</span>
              <span className="font-playfair text-lg text-genda-green">
                ₹{grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Contact form */}
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
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 py-2">
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
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-5 py-4">
        {orderError && (
          <p className="text-red-500 text-xs text-center mb-2">{orderError}</p>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handlePayment}
          disabled={loading}
          className="w-full py-4 genda-gradient text-white font-semibold text-base rounded-2xl premium-shadow flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Processing...</span>
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
  );
}
