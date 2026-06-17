/**
 * In-memory LRU cache for AI responses.
 *
 * Why cache: a popular repo scanned 1000x/day would burn through LLM
 * credits. We cache the *result* of identical prompts for 24h.
 *
 * Key = sha256(model + system prompt + user prompt + temperature)
 * Value = the completion text + a timestamp for TTL eviction.
 *
 * The cache is process-local (not shared between serverless instances),
 * which is fine for v1: each Vercel function gets warm and serves many
 * requests, and the LRU prunes itself under memory pressure.
 *
 * For a multi-instance setup, swap this for Redis in a later phase.
 */

interface CacheEntry {
  text: string;
  expiresAt: number;
}

const MAX_ENTRIES = 100;
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Use a Map (insertion-ordered) so we can pop the oldest on overflow.
const store = new Map<string, CacheEntry>();

/** Get a cached response, or undefined if missing/expired. */
export function cacheGet(key: string): string | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  // LRU bump — re-insert so this entry is now "most recent"
  store.delete(key);
  store.set(key, entry);
  return entry.text;
}

/** Store a response. Evicts the oldest entry if at capacity. */
export function cacheSet(key: string, text: string): void {
  if (store.has(key)) store.delete(key);
  store.set(key, { text, expiresAt: Date.now() + TTL_MS });
  if (store.size > MAX_ENTRIES) {
    // First key in a Map is the oldest (insertion-ordered)
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
}

/** Hash a request into a stable cache key. */
export async function cacheKey(parts: {
  model: string;
  system?: string;
  user: string;
  temperature?: number;
}): Promise<string> {
  const raw = JSON.stringify({
    model: parts.model,
    system: parts.system ?? "",
    user: parts.user,
    temperature: parts.temperature ?? 0.2,
  });
  const enc = new TextEncoder().encode(raw);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Drop everything (useful for tests or manual cache invalidation). */
export function cacheClear(): void {
  store.clear();
}

/** Inspect cache size (for /api/ai-status debugging). */
export function cacheSize(): number {
  return store.size;
}
