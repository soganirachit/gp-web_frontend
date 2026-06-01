import React from "react";
import type { SajawatGalleryMedia } from "../../services/sajawat.service";
import { FaPlayCircle } from "react-icons/fa";

type Props = {
  item: SajawatGalleryMedia;
  className?: string;
  onClick?: (item: SajawatGalleryMedia) => void;
};

export const SajawatGalleryThumb: React.FC<Props> = ({
  item,
  className = "",
  onClick,
}) => {
  const label =
    item.title ||
    `${item.categoryName} ${item.media_type === "video" ? "video" : "photo"}`;

  const handleClick = () => {
    if (onClick) {
      onClick(item);
      return;
    }
    if (item.media_type === "video") {
      window.open(item.url, "_blank", "noopener,noreferrer");
    }
  };

  const inner =
    item.media_type === "video" ? (
      <>
        <img
          src={item.thumbnail_url}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
          <FaPlayCircle className="h-8 w-8 text-white" aria-hidden />
        </span>
      </>
    ) : (
      <img
        src={item.thumbnail_url}
        alt={label}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    );

  const interactive = onClick || item.media_type === "video";
  const baseClass = `relative overflow-hidden rounded-xl bg-[#E8D5CF] ${className}`;

  if (!interactive) {
    return (
      <div className={baseClass} role="img" aria-label={label}>
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${baseClass} cursor-pointer`}
      aria-label={label}
    >
      {inner}
    </button>
  );
};
