import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoreBanners, Banner } from '../services/store.service';
import { useFeatureTheme } from '../context/FeatureThemeContext';
import {
  BANNER_PLACEMENT_DAILY_HOME,
  BANNER_PLACEMENT_LANDING_HOME,
  BANNER_PLACEMENT_STORE_HOME,
  filterBannersByPlacement,
  type BannerPlacement,
} from '../utils/bannerPlacement';

interface Props {
  /** Resolved store (guest temp / logged-in selected). Omit or null = no banners request. */
  storeId?: number | string | null;
  /** Which banner slot to show (`store_home` on GP Store home, `landing_home` on /home). */
  placement?: BannerPlacement;
  /** Tighter gap before the next homepage section (e.g. All Packs on GP Daily home). */
  compactSpacing?: boolean;
}

function parseStoreIdForBanners(raw: Props['storeId']): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'string' ? parseInt(raw.trim(), 10) : raw;
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

const AUTO_SLIDE_INTERVAL = 4000;
const MIN_SWIPE_DISTANCE = 50;

function normalizeBannersFromResponse(body: unknown): Banner[] {
  if (body == null) return [];
  if (Array.isArray(body)) return body as Banner[];
  const d = body as Record<string, unknown>;
  if (Array.isArray(d.data)) return d.data as Banner[];
  const inner = d.data as Record<string, unknown> | undefined;
  if (inner && Array.isArray(inner.data)) return inner.data as Banner[];
  if (d.success === true && Array.isArray(d.data)) return d.data as Banner[];
  return [];
}


// Theme-aligned fallback gradients (cream, soft green, soft orange) — no harsh dark brown
const FALLBACK_GRADIENTS_GP_STORE = [
  'linear-gradient(145deg, #19411f 0%, #2d5a2f 50%, #3d7a3f 100%)',
  'linear-gradient(145deg, #1e4d1c 0%, #2d6a2d 100%)',
  'linear-gradient(145deg, #2d5a2f 0%, #3d7a3f 100%)',
  'linear-gradient(145deg, #1a3d18 0%, #2d5a2f 100%)',
];
const FALLBACK_GRADIENTS_GP_DAILY = [
  'linear-gradient(145deg, #DD7600 0%, #FAA222 50%, #f5c06d 100%)',
  'linear-gradient(145deg, #c96a0a 0%, #FAA222 100%)',
  'linear-gradient(145deg, #FAA222 0%, #f5c06d 100%)',
  'linear-gradient(145deg, #e8931f 0%, #FAA222 100%)',
];

/**
 * Match Sajawat card visual height on /home (Sajawat uses min-h 8.75rem/9.5rem but
 * grows with logo + copy + CTA; fixed banner height aligns to that rendered size).
 */
const OFFERS_BANNER_HEIGHT =
  'h-[10.75rem] min-h-[10.75rem] sm:h-[11.75rem] sm:min-h-[11.75rem]';

