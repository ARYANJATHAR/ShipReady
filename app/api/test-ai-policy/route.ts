/**
 * Dev-only test endpoint for the AI policy generators.
 *
 * Usage: POST /api/test-ai-policy  body: { repoUrl: string, kind?: "privacy" | "terms" | "cookies" }
 *
 * Returns: { ok, text, model, durationMs, repoInfo, fallback? }
 *
 * Useful for manually verifying the AI path during development. Returns
 * 404 in production. Safe to keep in the codebase.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildCodebaseContext } from "@/engine/src/codebase-context";
import { makeContext } from "@/engine/src/context";
import { aiEnabled, defaultModel } from "@/lib/ai";
import {
  generatePrivacyPolicyWithAI,
  generateTermsWithAI,
  generateCookiePolicyWithAI,
} from "@/engine/src/generators/_ai-prompts";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  if (!aiEnabled) {
    return NextResponse.json({ error: "AI not enabled (missing AI_API_KEY)" }, { status: 400 });
  }

  let body: { repoUrl?: string; kind?: "privacy" | "terms" | "cookies" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const repoUrl = body.repoUrl || "https://github.com/withastro/astro";
  const kind = body.kind || "privacy";

  const t0 = Date.now();
  const codebase = await buildCodebaseContext(repoUrl);
  const projectContext = makeContext({
    collectsEmails: true,
    processesPayments: false,
    servesEuUsers: true,
    usesCookies: true,
    businessType: "saas",
    region: codebase.region,
  });
  const contactEmail = codebase.contactEmail || "privacy@" + codebase.projectName + ".dev";
  const projectName = codebase.projectDisplayName;

  let result: { ok: true; text: string; model: string } | { ok: false; reason: string; model: string; raw?: string };
  if (kind === "privacy") {
    result = await generatePrivacyPolicyWithAI({
      projectName,
      contactEmail,
      description: codebase.description,
      projectContext,
      codebase,
    });
  } else if (kind === "terms") {
    result = await generateTermsWithAI({
      projectName,
      contactEmail,
      description: codebase.description,
      projectContext,
      codebase,
    });
  } else {
    result = await generateCookiePolicyWithAI({
      projectName,
      contactEmail,
      projectContext,
      codebase,
    });
  }

  return NextResponse.json({
    repoInfo: {
      projectName: codebase.projectName,
      projectDisplayName: codebase.projectDisplayName,
      description: codebase.description,
      region: codebase.region,
      framework: codebase.framework,
    },
    kind,
    durationMs: Date.now() - t0,
    ...result,
    // Debug fields: include the raw LLM text even when validation fails
    // (so we can see why a call is being rejected). Test endpoint only.
    _debug: {
      resultText: "ok" in result && result.ok ? result.text : undefined,
    },
  });
}
