// Cookie consent banner generator smoke test
import { generateCookieConsentBanner } from "../src/generators/cookie-consent-banner";

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

function assertContains(text: string, search: string, label: string) {
  assert(text.includes(search), label, `expected "${search}" in output`);
}

function assertNotContains(text: string, search: string, label: string) {
  assert(!text.includes(search), label, `expected "${search}" NOT in output`);
}

console.log("=== Cookie Consent Banner Generator ===\n");

// ── Next.js output ──
console.log("--- Next.js (with EU users) ---");
const nextjs = generateCookieConsentBanner({
  framework: "nextjs",
  projectName: "MyApp",
  servesEuUsers: true,
});

assert(nextjs.path === "app/components/cookie-consent.tsx", "Next.js path is correct");
assertContains(nextjs.content, '"use client"', "Has use client directive");
assertContains(nextjs.content, 'import { useState, useEffect } from "react"', "Has React imports");
assertContains(nextjs.content, "export function CookieConsent()", "Exports CookieConsent component");
assertContains(nextjs.content, 'localStorage.getItem("cookie-consent")', "Reads from localStorage");
assertContains(nextjs.content, 'localStorage.setItem("cookie-consent"', "Writes to localStorage");
assertContains(nextjs.content, "Accept all", "Has accept button");
assertContains(nextjs.content, "Reject all", "Has reject button");
assertContains(nextjs.content, "Cookie settings", "Has settings button");
assertContains(nextjs.content, 'document.cookie = "cookie-consent=', "Sets cookie");
assertContains(nextjs.content, "applyConsent", "Has applyConsent function");
assertContains(nextjs.content, "cookieConsentChange", "Dispatches custom event");
assertContains(nextjs.content, "Meets GDPR", "Has GDPR mention when servesEuUsers is true");
assertContains(nextjs.content, "MyApp", "Contains project name");

console.log("");

// ── Next.js without EU users ──
console.log("--- Next.js (without EU users) ---");
const nextjsNoEu = generateCookieConsentBanner({
  framework: "nextjs",
  projectName: "MyApp",
  servesEuUsers: false,
});

assertNotContains(nextjsNoEu.content, "Meets GDPR", "No GDPR mention when servesEuUsers is false");
assertContains(nextjsNoEu.content, "CookieConsent", "Still exports component");
assertContains(nextjsNoEu.content, "Accept all", "Still has accept button");
assertContains(nextjsNoEu.content, "localStorage", "Still uses localStorage");

console.log("");

// ── Static / Vite output ──
console.log("--- Static (Vite / unknown) ---");
const staticBanner = generateCookieConsentBanner({
  framework: "vite",
  projectName: "TestProject",
  servesEuUsers: true,
});

assert(staticBanner.path === "public/cookie-consent-snippet.html", "Static path is correct");
assertContains(staticBanner.content, "cookie-consent-banner", "Has banner div ID");
assertContains(staticBanner.content, "cookie-settings-btn", "Has settings button ID");
assertContains(staticBanner.content, "acceptCookies()", "Has acceptCookies JS function");
assertContains(staticBanner.content, "rejectCookies()", "Has rejectCookies JS function");
assertContains(staticBanner.content, 'localStorage.setItem("cookie-consent"', "Writes to localStorage");
assertContains(staticBanner.content, "Accept all", "Has accept button");
assertContains(staticBanner.content, "Reject all", "Has reject button");
assertContains(staticBanner.content, "TestProject", "Contains project name");
assertContains(staticBanner.content, "ShipReady", "Mentions ShipReady origin");

console.log("");

// ── SvelteKit / Astro (falls through to static) ──
console.log("--- SvelteKit (falls through to static) ---");
const svelte = generateCookieConsentBanner({
  framework: "sveltekit",
  projectName: "SvelteApp",
});

assert(svelte.path === "public/cookie-consent-snippet.html", "SvelteKit uses static path");
assertContains(svelte.content, "SvelteApp", "Contains project name");

console.log("");

// ── Remix (same as Next.js) ──
console.log("--- Remix (same as Next.js) ---");
const remix = generateCookieConsentBanner({
  framework: "remix",
  projectName: "RemixApp",
});

assert(remix.path === "app/components/cookie-consent.tsx", "Remix uses Next.js-style path");
assertContains(remix.content, "RemixApp", "Contains project name");

console.log("");

// ── Summary ──
console.log(`---`);
console.log(`${pass} pass, ${fail} fail\n`);
if (fail > 0) process.exit(1);
