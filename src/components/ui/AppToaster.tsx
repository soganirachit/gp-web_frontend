import { Toaster } from 'react-hot-toast';

/**
 * Global toast: compact snackbar above the tab bar — small type, modest radius, capped width.
 * All copy uses the same visual system; shorten long strings at the call site when needed.
 */
export function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      containerClassName="gp-app-toaster"
      containerStyle={{
        bottom: 'max(5.25rem, calc(env(safe-area-inset-bottom, 0px) + 4.25rem))',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
      gutter={8}
      toastOptions={{
        duration: 2400,
        className:
          '!flex !items-start !gap-2 !box-border !text-left !whitespace-normal !rounded-xl ' +
          '!px-3 !py-2 sm:!px-3.5 sm:!py-2 !min-w-0 !w-max !max-w-[min(92vw,18.5rem)] sm:!max-w-[min(92vw,22rem)] ' +
          '!text-[11px] sm:!text-xs !leading-snug !font-medium ' +
          '[&>div]:!flex [&>div]:!items-start [&>div]:!gap-2 [&_svg]:!mt-0.5 [&_svg]:!h-3.5 [&_svg]:!w-3.5 [&_svg]:!shrink-0',
        style: {
          borderRadius: '12px',
          background: 'rgba(17, 24, 39, 0.94)',
          color: '#f9fafb',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.12)',
          border: '1px solid rgba(255,255,255,0.06)',
        },
        success: {
          duration: 2200,
          iconTheme: { primary: '#4ade80', secondary: '#111827' },
          style: {
            background: 'rgba(17, 24, 39, 0.94)',
            color: '#f9fafb',
          },
        },
        error: {
          duration: 3600,
          iconTheme: { primary: '#fca5a5', secondary: '#450a0a' },
          className:
            '!max-w-[min(94vw,22rem)] sm:!max-w-[min(94vw,26rem)]',
          style: {
            background: 'rgba(69, 10, 10, 0.96)',
            color: '#fef2f2',
            border: '1px solid rgba(252, 165, 165, 0.25)',
          },
        },
        loading: {
          iconTheme: { primary: '#93c5fd', secondary: '#111827' },
          style: {
            background: 'rgba(17, 24, 39, 0.94)',
            color: '#f9fafb',
          },
        },
      }}
    />
  );
}
