/**
 * ShipReady engine — public API.
 *
 * Main entry point: `scanRepo()` which fetches a public GitHub repo,
 * runs the scanners, computes a score, and returns a `ScanResult`.
 *
 * Companion: `generateFixes()` which takes a `ScanResult` + context
 * and returns a list of `Fix` objects (file contents to write).
 *
 * For v1, all of this is synchronous-ish — no queue, no DB. The web
 * app calls these functions from an API route.
 */

import type {
  ScanResult,
  Issue,
  Fix,
  ProjectContext,
  RepoFile,
  CodebaseContext,
} from "./types";
import { parseRepoUrl, getDefaultBranch, getRepoTree, getFileContent, getFileContents } from "./github";
import { scanLegal } from "./scanners/legal";
import { scanSecretsFileNames, scanSecretsInContent } from "./scanners/secrets";
import { scanLicenseFromTree, detectLicenseFromContent, buildLicenseIssue } from "./scanners/license";
import { scanSeo } from "./scanners/seo";
import { scanErrors } from "./scanners/errors";
import { scanSecurity } from "./scanners/security";
import { scanMeta } from "./scanners/meta";
import { scanA11y } from "./scanners/a11y";
import { scanBrokenLinks } from "./scanners/broken-links";
import { calculateScore, groupByCategory, sortBySeverity } from "./score";
import { generatePrivacyPolicy } from "./generators/privacy-policy";
import { generateTerms } from "./generators/terms";
import { generateCookiePolicy } from "./generators/cookie-policy";
import { generateSitemap } from "./generators/sitemap";
import { generateRobots } from "./generators/robots";
import { generateOgTags } from "./generators/og-tags";
import { generateJsonLd } from "./generators/jsonld";
import { generateNotFound, generateErrorPage, generateGlobalError } from "./generators/error-pages";
import { generateSecurityTxt } from "./generators/security";
import { generateSecurityHeaders } from "./generators/security-headers";
import { generateGitignoreAdditions } from "./generators/gitignore-additions";
import { generateManifest } from "./generators/manifest";
import { generateRealImages } from "./generators/images";
import { generateAccessibilityStatement } from "./generators/accessibility-statement";
import { detectFramework, type Framework, type FrameworkInfo, LABEL as FRAMEWORK_LABEL } from "./framework";
import { aiEnabled } from "@/lib/ai";

// Re-exports
export * from "./types";
export { parseRepoUrl } from "./github";
export { CONTEXT_QUESTIONS, REGION_QUESTION, buildContext, deriveRules, makeContext } from "./context";
export { calculateScore, groupByCategory, sortBySeverity } from "./score";
export { computeDiff } from "./diff";
export { buildFixesZip } from "./zip";
export { generatePrivacyPolicy, generatePrivacyPolicyStatic, generateTerms, generateTermsStatic, generateCookiePolicy, generateCookiePolicyStatic, generateSitemap, generateRobots, generateOgTags, generateJsonLd, generateNotFound, generateErrorPage, generateGlobalError, generateSecurityTxt, generateSecurityHeaders, generateGitignoreAdditions, generateManifest, generateRealImages } from "./generators/index";
export { detectFramework, frameworkPaths, hasAppRouter } from "./framework";
export type { Framework, FrameworkInfo } from "./framework";
export { buildCodebaseContext } from "./codebase-context";
export type { CodebaseContext } from "./types";

export interface ScanOptions {
  /** The repo URL or "owner/name" */
  repoUrl: string;
  /** The user's context (5 answers) */
  context: ProjectContext;
  /** Optional: project name (defaults to repo name) */
  projectName?: string;
  /**
   * Optional: user-confirmed framework. When provided and not "unknown",
   * this overrides auto-detection. Auto-detection is used as the fallback
   * for backwards compatibility (e.g. when the scan is triggered from
   * the public badge endpoint or /report without going through onboarding).
   */
  framework?: Framework;
}

/**
 * Scan a public GitHub repo.
 *
 * Throws GitHubError on API failures, or a generic Error for invalid URLs.
 */
