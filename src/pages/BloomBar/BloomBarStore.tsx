import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Plus,
  Check,
  Leaf,
  Flower2,
  Sparkles,
  Camera,
  DoorOpen,
  AlertCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from './BloomBarCartContext';
import BloomBarCoBrandHeader from './components/BloomBarCoBrandHeader';
import BloomBarLoadingSkeleton from './components/BloomBarLoadingSkeleton';

type BloomBarType = 'stick' | 'bouquet';

interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  short_description?: string;
  description?: string;
  bloombar_type?: BloomBarType;
  delivery_eta?: string;
  badge?: string;
  [key: string]: unknown;
}

/**
 * Store-QR "Room Order" page (`/bloombar/<store-code>_products`). Mirrors the
 * gpkiosk prototype: co-brand header, in-room dining intro, a Sticks/Bouquets
 * split, and a product grid that feeds the shared basket (which then asks for
 * the guest's room). Sticks are 30-min; bouquets are hand-crafted (4-hr).
 */
export default function BloomBarStore() {
  const { storeSlug = '' } = useParams();
  const code = useMemo(() => storeSlug.replace(/_products$/, ''), [storeSlug]);

  const { addItem, itemCount, total, setStoreContext, sessionId } = useCart();
  const navigate = useNavigate();

  const [store, setStore] = useState<Record<string, unknown> | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<BloomBarType>('stick');
  const [redirecting, setRedirecting] = useState(false);

  // Bouquets are fulfilled through the GP Store catalog + checkout. Hand off there,
  // letting the fade overlay play first so the transition feels intentional, not abrupt.
  const goToBouquets = () => {
    if (redirecting) return;
    setRedirecting(true);
    setTimeout(() => navigate('/gp-store/products'), 550);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!code) throw new Error('No store specified');
        const { store: s, products: p } = await base44.entities.Store.catalog(code);
        if (cancelled) return;
        setStore(s);
        setProducts(p as unknown as CatalogProduct[]);
        setStoreContext({ storeCode: code, store: s });
        base44.entities.QRScanEvent.create({
          campaign: 'store',
          session_id: sessionId,
          user_agent: navigator.userAgent,
        }).catch(() => {});
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const sticks = useMemo(
    () => products.filter((p) => (p.bloombar_type ?? 'stick') === 'stick'),
    [products]
  );
  const bouquets = useMemo(
    () => products.filter((p) => p.bloombar_type === 'bouquet'),
    [products]
  );

  // Land on whichever tab actually has stock.
  useEffect(() => {
    if (!loading && sticks.length === 0 && bouquets.length > 0) setTab('bouquet');
  }, [loading, sticks.length, bouquets.length]);

  if (loading) return <BloomBarLoadingSkeleton />;

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center bg-genda-cream">
        <span className="text-6xl mb-4">🌸</span>
        <h2 className="font-playfair text-2xl font-semibold mb-2">Oops!</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/bloombar" className="py-3 px-8 genda-gradient text-white rounded-2xl font-medium">
          Go Home
        </Link>
      </div>
    );
  }

  const storeName = (store?.store_name as string) || 'Hotel';
  const list = tab === 'stick' ? sticks : bouquets;

  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-genda-cream pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <BloomBarCoBrandHeader
        kiosk={{ name: storeName, logo_url: store?.store_logo as string | undefined }}
      />

      <div className="px-4 pt-2 space-y-4">
        {/* In-Room Dining pill */}
        <div className="mx-auto flex items-center justify-center gap-2 bg-white rounded-full px-5 py-3 premium-shadow">
          <DoorOpen size={18} className="text-amber-700" />
          <span className="font-semibold text-gray-800">In-Room Dining</span>
          <span className="text-gray-400">· Delivered to your door</span>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-3xl p-5 premium-shadow">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-genda-gold" />
            <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              How it works
            </span>
          </div>
          <div className="flex items-start justify-between gap-1">
            <HowStep icon={<Camera size={22} className="text-gray-600" />} title="Scan Room QR" desc="Scan the QR on your room desk" />
            <ChevronRight size={16} className="text-gray-300 mt-6 shrink-0" />
            <HowStep icon={<span className="text-xl">🌸</span>} title="Pick Your Flowers" desc="Choose flower sticks or bouquets" />
            <ChevronRight size={16} className="text-gray-300 mt-6 shrink-0" />
            <HowStep icon={<DoorOpen size={22} className="text-amber-700" />} title="Delivered to Your Room" desc="Sticks in 30 min · Bouquets in 4 hrs" />
          </div>
        </div>

        {/* Bouquet timing notice */}
        <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
            <AlertCircle size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-amber-800 leading-snug">
              Bouquets ordered now will be delivered tomorrow
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              Bouquets are hand-crafted at our production centre · Same-day delivery before 2 PM IST
            </p>
          </div>
        </div>

        {/* Category tabs */}
        <div className="grid grid-cols-2 gap-3">
          <CategoryTab
            active={tab === 'stick'}
            accent="green"
            icon={<Leaf size={18} />}
            label="Sticks"
            eta="30 min"
            onClick={() => setTab('stick')}
          />
          <CategoryTab
            active={tab === 'bouquet'}
            accent="gold"
            icon={<Flower2 size={18} />}
            label="Bouquets"
            eta="4 hrs"
            onClick={goToBouquets}
          />
        </div>

        {/* Section header */}
        {tab === 'stick' ? (
          <div>
            <h2 className="font-playfair text-2xl font-semibold flex items-center gap-2">
              <Leaf size={20} className="text-genda-green" /> Flower Sticks
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Fresh single stems · Delivered to your room in 30 minutes
            </p>
          </div>
        ) : (
          <div>
            <h2 className="font-playfair text-2xl font-semibold flex items-center gap-2">
              <Flower2 size={20} className="text-genda-gold" /> Bouquets &amp; Arrangements
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Hand-crafted at our production centre · 4-hour delivery to your room
            </p>
          </div>
        )}

        {/* Product grid */}
        {list.length === 0 ? (
          <div className="py-14 text-center text-gray-500">
            <span className="text-5xl block mb-3">💐</span>
            No {tab === 'stick' ? 'flower sticks' : 'bouquets'} available here right now.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 auto-rows-fr">
            {list.map((product) => (
              <StoreProductCard
                key={product.id}
                product={product}
                accent={tab === 'stick' ? 'green' : 'gold'}
                onAdd={() =>
                  addItem({
                    product_id: product.id,
                    product_name: product.name,
                    price: product.price,
                    quantity: 1,
                    image_url: product.image_url,
                  })
                }
              />
            ))}
          </div>
        )}

        {/* Promo hint — bouquets only (visual only) */}
        {tab === 'bouquet' && (
          <PromoBox
            tone="pink"
            icon={<span className="text-base">💐</span>}
            title="Add a flower stick to your bouquet for just ₹49"
            desc="A single stem makes the arrangement pop"
          />
        )}
      </div>

      {/* Sticky continue-to-basket bar */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-40"
          >
            <div className="max-w-lg mx-auto">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/bloombar/basket')}
                className="w-full py-4 px-5 genda-gradient text-white font-semibold text-base rounded-2xl premium-shadow flex items-center gap-2"
              >
                <ShoppingBag size={18} className="shrink-0" />
                <span className="flex-1 text-center">
                  Continue to Basket · {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>
                <span className="font-bold shrink-0">₹{total.toLocaleString('en-IN')}</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smooth hand-off to the GP Store bouquet catalog */}
      <AnimatePresence>
        {redirecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-genda-cream"
          >
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 14, stiffness: 200 }}
              className="text-5xl mb-4"
            >
              💐
            </motion.span>
            <p className="font-playfair text-lg font-semibold text-gray-800">Taking you to Bouquets…</p>
            <div className="mt-4 w-6 h-6 border-2 border-genda-green/30 border-t-genda-green rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HowStep({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex-1 flex flex-col items-center text-center px-0.5">
      <div className="w-12 h-12 rounded-full bg-genda-cream flex items-center justify-center mb-2">
        {icon}
      </div>
      <p className="text-sm font-semibold text-gray-800 leading-tight">{title}</p>
      <p className="text-[11px] text-gray-500 mt-1 leading-snug">{desc}</p>
    </div>
  );
}

