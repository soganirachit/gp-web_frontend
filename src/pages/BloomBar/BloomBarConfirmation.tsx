import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, ExternalLink } from 'lucide-react';

const DISCOVER = [
  { emoji: '🌹', title: 'Daily Subscriptions', desc: 'Fresh flowers every morning' },
  { emoji: '🎊', title: 'Event Decor', desc: 'Weddings, parties & more' },
  { emoji: '🎁', title: 'Premium Gifting', desc: 'Curated flower gift boxes' },
  { emoji: '🪔', title: 'Festival Collections', desc: 'Diwali, Holi specials' },
];

const PETALS = ['🌸', '🌺', '🌼', '🌷', '🌹', '🌻', '🌸', '🌺', '🌼', '🌷', '🌸', '🌺'];

function FallingPetal({ petal, index }: { petal: string; index: number }) {
  const left = 5 + (index * 8.3) % 90;
  const delay = index * 0.18;
  const duration = 2.5 + (index % 4) * 0.6;
  const rotate = (index % 2 === 0 ? 1 : -1) * (120 + index * 40);

  return (
    <motion.span
      className="fixed pointer-events-none select-none z-50 text-3xl"
      style={{ left: `${left}%`, top: '-40px' }}
      initial={{ y: -40, opacity: 1, rotate: 0, x: 0 }}
      animate={{ y: '110vh', opacity: [1, 1, 1, 0], rotate, x: [0, 20, -15, 10, -5] }}
      transition={{ duration, delay, ease: 'easeIn' }}
    >
      {petal}
    </motion.span>
  );
}

interface Props {
  orderId?: string;
  customerName?: string;
}

export default function BloomBarConfirmation({ orderId, customerName }: Props) {
  const [showPetals, setShowPetals] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const timer = setTimeout(() => setShowPetals(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-genda-cream flex flex-col">
      <AnimatePresence>
        {showPetals &&
          PETALS.map((p, i) => <FallingPetal key={i} petal={p} index={i} />)}
      </AnimatePresence>

      {/* Success Hero */}
      <div className="genda-gradient px-6 pt-16 pb-10 text-white text-center relative overflow-hidden">
        {['🌸', '🌺', '🌼', '🌷', '🌹', '🌻'].map((p, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0, y: -20 }}
            animate={{ opacity: 0.3, scale: 1, y: 0 }}
            transition={{ delay: i * 0.12 + 0.2, type: 'spring', damping: 14 }}
            className="absolute text-4xl select-none pointer-events-none"
            style={{ top: `${10 + i * 12}%`, left: i % 2 === 0 ? '5%' : '85%' }}
          >
            {p}
          </motion.span>
        ))}

        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 260, delay: 0.1 }}
          className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-5"
        >
          <motion.div animate={{ rotate: [0, -10, 10, -5, 5, 0] }} transition={{ delay: 0.6, duration: 0.6 }}>
            <CheckCircle size={52} className="text-white" strokeWidth={1.5} />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, type: 'spring', damping: 18 }}
          className="font-playfair text-3xl font-semibold mb-2"
        >
          Order Confirmed! 🌸
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="text-white/80 text-sm"
        >
          Thank you, {customerName || 'dear customer'}
        </motion.p>
        {orderId && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="text-white/60 text-xs mt-1 font-mono"
          >
            Order #{orderId.slice(-8).toUpperCase()}
          </motion.p>
        )}
      </div>

      <div className="flex-1 px-4 py-6 space-y-5">
        {/* What's next */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', damping: 18 }}
          className="bg-white rounded-2xl p-4 premium-shadow"
        >
          <h3 className="font-semibold text-sm mb-3">What happens next?</h3>
          <div className="space-y-3">
            {[
              { icon: '📱', text: 'WhatsApp confirmation sent to your number' },
              { icon: '📧', text: 'Email receipt on its way' },
              { icon: '🌸', text: 'Kiosk staff will prepare your order' },
              { icon: '✨', text: 'Pick up at the kiosk in a few minutes' },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <span className="text-xl">{step.icon}</span>
                <span className="text-sm text-gray-500">{step.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Discover */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
          <h3 className="font-semibold text-sm mb-3 px-1">Discover Us</h3>
          <div className="grid grid-cols-2 gap-3">
            {DISCOVER.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + i * 0.08, type: 'spring', damping: 16 }}
                className="bg-white rounded-2xl p-4 premium-shadow text-center"
              >
                <span className="text-3xl block mb-2">{item.emoji}</span>
                <p className="font-semibold text-xs">{item.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Genda Phool promo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-genda-green rounded-2xl p-5 text-white"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center flex-shrink-0 p-1.5">
              <img
                src="https://media.base44.com/images/public/6a19710a955d0c68cf58358a/4b879ad11_logo-GP-Black.png"
                alt="Genda Phool"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="font-playfair font-semibold text-base">About Us</p>
              <p className="text-white/70 text-xs">India's Flower Commerce Platform</p>
            </div>
          </div>
          <p className="text-white/80 text-sm leading-relaxed mb-4">
            Get daily puja flowers, bouquets, wedding decor & festival specials — delivered fresh to your door. Over 50,000 happy customers across India! 🌸
          </p>
          <a
            href="https://mygendaphool.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-white text-genda-green font-semibold rounded-xl text-sm mb-3"
          >
            <ExternalLink size={15} /> Visit mygendaphool.com
          </a>
          <div className="flex gap-2">
            <a
              href="https://play.google.com/store/apps/details?id=com.gendaphool"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-white/15 rounded-xl py-2.5 text-center text-xs font-medium"
            >
              Google Play
            </a>
            <a
              href="https://apps.apple.com/app/genda-phool"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-white/15 rounded-xl py-2.5 text-center text-xs font-medium"
            >
              App Store
            </a>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95 }}
          className="pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          <a
            href="/bloombar/scan-next"
            className="flex items-center justify-center gap-2 w-full py-4 genda-gradient text-white font-semibold rounded-2xl premium-shadow"
          >
            🌸 Scan More Flowers
          </a>
        </motion.div>
      </div>
    </div>
  );
}
