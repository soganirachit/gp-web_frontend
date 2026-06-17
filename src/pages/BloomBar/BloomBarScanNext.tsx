import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, QrCode, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from './BloomBarCartContext';
import { base44 } from '@/api/base44Client';
import BloomBarScanner from './BloomBarScanner';
import BloomBarProductCard, { BloomBarProduct } from './components/BloomBarProductCard';
import BloomBarLoadingSkeleton from './components/BloomBarLoadingSkeleton';
import BloomBarCoBrandHeader from './components/BloomBarCoBrandHeader';

type View = 'prompt' | 'scanning' | 'loading' | 'product' | 'added';

interface ScanParams {
  [key: string]: string;
}

export default function BloomBarScanNext() {
  const { items, itemCount, total, setHotelContext } = useCart();
  const [view, setView] = useState<View>('scanning');
  const [scanKey, setScanKey] = useState(0);
  const [product, setProduct] = useState<BloomBarProduct | null>(null);
  const [hotel, setHotel] = useState<Record<string, unknown> | null>(null);
  const [lastAdded, setLastAdded] = useState<{ product: BloomBarProduct; quantity: number } | null>(
    null
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleScan = useCallback(
    async (params: ScanParams) => {
      setView('loading');
      setLoadError(null);

      const productId = params.product || params.p;
      const hotelId = params.hotel || params.h || '';
      const kioskId = params.kiosk || params.k || '';
      const campaign = params.campaign || params.c || 'direct';

      try {
        let resolvedProduct: BloomBarProduct | undefined;
        if (productId) {
          const results = await base44.entities.Product.filter({ id: productId });
          if (results.length > 0) resolvedProduct = results[0] as unknown as BloomBarProduct;
          else throw new Error('Product not found');
        } else {
          const results = await base44.entities.Product.list('-created_date', 1);
          if (results.length > 0) resolvedProduct = results[0] as unknown as BloomBarProduct;
          else throw new Error('No products available');
        }

        let resolvedHotel = hotel;
        if (hotelId) {
          const hotels = await base44.entities.Hotel.filter({ id: hotelId });
          if (hotels.length > 0) {
            resolvedHotel = hotels[0];
            setHotel(hotels[0]);
            setHotelContext({ hotelId, kioskId, campaign, hotel: hotels[0] });
          }
        }

        if (productId) {
          base44.entities.QRScanEvent.create({
            hotel_id: hotelId,
            kiosk_id: kioskId,
            product_id: productId,
            campaign,
            session_id: `sess_${Date.now()}`,
            user_agent: navigator.userAgent,
          }).catch(() => {});
        }

        setProduct(resolvedProduct!);
        setView('product');
      } catch (e) {
        setLoadError((e as Error).message);
        setView('prompt');
      }
    },
    [hotel, setHotelContext]
  );

  const handleAdded = useCallback((prod: BloomBarProduct, qty: number) => {
    setLastAdded({ product: prod, quantity: qty });
    setProduct(null);
    setView('added');
    setTimeout(() => { setScanKey(k => k + 1); setView('scanning'); }, 2000);
  }, []);

  const scanAgain = () => { setScanKey(k => k + 1); setView('scanning'); };

  return (
    <div className="min-h-screen bg-genda-cream">
      {/* QR Scanner overlay */}
      <AnimatePresence>
        {view === 'scanning' && (
          <div className="relative">
            <BloomBarScanner
              key={scanKey}
              onClose={() => setView('prompt')}
              onScan={handleScan}
            />
            {itemCount > 0 && (
              <div className="fixed bottom-6 left-0 right-0 px-5 z-[100]">
                <Link
                  to="/bloombar/basket"
                  className="w-full py-4 rounded-2xl bg-white text-genda-green font-semibold text-base flex items-center justify-center gap-2 float-shadow"
                >
                  <ShoppingBag size={18} />
                  Continue to Basket ({itemCount}) · ₹{total.toLocaleString('en-IN')}
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <BloomBarLoadingSkeleton />
          </motion.div>
        )}

        {view === 'product' && product && (
          <motion.div
            key="product"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="pb-10">
              <BloomBarCoBrandHeader hotel={hotel as { name?: string } | null} />
              <BloomBarProductCard
                product={product}
                hotel={hotel as { name?: string } | null}
                onAdded={handleAdded}
              />
            </div>
          </motion.div>
        )}

        {view === 'added' && lastAdded && (
          <motion.div
            key="added"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen px-5 py-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 14, stiffness: 260 }}
              className="w-24 h-24 rounded-full genda-gradient flex items-center justify-center mb-6 premium-shadow"
            >
              <CheckCircle2 size={44} className="text-white" strokeWidth={1.5} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <h1 className="font-playfair text-2xl font-semibold mb-1">
                {lastAdded.product.name} Added! 🌸
              </h1>
              <p className="text-gray-500 text-sm">
                {lastAdded.quantity > 1 && (
                  <span className="font-semibold text-gray-800">{lastAdded.quantity}× </span>
                )}
                Added to your basket · Opening scanner…
              </p>
            </motion.div>
          </motion.div>
        )}

        {view === 'prompt' && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen px-5 py-12"
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <span className="text-6xl block mb-4">🌸</span>
              <h1 className="font-playfair text-3xl font-semibold mb-2">Scan a Flower</h1>
              <p className="text-gray-500 text-sm">
                Point your camera at any QR code to add it to your basket
              </p>
              {loadError && <p className="text-red-500 text-sm mt-2">{loadError}</p>}
            </motion.div>
            <div className="w-full max-w-sm space-y-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={scanAgain}
                className="w-full py-4 genda-gradient text-white font-semibold text-base rounded-2xl premium-shadow flex items-center justify-center gap-2"
              >
                <QrCode size={20} /> Open Scanner
              </motion.button>
              {itemCount > 0 && (
                <Link
                  to="/bloombar/basket"
                  className="w-full py-4 rounded-2xl border-2 border-genda-green text-genda-green font-semibold text-base flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={18} />
                  View Basket ({itemCount}) · ₹{total.toLocaleString('en-IN')}
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
