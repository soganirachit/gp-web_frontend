import {
  GENDA_PHOOL_PRIVACY_POLICY_PATH,
  GENDA_PHOOL_TERMS_OF_SERVICE_PATH,
  resolveLegalDocumentUrl,
} from "../config/legalUrls";

export function openLegalDocument(
  path:
    | typeof GENDA_PHOOL_PRIVACY_POLICY_PATH
    | typeof GENDA_PHOOL_TERMS_OF_SERVICE_PATH,
): void {
  const url = resolveLegalDocumentUrl(path);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.location.assign(url);
  }
}

export function openPrivacyPolicy(): void {
  openLegalDocument(GENDA_PHOOL_PRIVACY_POLICY_PATH);
}

export function openTermsOfService(): void {
  openLegalDocument(GENDA_PHOOL_TERMS_OF_SERVICE_PATH);
}
