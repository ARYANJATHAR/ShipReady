/**
 * POST /api/detect-framework
 *
 * Body: { repoUrl: string }
 *
 * Returns: { framework, confidence, label, matchedBy? }
 *
 * Lightweight endpoint: fetches the repo's file tree and runs
 * `detectFramework()` only — no full scan, no scanners, no scoring.
 * Used by the onboarding flow to pre-fill the framework question
 * before the user walks through the 5+1 context questions.
 *
 * No caching (per the Phase 2 plan's defer-list).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  parseRepoUrl,
  getDefaultBranch,
  getRepoTree,
} from "@/engine/src/github";
import { detectFramework } from "@/engine/src/framework";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { repoUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.repoUrl) {
    return NextResponse.json({ error: "Missing repoUrl" }, { status: 400 });
  }

  const parsed = parseRepoUrl(body.repoUrl);
  if (!parsed.isValid) {
    return NextResponse.json(
      { error: `Invalid GitHub URL: "${body.repoUrl}". Use format: github.com/owner/repo` },
      { status: 400 }
    );
  }

  try {
    const branch = await getDefaultBranch(parsed.owner, parsed.name);
    const tree = await getRepoTree(parsed.owner, parsed.name, branch);
    const info = detectFramework(tree.files);
    return NextResponse.json(info);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/detect-framework]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
