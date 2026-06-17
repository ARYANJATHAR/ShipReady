/**
 * Security scanner.
 *
 * Checks for the security basics that production sites need:
 *   - security.txt (RFC 9116) — how security researchers contact you
 *   - HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
 *   - .gitignore completeness (prevents accidental secret leaks)
 *
 * Why this matters: Security headers protect against XSS, clickjacking,
 * and protocol downgrade attacks. security.txt is the standard way
 * security researchers reach you (and it boosts your HackerOne/bounty
 * program eligibility). A weak .gitignore leaks your .env file to the
 * public repo.
 *
 * Severity: 🔴 critical for missing headers (active attack surface).
 */

import type { Issue, RepoFile } from "../types";
import type { Framework } from "../framework";

export interface SecurityScanInput {
  files: RepoFile[];
  contents: Map<string, string | null>;
  framework: Framework;
}

interface SecurityHeader {
  id: string;
  name: string;
  description: string;
}

const SECURITY_HEADERS: SecurityHeader[] = [
  {
    id: "missing-csp",
    name: "Content-Security-Policy",
    description:
      "CSP tells the browser which sources of scripts, styles, and images are allowed. It's the most effective defense against XSS attacks. Without it, a single injected script can steal user sessions, deface your site, or mine crypto.",
  },
  {
    id: "missing-hsts",
    name: "Strict-Transport-Security",
    description:
      "HSTS forces browsers to use HTTPS for your domain, even if the user types 'http://'. Without it, a coffee-shop attacker can downgrade your connection and steal auth cookies in transit.",
  },
  {
    id: "missing-x-frame-options",
    name: "X-Frame-Options",
    description:
      "Prevents your site from being embedded in an <iframe> on a malicious page. Without it, attackers can build a perfect pixel-copy of your site and trick users into entering credentials.",
  },
  {
    id: "missing-referrer-policy",
    name: "Referrer-Policy",
    description:
      "Controls how much of the previous URL is sent to the next site. Without it, your internal page URLs (which may include query params with sensitive data) leak to every external link target.",
  },
  {
    id: "missing-permissions-policy",
    name: "Permissions-Policy",
    description:
      "Disables powerful browser features (camera, microphone, geolocation, payment) that your site doesn't use. Reduces attack surface — even if an attacker injects a script, the browser blocks feature access.",
  },
  {
    id: "missing-x-content-type-options",
    name: "X-Content-Type-Options",
    description:
      "Tells browsers to strictly enforce MIME types — don't let them guess that a .txt is actually a JavaScript file. Stops a class of upload-based attacks.",
  },
];

const REQUIRED_GITIGNORE_ENTRIES = [
  ".env",
  ".env.local",
  ".env.*.local",
  "node_modules",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  "*.pem",
  "*.key",
  "*.p12",
  "*.log",
  ".DS_Store",
];

export function scanSecurity(input: SecurityScanInput): Issue[] {
  const issues: Issue[] = [];
  const filePaths = new Set(input.files.filter((f) => f.type === "file").map((f) => f.path));

  // 1. security.txt
  const hasSecurityTxt =
    filePaths.has(".well-known/security.txt") ||
    filePaths.has("public/.well-known/security.txt") ||
    filePaths.has("public/security.txt");
  issues.push({
    id: "missing-security-txt",
    category: "security",
    title: hasSecurityTxt ? "security.txt present" : "Missing security.txt",
    description:
      "security.txt (RFC 9116) is a standard file at /.well-known/security.txt that tells security researchers how to contact you about vulnerabilities. Without it, researchers can't find your security email, so they often just disclose the bug publicly. Major bug bounty programs (HackerOne, Bugcrowd) require it.",
    severity: hasSecurityTxt ? "optional" : "recommended",
    status: hasSecurityTxt ? "present" : "missing",
  });

  // 2. Security headers
  // Check the relevant config file
  const configPath = pickConfigPath(input.framework, filePaths);
  const configContent = configPath ? input.contents.get(configPath) : null;

  for (const header of SECURITY_HEADERS) {
    const hasHeader = configContent
      ? checkHeaderInConfig(configContent, header.name)
      : false;
    issues.push({
      id: header.id,
      category: "security",
      title: hasHeader ? `${header.name} present` : `Missing ${header.name} header`,
      description: header.description,
      severity: hasHeader ? "optional" : "critical",
      status: hasHeader ? "present" : "missing",
      file: hasHeader ? configPath ?? undefined : configPath ?? undefined,
    });
  }

  // 3. .gitignore completeness
  const gitignore = input.contents.get(".gitignore");
  if (gitignore) {
    const missing = REQUIRED_GITIGNORE_ENTRIES.filter(
      (entry) => !new RegExp(`^${escapeRegex(entry).replace(/\\\*/g, ".*")}$`, "m").test(gitignore)
    );
    if (missing.length === 0) {
      issues.push({
        id: "gitignore-complete",
        category: "security",
        title: ".gitignore is complete",
        description: "Your .gitignore covers all the essentials (.env, node_modules, build outputs, secrets).",
        severity: "optional",
        status: "present",
        existingFile: ".gitignore",
      });
    } else {
      issues.push({
        id: "incomplete-gitignore",
        category: "security",
        title: `.gitignore missing ${missing.length} entries`,
        description: `Your .gitignore is missing: ${missing.join(", ")}. Without these, you risk committing .env files (with API keys), node_modules (huge), or build outputs.`,
        severity: "critical",
        status: "warning",
        file: ".gitignore",
      });
    }
  } else {
    issues.push({
      id: "missing-gitignore",
      category: "security",
      title: "Missing .gitignore",
      description: "A .gitignore file prevents accidentally committing .env files, node_modules, and build outputs. Without it, one wrong `git add .` can leak your entire database URL to a public repo.",
      severity: "critical",
      status: "missing",
    });
  }

  return issues;
}

function pickConfigPath(framework: Framework, filePaths: Set<string>): string | null {
  if (framework === "nextjs" || framework === "remix") {
    if (filePaths.has("next.config.ts")) return "next.config.ts";
    if (filePaths.has("next.config.js")) return "next.config.js";
    if (filePaths.has("next.config.mjs")) return "next.config.mjs";
  }
  if (framework === "astro") {
    if (filePaths.has("astro.config.mjs")) return "astro.config.mjs";
    if (filePaths.has("astro.config.ts")) return "astro.config.ts";
  }
  // Vite / unknown — use vercel.json or netlify.toml
  if (filePaths.has("vercel.json")) return "vercel.json";
  if (filePaths.has("netlify.toml")) return "netlify.toml";
  return null;
}

function checkHeaderInConfig(content: string, headerName: string): boolean {
  // Look for "Header-Name" in the config (case insensitive)
  const headerKey = headerName.split("-")[0]; // match "Content" in "Content-Security-Policy"
  return new RegExp(headerKey, "i").test(content);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
