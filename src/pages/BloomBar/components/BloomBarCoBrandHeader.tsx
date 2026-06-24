import { motion } from 'framer-motion';

interface Kiosk {
  name?: string;
  logo_url?: string;
  [key: string]: unknown;
}

interface Props {
  kiosk?: Kiosk | null;
}

export default function BloomBarCoBrandHeader({ kiosk }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center gap-4 py-5 px-6 bg-white"
    >
      {/* Kiosk side */}
      <div className="text-center">
        {kiosk?.logo_url ? (
          <img
            src={kiosk.logo_url}
            alt={kiosk.name}
            className="h-10 w-auto object-contain mx-auto"
          />
        ) : (
          <p className="font-playfair text-lg font-semibold text-gray-900 truncate max-w-[130px]">
            {kiosk?.name || 'Kiosk'}
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
        <p className="font-playfair text-lg font-semibold text-genda-green">Genda Phool</p>
        <p className="text-xs text-gray-400 font-light">Fresh Flowers</p>
      </div>
    </motion.div>
  );
}
