"use client";

import { motion } from "framer-motion";
import { ArrowDown, Upload } from "lucide-react";
import { GithubIcon } from "@/components/social-icons";

const STEPS = [
  {
    number: "01",
    title: "Point us at your project.",
    description:
      "Paste a GitHub URL or drop a ZIP. We support Next.js, Vite, Astro, SvelteKit, plain HTML — anything static or SSR.",
    visual: <StepInput />,
  },
  {
    number: "02",
    title: "Watch the scan.",
    description:
      "In under 10 seconds, we detect your framework, business type, and what's missing. The score starts ticking up as we work.",
    visual: <StepScan />,
  },
  {
    number: "03",
    title: "Ship the diff.",
    description:
      "One click opens a PR on GitHub, or downloads a fixed ZIP. Preview every change before it lands. No black boxes.",
    visual: <StepApply />,
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-32 border-t border-border overflow-hidden">
      <div className="absolute inset-0 bg-dot opacity-30" />
      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mb-24"
        >
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-foreground-dim">
              The ritual
            </span>
          </div>
          <h2 className="font-display text-5xl md:text-6xl tracking-[-0.03em] leading-[1.05] text-foreground">
            Three steps.{" "}
            <span className="italic-accent text-foreground-muted">No</span>{" "}
            jargon.
          </h2>
        </motion.div>

        <div className="space-y-32">
          {STEPS.map((step, idx) => (
            <Step key={step.number} {...step} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Step({
  number,
  title,
  description,
  visual,
  index,
}: {
  number: string;
  title: string;
  description: string;
  visual: React.ReactNode;
  index: number;
}) {
  const reverse = index % 2 === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8 }}
      className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center ${
        reverse ? "lg:[&>*:first-child]:order-2" : ""
      }`}
    >
      <div className="lg:col-span-5">
        <div className="font-mono text-sm text-accent mb-4">{number}</div>
        <h3 className="font-display text-4xl md:text-5xl tracking-[-0.02em] leading-[1.05] text-foreground mb-6">
          {title}
        </h3>
        <p className="text-foreground-muted text-lg leading-relaxed max-w-md">
          {description}
        </p>
        {index < STEPS.length - 1 && (
          <div className="hidden lg:flex items-center gap-2 mt-8 text-foreground-dim">
            <ArrowDown className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-xs font-mono uppercase tracking-wider">
              then
            </span>
          </div>
        )}
      </div>

      <div className="lg:col-span-7">{visual}</div>
    </motion.div>
  );
}

function StepInput() {
  return (
    <div className="relative rounded-2xl border border-border bg-background-elevated/80 backdrop-blur-sm p-8 shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-mono uppercase tracking-wider text-foreground-dim">
          input
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-background">
          <GithubIcon className="w-4 h-4 text-foreground-muted" />
          <span className="font-mono text-sm text-foreground">
            github.com/you/my-vibecoded-app
          </span>
          <span className="ml-auto text-xs font-mono text-accent">scanning →</span>
        </div>
        <div className="flex items-center justify-center gap-2 py-2 text-xs font-mono text-foreground-dim">
          <span>— or —</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border bg-background/50">
          <Upload className="w-4 h-4 text-foreground-muted" strokeWidth={1.5} />
          <span className="font-mono text-sm text-foreground-muted">
            my-project.zip
          </span>
          <span className="ml-auto text-xs font-mono text-foreground-dim">
            2.3 MB
          </span>
        </div>
      </div>
    </div>
  );
}

function StepScan() {
  return (
    <div className="relative rounded-2xl border border-border bg-background-elevated/80 backdrop-blur-sm p-8 shadow-2xl shadow-black/40">
      <div className="font-mono text-xs uppercase tracking-wider text-foreground-dim mb-4">
        detected
      </div>
      <div className="space-y-2 font-mono text-sm">
        <Row label="framework" value="next.js 15" />
        <Row label="language" value="typescript" />
        <Row label="business" value="saas" highlight />
        <Row label="payments" value="stripe" />
        <Row label="region" value="us + eu" />
      </div>
      <div className="mt-6 pt-6 border-t border-border">
        <div className="font-mono text-xs uppercase tracking-wider text-foreground-dim mb-3">
          issues
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="critical" value="2" color="text-[#f87171]" />
          <Stat label="warnings" value="3" color="text-[#facc15]" />
          <Stat label="ok" value="3" color="text-accent" />
        </div>
      </div>
    </div>
  );
}

function StepApply() {
  return (
    <div className="relative rounded-2xl border border-border bg-background-elevated/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background-subtle/50">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent" />
          <span className="font-mono text-xs text-foreground-muted">
            feat: add privacy policy, sitemap, 404, og:image
          </span>
        </div>
        <span className="font-mono text-xs text-accent">+8 files</span>
      </div>
      <div className="p-5 font-mono text-xs space-y-1.5">
        <FileRow path="public/privacy-policy.html" status="added" lines={142} />
        <FileRow path="public/terms.html" status="added" lines={98} />
        <FileRow path="app/sitemap.ts" status="added" lines={24} />
        <FileRow path="app/robots.ts" status="added" lines={12} />
        <FileRow path="app/not-found.tsx" status="added" lines={45} />
        <FileRow path="public/og-image.png" status="added" lines="binary" />
        <FileRow path="next.config.ts" status="modified" lines="+18" />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 rounded-md hover:bg-background-subtle/30">
      <span className="text-foreground-dim">{label}</span>
      <span
        className={
          highlight
            ? "text-accent px-2 py-0.5 rounded bg-accent/10"
            : "text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="px-3 py-2 rounded-lg border border-border bg-background">
      <div className={`font-display text-2xl ${color}`}>{value}</div>
      <div className="text-xs font-mono text-foreground-dim mt-0.5">
        {label}
      </div>
    </div>
  );
}

function FileRow({
  path,
  status,
  lines,
}: {
  path: string;
  status: "added" | "modified";
  lines: number | string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={
            status === "added" ? "text-accent" : "text-[#facc15]"
          }
        >
          {status === "added" ? "+" : "~"}
        </span>
        <span className="text-foreground truncate">{path}</span>
      </div>
      <span className="text-foreground-dim text-xs flex-shrink-0">
        {typeof lines === "number" ? `${lines} lines` : lines}
      </span>
    </div>
  );
}
