import { useEffect, useState } from 'react';
import { useCart } from './BloomBarCartContext';
import { base44 } from '@/api/base44Client';
import BloomBarCoBrandHeader from './components/BloomBarCoBrandHeader';
import BloomBarProductCard, { BloomBarProduct as Product } from './components/BloomBarProductCard';
import BloomBarLoadingSkeleton from './components/BloomBarLoadingSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

export default function BloomBarProductPage() {
  const { setKioskContext, sessionId } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [kiosk, setKiosk] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const params = new URLSearchParams(window.location.search);
  const kioskId = params.get('kiosk') || params.get('k') || '';
  const productId = params.get('product') || params.get('p') || '';
  const campaign = params.get('campaign') || params.get('c') || 'direct';

  useEffect(() => {
    loadData();
  }, [productId, kioskId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!productId) throw new Error('No product specified');
      // Single gate: validates the product, kiosk, and per-QR mapping's active
      // state together. Throws the backend's friendly message (e.g. "This QR
      // code is currently inactive.") when the QR or kiosk has been switched off.
      const { product: resolvedProduct, kiosk: resolvedKiosk } =
        await base44.entities.BloomBar.resolve({ product: productId, kiosk: kioskId, campaign });
      setProduct(resolvedProduct as unknown as Product);
      if (resolvedKiosk) {
        setKiosk(resolvedKiosk);
        setKioskContext({ kioskId, campaign, kiosk: resolvedKiosk });
      }
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
      return;
    }

    // Scan event fires only for an active QR (inactive scans return above).
    if (productId) {
      base44.entities.QRScanEvent.create({
        kiosk_id: kioskId,
        product_id: productId,
        campaign,
        session_id: sessionId,
        user_agent: navigator.userAgent,
      }).catch(() => {});
    }

    setLoading(false);
  };

  if (loading) return <BloomBarLoadingSkeleton />;

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center bg-genda-cream">
        <span className="text-6xl mb-4">🌸</span>
        <h2 className="font-playfair text-2xl font-semibold mb-2">Oops!</h2>
        <p className="text-gray-500 mb-6">This product is currently unavailable. Please try again later.</p>
        <Link to="/bloombar" className="py-3 px-8 genda-gradient text-white rounded-2xl font-medium">
          Go Home
        </Link>
      </div>
    );
  }

  const handleAdded = (prod: Product, qty: number) => {
    // Straight to the basket — it's the shopping screen now, and "Scan another
    // flower" there is how the customer keeps going. No `replace`, so Back lands
    // here again; the card then reads the cart and offers "Go to Basket" instead
    // of a second Add (see editWhenInBasket below). The state is still passed so
    // a revert to scan-next needs nothing else.
    navigate('/bloombar/basket', { state: { addedName: prod.name, addedQty: qty } });
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-white">
      <BloomBarCoBrandHeader kiosk={kiosk as { name?: string } | null} />

      {product && (
        <AnimatePresence mode="wait">
          <motion.div
            key={product.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full max-w-full overflow-x-hidden"
          >
            <BloomBarProductCard
              product={product}
              kiosk={kiosk as { name?: string } | null}
              onAdded={handleAdded}
              editWhenInBasket
            />
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
