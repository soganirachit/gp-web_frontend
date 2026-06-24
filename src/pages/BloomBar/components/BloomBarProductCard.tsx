import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Minus, Plus } from 'lucide-react';
import { useCart } from '../BloomBarCartContext';
import { Link } from 'react-router-dom';

export interface BloomBarProduct {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  category?: string;
  badge?: string;
  stock_available?: boolean;
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
  const { addItem, itemCount } = useCart();
  const hasItems = itemCount > 0;
  const inStock = product.stock_available !== false;

  const handleAdd = async () => {
    setAdding(true);
    addItem({
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      quantity,
      image_url: product.image_url,
    });
    await new Promise(r => setTimeout(r, 350));
    setAdding(false);
    onAdded(product, quantity);
  };

  return (
    <div className={fitViewport ? 'flex flex-col h-full min-h-0' : 'block w-full max-w-full overflow-x-hidden'}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 250 }}
        className={
          fitViewport
            ? 'flex-1 min-h-0 flex flex-col w-full max-w-full overflow-x-hidden'
            : 'block w-full max-w-full overflow-x-hidden'
        }
      >
        {/* Product Image — fixed aspect, unchanged in both modes */}
        <div className="relative mx-4 rounded-3xl overflow-hidden bg-genda-cream aspect-[4/3] shrink-0">
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
        <div className={`px-5 pt-4 pb-1 ${fitViewport ? 'flex-1 min-h-0 flex flex-col' : 'shrink-0'}`}>
          <div className="flex items-start justify-between shrink-0">
            <div className="flex-1 min-w-0">
              <h1 className="font-playfair text-2xl font-semibold leading-snug">{product.name}</h1>
              {product.category && (
                <span className="inline-block mt-1 text-xs font-medium text-genda-green bg-genda-cream px-2.5 py-0.5 rounded-full capitalize">
                  {product.category.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <div className="text-right ml-3 shrink-0">
              <p className="font-playfair text-2xl font-bold text-genda-green">
                ₹{product.price?.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-gray-500">per piece</p>
            </div>
          </div>

          {product.description && (
            <p
              className={`mt-2 text-sm text-gray-500 leading-relaxed ${
                fitViewport ? 'flex-1 min-h-0 overflow-hidden' : ''
              }`}
            >
              {product.description}
            </p>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 shrink-0">
              {product.tags.map(tag => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Quantity Section */}
        <div className="mx-5 mt-3 bg-genda-cream rounded-2xl p-4 shrink-0">
          <p className="text-center text-sm font-medium text-gray-800 mb-3">
            How many would you like? 🌸
          </p>
          {/* Quantity selector */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-11 h-11 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-genda-green transition-colors"
            >
              <Minus size={18} />
            </button>
            <span className="text-2xl font-bold tabular-nums w-10 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(q => q + 1)}
              className="w-11 h-11 rounded-full genda-gradient text-white flex items-center justify-center shadow-md"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="flex justify-center mt-2">
            <p className="text-xs text-gray-500">
              Total:{' '}
              <span className="font-semibold text-genda-green">
                ₹{(product.price * quantity).toLocaleString('en-IN')}
              </span>
            </p>
          </div>
        </div>

        {/* Spacer so content doesn't hide behind the fixed button (scroll mode only) */}
        {!fitViewport && <div className="h-28" />}
      </motion.div>

      {/* CTA — inline footer when fitting the viewport, fixed otherwise */}
      <div
        className={
          fitViewport
            ? 'shrink-0 px-5 pt-3 pb-8'
            : 'fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-gradient-to-t from-white via-white/95 to-transparent z-30'
        }
      >
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={!inStock || adding}
            onClick={handleAdd}
            className={`${hasItems ? 'flex-1' : 'w-full'} py-4 rounded-2xl genda-gradient text-white font-semibold text-base disabled:opacity-50 premium-shadow relative overflow-hidden transition-all duration-300`}
          >
            <AnimatePresence mode="wait">
              {adding ? (
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
      </div>
    </div>
  );
}
