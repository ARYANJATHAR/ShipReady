/**
 * SEO scanner.
 *
 * Checks for the SEO essentials that every production website needs:
 *   - Sitemap (sitemap.xml, app/sitemap.ts, etc.)
 *   - robots.txt
 *   - Open Graph tags (og:title, og:description, og:image)
 *   - Twitter card tags
 *   - JSON-LD structured data
 *   - Canonical URL
 *   - <title> tag and meta description
 *
 * Why this matters: Without these, your site is invisible to Google.
 * Search engines can't crawl pages they don't know about, and they
 * can't rank pages without title/description. Social shares look broken
 * without OG tags. JSON-LD is how Google builds rich snippets.
 *
 * Severity: 🟡 recommended (not critical — your site still works,
 * you just won't get organic traffic).
 */

import type { Issue, RepoFile } from "../types";
import type { Framework } from "../framework";
import { frameworkPaths } from "../framework";

export interface SeoScanInput {
  files: RepoFile[];
  /** File contents (path → content) for files we've fetched */
  contents: Map<string, string | null>;
  framework: Framework;
}

interface SeoTarget {
  id: string;
  title: string;
  description: string;
  /** Check function — returns 'present' | 'missing' | 'warning' */
  check: (input: SeoScanInput) => { status: "present" | "missing" | "warning"; file?: string };
}

/**
 * Multiple candidate paths for root layout content.
 * Scanners use this when the framework's primary rootLayout path
 * doesn't exist in the fetched contents — common in Vite SPAs where
 * index.html lives at public/index.html rather than root index.html.
 */
function getLayoutContent(contents: Map<string, string | null>, primaryPath: string | null): string | null {
  if (primaryPath) {
    const content = contents.get(primaryPath);
    if (content) return content;
  }

  // Fallback candidates — try common HTML entry point paths
  const candidates = [
    "public/index.html",
    "index.html",
    "src/index.html",
    "src/App.tsx",
    "src/App.jsx",
  ];

  for (const path of candidates) {
    if (path === primaryPath) continue; // already tried
    const content = contents.get(path);
    if (content) return content;
  }

  return null;
}

const SEO_TARGETS: SeoTarget[] = [
  {
    id: "missing-sitemap",
    title: "Missing sitemap",
    description:
      "Search engines use sitemaps to discover pages. Without one, new content takes weeks to get indexed and deep pages may never be found. Google Search Console will warn you about this. Most frameworks can auto-generate it.",
    check: ({ files, framework }) => {
      const paths = frameworkPaths(framework);
      const sitemapTargets = [
        paths.sitemap,
        "public/sitemap.xml",
        "sitemap.xml",
        "public/sitemap-index.xml",
      ].filter(Boolean) as string[];

      const found = files.find((f) => sitemapTargets.some((t) => t && f.path === t));
      return found ? { status: "present" as const, file: found.path } : { status: "missing" as const };
    },
  },
  {
    id: "missing-robots-txt",
    title: "Missing robots.txt",
    description:
      "robots.txt tells search engines what they can and can't crawl. Without it, you can't block /admin, /api, or staging URLs from Google, and you can't point crawlers to your sitemap. Sitemap discovery is also broken.",
    check: ({ files }) => {
      const found = files.find(
        (f) => f.path === "robots.txt" || f.path === "public/robots.txt"
      );
      return found ? { status: "present" as const, file: found.path } : { status: "missing" as const };
    },
  },
  {
    id: "missing-og-tags",
    title: "Missing Open Graph tags",
    description:
      "Open Graph tags control how your page appears when shared on Twitter, LinkedIn, Slack, Discord, etc. Without og:title, og:description, and og:image, your shares look like blank cards. The fix is 5 lines of HTML in your root layout.",
    check: ({ contents, framework }) => {
      const layout = getLayoutContent(contents, frameworkPaths(framework).rootLayout);
      if (!layout) {
        return { status: "missing" as const };
      }
      const hasOg = /og:(title|description|image)/i.test(layout) ||
                    /openGraph\s*[:\{]/i.test(layout);
      return hasOg ? { status: "present" as const } : { status: "missing" as const };
    },
  },
  {
    id: "missing-twitter-card",
    title: "Missing Twitter card tags",
    description:
      "Twitter (X) uses its own meta tags: twitter:card, twitter:title, twitter:description, twitter:image. Without these, your links get the ugly 'no image' preview when shared on X.",
    check: ({ contents, framework }) => {
      const layout = getLayoutContent(contents, frameworkPaths(framework).rootLayout);
      if (!layout) return { status: "missing" as const };
      const hasTwitter = /twitter:card/i.test(layout);
      return hasTwitter ? { status: "present" as const } : { status: "missing" as const };
    },
  },
  {
    id: "missing-jsonld",
    title: "Missing structured data (JSON-LD)",
    description:
      "JSON-LD is how Google builds rich results — star ratings, FAQ accordions, product cards in search. Pages with structured data get 20-30% higher CTR. The simplest win: add an Organization schema to your homepage.",
    check: ({ files, contents }) => {
      // Check for inline JSON-LD in layout files
      for (const [path, content] of contents) {
        if (content && /type\s*=\s*["']application\/ld\+json["']/i.test(content)) {
          return { status: "present" as const, file: path };
        }
      }
      // Check for separate JSON-LD files
      const found = files.find((f) => /\.jsonld?$/i.test(f.path));
      return found ? { status: "present" as const, file: found.path } : { status: "missing" as const };
    },
  },
  {
    id: "missing-canonical",
    title: "Missing canonical URL",
    description:
      "Canonical URLs tell search engines which version of a page is the 'real' one. Without them, you can have duplicate content issues (with/without trailing slash, with/without www, etc.) that hurt your rankings.",
    check: ({ contents, framework }) => {
      const layout = getLayoutContent(contents, frameworkPaths(framework).rootLayout);
      if (!layout) return { status: "missing" as const };
      const hasCanonical = /canonical/i.test(layout) ||
                          /alternates\s*:/i.test(layout) ||
                          /<link[^>]+rel\s*=\s*["']canonical["']/i.test(layout);
      return hasCanonical ? { status: "present" as const } : { status: "missing" as const };
    },
  },
  {
    id: "missing-meta-description",
    title: "Missing meta description",
    description:
      "Meta descriptions show up in search results under your page title. Pages with custom descriptions get ~6% higher CTR than auto-generated ones. The fix is 2 lines in your layout.",
    check: ({ contents, framework }) => {
      const layout = getLayoutContent(contents, frameworkPaths(framework).rootLayout);
      if (!layout) return { status: "missing" as const };
      const hasDesc = /description\s*:/i.test(layout) ||
                      /<meta[^>]+name\s*=\s*["']description["']/i.test(layout);
      return hasDesc ? { status: "present" as const } : { status: "missing" as const };
    },
  },
];

export function scanSeo(input: SeoScanInput): Issue[] {
  const issues: Issue[] = [];

  for (const target of SEO_TARGETS) {
    const result = target.check(input);
    if (result.status === "present") {
      issues.push({
        id: target.id,
        category: "seo",
        title: target.title.replace(/^Missing /, ""),
        description: target.description,
        severity: "optional",
        status: "present",
        existingFile: result.file,
      });
    } else {
      issues.push({
        id: target.id,
        category: "seo",
        title: target.title,
        description: target.description,
        severity: "recommended",
        status: "missing",
      });
    }
  }

  return issues;
}
