/**
 * In-memory LRU cache for CodebaseContext.
 *
 * Keyed by repoUrl (normalized). Building a codebase context involves
 * multiple GitHub API calls (tree + several file fetches), so we cache
 * for 24h to keep scans snappy for repeated visits.
 *
 * Same shape as lib/ai/cache.ts but kept separate because the values
 * are larger (10-50KB) and the access pattern is different.
 */

import type { CodebaseContext } from "@/engine/src/types";

const MAX_ENTRIES = 50;
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface CacheEntry {
  value: CodebaseContext;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

function normalizeKey(repoUrl: string): string {
  return repoUrl.trim().toLowerCase().replace(/\.git$/, "").replace(/\/$/, "");
}

export function codebaseCacheGet(repoUrl: string): CodebaseContext | undefined {
  const key = normalizeKey(repoUrl);
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  // LRU bump
  store.delete(key);
  store.set(key, entry);
  return entry.value;
}

export function codebaseCacheSet(repoUrl: string, value: CodebaseContext): void {
  const key = normalizeKey(repoUrl);
  if (store.has(key)) store.delete(key);
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
  if (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
}

export function codebaseCacheClear(): void {
  store.clear();
}

export function codebaseCacheSize(): number {
  return store.size;
}
