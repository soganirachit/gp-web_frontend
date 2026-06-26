import React, { useState, useEffect } from "react";
import {
  isSessionImageLoaded,
  markSessionImageLoaded,
  preloadSessionImage,
} from "../../utils/sessionImageCache";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  fallbackSrc?: string;
  /** Above-the-fold / hero — sync decode + high fetch priority to avoid progressive paint. */
  priority?: boolean;
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
  priority = false,
  ...rest
}: Props) {
  const resolvedSrc = (src && String(src).trim()) || fallbackSrc;
  const [displaySrc, setDisplaySrc] = useState(resolvedSrc);
  const [failed, setFailed] = useState(false);
  const [paintReady, setPaintReady] = useState(
    () => priority || isSessionImageLoaded(resolvedSrc),
  );
  const cached = isSessionImageLoaded(resolvedSrc);

  useEffect(() => {
    const next = (src && String(src).trim()) || fallbackSrc;
    setDisplaySrc(next);
    setFailed(false);
    setPaintReady(priority || isSessionImageLoaded(next));
    if (next && next !== fallbackSrc) preloadSessionImage(next);
  }, [src, fallbackSrc, priority]);

  return (
    <img
      {...rest}
      src={failed ? fallbackSrc : displaySrc}
      alt={alt}
      className={[
        className,
        priority && !paintReady ? "opacity-0" : "opacity-100",
      ]
        .filter(Boolean)
        .join(" ")}
      loading={priority || cached ? "eager" : loading ?? "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : undefined}
      onLoad={(e) => {
        markSessionImageLoaded(displaySrc);
        setPaintReady(true);
        onLoad?.(e);
      }}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
    />
  );
}
