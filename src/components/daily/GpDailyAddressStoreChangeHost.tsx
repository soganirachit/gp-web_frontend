import { useCallback, useEffect, useState } from "react";
import { CartConfirmModal } from "../cart/CartConfirmModal";
import {
  confirmGpDailyAddressStoreChange,
  GP_DAILY_ADDRESS_STORE_CHANGE_EVENT,
  type GpDailyAddressStoreChangeDetail,
} from "../../utils/gpDailyAddressStoreChange";
import { toast } from "react-hot-toast";
import { errorMessageFromCatch } from "../../utils/apiErrorMessage";

/**
 * Global GP Daily prompt when browse address maps to a different fulfilment store.
 * Mounted on the daily home (and any gp-daily shell that changes delivery location).
 */
export function GpDailyAddressStoreChangeHost() {
  const [prompt, setPrompt] = useState<GpDailyAddressStoreChangeDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onStoreChange = (ev: Event) => {
      const detail = (ev as CustomEvent<GpDailyAddressStoreChangeDetail>).detail;
      if (!detail?.addressId) return;
      setPrompt(detail);
    };
    window.addEventListener(GP_DAILY_ADDRESS_STORE_CHANGE_EVENT, onStoreChange);
    return () =>
      window.removeEventListener(
        GP_DAILY_ADDRESS_STORE_CHANGE_EVENT,
        onStoreChange,
      );
  }, []);

  const onCancel = useCallback(() => setPrompt(null), []);

  const onConfirm = useCallback(async () => {
    if (!prompt) return;
    try {
      setLoading(true);
      await confirmGpDailyAddressStoreChange(prompt.addressId);
      setPrompt(null);
      toast.success("Delivery location updated");
    } catch (e: unknown) {
      toast.error(errorMessageFromCatch(e, "Could not confirm address change."));
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  return (
    <CartConfirmModal
      open={prompt != null}
      title="Address changed"
      message={prompt?.message ?? ""}
      loading={loading}
      onConfirm={() => void onConfirm()}
      onCancel={onCancel}
      titleId="gp-daily-global-store-change-title"
    />
  );
}
