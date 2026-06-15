"use client";

import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
  useMotionValueEvent,
} from "framer-motion";
import { useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import { GithubIcon } from "@/components/social-icons";
import { cn } from "@/lib/utils";

type CheckStatus = "ok" | "warning" | "missing";

interface Check {
  label: string;
  status: CheckStatus;
  scanAt: number;
  fixAt: number;
}

const CHECKS: Check[] = [
  { label: "privacy-policy.md", status: "missing", scanAt: 6,  fixAt: 28 },
  { label: "terms-of-service.md", status: "missing", scanAt: 14, fixAt: 36 },
  { label: "sitemap.xml",        status: "missing", scanAt: 22, fixAt: 48 },
  { label: "robots.txt",         status: "ok",      scanAt: 32, fixAt: 32 },
  { label: "404.html",           status: "warning", scanAt: 42, fixAt: 60 },
  { label: "og:image.png",       status: "missing", scanAt: 54, fixAt: 74 },
  { label: "security.txt",       status: "missing", scanAt: 66, fixAt: 86 },
  { label: "favicon.ico",        status: "warning", scanAt: 78, fixAt: 96 },
];

export function Hero() {
  const [url, setUrl] = useState("");

  return (
    <section className="relative min-h-[100vh] flex flex-col justify-center overflow-hidden pt-24 pb-16">
      {/* Atmospheric layers */}
      <div className="absolute inset-0 bg-grid z-0" />
      <div className="hero-glow" />
      <div className="hero-glow-secondary" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
        {/* Top eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center gap-2 mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background-elevated/60 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            <span className="text-xs font-mono text-foreground-muted tracking-wide">
              v0.1 · early access
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-center text-[clamp(3rem,9vw,7.5rem)] leading-[0.95] tracking-[-0.04em] text-foreground max-w-5xl mx-auto"
        >
          From{" "}
          <span className="italic-accent text-foreground-muted">
            vibe&nbsp;coded
          </span>
          <br />
          to{" "}
          <span className="italic-accent text-gradient-accent">
            production&nbsp;ready.
          </span>
        </motion.h1>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="text-center text-lg md:text-xl text-foreground-muted max-w-2xl mx-auto mt-8 leading-relaxed"
        >
          You shipped the site in a weekend. We find the missing legal pages,
          the absent sitemap, the broken 404, the missing OG image — and{" "}
          <span className="text-foreground">generate the fixes</span>.
        </motion.p>

        {/* URL input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mx-auto mt-12"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (url.trim()) {
                window.location.href = `/onboard?repo=${encodeURIComponent(url.trim())}`;
              }
            }}
            className="group relative flex items-center gap-2 p-1.5 rounded-2xl border border-border bg-background-elevated/80 backdrop-blur-sm focus-within:border-accent/50 transition-colors"
          >
            <div className="flex items-center pl-4 text-foreground-dim">
              <GithubIcon className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="github.com/your-name/your-project"
              className="flex-1 bg-transparent border-0 outline-none px-2 py-3 text-sm font-mono placeholder:text-foreground-dim text-foreground"
            />
            <span className="hidden sm:flex items-center text-foreground-dim pr-2">
              <span className="text-xs font-mono">or</span>
            </span>
            <button
              type="button"
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-colors"
            >
              <Upload className="w-4 h-4" strokeWidth={1.5} />
              <span>Upload ZIP</span>
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:brightness-110 transition-all"
            >
              <span>Scan repo</span>
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </form>
          <p className="text-center text-xs font-mono text-foreground-dim mt-4">
            Free for public repos · No signup required
          </p>
        </motion.div>

        {/* The scroll-driven demo card — animates as it scrolls past the viewport */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl mx-auto mt-20"
        >
          <DemoTerminal />
        </motion.div>
      </div>
    </section>
  );
}

function DemoTerminal() {
  // Track scroll progress through THIS element (the card itself).
  // "start 0.85" = animation starts when the card's top hits 85% from the top of the viewport
  //                (i.e. card is just below the visible area)
  // "end 0.15"   = animation completes when the card's bottom hits 15% from the top of the viewport
  //                (i.e. card is almost out the top)
  // Net effect: as the card moves UP through the viewport during normal scrolling,
  // the score climbs 0 → 100. No sticky positioning — page scrolls naturally.
  const cardRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start 0.85", "end 0.15"],
  });

  // Map scroll progress 0..1 to score 0..100.
  const score = useTransform(scrollYProgress, [0, 1], [0, 100]);
  // Scan progress reaches 100 by 60% of the scroll window.
  const scan = useTransform(scrollYProgress, [0, 0.6], [0, 100]);

  const [scoreVal, setScoreVal] = useState(0);
  const [scanVal, setScanVal] = useState(0);

  useMotionValueEvent(score, "change", (v) => setScoreVal(Math.round(v)));
  useMotionValueEvent(scan, "change", (v) => setScanVal(Math.round(v)));

  const isScanning = scanVal < 100;
  const isFixed = scoreVal >= 100;

  return (
    <div
      ref={cardRef}
      className="relative rounded-2xl border border-border bg-background-elevated/60 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/40"
    >
      {/* Window chrome */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background-subtle/50">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-foreground-dim">
          <TerminalSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>shipready ~ scan</span>
        </div>
        <div className="w-12" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5">
        <div className="md:col-span-2 p-7 border-b md:border-b-0 md:border-r border-border">
          <ScorePanel
            scoreVal={scoreVal}
            scanVal={scanVal}
            isScanning={isScanning}
            isFixed={isFixed}
          />
        </div>
        <div className="md:col-span-3 p-7">
          <Checklist scoreVal={scoreVal} scanVal={scanVal} />
        </div>
      </div>
    </div>
  );
}

function ScorePanel({
  scoreVal,
  scanVal,
  isScanning,
  isFixed,
}: {
  scoreVal: number;
  scanVal: number;
  isScanning: boolean;
  isFixed: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles
          className={cn(
            "w-3.5 h-3.5",
            isFixed ? "text-accent" : "text-foreground-dim"
          )}
          strokeWidth={1.5}
        />
        <span className="text-xs font-mono uppercase tracking-wider text-foreground-dim">
          Ship Readiness
        </span>
      </div>

      <div className="flex items-baseline gap-2 mt-3">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={scoreVal}
            initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
            transition={{ duration: 0.18 }}
            className={cn(
              "font-display text-7xl tracking-tight tabular-nums",
              isFixed ? "text-gradient-accent" : "text-foreground"
            )}
          >
            {scoreVal}
          </motion.span>
        </AnimatePresence>
        <span className="font-mono text-2xl text-foreground-dim">/100</span>
      </div>

      <div className="mt-5">
        <div className="h-1.5 rounded-full bg-background-subtle overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full",
              isFixed ? "bg-accent" : "bg-foreground-dim"
            )}
            style={{
              width: `${scoreVal}%`,
              boxShadow: isFixed ? "0 0 12px var(--accent)" : "none",
            }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs font-mono text-foreground-dim">
          <span>
            {isScanning && `scanning... ${scanVal}%`}
            {!isScanning && !isFixed && `${scoreVal - scanVal} issues remaining`}
            {isFixed && "all issues resolved"}
          </span>
          <span className="tabular-nums">{scoreVal}%</span>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <StatusLine
          label="Legal"
          status={scoreVal >= 36 ? "ok" : "danger"}
          detail={scoreVal >= 36 ? "2 pages generated" : "2 missing"}
        />
        <StatusLine
          label="SEO"
          status={scoreVal >= 74 ? "ok" : "danger"}
          detail={scoreVal >= 74 ? "4 files generated" : "3 missing"}
        />
        <StatusLine
          label="Errors"
          status={scoreVal >= 60 ? "ok" : "warning"}
          detail={scoreVal >= 60 ? "404 page created" : "no custom 404"}
        />
        <StatusLine
          label="Security"
          status={scoreVal >= 86 ? "ok" : "warning"}
          detail={scoreVal >= 86 ? "headers added" : "no CSP"}
        />
      </div>
    </div>
  );
}

