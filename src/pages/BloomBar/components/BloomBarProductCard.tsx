import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Minus, Plus } from 'lucide-react';
import { useCart } from '../BloomBarCartContext';
import { Link } from 'react-router-dom';
import { fmt } from '../money';
import { stockOf, toastStockCap } from '../stock';

export interface BloomBarProduct {
  id: string;
  name: string;
  price: number;
  short_description?: string;
  /** Long description. Rendered under the short one when it adds something. */
  description?: string;
  image_url?: string;
  category?: string;
  badge?: string;
  /** Units still sellable. null/undefined = uncapped, 0 = out of stock. */
  stock?: number | null;
  /** At or below the inventory item's Minimum Alert Level. */
  low_stock?: boolean;
  tags?: string[];
  [key: string]: unknown;
}

interface Kiosk {
  name?: string;
  [key: string]: unknown;
}

interface Props {
  product: BloomBarProduct;
  kiosk?: Kiosk | null;
  onAdded: (product: BloomBarProduct, quantity: number) => void;
  /** When true, the card fills its parent's height and never scrolls:
   *  the image keeps its size, the description absorbs/clips any extra height,
   *  and the CTA sits inline as a footer (always just above the basket button). */
  fitViewport?: boolean;
}

export default function BloomBarProductCard({ product, onAdded, fitViewport = false }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const { addItem, itemCount, items } = useCart();
  const hasItems = itemCount > 0;

  const stock = stockOf(product);
  const inStock = stock !== 0;
  // What's already in the basket counts against the shelf, so the stepper caps at
  // what's actually still addable — not at the full stock figure.
  const inBasket = items.find(i => i.product_id === product.id)?.quantity ?? 0;
  const addable = stock === null ? null : Math.max(0, stock - inBasket);
  const atCap = addable !== null && quantity >= addable;
  const noneLeftToAdd = addable === 0;
  // "Only N left" — the remaining count, surfaced only once inventory says it's
  // worth mentioning (at/below the Minimum Alert Level).
  const showLowStock = product.low_stock === true && stock !== null && stock > 0;
  // Plenty of products repeat the short description in the long one; printing it
  // twice just looks broken.
  const longDescription =
    product.description && product.description.trim() !== (product.short_description ?? '').trim()
      ? product.description
      : null;

  // Stock can drop between render and tap (or the basket already holds the lot):
  // never leave the stepper sitting above what can still be added.
  useEffect(() => {
    if (addable !== null && addable > 0 && quantity > addable) setQuantity(addable);
  }, [addable, quantity]);

  // In scroll mode the quantity section + CTA live in one fixed bottom bar.
  // Measure it so the scrolling content reserves exactly the right space and
  // the controls are never pushed off-screen when the description expands.
  const bottomBarRef = useRef<HTMLDivElement>(null);
  const [bottomBarHeight, setBottomBarHeight] = useState(0);
  useEffect(() => {
    if (fitViewport) return;
    const el = bottomBarRef.current;
    if (!el) return;
    const update = () => setBottomBarHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitViewport]);

  const handleAdd = async () => {
    setAdding(true);
    addItem({
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      quantity,
      image_url: product.image_url,
      stock: stock ?? undefined,
    });
    await new Promise(r => setTimeout(r, 350));
    setAdding(false);
    onAdded(product, quantity);
  };

  // ── Quantity selector (shared by both layouts) ──────────────────────────────
  const quantitySection = (
    <div className="bg-genda-cream rounded-2xl p-4">
      <p className=" text-center text-sm font-large text-gray-800 mb-3">
        How many stems would you like? 🌸
      </p>
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => setQuantity(q => Math.max(1, q - 1))}
          className="w-11 h-11 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-genda-green transition-colors"
        >
          <Minus size={18} />
        </button>
        <span className="text-2xl font-bold tabular-nums w-10 text-center">{quantity}</span>
        {/* aria-disabled, not disabled: a disabled button swallows the click, and
            the tap is what explains WHY the + stopped. Reads as disabled, still
            answers the customer. */}
        <button
          onClick={() => (atCap ? toastStockCap(addable!) : setQuantity(q => q + 1))}
          aria-disabled={atCap}
          aria-label={`Add one more ${product.name}`}
          className={`w-11 h-11 rounded-full genda-gradient text-white flex items-center justify-center shadow-md transition-opacity ${
            atCap ? 'opacity-40' : ''
          }`}
        >
          <Plus size={18} />
        </button>
      </div>
      <div className="flex flex-col items-center gap-1 mt-2">
        <p className="text-xs text-gray-500">
          Total:{' '}
          <span className="font-semibold text-genda-green">
            ₹{fmt(product.price * quantity)}
          </span>
        </p>
        {showLowStock && (
          <p className="text-xs font-medium text-amber-700">Only {stock} left</p>
        )}
      </div>
    </div>
  );

  // ── Add-to-basket buttons (shared by both layouts) ──────────────────────────
  const ctaButtons = (
    <div className="flex items-center gap-3">
      <motion.button
        whileTap={{ scale: 0.97 }}
        disabled={!inStock || noneLeftToAdd || adding}
        onClick={handleAdd}
        className={`${hasItems ? 'flex-1' : 'w-full'} py-4 rounded-2xl ${
          inStock ? 'genda-gradient' : 'bg-gray-400'
        } text-white font-semibold text-base disabled:opacity-50 premium-shadow relative overflow-hidden transition-all duration-300`}
      >
        <AnimatePresence mode="wait">
          {!inStock ? (
            <motion.span key="oos" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              Out of Stock
            </motion.span>
          ) : noneLeftToAdd ? (
            <motion.span key="nomore" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              No items left to add more
            </motion.span>
          ) : adding ? (
            <motion.div
              key="adding"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2"
            >
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Adding...</span>
            </motion.div>
          ) : (
            <motion.span key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              Add to Basket 🌸
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {hasItems && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 300 }}
          >
            <Link
              to="/bloombar/basket"
              className="w-16 h-14 rounded-2xl bg-white border-2 border-genda-green flex flex-col items-center justify-center relative flex-shrink-0 shadow-md"
            >
              <ShoppingBag size={18} className="text-genda-green" />
              <span className="absolute -top-2 -right-2 bg-genda-gold text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {itemCount}
              </span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className={fitViewport ? 'flex flex-col h-full min-h-0' : 'block w-full max-w-full overflow-x-hidden'}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 250 }}
        className={
          fitViewport
            ? // The whole body scrolls as one region — image included. Sizing each
              // part to fit instead needs a flex-1/min-h-0 chain through every
              // wrapper, and one broken link silently clips the copy and the CTA.
              // overscroll-contain stops a flick at the end from scrolling the store behind.
              'flex-1 min-h-0 overflow-y-auto overscroll-contain w-full max-w-full overflow-x-hidden'
            : 'block w-full max-w-full overflow-x-hidden'
        }
      >
        {/* Product Image — square, but capped in the sheet so opening it doesn't
            land on a wall of photo with the copy pushed below the fold. */}
        <div
          className={`relative mx-4 rounded-3xl overflow-hidden bg-white aspect-square shrink-0 ${
            fitViewport ? 'max-h-[38dvh]' : ''
          }`}
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full max-w-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl">💐</span>
            </div>
          )}
          {product.badge && (
            <div className="absolute top-3 left-3 bg-genda-gold text-white text-xs font-semibold px-3 py-1 rounded-full">
              {product.badge}
            </div>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-semibold text-lg">Out of Stock</span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="px-5 pt-4 pb-1 shrink-0">
          <div className="flex items-start justify-between shrink-0">
            <div className="flex-1 min-w-0">
              <h1 className="font-playfair text-2xl font-semibold leading-snug">{product.name}</h1>
              {product.category && (
                <span className="inline-block mt-1 text-xs font-medium text-genda-green bg-genda-cream px-2.5 py-0.5 rounded-full capitalize">
                  {product.category.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            {/* List price. Any automatic discount is revealed on the basket's
                summary rather than silently folded in here — a discounted price
                shown alone just reads as a cheap product. */}
            <div className="text-right ml-3 shrink-0">
              <p className="font-playfair text-2xl font-bold text-genda-green">
                ₹{fmt(product.price ?? 0)}
              </p>
              <p className="text-xs text-gray-500">per piece</p>
            </div>
          </div>

          {/* Copy block — scrolls with the rest of the body, never truncated. */}
          <div className="mt-2">
            {product.short_description && (
              <p className="text-sm text-gray-500 leading-relaxed">{product.short_description}</p>
            )}

            {longDescription && (
              <p className="mt-3 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {longDescription}
              </p>
            )}

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {product.tags.map(tag => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

      </motion.div>

      {/* Scroll mode: reserve exactly the fixed bar's height so content can
          scroll fully behind it and the controls stay on-screen. */}
      {!fitViewport && <div aria-hidden style={{ height: bottomBarHeight }} />}

      {/* Bottom bar — quantity + CTA, held out of the scroll region in both modes:
          a pinned footer in the sheet, a fixed bar in scroll mode. Out of stock:
          no picker, the CTA says Out of Stock on its own. */}
      <div
        ref={bottomBarRef}
        className={
          fitViewport
            ? 'shrink-0 bg-white border-t border-gray-100 px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]'
            : 'fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
        }
      >
        {inStock && <div className={fitViewport ? 'pb-3' : 'px-5 pt-4'}>{quantitySection}</div>}
        <div className={fitViewport ? '' : 'px-5 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]'}>{ctaButtons}</div>
      </div>
    </div>
  );
}
