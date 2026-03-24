import React, { useContext } from 'react';
import spinnerSvg from '../../assets/icon/Spinner@1x-1.0s-646px-646px 1.svg';
import { FeatureThemeContext } from '../../context/FeatureThemeContext';

interface SpinnerProps {
  size?: number;   // <100 → exact px (inline use). >=100 → responsive (page-level use, size ignored).
  className?: string;
  isLoading?: boolean;
  /** Use 'light' when spinner is on a dark background (e.g. inside colored buttons) */
  variant?: 'default' | 'light';
}

// Theme-aligned filter for GP Store green; no filter = default dark/black for GP Daily
const GREEN_FILTER = 'brightness(0) saturate(100%) invert(53%) sepia(35%) saturate(735%) hue-rotate(76deg) brightness(95%) contrast(85%)';
const LIGHT_FILTER = 'brightness(0) invert(1)'; // white for dark backgrounds

const Spinner: React.FC<SpinnerProps> = ({ size = 64, className = '', isLoading = true, variant = 'default' }) => {
  const themeContext = useContext(FeatureThemeContext);

  if (!isLoading) return null;

  const feature = themeContext?.feature;
  const greenFilter = feature === 'gpStore' ? GREEN_FILTER : undefined;
  const filter = variant === 'light' ? LIGHT_FILTER : greenFilter;

  // Page-level spinner (size >= 100): responsive sizing — large and clearly visible.
  // 44vmin gives ~158px on 360px phone, ~211px on 480px.
  if (size >= 100) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <img
          src={spinnerSvg}
          alt="Loading..."
          className="animate-spin"
          style={{
            width: 'clamp(140px, 44vmin, 260px)',
            height: 'clamp(140px, 44vmin, 260px)',
            filter,
          }}
        />
      </div>
    );
  }

  // Inline spinner (size < 100): exact pixel size as specified.
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src={spinnerSvg}
        alt="Loading..."
        className="animate-spin"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          filter,
        }}
      />
    </div>
  );
};

export default Spinner;
