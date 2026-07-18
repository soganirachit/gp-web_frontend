import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Plus,
  Minus,
  Leaf,
  Flower2,
  Sparkles,
  Camera,
  DoorOpen,
  AlertCircle,
  ChevronRight,
  X,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from './BloomBarCartContext';
import BloomBarCoBrandHeader from './components/BloomBarCoBrandHeader';
import BloomBarFlowerLoader from './components/BloomBarFlowerLoader';
import BloomBarLoadingSkeleton from './components/BloomBarLoadingSkeleton';
import BloomBarProductCard, {
  type BloomBarProduct,
} from './components/BloomBarProductCard';
import { fmt } from './money';
import { stockOf, toastStockCap } from './stock';

type BloomBarType = 'stick' | 'bouquet';

interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  short_description?: string;
  description?: string;
  bloombar_type?: BloomBarType;
  badge?: string;
  /** Units still sellable. null/undefined = uncapped, 0 = out of stock. */
  stock?: number | null;
  /** At or below the inventory item's Minimum Alert Level. */
  low_stock?: boolean;
  [key: string]: unknown;
}

/** Longest the loader is allowed to hold the catalogue back. One unreachable
 *  image must never strand a guest on a spinner, so past this we show the grid
 *  and let whatever is still in flight land on its own. */
const IMAGE_PRELOAD_TIMEOUT_MS = 6000;

/**
 * Download every catalogue image before the grid mounts. Kicking these off from
 * the fetch handler — rather than waiting for React to render <img> tags — is
 * what removes the dead gap between the products/ response and the first image
 * request, and having them all cached is what lets the grid appear at once.
 *
 * Resolves when all are settled or the timeout fires, whichever comes first.
 * A failed image resolves like a successful one: the card's own fallback covers it.
 */
function preloadImages(urls: string[]): Promise<void> {
  if (urls.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    let remaining = urls.length;
    const timer = window.setTimeout(resolve, IMAGE_PRELOAD_TIMEOUT_MS);
    const settle = () => {
      remaining -= 1;
      if (remaining === 0) {
        window.clearTimeout(timer);
        resolve();
      }
    };
    urls.forEach((url) => {
      const img = new Image();
      img.onload = settle;
      img.onerror = settle;
      img.src = url;
    });
  });
}

/**
 * Store-QR "Room Order" page (`/bloombar/<store-code>_products`). Mirrors the
 * gpkiosk prototype: co-brand header, in-room dining intro, a Buy Stems/Bouquets
 * split, and a product grid that feeds the shared basket (which then asks for
 * the guest's room). Bouquets are hand-crafted at the production centre.
 */
