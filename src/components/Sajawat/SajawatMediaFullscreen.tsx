import React, { useEffect } from "react";
import { IoClose } from "react-icons/io5";
import type { SajawatGalleryMedia } from "../../services/sajawat.service";

type Props = {
  item: SajawatGalleryMedia | null;
  onClose: () => void;
};

export const SajawatMediaFullscreen: React.FC<Props> = ({ item, onClose }) => {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [item, onClose]);

  if (!item) return null;

  const label =
    item.title ||
    `${item.categoryName} ${item.media_type === "video" ? "video" : "photo"}`;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
        aria-label="Close"
      >
        <IoClose className="h-6 w-6" />
      </button>
      <div
        className="flex max-h-[92dvh] w-full max-w-4xl items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {item.media_type === "video" ? (
          <video
            src={item.url}
            className="max-h-[92dvh] w-full rounded-lg object-contain"
            controls
            autoPlay
            playsInline
          />
        ) : (
          <img
            src={item.url}
            alt={label}
            className="max-h-[92dvh] w-full rounded-lg object-contain"
          />
        )}
      </div>
    </div>
  );
};
