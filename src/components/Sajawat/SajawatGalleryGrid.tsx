import React, { useMemo } from "react";
import type {
  SajawatGalleryCategory,
  SajawatGalleryMedia,
} from "../../services/sajawat.service";
import { SajawatGalleryMediaTile } from "./SajawatGalleryMediaTile";
import { ALL_CATEGORY_ID } from "./SajawatCategoryChips";

type Props = {
  categories: SajawatGalleryCategory[];
  selectedCategoryId: number;
  onOpenMedia: (item: SajawatGalleryMedia) => void;
};

export const SajawatGalleryGrid: React.FC<Props> = ({
  categories,
  selectedCategoryId,
  onOpenMedia,
}) => {
  const items = useMemo((): SajawatGalleryMedia[] => {
    if (selectedCategoryId === ALL_CATEGORY_ID) {
      return categories.flatMap((c) => c.media);
    }
    return categories.find((c) => c.id === selectedCategoryId)?.media ?? [];
  }, [categories, selectedCategoryId]);

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 pb-8 pt-1">
      {items.map((item) => (
        <SajawatGalleryMediaTile
          key={`${item.categoryId}-${item.id}`}
          item={item}
          className="aspect-[3/4] w-full"
          onOpen={onOpenMedia}
        />
      ))}
    </div>
  );
};
