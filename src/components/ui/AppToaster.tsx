import { Toaster } from 'react-hot-toast';

/**
 * Global toast: bottom snackbar above tab bar, pill style, high contrast.
 * Prefer inline UI for success on the same screen; use toast for errors and cross-screen feedback.
 */
export function AppToaster() {
  return (
    <Toaster
      position="bottom-center"
      containerStyle={{
        bottom: 'max(5.25rem, calc(env(safe-area-inset-bottom, 0px) + 4.25rem))',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
      gutter={10}
      toastOptions={{
        duration: 2800,
        className: '!max-w-[min(92vw,22rem)] !text-left',
        style: {
          borderRadius: '9999px',
          padding: '11px 18px',
          fontSize: '14px',
          fontWeight: 500,
          background: 'rgba(17, 24, 39, 0.94)',
          color: '#f9fafb',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.18)',
          border: '1px solid rgba(255,255,255,0.06)',
        },
        success: {
          duration: 2600,
          iconTheme: { primary: '#4ade80', secondary: '#111827' },
          style: {
            background: 'rgba(17, 24, 39, 0.94)',
            color: '#f9fafb',
          },
        },
        error: {
          duration: 3800,
          iconTheme: { primary: '#fca5a5', secondary: '#450a0a' },
          style: {
            background: 'rgba(69, 10, 10, 0.96)',
            color: '#fef2f2',
            border: '1px solid rgba(252, 165, 165, 0.25)',
          },
        },
      }}
    />
  );
}
