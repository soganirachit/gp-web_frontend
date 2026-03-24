import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { cartService } from '../services/cart.service';
import { storeService } from '../services/store.service';

export interface CartItem {
  id: string; // Unique cart item ID (UI level)
  apiCartItemId?: number; // API cart item ID (for logged-in users)
  productId: number;
  productSlug: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  variant?: {
    id: number;
    name: string;
    final_price: number;
    inventory_id?: number; // Inventory ID for API sync
  } | null;
  inventoryId?: number; // Direct inventory ID (can be variant.id or product inventory_id)
  customizedMessage?: string;
  categorySlug?: string; // Category slug for conditional features like customized message
  // Note: deliveryDate and timeSlot are stored at cart level, not per item
}

export interface CartDeliveryInfo {
  deliveryDate: string; // Format: "28 Oct 2025" or "Today", "Tomorrow", "Day After"
  timeSlot: string;     // Display label e.g. "8-11 AM"
  slotId?: number;      // ID from GET /api/v1/delivery/slots/available/
  selectedDate?: Date;  // Actual date object for "Pick Date" option
}

interface CartContextType {
  items: CartItem[];
  deliveryInfo: CartDeliveryInfo | null;
  addToCart: (item: Omit<CartItem, 'id'>) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number, specialInstructions?: string) => Promise<void>;
  updateCustomizedMessage: (id: string, message: string) => Promise<void>;
  updateDeliveryInfo: (info: CartDeliveryInfo) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  syncCartToAPI: () => Promise<void>; // Sync local cart to API
  loadCartFromAPI: () => Promise<void>; // Load cart from API
  isSyncing: boolean; // Track if cart is being synced
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CART_STORAGE_KEY = 'gp_store_cart';
export const DELIVERY_INFO_STORAGE_KEY = 'gp_store_cart_delivery_info';
export const TEMP_CART_KEY = 'gp_store_temp_cart'; // Temporary cart for logged-out users

