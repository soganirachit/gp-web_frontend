import React from "react";
import { SAJAWAT_SERVICES } from "./sajawatContent";

const ImagePlaceholder: React.FC<{ label: string }> = ({ label }) => (
  <div
    className="aspect-square w-full rounded-t-2xl bg-[#E8D5CF]"
    role="img"
    aria-label={label}
  />
);

export const SajawatServicesGrid: React.FC = () => (
  <section className="bg-white px-4 py-8 sm:px-5">
    <h2 className="mb-5 font-serif text-xl font-bold text-[#1F2937] sm:text-2xl">
      Our Services
    </h2>
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {SAJAWAT_SERVICES.map((service) => (
        <article
          key={service.id}
          className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm"
        >
          <ImagePlaceholder label={`${service.title} floral decor`} />
          <div className="p-3 sm:p-4">
            <h3 className="font-serif text-sm font-bold text-[#1F2937] sm:text-base">
              {service.title}
            </h3>
            <p className="mt-1.5 text-[11px] leading-snug text-[#6B7280] sm:text-xs sm:leading-relaxed">
              {service.description}
            </p>
          </div>
        </article>
      ))}
    </div>
  </section>
);
