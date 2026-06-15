# ShipReady — Product Plan & Roadmap

> From vibe coded to production ready. The missing checklist for websites built in a weekend.

---

## The Problem

In the "vibe coding" era, anyone can ship a website in a weekend. But what gets ignored is everything around the code:

- **Legal**: Privacy Policy, Terms, Cookie Policy, GDPR/CCPA notices, Refund Policy
- **Compliance**: Cookie consent banners, data subject rights, breach procedures
- **Tech hygiene**: Custom 404/500 pages, robots.txt, sitemap.xml, security headers, HTTPS
- **SEO**: Meta tags, Open Graph, structured data, canonical URLs, performance
- **Ops**: Analytics, error monitoring, backups, uptime checks
- **Branding**: Favicon, social cards, manifest.json, PWA basics

Most non-developers don't even know these exist. **ShipReady** is the webapp that scans your repo, finds what's missing, and auto-generates the fixes.

---

## The Product Loop

```
User pastes GitHub URL
        ↓
[Onboard] Answer 4-5 context questions
          (collect emails? payments? EU users? cookies? user accounts?)
        ↓
[Scan] We fetch the file tree, run scanners in parallel
        ↓
[Report] User sees 0-100 score + categorized issues
         classified as 🔴 Critical / 🟡 Recommended / 🟢 Optional
         with "why this matters" explanations
        ↓
[Fix] User clicks "Generate" → preview diffs
        ↓
[Ship] User downloads a fixed ZIP, opens a PR, or one-clicks to Vercel
        ↓
[Track] Re-scan weekly → see "you went from 42 → 78"
        Optional policy-version updates when laws change
        ↓
[Paywall] Private repos, unlimited scans, deploy → $9/mo
```

---

## The Strategic Shift (Long-Term Positioning)

**Current** (v1): "Scan your repo for missing production essentials."

**Future** (v2+): "Understand exactly what your product needs before launch."

**One-liner differentiator**: *"ShipReady is the pre-launch checklist that actually thinks."*

This shift makes ShipReady harder to commoditize. The three UX pillars that make it real:

1. **Context-aware compliance** — questions, not templates
2. **Deploy blockers classification** — 🔴/🟡/🟢, not equal-weight checkboxes
3. **Explainer copy** — "why this matters," not just "this is missing"

If you ship those three, the positioning holds. Without them, it's just another file generator.

---

## Architecture (3 Layers)

```
┌──────────────────────────────────────────────────┐
│  Web app (Next.js 15)                            │
│  - Landing page ✅ (done)                        │
│  - /onboard (context questions)                  │
│  - /scan/[id] (report page)                      │
│  - /report/[id] (public launch report)           │
│  - /dashboard (auth required)                    │
│  - /badge/[repo-id].svg (README badge endpoint)  │
│  - /api/* (Next API routes)                      │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│  Engine (Node service)                           │
│  - Scanners (modular, parallel)                  │
│  - Context engine (rule selector)                │
│  - Generators (templates with variable injection)│
│  - Diffs (before/after computation)              │
│  - PDF export (puppeteer or react-pdf)           │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│  Data layer                                      │
│  - Postgres (scans, users, plans, repos)         │
│  - S3 (uploaded ZIPs, generated artifacts)       │
│  - Redis (scan jobs queue, idempotency cache)    │
└──────────────────────────────────────────────────┘
```

---

## Decisions Locked In (Recommended Defaults)

- **Files**: Templates (deterministic, lawyer-reviewed). No LLM for v1.
- **Access**: GitHub URL for public repos (Phase 1-2) → GitHub App for private (Phase 3).
- **Team**: Solo founder.
- **Pricing**: 3 tiers — Hobby free, Indie $9/mo, Team $39/mo.
- **Hosting**: Vercel (web) + Railway/Fly (engine worker).

---

## 4-Phase Roadmap (Re-prioritized)

### Phase 1: The Engine + Context (3-4 weeks)
*Build the core that actually thinks*

**Goal**: Get legal + secrets + license working end-to-end, with context questions driving what gets generated.