function StatusLine({
  label,
  status,
  detail,
}: {
  label: string;
  status: "ok" | "warning" | "danger";
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs font-mono">
      <div className="flex items-center gap-2">
        {status === "ok" && (
          <CheckCircle2 className="w-3.5 h-3.5 text-accent" strokeWidth={2} />
        )}
        {status === "warning" && (
          <AlertTriangle
            className="w-3.5 h-3.5 text-[#facc15]"
            strokeWidth={2}
          />
        )}
        {status === "danger" && (
          <XCircle className="w-3.5 h-3.5 text-[#f87171]" strokeWidth={2} />
        )}
        <span className="text-foreground-muted">{label}</span>
      </div>
      <span className="text-foreground-dim">{detail}</span>
    </div>
  );
}

function Checklist({
  scoreVal,
  scanVal,
}: {
  scoreVal: number;
  scanVal: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-wider text-foreground-dim">
          Checklist
        </span>
        <span className="text-xs font-mono text-foreground-dim tabular-nums">
          {CHECKS.filter((c) => scoreVal >= c.fixAt).length}/{CHECKS.length}
        </span>
      </div>

      <ul className="space-y-1.5 font-mono text-sm">
        {CHECKS.map((check) => {
          const isVisible = scanVal >= check.scanAt;
          const isFixed = scoreVal >= check.fixAt;
          const fixStart = Math.max(check.fixAt - 8, check.scanAt);
          const fixProgress = Math.min(
            1,
            Math.max(0, (scoreVal - fixStart) / (check.fixAt - fixStart))
          );

          return (
            <ChecklistRow
              key={check.label}
              check={check}
              isVisible={isVisible}
              isFixed={isFixed}
              fixProgress={fixProgress}
            />
          );
        })}
      </ul>
    </div>
  );
}

