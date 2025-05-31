import React from 'react';
import spinnerSvg from '../../assets/icon/Spinner@1x-1.0s-646px-646px 1.svg';

interface SpinnerProps {
  size?: number;
  className?: string;
  isLoading?: boolean;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 40, className = '', isLoading = true }) => {
  if (!isLoading) return null;
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src={spinnerSvg} 
        alt="Loading..."
        className="animate-spin"
        style={{
          width: `${size}px`,
          height: `${size}px`
        }}
      />
    </div>
  );
};

export default Spinner; 