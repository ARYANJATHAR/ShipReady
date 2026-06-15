/**
 * License scanner.
 *
 * Checks for:
 *   - LICENSE / LICENSE.md / LICENSE.txt at the repo root
 *   - Recognizable license content (MIT, Apache-2.0, GPL, BSD, etc.)
 *
 * Detected as "present" if the file exists and contains a known license
 * name or short identifier. "Warning" if the file exists but we can't
 * recognize the license. "Missing" if the file isn't there.
 *
 * License detection from content is best-effort. We just look for
 * known strings ("MIT License", "Apache License", "GNU General Public")
 * in the first 2KB of the file.
 */

import type { Issue, RepoFile } from "../types";

const LICENSE_FILENAMES = [
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "LICENSE.rst",
  "license",
  "license.md",
  "license.txt",
  "LICENCE",
  "LICENCE.md",
  "COPYING",
];

const KNOWN_LICENSES: Array<{ id: string; name: string; pattern: RegExp }> = [
  { id: "mit", name: "MIT", pattern: /\bMIT License\b/i },
  { id: "apache-2.0", name: "Apache 2.0", pattern: /\bApache License,?\s*Version 2\.0\b/i },
  { id: "gpl-3.0", name: "GPL v3", pattern: /\bGNU General Public License,?\s*version 3\b/i },
  { id: "gpl-2.0", name: "GPL v2", pattern: /\bGNU General Public License,?\s*version 2\b/i },
  { id: "bsd-3-clause", name: "BSD 3-Clause", pattern: /\bBSD 3-Clause\b/i },
  { id: "bsd-2-clause", name: "BSD 2-Clause", pattern: /\bBSD 2-Clause\b/i },
  { id: "isc", name: "ISC", pattern: /\bISC License\b/i },
  { id: "unlicense", name: "Unlicense", pattern: /\bThis is free and unencumbered software\b/i },
  { id: "mpl-2.0", name: "MPL 2.0", pattern: /\bMozilla Public License,?\s*v\.?\s*2\.0\b/i },
];

export interface LicenseScanResult {
  issues: Issue[];
  /** The detected license, if any */
  detected: string | null;
  /** Path to the license file, if any */
  file: string | null;
}

export function scanLicenseFromTree(files: RepoFile[]): {
  file: string | null;
  hasLicenseFile: boolean;
} {
  for (const file of files) {
    if (file.type !== "file") continue;
    const basename = file.path.split("/").pop() || "";
    if (LICENSE_FILENAMES.includes(basename)) {
      return { file: file.path, hasLicenseFile: true };
    }
  }
  return { file: null, hasLicenseFile: false };
}

/**
 * Detect the license type from file content.
 * Returns the canonical SPDX-ish ID (mit, apache-2.0, etc.) or null.
 */
export function detectLicenseFromContent(content: string): string | null {
  // Only scan the first 2KB — license headers are always at the top
  const head = content.slice(0, 2048);
  for (const license of KNOWN_LICENSES) {
    if (license.pattern.test(head)) {
      return license.id;
    }
  }
  return null;
}

export function buildLicenseIssue(
  hasLicenseFile: boolean,
  detected: string | null,
  file: string | null
): Issue {
  if (!hasLicenseFile) {
    return {
      id: "missing-license",
      category: "license",
      title: "Missing LICENSE file",
      description:
        "Without a LICENSE file, your code is under exclusive copyright by default — others can't legally use, modify, or distribute it. If you intend an open-source project, add a LICENSE. If it's closed-source, you don't need one (but consider an explicit 'All Rights Reserved' statement).",
      severity: "recommended",
      status: "missing",
    };
  }

  if (!detected) {
    return {
      id: "unrecognized-license",
      category: "license",
      title: "License file is not recognized",
      description:
        `A license file exists at ${file} but we can't identify the license type. Double-check it's a real license (MIT, Apache-2.0, etc.) — non-standard licenses are hard for others to comply with.`,
      severity: "recommended",
      status: "warning",
      file: file ?? undefined,
    };
  }

  return {
    id: "license-present",
    category: "license",
    title: `License: ${detected.toUpperCase()}`,
    description: `Your project is licensed under ${detected.toUpperCase()}.`,
    severity: "optional",
    status: "present",
    existingFile: file ?? undefined,
  };
}
