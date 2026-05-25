import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { customerService } from '../../services/getcustomer.service';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

/** Same profile control size on landing, GP Daily, and GP Store headers. */
export const PROFILE_HEADER_AVATAR_CLASS =
  'relative h-12 w-12 shrink-0 overflow-hidden rounded-full sm:h-14 sm:w-14';

export const PROFILE_HEADER_LOGO_CLASS =
  'relative z-10 m-auto h-5 w-5 object-contain sm:h-[22px] sm:w-[22px]';

export const PROFILE_HEADER_FALLBACK_HOME_CLASS =
  'absolute inset-0 m-auto h-10 w-10 object-contain sm:h-12 sm:w-12';

export type ProfileAvatarButtonProps = {
  onClick: () => void;
  className?: string;
  profileHomeSrc: string;
  profileLogoSrc?: string;
  logoClassName?: string;
  /** Placeholder background image classes when no API photo (default: full-bleed cover). */
  fallbackHomeClassName?: string;
  ariaLabel?: string;
};

/** Photo clipped inside the scalloped profilehome vector (image inside shape, not under it). */
function profileFrameMaskUrl(frameSrc: string): string {
  const encoded = frameSrc.includes(' ') ? encodeURI(frameSrc) : frameSrc;
  return `url("${encoded}")`;
}

function ProfilePhotoInFrame({
  imageUrl,
  frameSrc,
}: {
  imageUrl: string;
  frameSrc: string;
}) {
  const maskUrl = profileFrameMaskUrl(frameSrc);
  return (
    <div
      className="absolute inset-0 h-full w-full overflow-hidden rounded-full"
      style={{
        WebkitMaskImage: maskUrl,
        maskImage: maskUrl,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    >
      <img
        src={imageUrl}
        alt=""
        className="h-full w-full rounded-full object-cover"
      />
    </div>
  );
}

/** Header profile — API photo fills the scalloped profile frame vector. */
export function ProfileAvatarButton({
  onClick,
  className = PROFILE_HEADER_AVATAR_CLASS,
  profileHomeSrc,
  profileLogoSrc,
  logoClassName = 'relative z-10 h-[18px] w-[18px] object-contain brightness-0 invert',
  fallbackHomeClassName = 'absolute inset-0 h-full w-full object-cover',
  ariaLabel = 'Account',
}: ProfileAvatarButtonProps) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setProfileImageUrl(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const user = await customerService.getCurrentUser();
        if (!cancelled) {
          setProfileImageUrl(
            user.profile_image ? resolveMediaUrl(user.profile_image) : null,
          );
        }
      } catch {
        if (!cancelled) setProfileImageUrl(null);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, location.pathname]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      aria-label={ariaLabel}
    >
      {profileImageUrl ? (
        <ProfilePhotoInFrame imageUrl={profileImageUrl} frameSrc={profileHomeSrc} />
      ) : (
        <>
          <img
            src={profileHomeSrc}
            alt=""
            className={fallbackHomeClassName}
            aria-hidden
          />
          {profileLogoSrc ? (
            <img
              src={profileLogoSrc}
              alt=""
              className={logoClassName}
              aria-hidden
            />
          ) : null}
        </>
      )}
    </button>
  );
}

/** Account page / settings card — photo fills scalloped profile frame. */
export function ProfileAvatarDisplay({
  imageUrl,
  sizeClassName = 'relative h-20 w-20 shrink-0',
  profileHomeSrc,
  profileLogoSrc,
}: {
  imageUrl: string | null;
  sizeClassName?: string;
  profileHomeSrc: string;
  profileLogoSrc: string;
}) {
  return (
    <div className={sizeClassName}>
      {imageUrl ? (
        <ProfilePhotoInFrame imageUrl={imageUrl} frameSrc={profileHomeSrc} />
      ) : (
        <>
          <img
            src={profileHomeSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            aria-hidden
          />
          <img
            src={profileLogoSrc}
            alt=""
            className="absolute inset-0 m-auto h-8 w-8 object-contain"
            aria-hidden
          />
        </>
      )}
    </div>
  );
}