export function OffersBannerCarousel({
  storeId,
  placement = BANNER_PLACEMENT_LANDING_HOME,
  compactSpacing = false,
}: Props) {
  const sectionMarginClass = compactSpacing ? "mb-2 sm:mb-3" : "mb-6 sm:mb-8";
  const { theme } = useFeatureTheme();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const navigate = useNavigate();

  const primaryColor = theme.colors.primary ?? '#19411f';
  const fallbackGradients = theme.feature === 'gpDaily' ? FALLBACK_GRADIENTS_GP_DAILY : FALLBACK_GRADIENTS_GP_STORE;
  const cardRadiusClass =
    placement === BANNER_PLACEMENT_LANDING_HOME
      ? "rounded-xl sm:rounded-3xl"
      : "rounded-[40px]";

  useEffect(() => {
    const id = parseStoreIdForBanners(storeId);
    if (id == null) {
      setBanners([]);
      setActiveIndex(0);
      setImgErrors({});
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    getStoreBanners(id, {
      placement:
        placement === BANNER_PLACEMENT_STORE_HOME
          ? BANNER_PLACEMENT_STORE_HOME
          : placement === BANNER_PLACEMENT_DAILY_HOME
            ? BANNER_PLACEMENT_DAILY_HOME
            : undefined,
    })
      .then(res => {
        if (!cancelled) {
          const rows = normalizeBannersFromResponse(res.data);
          setBanners(filterBannersByPlacement(rows, placement));
        }
      })
      .catch(() => {
        if (!cancelled) setBanners([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId, placement]);

  const startAutoSlide = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (banners.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % banners.length);
    }, AUTO_SLIDE_INTERVAL);
  }, [banners.length]);

  useEffect(() => {
    startAutoSlide();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startAutoSlide]);

  const handleNavigate = (link?: string) => {
    if (!link) return;
    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      navigate(link);
    }
  };

  const handleManualSlide = useCallback((index: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActiveIndex(index);
    const t = setTimeout(startAutoSlide, 6000);
    return () => clearTimeout(t);
  }, [startAutoSlide]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    if (Math.abs(distance) >= MIN_SWIPE_DISTANCE) {
      if (distance > 0) handleManualSlide((activeIndex + 1) % banners.length);
      else handleManualSlide((activeIndex - 1 + banners.length) % banners.length);
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (loading) {
    return (
      <div className={`${sectionMarginClass}`}>
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-3 sm:mb-4" />
        <div className={`w-full ${OFFERS_BANNER_HEIGHT} ${cardRadiusClass} bg-gray-200 animate-pulse`} />
      </div>
    );
  }

  if (banners.length === 0) {
    return (
      <div className={`${sectionMarginClass} relative z-0`}>
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
          OFFERS FOR YOU!
        </h2>
        <div
          className={`relative w-full ${OFFERS_BANNER_HEIGHT} ${cardRadiusClass} overflow-hidden shadow-md border border-gray-200/60 flex items-end`}
          style={{ background: fallbackGradients[0] }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
          <p className="relative z-10 p-3 sm:p-4 text-white font-semibold text-sm sm:text-base">
            New offers coming soon — check back shortly.
          </p>
        </div>
      </div>
    );
  }

  const banner = banners[activeIndex];
  const hasImage = !!(banner.image_url && !imgErrors[banner.id]);
  const fallbackGradient = fallbackGradients[banner.id % fallbackGradients.length];

  return (
    <div className={`${sectionMarginClass} relative z-0`}>
      {/* Section heading — matches home page sections */}
      <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
        OFFERS FOR YOU
      </h2>

      {/* Banner card — theme-aligned, responsive (4/3 mobile, 16/9 tablet+), key triggers animation */}
      <div
        key={banner.id}
        className={`relative w-full ${OFFERS_BANNER_HEIGHT} ${cardRadiusClass} overflow-hidden cursor-pointer select-none shadow-md border border-gray-200/60`}
        style={{ animation: 'bannerFadeIn 0.4s ease-out' }}
        onClick={() => handleNavigate(banner.cta_link)}
        role="button"
        aria-label={banner.title}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background — image or theme fallback gradient */}
        {hasImage ? (
          <img
            src={banner.image_url!}
            alt={banner.title}
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
            onError={() => setImgErrors(prev => ({ ...prev, [banner.id]: true }))}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: fallbackGradient }}
          />
        )}

        {/* Softer gradient scrim for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />

        {/* Content pinned to bottom — responsive padding */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm sm:text-base leading-snug drop-shadow-md line-clamp-2">
              {banner.title}
            </p>
            {banner.subtitle && (
              <p className="text-white/90 text-xs sm:text-sm mt-0.5 line-clamp-1">
                {banner.subtitle}
              </p>
            )}
          </div>

          {banner.cta_label && (
            <button
              className="flex-shrink-0 self-start sm:self-auto px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm shadow-lg whitespace-nowrap transition-opacity active:opacity-90 min-h-[44px] flex items-center justify-center"
              style={{
                backgroundColor: banner.cta_bg_color || primaryColor,
                color: theme.feature === 'gpDaily' ? '#1a1a1a' : 'white',
              }}
              onClick={e => { e.stopPropagation(); handleNavigate(banner.cta_link); }}
            >
              {banner.cta_label}
            </button>
          )}
        </div>
      </div>

      {/* Dot indicators — theme primary, only when more than 1 banner */}
      {banners.length > 1 && (
        <div className="flex justify-center items-center gap-1 mt-2 sm:mt-3">
          {banners.map((_, i) => (
            <button
              key={i}
              className="rounded-full border-0 min-w-0 min-h-0 p-0 transition-all duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-offset-1"
              style={{
                width: i === activeIndex ? '22px' : '9px',
                height: '9px',
                backgroundColor: i === activeIndex ? primaryColor : '#d1d5db',
              }}
              onClick={() => handleManualSlide(i)}
              aria-label={`Go to offer ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
