import React from "react";
import type { SajawatGalleryMedia } from "../../services/sajawat.service";

type Props = {
  item: SajawatGalleryMedia;
  className?: string;
  onOpen: (item: SajawatGalleryMedia) => void;
};

export const SajawatGalleryMediaTile: React.FC<Props> = ({
  item,
  className = "",
  onOpen,
}) => {
  const label =
    item.title ||
    `${item.categoryName} ${item.media_type === "video" ? "video" : "photo"}`;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`relative overflow-hidden rounded-xl bg-[#E8D5CF] ${className}`}
      aria-label={`Open ${label}`}
    >
      {item.media_type === "video" ? (
        <video
          src={item.url}
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          src={item.thumbnail_url}
          alt={label}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      )}
    </button>
  );
};
