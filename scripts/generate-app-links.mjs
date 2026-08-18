/**
 * Writes Android App Links + iOS Universal Links files into `public/.well-known/`.
 *
 * Required for WhatsApp / browser links to open the native app when installed.
 *
 * Set before `npm run build` (or in CI):
 *   ANDROID_APP_LINK_SHA256 — comma-separated SHA-256 cert fingerprints (EAS upload keystore)
 *   APPLE_TEAM_ID — Apple Developer Team ID (10 chars)
 *
 * Get Android SHA-256: `npx eas credentials -p android` (Keystore → SHA256 Fingerprint)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, "..", "public", ".well-known");

const ANDROID_PACKAGE = "com.customer.gendaphoolmobile";
const IOS_BUNDLE_ID = "com.customer.gendaphoolmobile";

function parseFingerprints(raw) {
  return String(raw ?? "")
    .split(",")
    .map((s) => s.trim().replace(/:/g, "").toUpperCase())
    .filter(Boolean);
}

const fingerprints = parseFingerprints(process.env.ANDROID_APP_LINK_SHA256);
const teamId = String(process.env.APPLE_TEAM_ID ?? "").trim();

if (fingerprints.length === 0) {
  console.warn(
    "[generate-app-links] ANDROID_APP_LINK_SHA256 is not set — assetlinks.json will keep a placeholder and Android App Links will NOT verify.",
  );
}

if (!teamId) {
  console.warn(
    "[generate-app-links] APPLE_TEAM_ID is not set — apple-app-site-association will keep a placeholder and iOS Universal Links will NOT verify.",
  );
}

const assetlinks = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: ANDROID_PACKAGE,
      sha256_cert_fingerprints:
        fingerprints.length > 0 ? fingerprints : ["REPLACE_SHA256_FINGERPRINT"],
    },
  },
];

const aasa = {
  applinks: {
    apps: [],
    details: [
      {
        appIDs: [
          teamId
            ? `${teamId}.${IOS_BUNDLE_ID}`
            : `REPLACE_TEAM_ID.${IOS_BUNDLE_ID}`,
        ],
        components: [
          { "/": "/products/*", comment: "Product detail deep link" },
          { "/": "/product/*", comment: "Legacy product deep link" },
        ],
      },
    ],
  },
};

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(
  path.join(publicDir, "assetlinks.json"),
  `${JSON.stringify(assetlinks, null, 2)}\n`,
  "utf8",
);
fs.writeFileSync(
  path.join(publicDir, "apple-app-site-association"),
  `${JSON.stringify(aasa, null, 2)}\n`,
  "utf8",
);

console.log("[generate-app-links] Wrote public/.well-known/assetlinks.json");
console.log("[generate-app-links] Wrote public/.well-known/apple-app-site-association");
