// Smoke test: feed fake trees into the scanners and verify output
import { scanLegal } from "../src/scanners/legal";
import { scanSecretsFileNames, scanSecretsInContent } from "../src/scanners/secrets";
import { scanLicenseFromTree, buildLicenseIssue } from "../src/scanners/license";
import { generatePrivacyPolicy } from "../src/generators/privacy-policy";
import { generateTerms } from "../src/generators/terms";
import { calculateScore } from "../src/score";
import type { RepoFile, ProjectContext } from "../src/types";

const files: RepoFile[] = [
  { path: "README.md", size: 100, type: "file", sha: "a" },
  { path: "package.json", size: 500, type: "file", sha: "b" },
  { path: "src/index.js", size: 1000, type: "file", sha: "c" },
  { path: ".env", size: 200, type: "file", sha: "x" },
  { path: "config/stripe.json", size: 80, type: "file", sha: "y" },
];

const context: ProjectContext = {
  collectsEmails: true,
  processesPayments: true,
  servesEuUsers: true,
  usesCookies: true,
  businessType: "saas",
  region: "eu",
};

console.log("=== LEGAL SCAN ===");
const legal = scanLegal(files);
for (const i of legal.issues) console.log(`  [${i.severity}] ${i.id} -- ${i.title}`);

console.log("\n=== LICENSE SCAN ===");
const licenseTree = scanLicenseFromTree(files);
const licenseIssue = buildLicenseIssue(licenseTree.hasLicenseFile, null, licenseTree.file);
console.log(`  [${licenseIssue.severity}] ${licenseIssue.id} -- ${licenseIssue.title}`);

console.log("\n=== SECRETS SCAN (filenames) ===");
const secrets = scanSecretsFileNames(files);
for (const i of secrets.issues) console.log(`  [${i.severity}] ${i.id} -- ${i.title}`);

console.log("\n=== SECRETS SCAN (content, fake content) ===");
const fakeEnv = `DATABASE_URL=postgres://user:pass@host/db
STRIPE_SECRET_KEY=sk_live_abcdef1234567890
GITHUB_TOKEN=ghp_1234567890abcdefghij
OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwx
`;
const contentFlags = scanSecretsInContent(".env", fakeEnv);
for (const f of contentFlags) console.log(`  [critical] ${f.pattern} at line ${f.line}`);

console.log("\n=== COMBINED ===");
const all = [
  ...legal.issues,
  ...secrets.issues,
  licenseIssue,
];
console.log("Total issues:", all.length);
console.log("Score:", calculateScore(all));

console.log("\n=== PRIVACY POLICY GEN (first 30 lines) ===");
const policy = generatePrivacyPolicy({ context, projectName: "TestApp", contactEmail: "hello@testapp.com" });
console.log(policy.split("\n").slice(0, 30).join("\n"));
console.log("...");
console.log(`(${policy.split("\n").length} lines total)`);

console.log("\n=== TERMS GEN (first 20 lines) ===");
const terms = generateTerms({ context, projectName: "TestApp", contactEmail: "hello@testapp.com" });
console.log(terms.split("\n").slice(0, 20).join("\n"));
console.log("...");
console.log(`(${terms.split("\n").length} lines total)`);
