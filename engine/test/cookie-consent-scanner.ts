// Cookie consent scanner smoke test
import { scanCookieConsentBanner } from "../src/scanners/cookie-consent";
import type { RepoFile } from "../src/types";

let pass = 0, fail = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    pass++;
    console.log(`  [OK] ${label}`);
  } else {
    fail++;
    console.log(`  [FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function makeFile(path: string, content?: string): RepoFile {
  return { path, type: "file", sha: "x", content };
}

console.log("=== Cookie Consent Banner Scanner ===\n");

// ── No banner at all (empty repo) ──
console.log("--- No banner (empty repo) ---");
const empty = scanCookieConsentBanner({ files: [], contents: new Map() });
assert(empty.length === 1, "Returns exactly one issue");
assert(empty[0].id === "missing-cookie-consent-banner", "Issue ID is correct");
assert(empty[0].status === "missing", "Status is 'missing' when no banner found");
assert(empty[0].severity === "recommended", "Severity is 'recommended'");

console.log("");

// ── Path-based detection: Next.js component ──
console.log("--- Path detection: Next.js component ---");
const nextjsFiles: RepoFile[] = [makeFile("app/components/cookie-consent.tsx")];
const pathDetected = scanCookieConsentBanner({ files: nextjsFiles, contents: new Map() });
assert(pathDetected.length === 1, "Returns exactly one issue");
assert(pathDetected[0].status === "present", "Status is 'present' when banner found by path");
assert(pathDetected[0].existingFile === "app/components/cookie-consent.tsx", "Records the matching file path");

console.log("");

// ── Path-based detection: static HTML snippet ──
console.log("--- Path detection: static HTML snippet ---");
const staticFiles: RepoFile[] = [makeFile("public/cookie-consent-snippet.html")];
const staticDetected = scanCookieConsentBanner({ files: staticFiles, contents: new Map() });
assert(staticDetected[0].status === "present", "Static HTML snippet detected as present");

console.log("");

// ── Path-based detection: cookie-banner variant ──
console.log("--- Path detection: cookie-banner.tsx ---");
const bannerFiles: RepoFile[] = [makeFile("src/components/cookie-banner.tsx")];
const bannerDetected = scanCookieConsentBanner({ files: bannerFiles, contents: new Map() });
assert(bannerDetected[0].status === "present", "cookie-banner.tsx variant detected as present");

console.log("");

// ── Content-based detection: CookieConsent in layout ──
console.log("--- Content detection: CookieConsent in layout ---");
const layoutFiles: RepoFile[] = [makeFile("app/layout.tsx")];
const layoutContents = new Map<string, string | null>();
layoutContents.set("app/layout.tsx", "import { CookieConsent } from './components/cookie-consent'");
const contentDetected = scanCookieConsentBanner({ files: layoutFiles, contents: layoutContents });
assert(contentDetected[0].status === "present", "CookieConsent import detected in layout content");

console.log("");

// ── Content-based detection: cookie-consent-banner div ID ──
console.log("--- Content detection: HTML div ID ---");
const htmlContents = new Map<string, string | null>();
htmlContents.set("public/index.html", '<div id="cookie-consent-banner">...</div>');
const htmlDetected = scanCookieConsentBanner({ files: [], contents: htmlContents });
assert(htmlDetected[0].status === "present", "cookie-consent-banner div ID detected in HTML");

console.log("");

// ── Content-based detection: cookieConsentChange event ──
console.log("--- Content detection: custom event ---");
const eventContents = new Map<string, string | null>();
eventContents.set("app/custom.ts", 'window.dispatchEvent(new CustomEvent("cookieConsentChange"));');
const eventDetected = scanCookieConsentBanner({ files: [], contents: eventContents });
assert(eventDetected[0].status === "present", "cookieConsentChange event detected");

console.log("");

// ── Multiple files, no banner ──
console.log("--- Multiple files, no banner ---");
const multiFiles: RepoFile[] = [
  makeFile("package.json"),
  makeFile("README.md"),
  makeFile("app/layout.tsx"),
  makeFile("app/page.tsx"),
];
const multiContents = new Map<string, string | null>();
multiContents.set("app/layout.tsx", '<html lang="en"><body>{children}</body></html>');
multiContents.set("app/page.tsx", "export default function Page() { return <h1>Hello</h1>; }");
const multiResult = scanCookieConsentBanner({ files: multiFiles, contents: multiContents });
assert(multiResult[0].status === "missing", "No banner found when none exists");

console.log("");

// ── Summary ──
console.log(`---`);
console.log(`${pass} pass, ${fail} fail\n`);
if (fail > 0) process.exit(1);
