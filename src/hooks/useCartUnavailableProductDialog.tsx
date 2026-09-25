import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { CartConfirmModal } from "../components/cart/CartConfirmModal";
import {
  PRODUCT_UNAVAILABLE_MODAL_TITLE,
  productUnavailableOnStoreMessage,
} from "../utils/cartConfirmCopy";

export type CartUnavailableLine = {
  id: string;
  name: string;
  isUnavailable: boolean;
};

/**
 * App-parity: OK-only “Product unavailable” dialog, then drop the line and
 * refresh the basket. One product at a time if several are unsellable.
 */
export function useCartUnavailableProductDialog(
  lines: CartUnavailableLine[],
  removeLine: (id: string) => Promise<void>,
) {
  const [active, setActive] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const removingIdRef = useRef<string | null>(null);

  const nextUnavailable = useMemo(
    () => lines.find((l) => l.isUnavailable && l.id !== removingIdRef.current),
    [lines],
  );

  useEffect(() => {
    if (active || loading) return;
    if (!nextUnavailable) return;
    setActive({ id: nextUnavailable.id, name: nextUnavailable.name });
  }, [active, loading, nextUnavailable]);

  const confirm = useCallback(async () => {
    if (!active) return;
    removingIdRef.current = active.id;
    setLoading(true);
    try {
      await removeLine(active.id);
      setActive(null);
    } catch {
      toast.error("Failed to remove item. Please try again.");
    } finally {
      removingIdRef.current = null;
      setLoading(false);
    }
  }, [active, removeLine]);

  const modal = (
    <CartConfirmModal
      open={active != null}
      title={PRODUCT_UNAVAILABLE_MODAL_TITLE}
      message={productUnavailableOnStoreMessage(active?.name ?? "")}
      confirmLabel="OK"
      cancelLabel={null}
      loading={loading}
      onConfirm={() => void confirm()}
      titleId="cart-product-unavailable-title"
    />
  );

  return { modal };
}
