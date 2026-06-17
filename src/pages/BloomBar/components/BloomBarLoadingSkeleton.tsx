import { motion } from 'framer-motion';

export default function BloomBarLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-genda-cream">
      {/* Header skeleton */}
      <div className="h-16 bg-white border-b border-gray-200 px-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
        <div className="w-24 h-4 rounded bg-gray-200 animate-pulse" />
      </div>

      <div className="px-4 pt-6 space-y-4">
        {/* Image skeleton */}
        <div className="w-full h-64 rounded-2xl bg-gray-200 animate-pulse" />

        {/* Text skeletons */}
        <div className="bg-white rounded-2xl p-4 space-y-3 premium-shadow">
          <div className="h-6 w-3/4 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-full rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-gray-200 animate-pulse" />
        </div>

        {/* Button skeleton */}
        <div className="h-14 w-full rounded-2xl bg-gray-200 animate-pulse" />
      </div>

      <motion.div
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl">🌸</span>
          <div className="w-6 h-6 border-2 border-genda-green/30 border-t-genda-green rounded-full animate-spin" />
        </div>
      </motion.div>
    </div>
  );
}
