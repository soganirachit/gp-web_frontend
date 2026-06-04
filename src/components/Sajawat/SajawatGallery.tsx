import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchSajawatGalleryCached,
  flattenSajawatGalleryMedia,
  SAJAWAT_GALLERY_PREVIEW_COUNT,
  type SajawatGalleryMedia,
} from "../../services/sajawat.service";
import { SajawatGalleryMediaTile } from "./SajawatGalleryMediaTile";
import { SajawatMediaFullscreen } from "./SajawatMediaFullscreen";
import { HorizontalScrollSection } from "../common/HorizontalScrollSection";

export const SajawatGallery: React.FC = () => {
  const navigate = useNavigate();
  const [previewItems, setPreviewItems] = useState<SajawatGalleryMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerItem, setViewerItem] = useState<SajawatGalleryMedia | null>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    const data = await fetchSajawatGalleryCached();
    const all = flattenSajawatGalleryMedia(data);
    setPreviewItems(all.slice(0, SAJAWAT_GALLERY_PREVIEW_COUNT));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  return (
    <section className="px-4 pb-8 sm:px-5">
      <SajawatMediaFullscreen
        item={viewerItem}
        onClose={() => setViewerItem(null)}
      />
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-serif text-xl font-bold text-[#1F2937] sm:text-2xl">
          Signature Floral Gallery
        </h2>
        <button
          type="button"
          onClick={() => navigate("/sajawat/gallery")}
          className="shrink-0 text-xs font-medium text-[#6B7280] sm:text-sm"
        >
          Explore More →
        </button>
      </div>
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-[#9B2226] border-t-transparent"
            role="status"
            aria-label="Loading gallery preview"
          />
        </div>
      ) : (
        <HorizontalScrollSection trackClassName="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 no-scrollbar">
          {previewItems.length > 0 ? (
            previewItems.map((item) => (
              <SajawatGalleryMediaTile
                key={`${item.categoryId}-${item.id}`}
                item={item}
                className="aspect-[3/4] w-[42%] min-w-[42%] shrink-0 snap-start sm:w-[38%] sm:min-w-[38%]"
                onOpen={setViewerItem}
              />
            ))
          ) : (
            Array.from({ length: SAJAWAT_GALLERY_PREVIEW_COUNT }, (_, i) => (
              <div
                key={i}
                className="aspect-[3/4] w-[42%] min-w-[42%] shrink-0 snap-start rounded-xl bg-[#E8D5CF] sm:w-[38%] sm:min-w-[38%]"
                role="img"
                aria-label={`Floral gallery placeholder ${i + 1}`}
              />
            ))
          )}
        </HorizontalScrollSection>
      )}
    </section>
  );
};
