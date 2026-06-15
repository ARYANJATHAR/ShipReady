import { NextRequest, NextResponse } from "next/server";
import { generateFixes, buildFixesZip, type ScanResult } from "@/engine/src";

export const runtime = "nodejs";

/**
 * POST /api/generate
 *
 * Body: {
 *   scan: ScanResult,
 *   projectName?: string,
 *   contactEmail?: string
 * }
 *
 * Returns: a ZIP file containing all generated fixes
 */
export async function POST(req: NextRequest) {
  let body: {
    scan?: ScanResult;
    projectName?: string;
    contactEmail?: string;
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
    const fixes = generateFixes({
      scan: body.scan,
      projectName: body.projectName,
      contactEmail: body.contactEmail,
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
