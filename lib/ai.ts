/**
 * AI provider — single OpenAI-compatible client for OpenCode Zen.
 *
 * Works against OpenCode Zen's OpenAI-compatible endpoint.
 * Default is OpenCode Zen with auto-detected free model.
 *
 * Configuration is via env vars:
 *   AI_API_KEY     — required. Get from https://opencode.ai/auth
 *   AI_BASE_URL    — defaults to https://opencode.ai/zen/v1
 *   AI_MODEL       — defaults to auto-detected best free model
 *
 * Free models available on OpenCode Zen:
 *   - Big Pickle
 *   - DeepSeek V4 Flash Free
 *   - MiMo-V2.5 Free
 *   - North Mini Code Free
 *   - Nemotron 3 Ultra Free
 *
 * Usage:
 *   import { ai, aiEnabled, defaultModel } from "@/lib/ai";
 *   if (aiEnabled) {
 *     const completion = await ai.chat.completions.create({
 *       model: defaultModel,
 *       messages: [{ role: "user", content: "Hello" }],
 *     });
 *   }
 */

import OpenAI from "openai";

const apiKey = process.env.AI_API_KEY?.trim();
const baseURL = process.env.AI_BASE_URL?.trim() || "https://opencode.ai/zen/v1";

/** True if a real API key is configured. When false, callers should skip AI calls. */
export const aiEnabled = !!apiKey && apiKey.length > 0;

/** OpenCode Zen model metadata endpoint */
const MODELS_URL = `${baseURL.replace(/\/$/, "")}/models`;

/** Known free models on OpenCode Zen */
const FREE_MODELS = [
  "big-pickle",
  "deepseek-v4-flash-free",
  "mimo-v2.5-free",
  "north-mini-code-free",
  "nemotron-3-ultra-free",
] as const;

/** Auto-detect the best available free model from OpenCode Zen */
async function detectBestFreeModel(): Promise<string> {
  try {
    const res = await fetch(MODELS_URL, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    });
    if (!res.ok) {
      console.warn(`[ai] Failed to fetch models from ${MODELS_URL}: ${res.status}`);
      return FREE_MODELS[0];
    }
    const data = await res.json();
    // OpenCode Zen returns models in various formats — try to find free ones
    const modelList: string[] = [];
    if (data.data && Array.isArray(data.data)) {
      for (const m of data.data) {
        const id = typeof m === "string" ? m : m.id;
        if (id) modelList.push(id.toLowerCase());
      }
    }

    // Find first free model that exists in the list
    for (const freeModel of FREE_MODELS) {
      if (modelList.some((id) => id.includes(freeModel.replace(/-/g, "")))) {
        return freeModel;
      }
      // Also try exact match
      if (modelList.includes(freeModel)) {
        return freeModel;
      }
    }

    // Default to first free model if none found
    console.warn("[ai] No free model found in OpenCode Zen list, using default");
    return FREE_MODELS[0];
  } catch (err) {
    console.warn(`[ai] Error fetching models, using default: ${err}`);
    return FREE_MODELS[0];
  }
}

// Cache the detected model
let _cachedModel: string | null = null;
let _modelPromise: Promise<string> | null = null;

export function getDefaultModel(): string {
  return process.env.AI_MODEL?.trim() || FREE_MODELS[0];
}

export async function getDefaultModelAsync(): Promise<string> {
  if (_cachedModel) return _cachedModel;
  if (!_modelPromise) {
    _modelPromise = detectBestFreeModel().then((m) => {
      _cachedModel = m;
      return m;
    });
  }
  return _modelPromise;
}

/** Default model to use. Use getDefaultModelAsync() for auto-detection. */
export const defaultModel = process.env.AI_MODEL?.trim() || FREE_MODELS[0];

/** The base URL we're talking to. Surfaced in /api/ai-status. */
export const aiBaseUrl = baseURL;

/** Which provider we're using */
export const aiProvider = "OpenCode Zen";

/**
 * Singleton OpenAI client.
 */
export const ai = new OpenAI({
  apiKey: apiKey || "sk-placeholder-not-used",
  baseURL,
  timeout: 120_000,
  maxRetries: 1,
});

/**
 * Check if a model is a known free model on OpenCode Zen.
 */
export function isFreeModel(model: string): boolean {
  const lower = model.toLowerCase();
  return FREE_MODELS.some((m) => lower.includes(m) || m.includes(lower));
}

/**
 * Get list of known free models.
 */
export function getFreeModels(): readonly string[] {
  return FREE_MODELS;
}
