import { useEffect } from 'react';
import { Toaster, ToastBar, toast, type Toast, type ToastOptions } from 'react-hot-toast';
import { IoClose } from 'react-icons/io5';
import { useFeatureTheme } from '../../context/FeatureThemeContext';
import { isApprovedGlobalToastMessage } from '../../utils/toastReviewPolicy';

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

  useEffect(() => {
    const bag = toast as typeof toast & {
      __reviewPolicyPatched?: boolean;
      __origSuccess?: typeof toast.success;
      __origError?: typeof toast.error;
      __origToast?: (message: any, options?: ToastOptions) => string;
    };
    if (bag.__reviewPolicyPatched) return;

    bag.__origSuccess = toast.success.bind(toast);
    bag.__origError = toast.error.bind(toast);
    bag.__origToast = toast.bind(toast);

    const guardMessage = (message: unknown): boolean =>
      typeof message !== 'string' || isApprovedGlobalToastMessage(message);

    toast.success = (message: any, options?: ToastOptions) => {
      if (!guardMessage(message)) return '' as any;
      return bag.__origSuccess!(message, options);
    };
    toast.error = (message: any, options?: ToastOptions) => {
      if (!guardMessage(message)) return '' as any;
      return bag.__origError!(message, options);
    };

    const guardedDefault = (message: any, options?: ToastOptions) => {
      if (!guardMessage(message)) return '' as any;
      return bag.__origToast!(message, options);
    };
    Object.assign(guardedDefault, toast);
    guardedDefault.success = toast.success;
    guardedDefault.error = toast.error;
    Object.assign(toast, guardedDefault);

    bag.__reviewPolicyPatched = true;
  }, []);

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
          // Match mobile `AppToastProvider` errorToast (#BE2727)
          style: {
            background: '#BE2727',
            color: '#F9FAFB',
            border: '1px solid #BE2727',
            boxShadow: '0 6px 10px rgba(0, 0, 0, 0.18)',
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
