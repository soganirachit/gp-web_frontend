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

    // Kiosk fetch — branding only, never blocks the product page
    if (kioskId) {
      try {
        const kiosks = await base44.entities.Kiosk.filter({ id: kioskId });
        if (kiosks.length > 0) {
          setKiosk(kiosks[0]);
          setKioskContext({ kioskId, campaign, kiosk: kiosks[0] });
        }
      } catch {
        // kiosk failed — show product without co-brand header
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

    setLoading(false);
  };

  if (loading) return <BloomBarLoadingSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-genda-cream">
        <span className="text-6xl mb-4">🌸</span>
        <h2 className="font-playfair text-2xl font-semibold mb-2">Oops!</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/bloombar" className="py-3 px-8 genda-gradient text-white rounded-2xl font-medium">
          Go Home
        </Link>
      </div>
    );
  }

  const handleAdded = (_prod: Product, _qty: number) => {
    navigate('/bloombar/scan-next');
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-white">
      <BloomBarCoBrandHeader kiosk={kiosk as { name?: string } | null} />

      {product && (
        <AnimatePresence mode="wait">
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 250 }}
            className="w-full max-w-full overflow-x-hidden"
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
