import { Toaster, ToastBar, toast, type Toast } from 'react-hot-toast';
import { IoClose } from 'react-icons/io5';

/**
 * Global toast: compact snackbar above the tab bar — small type, modest radius, capped width.
 * Each toast includes a dismiss control (react-hot-toast has no built-in close on default bar).
 */
export function AppToaster() {
  const position = 'bottom-center' as const;

  return (
    <Toaster
      position={position}
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
