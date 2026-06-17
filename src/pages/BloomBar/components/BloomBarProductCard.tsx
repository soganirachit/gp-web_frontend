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
    <div className="px-4 pb-32">
      {/* Product image */}
      <div className="w-full aspect-square rounded-2xl overflow-hidden bg-genda-cream mb-4">
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
      <div className="bg-white rounded-2xl p-5 premium-shadow space-y-3">
        {product.category && (
          <span className="text-xs font-medium text-genda-gold bg-genda-gold/10 px-2.5 py-1 rounded-full">
            {product.category}
          </span>
        )}
        <h1 className="font-playfair text-2xl font-semibold text-gray-900">{product.name}</h1>
        <p className="text-2xl font-bold text-genda-green">
          ₹{product.price.toLocaleString('en-IN')}
        </p>
        {product.description && (
          <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
        )}
        {hotel?.name && (
          <p className="text-xs text-gray-400">
            Available at <span className="font-medium text-gray-600">{hotel.name}</span>
          </p>
        )}
      </div>

      {/* Sticky add-to-basket */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 px-5 py-4">
        <div className="flex items-center gap-4 mb-3">
          <span className="text-sm font-medium text-gray-600">Quantity</span>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center"
            >
              <Minus size={14} />
            </button>
            <span className="font-semibold w-5 text-center">{qty}</span>
            <button
              onClick={() => setQty(q => q + 1)}
              className="w-9 h-9 rounded-full genda-gradient text-white flex items-center justify-center"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleAdd}
          className="w-full py-4 genda-gradient text-white font-semibold rounded-2xl premium-shadow flex items-center justify-center gap-2"
        >
          <ShoppingBag size={18} />
          Add to Basket · ₹{(product.price * qty).toLocaleString('en-IN')}
        </motion.button>
      </div>
    </div>
  );
}
