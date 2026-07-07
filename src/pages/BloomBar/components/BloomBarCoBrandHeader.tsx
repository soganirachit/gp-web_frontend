import { motion } from 'framer-motion';

interface Kiosk {
  name?: string;
  logo_url?: string;
  store_name?: string;
  store_logo?: string | null;
  [key: string]: unknown;
}

interface Props {
  kiosk?: Kiosk | null;
}

export default function BloomBarCoBrandHeader({ kiosk }: Props) {
  // Prefer the hotel/store branding; fall back to the kiosk's own name/logo.
  const hotelName = kiosk?.store_name || kiosk?.name || 'Hotel';
  const hotelLogo = kiosk?.store_logo || kiosk?.logo_url || undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center gap-4 py-5 px-6 bg-white"
    >
      {/* Hotel side */}
      <div className="text-center">
        {hotelLogo ? (
          <img
            src={hotelLogo}
            alt={hotelName}
            className="h-10 w-auto object-contain mx-auto"
          />
        ) : (
          <p className="font-playfair text-lg font-semibold text-gray-900 max-w-[140px] leading-tight break-words">
            {hotelName}
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="flex flex-col items-center gap-0.5">
        <div className="w-px h-5 bg-gray-200" />
        <span className="text-xs text-gray-400 font-light">×</span>
        <div className="w-px h-5 bg-gray-200" />
      </div>

      {/* Genda Phool side */}
      <div className="text-center">
        <img
          src="/Bloombar-Logo-Final.png"
          alt="Bloombar by Genda Phool"
          className="h-16 w-auto object-contain mx-auto"
        />
      </div>
    </motion.div>
  );
}
