"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    name: "Hobby",
    price: "$0",
    cadence: "forever",
    description: "For the weekend builders and side projects.",
    features: [
      { text: "3 scans per month", included: true },
      { text: "Public repos only", included: true },
      { text: "View full report", included: true },
      { text: "Manual fix instructions", included: true },
      { text: "Auto-generate fixes", included: false },
      { text: "PR creation", included: false },
      { text: "Private repos", included: false },
    ],
    cta: "Start scanning",
    accent: false,
  },
  {
    name: "Indie",
    price: "$9",
    cadence: "per month",
    description: "For shipping real products to real users.",
    features: [
      { text: "Unlimited scans", included: true },
      { text: "Private repos", included: true },
      { text: "Auto-generate all fixes", included: true },
      { text: "Open PRs directly", included: true },
      { text: "Vercel / Netlify deploy", included: true },
      { text: "Custom domain guidance", included: true },
      { text: "Priority support", included: false },
    ],
    cta: "Start free trial",
    accent: true,
  },
  {
    name: "Team",
    price: "$39",
    cadence: "per month",
    description: "For agencies and small teams shipping client work.",
    features: [
      { text: "Everything in Indie", included: true },
      { text: "5 team members", included: true },
      { text: "Unlimited connected repos", included: true },
      { text: "CI integration", included: true },
      { text: "Custom templates", included: true },
      { text: "Audit log", included: true },
      { text: "Priority support", included: true },
    ],
    cta: "Start free trial",
    accent: false,
  },
];

export function Pricing() {
  return (
    <section className="relative py-32 border-t border-border">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mb-20"
        >
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-foreground-dim">
              Pricing
            </span>
          </div>
          <h2 className="font-display text-5xl md:text-6xl tracking-[-0.03em] leading-[1.05] text-foreground">
            Cheaper than{" "}
            <span className="italic-accent text-foreground-muted">one</span>{" "}
            lawsuit.
          </h2>
          <p className="text-foreground-muted text-lg mt-6 max-w-xl">
            Free for tinkering. $9/month to actually ship. Cancel anytime — your
            generated policies stay yours forever.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier, idx) => (
            <PricingCard key={tier.name} tier={tier} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  tier,
  index,
}: {
  tier: (typeof TIERS)[number];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className={cn(
        "relative rounded-3xl p-8 flex flex-col",
        tier.accent
          ? "border-2 border-accent bg-gradient-to-b from-accent/5 to-transparent"
          : "border border-border bg-background-elevated/40"
      )}
    >
      {tier.accent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-mono font-medium">
          most popular
        </div>
      )}

      {tier.accent && (
        <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-accent/20 to-transparent pointer-events-none blur-xl" />
      )}

      <div className="relative">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="font-display text-2xl tracking-tight text-foreground">
            {tier.name}
          </h3>
        </div>
        <p className="text-foreground-muted text-sm mb-8 min-h-[2.5rem]">
          {tier.description}
        </p>

        <div className="flex items-baseline gap-2 mb-8">
          <span
            className={cn(
              "font-display text-6xl tracking-tight",
              tier.accent ? "text-gradient-accent" : "text-foreground"
            )}
          >
            {tier.price}
          </span>
          <span className="text-foreground-dim font-mono text-sm">
            {tier.cadence}
          </span>
        </div>

        <ul className="space-y-3 mb-8 flex-1">
          {tier.features.map((feature) => (
            <li
              key={feature.text}
              className="flex items-start gap-3 text-sm"
            >
              <span
                className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full mt-0.5 flex-shrink-0",
                  feature.included
                    ? "bg-accent/15 text-accent"
                    : "bg-background-subtle text-foreground-dim"
                )}
              >
                {feature.included ? (
                  <Check className="w-3 h-3" strokeWidth={2.5} />
                ) : (
                  <X className="w-3 h-3" strokeWidth={2} />
                )}
              </span>
              <span
                className={
                  feature.included
                    ? "text-foreground"
                    : "text-foreground-dim line-through"
                }
              >
                {feature.text}
              </span>
            </li>
          ))}
        </ul>

        <button
          className={cn(
            "w-full py-3.5 rounded-xl font-medium text-sm transition-all",
            tier.accent
              ? "bg-accent text-accent-foreground hover:brightness-110"
              : "border border-border bg-background text-foreground hover:bg-background-subtle"
          )}
        >
          {tier.cta}
        </button>
      </div>
    </motion.div>
  );
}
