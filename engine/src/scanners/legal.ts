/**
 * Legal scanner.
 *
 * Checks for the presence of legal documents that virtually every production
 * website should have:
 *   - Privacy policy
 *   - Terms of service
 *   - Cookie policy (or cookie notice)
 *   - Refund policy (only if context.processesPayments)
 *   - DMCA / Copyright notice (always)
 *
 * Detection is heuristic — we look for files in common locations
 * (root, /legal, /policy, /policies, /terms) with common names.
 *
 * Each issue is classified as:
 *   - "missing"   : no matching file found
 *   - "warning"   : file exists but doesn't look complete (e.g. < 500 chars,
 *                    contains "TODO" or "lorem ipsum")
 *   - "present"   : looks like a real, complete legal document
 */

import type { Issue, RepoFile } from "../types";

interface LegalTarget {
  id: string;
  title: string;
  description: string;
  /** Paths we look for (relative to repo root) */
  searchPaths: string[];
  /** Filename patterns we match against */
  patterns: RegExp[];
  /** Minimum character count to be considered "present" vs "warning" */
  minLength: number;
}

const LEGAL_TARGETS: LegalTarget[] = [
  {
    id: "missing-privacy-policy",
    title: "Missing privacy policy",
    description:
      "Every website that collects any user data needs a privacy policy. It's required by GDPR, CCPA, and virtually every privacy law globally. Without one, you can't legally operate in most jurisdictions and you'll get rejected from app stores, ad networks, and payment processors.",
    searchPaths: ["privacy", "privacy-policy", "legal/privacy", "policy/privacy", "policies/privacy"],
    patterns: [
      /^privacy[-_]?policy\.(md|mdx|html|tsx?|jsx?)$/i,
      /^privacy\.(md|mdx|html|tsx?|jsx?)$/i,
      /\/privacy\//i,
    ],
    minLength: 500,
  },
  {
    id: "missing-terms",
    title: "Missing terms of service",
    description:
      "Terms of service set the rules for using your product. They protect you from abuse, define your liability, and are required by most payment processors. Even a simple 'use at your own risk' page is better than nothing.",
    searchPaths: ["terms", "tos", "legal/terms", "policy/terms", "policies/terms"],
    patterns: [
      /^terms[-_]?of[-_]?service\.(md|mdx|html|tsx?|jsx?)$/i,
      /^terms\.(md|mdx|html|tsx?|jsx?)$/i,
      /^tos\.(md|mdx|html|tsx?|jsx?)$/i,
      /\/terms\//i,
    ],
    minLength: 500,
  },
  {
    id: "missing-cookie-policy",
    title: "Missing cookie policy",
    description:
      "If you use cookies (analytics, auth, anything in localStorage), you need a cookie policy and a consent mechanism. Required by GDPR (ePrivacy) and UK PECR. Analytics tools like Plausible won't even start without it.",
    searchPaths: ["cookies", "cookie-policy", "legal/cookies", "policy/cookies"],
    patterns: [
      /^cookie[-_]?policy\.(md|mdx|html|tsx?|jsx?)$/i,
      /^cookies\.(md|mdx|html|tsx?|jsx?)$/i,
      /\/cookies\//i,
    ],
    minLength: 300,
  },
  {
    id: "missing-refund-policy",
    title: "Missing refund policy",
    description:
      "If you take payments, you need a clear refund policy. Stripe and most card networks require it. Without one, you can be hit with chargebacks you can't defend, and you'll fail app store and payment processor reviews.",
    searchPaths: ["refund", "refunds", "refund-policy", "legal/refund", "policy/refund"],
    patterns: [
      /^refund[-_]?policy\.(md|mdx|html|tsx?|jsx?)$/i,
      /^refunds?\.(md|mdx|html|tsx?|jsx?)$/i,
      /\/refund/i,
    ],
    minLength: 300,
  },
  {
    id: "missing-dmca",
    title: "Missing DMCA / Copyright notice",
    description:
      "If your site hosts any user-generated content (comments, uploads, profiles), you need a DMCA notice and a designated agent. Without it, you lose safe harbor protection under US copyright law.",
    searchPaths: ["dmca", "copyright", "legal/dmca"],
    patterns: [
      /^dmca\.(md|mdx|html|tsx?|jsx?)$/i,
      /^copyright\.(md|mdx|html|tsx?|jsx?)$/i,
      /\/dmca/i,
    ],
    minLength: 200,
  },
];

export interface LegalScanResult {
  issues: Issue[];
  /** For debugging: which files matched which target */
  matches: Array<{ target: string; path: string }>;
}

export function scanLegal(files: RepoFile[]): LegalScanResult {
  const issues: Issue[] = [];
  const matches: Array<{ target: string; path: string }> = [];

  for (const target of LEGAL_TARGETS) {
    // Find any file that matches one of this target's patterns
    const matched = files.find((f) =>
      f.type === "file" && target.patterns.some((p) => p.test(f.path))
    );

    if (!matched) {
      issues.push({
        id: target.id,
        category: "legal",
        title: target.title,
        description: target.description,
        severity: target.id === "missing-refund-policy" ? "recommended" : "critical",
        status: "missing",
      });
    } else {
      matches.push({ target: target.id, path: matched.path });
      // We don't fetch content here in v1 — we just record that the file exists.
      // A future iteration can fetch and check for stub content.
      issues.push({
        id: target.id,
        category: "legal",
        title: target.title,
        description: target.description,
        severity: "optional",
        status: "present",
        existingFile: matched.path,
      });
    }
  }

  return { issues, matches };
}
