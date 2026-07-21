import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { motion } from 'framer-motion';
import { X, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ScanParams {
  [key: string]: string;
}

/** Scan attempts per second. 10 is plenty — each tick downsamples a frame and
 *  runs a full decode, so raising this costs CPU on cheap phones for very
 *  little gain. Tuning knob, not a constant of nature. */
const SCAN_FPS = 10;

/**
 * Camera zoom applied once the track is live, clamped to what the device
 * actually supports. This is the ONE lever that genuinely extends scanning
 * distance here: html5-qrcode resamples every frame down to the CSS size of the
 * video element before decoding (html5-qrcode.ts foreverScan → drawImage with
 * dWidth = qrRegion.width in CSS px), so raising camera resolution alone changes
 * nothing. Zoom makes the QR occupy more of those same pixels.
 *
 * Lower this if close-range scans start falling outside the frame; set to 1 to
 * disable. Devices without zoom support skip it entirely.
 */
const TARGET_ZOOM = 2;

/** Resolution we ask for. `ideal` only — an `exact` value the device can't meet
 *  throws OverconstrainedError and the camera never opens. */
const BASE_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: 'environment',
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

/**
 * Build the ONE constraint set carrying every camera tweak we want.
 *
 * This has to be a single call. `MediaStreamTrack.applyConstraints()` REPLACES
 * the track's whole constraint set, and html5-qrcode's `zoomFeature().apply()` /
 * `torchFeature().apply()` each call it with only their own value — so applying
 * them one at a time makes each wipe the last (toggling the torch would silently
 * cancel zoom and focus, and drop the resolution request with them).
 *
 * Each entry in `advanced` is an independent best-effort ConstraintSet: the
 * browser applies the ones it can and skips the rest, so an unsupported focusMode
 * or zoom costs nothing and never throws.
 */
function buildCameraConstraints(
  zoomTarget: number | null,
  torchOn: boolean,
): MediaTrackConstraints {
  const advanced: Record<string, unknown>[] = [{ focusMode: 'continuous' }];
  if (zoomTarget) advanced.push({ zoom: zoomTarget });
  advanced.push({ torch: torchOn });
  return { ...BASE_VIDEO_CONSTRAINTS, advanced } as MediaTrackConstraints;
}

/**
 * Turn a getUserMedia/html5-qrcode failure into something a customer can act on.
 *
 * This used to be a hardcoded "Camera access denied", which was wrong for every
 * cause except one — an http:// origin, a camera busy in another app and an
 * unsupported constraint all reported as a permission problem and sent people
 * to reset a permission that was never the issue.
 */
function describeCameraError(err: unknown): string {
  // Checked first: on an insecure origin navigator.mediaDevices is undefined, so
  // the failure never even reaches a DOMException with a useful name.
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    return 'The camera needs a secure connection. Open this page over https:// (or localhost) and try again.';
  }
  const name =
    typeof err === 'string' ? err : (err as { name?: string } | null)?.name ?? '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Camera permission is blocked. Allow camera access in your browser settings, then reload.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No camera was found on this device.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'The camera is being used by another app. Close it and try again.';
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'This camera does not support the requested settings.';
    default:
      return `Could not start the camera${name ? ` (${name})` : ''}. Please try again.`;
  }
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
  // Torch (flashlight) is device/browser dependent — notably unsupported on iOS
  // Safari. Detected once the camera is live so we don't show a dead button.
  const [torchSupported, setTorchSupported] = useState(false);
  const navigate = useNavigate();
  const didScan = useRef(false);
  // Zoom this device actually supports, resolved once the track is live. Held in
  // a ref, not state: every constraint re-apply needs it and it must never
  // trigger a re-render of a live viewfinder.
  const zoomTargetRef = useRef<number | null>(null);

  useEffect(() => {
    const id = containerId.current;

    // Fail fast and honestly on an insecure origin: getUserMedia doesn't exist
    // there, so starting would only produce a misleading permission error.
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(describeCameraError(null));
      setScanning(false);
      return;
    }

    // formatsToSupport belongs on the CONSTRUCTOR, not start(). Limiting it to
    // QR skips every other symbology's decode attempt on each frame.
    // useBarCodeDetectorIfSupported is already true by default in v2.3.8 — set
    // explicitly so a future default flip can't silently slow scanning down. The
    // library keeps ZXing as the fallback where BarcodeDetector is unavailable.
    const scanner = new Html5Qrcode(id, {
      verbose: false,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      useBarCodeDetectorIfSupported: true,
    });
    scannerRef.current = scanner;
    setScanning(true);

    const dispatch = (decodedText: string) => {
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
    };

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: SCAN_FPS,
          // Deliberately NO qrbox. It sets the decode canvas size, so a qrbox of
          // 250 would cut the decoder's pixels by more than half AND require the
          // customer to centre the tag in a smaller window — the opposite of the
          // longer scanning range we want. The full viewfinder is the scan area.
          //
          // videoConstraints REPLACES the first argument when present
          // (html5-qrcode.ts start()), so facingMode has to be repeated here or
          // we'd silently get the selfie camera. All values are `ideal`, never
          // `exact`: an unsatisfiable exact constraint throws OverconstrainedError
          // and the camera never opens at all.
          videoConstraints: BASE_VIDEO_CONSTRAINTS,
        },
        (decodedText) => {
          if (didScan.current) return;
          didScan.current = true;
          // Stop is fired but NOT awaited: tearing the track down takes a few
          // hundred ms and the customer shouldn't stare at a frozen viewfinder
          // for it. The unmount cleanup below is guarded by isScanning, so a
          // second stop can't error. didScan already blocks a double dispatch.
          scanner.stop().catch(() => {});
          setScanning(false);
          dispatch(decodedText);
        },
        () => {}
      )
      .then(async () => {
        // Capabilities are only readable once the track is live.
        try {
          const capabilities = scanner.getRunningTrackCameraCapabilities();
          setTorchSupported(capabilities.torchFeature().isSupported());

          const zoom = capabilities.zoomFeature();
          if (zoom.isSupported()) {
            const target = Math.min(TARGET_ZOOM, zoom.max());
            if (target > zoom.min()) zoomTargetRef.current = target;
          }
        } catch {
          setTorchSupported(false);
        }

        // Continuous autofocus + zoom in one shot. Every scan opens a brand-new
        // camera (the flow navigates away and remounts) and a fresh track
        // restarts autofocus convergence from scratch — which is exactly why the
        // second flower feels worse than the first. Best-effort: a device that
        // supports neither just carries on with the defaults.
        try {
          await scanner.applyVideoConstraints(
            buildCameraConstraints(zoomTargetRef.current, false),
          );
        } catch {
          /* unsupported on this device — the scanner still works untuned */
        }
      })
      .catch((err) => {
        setError(describeCameraError(err));
        setScanning(false);
      });

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Push the torch state to the camera whenever it changes. The track closes on
  // stop/unmount, so no explicit cleanup is needed.
  //
  // Goes through the SAME combined constraint set as the initial tuning rather
  // than torchFeature().apply(): that helper calls applyConstraints with only
  // {torch}, which replaces the whole set and would silently cancel the zoom and
  // continuous focus every time the customer tapped the flash.
  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner || !torchSupported) return;
    try {
      scanner
        .applyVideoConstraints(buildCameraConstraints(zoomTargetRef.current, torch))
        .catch(() => {});
    } catch {
      /* track not live yet — ignore */
    }
  }, [torch, torchSupported]);

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
          {torchSupported && (
            <button
              onClick={() => setTorch(t => !t)}
              aria-label={torch ? 'Turn off flash' : 'Turn on flash'}
              aria-pressed={torch}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                torch ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white'
              }`}
            >
              <Zap size={18} />
            </button>
          )}
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Scanner viewport.
          overflow-hidden is required: the scan window's dimming is painted by a
          huge-spread box-shadow, which would otherwise bleed over the header and
          footer. */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        <div id={containerId.current} className="w-full h-full" />

        {/* Scan window + dimming.
            The mask used to be a radial-gradient, which can only ever draw a
            circle — that circle also ran under the fixed "Continue to Basket"
            button on iOS, where Safari's bottom bar shortens the viewport.
            One square element with `box-shadow: 0 0 0 9999px` paints everything
            OUTSIDE itself instead: exactly square, no gradient maths, identical
            on every browser.
            The bottom padding reserves room for that fixed CTA (and the iOS home
            indicator via safe-area-inset), so the window is centred in the space
            that's actually free rather than the full height. */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6 pb-[calc(9rem+env(safe-area-inset-bottom))]">
          <div
            className="relative w-full max-w-[280px] aspect-square rounded-2xl"
            style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }}
          >
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
