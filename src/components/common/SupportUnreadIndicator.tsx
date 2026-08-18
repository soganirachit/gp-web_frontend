type Props = {
  /** `store` = green dot. `daily` = orange dot. */
  variant: "store" | "daily";
  size?: "sm" | "md";
  className?: string;
};

/** Unread support message indicator — menu dot and ticket list. */
export function SupportUnreadIndicator({
  variant,
  size = "sm",
  className = "",
}: Props) {
  const outer = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const inner = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  const outerBg = variant === "store" ? "bg-[#E8F5E9]" : "bg-[#FFF8E7]";
  const innerBg = variant === "store" ? "bg-[#19411F]" : "bg-[#FAA222]";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${outer} ${outerBg} ${className}`}
      aria-hidden
    >
      <span className={`rounded-full ${inner} ${innerBg}`} />
    </span>
  );
}
