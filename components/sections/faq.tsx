"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "Will you train AI on my code?",
    a: "No. Scans run in-memory, generate the artifacts, and forget. Nothing is stored on our servers, nothing is sent to model providers, nothing is used for training. The free tier can verify this in your browser DevTools — the network tab will show a single signed fetch and no telemetry.",
    category: "Privacy",
  },
  {
    q: "What frameworks do you support?",
    a: "Next.js, Vite, Astro, SvelteKit, Remix, Nuxt, plain HTML/CSS, and most static-site generators. The scanner detects your stack from package.json, file extensions, and config files — no manual selection needed. If it can be deployed to Vercel or Netlify, we can probably scan it.",
    category: "Compatibility",
  },
  {
    q: "Are the generated legal pages actually valid?",
    a: "Drafted by lawyers and reviewed for GDPR, CCPA, and PIPEDA. We tailor the language to your business type (e-commerce, SaaS, blog, portfolio) and jurisdiction. They are not a substitute for legal advice on edge cases, but for the 95% case, they will pass an audit and protect you in disputes.",
    category: "Legal",
  },
  {
    q: "What if I don't like what gets generated?",
    a: "It's yours. Every file is plain Markdown or TypeScript — open it in your editor, edit it, commit it. There's no proprietary format, no lock-in, no widget you can't remove. Most teams regenerate policies once a year and edit them in between.",
    category: "Ownership",
  },
  {
    q: "Can I use this on a private repo?",
    a: "Yes, on the Indie plan and up. We use short-lived GitHub App tokens with read-only scope — the same model as Dependabot. You can revoke access from your GitHub settings at any time and we'll lose access within 60 seconds.",
    category: "Security",
  },
  {
    q: "How fast is the scan?",
    a: "Under 10 seconds for repos under 1,000 files. We parallelize across 8 categories (legal, SEO, errors, security, meta, perf, a11y, dependencies) and stream the results back as they complete. The bottleneck is the GitHub API rate limit, not us.",
    category: "Performance",
  },
  {
    q: "Do you replace my lawyer?",
    a: "For routine compliance? Yes. For a Series A financing term sheet? Absolutely not. Think of us as a junior associate who handles the boilerplate so your lawyer can focus on what actually matters. We surface edge cases that need human review rather than pretending we caught everything.",
    category: "Legal",
  },
  {
    q: "What happens to my generated files after I cancel?",
    a: "You keep them forever. They're in your git history. Your privacy policy, sitemap, and 404 page don't vanish because you stopped paying. We just stop helping you regenerate them.",
    category: "Ownership",
  },
];

const CATEGORIES = ["All", "Legal", "Privacy", "Security", "Ownership", "Compatibility", "Performance"];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = activeCategory === "All"
    ? FAQS
    : FAQS.filter((f) => f.category === activeCategory);

  return (
    <section id="faq" className="relative py-32 border-t border-border">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-foreground-dim">
              Questions, answered
            </span>
          </div>
          <h2 className="font-display text-5xl md:text-6xl tracking-[-0.03em] leading-[1.05] text-foreground">
            The stuff{" "}
            <span className="italic-accent text-foreground-muted">
              everyone
            </span>{" "}
            asks.
          </h2>
        </motion.div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-mono transition-colors",
                activeCategory === cat
                  ? "bg-accent text-accent-foreground"
                  : "border border-border text-foreground-muted hover:text-foreground hover:border-border-strong"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="border-t border-border">
          {filtered.map((faq, idx) => (
            <FAQItem
              key={faq.q}
              faq={faq}
              isOpen={open === idx}
              onToggle={() => setOpen(open === idx ? null : idx)}
            />
          ))}
        </div>

        {/* Closing nudge */}
        <div className="mt-12 p-6 rounded-2xl border border-border bg-background-elevated/30 flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-mono text-sm">
            ?
          </div>
          <div>
            <p className="text-foreground font-medium mb-1">
              Still wondering something?
            </p>
            <p className="text-sm text-foreground-muted">
              We answer every email. Reach out at{" "}
              <a
                href="mailto:hi@shipready.dev"
                className="text-foreground underline decoration-foreground-dim underline-offset-4 hover:decoration-accent"
              >
                hi@shipready.dev
              </a>{" "}
              and you'll hear back from a human within 4 hours.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQItem({
  faq,
  isOpen,
  onToggle,
}: {
  faq: { q: string; a: string; category: string };
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={false}
      className="border-b border-border"
    >
      <button
        onClick={onToggle}
        className="w-full py-6 flex items-start justify-between gap-6 text-left group"
      >
        <div className="flex-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-dim mb-2 block">
            {faq.category}
          </span>
          <h3 className="font-display text-xl md:text-2xl tracking-[-0.01em] text-foreground group-hover:text-accent transition-colors">
            {faq.q}
          </h3>
        </div>
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center transition-all",
            isOpen && "bg-accent border-accent text-accent-foreground rotate-180"
          )}
        >
          {isOpen ? (
            <Minus className="w-4 h-4" strokeWidth={2} />
          ) : (
            <Plus className="w-4 h-4" strokeWidth={2} />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="text-foreground-muted leading-relaxed pb-6 max-w-2xl">
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