- [ ] Set up monorepo (Turbopack for web, separate `engine/` package)
- [ ] Postgres + Drizzle ORM
- [ ] Redis for scan queue + idempotency cache
- [ ] GitHub URL parser + tree fetcher (public repos, no auth)
- [ ] GitHub API response caching keyed on commit SHA
- [ ] **Context engine**: 4-5 onboarding questions (collect emails? payments? EU users? cookies? user accounts?)
- [ ] **Deploy blockers classification** (🔴/🟡/🟢) — `severity` field on the `Issue` type
- [ ] **3 policy generators** (privacy, terms, cookie) — template-based, context-aware variants
- [ ] **3 scanners**:
  - Legal (privacy/terms/cookie/refund file detection)
  - **Secrets** (hardcoded API keys, .pem/.key files, .env in repo) — *pulled in from backlog*
  - **License** (LICENSE file presence, dependency license mismatches) — *pulled in from backlog*
- [ ] `/onboard` page (context questions)
- [ ] `/scan/[id]` report page — minimal: score, blockers, "Generate" button, file preview
- [ ] "Download ZIP" button
- [ ] **Idempotency on re-scan** — skip if commit SHA unchanged
- [ ] **Ship to 5 friends. Get feedback.**

**Why this first**: The legal + secrets combo is the most painful + most concrete use case. Context questions + blockers classification are what differentiate from "yet another scanner."

### Phase 2: The Full Scan + Virality (3-4 weeks)

**Goal**: All major scanners, PR creation, viral distribution.

- [ ] **6 more scanners**:
  - SEO (sitemap, robots, OG, JSON-LD, canonical)
  - Errors (404/500, error.tsx, not-found.tsx)
  - Security (security.txt, CSP, headers, .gitignore)
  - Meta (favicon, manifest, apple-touch-icon, og-image)
  - A11y (lang attr, alt tags, aria-labels — lint level)
  - Broken Links (internal 404s, dead externals)
- [ ] **Generators** for each
- [ ] **Framework-aware scanning** — *pulled forward from Phase 4* (Next.js, Vite, Astro, etc.)
- [ ] **AI Explainer copy** — "why does this matter?" for each issue type — *pulled forward*
- [ ] **Open as PR** via GitHub bot token (no install needed for public repos)
- [ ] **Diff-only mode** — show diffs without opening a PR
- [ ] **Public launch reports** at `/report/[id]` — *pulled forward, this is the viral loop*
- [ ] **README score badge** at `/badge/[repo-id].svg` — *pulled forward, this is the permanent ad*
- [ ] Rate limit by IP (10 scans/day for anon)
- [ ] **Launch on Product Hunt** with free public-repo tier

**Why this phase is the inflection point**: Public reports + README badge = every repo that uses ShipReady becomes a distribution channel. PR creation = the action loop. This is where the product stops being a tool and becomes a platform.

### Phase 3: Monetize + Lock In (2-3 weeks)

**Goal**: Real users paying, real retention.

- [ ] Auth (Clerk or NextAuth + GitHub OAuth)
- [ ] **GitHub App** with proper permissions: `contents: read`, `pull-requests: write`
- [ ] **Private repo support** (Indie tier $9/mo)
- [ ] Stripe integration with 3 pricing tiers
- [ ] **Refund/cancellation flow** in Stripe (proactive, not reactive)
- [ ] **One-click deploy to Vercel** (only that one — no Sentry, no Plausible yet)
- [ ] `/dashboard` with scan history + "your score over time" chart
- [ ] **Re-scan comparison** — "you went from 42 → 78" (the killer retention feature)
- [ ] **PDF export** of any generated policy (lawyers want PDFs)
- [ ] Email notifications (Resend): "Your scan finished"
- [ ] **Policy version diff** — email when OpenAI/TOS changes affect your policy
- [ ] **Template version audit log** — track which template version was applied to which repo
- [ ] **Customer interviews**: 10 paying users, 5 churned free users

**Why this is when we get paid**: Auth + private repos unlocks the $9/mo tier. The re-scan comparison + policy version diff are the two features that turn ShipReady from a one-time tool into a subscription that renews itself. PDF export is the under-appreciated conversion lever.

