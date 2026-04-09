/**
 * Refer share message & links — keep in sync with genda-phool-mobile/src/config/referralShare.ts
 * Optional: VITE_REFERRAL_SITE_URL
 */
export const REFERRAL_SITE_URL: string = (
  import.meta.env.VITE_REFERRAL_SITE_URL as string | undefined
)?.trim() || 'https://mygendaphool.com';

export const REFERRAL_EMAIL_SUBJECT = 'Check out Genda Phool 🌼';

export const REFERRAL_COPY_BUTTON = 'Copy message';
export const REFERRAL_COPIED_TOAST = 'Copied!';

/** Refer page — keep in sync with genda-phool-mobile/src/config/referralShare.ts */
export const REFER_HERO_TAGLINE =
  'Share Genda Phool with friends & family—fresh blooms for every occasion.';
export const REFER_CARD_TITLE = 'Your invite is ready';
export const REFER_CARD_HINT =
  'Copy our ready-made message with your link, then paste it in any chat or email.';
export const REFER_SHARE_SECTION_LABEL = 'Share via';

function normalizedSiteUrl(): string {
  return REFERRAL_SITE_URL.replace(/\/$/, '');
}

/** Full message users share (WhatsApp / paste / etc.). */
export function getReferralShareText(): string {
  const url = normalizedSiteUrl();
  return [
    '🌼 Join me on Genda Phool — fresh flowers for puja, home & special occasions, delivered to your door!',
    '',
    `Shop & explore: ${url}`,
    '',
    'Spread the love 🌸',
  ].join('\n');
}

export function getWhatsAppShareUrl(): string {
  return `https://wa.me/?text=${encodeURIComponent(getReferralShareText())}`;
}

export function getMailtoShareUrl(): string {
  const body = getReferralShareText();
  const subject = encodeURIComponent(REFERRAL_EMAIL_SUBJECT);
  return `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
}

export function getTelegramShareUrl(): string {
  const url = normalizedSiteUrl();
  const text = getReferralShareText();
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}