function ChecklistRow({
  check,
  isVisible,
  isFixed,
  fixProgress,
}: {
  check: Check;
  isVisible: boolean;
  isFixed: boolean;
  fixProgress: number;
}) {
  return (
    <motion.li
      initial={false}
      animate={{
        opacity: isVisible ? 1 : 0,
        x: isVisible ? 0 : -8,
      }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "relative flex items-center justify-between gap-3 px-3 py-2 rounded-lg border transition-colors duration-300",
        isFixed
          ? "border-accent/20 bg-accent/5"
          : "border-border bg-background-subtle/30"
      )}
    >
      <div className="flex items-center gap-3 min-w-0 relative z-10">
        {isFixed ? (
          <CheckCircle2
            className="w-4 h-4 text-accent flex-shrink-0"
            strokeWidth={2}
          />
        ) : check.status === "ok" ? (
          <CheckCircle2
            className="w-4 h-4 text-foreground-muted flex-shrink-0"
            strokeWidth={2}
          />
        ) : check.status === "warning" ? (
          <AlertTriangle
            className="w-4 h-4 text-[#facc15] flex-shrink-0"
            strokeWidth={2}
          />
        ) : (
          <XCircle
            className="w-4 h-4 text-[#f87171] flex-shrink-0"
            strokeWidth={2}
          />
        )}

        <div className="relative min-w-0 overflow-hidden">
          <span
            className={cn(
              "block truncate",
              isFixed ? "text-foreground-muted" : "text-foreground"
            )}
          >
            {check.label}
          </span>

          {fixProgress > 0 && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 truncate"
              style={{
                color: "var(--accent)",
                textDecoration: "line-through",
                textDecorationColor: "rgba(196, 245, 66, 0.55)",
                textDecorationThickness: "1.5px",
                clipPath: `inset(0 ${(1 - fixProgress) * 100}% 0 0)`,
                willChange: "clip-path",
              }}
            >
              {check.label}
            </span>
          )}
        </div>
      </div>

      <span className="text-xs text-foreground-dim flex-shrink-0 relative z-10 tabular-nums">
        {isFixed
          ? "fixed"
          : check.status === "ok"
          ? "present"
          : check.status === "warning"
          ? "incomplete"
          : "missing"}
      </span>
    </motion.li>
  );
}
