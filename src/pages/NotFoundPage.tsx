import { Link, useLocation } from "react-router-dom";
import { getLastUsedFeature } from "../utils/lastUsedFeature";
import { ROUTES, basePathForFeature } from "../config/routes.config";
import { resolveSmartHomePath } from "../utils/resolveSmartHomePath";

export default function NotFoundPage() {
  const location = useLocation();
  const feature = getLastUsedFeature();
  const featureHome = basePathForFeature(feature);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-sm font-medium text-[#19411f]">404</p>
      <h1 className="mt-2 text-xl font-semibold text-gray-900">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-sm text-gray-600">
        We could not find{" "}
        <span className="font-mono text-xs text-gray-500">
          {location.pathname}
        </span>
        . The link may be outdated or mistyped.
      </p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
        <Link
          to={resolveSmartHomePath()}
          className="rounded-xl bg-[#19411F] py-3 text-sm font-semibold text-white hover:opacity-95 active:scale-[0.99]"
        >
          Go to app home
        </Link>
        <Link
          to={featureHome}
          className="rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 active:scale-[0.99]"
        >
          Open {feature === "gpStore" ? "GP Store" : "GP Daily"}
        </Link>
        <Link
          to={ROUTES.store.products}
          className="text-sm font-medium text-[#19411f] underline-offset-2 hover:underline"
        >
          Browse products
        </Link>
      </div>
    </div>
  );
}
