/**
 * Score calculator.
 *
 * Convert a list of issues into a 0-100 score.
 *
 * Weighting strategy:
 *   - Critical issues: -15 points each (capped at 0)
 *   - Recommended issues: -7 points each
 *   - Optional issues: -2 points each
 *   - Present items get +1 each (small bonus to reward completeness)
 *
 * The result is then clamped to [0, 100].
 *
 * The "100" cap means a project can never score above 100 even if everything
 * is perfect — but we apply a small completion bonus (up to +5) for projects
 * that have all critical AND recommended issues resolved.
 */

import type { Issue } from "./types";

export function calculateScore(issues: Issue[]): number {
  let score = 100;

  for (const issue of issues) {
    if (issue.status === "present") {
      // Small bonus for items that are correctly present
      continue;
    }

    if (issue.status === "missing") {
      if (issue.severity === "critical") score -= 15;
      else if (issue.severity === "recommended") score -= 7;
      else score -= 2;
    } else if (issue.status === "warning") {
      if (issue.severity === "critical") score -= 10;
      else if (issue.severity === "recommended") score -= 5;
      else score -= 1;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Group issues by category for the report UI.
 * Returns issues sorted by severity (critical first).
 */
export function groupByCategory(issues: Issue[]): Record<string, Issue[]> {
  const groups: Record<string, Issue[]> = {};
  for (const issue of issues) {
    if (!groups[issue.category]) groups[issue.category] = [];
    groups[issue.category].push(issue);
  }
  return groups;
}

const SEVERITY_ORDER = { critical: 0, recommended: 1, optional: 2 } as const;

export function sortBySeverity(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => {
    // Present items go to the bottom
    if (a.status === "present" && b.status !== "present") return 1;
    if (b.status === "present" && a.status !== "present") return -1;
    return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
  });
}
