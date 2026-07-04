import { motion } from 'framer-motion';
import { QrCode, ShoppingBag, BarChart2, ArrowRight, ExternalLink, Smartphone, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const LOGO_URL =
  'https://media.base44.com/images/public/6a19710a955d0c68cf58358a/4b879ad11_logo-GP-Black.png';

const SERVICES = [
  { emoji: '🌼', title: 'Daily Puja Flowers', desc: 'Fresh marigolds, roses, belpatra & more – delivered every morning for your pooja rituals.' },
  { emoji: '💐', title: 'Bouquets & Exotic Flowers', desc: 'Stunning bouquets with fresh-from-farm exotic blooms for gifting and celebrations.' },
  { emoji: '🎊', title: 'Sajawat – Floral Decor', desc: 'End-to-end floral design & planning for weddings, events, and special occasions.' },
  { emoji: '🪔', title: 'Festival Collections', desc: 'Special packs for Diwali, Ganesh Chaturthi, Navratri, Holi and all major festivals.' },
];

const REVIEWS = [
  { name: 'Priya S.', text: 'The freshest flowers I have ever received! Delivered on time every morning.', stars: 5 },
  { name: 'Rahul M.', text: 'Genda Phool made our wedding decoration absolutely stunning. Highly recommended!', stars: 5 },
  { name: 'Anita K.', text: "Subscribed for daily pooja flowers – it's so convenient and always fresh!", stars: 5 },
];

export default function BloomBarLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-genda-cream flex flex-col">
      {/* Hero */}
      <div className="genda-gradient relative overflow-hidden px-6 pt-14 pb-14 text-white">
        {['🌸', '🌺', '🌼', '🌷', '🌹', '🌻', '🌸', '🌺'].map((p, i) => (
          <span
            key={i}
            className="absolute text-2xl opacity-20 select-none pointer-events-none"
            style={{ top: `${5 + i * 11}%`, left: i % 2 === 0 ? `${3 + i * 7}%` : `${75 - i * 5}%` }}
          >
            {p}
          </span>
        ))}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center flex-shrink-0 p-1">
              <img src={LOGO_URL} alt="Genda Phool" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="font-playfair text-xl font-semibold">BloomBar</p>
              <p className="text-white/60 text-xs">by Genda Phool</p>
            </div>
          </div>
          <h1 className="font-playfair text-3xl font-semibold leading-tight mb-3">
            Premium Flowers,<br />Instantly.
          </h1>
          <p className="text-white/70 text-sm leading-relaxed">
            Scan any flower QR at our kiosks to add fresh blooms to your basket.
          </p>
        </motion.div>
      </div>

      <div className="flex-1 px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-3 px-1">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/bloombar/scan-next')}
              className="w-full flex items-center gap-4 bg-white rounded-2xl p-4 premium-shadow"
            >
              <div className="w-12 h-12 rounded-xl genda-gradient flex items-center justify-center flex-shrink-0">
                <QrCode size={22} className="text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm">Scan a Flower QR</p>
                <p className="text-xs text-gray-500">Opens camera scanner instantly</p>
              </div>
              <ArrowRight size={16} className="text-gray-400" />
            </motion.button>

            <Link
              to="/bloombar/basket"
              className="flex items-center gap-4 bg-white rounded-2xl p-4 premium-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-genda-gold flex items-center justify-center flex-shrink-0">
                <ShoppingBag size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">My Basket</p>
                <p className="text-xs text-gray-500">View and manage your items</p>
              </div>
              <ArrowRight size={16} className="text-gray-400" />
            </Link>
          </div>
        </motion.div>

        {/* About */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-3 px-1">
            About Genda Phool
          </h2>
          <div className="bg-white rounded-2xl p-5 premium-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-xl bg-genda-cream flex items-center justify-center flex-shrink-0 p-2">
                <img src={LOGO_URL} alt="Genda Phool" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="font-playfair font-semibold text-base">Genda Phool</p>
                <p className="text-xs text-gray-500">India's Flower Commerce Brand</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              Genda Phool is India's leading flower commerce platform — bringing farm-fresh flowers to your doorstep for daily pooja, gifting, weddings, and events.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: '50,000+', sub: 'Happy Customers' },
                { label: '100+', sub: 'Cities Served' },
                { label: '365 Days', sub: 'Fresh Delivery' },
                { label: '4.8 ⭐', sub: 'Average Rating' },
              ].map(s => (
                <div key={s.label} className="bg-genda-cream rounded-xl p-3 text-center">
                  <p className="font-playfair font-bold text-genda-green text-lg">{s.label}</p>
                  <p className="text-xs text-gray-500">{s.sub}</p>
                </div>
              ))}
            </div>
            <a
              href="https://mygendaphool.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 border-2 border-genda-green text-genda-green rounded-xl text-sm font-medium"
            >
              Visit mygendaphool.com <ExternalLink size={14} />
            </a>
          </div>
        </motion.div>

        {/* Services */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h2 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-3 px-1">
            Our Services
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {SERVICES.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.07 }}
                className="bg-white rounded-2xl p-4 premium-shadow"
              >
                <span className="text-3xl block mb-2">{s.emoji}</span>
                <p className="font-semibold text-xs mb-1">{s.title}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* How it works */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-3 px-1">
            How BloomBar Works
          </h2>
          <div className="bg-white rounded-2xl p-4 premium-shadow">
            <div className="space-y-4">
              {[
                { step: '1', icon: '📱', title: 'Scan QR', desc: 'Point your camera at the flower tag' },
                { step: '2', icon: '🌸', title: 'Choose Quantity', desc: 'Pick how many you want' },
                { step: '3', icon: '🛍️', title: 'Add to Basket', desc: 'Keep scanning or checkout' },
                { step: '4', icon: '✅', title: 'Pay Securely', desc: 'UPI, cards, wallets accepted' },
              ].map(s => (
                <div key={s.step} className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full genda-gradient text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {s.step}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Reviews */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <h2 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-3 px-1">
            What Customers Say
          </h2>
          <div className="space-y-3">
            {REVIEWS.map((r, i) => (
              <motion.div
                key={r.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="bg-white rounded-2xl p-4 premium-shadow"
              >
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: r.stars }).map((_, j) => (
                    <Star key={j} size={12} className="fill-genda-gold text-genda-gold" />
                  ))}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed mb-2">"{r.text}"</p>
                <p className="text-xs font-semibold text-genda-green">— {r.name}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Get the App */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-genda-green rounded-2xl p-5 text-white"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Smartphone size={20} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">Get the Genda Phool App</p>
              <p className="text-white/70 text-xs">Manage subscriptions, orders & more</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href="https://play.google.com/store/apps/details?id=com.gendaphool"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-white/15 hover:bg-white/25 rounded-xl py-2.5 text-center text-xs font-medium transition-colors"
            >
              Google Play
            </a>
            <a
              href="https://apps.apple.com/app/genda-phool"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-white/15 hover:bg-white/25 rounded-xl py-2.5 text-center text-xs font-medium transition-colors"
            >
              App Store
            </a>
          </div>
        </motion.div>

        {/* Partners */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="pb-[calc(2rem+env(safe-area-inset-bottom))]"
        >
          <p className="text-xs text-gray-500 text-center mb-3">BloomBar available at premium venues</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {['Taj Hotels', 'Marriott', 'ITC', 'Leela', 'Hyatt'].map(h => (
              <span
                key={h}
                className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 font-medium premium-shadow"
              >
                {h}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
