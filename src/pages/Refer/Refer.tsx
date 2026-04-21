import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaGift, FaWhatsapp, FaTelegramPlane, FaCopy } from 'react-icons/fa';
import { MdEmail } from 'react-icons/md';
import { toast } from 'react-hot-toast';
import { useFeatureTheme } from '../../context/FeatureThemeContext';
import {
  getMailtoShareUrl,
  getReferralShareText,
  getTelegramShareUrl,
  getWhatsAppShareUrl,
  REFERRAL_COPY_BUTTON,
  REFERRAL_COPIED_TOAST,
  REFER_CARD_HINT,
  REFER_CARD_TITLE,
  REFER_HERO_TAGLINE,
  REFER_SHARE_SECTION_LABEL,
} from '../../config/referralShare';
import { UniformPageHeader } from '../../components/layout/UniformPageHeader';

const PAGE_BG = '#f8f6f1';
const ACCENT_ORANGE = '#F15A22';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace('#', '').trim();
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  if (full.length !== 6) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) =>
    Math.min(255, Math.max(0, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function mixHex(hex: string, target: string, t: number): string {
  const A = hexToRgb(hex);
  const B = hexToRgb(target);
  if (!A || !B) return hex;
  return rgbToHex(
    A.r + (B.r - A.r) * t,
    A.g + (B.g - A.g) * t,
    A.b + (B.b - A.b) * t,
  );
}

function heroGradientStops(primary: string): [string, string, string] {
  return [
    mixHex(primary, '#ffffff', 0.34),
    mixHex(primary, '#ffffff', 0.12),
    mixHex(primary, '#000000', 0.1),
  ];
}

/** Soft pastel strip on the refer card — colorful but not loud. */
function cardSheetTopBarGradientCss(primary: string): string {
  const c0 = mixHex(primary, '#ffffff', 0.92);
  const c1 = mixHex(primary, '#ffffff', 0.76);
  const c2 = mixHex(mixHex(primary, ACCENT_ORANGE, 0.28), '#ffffff', 0.62);
  const c3 = mixHex(ACCENT_ORANGE, '#fff7ed', 0.7);
  return `linear-gradient(90deg, ${c0} 0%, ${c1} 34%, ${c2} 68%, ${c3} 100%)`;
}

const shareChannels = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    icon: FaWhatsapp,
    iconClass: 'text-[#25D366]',
    circleClass: 'bg-[#25D366]/12',
  },
  {
    key: 'email',
    label: 'Email',
    icon: MdEmail,
    iconClass: 'text-red-600',
    circleClass: 'bg-red-600/10',
  },
  {
    key: 'telegram',
    label: 'Telegram',
    icon: FaTelegramPlane,
    iconClass: 'text-sky-600',
    circleClass: 'bg-sky-600/10',
  },
] as const;

const cardSpring = {
  type: 'spring' as const,
  damping: 22,
  stiffness: 320,
  mass: 0.85,
};

