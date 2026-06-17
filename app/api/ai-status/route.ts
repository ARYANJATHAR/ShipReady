/**
 * GET /api/ai-status
 *
 * Returns the current AI configuration so the UI can show a small badge
 * ("AI mode · TokenRouter · MiniMax-M3" or "Static templates").
 *
 * Public endpoint — returns no secrets. Just enough info for the UI to
 * know whether to render the AI-mode banner.
 */

import { NextResponse } from "next/server";
import { aiEnabled, defaultModel, aiBaseUrl, aiProvider } from "@/lib/ai";
import { cacheSize } from "@/lib/ai/cache";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    enabled: aiEnabled,
    model: defaultModel,
    baseUrl: aiBaseUrl,
    provider: aiProvider,
    cacheSize: cacheSize(),
  });
}
