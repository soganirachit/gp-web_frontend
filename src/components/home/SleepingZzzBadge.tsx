import React from "react";

type Props = {
  className?: string;
  /** Orange zzz sized for daily scooter hero. */
  tone?: "default" | "scooter";
};

/** Small “z z” badge — sleeping vehicle on offline hero. */
export const SleepingZzzBadge: React.FC<Props> = ({
  className = "",
  tone = "default",
}) => {
  const isScooter = tone === "scooter";

  return (
    <span
      className={`pointer-events-none absolute right-2 top-1 flex items-end gap-0.5 select-none ${className}`}
      aria-hidden
    >
      <span
        className={
          isScooter
            ? "text-[22px] font-semibold leading-none text-[#E1522D]"
            : "text-sm font-semibold leading-none text-gray-600/75"
        }
      >
        z
      </span>
      <span
        className={
          isScooter
            ? "mb-1 text-[17px] font-semibold leading-none text-[#E1522D]/90"
            : "mb-0.5 text-[11px] font-semibold leading-none text-gray-600/65"
        }
      >
        z
      </span>
    </span>
  );
};
