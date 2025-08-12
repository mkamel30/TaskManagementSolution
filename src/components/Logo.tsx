import React from 'react';

// The logo is currently hosted externally. This component centralizes its usage.
const LOGO_URL = "https://wxhinjdceqneufvanfqe.supabase.co/storage/v1/object/public/public-assets/Smart-Logo-Horizontal.jpg";

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <img 
      src={LOGO_URL} 
      alt="Smart Digital Services Logo" 
      className={className} 
    />
  );
};