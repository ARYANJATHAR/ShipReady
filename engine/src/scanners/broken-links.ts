/**
 * Broken links scanner.
 *
 * Detects broken internal references in source files:
 *   - Image `src` pointing to a local file that doesn't exist
 *   - Anchor links (`href="#..."`) without a matching `id` on the page
 *   - Relative links to non-existent files
 *
 * We DO NOT fetch external links (that would burn through GitHub's
 * rate limit) and we DO NOT auto-fix (broken links usually need human
 * judgment: do you update the link, or create the missing file?).
 *
 * Severity: 🟡 recommended — broken links are a usability issue and
 * a soft SEO penalty. Google Search Console flags them.
 */

import type { Issue, RepoFile } from "../types";

export interface BrokenLinksScanInput {
  files: RepoFile[];
  contents: Map<string, string | null>;
  /** Cap on files to inspect — broken-link scanning is O(files * refs) */
  maxFiles?: number;
}

interface BrokenLink {
  type: "missing-image" | "missing-anchor" | "missing-page";
  /** The file where the broken reference is */
  sourceFile: string;
  /** The broken target (path, #anchor, or href) */
  target: string;
  /** Line number (best effort) */
  line?: number;
}

const SCAN_FILE_PATTERNS = /\.(tsx?|jsx?|mdx?|md|html)$/i;
const IMAGE_SRC_REGEX = /(?:src|href)\s*=\s*["']([^"']+)["']/g;
const ANCHOR_REGEX = /href\s*=\s*["']#([a-zA-Z][\w-]*)["']/g;

export function scanBrokenLinks(input: BrokenLinksScanInput): Issue[] {
  const maxFiles = input.maxFiles ?? 20;
  const filePaths = new Set(input.files.filter((f) => f.type === "file").map((f) => f.path));
  const broken: BrokenLink[] = [];

  // Limit how many files we scan
  const filesToScan = Array.from(input.contents.entries())
    .filter(([path, content]) => content && SCAN_FILE_PATTERNS.test(path))
    .slice(0, maxFiles);

  for (const [path, content] of filesToScan) {
    if (!content) continue;
    const dir = path.includes("/") ? path.replace(/\/[^/]+$/, "/") : "";

    // 1. Check local image src / href
    IMAGE_SRC_REGEX.lastIndex = 0;
    let match;
    while ((match = IMAGE_SRC_REGEX.exec(content)) !== null) {
      const ref = match[1];
      // Skip external links and data URIs
      if (ref.startsWith("http://") || ref.startsWith("https://") || ref.startsWith("data:") || ref.startsWith("//")) continue;
      // Skip placeholder values like {logo.src} or process.env
      if (ref.includes("{") || ref.startsWith("$")) continue;
      // Strip query string and hash
      const cleanRef = ref.split("?")[0].split("#")[0];
      if (!cleanRef) continue;
      // Skip Next.js /public paths that we know might be auto-generated
      if (cleanRef === "/favicon.ico" || cleanRef === "/og-image.png" || cleanRef === "/opengraph-image") continue;

      // Resolve the path relative to the source file
      const resolved = resolvePath(dir, cleanRef);
      if (!filePaths.has(resolved)) {
        broken.push({
          type: "missing-image",
          sourceFile: path,
          target: ref,
          line: lineNumberAt(content, match.index),
        });
      }
    }

    // 2. Check anchor links (href="#anchor") — without page context,
    //    we can only flag them as "untestable" if we don't know what's
    //    on the page. Skip for now — this requires fetching rendered pages.
  }

  if (broken.length === 0) {
    return [
      {
        id: "no-broken-links",
        category: "broken-links",
        title: "No broken links found",
        description:
          "All local image references and file paths in the files we scanned resolve to existing files.",
        severity: "optional",
        status: "present",
      },
    ];
  }

  // Group by source file for the issue description
  const grouped = new Map<string, BrokenLink[]>();
  for (const link of broken) {
    if (!grouped.has(link.sourceFile)) grouped.set(link.sourceFile, []);
    grouped.get(link.sourceFile)!.push(link);
  }

  const fileList = Array.from(grouped.entries())
    .slice(0, 10)
    .map(([file, links]) => `  - \`${file}\`: ${links.map((l) => l.target).join(", ")}`)
    .join("\n");

  const moreCount = grouped.size > 10 ? grouped.size - 10 : 0;
  const moreNote = moreCount > 0 ? `\n  ...and ${moreCount} more files` : "";

  return [
    {
      id: "broken-links-found",
      category: "broken-links",
      title: `${broken.length} broken link${broken.length === 1 ? "" : "s"} found`,
      description:
        `Broken links frustrate users, hurt SEO, and make your site look abandoned. Found ${broken.length} references to local files that don't exist:\n\n${fileList}${moreNote}\n\nFix by either creating the missing files or updating the references.`,
      severity: "recommended",
      status: "warning",
    },
  ];
}

function resolvePath(base: string, ref: string): string {
  // If ref is absolute (starts with /), strip the leading /
  if (ref.startsWith("/")) {
    return ref.slice(1);
  }
  // Otherwise, resolve relative to the base directory
  const parts = (base + ref).split("/");
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      resolved.pop();
      continue;
    }
    resolved.push(part);
  }
  return resolved.join("/");
}

function lineNumberAt(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}