// Helper function to clear all cart data from localStorage
export const clearCartStorage = () => {
  localStorage.removeItem(CART_STORAGE_KEY);
  localStorage.removeItem(DELIVERY_INFO_STORAGE_KEY);
  localStorage.removeItem(TEMP_CART_KEY);
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const pendingAddsRef = useRef<Set<string>>(new Set()); // Track items being added (ref — no re-render needed)
  const shouldSyncOnLoginRef = useRef(false); // Flag to indicate we need to sync after login
  const [items, setItems] = useState<CartItem[]>(() => {
    // Load from localStorage on mount
    // Check if user is logged in to decide which cart to load
    const token = localStorage.getItem('access_token');
    if (token) {
      // User is logged in - load from regular cart
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        try {
          return JSON.parse(savedCart);
        } catch {
          return [];
        }
      }
    } else {
      // User is not logged in - clear regular cart and load from temporary cart only
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(DELIVERY_INFO_STORAGE_KEY);
      const tempCart = localStorage.getItem(TEMP_CART_KEY);
      if (tempCart) {
        try {
          return JSON.parse(tempCart);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  const [deliveryInfo, setDeliveryInfo] = useState<CartDeliveryInfo | null>(() => {
    // Load from localStorage on mount
    const savedInfo = localStorage.getItem(DELIVERY_INFO_STORAGE_KEY);
    if (savedInfo) {
      try {
        const parsed = JSON.parse(savedInfo);
        // Convert selectedDate string back to Date object.
        // Use local year/month/day to avoid UTC-midnight timezone offset bugs.
        if (parsed.selectedDate && typeof parsed.selectedDate === 'string') {
          const d = new Date(parsed.selectedDate);
          parsed.selectedDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        }
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  });


  // Save to localStorage whenever items change
  // Use temp cart if user is not logged in
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      // Don't clear temp cart here - it's handled in the login detection useEffect
      // Only clear if it's empty (already merged)
      const tempCart = localStorage.getItem(TEMP_CART_KEY);
      if (!tempCart || JSON.parse(tempCart).length === 0) {
        localStorage.removeItem(TEMP_CART_KEY);
      }
    } else {
      // User not logged in - use temp cart and clear regular cart
      localStorage.setItem(TEMP_CART_KEY, JSON.stringify(items));
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(DELIVERY_INFO_STORAGE_KEY);
    }
  }, [items]);

  // Save to localStorage whenever deliveryInfo changes
  useEffect(() => {
    if (deliveryInfo) {
      localStorage.setItem(DELIVERY_INFO_STORAGE_KEY, JSON.stringify(deliveryInfo));
    } else {
      localStorage.removeItem(DELIVERY_INFO_STORAGE_KEY);
    }
  }, [deliveryInfo]);

  const generateCartItemId = (): string => {
    return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const addToCart = async (item: Omit<CartItem, 'id'>) => {
    const token = localStorage.getItem('access_token');
    
    // Check if item with same product and variant already exists
    const existingItemIndex = items.findIndex(
      (cartItem) =>
        cartItem.productId === item.productId &&
        cartItem.variant?.id === item.variant?.id
    );

    if (existingItemIndex >= 0) {
      // Update quantity if item already exists
      const existingItem = items[existingItemIndex];
      const newQuantity = existingItem.quantity + item.quantity;
      
      // Update UI cart first
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity = newQuantity;
      setItems(updatedItems);
      
      // Sync to API if logged in
      if (token && existingItem.apiCartItemId) {
        try {
          await cartService.updateCartItem(existingItem.apiCartItemId, newQuantity);
        } catch (error) {
          console.error('Error updating cart item in API:', error);
          // Continue with UI update even if API fails
        }
      } else if (token && existingItem.productId) {
        // Item exists but doesn't have API ID yet - add to API
        try {
          let storeId: number | null = null;
          try {
            storeId = storeService.getStoreIdForProducts();
          } catch (storeError) {
            console.error('Error getting store ID:', storeError);
          }
          if (!storeId) {
            console.error('Store ID not available - item updated in local cart only');
            console.log('Token exists:', !!token, 'ProductId:', existingItem.productId);
            return;
          }
          console.log('Adding to cart with storeId:', storeId, 'productId:', existingItem.productId);
          await cartService.addToCart(
            existingItem.productId,
            storeId,
            item.quantity,
            item.customizedMessage,
            existingItem.variant?.id
          );
          // Reload cart from API to get all items with correct cart_item_id
          // Add a small delay to ensure API has processed the add
          await new Promise(resolve => setTimeout(resolve, 300));
          await loadCartFromAPI();
        } catch (error) {
          console.error('Error adding cart item to API:', error);
        }
      }
    } else {
      // Add new item to UI cart first
      const newItem: CartItem = {
        ...item,
        id: generateCartItemId(),
      };
      setItems([...items, newItem]);
      
      // Sync to API if logged in
      if (token && newItem.productId) {
        // Mark this item as pending add
        pendingAddsRef.current.add(newItem.id);
        try {
          let storeId: number | null = null;
          try {
            storeId = storeService.getStoreIdForProducts();
            console.log('Retrieved storeId:', storeId, 'for productId:', newItem.productId);
            
            // If storeId is not available, try to get it from location
            if (!storeId) {
              console.log('Store ID not found, attempting to get from location...');
              try {
                const locationStoreId = await storeService.getStoreFromLocation();
                if (locationStoreId) {
                  storeId = locationStoreId;
                  console.log('Successfully retrieved storeId from location:', storeId);
                  // If user is logged in, also save it as selected store
                  if (token) {
                    localStorage.setItem('selectedStoreId', locationStoreId.toString());
                  }
                }
              } catch (locationError) {
                console.error('Error getting store from location:', locationError);
              }
            }
          } catch (storeError) {
            console.error('Error getting store ID:', storeError);
          }
          
          if (!storeId) {
            console.error('Store ID not available - cannot add to API cart');
            console.log('Token exists:', !!token, 'SelectedStoreId:', storeService.getSelectedStoreId(), 'TemporaryStoreId:', storeService.getTemporaryStoreId());
            // Remove from pending adds since we're not calling API
            pendingAddsRef.current.delete(newItem.id);
            // Still show success since item is in local cart, but log warning
            console.warn('Item added to local cart only - store ID required for API sync');
            // Show user-friendly error
            // Note: toast is not available in context, so we'll use console.warn
            // The calling component should handle the toast notification
            return;
          }
          console.log('Calling addToCart API with storeId:', storeId, 'productId:', newItem.productId, 'quantity:', newItem.quantity);
          try {
            await cartService.addToCart(
              newItem.productId,
              storeId,
              newItem.quantity,
              newItem.customizedMessage,
              newItem.variant?.id
            );
            console.log('Successfully called addToCart API');
          } catch (apiError) {
            console.error('Error calling addToCart API:', apiError);
            throw apiError; // Re-throw to be caught by outer catch
          }
          
          // The API response might have items array, but it could be empty
          // So we always reload the cart from API to get the latest state
          // This ensures we have all items with correct cart_item_id
          // Add a small delay to ensure API has processed the add
          await new Promise(resolve => setTimeout(resolve, 500));
          try {
            await loadCartFromAPI();
          } catch (reloadError) {
            console.error('Error reloading cart after add:', reloadError);
            // Keep the local item even if reload fails
          } finally {
            // Remove from pending adds after reload
            pendingAddsRef.current.delete(newItem.id);
          }
        } catch (error) {
          console.error('Error adding cart item to API:', error);
          pendingAddsRef.current.delete(newItem.id);
          // Continue with UI update even if API fails
        }
      }
    }
  };

  const removeFromCart = async (id: string) => {
    const token = localStorage.getItem('access_token');
    const itemToRemove = items.find(item => item.id === id);
    
    if (!itemToRemove) return;
    
    // Sync to API first if logged in (before removing from UI)
    if (token && itemToRemove.apiCartItemId) {
      console.log('Removing cart item from API:', { 
        cartItemId: itemToRemove.apiCartItemId,
        productId: itemToRemove.productId,
        productName: itemToRemove.name,
        allItems: items.map(i => ({ id: i.id, apiCartItemId: i.apiCartItemId, name: i.name }))
      });
      try {
        await cartService.removeCartItem(itemToRemove.apiCartItemId);
        console.log('Successfully removed cart item from API');
        // After successful API removal, reload cart to sync with server
        // This ensures we have the latest state
        try {
          await loadCartFromAPI();
        } catch (reloadError) {
          console.error('Error reloading cart after removal:', reloadError);
          // If reload fails, just remove from UI
          setItems(items.filter((item) => item.id !== id));
        }
        return; // Exit early if API call succeeded and cart was reloaded
      } catch (error: any) {
        console.error('Error removing cart item from API:', error);
        const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
        console.error('Error details:', {
          status: error?.response?.status,
          message: errorMessage,
          cartItemId: itemToRemove.apiCartItemId,
          url: error?.config?.url
        });
        
        // If 404, the item might already be deleted - still remove from UI
        if (error?.response?.status === 404) {
          console.warn('Cart item not found in API (404) - removing from UI anyway');
          setItems(items.filter((item) => item.id !== id));
        } else {
          // For other errors, still remove from UI but log the error
          console.warn('API error but removing from UI anyway');
          setItems(items.filter((item) => item.id !== id));
        }
        return;
      }
    } else {
      console.log('Cannot remove from API - missing apiCartItemId:', { 
        hasToken: !!token, 
        apiCartItemId: itemToRemove?.apiCartItemId,
        productId: itemToRemove?.productId,
        productName: itemToRemove?.name
      });
    }
    
    // Remove from UI cart (for logged-out users or items without apiCartItemId)
    setItems(items.filter((item) => item.id !== id));
  };

  const updateQuantity = async (id: string, quantity: number, specialInstructions?: string) => {
    const token = localStorage.getItem('access_token');
    
    if (quantity <= 0) {
      await removeFromCart(id);
      return;
    }
    
    // Find the item before updating
    const item = items.find(item => item.id === id);
    if (!item) return;
    
    // Use provided specialInstructions or keep existing customizedMessage
    const instructionsToUse = specialInstructions !== undefined ? specialInstructions : item.customizedMessage;
    
    // Update UI cart
    const updatedItems = items.map((item) => 
      item.id === id ? { ...item, quantity, customizedMessage: instructionsToUse } : item
    );
    setItems(updatedItems);
    
    // Sync to API if logged in
    if (token) {
      if (item.apiCartItemId) {
        // Item already exists in API - update it
        console.log('Updating cart item in API:', { cartItemId: item.apiCartItemId, quantity, specialInstructions: instructionsToUse, itemId: id });
        try {
          await cartService.updateCartItem(item.apiCartItemId, quantity, instructionsToUse);
          console.log('Successfully updated cart item in API');
          // Refresh from API in background — gets server-computed totals, discounts, etc.
          loadCartFromAPI().catch(reloadError => {
            console.error('Error reloading cart after update:', reloadError);
          });
        } catch (error) {
          console.error('Error updating cart item quantity in API:', error);
          // Revert UI update on error
          setItems(items);
          throw error;
        }
      } else if (item.productId) {
        // Item doesn't have API ID yet - add it to API
        try {
          let storeId: number | null = null;
          try {
            storeId = storeService.getStoreIdForProducts();
          } catch (storeError) {
            console.error('Error getting store ID:', storeError);
          }
          if (!storeId) {
            console.error('Store ID not available');
            return;
          }
          await cartService.addToCart(
            item.productId,
            storeId,
            quantity,
            instructionsToUse,
            item.variant?.id
          );
          // Reload cart from API to get all items with correct cart_item_id
          // Add a small delay to ensure API has processed the add
          await new Promise(resolve => setTimeout(resolve, 300));
          await loadCartFromAPI();
        } catch (error) {
          console.error('Error adding cart item to API:', error);
        }
      }
    }
  };

  const updateCustomizedMessage = async (id: string, message: string) => {
    const token = localStorage.getItem('access_token');
    
    // Find the item before updating
    const item = items.find(item => item.id === id);
    if (!item) return;
    
    // Update UI cart
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, customizedMessage: message } : item
      )
    );
    
    // Sync to API if logged in
    if (token && item.apiCartItemId) {
      try {
        // Update the cart item with current quantity and new special instructions
        await cartService.updateCartItem(item.apiCartItemId, item.quantity, message);
        console.log('Successfully updated special instructions in API');
        loadCartFromAPI().catch(reloadError => {
          console.error('Error reloading cart after update:', reloadError);
        });
      } catch (error) {
        console.error('Error updating special instructions in API:', error);
        // Revert UI update on error
        setItems(items);
        throw error;
      }
    }
  };

  const updateDeliveryInfo = (info: CartDeliveryInfo) => {
    setDeliveryInfo(info);
  };

  const clearCart = () => {
    setItems([]);
    setDeliveryInfo(null);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  /**
   * Load cart from API and merge with local cart
   * This should be called when user navigates to basket page
   */
  const loadCartFromAPI = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      // User not logged in - clear regular cart and use temp cart only
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(DELIVERY_INFO_STORAGE_KEY);
      const tempCart = localStorage.getItem(TEMP_CART_KEY);
      if (tempCart) {
        try {
          const tempItems = JSON.parse(tempCart);
          setItems(tempItems);
        } catch {
          setItems([]);
        }
      } else {
        setItems([]);
      }
      return; // User not logged in, skip API call
    }

    try {
      const cartData = await cartService.getCartData();
      console.log('Loaded cart data from API:', cartData);
      
      // Always reload from API, but merge with local items if API items are empty
      // This handles cases where API hasn't processed the add yet
      if (cartData.items && cartData.items.length > 0) {
        // Replace local cart with API cart items
        // Try to preserve existing item IDs to maintain component state
        const existingItemsMap = new Map();
        // Map by apiCartItemId first (most reliable)
        items.forEach(item => {
          if (item.apiCartItemId) {
            existingItemsMap.set(item.apiCartItemId, item);
          }
        });
        // Also map by (productId, variantId) as fallback for same product different variants
        const compositeKey = (pid: number, vid?: number | null) => `${pid}-${vid ?? 'base'}`;
        items.forEach(item => {
          const key = compositeKey(item.productId, item.variant?.id);
          if (item.productId && !existingItemsMap.has(key)) {
            existingItemsMap.set(key, item);
          }
        });
        
        const apiItems: CartItem[] = cartData.items.map(apiItem => {
          const product = apiItem.product;
          
          // Use unit_price from cart item
          const price = parseFloat(apiItem.unit_price) || 0;
          
          // Get primary image
          const imageUrl = product?.primary_image || '';
          
          // Try to preserve existing item ID - check by apiCartItemId first, then (productId, variantId)
          const compositeKey = (pid: number, vid?: number | null) => `${pid}-${vid ?? 'base'}`;
          const existingItem = existingItemsMap.get(apiItem.cart_item_id)
            || existingItemsMap.get(compositeKey(product?.id, apiItem.variant?.id));
          const itemId = existingItem?.id || generateCartItemId();
          
          const cartItem: CartItem = {
            id: itemId,
            apiCartItemId: apiItem.cart_item_id, // This is the cart item ID for PUT/DELETE
            productId: product?.id || 0,
            productSlug: product?.slug || '',
            name: product?.name || 'Product',
            image: imageUrl,
            price: price,
            quantity: apiItem.quantity,
            // Note: API doesn't provide inventory_id in cart response
            // We'll need to get it when syncing or use product.id as fallback
            customizedMessage: apiItem.special_instructions || undefined,
            variant: apiItem.variant
              ? {
                  id: apiItem.variant.id,
                  name: apiItem.variant.name,
                  final_price: price,
                }
              : null,
            categorySlug: existingItem?.categorySlug, // Preserve categorySlug from existing item if available
          };
          
          console.log('Mapped cart item:', { 
            id: cartItem.id, 
            apiCartItemId: cartItem.apiCartItemId, 
            productId: cartItem.productId, 
            quantity: cartItem.quantity,
            preservedId: !!existingItem
          });
          return cartItem;
        });
        
        console.log('Setting cart items from API:', apiItems);
        setItems(apiItems);
      } else {
        // API cart is empty - but don't clear local cart if we have:
        // 1. Pending adds (items being added to API)
        // 2. Items without apiCartItemId (from temp cart, need syncing)
        const hasUnsavedItems = items.some(item => !item.apiCartItemId);
        if (pendingAddsRef.current.size === 0 && !hasUnsavedItems) {
          console.log('API cart is empty and no pending adds or unsaved items, clearing local cart');
          setItems([]);
        } else {
          console.log('API cart is empty but have pending adds or unsaved items, keeping local cart items', {
            pendingAdds: pendingAddsRef.current.size,
            hasUnsavedItems,
            itemsCount: items.length
          });
          // Keep local items - they will be synced when API processes them
          // Don't call setItems([]) - preserve existing items
        }
      }
    } catch (error: any) {
      console.error('Error loading cart from API:', error);
      // If 401 error, session expired - clear cart
      if (error?.response?.status === 401 || error?.message?.includes('Session expired') || error?.message?.includes('Authentication required')) {
        console.log('Session expired while loading cart - clearing cart data');
        localStorage.removeItem(CART_STORAGE_KEY);
        localStorage.removeItem(DELIVERY_INFO_STORAGE_KEY);
        // Load temp cart if exists, otherwise clear
        const tempCart = localStorage.getItem(TEMP_CART_KEY);
        if (tempCart) {
          try {
            const tempItems = JSON.parse(tempCart);
            setItems(tempItems);
          } catch {
            setItems([]);
          }
        } else {
          setItems([]);
        }
      }
      // Continue with local cart if API fails for other reasons
    }
  };

  /**
   * Sync local cart items to API
   * This should be called when user logs in or clicks checkout
   * It will update existing items or add new ones
   */
  const syncCartToAPI = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('User must be logged in to sync cart');
    }

    if (items.length === 0) {
      return; // Nothing to sync
    }

    setIsSyncing(true);
    try {
      // First, load current API cart to get existing items
      const cartData = await cartService.getCartData();
      // Map by (productId, variantId) - same product with different variants = different lines
      const apiItemKey = (p: { id: number }, v?: { id: number } | null) => `${p?.id ?? 0}-${v?.id ?? 'base'}`;
      const apiItemsMap = new Map(
        cartData.items.map((item: any) => [apiItemKey(item.product, item.variant), item])
      );

      // Process each local cart item
      for (const item of items) {
        if (!item.productId) {
          continue; // Skip items without product ID
        }

        const apiItem = apiItemsMap.get(apiItemKey({ id: item.productId }, item.variant));
        
        if (item.apiCartItemId || apiItem) {
          // Item exists in API - update it
          const cartItemId = item.apiCartItemId || apiItem!.cart_item_id;
          try {
            await cartService.updateCartItem(cartItemId, item.quantity);
            // Update local item with API cart item ID if not set
            if (!item.apiCartItemId) {
              setItems(prevItems =>
                prevItems.map(prevItem =>
                  prevItem.id === item.id
                    ? { ...prevItem, apiCartItemId: cartItemId }
                    : prevItem
                )
              );
            }
          } catch (error) {
            console.error(`Error updating cart item ${item.name}:`, error);
          }
        } else {
          // Item doesn't exist in API - add it
          try {
            let storeId: number | null = null;
            try {
              storeId = storeService.getStoreIdForProducts();
            } catch (storeError) {
              console.error('Error getting store ID:', storeError);
            }
            if (!storeId) {
              console.error('Store ID not available');
              continue;
            }
            await cartService.addToCart(
              item.productId,
              storeId,
              item.quantity,
              item.customizedMessage,
              item.variant?.id
            );
            // Reload cart from API to get all items with correct cart_item_id
            await loadCartFromAPI();
          } catch (error) {
            console.error(`Error adding cart item ${item.name}:`, error);
          }
        }
      }

      // Move items from temp cart to regular cart
      if (token) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        localStorage.removeItem(TEMP_CART_KEY);
      }
      
      // After syncing, reload cart from API to verify sync was successful
      console.log('Syncing complete, reloading cart from API to verify...');
      await loadCartFromAPI();
      console.log('Cart reloaded after sync, verifying UI and API are in sync');
    } catch (error) {
      console.error('Error syncing cart to API:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync cart to API after login when temp cart items are merged
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token && shouldSyncOnLoginRef.current && items.length > 0) {
      // Check if there are items without apiCartItemId (from temp cart)
      const hasUnsavedItems = items.some(item => !item.apiCartItemId);
      if (hasUnsavedItems) {
        console.log('Syncing cart to API after login, items count:', items.length);
        shouldSyncOnLoginRef.current = false; // Reset flag before sync
        
        // Use a small delay to ensure state is fully updated
        const syncTimeout = setTimeout(() => {
          syncCartToAPI()
            .then(() => {
              console.log('Cart synced successfully after login');
              // Reload cart from API to get updated items with apiCartItemId
              setTimeout(() => {
                loadCartFromAPI().catch(err => {
                  console.error('Error reloading cart after sync:', err);
                });
              }, 500);
            })
            .catch(error => {
              console.error('Error syncing cart after login:', error);
              // Reset flag so it can retry if needed
              shouldSyncOnLoginRef.current = true;
            });
        }, 300);
        
        return () => clearTimeout(syncTimeout);
      } else {
        // All items already have apiCartItemId, no need to sync
        shouldSyncOnLoginRef.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Watch for login status changes and sync temp cart to API
  // Also watch for token removal to clear cart
  useEffect(() => {
    const checkLoginStatus = async () => {
      const token = localStorage.getItem('access_token');
      const prevToken = localStorage.getItem('prevToken'); // Track previous token state
      
      // Check if token changed from null/undefined to a value (user just logged in)
      const tokenChanged = token && (!prevToken || prevToken !== token);
      
      if (tokenChanged) {
        // User just logged in (token exists but didn't exist before, or token changed)
        // Immediately fetch cart from API first
        console.log('User logged in, fetching cart from API immediately...');
        loadCartFromAPI().catch(err => {
          console.error('Error loading cart from API on login:', err);
        });
        
        // Merge temp cart items into state and sync to API
        const tempCart = localStorage.getItem(TEMP_CART_KEY);
        if (tempCart) {
          try {
            const tempItems: CartItem[] = JSON.parse(tempCart);
            if (tempItems.length > 0) {
              console.log('User logged in, merging temp cart items:', tempItems.length);
              
              // Merge temp cart items into current state
              setItems(prevItems => {
                // Combine temp items with existing items, avoiding duplicates
                const mergedItems = [...prevItems];
                tempItems.forEach((tempItem: CartItem) => {
                  // Check if item already exists (by productId and variantId)
                  const existingIndex = mergedItems.findIndex(
                    item => item.productId === tempItem.productId &&
                    (item.variant?.id === tempItem.variant?.id || (!item.variant && !tempItem.variant))
                  );
                  if (existingIndex >= 0) {
                    // Update quantity if item exists
                    mergedItems[existingIndex].quantity += tempItem.quantity;
                  } else {
                    // Add new item
                    mergedItems.push(tempItem);
                  }
                });
                
                console.log('Merged cart items:', mergedItems.length);
                
                // Save merged items to regular cart storage
                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(mergedItems));
                
                // Clear temp cart after merging
                localStorage.removeItem(TEMP_CART_KEY);
                
                // Set flag to trigger sync in the dedicated useEffect
                shouldSyncOnLoginRef.current = true;
                
                return mergedItems;
              });
            } else {
              // No temp cart items, but still mark as processed
              localStorage.removeItem(TEMP_CART_KEY);
            }
          } catch (error) {
            console.error('Error processing temp cart on login:', error);
          }
        }
        
        // Mark that we've processed this login
        if (token) {
          localStorage.setItem('prevToken', token);
        }
      } else if (!token && prevToken) {
        // User logged out - clear prevToken marker
        localStorage.removeItem('prevToken');
      } else if (token && prevToken === token) {
        // User is logged in and token hasn't changed - update prevToken to current token
        localStorage.setItem('prevToken', token);
      } else {
        // Token removed - clear regular cart and delivery info
        // Keep only temp cart for non-logged-in users
        localStorage.removeItem(CART_STORAGE_KEY);
        localStorage.removeItem(DELIVERY_INFO_STORAGE_KEY);
        // Clear cart state if it has items from logged-in session
        setItems(prevItems => {
          // Only clear if items have apiCartItemId (meaning they're from logged-in session)
          const hasApiItems = prevItems.some(item => item.apiCartItemId);
          if (hasApiItems) {
            // Load temp cart if it exists, otherwise return empty
            const tempCart = localStorage.getItem(TEMP_CART_KEY);
            if (tempCart) {
              try {
                return JSON.parse(tempCart);
              } catch {
                return [];
              }
            }
            return [];
          }
          return prevItems;
        });
      }
    };

    // Check immediately
    checkLoginStatus();

    // Listen for storage changes (login/logout)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token') {
        checkLoginStatus();
      }
    };

    // Also listen for custom events (for same-tab token removal)
    const handleTokenRemoved = () => {
      checkLoginStatus();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tokenRemoved', handleTokenRemoved);
    
    // Poll for token changes (for same-tab detection)
    let lastToken = localStorage.getItem('access_token');
    const tokenCheckInterval = setInterval(() => {
      const currentToken = localStorage.getItem('access_token');
      if (lastToken !== currentToken) {
        lastToken = currentToken;
        checkLoginStatus();
      }
    }, 1000); // Check every second

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tokenRemoved', handleTokenRemoved);
      clearInterval(tokenCheckInterval);
    };
  }, []); // Run once on mount

  return (
    <CartContext.Provider
      value={{
        items,
        deliveryInfo,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateCustomizedMessage,
        updateDeliveryInfo,
        clearCart,
        getTotalPrice,
        syncCartToAPI,
        loadCartFromAPI,
        isSyncing,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

