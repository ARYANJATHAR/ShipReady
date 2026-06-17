/**
 * Generate a deterministic short ID for a public report.
 *
 * We hash the repo URL + context (just the framework detection doesn't
 * matter — context affects generated policy text but the *score* is
 * repo-content-only). For now, just hash the repo URL.
 *
 * Output: 8-char base36 string. Collisions are possible (~1 in 2 billion)
 * but acceptable for v1. We can switch to a counter-based scheme later.
 */

export function reportIdForRepo(repoUrl: string): string {
  let hash = 0;
  for (let i = 0; i < repoUrl.length; i++) {
    const char = repoUrl.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  // Convert to unsigned base36
  return (hash >>> 0).toString(36).padStart(8, "0").slice(0, 8);
}
