import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';

/** ~250ms, ease-in-out feel (Material-style cubic-bezier). */
export const PAGE_FADE_DURATION_SEC = 0.25;
export const PAGE_FADE_EASE = [0.4, 0, 0.2, 1] as const;

const fadeTransition = {
  duration: PAGE_FADE_DURATION_SEC,
  ease: PAGE_FADE_EASE,
};

/**
 * Full-viewport placeholder while lazy chunks load — no spinner, subtle fade-in only.
 */
export function PageFadeFallback() {
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[100] bg-[#f8f6f1]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={fadeTransition}
      aria-hidden
    />
  );
}

/**
 * Wraps `<Outlet />` so route changes cross-fade (exit old → enter new), Swiggy-like.
 */
export function FadingOutlet() {
  const location = useLocation();
  const isSupportDockedComposer =
    location.pathname.includes("/customer-support/chat") ||
    location.pathname.includes("/customer-support/questions");

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname + location.search}
        className={
          isSupportDockedComposer
            ? "h-full w-full"
            : "min-h-full w-full bg-background"
        }
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={fadeTransition}
        style={{ willChange: 'opacity' }}
      >
        <Suspense fallback={<PageFadeFallback />}>
          <Outlet />
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}
