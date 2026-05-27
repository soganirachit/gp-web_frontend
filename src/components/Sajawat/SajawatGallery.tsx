import React from "react";
import { SAJAWAT_GALLERY_COUNT } from "./sajawatContent";

export const SajawatGallery: React.FC = () => (
  <section className="px-4 pb-8 sm:px-5">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-serif text-xl font-bold text-[#1F2937] sm:text-2xl">
        Signature Floral Gallery
      </h2>
      <span className="shrink-0 text-xs font-medium text-[#6B7280] sm:text-sm">
        Explore More →
      </span>
    </div>
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {Array.from({ length: SAJAWAT_GALLERY_COUNT }, (_, i) => (
        <div
          key={i}
          className="aspect-[3/4] w-[42%] min-w-[42%] shrink-0 snap-start rounded-xl bg-[#E8D5CF] sm:w-[38%] sm:min-w-[38%]"
          role="img"
          aria-label={`Floral gallery image ${i + 1}`}
        />
      ))}
    </div>
  </section>
);
