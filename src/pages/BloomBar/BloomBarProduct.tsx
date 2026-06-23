import { useEffect, useState } from 'react';
import { useCart } from './BloomBarCartContext';
import { base44 } from '@/api/base44Client';
import BloomBarCoBrandHeader from './components/BloomBarCoBrandHeader';
import BloomBarProductCard, { BloomBarProduct as Product } from './components/BloomBarProductCard';
import BloomBarLoadingSkeleton from './components/BloomBarLoadingSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function BloomBarProductPage() {
  const { setKioskContext, sessionId } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [kiosk, setKiosk] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedItem, setAddedItem] = useState<{ product: Product; quantity: number } | null>(null);
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
      let resolvedProduct: Product | undefined;
      if (productId) {
        const products = await base44.entities.Product.filter({ id: productId });
        if (products.length > 0) resolvedProduct = products[0] as unknown as Product;
        else throw new Error('Product not found or unavailable');
      } else {
        const products = await base44.entities.Product.list('-created_date', 1);
        if (products.length > 0) resolvedProduct = products[0] as unknown as Product;
        else throw new Error('No products available');
      }
      setProduct(resolvedProduct!);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
      return;
    }

    // Kiosk is branding-only — never block the product page if it fails
    if (kioskId) {
      try {
        const kiosks = await base44.entities.Kiosk.filter({ id: kioskId });
        if (kiosks.length > 0) {
          setKiosk(kiosks[0]);
          setKioskContext({ kioskId, campaign, kiosk: kiosks[0] });
        }
      } catch {
        // kiosk fetch failed (inactive/deleted) — show product without co-brand header
      }
    }

    if (productId) {
      // Record the scan with the shared session id so the backend can attribute
      // a later conversion (payment) back to this scan, and bump scan_count.
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
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-white">
        <span className="text-6xl mb-4">🌸</span>
        <h2 className="font-playfair text-2xl font-semibold mb-2">Oops!</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/bloombar" className="py-3 px-8 genda-gradient text-white rounded-2xl font-medium">
          Go Home
        </Link>
      </div>
    );
  }

  const handleAdded = (prod: Product, qty: number) => {
    setAddedItem({ product: prod, quantity: qty });
    setTimeout(() => navigate('/bloombar/scan-next'), 2000);
  };

  if (addedItem) {
    return (
      <div className="min-h-screen bg-genda-cream flex flex-col items-center justify-center px-5">
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
            {addedItem.product.name} Added! 🌸
          </h1>
          <p className="text-gray-500 text-sm">
            {addedItem.quantity > 1 && (
              <span className="font-semibold text-gray-800">{addedItem.quantity}× </span>
            )}
            Added to your basket · Taking you to next step…
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-genda-cream min-h-screen flex flex-col">
      <BloomBarCoBrandHeader kiosk={kiosk as { name?: string } | null} />

      {product && (
        <AnimatePresence mode="wait">
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col py-4 min-h-0"
          >
            <BloomBarProductCard
              product={product}
              kiosk={kiosk as { name?: string } | null}
              onAdded={handleAdded}
            />
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
