import React from "react";
import { FaPalette, FaImages, FaLeaf, FaCalendarAlt } from "react-icons/fa";
import { SAJAWAT_WHY_CHOOSE } from "./sajawatContent";

const ICONS = [FaPalette, FaImages, FaLeaf, FaCalendarAlt];

export const SajawatWhyChoose: React.FC = () => (
  <section className="px-4 pb-8 sm:px-5">
    <h2 className="mb-5 font-serif text-xl font-bold text-[#1F2937] sm:text-2xl">
      Why Choose Sajawat by Genda Phool?
    </h2>
    <div className="space-y-4">
      {SAJAWAT_WHY_CHOOSE.map((item, index) => {
        const Icon = ICONS[index] ?? FaLeaf;
        return (
          <article
            key={item.id}
            className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="mb-2 flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-[#1F2937]" aria-hidden />
              <h3 className="font-serif text-base font-bold text-[#1F2937] sm:text-lg">
                {item.title}
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-[#6B7280] sm:text-sm">
              {item.description}
            </p>
            {"extra" in item && item.extra ? (
              <p className="mt-3 text-xs leading-relaxed text-[#6B7280] sm:text-sm">
                {item.extra}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  </section>
);
