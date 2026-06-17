/**
 * AI prompt helper — wraps chat.completions with caching, error handling,
 * and a uniform return shape.
 *
 * Why this exists:
 *   - Centralizes the "check aiEnabled, hit cache, call API, cache result"
 *     dance so callers don't repeat it.
 *   - Forces a uniform return type so callers can always check `.ok`.
 *   - Trims accidental provider quirks (e.g. gateways that return usage
 *     fields differently).
 *
 * Usage:
 *   import { runPrompt } from "@/lib/ai/prompt";
 *   const result = await runPrompt({
 *     system: "You write privacy policies.",
 *     user: "Draft a policy for ...",
 *     temperature: 0.2,
 *   });
 *   if (result.ok) {
 *     console.log(result.text);
 *   } else {
 *     // fall back to static template
 *   }
 */

import { ai, aiEnabled, defaultModel } from "../ai";
import { cacheGet, cacheKey, cacheSet } from "./cache";

export interface RunPromptInput {
  /** System prompt. Optional. */
  system?: string;
  /** User prompt. Required. */
  user: string;
  /** Model to use. Defaults to the configured defaultModel. */
  model?: string;
  /** 0 = deterministic, 1 = creative. Default 0.2 (slightly creative but mostly factual). */
  temperature?: number;
  /** Max output tokens. Default 2000. */
  maxTokens?: number;
  /** Skip the cache (read AND write). Useful for tests. */
  noCache?: boolean;
}

export type RunPromptResult =
  | { ok: true; text: string; cached: boolean; model: string }
  | { ok: false; error: string; model: string };

/**
 * Run a prompt and return the model's text response.
 *
 * Behavior:
 *   - If `aiEnabled` is false, returns `{ ok: false, error: "ai_disabled" }`
 *     immediately. Callers should fall back to static templates.
 *   - On cache hit, returns the cached text (no API call).
 *   - On cache miss, calls the API and stores the result.
 *   - On API error (network, 4xx, 5xx), returns `{ ok: false, error: ... }`.
 *   - Never throws — callers can safely `if (result.ok)`.
 */
export async function runPrompt(input: RunPromptInput): Promise<RunPromptResult> {
  if (!aiEnabled) {
    return { ok: false, error: "ai_disabled", model: input.model ?? defaultModel };
  }

  const model = input.model ?? defaultModel;
  const temperature = input.temperature ?? 0.2;
  const maxTokens = input.maxTokens ?? 2000;

  // 1. Cache lookup
  let key: string | null = null;
  if (!input.noCache) {
    key = await cacheKey({
      model,
      system: input.system,
      user: input.user,
      temperature,
    });
    const cached = cacheGet(key);
    if (cached !== undefined) {
      return { ok: true, text: cached, cached: true, model };
    }
  }

  // 2. Live call
  try {
    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (input.system) messages.push({ role: "system", content: input.system });
    messages.push({ role: "user", content: input.user });

    const completion = await ai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const trimmed = text.trim();

    if (!trimmed) {
      return { ok: false, error: "empty_response", model };
    }

    // 3. Cache write
    if (!input.noCache && key) {
      cacheSet(key, trimmed);
    }

    return { ok: true, text: trimmed, cached: false, model };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    // Don't cache failures — the next call might succeed
    return { ok: false, error: message, model };
  }
}

/**
 * Run a prompt and ask for JSON back. Validates that the response is
 * valid JSON before returning. On failure, returns the raw text in `parseError`
 * so callers can decide what to do (e.g. fall back, retry).
 */
export async function runPromptJson<T = unknown>(
  input: RunPromptInput
): Promise<
  | { ok: true; data: T; cached: boolean; model: string }
  | { ok: false; error: string; raw?: string; model: string }
> {
  const result = await runPrompt(input);
  if (!result.ok) return { ok: false, error: result.error, model: result.model };

  // Try strict JSON first
  try {
    const data = JSON.parse(result.text) as T;
    return { ok: true, data, cached: result.cached, model: result.model };
  } catch {
    // Some models wrap JSON in ```json ... ``` blocks. Strip and retry.
    const fenced = result.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    try {
      const data = JSON.parse(fenced) as T;
      return { ok: true, data, cached: result.cached, model: result.model };
    } catch {
      return {
        ok: false,
        error: "json_parse_failed",
        raw: result.text,
        model: result.model,
      };
    }
  }
}
