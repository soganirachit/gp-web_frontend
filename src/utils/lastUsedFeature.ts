import type { Feature } from "../config/features";
import { defaultFeatureWhenAmbiguous } from "../config/routes.config";

const STORAGE_KEY = "gp_last_feature";

export function rememberFeatureFromPath(pathname: string): void {
  if (typeof sessionStorage === "undefined") return;
  if (pathname.startsWith("/gp-store")) {
    sessionStorage.setItem(STORAGE_KEY, "gpStore");
  } else if (pathname.startsWith("/gp-daily")) {
    sessionStorage.setItem(STORAGE_KEY, "gpDaily");
  }
}

export function getLastUsedFeature(): Feature {
  if (typeof sessionStorage === "undefined") return defaultFeatureWhenAmbiguous();
  const v = sessionStorage.getItem(STORAGE_KEY);
  if (v === "gpStore" || v === "gpDaily") return v;
  return defaultFeatureWhenAmbiguous();
}
