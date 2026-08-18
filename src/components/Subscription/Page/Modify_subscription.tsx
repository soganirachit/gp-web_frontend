import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { IoArrowBack } from "react-icons/io5";

import { subscriptionService, type Subscription } from "../../../services/subscription.service";
import { walletService } from "../../../services/wallet.service";
import { SubscriptionFlowSkeleton } from "../../../components/common/PageSkeletons";
import { useFeatureTheme } from "../../../context/FeatureThemeContext";
import {
  InsufficientWalletModal,
  InsufficientWalletRechargeCard,
  computeMinimumSubscriptionWalletRecharge,
  type InsufficientWalletDetails,
} from "../../../components/daily/InsufficientWalletModal";
import { REQUIRED_TOAST } from "../../../constants/requiredToastMessages";
import { rechargeWalletInApp } from "../../../utils/walletRechargeCheckout";

const WEEK_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function formatDayListShort(shorts: string[]): string {
  const set = new Set(shorts);
  return WEEK_SHORT.filter((d) => set.has(d)).join(", ");
}

function intsToShortLabels(ints: number[]): string[] {
  return [...new Set(ints.filter((n) => n >= 0 && n <= 6))]
    .sort((a, b) => a - b)
    .map((i) => WEEK_SHORT[i]);
}

