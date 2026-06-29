import { format } from "date-fns";
import { toast } from "react-hot-toast";
import {
  subscriptionCartService,
  isSubscriptionCartStoreChangeConfirmation,
} from "../services/subscriptionCart.service";
import { subscriptionService } from "../services/subscription.service";
import { walletService } from "../services/wallet.service";
import { computeFirstSubscriptionDeliveryDateFromWeekdayInts } from "./subscriptionFirstDeliveryDate";
import { notifyDailyCartUpdated } from "./dailyCartEvents";
import {
  clearGpDailyPendingSubscriptionCheckout,
  getGpDailyPendingSubscriptionCheckout,
  type GpDailyPendingSubscriptionCheckout,
} from "./gpDailyPendingSubscriptionCheckout";
import { saveGpDailySubscriptionPricingSnapshot } from "./gpDailySubscriptionPricingSnapshot";

export type ResumeCheckoutResult =
  | {
      success: true;
      message: string;
      navigation: {
        pathname: string;
        state?: Record<string, unknown>;
        replace?: boolean;
      };
    }
  | {
      success: false;
      reason: "insufficient_balance" | "needs_basket" | "failed";
      message?: string;
    };

const BASE_PATH = "/gp-daily";

async function walletCovers(amount: number): Promise<boolean> {
  const { balance } = (await walletService.getWalletBalance()) || {};
  return Number.isFinite(amount) && balance >= amount;
}

/** Basket subscribe flow — subscriptions/cart/checkout/ */
async function resumeSubscriptionCartCheckout(
  pending: Extract<GpDailyPendingSubscriptionCheckout, { kind: "subscription_cart_checkout" }>,
): Promise<ResumeCheckoutResult> {
  if (!(await walletCovers(pending.cartAmount))) {
    return { success: false, reason: "insufficient_balance" };
  }

  try {
    const raw = await subscriptionCartService.setDeliveryAddress(
      pending.addressId,
      false,
    );
    if (isSubscriptionCartStoreChangeConfirmation(raw)) {
      return {
        success: false,
        reason: "needs_basket",
        message:
          "Please return to your basket to confirm your delivery address and store.",
      };
    }
  } catch {
    return {
      success: false,
      reason: "needs_basket",
      message: "Please return to your basket to confirm your delivery address.",
    };
  }

  await subscriptionCartService.setDeliveryDays(pending.deliveryDayInts);
  const subscriptionStartDate = format(
    computeFirstSubscriptionDeliveryDateFromWeekdayInts(pending.deliveryDayInts),
    "yyyy-MM-dd",
  );

  const checkoutRes = await subscriptionCartService.checkout({
    start_date: subscriptionStartDate,
    payment_method: "wallet",
    delivery_days: pending.deliveryDayInts,
  });

  const checkoutPayload =
    (checkoutRes as { data?: Record<string, unknown> })?.data ??
    (checkoutRes as Record<string, unknown>);
  const createdSubId = String(checkoutPayload?.id ?? "").trim();
  if (createdSubId && Number.isFinite(pending.cartAmount) && pending.cartAmount > 0) {
    saveGpDailySubscriptionPricingSnapshot(createdSubId, {
      perDeliveryTotal: pending.cartAmount,
    });
  }

  try {
    const cart = await subscriptionCartService.getDailyCart();
    notifyDailyCartUpdated(cart);
  } catch {
    notifyDailyCartUpdated(null);
  }

  const firstItemName =
    typeof (checkoutRes as { data?: { items?: { product_name?: string }[] } })?.data
      ?.items?.[0]?.product_name === "string"
      ? (checkoutRes as { data: { items: { product_name: string }[] } }).data.items[0]
          .product_name
      : "Pack";

  return {
    success: true,
    message: "Subscription created successfully!",
    navigation: {
      pathname: `${BASE_PATH}/subscription/confirm`,
      replace: true,
      state: {
        isConfirmed: true,
        isStoreProduct: false,
        subscription: (checkoutRes as { data?: unknown })?.data ?? checkoutRes,
        subscriptionDetails: {
          type: pending.deliveryFrequency === "Customize" ? "CUSTOM" : "DAILY",
          startDate: subscriptionStartDate,
          deliveryCount: 7,
          selectedDays: pending.activeDeliveryDays,
        },
        product: { name: firstItemName },
      },
    },
  };
}

/** Product page subscribe → address selection after recharge */
function resumeProductAddressFlow(
  pending: Extract<GpDailyPendingSubscriptionCheckout, { kind: "product_address_flow" }>,
): ResumeCheckoutResult {
  localStorage.setItem(
    "currentSubscription",
    JSON.stringify(pending.subscriptionDetails),
  );
  return {
    success: true,
    message: "Wallet recharged. Continue with your subscription.",
    navigation: {
      pathname: `${BASE_PATH}/address-selection`,
      state: {
        subscriptionDetails: pending.subscriptionDetails,
        basePackId: pending.subscriptionDetails.basePackId,
        autoContinueSubscription: true,
      },
    },
  };
}