function CategoryTab({
  active,
  accent,
  icon,
  label,
  eta,
  onClick,
}: {
  active: boolean;
  accent: 'green' | 'gold';
  icon: React.ReactNode;
  label: string;
  eta: string;
  onClick: () => void;
}) {
  const activeCls =
    accent === 'green' ? 'bg-genda-green text-white' : 'bg-genda-gold text-white';
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-sm transition-colors ${
        active ? activeCls : 'bg-white text-gray-700 border border-gray-200'
      }`}
    >
      {icon}
      <span>{label}</span>
      <span className={`text-xs font-normal ${active ? 'text-white/80' : 'text-gray-400'}`}>
        {eta}
      </span>
    </button>
  );
}

function StoreProductCard({
  product,
  accent,
  onAdd,
}: {
  product: CatalogProduct;
  accent: 'green' | 'gold';
  onAdd: () => void;
}) {
  const [added, setAdded] = useState(false);
  const badgeCls = accent === 'green' ? 'bg-genda-green text-white' : 'bg-genda-gold text-white';
  const addCls = accent === 'green' ? 'genda-gradient' : 'bg-genda-gold';

  const handleAdd = () => {
    onAdd();
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden premium-shadow flex flex-col h-full">
      <div className="relative w-full aspect-square bg-genda-cream shrink-0 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl">💐</div>
        )}
        {product.badge && (
          <span className={`absolute top-2 left-2 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badgeCls}`}>
            {product.badge}
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 min-h-[2.5rem]">{product.name}</h3>

        <div className="mt-auto pt-3 flex items-end justify-between">
          <div>
            <p className="text-genda-green font-bold text-base leading-none">
              ₹{product.price.toLocaleString('en-IN')}
            </p>
            {product.delivery_eta && (
              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                <Clock size={11} /> {product.delivery_eta}
              </p>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleAdd}
            aria-label={`Add ${product.name}`}
            className={`shrink-0 w-11 h-11 rounded-2xl ${addCls} text-white flex items-center justify-center shadow-md`}
          >
            {added ? <Check size={18} /> : <Plus size={18} />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function PromoBox({
  tone,
  icon,
  title,
  desc,
}: {
  tone: 'gray' | 'cream' | 'pink';
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  const toneCls =
    tone === 'gray'
      ? 'bg-gray-100'
      : tone === 'cream'
        ? 'bg-amber-50 border border-amber-100'
        : 'bg-pink-50 border border-pink-100';
  const titleCls =
    tone === 'gray' ? 'text-genda-green' : tone === 'cream' ? 'text-genda-gold' : 'text-pink-600';
  return (
    <div className={`flex items-center gap-3 rounded-2xl p-3.5 ${toneCls}`}>
      <div className="shrink-0 w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className={`font-semibold text-sm ${titleCls}`}>{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </div>
  );
}
