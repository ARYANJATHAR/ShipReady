/**
 * Errors scanner.
 *
 * Checks for custom error pages that catch unhandled exceptions and 404s.
 * Without them, users see the framework's ugly default error page
 * (Vercel's white-on-black, or Next.js's red error overlay in dev — but
 * in production it's even worse: a raw stack trace).
 *
 * Detection:
 *   - Next.js / Remix: app/not-found.tsx, app/error.tsx, app/global-error.tsx
 *   - Static / generic: 404.html, 500.html, public/404.html
 *
 * Severity: 🟡 recommended — your site still works, but it looks broken
 * when something goes wrong.
 */

import type { Issue, RepoFile } from "../types";
import type { Framework } from "../framework";

export interface ErrorsScanInput {
  files: RepoFile[];
  framework: Framework;
}

interface ErrorTarget {
  id: string;
  title: string;
  description: string;
  /** Paths to look for */
  paths: string[];
  /** Whether this is critical (error pages leaking) vs recommended (missing) */
  severity: "critical" | "recommended";
}

const ERRORS_TARGETS: ErrorTarget[] = [
  {
    id: "missing-not-found",
    title: "Missing 404 page",
    description:
      "When users hit a broken link, they see your framework's generic 404 (or a blank page with '404' text). A custom 404 page keeps users on your site with helpful links back to working content. It's also a chance to show your brand voice.",
    paths: [
      "app/not-found.tsx",
      "app/not-found.jsx",
      "app/not-found.js",
      "src/pages/404.tsx",
      "src/pages/404.jsx",
      "src/pages/404.js",
      "404.html",
      "public/404.html",
      "pages/404.tsx",
      "pages/404.jsx",
    ],
    severity: "recommended",
  },
  {
    id: "missing-error-page",
    title: "Missing error boundary",
    description:
      "When an unhandled exception happens in a server component, Next.js needs a custom `error.tsx` to catch it. Without one, users see a raw stack trace or a blank page. This is one of the most embarrassing production failures.",
    paths: [
      "app/error.tsx",
      "app/error.jsx",
      "app/error.js",
      "src/pages/_error.tsx",
      "src/pages/_error.jsx",
      "pages/_error.tsx",
      "500.html",
      "public/500.html",
    ],
    severity: "recommended",
  },
  {
    id: "missing-global-error",
    title: "Missing global error handler",
    description:
      "`global-error.tsx` catches errors in the root layout itself — the one place `error.tsx` can't reach. If your header/footer crashes, this is the only thing standing between you and a blank white page. Critical for SaaS where every error is a lost customer.",
    paths: [
      "app/global-error.tsx",
      "app/global-error.jsx",
      "app/global-error.js",
    ],
    severity: "recommended",
  },
];

export function scanErrors(input: ErrorsScanInput): Issue[] {
  const issues: Issue[] = [];
  const filePaths = new Set(input.files.filter((f) => f.type === "file").map((f) => f.path));

  for (const target of ERRORS_TARGETS) {
    const found = target.paths.find((p) => filePaths.has(p));
    if (found) {
      issues.push({
        id: target.id,
        category: "errors",
        title: target.title.replace(/^Missing /, "Custom ") + " present",
        description: target.description,
        severity: "optional",
        status: "present",
        existingFile: found,
      });
    } else {
      issues.push({
        id: target.id,
        category: "errors",
        title: target.title,
        description: target.description,
        severity: target.severity,
        status: "missing",
      });
    }
  }

  return issues;
}
