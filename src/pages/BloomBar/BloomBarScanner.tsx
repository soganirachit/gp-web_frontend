import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion } from 'framer-motion';
import { X, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ScanParams {
  [key: string]: string;
}

interface Props {
  onClose?: () => void;
  onScan?: (params: ScanParams, raw: string) => void;
  /** When set, the header shows the just-added flower instead of the default prompt. */
  lastAddedName?: string | null;
}

export default function BloomBarScanner({ onClose, onScan, lastAddedName }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = useRef(`bb-qr-${Date.now()}`);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [torch, setTorch] = useState(false);
  const navigate = useNavigate();
  const didScan = useRef(false);

  useEffect(() => {
    const id = containerId.current;
    const scanner = new Html5Qrcode(id);
    scannerRef.current = scanner;
    setScanning(true);

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10 },
        (decodedText) => {
          if (didScan.current) return;
          didScan.current = true;
          scanner
            .stop()
            .catch(() => {})
            .finally(() => {
              setScanning(false);
              try {
                const url = new URL(decodedText);
                const params = Object.fromEntries(url.searchParams.entries());
                if (onScan) {
                  onScan(params, decodedText);
                } else {
                  navigate(`/bloombar/product?${url.searchParams.toString()}`);
                }
              } catch {
                if (onScan) onScan({ raw: decodedText }, decodedText);
              }
            });
        },
        () => {}
      )
      .catch(() => {
        setError('Camera access denied. Please allow camera permissions.');
        setScanning(false);
      });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-[calc(3rem+env(safe-area-inset-top))] pb-4">
        <div>
          {lastAddedName ? (
            <>
              <p className="text-white font-semibold text-base">{lastAddedName} added to basket 🌸</p>
              <p className="text-white/60 text-xs mt-0.5">Scan more flowers to add</p>
            </>
          ) : (
            <>
              <p className="text-white font-semibold text-base">Add Flowers to Basket</p>
              <p className="text-white/60 text-xs mt-0.5">Scan a QR code to add it to your basket</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTorch(t => !t)}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              torch ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white'
            }`}
          >
            <Zap size={18} />
          </button>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Scanner viewport */}
      <div className="flex-1 relative flex items-center justify-center">
        <div id={containerId.current} className="w-full h-full" />

        {/* Corner frame overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-60 h-60">
            {(
              [
                ['top-0 left-0', 'border-t-4 border-l-4 rounded-tl-2xl'],
                ['top-0 right-0', 'border-t-4 border-r-4 rounded-tr-2xl'],
                ['bottom-0 left-0', 'border-b-4 border-l-4 rounded-bl-2xl'],
                ['bottom-0 right-0', 'border-b-4 border-r-4 rounded-br-2xl'],
              ] as [string, string][]
            ).map(([pos, style], i) => (
              <div key={i} className={`absolute ${pos} w-10 h-10 ${style} border-genda-gold`} />
            ))}
            {scanning && (
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-genda-gold/80"
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </div>
        </div>

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 260px 260px at center, transparent 0%, transparent 50%, rgba(0,0,0,0.7) 51%)',
          }}
        />
      </div>

      {/* Footer */}
      <div className="px-5 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-4 text-center">
        {error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : (
          <p className="text-white/60 text-xs">Align the product QR code within the frame</p>
        )}
      </div>
    </motion.div>
  );
}
