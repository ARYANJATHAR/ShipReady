/**
 * Framework detection.
 *
 * Identifies which framework a repo uses, purely from filenames
 * (no API calls, no content fetching). This is fast and cheap —
 * we already have the full file tree from the GitHub API.
 *
 * Detection is best-effort and ordered by specificity:
 *  1. Look for framework config files (e.g. `next.config.ts`)
 *  2. Look for framework-specific directories (e.g. `app/`, `pages/`)
 *  3. Fall back to package.json dependencies
 *
 * Why this matters: SEO, Errors, Meta, and Security scanners all
 * generate different output per framework. Next.js uses `app/sitemap.ts`,
 * Vite uses `public/sitemap.xml`, Astro has its own conventions, etc.
 */

import type { RepoFile } from "./types";

export type Framework =
  | "nextjs"
  | "vite"
  | "astro"
  | "remix"
  | "sveltekit"
  | "unknown";

/**
 * Human-readable label + a list of common config filenames
 * that strongly indicate the framework.
 */
const FRAMEWORK_SIGNATURES: Array<{
  framework: Framework;
  configFiles: RegExp[];
  dirs: RegExp[];
}> = [
  {
    framework: "nextjs",
    configFiles: [/^next\.config\.(js|ts|mjs)$/i],
    dirs: [/^app\//, /^pages\//, /^src\/app\//, /^src\/pages\//],
  },
  {
    framework: "astro",
    configFiles: [/^astro\.config\.(js|ts|mjs)$/i],
    dirs: [/^src\/pages\//, /^src\/content\//],
  },
  {
    framework: "remix",
    // Remix uses vite.config.ts but ONLY when combined with the app/ dir
    // convention. A standalone vite.config.ts is just Vite.
    configFiles: [/^remix\.config\.(js|ts)$/i],
    dirs: [/^app\/root\.(tsx|jsx|ts|js)$/i, /^app\/routes?\//i],
  },
  {
    framework: "sveltekit",
    configFiles: [/^svelte\.config\.(js|ts)$/i],
    dirs: [/^src\/routes\//],
  },
  {
    framework: "vite",
    configFiles: [/^vite\.config\.(js|ts)$/i],
    dirs: [/^src\//],
  },
];

export interface FrameworkInfo {
  framework: Framework;
  confidence: "high" | "medium" | "low";
  label: string;
  matchedBy?: string;
}

export function detectFramework(files: RepoFile[]): FrameworkInfo {
  const paths = files.map((f) => f.path);

  // 1. Config-file-based detection (highest confidence)
  for (const sig of FRAMEWORK_SIGNATURES) {
    for (const pattern of sig.configFiles) {
      for (const p of paths) {
        if (pattern.test(p)) {
          return {
            framework: sig.framework,
            confidence: "high",
            label: LABEL[sig.framework],
            matchedBy: p,
          };
        }
      }
    }
  }

  // 2. Directory-based detection (medium confidence)
  for (const sig of FRAMEWORK_SIGNATURES) {
    for (const dirPattern of sig.dirs) {
      for (const p of paths) {
        if (dirPattern.test(p)) {
          return {
            framework: sig.framework,
            confidence: "medium",
            label: LABEL[sig.framework],
            matchedBy: p,
          };
        }
      }
    }
  }

  return {
    framework: "unknown",
    confidence: "low",
    label: LABEL.unknown,
  };
}

export const LABEL: Record<Framework, string> = {
  nextjs: "Next.js",
  vite: "Vite",
  astro: "Astro",
  remix: "Remix",
  sveltekit: "SvelteKit",
  unknown: "Unknown framework",
};

export function hasAppRouter(framework: Framework): boolean {
  return framework === "nextjs" || framework === "remix";
}

export function frameworkPaths(framework: Framework): {
  sitemap: string | null;
  manifest: string | null;
  rootLayout: string | null;
  publicDir: string;
} {
  if (framework === "nextjs") {
    return {
      sitemap: "app/sitemap.ts",
      manifest: "app/manifest.ts",
      rootLayout: "app/layout.tsx",
      publicDir: "public",
    };
  }
  if (framework === "remix") {
    return {
      sitemap: "app/sitemap.ts",
      manifest: "app/manifest.ts",
      rootLayout: "app/root.tsx",
      publicDir: "public",
    };
  }
  if (framework === "astro") {
    return {
      sitemap: "src/pages/sitemap.xml.ts",
      manifest: null,
      rootLayout: "src/layouts/Layout.astro",
      publicDir: "public",
    };
  }
  if (framework === "vite" || framework === "sveltekit") {
    return {
      sitemap: null,
      manifest: null,
      rootLayout: "index.html",
      publicDir: "public",
    };
  }
  return {
    sitemap: null,
    manifest: null,
    rootLayout: "index.html",
    publicDir: "public",
  };
}
