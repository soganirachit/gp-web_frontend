import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCart } from '../BloomBarCartContext';

export interface BloomBarProduct {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  category?: string;
  stock_available?: boolean;
  [key: string]: unknown;
}

interface Hotel {
  name?: string;
  [key: string]: unknown;
}

interface Props {
  product: BloomBarProduct;
  hotel?: Hotel | null;
  onAdded: (product: BloomBarProduct, quantity: number) => void;
}

export default function BloomBarProductCard({ product, hotel, onAdded }: Props) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);

  const handleAdd = () => {
    addItem({
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      quantity: qty,
      image_url: product.image_url,
    });
    onAdded(product, qty);
  };

  return (
    <div className="px-4 pb-28">
      {/* Product image — fixed height so content stays visible without scrolling */}
      <div className="w-full h-56 rounded-2xl overflow-hidden bg-genda-cream mb-4">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl">🌸</div>
        )}
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl p-4 premium-shadow">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            {product.category && (
              <span className="text-xs font-medium text-genda-gold bg-genda-gold/10 px-2 py-0.5 rounded-full inline-block mb-1.5">
                {product.category}
              </span>
            )}
            <h1 className="font-playfair text-xl font-semibold text-gray-900 leading-tight">
              {product.name}
            </h1>
          </div>
          <p className="text-xl font-bold text-genda-green whitespace-nowrap">
            ₹{product.price.toLocaleString('en-IN')}
          </p>
        </div>
        {product.description && (
          <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
        )}
        {hotel?.name && (
          <p className="text-xs text-gray-400 mt-2">
            at <span className="font-medium text-gray-600">{hotel.name}</span>
          </p>
        )}
      </div>

      {/* Sticky add-to-basket — quantity + button in one row */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-1 py-1">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600"
            >
              <Minus size={14} />
            </button>
            <span className="font-semibold w-5 text-center text-sm">{qty}</span>
            <button
              onClick={() => setQty(q => q + 1)}
              className="w-8 h-8 rounded-lg genda-gradient text-white flex items-center justify-center"
            >
              <Plus size={14} />
            </button>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleAdd}
            className="flex-1 py-3.5 genda-gradient text-white font-semibold rounded-xl premium-shadow flex items-center justify-center gap-2 text-sm"
          >
            <ShoppingBag size={16} />
            Add to Basket · ₹{(product.price * qty).toLocaleString('en-IN')}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
