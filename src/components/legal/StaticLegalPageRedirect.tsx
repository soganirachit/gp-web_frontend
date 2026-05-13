import { useEffect } from 'react';

/**
 * Nginx try_files falls through to index.html for paths without a physical file.
 * Static legal pages live at /privacy-policy.html and /terms_of_service.html in public/.
 * This route performs a full navigation so the browser loads those files directly.
 */
export default function StaticLegalPageRedirect({ path }: { path: string }) {
  useEffect(() => {
    window.location.replace(path);
  }, [path]);
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-gray-600 text-sm px-4">
      Opening document…
    </div>
  );
}
