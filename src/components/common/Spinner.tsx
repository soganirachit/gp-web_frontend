import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { FeatureThemeContext } from '../../context/FeatureThemeContext';
import { PAGE_FADE_DURATION_SEC, PAGE_FADE_EASE } from './PageFade';

interface SpinnerProps {
  size?: number;
  className?: string;
  isLoading?: boolean;
  /** `light`: white ring for dark primary buttons. `default`: brand / neutral ring on light UI. */
  variant?: 'default' | 'light';
}

/**
 * Page-level loading (size ≥ 100): empty fade surface — no spinner asset.
 * Inline loading (size &lt; 100): rotating circular border (standard loader).
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
  const ringClass =
    variant === 'light'
      ? 'border-white/35 border-t-white'
      : feature === 'gpStore'
        ? 'border-[rgba(25,65,31,0.22)] border-t-[#19411f]'
        : 'border-gray-200 border-t-gray-800';

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        role="status"
        aria-label="Loading"
        className={`box-border animate-spin rounded-full border-2 border-solid ${ringClass}`}
        style={{ width: s, height: s }}
      />
    </div>
  );
};

export default Spinner;
