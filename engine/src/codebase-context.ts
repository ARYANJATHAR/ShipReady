/**
 * Codebase context — curated, AI-ready snapshot of a repo.
 *
 * This is the foundation for all the AI-powered generators (commit 3+).
 * Instead of asking the user 5 questions, we read the repo, extract what
 * we can, and let the LLM fill in the rest based on actual project info.
 *
 * The function is deliberately generous with fallbacks — every inferred
 * field has a safe default so callers never crash on weird repos.
 *
 * Cost: a single tree fetch + ~5-10 file fetches per scan, all under
 * 50KB total content. On a warm cache: 0 GitHub calls.
 */

import {
  parseRepoUrl,
  getDefaultBranch,
  getRepoTree,
  getFileContents,
} from "./github";
import { detectFramework } from "./framework";
import type { CodebaseContext, RepoFile } from "./types";

/** Hard cap on total content we'll fetch, in characters. */
const MAX_TOTAL_CONTENT_CHARS = 50_000;

/** Per-file char caps. Anything longer is truncated. */
const CAPS = {
  readme: 2000,
  policy: 500,
  layout: 1500,
  packageJson: 2000,
  index: 1000,
  ci: 200,
};

/** Files we always try to read (ordered by priority). */
const HIGH_SIGNAL_PATHS = [
  // README
  "README.md",
  "readme.md",
  "README.markdown",
  "README.txt",
  "README",

  // Package files
  "package.json",
  "pnpm-workspace.yaml",
  "yarn.lock",
  "pnpm-lock.yaml",
  "package-lock.json",
  "bun.lockb",

  // Config
  "tsconfig.json",
  "tailwind.config.js",
  "tailwind.config.ts",
  "tailwind.config.mjs",

  // App entry points (framework-aware)
  "app/layout.tsx",
  "app/layout.jsx",
  "app/layout.ts",
  "app/layout.js",
  "src/app/layout.tsx",
  "src/app/layout.jsx",
  "app/root.tsx", // Remix
  "src/layouts/Layout.astro", // Astro
  "index.html", // Vite/SvelteKit
  "public/index.html",
  "src/index.html",
  "app/page.tsx",
  "app/page.jsx",
  "src/pages/index.astro",
  "src/routes/+page.svelte", // SvelteKit
  "src/App.tsx",
  "src/App.jsx",
  "src/main.tsx",
  "src/main.jsx",

  // Existing legal
  "PRIVACY.md",
  "privacy.md",
  "TERMS.md",
  "terms.md",
  "COOKIES.md",
  "cookies.md",
  "LICENSE",
  "LICENSE.md",

  // Site URL hints
  "CNAME",
  "vercel.json",
  "netlify.toml",
];

