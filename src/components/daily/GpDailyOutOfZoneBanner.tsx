import React from "react";
import { GP_DAILY_OUT_OF_ZONE_USER_MESSAGE } from "../../services/subscriptionZone.service";

type Props = {
  className?: string;
};

/**
 * Visual parity with mobile `CartScreen` `unifiedDeliveryAlertBanner` + `unifiedDeliveryAlertBody`
 * (bg #FEF2F2, border #DC2626, 13px semibold #7F1D1D).
 */
export const GpDailyOutOfZoneBanner: React.FC<Props> = ({ className = "" }) => (
  <div
    className={`min-w-0 rounded-[12px] border border-[#DC2626] bg-[#FEF2F2] px-3 py-2.5 ${className}`.trim()}
    role="alert"
  >
    <p className="m-0 text-[13px] font-semibold leading-[18px] text-[#7F1D1D]">
      {GP_DAILY_OUT_OF_ZONE_USER_MESSAGE}
    </p>
  </div>
);
