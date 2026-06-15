/**
 * Compute a simple line-based diff between before and after text.
 * Returns a list of "chunks" with a kind (add/remove/context) and lines.
 *
 * This is a minimal LCS-based diff, not Myers or anything fancy.
 * Good enough for showing diffs in the UI.
 */

export type DiffLine = {
  type: "add" | "remove" | "context";
  text: string;
};

export type DiffChunk = {
  /** Lines that were added */
  added: number;
  /** Lines that were removed */
  removed: number;
  /** The lines themselves */
  lines: DiffLine[];
};

/**
 * Compute the diff between two strings, line-by-line.
 */
export function computeDiff(before: string, after: string): DiffChunk {
  const a = before.split("\n");
  const b = after.split("\n");

  // Build LCS table
  const m = a.length;
  const n = b.length;
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }

  // Walk the table to produce diff
  const lines: DiffLine[] = [];
  let i = m;
  let j = n;
  let added = 0;
  let removed = 0;

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lines.unshift({ type: "context", text: a[i - 1] });
      i--;
      j--;
    } else if (lcs[i - 1][j] >= lcs[i][j - 1]) {
      lines.unshift({ type: "remove", text: a[i - 1] });
      removed++;
      i--;
    } else {
      lines.unshift({ type: "add", text: b[j - 1] });
      added++;
      j--;
    }
  }

  while (i > 0) {
    lines.unshift({ type: "remove", text: a[i - 1] });
    removed++;
    i--;
  }
  while (j > 0) {
    lines.unshift({ type: "add", text: b[j - 1] });
    added++;
    j--;
  }

  return { added, removed, lines };
}
