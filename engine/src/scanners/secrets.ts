/**
 * Secrets scanner.
 *
 * Detects likely-committed secrets in the repository:
 *   - Hardcoded API keys / tokens (regex-based, conservative)
 *   - .env files in the repo (not just .env.example)
 *   - .pem, .key, .p12 files
 *   - Credentials in client-side code (next.config, public/ folder)
 *
 * We are intentionally conservative — false positives are worse than
 * false negatives here, because we'll surface this to the user.
 * We never auto-fix secrets; we only flag them with the matched line.
 *
 * For real production use, consider integrating `gitleaks` or `trufflehog`
 * rules. For v1, we ship a simple regex set that catches the common cases.
 */

import type { Issue, RepoFile } from "../types";

interface SecretPattern {
  id: string;
  /** Regex to match. Capture group 1 is the matched secret. */
  pattern: RegExp;
  /** Human-readable name for the secret type */
  name: string;
}

/**
 * Conservative secret patterns. These are tuned for low false-positive rate
 * on real-world codebases. Each one requires either a known prefix (e.g.
 * `sk_live_`, `ghp_`) or a long-enough high-entropy string.
 */
const SECRET_PATTERNS: SecretPattern[] = [
  {
    id: "stripe-live-key",
    pattern: /\bsk_live_[A-Za-z0-9]{20,}\b/g,
    name: "Stripe live secret key",
  },
  {
    id: "stripe-test-key",
    pattern: /\bsk_test_[A-Za-z0-9]{20,}\b/g,
    name: "Stripe test secret key",
  },
  {
    id: "github-pat",
    pattern: /\bghp_[A-Za-z0-9]{30,}\b/g,
    name: "GitHub personal access token",
  },
  {
    id: "github-fine-grained",
    pattern: /\bgithub_pat_[A-Za-z0-9_]{40,}\b/g,
    name: "GitHub fine-grained PAT",
  },
  {
    id: "openai-key",
    pattern: /\bsk-[A-Za-z0-9]{40,}\b/g,
    name: "OpenAI API key",
  },
  {
    id: "anthropic-key",
    pattern: /\bsk-ant-[A-Za-z0-9_-]{40,}\b/g,
    name: "Anthropic API key",
  },
  {
    id: "aws-access-key",
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    name: "AWS access key ID",
  },
  {
    id: "google-api-key",
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    name: "Google API key",
  },
  {
    id: "slack-token",
    pattern: /\bxox[abpos]-[A-Za-z0-9-]{10,}\b/g,
    name: "Slack token",
  },
  {
    id: "private-key-block",
    pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    name: "Private key block",
  },
];

export interface SecretsScanResult {
  issues: Issue[];
  /** Files we flagged, with the patterns that matched */
  flagged: Array<{
    path: string;
    pattern: string;
    line: number;
    excerpt: string;
  }>;
}

export function scanSecretsFileNames(files: RepoFile[]): SecretsScanResult {
  // We do filename-based detection first (no fetch needed).
  // Filename-only detection is fast and catches the most common leaks.
  const issues: Issue[] = [];
  const flagged: SecretsScanResult["flagged"] = [];

  for (const file of files) {
    if (file.type !== "file") continue;

    // 1. .env files that aren't .env.example
    if (file.path === ".env" || file.path.endsWith("/.env")) {
      issues.push({
        id: "env-file-in-repo",
        category: "secrets",
        title: ".env file is committed",
        description:
          "Your .env file contains real secrets and is tracked by git. Move it to .env (gitignored) and put placeholder values in .env.example. Rotate any keys that were in the committed file.",
        severity: "critical",
        status: "warning",
        file: file.path,
      });
      flagged.push({
        path: file.path,
        pattern: "env-file",
        line: 0,
        excerpt: "(entire file)",
      });
      continue;
    }

    // 2. Private key files
    if (/\.(pem|key|p12|pfx)$/i.test(file.path) && !file.path.includes("test") && !file.path.includes("fixture")) {
      issues.push({
        id: "private-key-file",
        category: "secrets",
        title: `Private key file committed: ${file.path}`,
        description:
          "Private key files (.pem, .key, .p12) should never be in git. Add to .gitignore immediately, rotate the key, and audit for unauthorized use.",
        severity: "critical",
        status: "warning",
        file: file.path,
      });
      flagged.push({
        path: file.path,
        pattern: "key-file",
        line: 0,
        excerpt: "(entire file)",
      });
    }
  }

  return { issues, flagged };
}

/**
 * Scan the contents of a single file for secret patterns.
 * Call this only on files you're about to fetch — it does a regex sweep.
 */
export function scanSecretsInContent(path: string, content: string): SecretsScanResult["flagged"] {
  const flagged: SecretsScanResult["flagged"] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip lines that look like env var references
    if (/process\.env\.[A-Z_]+/.test(line)) continue;
    if (/\$\{[A-Z_]+\}/.test(line)) continue; // shell-style env ref
    if (/import\.meta\.env\.[A-Z_]+/.test(line)) continue;
    if (/<.*PLACEHOLDER.*>/i.test(line)) continue;
    if (/your[-_]?key[-_]?here/i.test(line)) continue;
    if (/example\.com/i.test(line) && line.length < 80) continue;

    for (const pattern of SECRET_PATTERNS) {
      // Reset regex lastIndex for global patterns
      pattern.pattern.lastIndex = 0;
      const match = pattern.pattern.exec(line);
      if (match) {
        flagged.push({
          path,
          pattern: pattern.name,
          line: i + 1,
          excerpt: line.trim().slice(0, 120),
        });
      }
    }
  }

  return flagged;
}
