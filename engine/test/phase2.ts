// Phase 2 comprehensive smoke test — all 6 new scanners
import { scanSeo } from "../src/scanners/seo";
import { scanErrors } from "../src/scanners/errors";
import { scanSecurity } from "../src/scanners/security";
import { scanMeta } from "../src/scanners/meta";
import { scanA11y } from "../src/scanners/a11y";
import { scanBrokenLinks } from "../src/scanners/broken-links";
import { detectFramework } from "../src/framework";
import type { RepoFile } from "../src/types";

function makeFile(path: string, content?: string): RepoFile {
  return { path, type: "file", sha: "x", content };
}

console.log("=== Phase 2: Full Next.js vibe-coded repo (everything missing) ===\n");

const files: RepoFile[] = [
  makeFile("package.json"),
  makeFile("next.config.ts"),
  makeFile("app/layout.tsx", `<html><body>{children}</body></html>`),
  makeFile("app/page.tsx", `<img src="/hero.png" /><button><X /></button><input type="text" />`),
  makeFile("app/blog/page.tsx", `<img src="/blog/header.jpg" />`),
];

const contents = new Map<string, string | null>();
for (const f of files) {
  if (f.content) contents.set(f.path, f.content);
}

const framework = detectFramework(files);
console.log(`Framework: ${framework.framework} (confidence: ${framework.confidence})\n`);

const seo = scanSeo({ files, contents, framework: framework.framework });
const errors = scanErrors({ files, framework: framework.framework });
const security = scanSecurity({ files, contents, framework: framework.framework });
const meta = scanMeta({ files, contents: new Map(), framework: framework.framework });
const a11y = scanA11y({ contents, framework: framework.framework });
const broken = scanBrokenLinks({ files, contents });

function summarize(name: string, issues: { id: string; severity: string; status: string; title: string }[]) {
  console.log(`--- ${name} ---`);
  for (const i of issues) {
    console.log(`  [${i.severity.padEnd(11)}] ${i.status.padEnd(8)} ${i.id} -- ${i.title}`);
  }
  console.log();
}

summarize("SEO", seo);
summarize("Errors", errors);
summarize("Security", security);
summarize("Meta", meta);
summarize("A11y", a11y);
summarize("Broken links", broken);

const all = [...seo, ...errors, ...security, ...meta, ...a11y, ...broken];
console.log(`\nTotal issues: ${all.length}`);
console.log(`Critical (not present): ${all.filter(i => i.severity === "critical" && i.status !== "present").length}`);
console.log(`Recommended (not present): ${all.filter(i => i.severity === "recommended" && i.status !== "present").length}`);
