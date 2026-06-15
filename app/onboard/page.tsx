"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONTEXT_QUESTIONS, REGION_QUESTION, type ProjectContext } from "@/engine/src/context";
import type { BusinessType, Region } from "@/engine/src/types";

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
    collectsEmails: false,
    processesPayments: false,
    servesEuUsers: true,
    usesCookies: false,
    businessType: "saas",
    region: "us",
  });

  const allQuestions = [...CONTEXT_QUESTIONS, REGION_QUESTION];
  const current = allQuestions[step];
  const isLast = step === allQuestions.length - 1;

  function setAnswer(id: keyof ProjectContext, value: boolean | string) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }

  function next() {
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
              {current.type === "boolean" ? (
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
            className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:brightness-110 transition-all"
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
