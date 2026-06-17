// Quick test of the diff + zip pipeline
import { computeDiff } from "../src/diff";
import { buildFixesZip } from "../src/zip";
import type { Fix, ScanResult } from "../src/types";

const fixes: Fix[] = [
  {
    path: "PRIVACY.md",
    content: "# Privacy Policy\n\nWe don't sell your data. Contact: hello@testapp.com\n",
    description: "Privacy policy",
    issueId: "missing-privacy-policy",
    isNew: true,
  },
  {
    path: "TERMS.md",
    content: "# Terms of Service\n\nUse at your own risk.\n",
    description: "Terms",
    issueId: "missing-terms",
    isNew: true,
  },
];

const fakeScan: ScanResult = {
  id: "abc",
  repo: { owner: "test", name: "vibe-app", defaultBranch: "main", commitSha: "abc123", fileCount: 10, framework: "nextjs", frameworkConfidence: "high" },
  context: { collectsEmails: true, processesPayments: false, servesEuUsers: true, usesCookies: false, businessType: "saas", region: "eu" },
  issues: [],
  score: 50,
  scannedAt: new Date().toISOString(),
  durationMs: 100,
};

const diff = computeDiff("# Old\nSome content\n", "# New\nDifferent content\n");
console.log("=== DIFF ===");
console.log("Added lines:", diff.added);
console.log("Removed lines:", diff.removed);
console.log("First 3 lines:", diff.lines.slice(0, 3).map(l => `[${l.type}] ${l.text}`));

const zip = await buildFixesZip({ fixes, repoName: fakeScan.repo.name });
console.log("\n=== ZIP ===");
console.log("Size (bytes):", zip.size);
console.log("Looks like a zip:", zip instanceof Blob);
console.log("Fixes included:", fixes.length);
