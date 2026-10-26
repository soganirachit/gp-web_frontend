import { ROUTES } from "../config/routes.config";
import { getLastUsedFeature } from "./lastUsedFeature";
import { basePathForFeature } from "../config/routes.config";

/** Hub or last-used feature home — for errors and global “home” actions. */
export function resolveSmartHomePath(): string {
  const last = getLastUsedFeature();
  return last === "gpStore" ? ROUTES.store.home : ROUTES.daily.home;
}

export function resolveSmartHomeOrHub(): string {
  return resolveSmartHomePath() || ROUTES.hub;
}
