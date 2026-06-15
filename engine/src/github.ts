/**
 * Minimal GitHub API client for scanning public repos.
 *
 * No auth required for public repos — uses unauthenticated REST API.
 * Rate limit: 60 requests/hour per IP. We minimize calls by:
 *  1. Fetching the full tree in a single recursive call.
 *  2. Only fetching file contents for files we actually need to inspect
 *     (package.json, layout files, etc.).
 *
 * For v1 this is fine. For v2, add token-based auth to lift the rate limit.
 */

import type { RepoFile, RepoTree } from "./types";

const GITHUB_API = "https://api.github.com";

export class GitHubError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "GitHubError";
  }
}

export interface ParsedRepoUrl {
  owner: string;
  name: string;
  isValid: boolean;
}

/**
 * Parse a GitHub URL like:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   github.com/owner/repo
 *   owner/repo
 */
export function parseRepoUrl(input: string): ParsedRepoUrl {
  const trimmed = input.trim();
  // Strip protocol + domain
  const cleaned = trimmed
    .replace(/^https?:\/\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");

  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length < 2) {
    return { owner: "", name: "", isValid: false };
  }

  return {
    owner: parts[0],
    name: parts[1],
    isValid: /^[a-zA-Z0-9._-]+$/.test(parts[0]) && /^[a-zA-Z0-9._-]+$/.test(parts[1]),
  };
}

/**
 * Fetch the default branch for a repo.
 */
export async function getDefaultBranch(owner: string, name: string): Promise<string> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${name}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    throw new GitHubError(`Failed to fetch repo info: ${res.statusText}`, res.status);
  }
  const data = await res.json();
  return data.default_branch || "main";
}

/**
 * Fetch the full recursive file tree for a repo's default branch.
 * Returns one entry per file/dir at any depth.
 *
 * NOTE: For repos with >100k files, this can return `truncated: true`.
 * For v1 we don't handle that — we just log a warning.
 */
export async function getRepoTree(owner: string, name: string, branch: string): Promise<RepoTree> {
  const url = `${GITHUB_API}/repos/${owner}/${name}/git/trees/${branch}?recursive=1`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    throw new GitHubError(
      `Failed to fetch file tree: ${res.statusText} (${res.status})`,
      res.status
    );
  }
  const data = await res.json();

  if (data.truncated) {
    console.warn(`[github] Tree for ${owner}/${name} was truncated (repo too large)`);
  }

  const files: RepoFile[] = (data.tree || [])
    .filter((entry: { type: string }) => entry.type === "blob" || entry.type === "tree")
    .map((entry: { path: string; type: "blob" | "tree"; size?: number; sha: string }) => ({
      path: entry.path,
      type: entry.type === "tree" ? "dir" : "file",
      size: entry.size,
      sha: entry.sha,
    }));

  return {
    owner,
    name,
    defaultBranch: branch,
    commitSha: data.sha,
    files,
  };
}

/**
 * Fetch the raw text contents of a single file.
 * Returns null if the file doesn't exist (404).
 */
export async function getFileContent(
  owner: string,
  name: string,
  branch: string,
  path: string
): Promise<string | null> {
  const url = `${GITHUB_API}/repos/${owner}/${name}/contents/${path}?ref=${branch}`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github.raw" },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new GitHubError(`Failed to fetch ${path}: ${res.statusText}`, res.status);
  }
  return res.text();
}

/**
 * Fetch multiple files in parallel, skipping any that 404.
 * Returns a Map of path → content.
 */
export async function getFileContents(
  owner: string,
  name: string,
  branch: string,
  paths: string[]
): Promise<Map<string, string | null>> {
  const results = await Promise.allSettled(
    paths.map((p) => getFileContent(owner, name, branch, p))
  );
  const map = new Map<string, string | null>();
  paths.forEach((p, i) => {
    const result = results[i];
    map.set(p, result.status === "fulfilled" ? result.value : null);
  });
  return map;
}
