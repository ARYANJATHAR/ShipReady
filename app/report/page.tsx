"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  XCircle,
  Loader2,
} from "lucide-react";
import { GithubIcon } from "@/components/social-icons";
import { cn } from "@/lib/utils";
import type { ScanResult, Issue } from "@/engine/src";

function ReportContent() {
  const searchParams = useSearchParams();
  const repo = searchParams.get("repo") || "";
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repo) {
      setError("No repo specified");
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
        body: JSON.stringify({
          repoUrl: repo,
          context: {
            collectsEmails: false,
            processesPayments: false,
            servesEuUsers: true,
            usesCookies: false,
            businessType: "other",
            region: "global",
          },
        }),
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

  if (error) {
    return (
      <main className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 bg-grid z-0" />
        <div className="relative z-10 max-w-md mx-auto px-6 text-center">
          <XCircle className="w-12 h-12 text-[#f87171] mx-auto mb-4" strokeWidth={1.5} />
          <h1 className="font-display text-3xl mb-3">Report unavailable</h1>
          <p className="text-foreground-muted mb-6 font-mono text-sm">{error}</p>
          <Link href="/" className="px-4 py-2 rounded-lg bg-accent text-accent-foreground inline-block">
            Scan your own repo
          </Link>
        </div>
      </main>
    );
  }

  if (!scan) {
    return (
      <main className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 bg-grid z-0" />
        <div className="hero-glow" />
        <div className="relative z-10 text-center">
          <Loader2 className="w-10 h-10 text-accent mx-auto mb-6 animate-spin" strokeWidth={1.5} />
          <h1 className="font-display text-3xl">Generating report</h1>
          <p className="text-sm font-mono text-foreground-dim mt-2">{repo}</p>
        </div>
      </main>
    );
  }

  const critical = scan.issues.filter((i) => i.severity === "critical" && i.status !== "present");
  const recommended = scan.issues.filter((i) => i.severity === "recommended" && i.status !== "present");
  const optional = scan.issues.filter((i) => i.severity === "optional" && i.status !== "present");

  const badgeUrl = `/api/badge?repo=${encodeURIComponent(repo)}`;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-grid z-0" />
      <div className="hero-glow" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background-elevated/40 mb-6 flex-wrap justify-center">
            <GithubIcon className="w-3.5 h-3.5" />
            <span className="text-xs font-mono text-foreground">
              {scan.repo.owner}/{scan.repo.name}
            </span>
            {scan.repo.framework !== "unknown" && (
              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                {scan.repo.framework}
              </span>
            )}
          </div>
          <p className="font-mono text-xs uppercase tracking-wider text-foreground-dim mb-3">
            Production readiness report
          </p>
          <h1 className="font-display text-6xl tracking-[-0.02em] leading-[1.05] mb-6">
            <span className="italic-accent text-gradient-accent">{scan.score}</span>
            <span className="text-foreground-dim"> / 100</span>
          </h1>
          <p className="text-foreground-muted max-w-md mx-auto">
            Scanned by{" "}
            <Link href="/" className="text-accent hover:underline">
              ShipReady
            </Link>{" "}
            in {scan.durationMs}ms · {scan.repo.fileCount} files
          </p>
        </div>

        <div className="mb-12 p-6 rounded-2xl border border-border bg-background-elevated/30 text-center">
          <p className="font-mono text-xs uppercase tracking-wider text-foreground-dim mb-3">
            README badge
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <code className="text-xs sm:text-sm font-mono px-3 py-1.5 rounded bg-background break-all">
              ![ShipReady]({typeof window !== "undefined" ? window.location.origin : ""}{badgeUrl})
            </code>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={badgeUrl} alt={`ShipReady score: ${scan.score}/100`} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-12">
          <SummaryStat label="Critical" value={critical.length} tone="danger" />
          <SummaryStat label="Recommended" value={recommended.length} tone="warning" />
          <SummaryStat label="Optional" value={optional.length} tone="muted" />
        </div>

        <div className="mb-12">
          <h2 className="font-mono text-sm uppercase tracking-wider text-foreground-dim mb-4">
            Top issues
          </h2>
          <div className="space-y-2">
            {[...critical, ...recommended].slice(0, 8).map((issue) => (
              <PublicIssueRow key={issue.id} issue={issue} />
            ))}
          </div>
        </div>

        <div className="p-8 rounded-2xl border border-accent/30 bg-accent/5 text-center">
          <h3 className="font-display text-3xl tracking-tight mb-2">
            Want this for your repo?
          </h3>
          <p className="text-foreground-muted mb-6 max-w-md mx-auto">
            ShipReady scans any public GitHub repo in seconds and gives you
            context-aware fixes — auto-generated, ready to commit.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-accent text-accent-foreground font-medium hover:brightness-110 transition-all"
          >
            Scan your repo →
          </Link>
        </div>
      </div>
    </main>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "danger" | "warning" | "muted";
}) {
  return (
    <div className="p-4 rounded-xl border border-border bg-background-elevated/30">
      <div className="text-xs font-mono uppercase tracking-wider text-foreground-dim mb-1">
        {label}
      </div>
      <div
        className={cn(
          "font-display text-3xl tabular-nums",
          tone === "danger" ? "text-[#f87171]" : tone === "warning" ? "text-[#facc15]" : "text-foreground"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function PublicIssueRow({ issue }: { issue: Issue }) {
  const isCritical = issue.severity === "critical";
  return (
    <div
      className={cn(
        "p-3 rounded-xl border",
        isCritical
          ? "border-[#f87171]/30 bg-[#f87171]/5"
          : "border-border bg-background-elevated/40"
      )}
    >
      <div className="flex items-start gap-3">
        {isCritical ? (
          <XCircle className="w-4 h-4 text-[#f87171] flex-shrink-0 mt-0.5" strokeWidth={2} />
        ) : (
          <AlertTriangle className="w-4 h-4 text-[#facc15] flex-shrink-0 mt-0.5" strokeWidth={2} />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground text-sm">{issue.title}</h3>
          <p className="text-xs text-foreground-muted mt-1 line-clamp-2">{issue.description}</p>
        </div>
      </div>
    </div>
  );
}

export default function PublicReportPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
        </main>
      }
    >
      <ReportContent />
    </Suspense>
  );
}
