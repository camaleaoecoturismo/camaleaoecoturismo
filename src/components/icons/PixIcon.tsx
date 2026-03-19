import React from 'react';
import pixLogo from '@/assets/pix-logo.png';

interface PixIconProps {
  size?: number;
  className?: string;
}

export const PixIcon: React.FC<PixIconProps> = ({ size = 24, className = '' }) => {
  return (
    <img
      src={pixLogo}
      alt="PIX"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
};

export default PixIcon;
