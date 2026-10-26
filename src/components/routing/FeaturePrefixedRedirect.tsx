import { Navigate, useLocation } from "react-router-dom";
import { basePathForFeature } from "../../config/routes.config";
import { getLastUsedFeature } from "../../utils/lastUsedFeature";

type Props = {
  /** Path segment after feature prefix, e.g. `faq` → `/gp-store/faq` (wallet always → GP Daily). */
  segment: string;
  /** When set, always use this feature instead of last-used. */
  feature?: "gpStore" | "gpDaily";
};

/** Redirect bare shared paths (`/wallet`) to the correct feature-prefixed route. */
export default function FeaturePrefixedRedirect({ segment, feature }: Props) {
  const location = useLocation();
  const normalizedSegment = segment.replace(/^\/+/, "");
  /** Wallet exists only under GP Daily — never `/gp-store/wallet`. */
  const active =
    normalizedSegment === "wallet"
      ? "gpDaily"
      : (feature ?? getLastUsedFeature());
  const base = basePathForFeature(active);
  const normalized = segment.replace(/^\/+/, "");
  const target = `${base}/${normalized}${location.search}`;
  return <Navigate to={target} replace state={location.state} />;
}
