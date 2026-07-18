import { motion, useReducedMotion } from 'framer-motion';

/** Petals of the spinning bloom. */
const PETALS = [0, 45, 90, 135, 180, 225, 270, 315];

/** Blossoms drifting down the screen — staggered so they never fall in step. */
const FALLING = [
  { left: '8%', delay: 0, duration: 4.2, size: 20, glyph: '🌸', sway: 22 },
  { left: '22%', delay: 1.6, duration: 5.4, size: 14, glyph: '🌼', sway: -16 },
  { left: '38%', delay: 0.7, duration: 3.8, size: 17, glyph: '🌸', sway: 18 },
  { left: '54%', delay: 2.3, duration: 5, size: 13, glyph: '🌺', sway: -20 },
  { left: '69%', delay: 0.4, duration: 4.6, size: 19, glyph: '🌼', sway: 16 },
  { left: '84%', delay: 1.9, duration: 5.8, size: 15, glyph: '🌸', sway: -14 },
  { left: '94%', delay: 3.1, duration: 4, size: 12, glyph: '🌺', sway: 15 },
];

/**
 * Stands in for the product grid while its photos download: a slowly turning
 * bloom with blossoms falling past it. Occupies the grid's slot only — the
 * storefront around it is already up — and holds until every product image is
 * cached, so the grid lands complete instead of painting in band by band.
 *
 * Sized near a grid row so swapping it for the products barely shifts the page.
 */
export default function BloomBarFlowerLoader({
  label = 'Gathering fresh flowers',
}: {
  label?: string;
}) {
  // Reduced motion: the bloom sits still and the blossoms stop falling.
  const still = useReducedMotion();

  return (
    <div className="relative min-h-[340px] overflow-hidden rounded-2xl flex flex-col items-center justify-center px-8 py-12 text-center">
      {/* Falling blossoms */}
      {!still &&
        FALLING.map((f, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute -top-8 select-none"
            style={{ left: f.left, fontSize: f.size }}
            initial={{ y: 0, x: 0, rotate: 0, opacity: 0 }}
            animate={{
              // Past the bottom of this block, not the viewport — the loader is
              // a panel in the page now, not a full screen.
              y: 400,
              x: [0, f.sway, 0, -f.sway, 0],
              rotate: 300,
              opacity: [0, 0.7, 0.7, 0],
            }}
            transition={{
              duration: f.duration,
              delay: f.delay,
              repeat: Infinity,
              ease: 'linear',
              x: { duration: f.duration / 2, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            {f.glyph}
          </motion.span>
        ))}

      {/* Warm glow so the bloom sits in light rather than on flat colour */}
      <motion.div
        aria-hidden
        className="absolute w-56 h-56 rounded-full bg-genda-gold/20 blur-3xl"
        animate={still ? undefined : { scale: [1, 1.2, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* The bloom */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        <motion.div
          className="absolute inset-0"
          animate={still ? undefined : { rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        >
          {PETALS.map((deg) => (
            <span
              key={deg}
              className="absolute left-1/2 top-1/2 w-[24px] h-[34px] -ml-[12px] -mt-[34px]
                         rounded-[100%_100%_60%_60%/_100%_100%_45%_45%]
                         bg-gradient-to-b from-genda-gold via-genda-gold/85 to-genda-gold/45"
              style={{ transformOrigin: '50% 100%', rotate: `${deg}deg` }}
            />
          ))}
        </motion.div>

        <motion.div
          className="relative w-9 h-9 rounded-full genda-gradient shadow-md"
          animate={still ? undefined : { scale: [1, 1.12, 1] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <p className="relative mt-8 font-playfair text-xl font-semibold text-genda-green">{label}</p>
    </div>
  );
}