export async function scanRepo(opts: ScanOptions): Promise<ScanResult> {
  const start = Date.now();
  const parsed = parseRepoUrl(opts.repoUrl);
  if (!parsed.isValid) {
    throw new Error(`Invalid GitHub URL: "${opts.repoUrl}". Use format: github.com/owner/repo`);
  }

  const { owner, name } = parsed;
  const branch = await getDefaultBranch(owner, name);
  const tree = await getRepoTree(owner, name, branch);

  // Detect framework (fast — no API calls)
  // If the user provided a framework override via onboarding, prefer that.
  // Auto-detection is still useful for `matchedBy` and as a fallback when
  // the override is "unknown" (i.e. the user said "not sure").
  const detected = detectFramework(tree.files);
  const frameworkInfo: FrameworkInfo =
    opts.framework && opts.framework !== "unknown"
      ? { ...detected, framework: opts.framework, label: FRAMEWORK_LABEL[opts.framework], confidence: "high", matchedBy: "user override" }
      : detected;

  // Run scanners in parallel
  const legal = scanLegal(tree.files);
  const secrets = scanSecretsFileNames(tree.files);
  const licenseTree = scanLicenseFromTree(tree.files);

  // For license content detection, fetch the file (if it exists)
  let licenseContent: string | null = null;
  if (licenseTree.file) {
    licenseContent = await getFileContent(owner, name, branch, licenseTree.file);
  }
  const licenseDetected = licenseContent ? detectLicenseFromContent(licenseContent) : null;
  const licenseIssue = buildLicenseIssue(licenseTree.hasLicenseFile, licenseDetected, licenseTree.file);

  // For secrets, also scan a few high-risk files we should fetch anyway
  // (package.json, next.config.*, .gitignore, README)
  const filesToInspect = pickFilesToInspect(tree.files);
  const contents = await getFileContents(owner, name, branch, filesToInspect);
  const contentIssues: Issue[] = [];
  for (const [path, content] of contents) {
    if (!content) continue;
    const flagged = scanSecretsInContent(path, content);
    for (const flag of flagged) {
      contentIssues.push({
        id: `secret-${flag.pattern.toLowerCase().replace(/\s+/g, "-")}`,
        category: "secrets",
        title: `${flag.pattern} committed in ${path}`,
        description:
          `A pattern matching "${flag.pattern}" was found at line ${flag.line}. Review and remove this from your git history (consider using \`git filter-repo\` or BFG). Rotate the key immediately — once it's in git history, assume it's compromised.`,
        severity: "critical",
        status: "warning",
        file: path,
        line: flag.line,
      });
    }
  }

  // SEO scanner (depends on framework + layout file contents)
  const seo = scanSeo({ files: tree.files, contents, framework: frameworkInfo.framework });
  // Errors scanner
  const errors = scanErrors({ files: tree.files, framework: frameworkInfo.framework });
  // Security scanner
  const security = scanSecurity({ files: tree.files, contents, framework: frameworkInfo.framework });
  // Meta scanner
  const meta = scanMeta({ files: tree.files, contents, framework: frameworkInfo.framework });
  // A11y scanner (no auto-fix — just flag issues)
  const a11y = scanA11y({ contents, framework: frameworkInfo.framework });
  // Broken links scanner (no auto-fix — just flag issues)
  const brokenLinks = scanBrokenLinks({ files: tree.files, contents, maxFiles: 20 });

  // Combine all issues
  const allIssues: Issue[] = [
    ...legal.issues,
    ...secrets.issues,
    ...contentIssues,
    licenseIssue,
    ...seo,
    ...errors,
    ...security,
    ...meta,
    ...a11y,
    ...brokenLinks,
  ];

  // Sort and score
  const sorted = sortBySeverity(allIssues);
  const score = calculateScore(sorted);

  return {
    id: cryptoRandomId(),
    repo: {
      owner,
      name,
      defaultBranch: branch,
      commitSha: tree.commitSha,
      fileCount: tree.files.filter((f) => f.type === "file").length,
      framework: frameworkInfo.framework,
      frameworkConfidence: frameworkInfo.confidence,
    },
    context: opts.context,
    issues: sorted,
    score,
    scannedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
    aiEnabled,
  };
}

