import React, { useState, useEffect } from "react";
import {
  isSessionImageLoaded,
  markSessionImageLoaded,
  preloadSessionImage,
} from "../../utils/sessionImageCache";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  fallbackSrc?: string;
};

/**
 * Product/banner image that reuses session memory — no fade-in when already loaded.
 */
export function SessionCachedImage({
  src,
  fallbackSrc = "/placeholder.svg",
  alt = "",
  className = "",
  onError,
  onLoad,
  loading,
  ...rest
}: Props) {
  const resolvedSrc = (src && String(src).trim()) || fallbackSrc;
  const [displaySrc, setDisplaySrc] = useState(resolvedSrc);
  const [failed, setFailed] = useState(false);
  const cached = isSessionImageLoaded(resolvedSrc);

  useEffect(() => {
    const next = (src && String(src).trim()) || fallbackSrc;
    setDisplaySrc(next);
    setFailed(false);
    if (next && next !== fallbackSrc) preloadSessionImage(next);
  }, [src, fallbackSrc]);

  return (
    <img
      {...rest}
      src={failed ? fallbackSrc : displaySrc}
      alt={alt}
      className={className}
      loading={cached ? "eager" : loading ?? "lazy"}
      decoding="async"
      onLoad={(e) => {
        markSessionImageLoaded(displaySrc);
        onLoad?.(e);
      }}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
    />
  );
}