const ModifySubscription: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, basePath } = useFeatureTheme();
  const primary = theme.colors.primary;

  const subscriptionFromNav =
    (location.state as { subscription?: Subscription } | null)?.subscription ?? null;

  const [subscription, setSubscription] = useState<Subscription | null>(
    subscriptionFromNav,
  );
  const [lineQuantities, setLineQuantities] = useState<number[]>([1]);
  const [deliveryType, setDeliveryType] = useState<"daily" | "custom">("daily");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletRecharging, setWalletRecharging] = useState(false);
  const [insufficientWalletModal, setInsufficientWalletModal] =
    useState<InsufficientWalletDetails | null>(null);
  const initialLineQuantitiesRef = useRef<number[]>([]);
  const initialDeliveryTypeRef = useRef<"daily" | "custom">("daily");
  const initialSelectedDaysRef = useRef<string[]>([]);

  const lineItems = useMemo(() => {
    if (!subscription) return [];
    if (subscription.lineItems && subscription.lineItems.length > 0) {
      return subscription.lineItems;
    }
    return [
      {
        name: subscription.productDetails?.name || "Subscription Pack",
        imageUrl: subscription.productDetails?.imagesUrl?.[0],
        quantity: 1,
        unitPrice: subscription.amount ?? 0,
        subtotal:
          subscription.totalAmount ?? subscription.amount ?? 0,
      },
    ];
  }, [subscription]);

  const firstLine = lineItems[0];

  const packUnitPrice = useMemo(() => {
    if (!subscription) return 0;
    const u = firstLine?.unitPrice ?? subscription.amount;
    return typeof u === "number" && u > 0 ? Math.round(u) : 0;
  }, [subscription, firstLine?.unitPrice]);

  const formatRupees = (n: number) =>
    Number.isFinite(n) ? Math.round(n).toLocaleString("en-IN") : "0";

  const formatQty = (q: number) =>
    Number.isFinite(q) ? (Number.isInteger(q) ? String(q) : String(q)) : "1";

  useEffect(() => {
    if (!subscriptionFromNav?.id) {
      setIsLoading(false);
      return;
    }
    const id = subscriptionFromNav.id;
    let cancelled = false;
    void (async () => {
      try {
        const full = await subscriptionService.getCustomerSubscriptionById(id);
        if (!cancelled && full) {
          setSubscription(full);
        }
      } catch {
        /* keep navigation state subscription */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subscriptionFromNav?.id]);

  // Initialize state from subscription data
  useEffect(() => {
    if (!subscription) return;

    const isCustom =
      subscription.type === "CUSTOM" || subscription.deliveryPreference === "CUSTOM";

    setDeliveryType(isCustom ? "custom" : "daily");

    let shorts: string[] = [];

    if (subscription.deliveryDayInts && subscription.deliveryDayInts.length > 0) {
      shorts = intsToShortLabels(subscription.deliveryDayInts);
    } else {
      const currentDays =
        subscription.deliveryDays && subscription.deliveryDays.length > 0
          ? subscription.deliveryDays
          : subscription.selectedDays ?? [];

      const dayMap: Record<string, string> = {
        monday: "Mon",
        mon: "Mon",
        tuesday: "Tue",
        tue: "Tue",
        wednesday: "Wed",
        wed: "Wed",
        thursday: "Thu",
        thu: "Thu",
        friday: "Fri",
        fri: "Fri",
        saturday: "Sat",
        sat: "Sat",
        sunday: "Sun",
        sun: "Sun",
      };

      shorts = currentDays.map((d: string | number) => {
        if (typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6) {
          return WEEK_SHORT[d];
        }
        const s = String(d ?? "").trim();
        const lower = s.toLowerCase();
        const m = dayMap[lower];
        if (m) return m;
        const cap = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        if ((WEEK_SHORT as readonly string[]).includes(cap)) return cap;
        const up = s.slice(0, 3);
        if ((WEEK_SHORT as readonly string[]).includes(up)) return up;
        return s;
      });
    }

    if (!isCustom) {
      setSelectedDays([...WEEK_SHORT]);
    } else {
      setSelectedDays(shorts.length ? shorts : [...WEEK_SHORT]);
    }

    const qtys = lineItems.map((li) => {
      const q = Number(li.quantity);
      return Number.isFinite(q) && q >= 1 ? Math.round(q) : 1;
    });
    setLineQuantities(qtys.length > 0 ? qtys : [1]);
    initialLineQuantitiesRef.current = qtys.length > 0 ? [...qtys] : [1];
    initialDeliveryTypeRef.current = isCustom ? "custom" : "daily";
    initialSelectedDaysRef.current = isCustom
      ? (shorts.length ? [...shorts] : [...WEEK_SHORT])
      : [...WEEK_SHORT];
  }, [subscription, lineItems]);

  const subscribedDaysDisplay = useMemo(() => {
    if (deliveryType === "daily") {
      return formatDayListShort([...WEEK_SHORT]);
    }
    return formatDayListShort(selectedDays);
  }, [deliveryType, selectedDays]);

  const deliveryFee = Number(subscription?.deliveryFee ?? 0);

  const projectedDailyTotal = useMemo(() => {
    let productTotal = lineItems.reduce((sum, li, idx) => {
      const qty = lineQuantities[idx] ?? li.quantity ?? 1;
      let unit = Number(li.unitPrice ?? 0);
      if (unit <= 0 && qty > 0 && Number(li.subtotal) > 0) {
        unit = Number(li.subtotal) / qty;
      }
      return sum + unit * qty;
    }, 0);
    if (productTotal <= 0 && subscription?.totalAmount) {
      productTotal = Number(subscription.totalAmount) - deliveryFee;
    }
    if (productTotal <= 0 && subscription?.amount) {
      productTotal = Number(subscription.amount);
    }
    return Math.max(0, productTotal + deliveryFee);
  }, [lineItems, lineQuantities, deliveryFee, subscription?.totalAmount, subscription?.amount]);

  const isCodPayment =
    (subscription?.paymentMethod ?? "wallet").toLowerCase() === "cod";

  const hasCostIncrease = useMemo(() => {
    const oldProductTotal = lineItems.reduce((sum, li, idx) => {
      const unit = Number(li.unitPrice ?? 0);
      const qty = initialLineQuantitiesRef.current[idx] ?? li.quantity ?? 1;
      return sum + unit * qty;
    }, 0);
    const oldDailyTotal = oldProductTotal + deliveryFee;
    const daysIncreased =
      deliveryType === "custom" &&
      initialDeliveryTypeRef.current === "custom" &&
      selectedDays.length > initialSelectedDaysRef.current.length;
    const qtyIncreased = lineQuantities.some(
      (q, idx) => q > (initialLineQuantitiesRef.current[idx] ?? 1),
    );
    const switchedToDaily =
      deliveryType === "daily" && initialDeliveryTypeRef.current === "custom";
    return (
      qtyIncreased ||
      daysIncreased ||
      switchedToDaily ||
      projectedDailyTotal > oldDailyTotal
    );
  }, [lineItems, lineQuantities, deliveryFee, deliveryType, selectedDays, projectedDailyTotal]);

  const refreshWalletBalance = useCallback(async () => {
    if (isCodPayment) return;
    try {
      const { balance } = await walletService.getWalletBalance();
      setWalletBalance(balance);
    } catch {
      setWalletBalance(null);
    }
  }, [isCodPayment]);

  useEffect(() => {
    void refreshWalletBalance();
  }, [refreshWalletBalance]);

  useEffect(() => {
    if (isCodPayment) return;
    void refreshWalletBalance();
  }, [lineQuantities, selectedDays, deliveryType, isCodPayment, refreshWalletBalance]);

  const walletShortageDetails = useMemo((): InsufficientWalletDetails | null => {
    if (isCodPayment || walletBalance == null) return null;
    const { threeDayRequiredAmount } = computeMinimumSubscriptionWalletRecharge(
      projectedDailyTotal,
      0,
    );
    if (walletBalance >= threeDayRequiredAmount) return null;
    return {
      currentBalance: walletBalance,
      requiredAmount: projectedDailyTotal,
      shortageAmount: Math.max(0, threeDayRequiredAmount - walletBalance),
      contextLabel:
        "Please recharge your wallet before saving subscription changes.",
    };
  }, [isCodPayment, walletBalance, projectedDailyTotal]);

  const handleWalletRecharge = async (amount: number) => {
    try {
      setWalletRecharging(true);
      await rechargeWalletInApp(amount);
      toast.success("Wallet recharged successfully");
      setInsufficientWalletModal(null);
      const { balance } = await walletService.getWalletBalance();
      setWalletBalance(balance);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Recharge failed. Please try again.";
      toast.error(msg);
    } finally {
      setWalletRecharging(false);
    }
  };

  const handleDayToggle = (day: string) => {
    if (deliveryType === "daily") return;
    if (selectedDays.includes(day)) {
      if (selectedDays.length <= 3) {
        toast.error("You must select at least 3 days");
        return;
      }
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleQuantityChange = (lineIndex: number, change: number) => {
    setLineQuantities((prev) =>
      prev.map((qty, idx) => {
        if (idx !== lineIndex) return qty;
        const next = qty + change;
        return next >= 1 ? next : qty;
      }),
    );
  };

  const handleSaveChanges = async () => {
    if (!subscription) return;

    if (deliveryType === "custom" && selectedDays.length < 3) {
      toast.error("Please select at least 3 delivery days");
      return;
    }

    const paymentMethod = (subscription.paymentMethod ?? "wallet").toLowerCase();

    if (walletShortageDetails && hasCostIncrease) {
      toast.error(REQUIRED_TOAST.WALLET_LOW_SUBSCRIPTION);
      setInsufficientWalletModal(walletShortageDetails);
      return;
    }

    if (
      paymentMethod === "wallet" &&
      hasCostIncrease
    ) {
      try {
        const { balance: walletBalance } = await walletService.getWalletBalance();
        setWalletBalance(walletBalance);
        const newDailyTotal = projectedDailyTotal;
        const { threeDayRequiredAmount } = computeMinimumSubscriptionWalletRecharge(
          newDailyTotal,
          0,
        );
        if (walletBalance < threeDayRequiredAmount) {
          const shortage = Math.max(0, threeDayRequiredAmount - walletBalance);
          toast.error(REQUIRED_TOAST.WALLET_LOW_SUBSCRIPTION);
          const details: InsufficientWalletDetails = {
            currentBalance: walletBalance,
            requiredAmount: newDailyTotal,
            shortageAmount: shortage,
            contextLabel:
              "Please recharge your wallet before saving subscription changes.",
          };
          setInsufficientWalletModal(details);
          return;
        }
      } catch {
        toast.error("Could not verify wallet balance. Please try again.");
        return;
      }
    }

    try {
      setIsUpdating(true);

      const dayMap: Record<string, string> = {
        Mon: "MONDAY",
        Tue: "TUESDAY",
        Wed: "WEDNESDAY",
        Thu: "THURSDAY",
        Fri: "FRIDAY",
        Sat: "SATURDAY",
        Sun: "SUNDAY",
      };

      const apiSelectedDays =
        deliveryType === "daily"
          ? [...WEEK_SHORT].map((d) => dayMap[d])
          : selectedDays.map((day) => dayMap[day]);
      const subscriptionType = deliveryType === "daily" ? "DAILY" : "CUSTOM";

      const itemPayload = lineItems
        .map((li, idx) => {
          const productId = li.productId;
          const qty = lineQuantities[idx] ?? li.quantity;
          if (productId == null || !Number.isFinite(productId) || productId <= 0) {
            return null;
          }
          return {
            product_id: productId,
            quantity: Math.max(1, Math.round(qty)),
          };
        })
        .filter(
          (row): row is { product_id: number; quantity: number } => row != null,
        );

      const updateBody: Parameters<typeof subscriptionService.updateSubscription>[1] = {
        type: subscriptionType,
        selectedDays: apiSelectedDays,
        status: subscription.status as "ACTIVE" | "PAUSED" | "CANCELLED" | "INACTIVE",
      };

      if (itemPayload.length === 1) {
        updateBody.quantity = itemPayload[0].quantity;
      } else if (itemPayload.length > 1) {
        updateBody.items = itemPayload;
      } else if (lineQuantities[0] != null && lineQuantities[0] >= 1) {
        updateBody.quantity = Math.max(1, Math.round(lineQuantities[0]));
      }

      await subscriptionService.updateSubscription(subscription.id, updateBody);

      toast.success("Subscription updated successfully!");
      navigate("/gp-daily/manage-my-subscription");
    } catch (error: unknown) {
      console.error("Error updating subscription:", error);
      const message = error instanceof Error ? error.message : "Failed to update subscription";
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <SubscriptionFlowSkeleton />;
  }

  if (!subscription) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9f5]">
        <div className="text-center">
          <p className="mb-4 text-gray-600">No subscription data found.</p>
          <button
            type="button"
            onClick={() => navigate("/gp-daily/manage-my-subscription")}
            className="text-blue-600 underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <div className="mx-auto max-w-lg px-5 pb-nav-bottom pt-5 md:px-6 md:pt-6">
        {/* Header — IBM Plex Serif title + back (matches Orders / reference) */}
        <header className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="shrink-0 rounded-full p-2 text-gray-900 transition-colors hover:bg-gray-100"
            aria-label="Back"
          >
            <IoArrowBack className="text-xl md:text-2xl" />
          </button>
          <h1 className="font-serif min-w-0 truncate text-xl font-bold text-gray-900 md:text-2xl">
            Modify Subscription
          </h1>
        </header>

        {/* Packs in this subscription */}
        <section className="mb-5">
          <h2 className="text-sm font-bold tracking-wide text-[#1A1A1A]">
            PACKS ({lineItems.length})
          </h2>
          <div className="mt-2 space-y-2">
            {lineItems.map((li, idx) => (
              <div
                key={`modify-pack-${idx}-${li.name}`}
                className="rounded-xl bg-[#F3F4F6] p-2.5"
              >
                <div className="flex gap-2.5">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-white md:h-12 md:w-12">
                    {li.imageUrl ? (
                      <img
                        src={li.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-400">
                        {li.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold leading-snug text-black md:text-base">
                        {li.name}
                      </p>
                      <p className="shrink-0 text-sm font-bold text-[#1A1A1A]">
                        ₹
                        {formatRupees(
                          (lineQuantities[idx] ?? li.quantity) * (li.unitPrice || 0),
                        )}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-[#6B7280]">
                      Qty: {formatQty(lineQuantities[idx] ?? li.quantity)} × ₹
                      {formatRupees(li.unitPrice)}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex w-full items-center justify-between gap-3 border-t border-gray-200/80 pt-2.5">
                  <span className="shrink-0 text-xs font-semibold text-black md:text-sm">
                    Quantity
                  </span>
                  <div className="ml-auto flex shrink-0 items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(idx, -1)}
                      disabled={(lineQuantities[idx] ?? 1) <= 1}
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border-0 bg-gray-100 p-0 transition-colors hover:bg-gray-200 disabled:opacity-50 md:size-[30px]"
                      aria-label="Decrease quantity"
                    >
                      <span className="text-base font-normal leading-none text-black md:text-[18px]">
                        −
                      </span>
                    </button>
                    <span className="min-w-[1.25rem] text-center text-sm font-bold tabular-nums text-black">
                      {lineQuantities[idx] ?? li.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(idx, 1)}
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border-0 p-0 transition-opacity hover:opacity-90 md:size-[30px]"
                      style={{ backgroundColor: primary }}
                      aria-label="Increase quantity"
                    >
                      <span className="text-base font-normal leading-none text-black md:text-[18px]">
                        +
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {!isCodPayment && walletShortageDetails ? (
          <section className="mb-5">
            <InsufficientWalletRechargeCard
              details={walletShortageDetails}
              onRecharge={handleWalletRecharge}
              recharging={walletRecharging}
              variant="inline"
              amountInputId="modify-subscription-wallet-amount"
            />
          </section>
        ) : null}

        {/* Delivery schedule — heading first, then subscribed-days card, then options */}
        <section>
          <h3 className="font-serif text-lg font-bold text-gray-900">
            Delivery Schedule
          </h3>
          <p className="mt-2.5 text-xs font-normal leading-relaxed text-gray-500">
            Choose your preferred delivery frequency
          </p>

          <div
            className="mt-4 rounded-2xl border px-3 py-3"
            style={{
              backgroundColor: "#FFFBE6",
              borderColor: "rgba(250, 162, 34, 0.55)",
            }}
          >
            <p className="text-xs font-semibold text-[#6B5B2E]">Subscribed days</p>
            <p className="mt-1 text-sm font-semibold leading-snug text-black">
              {subscribedDaysDisplay}
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => {
                setDeliveryType("daily");
                setSelectedDays([...WEEK_SHORT]);
              }}
              className="flex w-full cursor-pointer items-center justify-between rounded-2xl border bg-white px-4 py-3 text-left transition-colors"
              style={{
                borderColor: deliveryType === "daily" ? primary : "#e5e7eb",
                borderWidth: deliveryType === "daily" ? 2 : 1,
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 bg-white"
                  style={{ borderColor: primary }}
                >
                  {deliveryType === "daily" ? (
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: primary }} />
                  ) : null}
                </div>
                <span className="truncate font-medium text-gray-900">Daily Delivery</span>
              </div>
              <span className="shrink-0 pl-2 text-sm font-medium text-gray-500">
                ₹{packUnitPrice || "—"}/Pack
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDeliveryType("custom")}
              className="flex w-full cursor-pointer items-center justify-between rounded-2xl border bg-white px-4 py-3 text-left transition-colors"
              style={{
                borderColor: deliveryType === "custom" ? primary : "#e5e7eb",
                borderWidth: deliveryType === "custom" ? 2 : 1,
              }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 bg-white"
                  style={{ borderColor: primary }}
                >
                  {deliveryType === "custom" ? (
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: primary }} />
                  ) : null}
                </div>
                <span className="truncate font-medium text-gray-900">Custom Days</span>
              </div>
              <span className="shrink-0 pl-2 text-sm font-medium text-gray-500">
                ₹{packUnitPrice || "—"}/Pack
              </span>
            </button>
          </div>
        </section>

        {/* Select days — custom only; orange fill + white label on selected */}
        {deliveryType === "custom" ? (
          <section className="mt-6">
            <h3 className="text-base font-semibold text-black">Select Days</h3>
            <p className="mt-1 text-sm text-gray-500">
              Minimum 3 days are required
            </p>
            <div className="relative mt-5 px-0.5">
              <div
                className="pointer-events-none absolute left-[8%] right-[8%] top-1/2 z-0 h-px -translate-y-1/2 bg-gray-400"
                aria-hidden
              />
              <div className="relative z-10 flex justify-between gap-0.5">
                {WEEK_SHORT.map((day) => {
                  const on = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[10px] font-bold transition-colors sm:h-10 sm:w-10 sm:text-[11px] ${
                        on
                          ? "text-black shadow-sm"
                          : "border border-gray-300 bg-white text-black"
                      }`}
                      style={on ? { backgroundColor: primary } : undefined}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {/* Footer */}
        <div className="mt-8 flex gap-3 pb-nav-bottom">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 rounded-xl border border-gray-200 bg-white py-3.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={isUpdating || (hasCostIncrease && walletShortageDetails != null)}
            className="flex-1 rounded-xl py-3.5 text-sm font-bold text-black transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: primary }}
          >
            {isUpdating ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
      <InsufficientWalletModal
        open={insufficientWalletModal != null}
        details={insufficientWalletModal}
        recharging={walletRecharging}
        onClose={() => setInsufficientWalletModal(null)}
        onRecharge={handleWalletRecharge}
      />
    </div>
  );
};

export default ModifySubscription;
