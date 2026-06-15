"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, FileCode, FileText, Globe, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type DiffLine = {
  type: "add" | "remove" | "context" | "meta";
  text: string;
};

type DiffTab = {
  id: string;
  label: string;
  filename: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  beforeAfter: { before: number; after: number };
  lines: DiffLine[];
};

const TABS: DiffTab[] = [
  {
    id: "meta",
    label: "SEO meta",
    filename: "app/layout.tsx",
    icon: Globe,
    description: "Open Graph, Twitter cards, structured data, canonical URLs.",
    beforeAfter: { before: 12, after: 38 },
    lines: [
      { type: "meta", text: "@@ Head metadata @@" },
      { type: "context", text: "export const metadata: Metadata = {" },
      { type: "remove", text: '  title: "My App",' },
      { type: "add", text: '  title: "My App — the fastest way to ship a SaaS",' },
      { type: "remove", text: '  description: "My app",' },
      { type: "add", text: '  description:' },
      { type: "add", text: '    "Built for indie hackers. Self-serve onboarding, Stripe billing, and a real dashboard in under 60 seconds.",' },
      { type: "add", text: '  keywords: ["saas", "indie", "billing", "stripe"],' },
      { type: "add", text: '  authors: [{ name: "Aryan I.", url: "https://aryan.dev" }],' },
      { type: "add", text: '  creator: "Aryan I.",' },
      { type: "add", text: '  openGraph: {' },
      { type: "add", text: '    type: "website",' },
      { type: "add", text: '    locale: "en_US",' },
      { type: "add", text: '    url: "https://myapp.com",' },
      { type: "add", text: '    title: "My App — ship a SaaS in 60 seconds",' },
      { type: "add", text: '    description: "Self-serve onboarding, Stripe billing, real dashboard.",' },
      { type: "add", text: '    siteName: "My App",' },
      { type: "add", text: '    images: [{ url: "/og.png", width: 1200, height: 630 }],' },
      { type: "add", text: "  }," },
      { type: "add", text: "  twitter: {" },
      { type: "add", text: '    card: "summary_large_image",' },
      { type: "add", text: '    title: "My App — ship a SaaS in 60 seconds",' },
      { type: "add", text: '    description: "Self-serve onboarding, Stripe billing, real dashboard.",' },
      { type: "add", text: '    creator: "@aryan_codes",' },
      { type: "add", text: '    images: ["/og.png"],' },
      { type: "add", text: "  }," },
      { type: "add", text: '  alternates: { canonical: "https://myapp.com" },' },
      { type: "add", text: "  robots: {" },
      { type: "add", text: '    index: true,' },
      { type: "add", text: '    follow: true,' },
      { type: "add", text: '    googleBot: { index: true, follow: true, "max-image-preview": "large" },' },
      { type: "add", text: "  }," },
      { type: "add", text: "};" },
    ],
  },
  {
    id: "privacy",
    label: "Privacy policy",
    filename: "app/(legal)/privacy/page.mdx",
    icon: FileText,
    description: "Tailored to your business type, GDPR/CCPA-compliant, 14 sections.",
    beforeAfter: { before: 0, after: 247 },
    lines: [
      { type: "meta", text: "@+ new file: 247 lines" },
      { type: "add", text: "# Privacy Policy" },
      { type: "add", text: "" },
      { type: "add", text: "_Last updated: 14 June 2026_" },
      { type: "add", text: "" },
      { type: "add", text: "## 1. Introduction" },
      { type: "add", text: "" },
      { type: "add", text: 'My App ("we", "our", "us") operates the website myapp.com' },
      { type: "add", text: '(the "Service"). This page informs you of our policies regarding' },
      { type: "add", text: "the collection, use, and disclosure of personal data." },
      { type: "add", text: "" },
      { type: "add", text: "## 2. Data We Collect" },
      { type: "add", text: "" },
      { type: "add", text: "- **Account data**: email, name (from sign-up form)" },
      { type: "add", text: "- **Payment data**: handled by Stripe — we never see your card" },
      { type: "add", text: "- **Usage data**: pages visited, features used (via Plausible)" },
      { type: "add", text: "" },
      { type: "add", text: "## 3. Legal Basis (GDPR Art. 6)" },
      { type: "add", text: "" },
      { type: "add", text: "We process your data on the basis of contractual necessity" },
      { type: "add", text: "(to provide the Service) and legitimate interest (to improve it)." },
      { type: "add", text: "" },
      { type: "add", text: "## 4. Your Rights (GDPR Art. 15–22)" },
      { type: "add", text: "" },
      { type: "add", text: "You may access, rectify, erase, restrict, port, or object to" },
      { type: "add", text: "the processing of your personal data. Email privacy@myapp.com." },
      { type: "add", text: "" },
      { type: "add", text: "## 5. Cookies" },
      { type: "add", text: "## 6. Third Parties" },
      { type: "add", text: "## 7. International Transfers" },
      { type: "add", text: "## 8. Retention" },
      { type: "add", text: "## 9. Security" },
      { type: "add", text: "## 10. Children" },
      { type: "add", text: "## 11. Changes" },
      { type: "add", text: "## 12. Contact" },
    ],
  },
  {
    id: "sitemap",
    label: "Sitemap",
    filename: "app/sitemap.ts",
    icon: FileCode,
    description: "Auto-generated, updated on every build, includes lastmod + priority.",
    beforeAfter: { before: 0, after: 28 },
    lines: [
      { type: "meta", text: "@+ new file: 28 lines" },
      { type: "add", text: "import type { MetadataRoute } from 'next';" },
      { type: "add", text: "" },
      { type: "add", text: "export default function sitemap(): MetadataRoute.Sitemap {" },
      { type: "add", text: "  const base = 'https://myapp.com';" },
      { type: "add", text: "  const now = new Date();" },
      { type: "add", text: "" },
      { type: "add", text: "  return [" },
      { type: "add", text: "    { url: `${base}/`,         lastmod: now, changeFrequency: 'weekly',  priority: 1.0 }," },
      { type: "add", text: "    { url: `${base}/pricing`,  lastmod: now, changeFrequency: 'weekly',  priority: 0.9 }," },
      { type: "add", text: "    { url: `${base}/about`,    lastmod: now, changeFrequency: 'monthly', priority: 0.7 }," },
      { type: "add", text: "    { url: `${base}/blog`,     lastmod: now, changeFrequency: 'daily',   priority: 0.8 }," },
      { type: "add", text: "    { url: `${base}/privacy`,  lastmod: now, changeFrequency: 'yearly',  priority: 0.4 }," },
      { type: "add", text: "    { url: `${base}/terms`,    lastmod: now, changeFrequency: 'yearly',  priority: 0.4 }," },
      { type: "add", text: "    ...await getBlogPosts().map(p => ({" },
      { type: "add", text: "      url: `${base}/blog/${p.slug}`," },
      { type: "add", text: "      lastmod: p.publishedAt," },
      { type: "add", text: "      changeFrequency: 'monthly' as const," },
      { type: "add", text: "      priority: 0.6," },
      { type: "add", text: "    }}))," },
      { type: "add", text: "  ];" },
      { type: "add", text: "}" },
    ],
  },
  {
    id: "headers",
    label: "Security headers",
    filename: "next.config.ts",
    icon: Shield,
    description: "CSP, HSTS, X-Frame-Options, Referrer-Policy. No more 'A+' on Headers.",
    beforeAfter: { before: 8, after: 32 },
    lines: [
      { type: "context", text: "import type { NextConfig } from 'next';" },
      { type: "context", text: "" },
      { type: "context", text: "const nextConfig: NextConfig = {" },
      { type: "context", text: "  /* config options here */" },
      { type: "remove", text: "};" },
      { type: "add", text: "  async headers() {" },
      { type: "add", text: "    return [{" },
      { type: "add", text: "      source: '/:path*'," },
      { type: "add", text: "      headers: [" },
      { type: "add", text: "        { key: 'X-Frame-Options',         value: 'DENY' }," },
      { type: "add", text: "        { key: 'X-Content-Type-Options',  value: 'nosniff' }," },
      { type: "add", text: "        { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' }," },
      { type: "add", text: "        { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' }," },
      { type: "add", text: "        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }," },
      { type: "add", text: "        {" },
      { type: "add", text: "          key: 'Content-Security-Policy'," },
      { type: "add", text: "          value: \"default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com; frame-src https://js.stripe.com\"" },
      { type: "add", text: "        }," },
      { type: "add", text: "      ]," },
      { type: "add", text: "    }];" },
      { type: "add", text: "  }," },
      { type: "add", text: "};" },
    ],
  },
];

