import { useCallback, useRef, useState } from "react";
import { CartConfirmModal } from "../components/cart/CartConfirmModal";
import {
  REPLACE_CART_CONFIRM_MESSAGE,
  REPLACE_CART_CONFIRM_TITLE,
} from "../utils/cartConfirmCopy";
import {
  type CartChannel,
  detectCartStoreMismatch,
  replaceCartForBrowseStore,
  resolveBrowseCatalogStoreId,
} from "../utils/cartStoreMismatch";

type UseCartStoreReplaceGateOptions = {
  /** Called after cart is replaced (e.g. reload CartContext / daily cart state). */
  onAfterReplace?: () => Promise<void>;
};

/**
 * Zomato/Swiggy-style gate: if browse store ≠ cart store and cart has items,
 * prompt before adding from the new location.
 */
export function useCartStoreReplaceGate(
  channel: CartChannel,
  options: UseCartStoreReplaceGateOptions = {},
) {
  const { onAfterReplace } = options;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const pendingActionRef = useRef<(() => Promise<void>) | null>(null);

  const runWithStoreCheck = useCallback(
    async (action: () => Promise<void>) => {
      const mismatch = await detectCartStoreMismatch(channel);
      if (!mismatch.hasMismatch) {
        await action();
        return;
      }
      pendingActionRef.current = action;
      setOpen(true);
    },
    [channel],
  );

  const handleConfirm = useCallback(async () => {
    const browseId = resolveBrowseCatalogStoreId(channel);
    if (browseId == null) {
      setOpen(false);
      pendingActionRef.current = null;
      return;
    }
    setLoading(true);
    try {
      await replaceCartForBrowseStore(channel, browseId);
      await onAfterReplace?.();
      setOpen(false);
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      if (action) await action();
    } finally {
      setLoading(false);
    }
  }, [channel, onAfterReplace]);

  const handleCancel = useCallback(() => {
    pendingActionRef.current = null;
    setOpen(false);
  }, []);

  const modal = (
    <CartConfirmModal
      open={open}
      title={REPLACE_CART_CONFIRM_TITLE}
      message={REPLACE_CART_CONFIRM_MESSAGE}
      confirmLabel="Replace"
      cancelLabel="Cancel"
      loading={loading}
      onConfirm={() => void handleConfirm()}
      onCancel={handleCancel}
      titleId="cart-store-replace-title"
    />
  );

  return { runWithStoreCheck, modal };
}
