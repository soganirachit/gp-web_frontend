import React, { useState, useEffect, useRef } from "react";
import {
  isSessionImageLoaded,
  markSessionImageLoaded,
  preloadSessionImage,
} from "../../utils/sessionImageCache";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  fallbackSrc?: string;
  /** Above-the-fold / hero — sync decode + high fetch priority. */
  priority?: boolean;
  /** Pulse block in the image slot until decode (no opacity fade). Default true. */
  showPlaceholder?: boolean;
  /** Extra classes for the placeholder layer. */
  placeholderClassName?: string;
  /** Parent uses absolute positioning (banners, overlays). */
  fill?: boolean;
};

function imageAlreadyComplete(el: HTMLImageElement | null): boolean {
  return Boolean(el?.complete && el.naturalWidth > 0);
}

/**
 * Product/banner image with session URL memory and optional in-slot skeleton.
 * Shows text/layout immediately; image area pulses until load, then snaps in (no curtain fade).
 */
export function SessionCachedImage({
  src,
  fallbackSrc = "/placeholder.svg",
  alt = "",
  className = "",
  onError,
  onLoad,
  loading,
  priority = false,
  showPlaceholder = true,
  placeholderClassName = "bg-gray-200/80",
  fill = false,
  ...rest
}: Props) {
  const resolvedSrc = (src && String(src).trim()) || fallbackSrc;
  const [displaySrc, setDisplaySrc] = useState(resolvedSrc);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(
    () => priority || isSessionImageLoaded(resolvedSrc),
  );
  const imgRef = useRef<HTMLImageElement>(null);
  const cached = isSessionImageLoaded(resolvedSrc);

  useEffect(() => {
    const next = (src && String(src).trim()) || fallbackSrc;
    setDisplaySrc(next);
    setFailed(false);
    const ready = priority || isSessionImageLoaded(next);
    setLoaded(ready);
    if (next && next !== fallbackSrc) preloadSessionImage(next);
  }, [src, fallbackSrc, priority]);

  useEffect(() => {
    if (loaded) return;
    if (imageAlreadyComplete(imgRef.current)) {
      markSessionImageLoaded(displaySrc);
      setLoaded(true);
    }
  }, [displaySrc, loaded]);

  const img = (
    <img
      {...rest}
      ref={imgRef}
      src={failed ? fallbackSrc : displaySrc}
      alt={alt}
      className={[
        className,
        showPlaceholder && !loaded ? "opacity-0" : "opacity-100",
      ]
        .filter(Boolean)
        .join(" ")}
      loading={priority || cached ? "eager" : loading ?? "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : undefined}
      onLoad={(e) => {
        markSessionImageLoaded(displaySrc);
        setLoaded(true);
        onLoad?.(e);
      }}
      onError={(e) => {
        setFailed(true);
        setLoaded(true);
        onError?.(e);
      }}
    />
  );

  if (!showPlaceholder) {
    return img;
  }

  const wrapperClass = fill
    ? "absolute inset-0 overflow-hidden"
    : "relative block h-full w-full overflow-hidden";

  return (
    <span className={wrapperClass}>
      {!loaded ? (
        <span
          className={`absolute inset-0 animate-pulse ${placeholderClassName}`}
          aria-hidden
        />
      ) : null}
      {img}
    </span>
  );
}