export interface GenerateFixesOptions {
  scan: ScanResult;
  projectName?: string;
  contactEmail?: string;
  /** Site URL (e.g. https://myapp.com) — used by SEO generators */
  siteUrl?: string;
  /** Short description of the project — used by OG/JSON-LD generators */
  description?: string;
  /** Optional Twitter handle */
  twitterHandle?: string;
  /** Optional: AI-curated codebase context. When provided (and AI is enabled),
   *  the policy generators will use it to draft a tailored document instead
   *  of the static template. */
  codebase?: CodebaseContext;
}

/**
 * Generate fixes for a scan result.
 * Only generates fixes for issues that are "missing" or "warning" — skips
 * items that are already present.
 *
 * Async because the policy generators (privacy/terms/cookies) may call the
 * LLM when a codebase context is provided and AI is enabled. Non-AI fixes
 * (SEO, error pages, license, etc.) remain effectively synchronous; we use
 * `await` uniformly so callers don't need to reason about which path is hot.
 *
 * Returns a list of Fix objects with file paths and contents.
 */
export async function generateFixes(opts: GenerateFixesOptions): Promise<Fix[]> {
  const scan = opts.scan;
  const ctx = scan.context;
  const projectName = opts.projectName || scan.repo.name;
  const contactEmail = opts.contactEmail || `hello@${scan.repo.name.toLowerCase()}.com`;
  const fixes: Fix[] = [];

  for (const issue of scan.issues) {
    if (issue.status === "present") continue;

    if (issue.id === "missing-privacy-policy") {
      const content = await generatePrivacyPolicy({
        context: ctx,
        projectName,
        contactEmail,
        codebase: opts.codebase,
      });
      fixes.push({
        path: "PRIVACY.md",
        content,
        description: opts.codebase
          ? "Privacy policy tailored to your repo (AI-generated)"
          : "Privacy policy tailored to your business type and jurisdiction",
        issueId: issue.id,
        isNew: true,
        generationMode: opts.codebase && aiEnabled ? "ai" : "static",
      });
    }

    if (issue.id === "missing-terms") {
      const content = await generateTerms({
        context: ctx,
        projectName,
        contactEmail,
        codebase: opts.codebase,
      });
      fixes.push({
        path: "TERMS.md",
        content,
        description: opts.codebase
          ? "Terms of service tailored to your repo (AI-generated)"
          : "Terms of service with payment, IP, and liability clauses",
        issueId: issue.id,
        isNew: true,
        generationMode: opts.codebase && aiEnabled ? "ai" : "static",
      });
    }

    if (issue.id === "missing-cookie-policy" && ctx.usesCookies) {
      const content = await generateCookiePolicy({
        context: ctx,
        projectName,
        contactEmail,
        codebase: opts.codebase,
      });
      fixes.push({
        path: "COOKIES.md",
        content,
        description: opts.codebase
          ? "Cookie policy tailored to your repo (AI-generated)"
          : "Cookie policy with categories and opt-out instructions",
        issueId: issue.id,
        isNew: true,
        generationMode: opts.codebase && aiEnabled ? "ai" : "static",
      });
    }

    if (issue.id === "env-file-in-repo") {
      // We don't auto-generate a .env file. We just suggest a .gitignore fix.
      // The .gitignore generator would be a separate concern. For v1, we
      // surface this as a finding but don't auto-fix.
      fixes.push({
        path: ".gitignore.additions",
        content: `# Add these to your .gitignore\n.env\n.env.local\n.env.*.local\n*.pem\n*.key\n*.p12\n`,
        description: "Lines to append to your .gitignore",
        issueId: issue.id,
        isNew: true,
      });
    }

    if (issue.id === "missing-license") {
      fixes.push({
        path: "LICENSE",
        content: MIT_LICENSE_TEMPLATE(projectName, new Date().getFullYear().toString()),
        description: "MIT License — permissive, widely used, lets anyone use your code",
        issueId: issue.id,
        isNew: true,
      });
    }

    // SEO fixes
    if (issue.id === "missing-sitemap") {
      const siteUrl = opts.siteUrl || `https://${scan.repo.name.toLowerCase()}.com`;
      const { path, content } = generateSitemap({
        framework: scan.repo.framework,
        siteUrl,
        projectName,
        pages: opts.codebase?.pages,
      });
      fixes.push({
        path,
        content,
        description: "Sitemap — submit to Google Search Console after deploying",
        issueId: issue.id,
        isNew: true,
      });
    }

    if (issue.id === "missing-robots-txt") {
      const siteUrl = opts.siteUrl || `https://${scan.repo.name.toLowerCase()}.com`;
      const { path, content } = generateRobots({
        framework: scan.repo.framework,
        siteUrl,
        pages: opts.codebase?.pages,
      });
      fixes.push({
        path,
        content,
        description: "robots.txt — controls which URLs search engines can crawl",
        issueId: issue.id,
        isNew: true,
      });
    }

    if (issue.id === "missing-og-tags" || issue.id === "missing-meta-description" || issue.id === "missing-canonical") {
      const siteUrl = opts.siteUrl || opts.codebase?.siteUrl || `https://${scan.repo.name.toLowerCase()}.com`;
      const description = opts.description || opts.codebase?.description || `${projectName} — a modern web app built with care.`;
      const { path, content } = await generateOgTags({
        framework: scan.repo.framework,
        projectName,
        description,
        siteUrl,
        twitterHandle: opts.twitterHandle,
        codebase: opts.codebase,
      });
      fixes.push({
        path,
        content,
        description: "Open Graph + meta tags for social sharing and SEO",
        issueId: issue.id,
        isNew: true,
      });
    }

    if (issue.id === "missing-not-found") {
      const { path, content } = generateNotFound({ projectName, framework: scan.repo.framework });
      fixes.push({
        path,
        content,
        description: "Custom 404 page — keeps users on your site with helpful links",
        issueId: issue.id,
        isNew: true,
      });
    }

    if (issue.id === "missing-error-page") {
      const result = generateErrorPage({ projectName, framework: scan.repo.framework });
      if (result) {
        fixes.push({
          path: result.path,
          content: result.content,
          description: "Error boundary — catches unhandled exceptions in route segments",
          issueId: issue.id,
          isNew: true,
        });
      }
    }

    // A11y statement — generated once if ANY a11y issue is missing
    if (issue.id === "missing-html-lang" || issue.id === "images-without-alt" || issue.id === "buttons-without-label" || issue.id === "inputs-without-label") {
      const alreadyAdded = fixes.some((f) => f.path === "ACCESSIBILITY.md");
      if (!alreadyAdded) {
        const { path, content } = generateAccessibilityStatement({
          projectName,
          contactEmail,
        });
        fixes.push({
          path,
          content,
          description: "Accessibility statement — public commitment to WCAG conformance",
          issueId: issue.id,
          isNew: true,
        });
      }
    }

    if (issue.id === "missing-manifest") {
      const { path, content } = generateManifest({
        framework: scan.repo.framework,
        projectName,
        description: opts.description || opts.codebase?.description || `${projectName} — a modern web app.`,
        codebase: opts.codebase,
      });
      fixes.push({
        path,
        content,
        description: "Web app manifest — makes your site installable as a PWA",
        issueId: issue.id,
        isNew: true,
      });
    }

    if (issue.id === "missing-favicon" || issue.id === "missing-og-image") {
      // Generate all 5 real images when either favicon or OG image is missing
      const images = await generateRealImages({
        projectName,
        brandColor: opts.projectName ? undefined : undefined, // Let it derive from name
        codebase: opts.codebase,
      });
      // Add each generated image as a separate fix
      for (const img of images) {
        fixes.push({
          path: img.path,
          content: img.content,
          description: img.description,
          issueId: issue.id, // reuse the same issue ID
          isNew: true,
        });
      }
      // Continue to avoid adding the placeholder below
      continue;
    }

    if (issue.id === "missing-security-txt") {
      const { path, content } = generateSecurityTxt({
        projectName,
        contactEmail,
      });
      fixes.push({
        path,
        content,
        description: "security.txt — how security researchers contact you (RFC 9116)",
        issueId: issue.id,
        isNew: true,
      });
    }

    if (
      issue.id === "missing-csp" ||
      issue.id === "missing-hsts" ||
      issue.id === "missing-x-frame-options" ||
      issue.id === "missing-referrer-policy" ||
      issue.id === "missing-permissions-policy" ||
      issue.id === "missing-x-content-type-options"
    ) {
      // We only generate the full headers block once, even if multiple are missing
      const alreadyAdded = fixes.some((f) => f.path === "next.config.headers.ts" || f.path === "SECURITY-HEADERS.md");
      if (!alreadyAdded) {
        const { path, content } = generateSecurityHeaders({
          framework: scan.repo.framework,
          usesPayments: ctx.processesPayments,
          projectName,
        });
        fixes.push({
          path,
          content,
          description: "Security headers — CSP, HSTS, X-Frame-Options, etc. (merge into your config)",
          issueId: issue.id,
          isNew: true,
        });
      }
    }

    if (issue.id === "incomplete-gitignore" || issue.id === "missing-gitignore") {
      // Parse the missing entries from the issue description (best-effort)
      const missingMatch = issue.description.match(/missing: ([^.]+)/);
      const missing = missingMatch
        ? missingMatch[1].split(",").map((s) => s.trim())
        : [".env", "node_modules", ".next", "dist", "build"];
      const { path, content } = generateGitignoreAdditions({
        requested: missing,
      });
    }

    if (issue.id === "missing-global-error") {
      const result = generateGlobalError({ projectName, framework: scan.repo.framework });
      if (result) {
        fixes.push({
          path: result.path,
          content: result.content,
          description: "Global error handler — last line of defense for root layout errors",
          issueId: issue.id,
          isNew: true,
        });
      }
    }

    if (issue.id === "missing-jsonld") {
      const siteUrl = opts.siteUrl || opts.codebase?.siteUrl || `https://${scan.repo.name.toLowerCase()}.com`;
      const description = opts.description || opts.codebase?.description || `${projectName} — a modern web app built with care.`;
      const { path, content } = await generateJsonLd({
        framework: scan.repo.framework,
        projectName,
        description,
        siteUrl,
        contactEmail,
        codebase: opts.codebase,
      });
      fixes.push({
        path,
        content,
        description: "JSON-LD Organization schema for Google rich results",
        issueId: issue.id,
        isNew: true,
      });
    }
  }

  return fixes;
}

