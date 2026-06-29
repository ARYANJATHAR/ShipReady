// SEO scanner + generators smoke test
import { scanSeo } from "../src/scanners/seo";
import { generateSitemap } from "../src/generators/sitemap";
import { generateRobots } from "../src/generators/robots";
import { generateOgTags } from "../src/generators/og-tags";
import { generateJsonLd } from "../src/generators/jsonld";
import type { RepoFile } from "../src/types";

function makeFile(path: string, content?: string): RepoFile {
  return { path, type: "file", sha: "x", content };
}

console.log("=== SEO SCAN (no files = all missing) ===\n");
const empty: RepoFile[] = [];
const issues = scanSeo({ files: empty, contents: new Map(), framework: "nextjs" });
for (const i of issues) {
  console.log(`  [${i.severity}] ${i.id} -- ${i.status}`);
}

console.log("\n=== SEO SCAN (Next.js with everything present) ===\n");
const layoutWithEverything = `
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MyApp",
  description: "The best app ever",
  openGraph: {
    title: "MyApp",
    description: "The best app",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: {
    canonical: "https://myapp.com",
  },
};

export default function Layout({ children }) {
  return <html><body>{children}</body></html>;
}
`;
const fullFiles: RepoFile[] = [
  makeFile("app/sitemap.ts"),
  makeFile("app/robots.ts"),
  makeFile("app/layout.tsx", layoutWithEverything),
];
const fullContents = new Map([["app/layout.tsx", layoutWithEverything]]);
const fullIssues = scanSeo({ files: fullFiles, contents: fullContents, framework: "nextjs" });
for (const i of fullIssues) {
  console.log(`  [${i.severity}] ${i.id} -- ${i.status}`);
}

console.log("\n=== SITEMAP GEN (Next.js) ===");
const sitemap = generateSitemap({ framework: "nextjs", siteUrl: "https://myapp.com", projectName: "MyApp" });
console.log(`Path: ${sitemap.path}`);
console.log(`First 10 lines:`);
sitemap.content.split("\n").slice(0, 10).forEach((l) => console.log(`  ${l}`));

console.log("\n=== SITEMAP GEN (Vite) ===");
const viteSitemap = generateSitemap({ framework: "vite", siteUrl: "https://myapp.com", projectName: "MyApp" });
console.log(`Path: ${viteSitemap.path}`);
console.log(`First 6 lines:`);
viteSitemap.content.split("\n").slice(0, 6).forEach((l) => console.log(`  ${l}`));

console.log("\n=== ROBOTS GEN (Next.js) ===");
const robots = generateRobots({ framework: "nextjs", siteUrl: "https://myapp.com" });
console.log(`Path: ${robots.path}`);

console.log("\n=== ROBOTS GEN (Vite) ===");
const viteRobots = generateRobots({ framework: "vite", siteUrl: "https://myapp.com" });
console.log(`Path: ${viteRobots.path}`);

console.log("\n=== OG TAGS GEN (Next.js) ===");
const og = await generateOgTags({ framework: "nextjs", projectName: "MyApp", description: "The best app", siteUrl: "https://myapp.com" });
console.log(`Path: ${og.path}`);
console.log(`Has openGraph:`, og.content.includes("openGraph"));
console.log(`Has twitter:`, og.content.includes("twitter:"));

console.log("\n=== JSON-LD GEN ===");
const jsonld = await generateJsonLd({ framework: "nextjs", projectName: "MyApp", description: "The best app", siteUrl: "https://myapp.com" });
console.log(`Path: ${jsonld.path}`);
console.log(`Has @context:`, jsonld.content.includes('"@context"'));
console.log(`Has schema.org:`, jsonld.content.includes("schema.org"));
