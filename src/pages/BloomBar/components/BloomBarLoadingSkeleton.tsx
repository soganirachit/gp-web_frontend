export default function BloomBarLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      {/* Header */}
      <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-5">
        <div className="h-5 w-32 bg-gray-200 rounded-full" />
        <div className="h-5 w-20 bg-gray-200 rounded-full" />
      </div>

      {/* Co-brand */}
      <div className="flex items-center justify-center gap-4 py-5 px-6">
        <div className="h-8 w-24 bg-gray-200 rounded-lg" />
        <div className="h-6 w-px bg-gray-200" />
        <div className="h-8 w-24 bg-gray-200 rounded-lg" />
      </div>

      {/* Image */}
      <div className="mx-4 rounded-3xl aspect-[4/3] bg-gray-200" />

      {/* Content */}
      <div className="px-5 pt-5 space-y-3">
        <div className="h-7 w-2/3 bg-gray-200 rounded-full" />
        <div className="h-5 w-1/3 bg-gray-200 rounded-full" />
        <div className="h-16 bg-gray-200 rounded-2xl" />
      </div>

      {/* Qty selector */}
      <div className="mx-5 mt-4 bg-gray-200 rounded-2xl h-28" />

      {/* CTA */}
      <div className="px-5 mt-5">
        <div className="h-14 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  );
}
