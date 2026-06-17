"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONTEXT_QUESTIONS, REGION_QUESTION, type ProjectContext } from "@/engine/src/context";
import type { BusinessType, Region } from "@/engine/src/types";
import type { Framework } from "@/engine/src/framework";

type FrameworkAnswer = Framework | "unknown";

/**
 * Framework question — separate from CONTEXT_QUESTIONS because:
 *   1. It's repo-specific (only shown when a repo is being scanned)
 *   2. It needs a "detecting..." async state during pre-fill
 *   3. It conceptually belongs to repo metadata, not business/legal context
 */
const FRAMEWORK_OPTIONS: Array<{
  value: FrameworkAnswer;
  label: string;
  description: string;
}> = [
  {
    value: "nextjs",
    label: "Next.js",
    description: "React framework with App Router or Pages Router",
  },
  {
    value: "vite",
    label: "Vite",
    description: "Static or SPA React/Vue/Svelte/etc.",
  },
  {
    value: "astro",
    label: "Astro",
    description: "Content-focused, ships zero JS by default",
  },
  {
    value: "remix",
    label: "Remix",
    description: "Full-stack React, nested routing",
  },
  {
    value: "sveltekit",
    label: "SvelteKit",
    description: "Full-stack Svelte, file-based routing",
  },
  {
    value: "unknown",
    label: "Not sure / other",
    description: "We'll generate generic static files",
  },
];

const FRAMEWORK_LABELS: Record<FrameworkAnswer, string> = FRAMEWORK_OPTIONS.reduce(
  (acc, opt) => ({ ...acc, [opt.value]: opt.label }),
  {} as Record<FrameworkAnswer, string>
);

export default function OnboardPageWrapper() {
  return (
    <Suspense fallback={<OnboardLoading />}>
      <OnboardPage />
    </Suspense>
  );
}

function OnboardLoading() {
  return (
    <main className="relative min-h-screen flex items-center justify-center">
      <div className="absolute inset-0 bg-grid z-0" />
      <div className="text-foreground-dim font-mono text-sm">Loading…</div>
    </main>
  );
}

function OnboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repoUrl = searchParams.get("repo") || "";

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean | string>>({
    framework: "unknown",
    collectsEmails: false,
    processesPayments: false,
    servesEuUsers: true,
    usesCookies: false,
    businessType: "saas",
    region: "us",
  });

  // Framework detection state — only used when repoUrl is present.
  // status: idle (no repo), detecting (in flight), detected, error
  const [detectStatus, setDetectStatus] = useState<
    "idle" | "detecting" | "detected" | "error"
  >(repoUrl ? "detecting" : "idle");
  const [detectedFramework, setDetectedFramework] =
    useState<FrameworkAnswer | null>(null);

  // Auto-detect framework on mount when we have a repo.
  useEffect(() => {
    if (!repoUrl) return;
    let cancelled = false;
    setDetectStatus("detecting");
    fetch("/api/detect-framework", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoUrl }),
    })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setDetectStatus("error");
          return;
        }
        const data: { framework: Framework; label: string } = await res.json();
        if (cancelled) return;
        setDetectedFramework(data.framework);
        // Pre-fill the answer with the detected value (unless user already picked one)
        setAnswers((a) =>
          a.framework === "unknown" ? { ...a, framework: data.framework } : a
        );
        setDetectStatus("detected");
      })
      .catch(() => {
        if (cancelled) return;
        setDetectStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [repoUrl]);

  // Question order: if we have a repo, framework is step 0.
  // Otherwise, jump straight to the standard 5+1 questions.
  const frameworkStep = repoUrl
    ? [
        {
          id: "framework" as const,
          type: "framework" as const,
          question: "What framework is this built with?",
          hint: "We auto-detect this from your repo — confirm or change it",
          why: "Different frameworks use different conventions for sitemaps, error pages, manifest files, and meta tags. Knowing the framework lets us generate the right files in the right place.",
        },
      ]
    : [];

  const allQuestions = [
    ...frameworkStep,
    ...CONTEXT_QUESTIONS,
    REGION_QUESTION,
  ];
  const current = allQuestions[step];
  const isLast = step === allQuestions.length - 1;
  const isFrameworkStep = current.id === "framework";

  function setAnswer(id: keyof ProjectContext | "framework", value: boolean | string) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }

  // Block Continue while detection is in flight, so the user doesn't
  // skip past the framework step before we have a sensible default.
  const canContinue = !isFrameworkStep || detectStatus !== "detecting";

  function next() {
    if (!canContinue) return;
    if (isLast) {
      const params = new URLSearchParams({
        repo: repoUrl,
        context: JSON.stringify(answers),
      });
      router.push(`/scan?${params.toString()}`);
    } else {
      setStep((s) => s + 1);
    }
  }

  function back() {
    if (step === 0) {
      router.push("/");
    } else {
      setStep((s) => s - 1);
    }
  }

  return (
    <main className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Atmospheric layers */}
      <div className="absolute inset-0 bg-grid z-0" />
      <div className="hero-glow" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 w-full flex-1 flex flex-col justify-center py-16">
        {/* Progress bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-foreground-dim">
              Step {step + 1} of {allQuestions.length}
            </span>
            <span className="text-xs font-mono text-foreground-dim">
              {Math.round(((step + 1) / allQuestions.length) * 100)}%
            </span>
          </div>
          <div className="h-1 rounded-full bg-background-subtle overflow-hidden">
            <motion.div
              className="h-full bg-accent"
              initial={false}
              animate={{ width: `${((step + 1) / allQuestions.length) * 100}%` }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>

        {/* Repo context pill */}
        {repoUrl && (
          <div className="mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background-elevated/40 backdrop-blur-sm self-start">
            <span className="text-xs font-mono text-foreground-dim">scanning</span>
            <span className="text-xs font-mono text-foreground">{repoUrl}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="font-display text-4xl md:text-5xl tracking-[-0.02em] leading-[1.05] text-foreground mb-3">
              {current.question}
            </h1>
            <p className="text-foreground-muted text-lg mb-2">{current.hint}</p>
            <button
              type="button"
              className="text-xs font-mono text-foreground-dim hover:text-foreground-muted inline-flex items-center gap-1 group"
              title={current.why}
            >
              <span className="opacity-50 group-hover:opacity-100">why we ask</span>
              <span className="opacity-50 group-hover:opacity-100">→</span>
            </button>

            <div className="mt-10">
              {isFrameworkStep ? (
                <FrameworkInput
                  status={detectStatus}
                  detectedFramework={detectedFramework}
                  value={answers.framework as FrameworkAnswer}
                  onChange={(v) => setAnswer("framework", v)}
                />
              ) : current.type === "boolean" ? (
                <BooleanInput
                  value={answers[current.id] as boolean}
                  onChange={(v) => setAnswer(current.id, v)}
                />
              ) : (
                <SelectInput
                  options={current.options || []}
                  value={answers[current.id] as string}
                  onChange={(v) => setAnswer(current.id, v)}
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-12 flex items-center justify-between">
          <button
            onClick={back}
            className="flex items-center gap-2 px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            Back
          </button>
          <button
            onClick={next}
            disabled={!canContinue}
            className={cn(
              "group flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:brightness-110 transition-all",
              !canContinue && "opacity-50 cursor-not-allowed hover:brightness-100"
            )}
          >
            {isLast ? "Run scan" : "Continue"}
            {isLast ? (
              <Check className="w-4 h-4" strokeWidth={2.5} />
            ) : (
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

function BooleanInput({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={() => onChange(true)}
        className={cn(
          "p-6 rounded-2xl border-2 text-left transition-all",
          value
            ? "border-accent bg-accent/5 shadow-lg shadow-accent/10"
            : "border-border bg-background-elevated/40 hover:border-border-strong"
        )}
      >
        <div className="text-2xl mb-2">Yes</div>
        <div className="text-sm text-foreground-muted">
          Include the relevant clauses in the generated policy
        </div>
      </button>
      <button
        onClick={() => onChange(false)}
        className={cn(
          "p-6 rounded-2xl border-2 text-left transition-all",
          !value
            ? "border-accent bg-accent/5 shadow-lg shadow-accent/10"
            : "border-border bg-background-elevated/40 hover:border-border-strong"
        )}
      >
        <div className="text-2xl mb-2">No</div>
        <div className="text-sm text-foreground-muted">
          Skip these sections — keep the policy minimal
        </div>
      </button>
    </div>
  );
}

function SelectInput({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string; description?: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "w-full p-5 rounded-xl border text-left transition-all",
            value === opt.value
              ? "border-accent bg-accent/5"
              : "border-border bg-background-elevated/30 hover:border-border-strong hover:bg-background-elevated/50"
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-foreground">{opt.label}</span>
            {value === opt.value && (
              <Check className="w-4 h-4 text-accent" strokeWidth={2.5} />
            )}
          </div>
          {opt.description && (
            <p className="text-sm text-foreground-muted">{opt.description}</p>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * Framework input.
 *
 * Renders a detecting state while the API is in flight (so the user
 * sees what's happening and we don't flash a wrong default), then
 * switches to the option list with the detected value pre-selected.
 *
 * Below the list, we show a small status line:
 *   - "Detected: Next.js"  → user hasn't changed it
 *   - "Overriding detected value" → user picked something else
 *   - (nothing)            → detection failed and user hasn't picked
 */
function FrameworkInput({
  status,
  detectedFramework,
  value,
  onChange,
}: {
  status: "idle" | "detecting" | "detected" | "error";
  detectedFramework: FrameworkAnswer | null;
  value: FrameworkAnswer;
  onChange: (v: FrameworkAnswer) => void;
}) {
  if (status === "detecting") {
    return (
      <div className="flex items-center gap-3 p-5 rounded-xl border border-border bg-background-elevated/30 text-foreground-muted">
        <Loader2 className="w-4 h-4 animate-spin text-accent" strokeWidth={2} />
        <span className="text-sm font-mono">
          Detecting framework from repo…
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {FRAMEWORK_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "w-full p-5 rounded-xl border text-left transition-all",
              value === opt.value
                ? "border-accent bg-accent/5"
                : "border-border bg-background-elevated/30 hover:border-border-strong hover:bg-background-elevated/50"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-foreground">{opt.label}</span>
              {value === opt.value && (
                <Check className="w-4 h-4 text-accent" strokeWidth={2.5} />
              )}
            </div>
            <p className="text-sm text-foreground-muted">{opt.description}</p>
          </button>
        ))}
      </div>

      {status === "detected" &&
        detectedFramework &&
        detectedFramework !== "unknown" && (
          <p className="mt-3 text-xs font-mono text-foreground-dim">
            {value === detectedFramework
              ? `Detected: ${FRAMEWORK_LABELS[detectedFramework]}`
              : `Overriding detected value (was ${FRAMEWORK_LABELS[detectedFramework]})`}
          </p>
        )}

      {status === "error" && (
        <p className="mt-3 text-xs font-mono text-foreground-dim">
          Couldn&apos;t auto-detect — pick the framework that matches your repo.
        </p>
      )}
    </div>
  );
}
