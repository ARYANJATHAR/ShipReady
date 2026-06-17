// Framework detection smoke test
import { detectFramework, frameworkPaths, hasAppRouter } from "../src/framework";
import type { RepoFile } from "../src/types";

function makeFile(path: string): RepoFile {
  return { path, type: "file", sha: "x" };
}

function makeNextJs(): RepoFile[] {
  return [
    makeFile("package.json"),
    makeFile("next.config.ts"),
    makeFile("app/layout.tsx"),
    makeFile("app/page.tsx"),
    makeFile("tsconfig.json"),
  ];
}

function makeVite(): RepoFile[] {
  return [
    makeFile("package.json"),
    makeFile("vite.config.ts"),
    makeFile("index.html"),
    makeFile("src/main.tsx"),
  ];
}

function makeAstro(): RepoFile[] {
  return [
    makeFile("package.json"),
    makeFile("astro.config.mjs"),
    makeFile("src/pages/index.astro"),
  ];
}

function makeRemix(): RepoFile[] {
  return [
    makeFile("package.json"),
    makeFile("remix.config.js"),
    makeFile("app/root.tsx"),
  ];
}

function makeSvelteKit(): RepoFile[] {
  return [
    makeFile("package.json"),
    makeFile("svelte.config.js"),
    makeFile("src/routes/+page.svelte"),
  ];
}

function makeUnknown(): RepoFile[] {
  return [
    makeFile("README.md"),
    makeFile("index.html"),
  ];
}

console.log("=== Framework detection ===\n");

const tests: Array<[string, RepoFile[], string]> = [
  ["Next.js", makeNextJs(), "nextjs"],
  ["Vite",    makeVite(),   "vite"],
  ["Astro",   makeAstro(),  "astro"],
  ["Remix",   makeRemix(),  "remix"],
  ["SvelteKit", makeSvelteKit(), "sveltekit"],
  ["Unknown", makeUnknown(), "unknown"],
];

let pass = 0, fail = 0;
for (const [name, files, expected] of tests) {
  const result = detectFramework(files);
  const ok = result.framework === expected;
  if (ok) pass++; else fail++;
  console.log(`  [${ok ? "OK" : "FAIL"}] ${name} -> ${result.framework} (expected ${expected}) confidence=${result.confidence} matchedBy=${result.matchedBy ?? "-"}`);
}

console.log(`\n${pass} pass, ${fail} fail\n`);

console.log("=== Framework helpers ===\n");
console.log("hasAppRouter(nextjs):", hasAppRouter("nextjs"));
console.log("hasAppRouter(vite):  ", hasAppRouter("vite"));
console.log("hasAppRouter(remix): ", hasAppRouter("remix"));

console.log("\nframeworkPaths(nextjs):", frameworkPaths("nextjs"));
console.log("frameworkPaths(vite):  ", frameworkPaths("vite"));
console.log("frameworkPaths(astro): ", frameworkPaths("astro"));
console.log("frameworkPaths(unknown):", frameworkPaths("unknown"));

if (fail > 0) process.exit(1);
