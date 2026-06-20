/**
 * POST /api/codebase-context
 *
 * Body: { repoUrl: string }
 * Returns: CodebaseContext (see engine/src/types.ts)
 *
 * Builds a curated, AI-ready snapshot of the repo: project name,
 * description, contact email, brand color, actual routes, and snippets
 * of existing copy. Used by the AI-powered generators in commit 3+.
 *
 * Cached in-memory for 24h keyed by repoUrl. The first call to a new
 * repo takes ~1-3s (GitHub tree + a handful of file fetches); the
 * rest are instant.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildCodebaseContext } from "@/engine/src";
import { codebaseCacheGet, codebaseCacheSet } from "@/lib/codebase-cache";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { repoUrl?: string; force?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.repoUrl) {
    return NextResponse.json({ error: "Missing repoUrl" }, { status: 400 });
  }

  // Cache hit (unless ?force=true or force: true in body)
  if (!body.force) {
    const cached = codebaseCacheGet(body.repoUrl);
    if (cached) {
      return NextResponse.json({ ...cached, _cache: "hit" });
    }
  }

  try {
    const ctx = await buildCodebaseContext(body.repoUrl);
    codebaseCacheSet(body.repoUrl, ctx);
    return NextResponse.json({ ...ctx, _cache: "miss" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/codebase-context]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