const Refer: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useFeatureTheme();
  const primary = theme.colors.primary;
  const [copying, setCopying] = useState(false);

  const [g0, g1, g2] = useMemo(
    () => heroGradientStops(primary),
    [primary],
  );

  const heroBg = useMemo(
    () => ({ background: `linear-gradient(135deg, ${g0} 0%, ${g1} 48%, ${g2} 100%)` }),
    [g0, g1, g2],
  );

  const borderSoft =
    primary.length === 7 ? `${primary}22` : primary;

  const cardTopBarStyle = useMemo(
    () => ({ background: cardSheetTopBarGradientCss(primary) }),
    [primary],
  );

  const copyInvite = useCallback(async () => {
    const text = getReferralShareText();
    try {
      setCopying(true);
      await navigator.clipboard.writeText(text);
      toast.success(REFERRAL_COPIED_TOAST, { duration: 2200 });
    } catch {
      toast.error('Could not copy.');
    } finally {
      setCopying(false);
    }
  }, []);

  const openShare = useCallback((key: (typeof shareChannels)[number]['key']) => {
    const url =
      key === 'whatsapp'
        ? getWhatsAppShareUrl()
        : key === 'email'
          ? getMailtoShareUrl()
          : getTelegramShareUrl();
    if (key === 'email') {
      window.location.href = url;
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <div className="min-h-screen pb-nav-bottom" style={{ backgroundColor: PAGE_BG }}>
      <div
        className="relative overflow-hidden text-white"
        style={heroBg}
      >
        {/* <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/12 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 left-1/2 h-36 w-72 -translate-x-1/2 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-8 left-6 h-24 w-24 rounded-full border border-white/15 bg-white/5"
          aria-hidden
        /> */}

        <UniformPageHeader
          variant="onBrandGradient"
          title="Refer Us"
          onBack={() => navigate(-1)}
          padXClassName="px-4 sm:px-5"
          padYClassName="py-3"
          className="relative mx-auto max-w-lg"
        />

        <div className="relative mx-auto flex max-w-lg flex-col items-center px-5 pb-14 pt-2 sm:px-6">
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            className="flex h-[5.75rem] w-[5.75rem] items-center justify-center rounded-[1.75rem] bg-white/20 shadow-lg ring-1 ring-white/35"
          >
            <FaGift className="h-14 w-14 text-white drop-shadow-md" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="mt-5 max-w-[20rem] text-center text-[0.9375rem] font-medium leading-relaxed text-white/95 sm:max-w-none sm:text-base"
          >
            {REFER_HERO_TAGLINE}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/75"
          >
            <span>Puja</span>
            <span style={{ color: ACCENT_ORANGE }} aria-hidden>
              ·
            </span>
            <span>Home</span>
            <span style={{ color: ACCENT_ORANGE }} aria-hidden>
              ·
            </span>
            <span>Gifting</span>
          </motion.div>
        </div>
      </div>

      <div className="relative z-10 -mt-11 px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 36, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...cardSpring, delay: 0.04 }}
          className="mx-auto max-w-lg overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_20px_50px_-18px_rgba(17,24,39,0.18)]"
          style={{ borderColor: borderSoft }}
        >
          <div className="h-1 w-full" style={cardTopBarStyle} aria-hidden />

          <div className="px-6 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl"
            >
              {REFER_CARD_TITLE}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              className="mt-2 text-sm leading-relaxed text-gray-600 sm:text-[0.9375rem]"
            >
              {REFER_CARD_HINT}
            </motion.p>

            <motion.button
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => void copyInvite()}
              disabled={copying}
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-[1.125rem] px-4 py-4 text-base font-bold text-white shadow-md transition-[filter] hover:brightness-110 disabled:opacity-70"
              style={{ backgroundColor: primary }}
            >
              <FaCopy className="text-lg" aria-hidden />
              {copying ? 'Copying…' : REFERRAL_COPY_BUTTON}
            </motion.button>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.22, duration: 0.3 }}
              className="mb-3 mt-8 text-xs font-bold uppercase tracking-[0.12em] text-gray-500"
            >
              {REFER_SHARE_SECTION_LABEL}
            </motion.p>

            <div className="grid grid-cols-3 gap-3">
              {shareChannels.map((ch, i) => {
                const Icon = ch.icon;
                return (
                  <motion.button
                    key={ch.key}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.12 + i * 0.06,
                      duration: 0.35,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => openShare(ch.key)}
                    className="flex min-h-[6.75rem] flex-col items-center justify-center rounded-[1.25rem] border px-2 py-3 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gp-ref-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    style={
                      {
                        borderColor: borderSoft,
                        backgroundColor: PAGE_BG,
                        ['--gp-ref-primary' as string]: primary,
                      } as React.CSSProperties
                    }
                  >
                    <span
                      className={`mb-2 flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full ${ch.circleClass}`}
                    >
                      <Icon className={`text-[1.65rem] ${ch.iconClass}`} aria-hidden />
                    </span>
                    <span className="text-xs font-bold text-gray-800">{ch.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Refer;
