import React from "react";
import type { SajawatGalleryCategory } from "../../services/sajawat.service";
import { HorizontalScrollSection } from "../common/HorizontalScrollSection";

export const ALL_CATEGORY_ID = 0;

type Props = {
  categories: SajawatGalleryCategory[];
  selectedId: number;
  onSelect: (categoryId: number) => void;
};

export const SajawatCategoryChips: React.FC<Props> = ({
  categories,
  selectedId,
  onSelect,
}) => (
  <HorizontalScrollSection trackClassName="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
    <button
      type="button"
      onClick={() => onSelect(ALL_CATEGORY_ID)}
      className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
        selectedId === ALL_CATEGORY_ID
          ? "border-[#9B2226] bg-[#9B2226] text-white"
          : "border-[#E5E7EB] bg-white text-[#1F2937]"
      }`}
      aria-pressed={selectedId === ALL_CATEGORY_ID}
    >
      All
    </button>
    {categories.map((cat) => {
      const active = selectedId === cat.id;
      return (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelect(cat.id)}
          className={`shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
            active
              ? "border-[#9B2226] bg-[#9B2226] text-white"
              : "border-[#E5E7EB] bg-white text-[#1F2937]"
          }`}
          aria-pressed={active}
        >
          {cat.name}
        </button>
      );
    })}
  </HorizontalScrollSection>
);
