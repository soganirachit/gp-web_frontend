import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface BloomBarCartItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

export interface BloomBarHotelContext {
  hotelId: string;
  kioskId?: string;
  campaign: string;
  hotel?: Record<string, unknown>;
}

interface CartContextValue {
  items: BloomBarCartItem[];
  itemCount: number;
  total: number;
  updateQuantity: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  addItem: (item: BloomBarCartItem) => void;
  clearCart: () => void;
  hotelContext: BloomBarHotelContext | null;
  setHotelContext: (ctx: BloomBarHotelContext) => void;
  sessionId: string;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'bloombar_cart';
const SESSION_KEY = 'bloombar_session_id';

/** One stable session id per device, persisted so scan → order → payment all share it
 *  (the backend matches conversions to scans by session_id). */
function getOrCreateSessionId(): string {
  try {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `sess_${Date.now()}`;
  }
}

const SESSION_ID = getOrCreateSessionId();

export function BloomBarCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<BloomBarCartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [hotelContext, setHotelContextState] = useState<BloomBarHotelContext | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const addItem = useCallback((item: BloomBarCartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === item.product_id);
      if (existing) {
        return prev.map(i =>
          i.product_id === item.product_id
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prev, item];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setItems(prev => prev.filter(i => i.product_id !== productId));
    } else {
      setItems(prev =>
        prev.map(i => (i.product_id === productId ? { ...i, quantity: qty } : i))
      );
    }
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.product_id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const setHotelContext = useCallback((ctx: BloomBarHotelContext) => {
    setHotelContextState(ctx);
  }, []);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        total,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        hotelContext,
        setHotelContext,
        sessionId: SESSION_ID,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within BloomBarCartProvider');
  return ctx;
}
