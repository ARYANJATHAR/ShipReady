"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { GithubIcon } from "@/components/social-icons";

export function CTA() {
  return (
    <section className="relative py-32 border-t border-border overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-foreground-dim mb-6">
            <span className="text-accent">●</span> One last thing
          </div>

          <h2 className="font-display text-6xl md:text-7xl tracking-[-0.04em] leading-[0.95] text-foreground">
            Stop shipping
            <br />
            <span className="italic-accent text-gradient-accent">
              half-finished
            </span>{" "}
            websites.
          </h2>

          <p className="text-foreground-muted text-lg md:text-xl max-w-2xl mx-auto mt-8 leading-relaxed">
            Paste a repo. Watch the score climb. Open a PR. Deploy. That's the
            whole product.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-12">
            <a
              href="#scan"
              className="group flex items-center gap-2 px-6 py-3.5 rounded-xl bg-accent text-accent-foreground font-medium hover:brightness-110 transition-all shadow-lg shadow-accent/20"
            >
              <GithubIcon className="w-4 h-4" />
              <span>Scan a GitHub repo</span>
              <ArrowRight
                className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                strokeWidth={2}
              />
            </a>
            <a
              href="#how"
              className="px-6 py-3.5 rounded-xl border border-border text-foreground hover:bg-background-elevated transition-colors"
            >
              See how it works
            </a>
          </div>

          <p className="font-mono text-xs text-foreground-dim mt-8">
            No credit card · No signup · Free for public repos
          </p>
        </motion.div>
      </div>
    </section>
  );
}
