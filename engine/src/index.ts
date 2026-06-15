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
} from "./types";
import { parseRepoUrl, getDefaultBranch, getRepoTree, getFileContent, getFileContents } from "./github";
import { scanLegal } from "./scanners/legal";
import { scanSecretsFileNames, scanSecretsInContent } from "./scanners/secrets";
import { scanLicenseFromTree, detectLicenseFromContent, buildLicenseIssue } from "./scanners/license";
import { calculateScore, groupByCategory, sortBySeverity } from "./score";
import { generatePrivacyPolicy } from "./generators/privacy-policy";
import { generateTerms } from "./generators/terms";
import { generateCookiePolicy } from "./generators/cookie-policy";

// Re-exports
export * from "./types";
export { parseRepoUrl } from "./github";
export { CONTEXT_QUESTIONS, REGION_QUESTION, buildContext, deriveRules, makeContext } from "./context";
export { calculateScore, groupByCategory, sortBySeverity } from "./score";
export { computeDiff } from "./diff";
export { buildFixesZip } from "./zip";
export { generatePrivacyPolicy, generateTerms, generateCookiePolicy } from "./generators/index";

export interface ScanOptions {
  /** The repo URL or "owner/name" */
  repoUrl: string;
  /** The user's context (5 answers) */
  context: ProjectContext;
  /** Optional: project name (defaults to repo name) */
  projectName?: string;
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

  // Combine all issues
  const allIssues: Issue[] = [
    ...legal.issues,
    ...secrets.issues,
    ...contentIssues,
    licenseIssue,
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
    },
    context: opts.context,
    issues: sorted,
    score,
    scannedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
  };
}

export interface GenerateFixesOptions {
  scan: ScanResult;
  projectName?: string;
  contactEmail?: string;
}

/**
 * Generate fixes for a scan result.
 * Only generates fixes for issues that are "missing" or "warning" — skips
 * items that are already present.
 *
 * Returns a list of Fix objects with file paths and contents.
 */
export function generateFixes(opts: GenerateFixesOptions): Fix[] {
  const scan = opts.scan;
  const ctx = scan.context;
  const projectName = opts.projectName || scan.repo.name;
  const contactEmail = opts.contactEmail || `hello@${scan.repo.name.toLowerCase()}.com`;
  const fixes: Fix[] = [];

  for (const issue of scan.issues) {
    if (issue.status === "present") continue;

    if (issue.id === "missing-privacy-policy") {
      fixes.push({
        path: "PRIVACY.md",
        content: generatePrivacyPolicy({ context: ctx, projectName, contactEmail }),
        description: "Privacy policy tailored to your business type and jurisdiction",
        issueId: issue.id,
        isNew: true,
      });
    }

    if (issue.id === "missing-terms") {
      fixes.push({
        path: "TERMS.md",
        content: generateTerms({ context: ctx, projectName, contactEmail }),
        description: "Terms of service with payment, IP, and liability clauses",
        issueId: issue.id,
        isNew: true,
      });
    }

    if (issue.id === "missing-cookie-policy" && ctx.usesCookies) {
      fixes.push({
        path: "COOKIES.md",
        content: generateCookiePolicy({ context: ctx, projectName, contactEmail }),
        description: "Cookie policy with categories and opt-out instructions",
        issueId: issue.id,
        isNew: true,
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
