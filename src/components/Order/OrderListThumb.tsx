import React from "react";

const PLACEHOLDER = "/placeholder.svg";

type OrderListThumbProps = {
  /** First line item / preview image. */
  primaryImageUrl?: string | null;
  /** Total line items in the order. */
  itemsCount?: number;
  secondImageUrl?: string | null;
  className?: string;
};

/**
 * My Orders row thumbnail — main product image with second-item overlay
 * (rounded square, same family as main tile) showing second product + “+N”.
 */
export const OrderListThumb: React.FC<OrderListThumbProps> = ({
  primaryImageUrl,
  itemsCount = 1,
  secondImageUrl,
  className = "",
}) => {
  const mainSrc =
    (primaryImageUrl && String(primaryImageUrl).trim()) || PLACEHOLDER;
  const showMoreBadge = itemsCount > 1;
  const overlaySrc =
    (secondImageUrl && String(secondImageUrl).trim()) || PLACEHOLDER;
  /** Items beyond the first (badge count on the second-item tile). */
  const additionalCount = Math.max(0, itemsCount - 1);
  const badgeLabel =
    additionalCount > 0 ? `+${additionalCount}` : "+";

  return (
    <div className={`relative h-20 w-20 shrink-0 ${className}`}>
      <img
        src={mainSrc}
        alt=""
        loading="lazy"
        className="h-full w-full rounded-xl object-cover bg-[#F3F4F6]"
        onError={(e) => {
          (e.target as HTMLImageElement).src = PLACEHOLDER;
        }}
      />
      {showMoreBadge ? (
        <div
          className="absolute -bottom-0.5 -right-0.5 h-9 w-9 overflow-hidden rounded-md border-2 border-white bg-[#F3F4F6] shadow-md"
          aria-hidden
        >
          <img
            src={overlaySrc}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER;
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-[11px] font-bold leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {badgeLabel}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default OrderListThumb;
