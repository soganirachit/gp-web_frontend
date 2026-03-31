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
      }}
      gutter={8}
      toastOptions={{
        duration: 2800,
        className:
          '!inline-flex !items-center !justify-center !box-border !text-center !whitespace-normal !rounded-2xl ' +
          '!px-[16px] !py-[9px] !min-w-0 !w-fit !max-w-[92vw] sm:!max-w-[44rem] ' +
          '!text-sm !leading-snug !font-medium [&>div]:!text-center [&>div]:!whitespace-normal [&>div]:!break-words',
        style: {
          borderRadius: '16px',
          background: '#19411f',
          color: '#f9fafb',
          boxShadow: '0 6px 10px rgba(0, 0, 0, 0.18)',
          border: '1px solid #19411f',
        },
        success: {
          duration: 2600,
          icon: null,
          style: {
            background: '#19411f',
            color: '#f9fafb',
            border: '1px solid #19411f',
          },
        },
        error: {
          duration: 3600,
          icon: null,
          style: {
            background: 'rgba(69, 10, 10, 0.96)',
            color: '#fef2f2',
            border: '1px solid rgba(252, 165, 165, 0.28)',
          },
        },
        loading: {
          icon: null,
          style: {
            background: '#19411f',
            color: '#f9fafb',
            border: '1px solid #19411f',
          },
        },
      }}
    />
  );
}
