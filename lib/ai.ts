/**
 * AI provider — single OpenAI-compatible client.
 *
 * Works against any OpenAI-compatible endpoint. Default is TokenRouter
 * (https://tokenrouter.io), which exposes a unified API across many model
 * providers (OpenAI, Anthropic, Google, Meta, etc.) behind one key.
 *
 * Configuration is via env vars:
 *   AI_API_KEY    — required to enable. Blank = AI off, static templates used.
 *   AI_BASE_URL   — defaults to https://api.tokenrouter.io/v1
 *   AI_MODEL      — defaults to MiniMax-M3 (TokenRouter's flagship model)
 *
 * Usage:
 *   import { ai, aiEnabled, defaultModel } from "@/lib/ai";
 *   if (aiEnabled) {
 *     const completion = await ai.chat.completions.create({
 *       model: defaultModel,
 *       messages: [{ role: "user", content: "Hello" }],
 *     });
 *   }
 *
 * The `ai` client is always safe to construct (it uses a placeholder key
 * if AI_API_KEY is unset), so importing it never throws. The `aiEnabled`
 * flag is what callers should check before making a request.
 */

import OpenAI from "openai";

const apiKey = process.env.AI_API_KEY?.trim();
const baseURL = process.env.AI_BASE_URL?.trim() || "https://api.tokenrouter.io/v1";
const model = process.env.AI_MODEL?.trim() || "MiniMax-M3";

/** True if a real API key is configured. When false, callers should skip AI calls. */
export const aiEnabled = !!apiKey && apiKey.length > 0;

/** Default model to use. Configurable via AI_MODEL. */
export const defaultModel = model;

/** The base URL we're talking to. Surfaced in /api/ai-status. */
export const aiBaseUrl = baseURL;

/** Which provider we're using (derived from the base URL, for display). */
export const aiProvider = baseUrlToProvider(baseURL);

/**
 * Singleton OpenAI client.
 *
 * We always construct this, even when AI is disabled, so imports never
 * fail. The placeholder key is only used if someone tries to make a call
 * without checking `aiEnabled` first.
 */
export const ai = new OpenAI({
  apiKey: apiKey || "sk-placeholder-not-used",
  baseURL,
  // Some gateways want a longer timeout than OpenAI's default
  timeout: 30_000,
  maxRetries: 2,
});

/**
 * Derive a human-readable provider name from the base URL.
 * Used purely for the UI badge ("via TokenRouter", "via OpenAI", etc.)
 */
function baseUrlToProvider(url: string): string {
  const host = url.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  if (host.includes("tokenrouter")) return "TokenRouter";
  if (host.includes("openrouter")) return "OpenRouter";
  if (host.includes("openai.com")) return "OpenAI";
  if (host.includes("anthropic.com")) return "Anthropic";
  if (host.includes("googleapis.com") || host.includes("google")) return "Google";
  if (host.includes("nvidia")) return "NVIDIA";
  return host || "custom";
}
