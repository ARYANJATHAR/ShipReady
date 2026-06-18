import { NextRequest, NextResponse } from "next/server";
import { generateFixes, buildFixesZip, type ScanResult } from "@/engine/src";
import { buildCodebaseContext } from "@/engine/src/codebase-context";
import { aiEnabled } from "@/lib/ai";

export const runtime = "nodejs";
// AI generation adds 5-10s for the codebase fetch + 30-60s for the AI calls
// (3 policy calls). Allow 240s so the ZIP can finish even on slow models.
export const maxDuration = 240;

/**
 * POST /api/generate
 *
 * Body: {
 *   scan: ScanResult,
 *   projectName?: string,
 *   contactEmail?: string,
 *   repoUrl?: string  // required for AI mode so we can build codebase context
 * }
 *
 * Returns: a ZIP file containing all generated fixes
 *
 * AI behavior:
 *   - If `aiEnabled` (env var set) AND `repoUrl` is provided, the route
 *     builds a `CodebaseContext` from the repo and passes it into
 *     `generateFixes`. The policy generators will use the AI path.
 *   - Without `aiEnabled` or `repoUrl`, all generators use static templates.
 *   - The codebase fetch is cached (24h) so subsequent scans of the same
 *     repo are fast.
 */
export async function POST(req: NextRequest) {
  let body: {
    scan?: ScanResult;
    projectName?: string;
    contactEmail?: string;
    repoUrl?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.scan) {
    return NextResponse.json({ error: "Missing scan" }, { status: 400 });
  }

  try {
    // Build the codebase context when AI is on and we have a repo URL.
    // This is what the policy generators use to draft repo-tailored docs.
    let codebase = undefined;
    if (aiEnabled && body.repoUrl) {
      try {
        codebase = await buildCodebaseContext(body.repoUrl);
      } catch (err) {
        // Codebase fetch failed — log it but don't block the ZIP. The
        // generators will fall back to static templates.
        const message = err instanceof Error ? err.message : "unknown";
        console.warn("[/api/generate] codebase context failed, falling back to static:", message);
      }
    }

    const fixes = await generateFixes({
      scan: body.scan,
      projectName: body.projectName,
      contactEmail: body.contactEmail,
      codebase,
    });

    if (fixes.length === 0) {
      return NextResponse.json(
        { error: "No fixes to generate. Your repo is already in great shape." },
        { status: 400 }
      );
    }

    const zipBlob = await buildFixesZip({
      fixes,
      repoName: body.scan.repo.name,
    });

    const buffer = Buffer.from(await zipBlob.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="shipready-${body.scan.repo.name}-fixes.zip"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
