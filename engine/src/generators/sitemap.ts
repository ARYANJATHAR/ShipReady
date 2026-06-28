/**
 * Sitemap generator.
 *
 * Generates a framework-aware sitemap using real routes from the codebase
 * when available, falling back to sensible defaults when not.
 *
 *   - Next.js / Remix: app/sitemap.ts using MetadataRoute.Sitemap
 *   - Astro:           src/pages/sitemap.xml.ts
 *   - Vite / SvelteKit / unknown: public/sitemap.xml (static)
 */

import type { Framework } from "../framework";
import { frameworkPaths } from "../framework";

export interface SitemapInput {
  framework: Framework;
  /** Site URL, e.g. "https://myapp.com" */
  siteUrl: string;
  /** Project name (used in route comments) */
  projectName: string;
  /**
   * Optional: real routes discovered from the codebase.
   * When provided, the sitemap will list these instead of hardcoded
   * defaults. Each entry should start with "/" (e.g. "/pricing", "/about").
   */
  pages?: string[];
}

/**
 * Build a route priority map from the discovered pages.
 * Assigns sensible changeFrequency and priority based on the route path.
 */
function buildRouteEntries(pages: string[]): Array<{ path: string; changeFrequency: string; priority: number }> {
  const entries: Array<{ path: string; changeFrequency: string; priority: number }> = [];

  // Always include root first
  entries.push({ path: "/", changeFrequency: "weekly", priority: 1.0 });

  const seen = new Set<string>(["/"]);

  for (const page of pages) {
    const normalized = page.replace(/\/+$/, "") || "/";
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const lower = normalized.toLowerCase();
    let changeFrequency: string;
    let priority: number;

    // Assign sensible defaults based on route name
    if (lower === "/" || lower === "") {
      continue; // already added
    } else if (/^\/(pricing|plans?|subscription)/.test(lower)) {
      changeFrequency = "weekly";
      priority = 0.9;
    } else if (/^\/(about|team|contact|company)/.test(lower)) {
      changeFrequency = "monthly";
      priority = 0.7;
    } else if (/^\/(blog|articles?|news|updates)/.test(lower)) {
      changeFrequency = "daily";
      priority = 0.8;
    } else if (/^\/(docs?|documentation|guides?|tutorials?)/.test(lower)) {
      changeFrequency = "weekly";
      priority = 0.7;
    } else if (/^\/(privacy|terms|legal|cookies?|gdpr|ccpa)/.test(lower)) {
      changeFrequency = "yearly";
      priority = 0.3;
    } else if (/^\/(features?|showcase|gallery|case-studies?)/.test(lower)) {
      changeFrequency = "weekly";
      priority = 0.6;
    } else if (/^\/(faq|support|help|status)/.test(lower)) {
      changeFrequency = "monthly";
      priority = 0.5;
    } else {
      changeFrequency = "monthly";
      priority = 0.5;
    }

    entries.push({ path: normalized, changeFrequency, priority });
  }

  return entries;
}

/** The default routes when no codebase pages are available. */
const DEFAULT_ROUTES: Array<{ path: string; changeFrequency: string; priority: number }> = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/blog", changeFrequency: "daily", priority: 0.8 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
];

export function generateSitemap(input: SitemapInput): { path: string; content: string } {
  const paths = frameworkPaths(input.framework);
  const base = input.siteUrl.replace(/\/$/, "");

  // Determine routes: use real pages when available, fall back to defaults
  const hasRealRoutes = input.pages && input.pages.filter((p) => p !== "/" && p !== "").length > 0;
  const routes = hasRealRoutes ? buildRouteEntries(input.pages!) : DEFAULT_ROUTES;

  // Next.js / Remix
  if (paths.sitemap === "app/sitemap.ts") {
    return {
      path: "app/sitemap.ts",
      content: generateNextjsSitemap(input.projectName, base, routes),
    };
  }

  // Astro
  if (paths.sitemap === "src/pages/sitemap.xml.ts") {
    return {
      path: "src/pages/sitemap.xml.ts",
      content: generateAstroSitemap(base, routes),
    };
  }

  // Vite / SvelteKit / unknown — static XML
  return {
    path: "public/sitemap.xml",
    content: generateStaticSitemap(base, routes),
  };
}