export default function BloomBarStore() {
  const { storeSlug = '' } = useParams();
  const code = useMemo(() => storeSlug.replace(/_products$/, ''), [storeSlug]);

  const { itemCount, total, setStoreContext, sessionId } = useCart();
  const navigate = useNavigate();

  const [store, setStore] = useState<Record<string, unknown> | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  // Catalogue images all downloaded (or given up on) — the grid waits for this
  // so it renders complete instead of filling in photo by photo.
  const [imagesReady, setImagesReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<BloomBarType>('stick');
  const [redirecting, setRedirecting] = useState(false);
  // Tapped card → full detail sheet. Null = closed.
  const [selected, setSelected] = useState<CatalogProduct | null>(null);

  // Freeze the store behind the sheet: without this the grid scrolls under the
  // overlay, and closing lands the customer somewhere they never scrolled to.
  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [selected]);

  // Bouquets are fulfilled on the main Genda Phool site. Hand off there, letting the
  // fade overlay play first so the transition feels intentional, not abrupt.
  const goToBouquets = () => {
    if (redirecting) return;
    setRedirecting(true);
    setTimeout(() => {
      window.location.href = 'https://www.mygendaphool.com/category/bouquets';
    }, 600);
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
        const list = p as unknown as CatalogProduct[];
        setStore(s);
        setProducts(list);
        setStoreContext({ storeCode: code, store: s });
        base44.entities.QRScanEvent.create({
          campaign: 'store',
          session_id: sessionId,
          user_agent: navigator.userAgent,
        }).catch(() => {});

        // Catalogue is in — the page renders now. Only the product grid waits.
        setLoading(false);

        // Product photos only. Header artwork is left to load the way it always
        // has; it is small and it is not what makes the grid crawl.
        //
        // Started here rather than on render: every millisecond between this
        // response and the first image request is dead time the guest watches.
        // If they finish before the grid paints, imagesReady is already true and
        // the loader below never appears at all.
        const urls = Array.from(
          new Set(list.map((prod) => prod.image_url).filter((u): u is string => !!u)),
        );
        await preloadImages(urls);
        if (!cancelled) setImagesReady(true);
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

  // Structural wait: no store, no products, nothing to lay out yet.
  if (loading && !error) return <BloomBarLoadingSkeleton />;

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
        <div className="mx-auto flex items-center justify-center gap-1.5 bg-white rounded-full px-4 py-1.5 premium-shadow">
          <DoorOpen size={15} className="text-amber-700" />
          <span className="text-sm font-semibold text-gray-800">India's first In-Room Flower Delivery</span>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl px-3 py-2 premium-shadow">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={12} className="text-genda-gold" />
            <span className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
              How it works
            </span>
          </div>
          <div className="flex items-start justify-between gap-1">
            <HowStep icon={<Camera size={16} className="text-gray-600" />} title="Scan Room QR" />
            <ChevronRight size={12} className="text-gray-300 mt-2.5 shrink-0" />
            <HowStep icon={<span className="text-base">🌸</span>} title="Pick Your Flowers" />
            <ChevronRight size={12} className="text-gray-300 mt-2.5 shrink-0" />
            <HowStep icon={<DoorOpen size={16} className="text-amber-700" />} title="Delivered to Your Room" />
          </div>
        </div>


        {/* Category tabs */}
        <div className="grid grid-cols-2 gap-3">
          <CategoryTab
            active={tab === 'stick'}
            accent="green"
            icon={<Leaf size={18} />}
            label="Buy Stems"
            onClick={() => setTab('stick')}
          />
          <CategoryTab
            active={tab === 'bouquet'}
            accent="gold"
            icon={<Flower2 size={18} />}
            label="Bouquets"
            onClick={goToBouquets}
          />
        </div>

        {/* Section header */}
        {tab === 'stick' ? (
          <div>
            <p className="text-sm text-gray-500 text-center">
              Fresh single stems · Delivered to your room
            </p>
          </div>
        ) : (
          <div>
            <h2 className="font-playfair text-2xl font-semibold flex items-center gap-2">
              <Flower2 size={20} className="text-genda-gold" /> Bouquets &amp; Arrangements
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Hand-crafted at our production centre · delivery to your room
            </p>
          </div>
        )}

        {/* Product grid. Photos still downloading — hold the grid so it lands
            complete instead of painting in one band at a time. Nothing above
            here waits on this: the storefront is already up. */}
        {!imagesReady ? (
          <BloomBarFlowerLoader />
        ) : list.length === 0 ? (
          <div className="py-14 text-center text-gray-500">
            <span className="text-5xl block mb-3">💐</span>
            No {tab === 'stick' ? 'stems' : 'bouquets'} available here right now.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 auto-rows-fr">
            {list.map((product) => (
              <StoreProductCard
                key={product.id}
                product={product}
                accent={tab === 'stick' ? 'green' : 'gold'}
                onOpen={setSelected}
              />
            ))}
          </div>
        )}

        {/* Promo hint — bouquets only (visual only) */}
        {tab === 'bouquet' && (
          <PromoBox
            tone="pink"
            icon={<span className="text-base">💐</span>}
            title="Add a flower stem to your bouquet for just ₹49"
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
                <span className="font-bold shrink-0">₹{fmt(total)}</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product detail sheet — the same card the kiosk QR page renders, in its
          fitViewport mode: the bottom bar becomes an inline footer, so nothing
          inside relies on `fixed` (which this popup's transform would break).
          Reusing it keeps the stock rules — out-of-stock CTA, the + cap, the
          "Only N left" note — identical on both surfaces for free.

          Height follows the content, capped at 85dvh, so a short product is a
          small popup rather than a mostly-empty full-height panel. */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm max-h-[85dvh] bg-white rounded-3xl overflow-hidden flex flex-col premium-shadow"
            >
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-md"
              >
                <X size={18} className="text-gray-700" />
              </button>
              <div className="flex-1 min-h-0 flex flex-col pt-4">
                <BloomBarProductCard
                  product={selected as unknown as BloomBarProduct}
                  fitViewport
                  onAdded={() => setSelected(null)}
                />
              </div>
            </motion.div>
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

function HowStep({ icon, title, desc }: { icon: React.ReactNode; title: string; desc?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center text-center px-0.5">
      <div className="w-8 h-8 rounded-full bg-genda-cream flex items-center justify-center mb-1">
        {icon}
      </div>
      <p className="text-[11px] font-semibold text-gray-800 leading-tight">{title}</p>
      {desc && <p className="text-[10px] text-gray-500 mt-1 leading-snug">{desc}</p>}
    </div>
  );
}

function CategoryTab({
  active,
  accent,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  accent: 'green' | 'gold';
  icon: React.ReactNode;
  label: string;
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
    </button>
  );
}

function StoreProductCard({
  product,
  accent,
  onOpen,
}: {
  product: CatalogProduct;
  accent: 'green' | 'gold';
  onOpen: (product: CatalogProduct) => void;
}) {
  const { items, addItem, updateQuantity } = useCart();
  const qty = items.find((i) => i.product_id === product.id)?.quantity ?? 0;
  const badgeCls = accent === 'green' ? 'bg-genda-green text-white' : 'bg-genda-gold text-white';
  const addCls = accent === 'green' ? 'genda-gradient' : 'bg-genda-gold';

  const stock = stockOf(product);
  const outOfStock = stock === 0;
  const atCap = stock !== null && qty >= stock;
  const showLowStock = product.low_stock === true && stock !== null && stock > 0;

  const increment = () => {
    if (atCap) {
      toastStockCap(stock!);
      return;
    }
    addItem({
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      quantity: 1,
      image_url: product.image_url,
      stock: stock ?? undefined,
    });
  };
  const decrement = () => updateQuantity(product.id, qty - 1);

  return (
    // Whole card opens the detail sheet; the quantity controls stop the click so
    // adding a stem never yanks the sheet open. Out-of-stock still opens — reading
    // about it is the one thing left to do with it.
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(product)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(product);
        }
      }}
      aria-label={`View ${product.name}`}
      className={`bg-white rounded-2xl overflow-hidden premium-shadow flex flex-col h-full cursor-pointer text-left ${
        outOfStock ? 'opacity-60 grayscale' : ''
      }`}
    >
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
        {product.badge && !outOfStock && (
          <span className={`absolute top-2 left-2 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badgeCls}`}>
            {product.badge}
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
            <span className="text-white font-semibold text-sm">Out of Stock</span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
        {showLowStock && (
          <p className="mt-1 text-[11px] font-medium text-amber-700">Only {stock} left</p>
        )}

        <div className="mt-auto pt-3 flex items-end justify-between">
          <div>
            <p className="text-genda-green font-bold text-base leading-none">
              ₹{fmt(product.price)}
            </p>
          </div>
          {/* Quantity controls sit inside a clickable card: swallow the click so
              tapping + adds a stem instead of opening the sheet. */}
          <div onClick={(e) => e.stopPropagation()}>
          {outOfStock ? null : qty === 0 ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={increment}
              aria-label={`Add ${product.name}`}
              className={`shrink-0 w-11 h-11 rounded-full ${addCls} text-white flex items-center justify-center shadow-md`}
            >
              <Plus size={18} />
            </motion.button>
          ) : (
            <div
              className={`shrink-0 flex items-center gap-0.5 rounded-full ${addCls} text-white shadow-md`}
            >
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={decrement}
                aria-label={`Remove one ${product.name}`}
                className="w-9 h-9 flex items-center justify-center"
              >
                <Minus size={16} />
              </motion.button>
              <span className="min-w-[1.25rem] text-center text-sm font-bold tabular-nums">
                {qty}
              </span>
              {/* aria-disabled, not disabled: the tap is what tells the customer
                  why the + stopped. */}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={increment}
                aria-disabled={atCap}
                aria-label={`Add one more ${product.name}`}
                className={`w-9 h-9 flex items-center justify-center ${atCap ? 'opacity-40' : ''}`}
              >
                <Plus size={16} />
              </motion.button>
            </div>
          )}
          </div>
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
