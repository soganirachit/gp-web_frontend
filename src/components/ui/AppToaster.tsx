import { Toaster, ToastBar, toast, type Toast } from 'react-hot-toast';
import { IoClose } from 'react-icons/io5';
import { useFeatureTheme } from '../../context/FeatureThemeContext';

const DAILY_TOAST_MS = 5000;
const STORE_DEFAULT_MS = 2800;
const STORE_SUCCESS_MS = 2600;

/**
 * Global toast: compact snackbar above the tab bar — small type, modest radius, capped width.
 * Each toast includes a dismiss control (react-hot-toast has no built-in close on default bar).
 *
 * GP Daily: success / default / loading use brand orange (not store green) and auto-dismiss in 5s.
 * GP Store: green success bar, shorter durations.
 *
 * Uses the stock `Toaster` so visibility / height measurement match the library (custom host
 * previously skipped height updates and left toasts at opacity 0).
 */
export function AppToaster() {
  const { feature } = useFeatureTheme();
  const isDaily = feature === 'gpDaily';
  const position = 'bottom-center' as const;

  const dailyNeutral = {
    borderRadius: '16px' as const,
    background: '#FAA222',
    color: '#111827',
    boxShadow: '0 6px 12px rgba(250, 162, 34, 0.35)',
    border: '1px solid #e8941a',
  };

  const storeNeutral = {
    borderRadius: '16px' as const,
    background: '#19411f',
    color: '#f9fafb',
    boxShadow: '0 6px 10px rgba(0, 0, 0, 0.18)',
    border: '1px solid #19411f',
  };

  return (
    <Toaster
      position={position}
      containerClassName={
        isDaily ? 'gp-app-toaster gp-app-toaster--daily' : 'gp-app-toaster'
      }
      containerStyle={{
        bottom: 'max(5.25rem, calc(env(safe-area-inset-bottom, 0px) + 4.25rem))',
      }}
      gutter={8}
      toastOptions={{
        duration: isDaily ? DAILY_TOAST_MS : STORE_DEFAULT_MS,
        className:
          '!inline-flex !items-center !justify-center !box-border !text-center !whitespace-normal !rounded-2xl ' +
          '!px-[16px] !py-[9px] !min-w-0 !w-fit !max-w-[92vw] sm:!max-w-[44rem] ' +
          '!text-sm !leading-snug !font-medium [&>div]:!text-center [&>div]:!whitespace-normal [&>div]:!break-words',
        style: isDaily ? dailyNeutral : storeNeutral,
        success: {
          duration: isDaily ? DAILY_TOAST_MS : STORE_SUCCESS_MS,
          icon: null,
          style: isDaily
            ? dailyNeutral
            : {
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
          duration: isDaily ? DAILY_TOAST_MS : STORE_DEFAULT_MS,
          icon: null,
          style: isDaily ? dailyNeutral : storeNeutral,
        },
      }}
    >
      {(t: Toast) => (
        <ToastBar toast={t} position={position}>
          {({ icon, message }) => (
            <div className="flex w-full min-w-0 items-center gap-1">
              {icon}
              <div className="gp-toast-message-wrap flex min-w-0 flex-1 flex-col justify-center text-center">
                {message}
              </div>
              <button
                type="button"
                className="gp-toast-dismiss"
                aria-label="Dismiss notification"
                onClick={() => toast.dismiss(t.id)}
              >
                <IoClose className="h-5 w-5 opacity-90" aria-hidden />
              </button>
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
