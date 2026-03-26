import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { IoRefresh } from 'react-icons/io5';

function isChunkOrModuleLoadError(error: unknown): boolean {
  if (!error) return false;
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  const lower = msg.toLowerCase();
  return (
    lower.includes('failed to fetch dynamically imported module') ||
    lower.includes('importing a module script failed') ||
    lower.includes('loading chunk') ||
    lower.includes('error loading dynamically imported module') ||
    lower.includes('failed to load module script') ||
    lower.includes('mime type') && lower.includes('text/html')
  );
}

/**
 * Shown when a route throws (e.g. lazy chunk missing after deploy, or loader error).
 */
export default function RouteErrorPage() {
  const error = useRouteError();

  let title = 'Something went wrong';
  let description =
    'We could not load this screen. Try again, or refresh the page.';
  let hint: string | null = null;

  if (isRouteErrorResponse(error)) {
    title = `${error.status} error`;
    description = error.statusText || description;
  } else if (isChunkOrModuleLoadError(error)) {
    title = 'Update required';
    description =
      'This page could not load the latest files. This often happens after we publish an update.';
    hint = 'Tap refresh to load the newest version.';
  } else if (error instanceof Error && error.message) {
    description = error.message;
  }

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.assign('/gp-store');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8f6f1] px-6 py-12 text-center">
      <div className="max-w-sm w-full rounded-2xl bg-white p-6 shadow-lg border border-gray-100">
        <h1 className="text-lg font-semibold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-600 mb-1">{description}</p>
        {hint && <p className="text-xs text-gray-500 mb-5">{hint}</p>}
        {!hint && <div className="mb-5" />}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleReload}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#19411F] text-white py-3 text-sm font-semibold hover:opacity-95 active:opacity-90"
          >
            <IoRefresh className="text-lg" />
            Refresh page
          </button>
          <button
            type="button"
            onClick={handleGoHome}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Go to home
          </button>
        </div>
      </div>
    </div>
  );
}
