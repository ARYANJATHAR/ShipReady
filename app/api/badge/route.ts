/**
 * GET /api/badge?repo=<github-url>
 *
 * Returns an SVG badge with the current ShipReady score.
 * Designed to be embedded in a README:
 *
 *   ![ShipReady](https://shipready.dev/api/badge?repo=https://github.com/owner/repo)
 *
 * Style is similar to shields.io but uses our accent color (#c4f542).
 * Score color: 80+ green, 50-79 yellow, <50 red.
 */

import { NextRequest, NextResponse } from "next/server";
import { scanRepo } from "@/engine/src";
import { makeContext } from "@/engine/src/context";

export const runtime = "nodejs";

const DEFAULT_CONTEXT = {
  collectsEmails: false,
  processesPayments: false,
  servesEuUsers: true,
  usesCookies: false,
  businessType: "other" as const,
  region: "global" as const,
};

export async function GET(req: NextRequest) {
  const repo = req.nextUrl.searchParams.get("repo");
  if (!repo) {
    return new NextResponse("Missing ?repo=<github-url>", { status: 400 });
  }

  try {
    const result = await scanRepo({
      repoUrl: repo,
      context: makeContext(DEFAULT_CONTEXT),
    });

    const svg = generateBadgeSvg(result.score, result.repo.owner, result.repo.name);
    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300", // 5 min cache
      },
    });
  } catch (err) {
    // On error, return an "unknown" badge
    const message = err instanceof Error ? err.message : "scan failed";
    const svg = generateErrorBadge(message);
    return new NextResponse(svg, {
      status: 200,
      headers: { "Content-Type": "image/svg+xml" },
    });
  }
}

function generateBadgeSvg(score: number, owner: string, name: string): string {
  const color = score >= 80 ? "#c4f542" : score >= 50 ? "#facc15" : "#f87171";
  const textColor = score >= 80 ? "#0a0a09" : score >= 50 ? "#0a0a09" : "#0a0a09";
  const label = "ShipReady";
  const value = `${score}/100`;

  // Width calculation: ~7px per char + padding
  const labelWidth = label.length * 7 + 14;
  const valueWidth = value.length * 7 + 14;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" viewBox="0 0 ${totalWidth} 20" role="img" aria-label="ShipReady: ${value}">
  <title>ShipReady: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".7"/>
    <stop offset=".1" stop-color="#aaa" stop-opacity=".1"/>
    <stop offset=".9" stop-color="#000" stop-opacity=".3"/>
    <stop offset="1" stop-color="#000" stop-opacity=".5"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#0a0a09"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="${textColor}" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${labelWidth / 2 * 10}" y="150" fill="#fff" transform="scale(.1)" textLength="${(labelWidth - 14) * 10}">${label}</text>
    <text aria-hidden="true" x="${(labelWidth + valueWidth / 2) * 10}" y="150" transform="scale(.1)" fill="${textColor}" textLength="${(valueWidth - 14) * 10}">${value}</text>
  </g>
</svg>`;
}

function generateErrorBadge(message: string): string {
  const label = "ShipReady";
  const value = "scan failed";
  const labelWidth = label.length * 7 + 14;
  const valueWidth = value.length * 7 + 14;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" viewBox="0 0 ${totalWidth} 20" role="img" aria-label="ShipReady: ${value}">
  <title>ShipReady: ${message}</title>
  <rect width="${labelWidth}" height="20" fill="#0a0a09"/>
  <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="#78716c"/>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="110">
    <text x="${labelWidth / 2 * 10}" y="150" fill="#fff" transform="scale(.1)" textLength="${(labelWidth - 14) * 10}">${label}</text>
    <text x="${(labelWidth + valueWidth / 2) * 10}" y="150" transform="scale(.1)" textLength="${(valueWidth - 14) * 10}">${value}</text>
  </g>
</svg>`;
}
