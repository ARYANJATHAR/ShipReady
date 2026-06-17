/**
 * Accessibility (A11y) lint scanner.
 *
 * Catches the most common accessibility issues that are easy to detect
 * statically. We don't pretend to be axe-core — automated testing can
 * only catch ~30% of accessibility issues. The rest need manual review.
 *
 * What we check:
 *   - <html lang="..."> attribute (screen readers need this)
 *   - <title> tag (every page needs one)
 *   - Images with alt="" or missing alt (the bare minimum)
 *   - <button> without accessible name
 *   - Form <input> without associated <label>
 *
 * Severity: 🟡 recommended — accessibility is a legal requirement in
 * many jurisdictions (ADA, EAA, AODA), and 15-20% of users have a
 * disability. These issues are easy to fix and have outsized impact.
 */

import type { Issue } from "../types";

export interface A11yScanInput {
  /** Map of file path → content (only files we fetched) */
  contents: Map<string, string | null>;
  framework: string;
}

interface A11yTarget {
  id: string;
  title: string;
  description: string;
  /** Severity if missing */
  severity: "critical" | "recommended" | "optional";
  /** Check function: returns true if the issue is present */
  check: (input: A11yScanInput) => { missing: boolean; file?: string; count?: number };
}

const A11Y_TARGETS: A11yTarget[] = [
  {
    id: "missing-html-lang",
    title: "Missing <html lang> attribute",
    description:
      "Screen readers need to know the page's language to pronounce words correctly. Without `lang=\"en\"` (or whatever your language is), a screen reader will use its default language — which is wrong for ~all of your users. It's also a WCAG Level A violation.",
    severity: "recommended",
    check: ({ contents, framework }) => {
      const layoutPath = findLayoutFile(framework);
      const content = layoutPath ? contents.get(layoutPath) : null;
      if (!content) return { missing: true };
      const hasLang = /<html[^>]+lang\s*=/i.test(content);
      return { missing: !hasLang, file: layoutPath };
    },
  },
  {
    id: "missing-page-title",
    title: "Missing page title",
    description:
      "Every page needs a `<title>` tag — it's what shows in the browser tab, the search result, the bookmark, and the screen reader announcement when the page loads. Without one, all your pages look like 'Untitled' in the browser.",
    severity: "recommended",
    check: ({ contents, framework }) => {
      const layoutPath = findLayoutFile(framework);
      const content = layoutPath ? contents.get(layoutPath) : null;
      if (!content) return { missing: true };
      // In Next.js, this can be a `metadata` export
      const hasMetadata = /export\s+const\s+metadata/i.test(content);
      const hasTitle = /<title/i.test(content) || hasMetadata;
      return { missing: !hasTitle, file: layoutPath };
    },
  },
  {
    id: "images-without-alt",
    title: "Images without alt text",
    description:
      "Screen readers announce the alt text of an image — without it, they say 'image' and the user gets no useful info. Decorative images should have alt=\"\" (empty), but content images need descriptive alt. We found images with no alt attribute at all.",
    severity: "recommended",
    check: ({ contents }) => {
      let count = 0;
      let file: string | undefined;
      for (const [path, content] of contents) {
        if (!content) continue;
        if (!/\.(tsx|jsx|html|mdx?)$/i.test(path)) continue;
        // Match <img> tags without alt=
        const matches = content.match(/<img(?![^>]*\salt\s*=)[^>]*>/gi);
        if (matches && matches.length > 0) {
          count += matches.length;
          if (!file) file = path;
        }
        // Match Next.js <Image> with no alt prop
        const nextMatches = content.match(/<Image(?![^>]*\salt\s*=)[^>]*>/gi);
        if (nextMatches && nextMatches.length > 0) {
          count += nextMatches.length;
          if (!file) file = path;
        }
      }
      return { missing: count > 0, file, count };
    },
  },
  {
    id: "buttons-without-label",
    title: "Buttons without accessible labels",
    description:
      "Buttons need text or an aria-label — otherwise screen readers just say 'button' with no context. Icon-only buttons (like a hamburger menu) MUST have an aria-label or sr-only text. We found buttons that appear to have no label.",
    severity: "recommended",
    check: ({ contents }) => {
      let count = 0;
      let file: string | undefined;
      for (const [path, content] of contents) {
        if (!content) continue;
        if (!/\.(tsx|jsx)$/i.test(path)) continue;
        // <button>...</button> with empty content or only whitespace
        const matches = content.match(/<button(?![^>]*\baria-label)[^>]*>\s*<\/button>/gi);
        if (matches && matches.length > 0) {
          count += matches.length;
          if (!file) file = path;
        }
        // <button> with only an icon (e.g. <X />, <Menu />) and no aria-label
        const iconOnly = content.match(/<button(?![^>]*\baria-label)[^>]*>\s*<[A-Z][a-zA-Z]*\s*\/>/gi);
        if (iconOnly && iconOnly.length > 0) {
          count += iconOnly.length;
          if (!file) file = path;
        }
      }
      return { missing: count > 0, file, count };
    },
  },
  {
    id: "inputs-without-label",
    title: "Form inputs without labels",
    description:
      "Form inputs need a `<label>` (or aria-label / aria-labelledby) so screen readers can announce what the input is for. We found inputs that appear to have no label.",
    severity: "recommended",
    check: ({ contents }) => {
      let count = 0;
      let file: string | undefined;
      for (const [path, content] of contents) {
        if (!content) continue;
        if (!/\.(tsx|jsx|html)$/i.test(path)) continue;
        // <input> without aria-label, aria-labelledby, or surrounding label
        const matches = content.match(/<input(?![^>]*\b(aria-label|aria-labelledby|id\s*=\s*["'][^"']*["']))[^>]*>/gi);
        if (matches && matches.length > 0) {
          count += matches.length;
          if (!file) file = path;
        }
      }
      return { missing: count > 0, file, count };
    },
  },
];

export function scanA11y(input: A11yScanInput): Issue[] {
  const issues: Issue[] = [];

  for (const target of A11Y_TARGETS) {
    const result = target.check(input);
    if (result.missing) {
      const desc = result.count && result.count > 1
        ? `${target.description} Found ${result.count} instances.`
        : target.description;
      issues.push({
        id: target.id,
        category: "a11y",
        title: target.title,
        description: desc,
        severity: target.severity,
        status: "warning",
        file: result.file,
      });
    } else {
      issues.push({
        id: target.id,
        category: "a11y",
        title: target.title.replace(/^Missing /, "") + " present",
        description: target.description,
        severity: "optional",
        status: "present",
      });
    }
  }

  return issues;
}

function findLayoutFile(framework: string): string {
  if (framework === "nextjs" || framework === "remix") return "app/layout.tsx";
  if (framework === "astro") return "src/layouts/Layout.astro";
  return "index.html";
}