### Phase 4: Distribute + Deepen (4+ weeks, ongoing)

**Goal**: Growth loop, deeper integrations, network effects.

- [ ] **ShipReady CLI** — `npx shipready scan`, `npx shipready fix` (wraps the same engine API; not a separate product)
- [ ] **Continuous monitoring** — alert on dep updates, new CVEs, sitemap breakage (webhook + CVE feed)
- [ ] **Optional Sentry + Plausible setup** (one-click, behind a paywall)
- [ ] **Custom domain for legal pages** — `legal.yourdomain.com`
- [ ] **GitHub Action** — runs ShipReady on every PR in CI
- [ ] **Templates marketplace** — community-contributed generator templates
- [ ] **Team features** — multi-repo, role-based access, audit log (already mostly built in Phase 3)
- [ ] **Competitor repo comparison** (cute agency feature, build if there's signal)
- [ ] **Multi-language policy support** (only if international users are >20% of scans)
- [ ] **GitLab + Bitbucket support** (only if the ask is loud)

**Why these come last**: They're all *growth* or *depth* features, not *product* features. The core product must be working and monetized before any of these are worth the attention.

---

## The 13 Scanners (Final List)

| # | Scanner | Severity if missing | Phase | Generator |
|---|---|---|---|---|
| 1 | **Legal** | 🔴 | 1 | Privacy/Terms/Cookie/Refund/DMCA templates |
| 2 | **Secrets** | 🔴 | 1 | Auto-redact + .gitignore + rotation checklist |
| 3 | **License** | 🟡 | 1 | LICENSE file (MIT/Apache-2.0/etc.) |
| 4 | **SEO** | 🟡 | 2 | sitemap, robots, OG, JSON-LD, canonical |
| 5 | **Errors** | 🟡 | 2 | 404.tsx, error.tsx, not-found.tsx |
| 6 | **Security** | 🔴 | 2 | security.txt, CSP, headers, .gitignore |
| 7 | **Meta** | 🟢 | 2 | favicon, manifest, apple-touch, og-image |
| 8 | **A11y (lint)** | 🟡 | 2 | Lint suggestions + accessibility statement |
| 9 | **Broken Links** | 🟡 | 2 | Link report + suggested redirects |
| 10 | **A11y (automated)** | 🟡 | 4 | axe-core results, auto-fix suggestions |
| 11 | **Mobile/Responsive** | 🟡 | 4 | Viewport tag injection + responsive checklist |
| 12 | **Schema Validation** | 🟢 | 4 | Auto-correct invalid JSON-LD |
| 13 | **Performance** | 🟢 | 4 | Checklist only (no auto-fix) |

Phase 1 ships 3. Phase 2 ships 6 more. Phase 4 ships 4 more.

---

## 3-Phase Monetization Math

| Tier | Price | Includes | Target persona |
|---|---|---|---|
| **Hobby** | Free forever | 3 scans/mo, public repos, view report, manual fix instructions | The "is this real?" visitor |
| **Indie** | $9/mo | Unlimited scans, private repos, auto-generate, PR creation, Vercel deploy, PDF export, re-scan comparison | The solo founder / indie hacker |
| **Team** | $39/mo | 5 team members, unlimited repos, CI integration, custom templates, audit log, priority support | The agency / small team |

**Realistic targets**:
- Month 3 (post-PH launch): 50 free, 5 paid ($45 MRR)
- Month 6: 500 free, 50 paid ($450 MRR)
- Month 12: 5,000 free, 500 paid ($4,500 MRR) + 10 Team ($390 MRR) = ~$4,900 MRR

---

## North Star Metric

**Weekly Active Scans → Fix Applied → Re-scan (7 days later)**

A returning user is the only signal that matters. A user who scans, fixes, and comes back a week later is a user who will pay. Track this weekly. If it's <20% in Month 3, the product isn't sticky enough — fix the re-scan comparison surface, not the marketing.

Secondary metrics:
- Public reports shared per week (virality)
- README badges deployed (permanent ad density)
- PDF exports per paid user (proxy for "this is real value")

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Generated legal pages aren't legally valid | High | Templates are lawyer-reviewed. "Not legal advice" disclaimer on every page. Recommend paid legal review for high-risk businesses. |
| GitHub App review is slow (4-6 weeks) | Medium | Use bot token for public repos in Phase 1-2. App for private in Phase 3 — start the review process early. |
| Scanner false positives (esp. secrets) | High | Whitelist common false positives. Always show the matched line + a "this is a false positive" button. Never auto-fix secrets, only flag. |
| People use once and leave | High | Re-scan comparison in Phase 3. Weekly email digests. Policy version diff for retention. |
| Vercel adds this themselves | Medium | We own the report UX, the explainer copy, the public launch reports, and the README badge. Those aren't worth Vercel's time. |
| Solo founder burnout | High | 10-12 week runway to revenue. If no $100 MRR by week 12, kill it or pivot. |
| Framework detection is wrong | Medium | Start Next.js only in Phase 1. Add Vite/Astro/Remix in Phase 2. "Auto-detect" never overrides explicit user choice — always show what we detected and let them correct. |

---

## What I'm NOT Building (Explicit Non-Goals)

- ❌ **Custom legal review** — Not a law firm. Disclaimer.
- ❌ **Self-hosted version** — SaaS only.
- ❌ **Landing page A/B tests** — One good page beats five okay ones.
- ❌ **Mobile app** — Web only.
- ❌ **AI policy generation** — Templates only. Liability is too high for LLM-only legal docs in v1.
- ❌ **Templates marketplace** (Phase 4+) — Cute, low ROI. Skip unless community asks.
- ❌ **Cloudflare/Sentry/PostHog one-click** in v1 — Too many OAuth flows. Vercel only in Phase 3.
- ❌ **Competitor comparison** — Build only if there's a paying agency asking.
- ❌ **Multi-language policies** — Build only when >20% of users ask.
- ❌ **GitLab/Bitbucket** — Build only when the ask is loud.

---

## This Week's Plan

If I were you, this week:

1. **Finalize the re-prioritized plan** (this doc)
2. **Set up the monorepo** — split out `engine/` from the Next.js app
3. **Draft the 4-5 context questions** (this is product design, do it before code)
4. **Find one lawyer-reviewed privacy policy template** and adapt it for SaaS, e-commerce, blog variants
5. **Write the secrets scanner** — even a rough one (regex + .env detection) is useful on day 1
6. **Manually test on 5 real GitHub repos** of vibe-coded projects
7. **Show those 5 people the result**, ask if they'd pay $9/mo

That last step is the most important. Everything before it is implementation. Everything after it is distribution.

---

## Open Questions

- [ ] **Pricing for free tier**: Truly free (3 scans/mo) or freemium-with-email (unlimited but email required)?
- [ ] **Self-serve legal templates or "lawyer-reviewed" badge**: Premium templates cost $$$ to maintain. Worth it?
- [ ] **Where to host**: Vercel (fast, easy, expensive at scale) vs Railway/Fly (cheaper, more setup)?
- [ ] **PDF export library**: react-pdf (good DX, big bundle) vs puppeteer (heavyweight, perfect output)?
- [ ] **Auth provider**: Clerk (fast, $) vs NextAuth + GitHub OAuth (free, more code)?

---

## Strategic Additions I'll Be Watching

These are the features I think will define the v2 product. They don't ship in v1 but the architecture should leave room for them:

1. **Policy version diff** — Email users when external laws/ToS change. Built in Phase 3.
2. **Re-scan comparison** — "You went from 42 → 78." Built in Phase 3.
3. **PDF export** — Lawyers want PDFs. Built in Phase 3.
4. **Public launch reports** — `shipready.dev/report/[id]`. Built in Phase 2.
5. **README score badge** — `![ShipReady](shipready.dev/badge/[id].svg)`. Built in Phase 2.
6. **Framework-aware scanning** — Next.js, Vite, Astro rules. Built in Phase 2.

The features that *should* be deferred until signal: marketplace, multi-language, competitor comparison, GitLab support.

---

*Last updated: 15 June 2026 — re-prioritized after first review*
