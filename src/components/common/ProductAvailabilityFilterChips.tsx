export type ProductAvailabilityChannel = "store" | "daily";

type Props = {
  value: ProductAvailabilityChannel;
  onChange: (channel: ProductAvailabilityChannel) => void;
  chipActiveClass: string;
  chipInactiveClass: string;
};

const CHANNELS: { id: ProductAvailabilityChannel; label: string }[] = [
  { id: "store", label: "Store" },
  { id: "daily", label: "Daily" },
];

/** Store / Daily catalog chips — same sizing as category filters on Products browse. */
export function ProductAvailabilityFilterChips({
  value,
  onChange,
  chipActiveClass,
  chipInactiveClass,
}: Props) {
  return (
    <>
      {CHANNELS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`touch-target-compact inline-flex flex-shrink-0 items-center rounded-lg px-3.5 py-2 text-xs leading-snug font-medium transition-colors whitespace-nowrap ${
            value === id ? chipActiveClass : chipInactiveClass
          }`}
        >
          {label}
        </button>
      ))}
    </>
  );
}
