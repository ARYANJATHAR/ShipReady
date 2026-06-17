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
  framework: Framework;
}

interface MetaTarget {
  id: string;
  title: string;
  description: string;
  paths: string[];
  /** Whether this applies to all frameworks or just some */
  frameworkSpecific?: Framework[];
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

export function scanMeta(input: MetaScanInput): Issue[] {
  const issues: Issue[] = [];
  const filePaths = new Set(input.files.filter((f) => f.type === "file").map((f) => f.path));

  for (const target of META_TARGETS) {
    if (target.id === "missing-theme-color") {
      // Theme color is in layout content, not a file. The presence check
      // is too expensive for a tree-only scan — just flag as a soft miss.
      // (Content-aware checks are in Commit 6 A11y where we have layout content.)
      issues.push({
        id: target.id,
        category: "meta",
        title: target.title,
        description: target.description,
        severity: "optional",
        status: "missing",
      });
      continue;
    }

    const found = target.paths.find((p) => filePaths.has(p));
    issues.push({
      id: target.id,
      category: "meta",
      title: found ? `${target.title.replace(/^Missing /, "")} present` : target.title,
      description: target.description,
      severity: found ? "optional" : "optional",
      status: found ? "present" : "missing",
      existingFile: found,
    });
  }

  return issues;
}
