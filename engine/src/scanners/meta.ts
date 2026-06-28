/**
 * Meta scanner.
 *
 * Checks for the meta files that make a site feel "complete" rather
 * than half-baked: favicon, manifest (PWA), apple-touch-icon, og-image,
 * theme-color.
 *
 * Why this matters: When someone bookmarks your site (or installs it
 * as a PWA), the favicon and manifest are what shows up on their home
 * screen. Without them, you get the default browser icon — which looks
 * like every other unbranded site. The og-image is what shows up when
 * someone shares your site on Twitter, LinkedIn, or Slack.
 *
 * Severity: 🟢 optional — your site works without these, but it looks
 * unfinished.
 */

import type { Issue, RepoFile } from "../types";
import type { Framework } from "../framework";

export interface MetaScanInput {
  files: RepoFile[];
  /** File contents (path → content) for files we've fetched */
  contents: Map<string, string | null>;
  framework: Framework;
}

/**
 * Try to find layout content across multiple candidate paths.
 * Uses the same pattern as the SEO scanner for consistency.
 */
function getLayoutContent(contents: Map<string, string | null>): string | null {
  const candidates = [
    "index.html",
    "public/index.html",
    "src/index.html",
    "app/layout.tsx",
    "app/layout.jsx",
    "src/app/layout.tsx",
    "app/root.tsx",
    "src/layouts/Layout.astro",
    "src/App.tsx",
    "src/App.jsx",
  ];

  for (const path of candidates) {
    const content = contents.get(path);
    if (content) return content;
  }

  return null;
}

interface MetaTarget {
  id: string;
  title: string;
  description: string;
  paths: string[];
}

const META_TARGETS: MetaTarget[] = [
  {
    id: "missing-favicon",
    title: "Missing favicon",
    description:
      "The favicon is the 16x16 (or 32x32) icon in the browser tab, bookmark bar, and home screen. Without one, you get the default globe icon, which makes your tab indistinguishable from the dozens of other open tabs. It's also a free branding win — every tab is a tiny ad.",
    paths: [
      "app/favicon.ico",
      "public/favicon.ico",
      "favicon.ico",
      "src/assets/favicon.ico",
    ],
  },
  {
    id: "missing-manifest",
    title: "Missing web app manifest",
    description:
      "The manifest.json (or app/manifest.ts in Next.js) lets users install your site as a PWA on their home screen, controls the splash screen, and sets the theme color. Without it, mobile users get a generic browser experience instead of feeling like they're using your app.",
    paths: [
      "app/manifest.ts",
      "app/manifest.json",
      "public/manifest.json",
      "manifest.json",
      "site.webmanifest",
      "public/site.webmanifest",
    ],
  },
  {
    id: "missing-apple-touch-icon",
    title: "Missing apple-touch-icon",
    description:
      "When iOS users add your site to their home screen, this 180x180 PNG is the icon. Without it, iOS takes a screenshot of your page (often with text in the middle), which looks terrible on a phone home screen.",
    paths: [
      "app/apple-icon.png",
      "app/apple-icon.jpg",
      "public/apple-touch-icon.png",
      "apple-touch-icon.png",
    ],
  },
  {
    id: "missing-og-image",
    title: "Missing Open Graph image",
    description:
      "The og-image is the 1200x630 image that shows up when your site is shared on Twitter, LinkedIn, Slack, Discord, etc. Without it, your share looks like a blank card with just text. Pages with custom OG images get 2-3x more click-throughs on social.",
    paths: [
      "app/opengraph-image.png",
      "app/opengraph-image.jpg",
      "public/og-image.png",
      "public/og.png",
      "og-image.png",
    ],
  },
  {
    id: "missing-theme-color",
    title: "Missing theme-color meta tag",
    description:
      "The theme-color meta tag controls the browser chrome (URL bar, status bar on mobile) color. Without it, mobile browsers default to gray, which breaks your visual brand. A 1-line fix.",
    paths: [], // checked via content, not path
  },
];

/**
 * Check if layout content contains a theme-color meta tag.
 * Matches both HTML `<meta name="theme-color" ...>` and
 * Next.js `themeColor: "..."` metadata exports.
 */
function hasThemeColor(layout: string): boolean {
  return /theme-color/i.test(layout) ||
         /themeColor\s*:/i.test(layout);
}

/**
 * Check if layout content references an apple-touch-icon.
 * Matches `<link rel="apple-touch-icon" ...>` in HTML.
 */
function hasAppleTouchIconLink(layout: string): boolean {
  return /rel\s*=\s*["']apple-touch-icon["']/i.test(layout);
}

export function scanMeta(input: MetaScanInput): Issue[] {
  const issues: Issue[] = [];
  const filePaths = new Set(input.files.filter((f) => f.type === "file").map((f) => f.path));
  const layout = getLayoutContent(input.contents);

  for (const target of META_TARGETS) {
    if (target.id === "missing-theme-color") {
      // Check layout content for theme-color meta tag
      const hasTag = layout ? hasThemeColor(layout) : false;
      issues.push({
        id: target.id,
        category: "meta",
        title: hasTag ? "Theme-color meta tag present" : target.title,
        description: target.description,
        severity: "optional",
        status: hasTag ? "present" : "missing",
      });
      continue;
    }

    if (target.id === "missing-apple-touch-icon") {
      // Check file paths first, then fall back to content check
      const foundFile = target.paths.find((p) => filePaths.has(p));
      const hasLink = !foundFile && layout ? hasAppleTouchIconLink(layout) : false;
      issues.push({
        id: target.id,
        category: "meta",
        title: foundFile || hasLink
          ? `${target.title.replace(/^Missing /, "")} present`
          : target.title,
        description: target.description,
        severity: "optional",
        status: foundFile || hasLink ? "present" : "missing",
        existingFile: foundFile,
      });
      continue;
    }

    const found = target.paths.find((p) => filePaths.has(p));
    issues.push({
      id: target.id,
      category: "meta",
      title: found ? `${target.title.replace(/^Missing /, "")} present` : target.title,
      description: target.description,
      severity: "optional",
      status: found ? "present" : "missing",
      existingFile: found,
    });
  }

  return issues;
}
