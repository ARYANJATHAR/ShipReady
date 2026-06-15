import { NextRequest, NextResponse } from "next/server";
import { scanRepo } from "@/engine/src";
import { makeContext } from "@/engine/src/context";
import type { ProjectContext } from "@/engine/src/types";

export const runtime = "nodejs";
// Public repos are slow to scan (lots of GitHub API calls); allow up to 60s
export const maxDuration = 60;

/**
 * POST /api/scan
 *
 * Body: {
 *   repoUrl: string,
 *   context: Partial<ProjectContext>
 * }
 *
 * Returns: ScanResult
 */
export async function POST(req: NextRequest) {
  let body: { repoUrl?: string; context?: Partial<ProjectContext> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.repoUrl) {
    return NextResponse.json({ error: "Missing repoUrl" }, { status: 400 });
  }

  const context = makeContext(body.context || {});

  try {
    const result = await scanRepo({
      repoUrl: body.repoUrl,
      context,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/scan]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
