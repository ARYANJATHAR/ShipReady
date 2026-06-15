"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  ArrowLeft,
  FileCode,
  FileText,
  Shield,
  Scale,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { GithubIcon } from "@/components/social-icons";
import { cn } from "@/lib/utils";
import type { ScanResult, Issue, Fix } from "@/engine/src";
import { sortBySeverity } from "@/engine/src";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  legal: Scale,
  secrets: Shield,
  license: FileText,
  seo: FileCode,
  errors: AlertOctagon,
  security: Shield,
  meta: FileCode,
  a11y: FileText,
  "broken-links": AlertTriangle,
  performance: FileCode,
};

const CATEGORY_LABELS: Record<string, string> = {
  legal: "Legal",
  secrets: "Secrets",
  license: "License",
  seo: "SEO",
  errors: "Errors",
  security: "Security",
  meta: "Meta",
  a11y: "Accessibility",
  "broken-links": "Broken Links",
  performance: "Performance",
};

function ScanPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const repoUrl = searchParams.get("repo") || "";
  const contextParam = searchParams.get("context") || "{}";
  const context = JSON.parse(contextParam);

  const [scan, setScan] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!repoUrl) {
      router.push("/");
      return;
    }
    runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runScan() {
    setError(null);
    setScan(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, context }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Scan failed");
      }
      const data: ScanResult = await res.json();
      setScan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function downloadZip() {
    if (!scan) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shipready-${scan.repo.name}-fixes.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  if (error) {
    return (
      <main className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 bg-grid z-0" />
        <div className="relative z-10 max-w-md mx-auto px-6 text-center">
          <XCircle className="w-12 h-12 text-[#f87171] mx-auto mb-4" strokeWidth={1.5} />
          <h1 className="font-display text-3xl mb-3">Scan failed</h1>
          <p className="text-foreground-muted mb-6 font-mono text-sm">{error}</p>
          <div className="flex gap-2 justify-center">
            <Link
              href="/"
              className="px-4 py-2 rounded-lg border border-border hover:bg-background-elevated"
            >
              Try a different repo
            </Link>
            <button
              onClick={runScan}
              className="px-4 py-2 rounded-lg bg-accent text-accent-foreground"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!scan) {
    return <ScanningState repoUrl={repoUrl} />;
  }

  const critical = scan.issues.filter(
    (i) => i.severity === "critical" && i.status !== "present"
  );
  const missingCount = scan.issues.filter((i) => i.status === "missing").length;
  const warningCount = scan.issues.filter((i) => i.status === "warning").length;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-grid z-0" />
      <div className="hero-glow" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            Scan a different repo
          </Link>

          <div className="flex items-start justify-between gap-8 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background-elevated/40 mb-4">
                <GithubIcon className="w-3.5 h-3.5" />
                <span className="text-xs font-mono text-foreground">
                  {scan.repo.owner}/{scan.repo.name}
                </span>
                <span className="text-xs font-mono text-foreground-dim">
                  · {scan.repo.fileCount} files
                </span>
              </div>
              <h1 className="font-display text-5xl tracking-[-0.02em] leading-[1.05]">
                {scan.score === 100 ? (
                  <>
                    You're{" "}
                    <span className="italic-accent text-gradient-accent">
                      ship ready.
                    </span>
                  </>
                ) : scan.score >= 70 ? (
                  <>
                    Almost{" "}
                    <span className="italic-accent text-gradient-accent">there.</span>
                  </>
                ) : (
                  <>
                    Some{" "}
                    <span className="italic-accent text-foreground-muted">
                      fixes needed.
                    </span>
                  </>
                )}
              </h1>
            </div>

            {/* Score */}
            <ScoreCircle score={scan.score} />
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-12">
          <StatCard
            label="Critical"
            value={critical.length}
            tone={critical.length > 0 ? "danger" : "ok"}
          />
          <StatCard
            label="Missing"
            value={missingCount}
            tone={missingCount > 0 ? "warning" : "ok"}
          />
          <StatCard
            label="Warnings"
            value={warningCount}
            tone={warningCount > 0 ? "warning" : "ok"}
          />
        </div>

        {/* Generate CTA */}
        {missingCount + warningCount > 0 && (
          <div className="mb-12 p-6 rounded-2xl border border-accent/30 bg-accent/5 flex items-center justify-between gap-6 flex-wrap">
            <div>
              <h3 className="font-display text-2xl tracking-tight mb-1">
                Generate {missingCount + warningCount} fix
                {missingCount + warningCount === 1 ? "" : "es"}
              </h3>
              <p className="text-foreground-muted text-sm">
                Download a ZIP with all generated files. Review, customize, commit.
              </p>
            </div>
            <button
              onClick={downloadZip}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent text-accent-foreground font-medium hover:brightness-110 transition-all disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" strokeWidth={2} />
                  Download ZIP
                </>
              )}
            </button>
          </div>
        )}

        {/* Issues by category */}
        <div className="space-y-8">
          {Object.entries(groupIssuesByCategory(scan.issues)).map(([cat, issues]) => {
            const Icon = CATEGORY_ICONS[cat] || FileCode;
            const label = CATEGORY_LABELS[cat] || cat;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon className="w-4 h-4 text-foreground-muted" strokeWidth={1.5} />
                  <h2 className="font-mono text-sm uppercase tracking-wider text-foreground-dim">
                    {label}
                  </h2>
                  <span className="text-xs font-mono text-foreground-dim">
                    ({issues.filter((i) => i.status !== "present").length})
                  </span>
                </div>
                <div className="space-y-2">
                  {sortBySeverity(issues).map((issue) => (
                    <IssueRow key={issue.id} issue={issue} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 pt-8 border-t border-border flex items-center justify-between text-xs font-mono text-foreground-dim">
          <span>
            Scan completed in {scan.durationMs}ms · commit {scan.repo.commitSha.slice(0, 7)}
          </span>
          <Link href="/" className="hover:text-foreground">
            Run another scan →
          </Link>
        </div>
      </div>
    </main>
  );
}

function ScanningState({ repoUrl }: { repoUrl: string }) {
  const [stage, setStage] = useState(0);
  const stages = [
    "Fetching repository tree...",
    "Detecting framework...",
    "Running legal scanner...",
    "Running secrets scanner...",
    "Running license scanner...",
    "Computing score...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((s) => Math.min(s + 1, stages.length - 1));
    }, 800);
    return () => clearInterval(interval);
  }, [stages.length]);

  return (
    <main className="relative min-h-screen flex items-center justify-center">
      <div className="absolute inset-0 bg-grid z-0" />
      <div className="hero-glow" />
      <div className="relative z-10 text-center max-w-md mx-auto px-6">
        <Loader2 className="w-10 h-10 text-accent mx-auto mb-6 animate-spin" strokeWidth={1.5} />
        <h1 className="font-display text-3xl mb-2">Scanning</h1>
        {repoUrl && (
          <p className="text-sm font-mono text-foreground-dim mb-8">{repoUrl}</p>
        )}
        <div className="space-y-1 text-sm font-mono text-foreground-muted">
          {stages.map((s, i) => (
            <div
              key={s}
              className={cn(
                "transition-opacity duration-300",
                i <= stage ? "opacity-100" : "opacity-30"
              )}
            >
              {i < stage ? "✓" : i === stage ? "→" : "·"} {s}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const isPerfect = score === 100;
  const isGood = score >= 70;
  return (
    <div className="relative w-32 h-32 flex-shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-background-subtle"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 45}`}
          initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
          animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - score / 100) }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className={
            isPerfect ? "text-accent" : isGood ? "text-accent" : "text-[#facc15]"
          }
          style={isPerfect ? { filter: "drop-shadow(0 0 6px var(--accent))" } : undefined}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-display text-3xl tabular-nums tracking-tight",
            isPerfect ? "text-gradient-accent" : "text-foreground"
          )}
        >
          {score}
        </span>
        <span className="text-[10px] font-mono text-foreground-dim">/ 100</span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "warning" | "danger";
}) {
  return (
    <div className="p-4 rounded-xl border border-border bg-background-elevated/30">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono uppercase tracking-wider text-foreground-dim">
          {label}
        </span>
        {tone === "ok" && <CheckCircle2 className="w-3.5 h-3.5 text-accent" strokeWidth={2} />}
        {tone === "warning" && (
          <AlertTriangle className="w-3.5 h-3.5 text-[#facc15]" strokeWidth={2} />
        )}
        {tone === "danger" && (
          <XCircle className="w-3.5 h-3.5 text-[#f87171]" strokeWidth={2} />
        )}
      </div>
      <div className="font-display text-3xl tabular-nums">{value}</div>
    </div>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const isPresent = issue.status === "present";
  const icon = isPresent ? (
    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" strokeWidth={2} />
  ) : issue.severity === "critical" ? (
    <XCircle className="w-4 h-4 text-[#f87171] flex-shrink-0" strokeWidth={2} />
  ) : (
    <AlertTriangle className="w-4 h-4 text-[#facc15] flex-shrink-0" strokeWidth={2} />
  );

  return (
    <div
      className={cn(
        "p-4 rounded-xl border transition-colors",
        isPresent
          ? "border-border bg-background-elevated/20 opacity-70"
          : issue.severity === "critical"
          ? "border-[#f87171]/30 bg-[#f87171]/5"
          : "border-border bg-background-elevated/40"
      )}
    >
      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-medium text-foreground">{issue.title}</h3>
            <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-dim">
              {isPresent ? "present" : issue.severity}
            </span>
          </div>
          <p className="text-sm text-foreground-muted mt-1 leading-relaxed">
            {issue.description}
          </p>
          {issue.file && (
            <p className="text-xs font-mono text-foreground-dim mt-2">
              {issue.file}
              {issue.line ? `:${issue.line}` : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function groupIssuesByCategory(issues: Issue[]): Record<string, Issue[]> {
  const groups: Record<string, Issue[]> = {};
  for (const issue of issues) {
    if (!groups[issue.category]) groups[issue.category] = [];
    groups[issue.category].push(issue);
  }
  return groups;
}

export default function ScanPage() {
  return (
    <Suspense fallback={<ScanningState repoUrl="" />}>
      <ScanPageContent />
    </Suspense>
  );
}
