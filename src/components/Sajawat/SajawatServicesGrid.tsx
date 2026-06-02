import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SAJAWAT_SERVICES } from "./sajawatContent";
import {
  fetchSajawatGalleryCached,
  type SajawatGalleryCategory,
} from "../../services/sajawat.service";

const ImagePlaceholder: React.FC<{ label: string }> = ({ label }) => (
  <div
    className="aspect-square w-full rounded-t-2xl bg-[#E8D5CF]"
    role="img"
    aria-label={label}
  />
);

export const SajawatServicesGrid: React.FC = () => {
  const navigate = useNavigate();
  const [galleryCategories, setGalleryCategories] = useState<SajawatGalleryCategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchSajawatGalleryCached().then((data) => {
      if (cancelled) return;
      setGalleryCategories(data.categories);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(() => {
    if (galleryCategories.length > 0) {
      return galleryCategories.map((category) => ({
        id: String(category.id),
        title: category.name,
        description:
          category.description ||
          `Browse ${category.media.length} photo/video item${category.media.length === 1 ? "" : "s"} in this category.`,
        categoryId: category.id,
      }));
    }
    return SAJAWAT_SERVICES.map((service) => ({
      id: service.id,
      title: service.title,
      description: service.description,
      categoryId: null as number | null,
    }));
  }, [galleryCategories]);

  return (
    <section className="bg-white px-4 py-8 sm:px-5">
      <h2 className="mb-5 font-serif text-xl font-bold text-[#1F2937] sm:text-2xl">
        Our Services
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() =>
              navigate(
                card.categoryId != null
                  ? `/sajawat/gallery?category=${encodeURIComponent(String(card.categoryId))}`
                  : "/sajawat/gallery"
              )
            }
            className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <ImagePlaceholder label={`${card.title} floral decor`} />
            <div className="p-3 sm:p-4">
              <h3 className="font-serif text-sm font-bold text-[#1F2937] sm:text-base">
                {card.title}
              </h3>
              <p className="mt-1.5 text-[11px] leading-snug text-[#6B7280] sm:text-xs sm:leading-relaxed">
                {card.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
