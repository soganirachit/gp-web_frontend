import React from 'react';
import spinnerSvg from '../../assets/icon/Spinner@1x-1.0s-646px-646px 1.svg';
import { useFeatureTheme } from '../../context/FeatureThemeContext';

interface SpinnerProps {
  size?: number;
  className?: string;
  isLoading?: boolean;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 40, className = '', isLoading = true }) => {
  const { feature } = useFeatureTheme();

  if (!isLoading) return null;

  // For GP Store, apply green filter to match the theme color (#2A6B28)
  // Using CSS filter to convert the orange spinner to green
  const getSpinnerStyle = () => {
    const baseStyle = {
      width: `${size}px`,
      height: `${size}px`
    };

    if (feature === 'gpStore') {
      // Filter to convert orange spinner to green (#2A6B28) - the GP Store primary color
      // This filter converts the color to match the GP Store theme green
      return {
        ...baseStyle,
        // Lighter green filter (approx #5da15b)
        filter: 'brightness(0) saturate(100%) invert(53%) sepia(35%) saturate(735%) hue-rotate(76deg) brightness(95%) contrast(85%)',
      };
    }

    return baseStyle;
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src={spinnerSvg}
        alt="Loading..."
        className="animate-spin"
        style={getSpinnerStyle()}
      />
    </div>
  );
};

export default Spinner; 