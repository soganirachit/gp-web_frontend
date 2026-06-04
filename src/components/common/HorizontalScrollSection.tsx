import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";

/** Default track styles (product strips, related products, etc.). */
export const GP_HORIZONTAL_SCROLL_TRACK_CLASS =
  "flex items-stretch snap-x snap-mandatory overflow-x-auto gap-3 no-scrollbar pb-4 overscroll-x-contain touch-pan-x";

const ARROW_BASE_CLASS =
  "pointer-events-auto absolute top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200/90 bg-white/95 text-gray-800 shadow-md transition hover:bg-white hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:cursor-default disabled:opacity-30 2xl:flex";

type DesktopNavProps = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
  prevLabel?: string;
  nextLabel?: string;
};

/** Prev/next controls — visible from 1024px (`2xl`) on web only; hidden on phone/tablet. */
export function DesktopHorizontalNavButtons({
  canScrollLeft,
  canScrollRight,
  onPrev,
  onNext,
  className = "",
  prevLabel = "Scroll left",
  nextLabel = "Scroll right",
}: DesktopNavProps) {
  return (
    <>
      <button
        type="button"
        aria-label={prevLabel}
        disabled={!canScrollLeft}
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        className={`${ARROW_BASE_CLASS} left-1 sm:left-2 ${className}`}
      >
        <IoChevronBack size={20} aria-hidden />
      </button>
      <button
        type="button"
        aria-label={nextLabel}
        disabled={!canScrollRight}
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        className={`${ARROW_BASE_CLASS} right-1 sm:right-2 ${className}`}
      >
        <IoChevronForward size={20} aria-hidden />
      </button>
    </>
  );
}

export type HorizontalScrollSectionHandle = {
  scrollBy: (delta: number) => void;
  scrollToStart: () => void;
  scrollToEnd: () => void;
  getElement: () => HTMLDivElement | null;
};

type HorizontalScrollSectionProps = React.ComponentPropsWithoutRef<"div"> & {
  children: React.ReactNode;
  /** Classes on the scrollable track (defaults to GP_HORIZONTAL_SCROLL_TRACK_CLASS). */
  trackClassName?: string;
  /** Wrapper around track + arrows. */
  wrapperClassName?: string;
  /** When set, arrows call these instead of native scroll (e.g. loop carousels). */
  onArrowPrev?: () => void;
  onArrowNext?: () => void;
  /** Force arrow enabled state when using onArrowPrev/onArrowNext. */
  arrowCanGoPrev?: boolean;
  arrowCanGoNext?: boolean;
  prevLabel?: string;
  nextLabel?: string;
  /** Hide arrows even on desktop (e.g. single non-scrollable item). */
  hideArrows?: boolean;
};

function mergeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (value) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(value);
      else (ref as React.MutableRefObject<T | null>).current = value;
    }
  };
}

export const HorizontalScrollSection = forwardRef<
  HTMLDivElement,
  HorizontalScrollSectionProps
>(function HorizontalScrollSection(
  {
    children,
    trackClassName = GP_HORIZONTAL_SCROLL_TRACK_CLASS,
    wrapperClassName = "relative min-w-0",
    onArrowPrev,
    onArrowNext,
    arrowCanGoPrev,
    arrowCanGoNext,
    prevLabel = "Scroll left",
    nextLabel = "Scroll right",
    hideArrows = false,
    className,
    onScroll,
    ...rest
  },
  forwardedRef,
) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const controlledArrows = onArrowPrev != null && onArrowNext != null;

  const updateEdges = useCallback(() => {
    if (controlledArrows) {
      setCanLeft(arrowCanGoPrev ?? true);
      setCanRight(arrowCanGoNext ?? true);
      return;
    }
    const el = innerRef.current;
    if (!el) {
      setCanLeft(false);
      setCanRight(false);
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 2) {
      setCanLeft(false);
      setCanRight(false);
      return;
    }
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft < maxScroll - 2);
  }, [controlledArrows, arrowCanGoPrev, arrowCanGoNext]);

  useEffect(() => {
    updateEdges();
    const el = innerRef.current;
    if (!el) return;
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => updateEdges())
        : null;
    ro?.observe(el);
    window.addEventListener("resize", updateEdges);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges, children]);

  const scrollByDelta = useCallback((dir: -1 | 1) => {
    const el = innerRef.current;
    if (!el) return;
    const step = Math.max(el.clientWidth * 0.82, 120);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }, []);

  const handlePrev = useCallback(() => {
    if (onArrowPrev) {
      onArrowPrev();
      return;
    }
    scrollByDelta(-1);
  }, [onArrowPrev, scrollByDelta]);

  const handleNext = useCallback(() => {
    if (onArrowNext) {
      onArrowNext();
      return;
    }
    scrollByDelta(1);
  }, [onArrowNext, scrollByDelta]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      updateEdges();
      onScroll?.(e);
    },
    [onScroll, updateEdges],
  );

  const showArrows = !hideArrows && (canLeft || canRight || controlledArrows);

  return (
    <div className={wrapperClassName}>
      {showArrows ? (
        <DesktopHorizontalNavButtons
          canScrollLeft={canLeft}
          canScrollRight={canRight}
          onPrev={handlePrev}
          onNext={handleNext}
          prevLabel={prevLabel}
          nextLabel={nextLabel}
        />
      ) : null}
      <div
        ref={mergeRefs(innerRef, forwardedRef)}
        className={[trackClassName, className].filter(Boolean).join(" ")}
        onScroll={handleScroll}
        {...rest}
      >
        {children}
      </div>
    </div>
  );
});
