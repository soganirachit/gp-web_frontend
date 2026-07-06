import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, QrCode, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from './BloomBarCartContext';
import { base44 } from '@/api/base44Client';
import BloomBarScanner from './BloomBarScanner';
import BloomBarProductCard, { BloomBarProduct } from './components/BloomBarProductCard';
import BloomBarLoadingSkeleton from './components/BloomBarLoadingSkeleton';
import BloomBarCoBrandHeader from './components/BloomBarCoBrandHeader';

type View = 'prompt' | 'scanning' | 'loading' | 'product';

interface ScanParams {
  [key: string]: string;
}

export default function BloomBarScanNext() {
  const { itemCount, total, setKioskContext, sessionId } = useCart();
  const location = useLocation();
  const navState = location.state as { addedName?: string; addedQty?: number } | null;
  const [view, setView] = useState<View>('scanning');
  const [scanKey, setScanKey] = useState(0);
  const [product, setProduct] = useState<BloomBarProduct | null>(null);
  const [kiosk, setKiosk] = useState<Record<string, unknown> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** Flower most recently added — drives the header (persists) and the pop-in
   *  notification toast. Seeded from the standalone product page's first add. */
  const [lastAdded, setLastAdded] = useState<{ name: string; qty: number } | null>(
    navState?.addedName ? { name: navState.addedName, qty: navState.addedQty ?? 1 } : null
  );
  /** Controls the transient "added to basket" notification over the live scanner. */
  const [showNotice, setShowNotice] = useState<boolean>(Boolean(navState?.addedName));

  // Auto-dismiss the notification so it never blocks continuous scanning.
  useEffect(() => {
    if (!showNotice) return;
    const t = setTimeout(() => setShowNotice(false), 4000);
    return () => clearTimeout(t);
  }, [showNotice, lastAdded]);

  const handleScan = useCallback(
    async (params: ScanParams) => {
      setView('loading');
      setLoadError(null);

      const productId = params.product || params.p;
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

        if (kioskId) {
          const kiosks = await base44.entities.Kiosk.filter({ id: kioskId });
          if (kiosks.length > 0) {
            setKiosk(kiosks[0]);
            setKioskContext({ kioskId, campaign, kiosk: kiosks[0] });
          }
        }

        if (productId) {
          base44.entities.QRScanEvent.create({
            kiosk_id: kioskId,
            product_id: productId,
            campaign,
            session_id: sessionId,
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
    [kiosk, setKioskContext]
  );

  const handleAdded = useCallback((prod: BloomBarProduct, qty: number) => {
    setProduct(null);
    // Go straight back to the live scanner and pop the "added to basket" notification.
    setLastAdded({ name: prod.name, qty });
    setShowNotice(true);
    setScanKey(k => k + 1);
    setView('scanning');
  }, []);

  const scanAgain = () => { setScanKey(k => k + 1); setView('scanning'); };

  return (
    <div className="min-h-[100dvh] bg-genda-cream">
      {/* QR Scanner overlay */}
      <AnimatePresence>
        {view === 'scanning' && (
          <div className="relative">
            <BloomBarScanner
              key={scanKey}
              onClose={() => setView('prompt')}
              onScan={handleScan}
              lastAddedName={lastAdded?.name ?? null}
            />

            {/* Notification toast — pops on every add (incl. the first), non-blocking */}
            <AnimatePresence>
              {showNotice && lastAdded && (
                <motion.div
                  initial={{ opacity: 0, y: -24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -24 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                  className="fixed left-0 right-0 px-5 z-[120] pointer-events-none top-[calc(env(safe-area-inset-top)+5.5rem)]"
                >
                  <div className="mx-auto max-w-sm bg-white/95 backdrop-blur rounded-2xl px-4 py-3 text-center float-shadow">
                    <p className="font-semibold text-gray-800 text-sm">
                      {lastAdded.qty > 1 ? `${lastAdded.qty} ` : ''}{lastAdded.name} added to basket 🌸
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Scan another QR to add more flowers to basket
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {itemCount > 0 && (
              <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-0 right-0 px-5 z-[100]">
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
              <BloomBarCoBrandHeader kiosk={kiosk as { name?: string } | null} />
              <BloomBarProductCard
                product={product}
                kiosk={kiosk as { name?: string } | null}
                onAdded={handleAdded}
              />
            </div>
          </motion.div>
        )}

        {view === 'prompt' && (
          <motion.div
            key="prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[100dvh] px-5 py-12"
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