/** Address selection confirm after recharge */
async function resumeAddressConfirm(
  pending: Extract<GpDailyPendingSubscriptionCheckout, { kind: "address_confirm" }>,
): Promise<ResumeCheckoutResult> {
  if (!(await walletCovers(pending.requiredAmount))) {
    return { success: false, reason: "insufficient_balance" };
  }

  const { confirmPayload, packDetails, subscriptionType, deliveryCount, sellingPrice } =
    pending;

  const startDate = new Date(confirmPayload.startDate);
  const initiateResponse = await subscriptionService.initiateSubscription({
    basePackId: confirmPayload.basePackId,
    type: confirmPayload.type,
    startDate,
    days: deliveryCount || 7,
    ...(confirmPayload.type === "CUSTOM" && {
      selectedDays: confirmPayload.selectedDays,
    }),
  });

  if (!initiateResponse.success) {
    return {
      success: false,
      reason: "failed",
      message: initiateResponse.message || "Failed to initiate subscription",
    };
  }

  const confirmResponse = await subscriptionService.confirmSubscription({
    basePackId: confirmPayload.basePackId,
    deliveryAddressId: confirmPayload.deliveryAddressId,
    type: confirmPayload.type,
    startDate: new Date(confirmPayload.startDate),
    selectedDays: confirmPayload.selectedDays,
    quantity: confirmPayload.quantity,
  });

  if (!confirmResponse.success) {
    return {
      success: false,
      reason: "failed",
      message: confirmResponse.error || "Failed to confirm subscription",
    };
  }

  const confirmedSubscriptionData = {
    ...confirmResponse.subscription,
    confirmedAt: new Date().toISOString(),
    packDetails,
    type: subscriptionType,
    deliveryCount,
    sellingPrice,
    product: (confirmResponse as { product?: unknown }).product,
  };
  localStorage.setItem(
    "lastConfirmedSubscription",
    JSON.stringify(confirmedSubscriptionData),
  );
  localStorage.removeItem("currentSubscription");

  return {
    success: true,
    message: "Subscription confirmed successfully!",
    navigation: {
      pathname: `${BASE_PATH}/subscription/confirm`,
      state: {
        isConfirmed: true,
        isStoreProduct: false,
        subscription: confirmResponse.subscription,
        product: (confirmResponse as { product?: unknown }).product,
        subscriptionDetails: {
          basePackId: confirmPayload.basePackId,
          type: subscriptionType,
          deliveryCount,
          sellingPrice,
          packDetails,
        },
      },
    },
  };
}

export async function resumeGpDailySubscriptionCheckout(
  pending: GpDailyPendingSubscriptionCheckout,
): Promise<ResumeCheckoutResult> {
  try {
    switch (pending.kind) {
      case "subscription_cart_checkout":
        return await resumeSubscriptionCartCheckout(pending);
      case "product_address_flow":
        return resumeProductAddressFlow(pending);
      case "address_confirm":
        return await resumeAddressConfirm(pending);
      default:
        return { success: false, reason: "failed" };
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Could not complete subscription";
    if (message.toLowerCase().includes("insufficient")) {
      return { success: false, reason: "insufficient_balance", message };
    }
    return { success: false, reason: "failed", message };
  }
}

/** After wallet recharge: run pending checkout if any (GP Daily only). */
export async function tryCompleteGpDailyPendingSubscriptionAfterRecharge(
  navigate: (path: string, options?: { state?: unknown; replace?: boolean }) => void,
  feature: string,
): Promise<boolean> {
  if (feature !== "gpDaily") return false;

  const pending = getGpDailyPendingSubscriptionCheckout();
  if (!pending) return false;

  const result = await resumeGpDailySubscriptionCheckout(pending);
  if (result.success) {
    clearGpDailyPendingSubscriptionCheckout();
    toast.success(result.message);
    navigate(result.navigation.pathname, {
      state: result.navigation.state,
      replace: result.navigation.replace,
    });
    return true;
  }

  if (result.reason === "insufficient_balance") {
    toast.error("Wallet balance is still too low. Please add more funds.");
    return false;
  }

  if (result.reason === "needs_basket") {
    clearGpDailyPendingSubscriptionCheckout();
    toast.error(result.message ?? "Please complete checkout from your basket.");
    navigate(`${BASE_PATH}/basket`);
    return true;
  }

  clearGpDailyPendingSubscriptionCheckout();
  toast.error(result.message ?? "Could not complete subscription. Try again from your basket.");
  navigate(`${BASE_PATH}/basket`);
  return true;
}