/**
 * Pick which files we should fetch for secret scanning.
 * We grab common config files plus anything in public/.
 * Cap at 20 files to stay under rate limits.
 */
function pickFilesToInspect(files: RepoFile[]): string[] {
  const candidates = files.filter((f) => {
    if (f.type !== "file") return false;
    const path = f.path;
    // Skip node_modules, .git, dist, build, etc.
    if (/^(\.git|node_modules|dist|build|\.next|out|coverage)\//.test(path)) return false;
    if (path.includes("/.")) return false; // hidden dirs
    if (f.size && f.size > 100_000) return false; // skip > 100KB

    // Common config files
    if (/^(package\.json|\.env|\.env\.example|next\.config\.|nuxt\.config\.|vite\.config\.|astro\.config\.|svelte\.config\.|remix\.config\.|tsconfig\.json|tailwind\.config\.)/.test(path)) {
      return true;
    }
    // App router files (Next.js / Remix) - SEO, Meta, Errors depend on layout
    if (/^app\/(layout|root|page|sitemap|robots|manifest|error|not-found|global-error)\.(tsx?|jsx?)$/i.test(path)) return true;
    // Static HTML
    if (/^(public\/)?index\.html$/i.test(path)) return true;
    // Files in public/ folder
    if (path.startsWith("public/")) return true;
    // README and similar
    if (/^(README|readme)\.(md|txt)$/.test(path)) return true;
    return false;
  });

  return candidates.slice(0, 20).map((f) => f.path);
}

function cryptoRandomId(): string {
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

function MIT_LICENSE_TEMPLATE(name: string, year: string): string {
  return `MIT License

Copyright (c) ${year} ${name}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}
