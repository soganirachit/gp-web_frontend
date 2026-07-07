import logoSvg from '../../../assets/svg/logo.svg';

/**
 * Faint, watermark-style bottom-of-page footer for the BloomBar customer flow —
 * mirrors the main customer-app home page footer (Genda Phool logo +
 * "Blossomed In Vadodara!"). Used only on the landing and confirmation pages.
 */
export default function BloomBarFooter() {
  return (
    <footer className="px-6 pt-3 pb-[calc(2rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-2">
      <img src={logoSvg} alt="Genda Phool" className="h-20 w-auto opacity-20" />
      <div className="flex items-center gap-2 opacity-40">
        <p className="text-gray-500 text-sm">Blossomed In Vadodara!</p>
        <span className="text-pink-500 text-base">❤</span>
      </div>
    </footer>
  );
}