/** Path patterns to use for route discovery (just need the path, no content). */
const ROUTE_PATTERNS: Array<{ pattern: RegExp; extract: (p: string) => string | null }> = [
  // Next.js App Router: app/(group)/path/page.tsx
  { pattern: /^(?:src\/)?app\/(.*?)\/page\.(tsx?|jsx?|mdx?)$/, extract: (p) => "/" + p.match(/^(?:src\/)?app\/(.*?)\/page\./)?.[1]?.replace(/^\(.*?\)\//, "") },
  // Next.js Pages Router: pages/path.tsx
  { pattern: /^(?:src\/)?pages\/(.*?)\.(tsx?|jsx?|mdx?)$/, extract: (p) => "/" + p.match(/^(?:src\/)?pages\/(.*?)\./)?.[1]?.replace(/^index$/, "") },
  // Astro: src/pages/path.astro
  { pattern: /^src\/pages\/(.*?)\.astro$/, extract: (p) => "/" + p.match(/^src\/pages\/(.*?)\.astro$/)?.[1]?.replace(/^index$/, "") },
  // SvelteKit: src/routes/path/+page.svelte
  { pattern: /^src\/routes\/(.*?)\/\+page\.svelte$/, extract: (p) => "/" + p.match(/^src\/routes\/(.*?)\/\+page\.svelte$/)?.[1] },
  // Remix v2: app/routes/path.tsx
  { pattern: /^app\/routes\/(.*?)\.(tsx?|jsx?)$/, extract: (p) => "/" + p.match(/^app\/routes\/(.*?)\./)?.[1]?.replace(/^_index$/, "").replace(/\$/g, ":") },
];

/** Build the full CodebaseContext for a repo. */
export async function buildCodebaseContext(repoUrl: string): Promise<CodebaseContext> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed.isValid) {
    throw new Error(`Invalid GitHub URL: "${repoUrl}"`);
  }
  const { owner, name } = parsed;

  const branch = await getDefaultBranch(owner, name);
  const tree = await getRepoTree(owner, name, branch);
  const treeFiles = tree.files;

  // Pick the high-signal files that actually exist in the tree
  const existingPaths = new Set(treeFiles.map((f) => f.path));
  const toRead = HIGH_SIGNAL_PATHS.filter((p) => existingPaths.has(p));

  // Cap how many we fetch — keep it cheap
  const TRACKED = 15;
  const pathsToFetch = toRead.slice(0, TRACKED);

  const contents = await getFileContents(owner, name, branch, pathsToFetch);

  // Detect framework
  const frameworkInfo = detectFramework(treeFiles);

  // 1. Project name
  const pkgRaw = contents.get("package.json");
  const pkg = pkgRaw ? safeJson(pkgRaw) : null;
  const rawName =
    typeof pkg?.name === "string" ? pkg.name.replace(/^@.*\//, "").trim() : "";
  // Monorepos often have name = "root" — treat that as missing.
  const projectName = rawName && rawName.toLowerCase() !== "root" ? rawName : name;
  const projectDisplayName = titleCase(projectName);

  // 2. Description
  const description = inferDescription(pkg, contents, treeFiles);

  // 3. Contact email
  const contactEmail = inferContactEmail(pkg, contents);

  // 4. Brand color
  const brandColor = inferBrandColor(contents, projectName);

  // 5. Site URL
  const siteUrl = inferSiteUrl(pkg, contents, name);

  // 6. Region
  const region = inferRegion(siteUrl, contents);

  // 7. Existing copy
  const existingCopy = collectExistingCopy(contents, CAPS, MAX_TOTAL_CONTENT_CHARS);

  // 8. Route inventory (no file content fetched — derived from paths)
  const pages = inferPages(treeFiles);

  // 9. Components
  const components = inferComponents(treeFiles);

  // 10. Package manager
  const packageManager = inferPackageManager(treeFiles);

  // 11. Has tests / CI
  const hasTests = treeFiles.some((f) =>
    /(^|\/)(__tests__|tests?|spec)\//i.test(f.path) ||
    /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(f.path)
  );
  const hasCI = treeFiles.some((f) => f.path.startsWith(".github/workflows/"));

  // 12. Sources (which files we used)
  const sources = {
    readme: pickFirstExisting(contents, [
      "README.md",
      "readme.md",
      "README.markdown",
      "README.txt",
      "README",
    ]),
    packageJson: contents.get("package.json") ? "package.json" : null,
    layout: pickFirstExisting(contents, [
      "app/layout.tsx",
      "app/layout.jsx",
      "app/layout.ts",
      "app/layout.js",
      "src/app/layout.tsx",
      "src/app/layout.jsx",
      "app/root.tsx",
      "src/layouts/Layout.astro",
      "index.html",
      "public/index.html",
      "src/index.html",
    ]),
  };

  return {
    repoOwner: owner,
    repoName: name,
    repoUrl: `https://github.com/${owner}/${name}`,
    defaultBranch: branch,
    commitSha: tree.commitSha,
    projectName,
    projectDisplayName,
    description,
    contactEmail,
    brandColor,
    siteUrl,
    region,
    existingCopy,
    pages,
    components,
    packageManager,
    hasTests,
    hasCI,
    framework: frameworkInfo.framework,
    sources,
    builtAt: new Date().toISOString(),
  };
}

/* ─────────────────────────────────────────────────────────────────────
 * Field extractors — each is a small pure function with safe fallbacks.
 * ────────────────────────────────────────────────────────────────────── */

function safeJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function titleCase(s: string): string {
  if (!s) return s;
  return s
    .replace(/[-_]+/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function inferDescription(
  pkg: Record<string, unknown> | null,
  contents: Map<string, string | null>,
  files: RepoFile[]
): string {
  if (pkg && typeof pkg.description === "string" && pkg.description.trim()) {
    return pkg.description.trim();
  }
  // Try README first non-heading, non-code paragraph
  const readmePath = pickFirstExisting(contents, [
    "README.md",
    "readme.md",
    "README.markdown",
    "README.txt",
    "README",
  ]);
  if (readmePath) {
    const readme = contents.get(readmePath) ?? "";
    const candidate = pickDescriptionParagraph(readme);
    if (candidate) return candidate;
  }
  // Fall back to repo name as a stub
  return files.length > 0 ? "A modern web project." : "";
}

/**
 * Pick the first paragraph from a README that reads like a real
 * project description. We skip headings, badges, code blocks, install
 * commands, and links-only lines.
 */
function pickDescriptionParagraph(readme: string): string | null {
  const blocks = readme.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  for (const block of blocks) {
    // Skip headings
    if (block.startsWith("#")) continue;
    // Skip badge-only / image-only lines
    if (/^!\[/.test(block) || /^<img\b/i.test(block)) continue;
    // Skip code blocks
    if (block.startsWith("```")) continue;
    // Skip install commands (lines starting with $, npm, pnpm, yarn, npx, git, cd)
    if (/^(\$|npm|pnpm|yarn|npx|bun|git|cd|pip|cargo|go install)\b/m.test(block)) continue;
    // Skip pure-link lines
    if (/^\[.+?\]\(.+?\)$/.test(block)) continue;
    // Must be substantive but not a wall of text
    if (block.length < 20 || block.length > 500) continue;
    // Must contain actual words (not just punctuation/symbols)
    const letters = block.replace(/[^a-zA-Z]/g, "").length;
    if (letters < 15) continue;
    // Found one — collapse to a single line for storage
    return stripHtml(block).replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
  }
  return null;
}

function inferContactEmail(
  pkg: Record<string, unknown> | null,
  contents: Map<string, string | null>
): string {
  // 1. Existing policies
  for (const p of ["PRIVACY.md", "privacy.md", "TERMS.md", "terms.md"]) {
    const c = contents.get(p);
    if (!c) continue;
    const m = c.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    if (m) return m[0];
  }
  // 2. package.json author
  if (pkg) {
    const author = pkg.author;
    if (typeof author === "string") {
      const m = author.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
      if (m) return m[0];
    } else if (author && typeof author === "object") {
      const email = (author as Record<string, unknown>).email;
      if (typeof email === "string") return email;
    }
  }
  // 3. README
  for (const p of ["README.md", "readme.md"]) {
    const c = contents.get(p);
    if (!c) continue;
    const m = c.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    if (m) return m[0];
  }
  // 4. Fallback — use repo name
  return "";
}

function inferBrandColor(
  contents: Map<string, string | null>,
  projectName: string
): string {
  // 1. tailwind.config.{js,ts,mjs} — look for primary/accent colors
  for (const p of ["tailwind.config.js", "tailwind.config.ts", "tailwind.config.mjs"]) {
    const c = contents.get(p);
    if (!c) continue;
    const m =
      c.match(/(?:primary|accent|brand)[^a-z]*['"]#([0-9a-fA-F]{3,8})['"]/i) ||
      c.match(/colors:\s*\{[^}]*?['"]?(?:primary|accent|brand)['"]?\s*:\s*['"]#([0-9a-fA-F]{3,8})['"]/i);
    if (m) return "#" + m[1].slice(0, 6);
  }
  // 2. Look for hex color literals in the layout / index
  for (const p of [
    "app/layout.tsx",
    "app/layout.jsx",
    "app/page.tsx",
    "src/pages/index.astro",
    "index.html",
    "public/index.html",
  ]) {
    const c = contents.get(p);
    if (!c) continue;
    const m = c.match(/#[0-9a-fA-F]{6}\b/);
    if (m) return m[0].toLowerCase();
  }
  // 3. Deterministic fallback from project name hash → a tasteful HSL color
  return nameToBrandColor(projectName);
}

function nameToBrandColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(h) % 360;
  // HSL → hex. 60% saturation, 55% lightness — punchy but readable.
  return hslToHex(hue, 0.6, 0.55);
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 1;
  l /= 1;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(255 * f(x))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(0)}${toHex(8)}${toHex(4)}`;
}

function inferSiteUrl(
  pkg: Record<string, unknown> | null,
  contents: Map<string, string | null>,
  repoName: string
): string {
  // 1. package.json homepage
  if (pkg && typeof pkg.homepage === "string" && pkg.homepage.startsWith("http")) {
    return pkg.homepage.replace(/\/$/, "");
  }
  // 2. CNAME
  const cname = contents.get("CNAME");
  if (cname) {
    const trimmed = cname.trim();
    if (trimmed && !trimmed.includes(" ")) {
      return `https://${trimmed}`;
    }
  }
  // 3. vercel.json project name as a hint? Skip — too unreliable.
  // 4. Fallback: constructed
  return `https://${repoName.toLowerCase()}.com`;
}

function inferRegion(
  siteUrl: string,
  contents: Map<string, string | null>
): CodebaseContext["region"] {
  const tld = siteUrl.match(/\.([a-z]{2,3})(\/|$)/i)?.[1]?.toLowerCase();
  if (tld === "eu") return "eu";
  if (tld === "uk") return "uk";
  if (tld === "ca") return "ca";
  if (tld === "au" || tld === "nz") return "au";
  if (tld === "com" || tld === "io" || tld === "dev" || tld === "app" || tld === "net" || tld === "org") {
    // Could still be EU — try to find a currency or locale in the README
    for (const p of ["README.md", "readme.md"]) {
      const c = contents.get(p);
      if (!c) continue;
      if (/\b(GDPR|EU|Europe|EU users|EU customers)\b/i.test(c)) return "eu";
      if (/\b(UK|British|United Kingdom)\b/i.test(c)) return "uk";
    }
    return "us";
  }
  return "global";
}

function collectExistingCopy(
  contents: Map<string, string | null>,
  caps: typeof CAPS,
  totalCap: number
): CodebaseContext["existingCopy"] {
  const readme = pickFirstExisting(contents, [
    "README.md",
    "readme.md",
    "README.markdown",
    "README.txt",
    "README",
  ]);
  const readmeSnippet = readme
    ? truncate(contents.get(readme) ?? "", caps.readme)
    : "";

  const policyPaths = [
    "PRIVACY.md",
    "privacy.md",
    "TERMS.md",
    "terms.md",
    "COOKIES.md",
    "cookies.md",
  ];
  const existingPolicies: Record<string, string> = {};
  let total = readmeSnippet.length;
  for (const p of policyPaths) {
    if (total >= totalCap) break;
    const c = contents.get(p);
    if (!c) continue;
    const snippet = truncate(c, caps.policy);
    existingPolicies[p] = snippet;
    total += snippet.length;
  }

  return { readmeSnippet, existingPolicies };
}

function inferPages(files: RepoFile[]): string[] {
  const pages = new Set<string>();
  for (const f of files) {
    if (f.type !== "file") continue;
    for (const { pattern, extract } of ROUTE_PATTERNS) {
      if (pattern.test(f.path)) {
        const route = extract(f.path);
        if (route !== null) {
          pages.add(normalizeRoute(route));
        }
      }
    }
  }
  // Always include root if not already
  pages.add("/");
  return Array.from(pages).sort(routeCompare);
}

function normalizeRoute(route: string): string {
  return route.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

function routeCompare(a: string, b: string): number {
  if (a === "/") return -1;
  if (b === "/") return 1;
  return a.localeCompare(b);
}

function inferComponents(files: RepoFile[]): string[] {
  const seen = new Set<string>();
  for (const f of files) {
    if (f.type !== "file") continue;
    const m = f.path.match(/^src\/components\/([^/]+)\.(tsx?|jsx?)$/);
    if (m) seen.add(m[1]);
  }
  return Array.from(seen).sort().slice(0, 20);
}

function inferPackageManager(files: RepoFile[]): CodebaseContext["packageManager"] {
  if (files.some((f) => f.path === "pnpm-lock.yaml" || f.path === "pnpm-workspace.yaml")) return "pnpm";
  if (files.some((f) => f.path === "yarn.lock")) return "yarn";
  if (files.some((f) => f.path === "bun.lockb")) return "bun";
  return "npm";
}

function pickFirstExisting(
  contents: Map<string, string | null>,
  candidates: string[]
): string | null {
  for (const c of candidates) {
    if (contents.get(c) != null) return c;
  }
  return null;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + "…";
}

/** Strip HTML tags and decode common entities. Minimal — just for README snippets. */
function stripHtml(s: string): string {
  return s
    .replace(/<\/?[a-zA-Z][^>]*>/g, " ")  // tags
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