/**
 * Build the route lines template for the Next.js variant.
 * We build this as a separate string to avoid nested template literal issues.
 */
function buildRouteLines(routes: Array<{ path: string; changeFrequency: string; priority: number }>): string {
  return routes
    .map((r) => '    { path: "' + r.path + '", changeFrequency: "' + r.changeFrequency + '", priority: ' + r.priority + ' },')
    .join("\n");
}

/**
 * Build the route array for the Astro variant.
 */
function buildRouteArray(routes: Array<{ path: string; changeFrequency: string; priority: number }>): string {
  return routes
    .map((r) => '"' + r.path + '"')
    .join(", ");
}

function generateNextjsSitemap(projectName: string, base: string, routes: Array<{ path: string; changeFrequency: string; priority: number }>): string {
  const lines = buildRouteLines(routes);
  const showAddHint = routes === DEFAULT_ROUTES;

  let result = 'import type { MetadataRoute } from "next";\n';
  result += '\n';
  result += '/**\n';
  result += ' * Sitemap for ' + projectName + '.\n';
  result += ' * Auto-generated by ShipReady.\n';
  if (showAddHint) {
    result += ' * Add your dynamic routes (blog posts, products, etc.) to the `routes` array below.\n';
  }
  result += ' */\n';
  result += 'export default function sitemap(): MetadataRoute.Sitemap {\n';
  result += '  const base = "' + base + '";\n';
  result += '  const now = new Date();\n';
  result += '  const routes: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [\n';
  result += lines + '\n';
  result += '  ];\n';
  result += '\n';
  result += '  return routes.map((r) => ({\n';
  result += '    url: `${base}${r.path}`,\n';
  result += '    lastModified: now,\n';
  result += '    changeFrequency: r.changeFrequency,\n';
  result += '    priority: r.priority,\n';
  result += '  }));\n';
  result += '}\n';

  return result;
}

function generateAstroSitemap(base: string, routes: Array<{ path: string; changeFrequency: string; priority: number }>): string {
  const routeArray = buildRouteArray(routes);

  let result = 'import type { APIRoute } from "astro";\n';
  result += '\n';
  result += '/**\n';
  result += ' * Sitemap for this project.\n';
  result += ' * Auto-generated by ShipReady.\n';
  result += ' */\n';
  result += 'export const GET: APIRoute = () => {\n';
  result += '  const base = "' + base + '";\n';
  result += '  const now = new Date().toISOString();\n';
  result += '  const routes = [' + routeArray + '];\n';
  result += '\n';
  result += '  const urls = routes\n';
  result += '    .map(\n';
  result += '      (r) =>\n';
  result += '        `  <url>\\n    <loc>${base}${r}</loc>\\n    <lastmod>${now}</lastmod>\\n  </url>`\n';
  result += '    )\n';
  result += '    .join("\\n");\n';
  result += '\n';
  result += '  const xml = `<?xml version="1.0" encoding="UTF-8"?>\\n';
  result += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\\n';
  result += '${urls}\\n';
  result += '</urlset>`;\n';
  result += '\n';
  result += '  return new Response(xml, { headers: { "Content-Type": "application/xml" } });\n';
  result += '};\n';

  return result;
}

function generateStaticSitemap(base: string, routes: Array<{ path: string; changeFrequency: string; priority: number }>): string {
  const urlEntries = routes
    .map(
      (r) => [
        "  <url>",
        '    <loc>' + base + r.path + '</loc>',
        '    <changefreq>' + r.changeFrequency + '</changefreq>',
        '    <priority>' + r.priority + '</priority>',
        "  </url>",
      ].join("\n")
    )
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlEntries,
    '</urlset>',
    "",
  ].join("\n");
}
