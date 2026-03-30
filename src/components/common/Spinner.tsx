import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { FeatureThemeContext } from '../../context/FeatureThemeContext';
import { PAGE_FADE_DURATION_SEC, PAGE_FADE_EASE } from './PageFade';

interface SpinnerProps {
  size?: number;
  className?: string;
  isLoading?: boolean;
  /** Kept for API compatibility; inline loading uses a soft opacity pulse (no rotating spinner). */
  variant?: 'default' | 'light';
}

/**
 * Page-level loading (size ≥ 100): empty fade surface — no spinner asset.
 * Inline loading (size &lt; 100): subtle opacity pulse — no rotating spinner.
 */
const Spinner: React.FC<SpinnerProps> = ({
  size = 64,
  className = '',
  isLoading = true,
  variant = 'default',
}) => {
  const themeContext = useContext(FeatureThemeContext);

  if (!isLoading) return null;

  const feature = themeContext?.feature;
  const pulseColor =
    variant === 'light'
      ? 'rgba(255,255,255,0.35)'
      : feature === 'gpStore'
        ? 'rgba(25, 65, 31, 0.2)'
        : 'rgba(17, 24, 39, 0.15)';

  if (size >= 100) {
    return (
      <motion.div
        className={`flex h-full min-h-[200px] w-full items-center justify-center bg-[#f8f6f1] ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: PAGE_FADE_DURATION_SEC, ease: PAGE_FADE_EASE }}
        aria-hidden
      />
    );
  }

  const s = Math.max(12, Math.min(size, 96));
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <motion.div
        aria-label="Loading"
        role="status"
        style={{
          width: s,
          height: s,
          borderRadius: 9999,
          backgroundColor: pulseColor,
        }}
        animate={{ opacity: [0.35, 0.85, 0.35] }}
        transition={{
          duration: 1.15,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
};

export default Spinner;