export function DiffShowcase() {
  const [active, setActive] = useState(TABS[0].id);
  const tab = TABS.find((t) => t.id === active)!;
  const Icon = tab.icon;

  return (
    <section id="diff" className="relative py-32 border-t border-border overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-dot opacity-20" />

      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-foreground-dim">
              Show, don't tell
            </span>
          </div>
          <h2 className="font-display text-5xl md:text-6xl tracking-[-0.03em] leading-[1.05] text-foreground">
            See the diff{" "}
            <span className="italic-accent text-foreground-muted">
              before
            </span>{" "}
            you commit.
          </h2>
          <p className="text-foreground-muted text-lg mt-6 max-w-xl">
            Every file we generate lands as a real PR. Green is new. Red is gone.
            No surprises, no &ldquo;magic&rdquo;.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: tabs */}
          <div className="lg:col-span-4 space-y-2">
            {TABS.map((t) => {
              const TIcon = t.icon;
              const isActive = t.id === active;
              return (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={cn(
                    "w-full text-left p-5 rounded-xl border transition-all",
                    isActive
                      ? "border-accent/40 bg-accent/5 shadow-lg shadow-accent/5"
                      : "border-border bg-background-elevated/30 hover:border-border-strong hover:bg-background-elevated/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                        isActive
                          ? "bg-accent/15 text-accent"
                          : "bg-background-subtle text-foreground-muted"
                      )}
                    >
                      <TIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "font-medium text-sm",
                            isActive ? "text-foreground" : "text-foreground-muted"
                          )}
                        >
                          {t.label}
                        </span>
                        <span className="font-mono text-[10px] text-foreground-dim tabular-nums">
                          {t.beforeAfter.before > 0 ? `${t.beforeAfter.before} → ` : ""}
                          <span className="text-accent">+{t.beforeAfter.after}</span>
                          <span className="text-foreground-dim"> lines</span>
                        </span>
                      </div>
                      <p className="text-xs text-foreground-dim mt-1 leading-relaxed">
                        {t.description}
                      </p>
                      <p className="font-mono text-[10px] text-foreground-dim mt-2 truncate">
                        {t.filename}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: diff viewer */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-border bg-background-elevated/60 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/40"
              >
                {/* Window chrome */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background-subtle/50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Icon className="w-3.5 h-3.5 text-foreground-muted" />
                      <span className="font-mono text-xs text-foreground-muted truncate max-w-[200px] sm:max-w-xs">
                        {tab.filename}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono">
                    {tab.beforeAfter.before > 0 && (
                      <span className="text-[#f87171] flex items-center gap-1">
                        <Minus className="w-3 h-3" strokeWidth={3} />
                        {countLines(tab.lines, "remove")}
                      </span>
                    )}
                    <span className="text-accent flex items-center gap-1">
                      <Plus className="w-3 h-3" strokeWidth={3} />
                      {countLines(tab.lines, "add")}
                    </span>
                  </div>
                </div>

                {/* Diff body */}
                <div className="p-4 font-mono text-[12px] leading-[1.7] max-h-[480px] overflow-y-auto">
                  {tab.lines.map((line, idx) => (
                    <DiffLine key={idx} line={line} index={idx} />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function countLines(lines: DiffLine[], type: "add" | "remove"): number {
  return lines.filter((l) => l.type === type).length;
}

function DiffLine({ line, index }: { line: DiffLine; index: number }) {
  if (line.type === "meta") {
    return (
      <div className="flex items-center gap-3 py-1.5 px-3 my-2 rounded bg-accent/10 border-l-2 border-accent">
        <span className="text-accent text-[10px] font-medium tracking-wide">
          {line.text}
        </span>
      </div>
    );
  }

  const symbol =
    line.type === "add" ? "+" : line.type === "remove" ? "−" : " ";

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.008, 0.4) }}
      className={cn(
        "flex items-start gap-3 px-3 py-0.5 rounded",
        line.type === "add" && "bg-accent/5",
        line.type === "remove" && "bg-[#f87171]/5"
      )}
    >
      <span
        className={cn(
          "flex-shrink-0 w-3 text-center select-none",
          line.type === "add" && "text-accent",
          line.type === "remove" && "text-[#f87171]",
          line.type === "context" && "text-foreground-dim/40"
        )}
      >
        {symbol}
      </span>
      <span
        className={cn(
          "flex-1 whitespace-pre-wrap break-all",
          line.type === "add" && "text-foreground",
          line.type === "remove" && "text-foreground-muted line-through decoration-[#f87171]/40",
          line.type === "context" && "text-foreground-muted"
        )}
      >
        {line.text || " "}
      </span>
    </motion.div>
  );
}
