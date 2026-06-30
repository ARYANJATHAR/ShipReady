/**
 * Cookie consent banner scanner.
 *
 * Checks whether a repo already has a cookie consent banner component or
 * snippet. This complements the legal scanner's cookie policy check — a
 * repo might have a COOKIES.md (policy document) but no working banner.
 *
 * Detection strategy:
 *   1. File paths — look for common banner file names like
 *      app/components/cookie-consent.tsx, public/cookie-consent-snippet.html, etc.
 *   2. File content — scan fetched component/layout files for signs of a
 *      consent implementation (localStorage reads of "cookie-consent",
 *      "CookieConsent" component, "cookie-consent-banner" div ID).
 *
 * Severity: recommended — not having a banner doesn't break your site,
 * but it's a compliance requirement under GDPR/ePrivacy if you use cookies.
 *
 * Only flagged when the project uses cookies (checked by the caller).
 */

import type { Issue, RepoFile } from "../types";

/**
 * Candidate file paths that would indicate a cookie consent banner exists.
 * These match what our generator produces (see generators/cookie-consent-banner.ts).
 */
const BANNER_FILE_PATTERNS = [
  // Next.js / Remix — our generator output
  "app/components/cookie-consent.tsx",
  "app/components/cookie-consent.jsx",
  "src/components/cookie-consent.tsx",
  "src/components/cookie-consent.jsx",
  "components/cookie-consent.tsx",
  "components/cookie-consent.jsx",

  // Static HTML — our generator output
  "public/cookie-consent-snippet.html",
  "cookie-consent-snippet.html",

  // Common third-party / custom naming
  "app/components/cookie-banner.tsx",
  "app/components/cookie-banner.jsx",
  "src/components/cookie-banner.tsx",
  "src/components/cookie-banner.jsx",
  "components/cookie-banner.tsx",
  "components/cookie-banner.jsx",
  "public/cookie-banner.html",

  // Osano, Cookiebot, and other popular consent platforms
  "app/components/CookieConsent.tsx",
  "src/components/CookieConsent.tsx",
  "components/CookieConsent.tsx",
];

/**
 * Content patterns that indicate a cookie consent banner is implemented.
 * We look for these in layout files and any .tsx/.jsx files.
 */
const BANNER_CONTENT_PATTERNS = [
  /CookieConsent/i,             // Our exported component name
  /cookie-consent-banner/i,     // Static HTML div ID
  /cookieConsentChange/i,       // Custom event dispatched by our component
  /cookie-consent/i,            // localStorage key and cookie name
  /cookie_settings/i,           // Common variant
];

export interface CookieConsentScanInput {
  /** The full repo file tree (for path-based detection) */
  files: RepoFile[];
  /** File contents for files we've already fetched (for content-based detection) */
  contents: Map<string, string | null>;
}

/**
 * Scan for an existing cookie consent banner.
 *
 * Returns a "present" issue if a banner was found, or a "missing" issue
 * if no banner was detected. The caller should only surface this issue
 * when the project uses cookies (context.usesCookies === true).
 */
export function scanCookieConsentBanner(input: CookieConsentScanInput): Issue[] {
  const filePaths = new Set(input.files.filter((f) => f.type === "file").map((f) => f.path));

  // 1. Path-based detection — check for known banner file names
  const foundByPath = BANNER_FILE_PATTERNS.find((p) => filePaths.has(p));

  if (foundByPath) {
    return [
      {
        id: "missing-cookie-consent-banner",
        category: "meta",
        title: "Cookie consent banner present",
        description:
          "Your project includes a cookie consent banner. Make sure it's wired into your root layout and tested for GDPR compliance.",
        severity: "optional",
        status: "present",
        existingFile: foundByPath,
      },
    ];
  }

  // 2. Content-based detection — scan fetched component/layout files for
  //    consent-related patterns. Only check source files (.tsx, .jsx, .html).
  const sourceFiles = Array.from(input.contents.entries())
    .filter(([path, content]) => content && /\.[tj]sx?$|\.html$/i.test(path));

  for (const [, content] of sourceFiles) {
    if (!content) continue;
    for (const pattern of BANNER_CONTENT_PATTERNS) {
      if (pattern.test(content)) {
        return [
          {
            id: "missing-cookie-consent-banner",
            category: "meta",
            title: "Cookie consent banner present",
            description:
              "We detected a cookie consent implementation in your source code (found by content pattern matching).",
            severity: "optional",
            status: "present",
          },
        ];
      }
    }
  }

  // 3. No banner found
  return [
    {
      id: "missing-cookie-consent-banner",
      category: "meta",
      title: "Missing cookie consent banner",
      description:
        "Your project has policy documents but no working cookie consent banner. Without one, you can't legally obtain consent for non-essential cookies under GDPR and ePrivacy regulations. Generate a consent banner component that stores user preferences in localStorage and applies them before setting tracking cookies.",
      severity: "recommended",
      status: "missing",
    },
  ];
}
