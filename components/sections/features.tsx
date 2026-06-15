"use client";

import { motion } from "framer-motion";
import {
  Scale,
  Search,
  Shield,
  AlertOctagon,
  FileCode,
  Gauge,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  {
    icon: Scale,
    eyebrow: "Legal",
    title: "Policies that actually protect you.",
    description:
      "Privacy Policy, Terms, Cookie Policy, Refund Policy. Tailored to your business — e-commerce, SaaS, blog, portfolio. Jurisdiction-aware. Updated automatically when laws change.",
    accent: false,
  },
  {
    icon: Search,
    eyebrow: "SEO",
    title: "Make Google love you in one pass.",
    description:
      "sitemap.xml, robots.txt, Open Graph, Twitter Cards, JSON-LD structured data, canonical URLs. Auto-generated from your codebase, not a template.",
    accent: true,
  },
  {
    icon: AlertOctagon,
    eyebrow: "Errors",
    title: "Custom 404, 500, and maintenance pages.",
    description:
      "Pretty error pages that match your brand. security.txt, humans.txt, status endpoints. The unglamorous essentials that pros never forget.",
    accent: false,
  },
  {
    icon: Shield,
    eyebrow: "Security",
    title: "Headers, secrets, and a CSP that works.",
    description:
      "Content Security Policy, HSTS, X-Frame-Options, Referrer-Policy. Catches leaked .env files, weak gitignore, and exposed API keys before you do.",
    accent: false,
  },
  {
    icon: FileCode,
    eyebrow: "Meta",
    title: "Favicons, manifests, and social cards.",
    description:
      "Full favicon set from one logo upload. manifest.json for PWA. og:image and twitter:card generated from your hero. Apple touch icons included.",
    accent: false,
  },
  {
    icon: Gauge,
    eyebrow: "Perf",
    title: "Lighthouse score, demystified.",
    description:
      "Bundle size hints, image optimization checklist, font loading strategy, Core Web Vitals. The fixes ranked by impact, not by alphabet.",
    accent: false,
  },
];

export function Features() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-3xl overflow-hidden border border-border">
          {FEATURES.map((feature, idx) => (
            <FeatureCard key={feature.title} {...feature} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeader() {
  return (
    <div className="max-w-3xl mb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="inline-flex items-center gap-2 mb-6"
      >
        <Sparkles className="w-3.5 h-3.5 text-accent" strokeWidth={1.5} />
        <span className="text-xs font-mono uppercase tracking-[0.2em] text-foreground-dim">
          Six categories · Zero guesswork
        </span>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="font-display text-5xl md:text-6xl tracking-[-0.03em] leading-[1.05] text-foreground"
      >
        The stuff you{" "}
        <span className="italic-accent text-foreground-muted">forgot</span> to
        build.
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="text-foreground-muted text-lg mt-6 max-w-xl"
      >
        We don't generate random boilerplate. We scan your repo, detect what
        you're building, and produce only what's missing.
      </motion.p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  accent,
  index,
}: {
  icon: typeof Scale;
  eyebrow: string;
  title: string;
  description: string;
  accent: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay: index * 0.05 }}
      className="group relative bg-background p-8 lg:p-10 hover:bg-background-elevated transition-colors"
    >
      {accent && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      )}

      <div className="relative">
        <div className="flex items-center gap-3 mb-6">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-lg border ${
              accent
                ? "border-accent/30 bg-accent/10"
                : "border-border bg-background-subtle"
            }`}
          >
            <Icon
              className={accent ? "w-5 h-5 text-accent" : "w-5 h-5 text-foreground-muted"}
              strokeWidth={1.5}
            />
          </div>
          <span className="text-xs font-mono uppercase tracking-wider text-foreground-dim">
            {eyebrow}
          </span>
        </div>

        <h3 className="font-display text-2xl tracking-[-0.02em] leading-tight text-foreground mb-3">
          {title}
        </h3>
        <p className="text-foreground-muted leading-relaxed text-[15px]">
          {description}
        </p>
      </div>
    </motion.div>
  );
}
