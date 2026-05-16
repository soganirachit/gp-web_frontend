function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200/90 ${className ?? ""}`}
      aria-hidden
    />
  );
}

const shell = "mx-auto w-full min-w-0 max-w-[min(800px,100vw)]";

export function StoreHomeSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom overflow-x-hidden">
      <div className={shell}>
        <div
          className="relative px-4 pt-0 pb-8"
          style={{
            background: "linear-gradient(to bottom, #DAFFD9, #D8F0D7)",
            minHeight: "clamp(220px, 42vw, 280px)",
          }}
        >
          <div className="flex justify-between items-start pt-3 mb-4">
            <Pulse className="h-10 w-44 rounded-xl" />
            <Pulse className="h-10 w-10 rounded-full" />
          </div>
          {/* One search — matches loaded `GpStore_Homepage` */}
          <Pulse className="h-12 w-full rounded-xl mb-4" />
          {/* Delivery copy + truck placeholder */}
          <div className="flex flex-row items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Pulse className="h-4 w-[92%] rounded-md" />
              <Pulse className="h-4 w-[62%] rounded-md" />
            </div>
            <Pulse className="h-[5.5rem] w-36 shrink-0 rounded-xl sm:h-24 sm:w-40" />
          </div>
        </div>
        <div className="space-y-5 px-4 pt-5 pb-8">
          {/* Namaste + tagline */}
          <div className="space-y-2">
            <Pulse className="h-10 w-48 max-w-[55%] rounded-lg" />
            <Pulse className="h-3.5 w-full rounded" />
            <Pulse className="h-3.5 w-[88%] rounded" />
          </div>
          {/* Pick your Blooms — 4-col categories */}
          <Pulse className="h-5 w-40 rounded" />
          <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:gap-x-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Pulse className="aspect-square w-full rounded-2xl" />
                <Pulse className="h-2.5 w-[72%] rounded" />
              </div>
            ))}
          </div>
          {/* Promo / wedding mint panel */}
          <Pulse className="h-40 w-full rounded-2xl sm:h-44" />
          {/* Product strip — 2-col cards */}
          <Pulse className="h-5 w-32 rounded" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Pulse className="aspect-[4/5] w-full rounded-xl" />
                <Pulse className="h-4 w-[80%]" />
                <Pulse className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GpDailyHomeSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom">
      <div className={shell}>
        <div
          className="relative px-4 pt-0 pb-8"
          style={{
            background:
              "linear-gradient(to bottom, rgba(250, 193, 20, 0.8), rgba(250, 193, 20, 0.4))",
            minHeight: "clamp(220px, 42vw, 280px)",
          }}
        >
          <div className="flex justify-between items-start pt-3 mb-4">
            <Pulse className="h-10 w-44 rounded-xl" />
            <Pulse className="h-10 w-10 rounded-full" />
          </div>
          <Pulse className="h-12 w-full rounded-xl mb-2" />
        </div>
        <div className="px-4 -mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Pulse className="aspect-[4/5] w-full rounded-xl" />
                <Pulse className="h-4 w-3/4" />
                <Pulse className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f6f1]">
      <div className={`relative ${shell} pb-nav-bottom`}>
        <div className="p-4 pt-6 sticky top-0 bg-[#f8f6f1] z-10">
          <div className="flex items-center gap-3">
            <Pulse className="h-10 w-10 rounded-full shrink-0" />
            <Pulse className="h-8 w-48 max-w-[70%]" />
          </div>
        </div>
        <div className="px-4 mt-4">
          <Pulse className="aspect-square w-full rounded-xl" />
          <div className="mt-4 space-y-2">
            <Pulse className="h-6 w-[85%]" />
            <Pulse className="h-10 w-32" />
            <Pulse className="h-12 w-full rounded-xl mt-4" />
          </div>
          <div className="mt-6 flex gap-2">
            <Pulse className="h-10 flex-1 rounded-xl" />
            <Pulse className="h-10 flex-1 rounded-xl" />
            <Pulse className="h-10 flex-1 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductBrowseSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className={`relative min-h-screen ${shell} pb-nav-bottom`}>
        <div className="bg-[#f8f6f1] sticky top-0 z-20 px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Pulse className="h-5 w-5 rounded shrink-0" />
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <Pulse className="h-4 w-16" />
                <Pulse className="h-3 w-40 max-w-full" />
              </div>
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <Pulse className="h-12 w-full rounded-lg" />
          </div>
        </div>
        <div className="bg-[#f8f6f1] px-4 pt-4">
          <Pulse className="h-16 w-full rounded-2xl mb-3" />
          <div className="flex gap-2 overflow-hidden mb-4">
            {[1, 2, 3, 4].map((i) => (
              <Pulse key={i} className="h-9 w-24 shrink-0 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Pulse className="aspect-[4/5] w-full rounded-xl" />
                <Pulse className="h-4 w-4/5" />
                <Pulse className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrdersListSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto w-full max-w-[min(800px,100vw)] pb-nav-bottom">
        <div className="p-4 pt-6 sticky top-0 bg-[#f8f6f1] z-10">
          <div className="flex items-center gap-3 mb-6">
            <Pulse className="h-10 w-10 rounded-full" />
            <Pulse className="h-8 w-40" />
          </div>
          <Pulse className="h-[46px] w-full rounded-xl" />
        </div>
        <div className="px-4 pt-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 p-4 border-b border-gray-200"
            >
              <Pulse className="w-20 h-20 flex-shrink-0 rounded-xl" />
              <div className="flex-1 min-w-0 space-y-2">
                <Pulse className="h-4 w-3/4" />
                <Pulse className="h-4 w-1/2" />
                <Pulse className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className={`${shell} px-4 pt-6 pb-nav-bottom`}>
        <div className="flex items-center gap-3 mb-6">
          <Pulse className="h-10 w-10 rounded-full" />
          <Pulse className="h-8 w-48" />
        </div>
        <Pulse className="h-24 w-full rounded-xl mb-6" />
        <div className="space-y-3 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3 border border-gray-200 rounded-xl">
              <Pulse className="w-16 h-16 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Pulse className="h-4 w-3/4" />
                <Pulse className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
        <Pulse className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function CartPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto w-full max-w-[min(800px,100vw)] pb-nav-bottom">
        <div className="p-4 pt-6 sticky top-0 bg-[#f8f6f1] z-10">
          <div className="flex items-center gap-3">
            <Pulse className="h-10 w-10 rounded-full" />
            <Pulse className="h-8 w-36" />
          </div>
        </div>
        <div className="px-4 pt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 p-4 border border-gray-200 rounded-xl"
            >
              <Pulse className="w-24 h-24 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Pulse className="h-4 w-3/4" />
                <Pulse className="h-4 w-1/3" />
                <Pulse className="h-8 w-28 mt-2" />
              </div>
            </div>
          ))}
          <Pulse className="h-32 w-full rounded-xl mt-4" />
        </div>
      </div>
    </div>
  );
}

export function SettingsListSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto w-full max-w-[min(800px,100vw)] pb-nav-bottom">
        <div className="p-4 pt-6 sticky top-0 bg-[#f8f6f1] z-10">
          <div className="flex items-center gap-3">
            <Pulse className="h-10 w-10 rounded-full" />
            <Pulse className="h-8 w-48" />
          </div>
        </div>
        <div className="px-4 pt-6 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Pulse key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function WalletPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto w-full max-w-[min(800px,100vw)] pb-nav-bottom">
        <div className="p-4 pt-6 sticky top-0 bg-[#f8f6f1] z-10">
          <div className="flex items-center gap-3">
            <Pulse className="h-10 w-10 rounded-full" />
            <Pulse className="h-8 w-32" />
          </div>
        </div>
        <div className="px-4 pt-6">
          <Pulse className="h-36 w-full rounded-2xl mb-6" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Pulse key={i} className="h-14 w-full rounded-xl mb-3" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AddressFormSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f6f1] px-4">
      <div className="max-w-[800px] mx-auto pb-nav-bottom">
        <div className="py-4 flex items-center gap-3">
          <Pulse className="h-10 w-10 rounded-full" />
          <Pulse className="h-7 w-48" />
        </div>
        <Pulse className="h-64 w-full rounded-xl mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Pulse key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SubscriptionFlowSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom flex justify-center items-start px-4 py-8">
      <div className="w-full max-w-[800px] space-y-6">
        <Pulse className="h-10 w-3/4 mx-auto rounded-lg" />
        <Pulse className="h-48 w-full rounded-xl" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Pulse key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
        <Pulse className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

export function AddressSelectionSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f6f1] pb-nav-bottom">
      <div className={shell}>
        <div className="p-4 pt-6">
          <Pulse className="h-8 w-56 mb-6" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="mb-4 p-4 border border-gray-200 rounded-xl flex gap-3"
            >
              <Pulse className="h-5 w-5 rounded-full shrink-0 mt-1" />
              <div className="flex-1 space-y-2">
                <Pulse className="h-4 w-3/4" />
                <Pulse className="h-3 w-full" />
                <Pulse className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ManageStoreSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className="max-w-md mx-auto p-4 pb-nav-bottom">
        <Pulse className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3 border border-gray-200 rounded-lg">
              <Pulse className="w-16 h-16 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Pulse className="h-4 w-3/4" />
                <Pulse className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OrderConfirmationSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      <div className="mx-auto w-full max-w-[min(800px,100vw)] px-4 pt-6 pb-nav-bottom">
        <div className="flex flex-col items-center mb-8">
          <Pulse className="h-16 w-16 rounded-full mb-4" />
          <Pulse className="h-8 w-48 mb-2" />
          <Pulse className="h-4 w-32" />
        </div>
        <Pulse className="h-48 w-full rounded-xl mb-4" />
        <div className="space-y-2">
          <Pulse className="h-4 w-full" />
          <Pulse className="h-4 w-4/5" />
          <Pulse className="h-12 w-full rounded-full mt-6" />
        </div>
      </div>
    </div>
  );
}

export function UnsubscribedHomeSkeleton() {
  return (
    <div className="bg-[#f8f6f1] min-h-screen pb-safe-bottom">
      <div className="mx-auto w-full max-w-[min(800px,100vw)] px-4 md:px-6">
        <Pulse className="w-full aspect-[16/9] rounded-xl mb-6 mt-4" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Pulse className="aspect-[4/5] w-full rounded-xl" />
              <Pulse className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function LocationFinderSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Pulse className="h-9 w-64 mb-6" />
        <Pulse className="h-12 w-full rounded-lg mb-6" />
        <Pulse className="h-[400px] w-full rounded-lg" />
      </div>
    </div>
  );
}

/** Map script loading: replaces centered spinner; keeps layout stable. */
export function MapLoadingPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-[240px] w-full">
      <div className="w-full max-w-md h-48 rounded-xl bg-gray-200/90 animate-pulse" />
      <p className="text-gray-600 text-sm">Loading map...</p>
    </div>
  );
}

/** Map panel inside a fixed-height container (e.g. picker). */
export function MapPanelSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`w-full h-full min-h-[240px] rounded-lg bg-gray-200/90 animate-pulse ${className ?? ""}`}
      aria-hidden
    />
  );
}

/** Inline rows when the page header is already visible (e.g. FAQs). */
export function ContentRowsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-4 py-2 min-h-[200px]">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 w-full rounded-xl bg-gray-200/90 animate-pulse"
        />
      ))}
    </div>
  );
}
