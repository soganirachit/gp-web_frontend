import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FaChevronLeft } from "react-icons/fa";
import { SEO } from "../components/SEO";
import { SajawatCategoryChips, ALL_CATEGORY_ID } from "../components/Sajawat/SajawatCategoryChips";
import { SajawatGalleryGrid } from "../components/Sajawat/SajawatGalleryGrid";
import { SajawatMeetingForm } from "../components/Sajawat/SajawatMeetingForm";
import { SajawatBottomBar } from "../components/Sajawat/SajawatBottomBar";
import {
  fetchSajawatGalleryCached,
  type SajawatGalleryCategory,
  type SajawatGalleryMedia,
} from "../services/sajawat.service";
import { SajawatMediaFullscreen } from "../components/Sajawat/SajawatMediaFullscreen";

const SajawatSignatureGallery: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<SajawatGalleryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<number>(ALL_CATEGORY_ID);
  const [viewerItem, setViewerItem] = useState<SajawatGalleryMedia | null>(null);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    const data = await fetchSajawatGalleryCached();
    setCategories(data.categories);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  useEffect(() => {
    if (loading) return;
    const requested = Number(searchParams.get("category"));
    if (!Number.isFinite(requested) || requested <= 0) {
      setSelectedCategoryId(ALL_CATEGORY_ID);
      return;
    }
    const exists = categories.some((c) => c.id === requested);
    setSelectedCategoryId(exists ? requested : ALL_CATEGORY_ID);
  }, [loading, categories, searchParams]);

  const handleSelectCategory = useCallback(
    (id: number) => {
      setSelectedCategoryId(id);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (id === ALL_CATEGORY_ID) next.delete("category");
        else next.set("category", String(id));
        return next;
      }, { replace: true });
    },
    [setSearchParams]
  );

  return (
    <>
      <SEO
        title="Signature Floral Gallery — Sajawat by Genda Phool"
        description="Browse wedding floral decor photos and videos by category. Schedule a meeting with Sajawat by Genda Phool."
        canonical="https://customerapp.mygendaphool.com/sajawat/gallery"
      />
      <div className="min-h-screen bg-white pb-[4.5rem]">
        <SajawatMediaFullscreen
          item={viewerItem}
          onClose={() => setViewerItem(null)}
        />
        <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-[#E5E7EB] bg-white px-3 py-3">
          <Link
            to="/sajawat"
            className="flex h-10 w-10 shrink-0 items-center justify-center text-[#9B2226]"
            aria-label="Back to Sajawat"
          >
            <FaChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex-1 text-center font-serif text-lg font-bold text-[#1F2937] sm:text-xl">
            Signature Floral Gallery
          </h1>
          <span className="w-10 shrink-0" aria-hidden />
        </header>

        <div className="px-4 pt-4 pb-2 sm:px-5">
          {loading ? (
            <div className="flex min-h-[3rem] items-center justify-center py-6">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-[#9B2226] border-t-transparent"
                role="status"
                aria-label="Loading gallery"
              />
            </div>
          ) : (
            <SajawatCategoryChips
              categories={categories}
              selectedId={selectedCategoryId}
              onSelect={handleSelectCategory}
            />
          )}
        </div>

        {!loading ? (
          <div className="px-4 pt-4 sm:px-5">
            <SajawatGalleryGrid
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onOpenMedia={setViewerItem}
            />
          </div>
        ) : null}

        <SajawatMeetingForm />
        <SajawatBottomBar />
      </div>
    </>
  );
};

export default SajawatSignatureGallery;
