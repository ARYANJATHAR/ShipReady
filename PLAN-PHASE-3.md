# Phase 3 Plan (Revised) — AI-Powered Generation + Real Images

## What changed from the original Phase 3 plan
The original Phase 3 plan focused on auth, payments, and DB. **This revision drops all of that** (deferred indefinitely) and instead focuses on the engine itself:

- **AI-driven generation** that reads the actual codebase and produces content tailored to the repo (no more 5-question onboarding as a workaround)
- **Real image generation** (Satori + sharp) — actual favicons and OG images, not "go make one" instructions
- **Better codebase awareness** — curated file fetcher with size caps, extracts project name, description, contact email, brand color, existing copy style

Per user direction: "do everything just static and default" — no Clerk, no Stripe, no Postgres. Pure engine + web app improvements. AI is added behind a single env var; if no key is set, the existing static templates are used as fallback (so the product still works without AI).

## Stack
- **AI provider**: OpenRouter (OpenAI-compatible, single API key gives access to Claude/GPT/Gemini/Llama). Default model: `anthropic/claude-3.5-haiku` for code-aware tasks. Other providers (NVIDIA, Gemini, TokenRouter) can be swapped via `AI_BASE_URL` env var.
- **Image generation**: `satori` (React JSX → SVG) + `@resvg/resvg-js` (SVG → PNG) + `sharp` (resize, format conversion). Same approach as `@vercel/og`. No Chromium dependency.
- **Caching**: in-memory LRU keyed by `repoUrl + context hash`. TTL 24h. No DB needed.

## Build order (6 commits, each shippable)

### Commit 1: AI provider module
**Why first:** Foundation for everything else. Get the wiring right before we write a single AI call.

- `npm install openai` (the official SDK works against any OpenAI-compatible endpoint)
- New file: `lib/ai.ts`
  ```typescript
  // Single client, swappable via env vars.
  // Default: OpenRouter with Claude 3.5 Haiku.
  // Works with: OpenRouter, OpenAI, Google Gemini, NVIDIA, TokenRouter, any OpenAI-compatible API.
  import OpenAI from "openai";

  export const aiEnabled = !!process.env.AI_API_KEY;

  export const ai = new OpenAI({
    apiKey: process.env.AI_API_KEY || "sk-placeholder",
    baseURL: process.env.AI_BASE_URL || "https://openrouter.ai/api/v1",
    defaultHeaders: process.env.AI_BASE_URL?.includes("openrouter")
      ? { "HTTP-Referer": "https://shipready.dev", "X-Title": "ShipReady" }
      : undefined,
  });

  export const defaultModel = process.env.AI_MODEL || "anthropic/claude-3.5-haiku";
  ```
- New file: `lib/ai/cache.ts` — in-memory LRU. 100 entries max, 24h TTL. Key = `sha256(prompt + model)`.
- New file: `lib/ai/prompt.ts` — small helper that wraps `ai.chat.completions.create` with caching, JSON mode, and a timeout.
- Add to `.env.example`:
  ```
  # AI generation (optional — leave blank to use static templates)
  AI_API_KEY=
  AI_BASE_URL=https://openrouter.ai/api/v1
  AI_MODEL=anthropic/claude-3.5-haiku
  ```
- `app/api/ai-status/route.ts` — GET returns `{ enabled: boolean, model: string, baseUrl: string }` so the UI can show a "AI mode" badge
- Ship criteria: With no key set, `aiEnabled === false` and the existing flow works unchanged. With a key set, a test prompt returns a response.

### Commit 2: Curated codebase reader
**Why second:** AI generation is only as good as the context we feed it. Need a smart file fetcher.

- New file: `engine/src/codebase-context.ts`
  ```typescript
  export interface CodebaseContext {
    // Inferred
    projectName: string;            // "shipready" or "ShipReady" — picked from package.json or repo name
    projectDisplayName: string;      // "ShipReady" — human-readable
    description: string;             // 1-line description from README or package.json
    contactEmail: string;            // extracted from existing policies or package.json author
    brandColor: string;              // hex, from tailwind config, manifest, or package.json keywords
    siteUrl: string;                 // from package.json homepage, OG tags in layout, or repo name + .com

    // Existing copy (for matching style)
    existingCopy: {
      readmeSnippet: string;
      existingPolicies: Record<string, string>;
    };

    // File inventory
    pages: string[];
    components: string[];
    hasTests: boolean;
    hasCI: boolean;
    packageManager: "npm" | "pnpm" | "yarn" | "bun";
  }
  ```
- High-signal file list (curated, capped at 50KB total content):
  ```
  README.md, readme.md, README.txt
  package.json
  tsconfig.json
  tailwind.config.{js,ts,mjs}
  app/layout.tsx, app/layout.{jsx,html}, src/app/layout.tsx
  app/page.tsx, src/pages/index.astro, public/index.html
  app/(legal)/privacy/page.mdx, privacy.md, PRIVACY.md
  app/(legal)/terms/page.mdx, terms.md, TERMS.md
  LICENSE, LICENSE.md
  .github/workflows/*.yml
  src/pages/**/*.astro, app/**/page.tsx
  ```
- `engine/src/codebase-context.ts` exports `buildCodebaseContext(repoUrl): Promise<CodebaseContext>`. Internally:
  1. `getRepoTree` — already in `engine/src/github.ts`
  2. Filter tree to high-signal paths
  3. `getFileContents` (already exists) for those paths
  4. Parse + normalize into the `CodebaseContext` shape
  5. Total content size check — truncate README to 2000 chars, policies to 500 each, layout to 1000
- `lib/codebase-cache.ts` — in-memory cache by repoUrl. Same LRU as AI cache.
- Ship criteria: For a known repo, `buildCodebaseContext("https://github.com/vercel/next.js")` returns a sensible object in <2 seconds. The `pages` field reflects what's actually in `app/` and `pages/`.

### Commit 3: AI-powered policy generation
**Why third:** The biggest "wow" moment — policy text that actually matches the repo.

- Refactor `engine/src/generators/privacy-policy.ts`, `terms.ts`, `cookie-policy.ts`:
  - Add a new code path: if `aiEnabled && codebaseContext`, call the LLM
  - Prompt: "You are drafting a privacy policy for {projectName}. Repo context: {codebaseContext}. Context answers: {context}. Generate a complete privacy policy following this structure: [...]"
  - System prompt enforces: "Match the tone of the existing README. Reference specific tech from the codebase (e.g. 'we use Stripe for payments' only if payments:true). Use {contactEmail} as the contact. Include the GDPR/CCPA sections based on context. Add the 'not legal advice' disclaimer."
  - Output: a full markdown document, returned as a string
  - Falls back to the existing static template if AI fails or returns invalid output
- New file: `engine/src/generators/_ai-prompts.ts` — central place for all AI prompts. Each generator has a `buildPrompt(context): string` and a `validateOutput(text): boolean`.
- Validation: AI output must include the contact email, the project name, the disclaimer, and at least 5 section headers. Otherwise fall back to the static template.
- Cost guardrail: each AI call uses ~2000 input tokens + ~2000 output tokens max. With Claude Haiku, that's ~$0.012 per call. Cache hits are free.
- Update `/api/scan` to pass `codebaseContext` into `generateFixes()`
- Ship criteria: Run a scan on a real repo → the generated privacy policy reads as if a human wrote it for that project, with the correct contact email and tech stack mentioned. With `AI_API_KEY=` blank, the existing static templates work as before.

### Commit 4: AI-powered SEO + meta generation
**Why fourth:** Same AI infrastructure, different generators.

- Refactor `og-tags.ts`, `jsonld.ts`, `sitemap.ts`, `robots.ts`:
  - **OG tags**: AI extracts a punchy 1-line description from README. Infers `twitterHandle` from any GitHub link in the package.json or README.
  - **JSON-LD**: AI builds the Organization schema with the right name, URL, description, contact email. Falls back to the static template.
  - **Sitemap**: Read the actual routes from the codebase (already in `codebaseContext.pages`). If the user has `app/(marketing)/pricing/page.tsx`, the sitemap includes `/pricing`. **No more hardcoded `/pricing, /about, /blog` guesses** — actual routes only.
  - **Robots.txt**: AI picks the right rules based on what's in the repo (e.g. disallow `/api/*` if there are API routes, disallow `/admin` if there's an admin folder).
- For Sitemap: if `codebaseContext.pages` is empty, fall back to `["/", "/privacy", "/terms"]` (the minimum useful set).
- Update `manifest.ts` to use the inferred project name + brand color
- Ship criteria: A scan of a real Next.js project with `app/(marketing)/pricing/page.tsx`, `app/blog/page.tsx`, `app/(legal)/privacy/page.tsx` produces a sitemap that lists those exact routes. OG tags match the project's README tone.

### Commit 5: Real image generation (Satori + sharp)
**Why fifth:** The biggest gap in the current product. Replace "FAVICON-INSTRUCTIONS.md" with actual files.

- `npm install satori @resvg/resvg-js sharp`
- New file: `engine/src/generators/images.ts` — replaces `image-placeholders.ts`
  ```typescript
  // Render a React-like JSX template to SVG via Satori,
  // then convert to PNG via @resvg/resvg-js,
  // then resize for each required dimension via sharp.

  export interface ImageGeneratorInput {
    projectName: string;        // "ShipReady"
    displayInitials?: string;   // "SR" (auto-derived if not provided)
    brandColor: string;         // "#c4f542"
    textColor?: string;
    style: "solid" | "gradient" | "letter" | "wordmark";
  }
  ```
- Output: 5 files in the right framework-aware paths:
  - `app/favicon.ico` (32x32 PNG, renamed as .ico — works in all browsers)
  - `app/apple-icon.png` (180x180)
  - `app/icon-192.png` (192x192, PWA)
  - `app/icon-512.png` (512x512, PWA)
  - `app/opengraph-image.png` (1200x630, social sharing)
- The favicon design: a colored square background + the project initials in white. Brand color from codebase context (default: a tasteful color picked from the project name hash).
- The OG image: a wider layout — project name + tagline + subtle pattern, all in the brand color.
- Satori requires a font. Use Inter (open source, Vercel's default). Bundle it locally so we don't depend on a CDN at request time.
- Fallback: if Satori fails (e.g. font issue), generate a simple solid-color square via sharp directly.
- Update `generateFixes()` in `engine/src/index.ts` to handle the new image generator output (returns binary buffers, not text).
- Update `engine/src/zip.ts` to handle binary files in the output ZIP.
- Ship criteria: Run a scan. The downloaded ZIP contains 5 real image files (not instructions). Open `opengraph-image.png` and it shows your project name on a colored background.

### Commit 6: Smart onboarding (skip the 5 questions when AI is on)
**Why last:** Ties it all together. The whole point of AI generation is that the user shouldn't have to answer 5 questions.

- New file: `app/onboard/ai-mode/page.tsx` — the AI-mode onboarding. Single screen:
  - Big spinner: "Reading your repo…"
  - Once done, shows a "Here's what we found" review card:
    - Project name (editable)
    - Description (editable)
    - Contact email (editable)
    - Region (auto-detected from package.json `homepage` URL or TLD, with a select to override)
    - 3 quick toggles: collects emails, processes payments, serves EU users — pre-inferred from README keywords and package.json dependencies
  - "Run scan" button
- Update `app/page.tsx` (landing) — add a banner: "AI mode is on — we'll read your repo to generate accurate content" (only if `aiEnabled`). Or: "Static mode — answer 5 questions to tailor the output" (if not).
- Update `app/onboard/page.tsx` to redirect: if `aiEnabled`, send users to `/onboard/ai-mode`. Otherwise, show the existing 5-question flow.
- Ship criteria: With `AI_API_KEY` set, `/onboard?repo=...` skips the 5 questions and goes straight to the review screen. With no key, the existing flow is unchanged.

## Orchestrator changes

In `engine/src/index.ts`:
- `scanRepo()` accepts an optional `codebaseContext` field on the result (built by `buildCodebaseContext`)
- `generateFixes()` reads `codebaseContext` and uses it to pass into AI-powered generators
- If `aiEnabled`, every generator that has an AI path uses it
- All AI calls are wrapped in a try/catch — on failure, fall back to the static template
- Add a `generationMode: "ai" | "static"` field to the `Fix` interface so the UI can show a "AI-generated" badge

In `app/api/scan/route.ts`:
- After `scanRepo`, if `aiEnabled`, call `buildCodebaseContext` and pass it into `generateFixes`
- This means scans take slightly longer when AI is on (~2-5s for the codebase fetch + ~3-10s for the AI calls)
- The scan page already shows a "generating..." state, so this is invisible to the user

In `engine/src/types.ts`:
- Add `CodebaseContext` to the exported types
- Add `generationMode: "ai" | "static"` to the `Fix` interface
- Add `aiEnabled: boolean` to `ScanResult` so the UI can show a global "AI mode" indicator

## Files added (rough count)

- 3 new lib modules (`lib/ai.ts`, `lib/ai/cache.ts`, `lib/ai/prompt.ts`)
- 3 new engine modules (`engine/src/codebase-context.ts`, `engine/src/generators/images.ts`, `engine/src/generators/_ai-prompts.ts`)
- 1 new API route (`/api/ai-status`)
- 1 new page (`/onboard/ai-mode`)
- New font asset (`public/fonts/Inter-Bold.ttf`, ~300KB)
- 1 npm dep group: `openai`, `satori`, `@resvg/resvg-js`, `sharp`
- Updates to: 6 generator files, `engine/src/index.ts`, `engine/src/zip.ts`, `engine/src/types.ts`, `app/api/scan/route.ts`, `app/api/generate/route.ts`, `app/onboard/page.tsx`, `app/page.tsx`, `.env.example`, `package.json`

## Files modified

- `engine/src/generators/privacy-policy.ts` — AI path + static fallback
- `engine/src/generators/terms.ts` — AI path + static fallback
- `engine/src/generators/cookie-policy.ts` — AI path + static fallback
- `engine/src/generators/og-tags.ts` — AI-extracted description
- `engine/src/generators/jsonld.ts` — AI-built schema
- `engine/src/generators/sitemap.ts` — uses `codebaseContext.pages`
- `engine/src/generators/robots.ts` — AI-picked rules
- `engine/src/generators/manifest.ts` — inferred name + brand color
- `engine/src/generators/image-placeholders.ts` — REPLACED by `images.ts`
- `engine/src/index.ts` — wire codebase context, pass to generators
- `engine/src/zip.ts` — handle binary image files
- `engine/src/types.ts` — add `CodebaseContext`, `generationMode`
- `app/api/scan/route.ts` — call `buildCodebaseContext` when AI is enabled
- `app/onboard/page.tsx` — redirect to AI-mode when enabled
- `app/page.tsx` — show AI mode banner
- `.env.example` — new env vars
- `package.json` — new deps

## Out of scope (deferred, possibly forever)
- Auth, payments, DB (per user)
- GitHub push / PR creation (per user — keep ZIP)
- Customer interviews (not code)
- Sentry/Plausible/CI integration
- Custom domain for legal pages
- GitHub Action
- Templates marketplace
- Multi-language policies
- GitLab/Bitbucket support
- Multi-region DB

## Validation
- `npm run build` succeeds
- `AI_API_KEY=` blank → entire flow works exactly as today (static templates)
- `AI_API_KEY=sk-...` set with OpenRouter → policies are tailored to the repo, OG image is a real PNG, sitemap reflects actual routes
- A scan of `vercel/next.js` produces a privacy policy that mentions Next.js by name, a sitemap with all real routes, a favicon with `NJ` on a colored background, an OG image at 1200x630
- A scan of `sindresorhus/awesome` (markdown-only repo) still works — AI detects there's no real framework, falls back to sensible defaults
- A scan of an unreachable repo shows a clear error (AI doesn't mask the failure)
- Cost per scan (Claude 3.5 Haiku): ~$0.05–$0.10
- Cost per scan (free Llama 3.1 70B on OpenRouter): $0
- Latency: 5-15s for a full AI scan

## Risks
- **AI hallucinations** — could invent tech that isn't there. Mitigation: validation step that checks key fields, falls back to static + inferred values.
- **Cost overruns** — a popular repo scanned 1000 times/day could be $50–$100/day. Mitigation: aggressive caching (24h TTL keyed by repoUrl + context) + per-repo daily cap.
- **Provider downtime** — OpenRouter could go down. Mitigation: try/catch around every AI call, fall back to static.
- **Satori font licensing** — Inter is OFL, fine. Bundle locally to avoid CDN at request time.
- **Sharp native bindings** — can fail to install on some platforms. Mitigation: pin a specific version known to work on Vercel's Linux build.
- **Inferred context could be wrong** — auto-detected contact email from package.json author field might be a personal email. Mitigation: AI-mode onboarding always shows inferred values for review/override before generating.

## Open questions
1. **Default model** — Claude 3.5 Haiku (good quality, $1/$5 per M tokens) vs Llama 3.1 70B (free, slower). **Recommendation:** start with Haiku via OpenRouter, document how to switch to free Llama in `.env.example`.
2. **Should we always run AI, or only when the user opts in?** **Recommendation:** when `AI_API_KEY` is set, AI is always on. When unset, static mode. No in-product toggle for v1.
3. **Brand color inference** — always pick one, or use "no color" (default black) when we can't infer? **Recommendation:** always pick one. Default to a tasteful color derived from the project name hash.
4. **Font in Satori** — Inter vs Geist vs letting the user upload their own. **Recommendation:** Inter for v1.
5. **Should the AI scan include a model badge in the report?** "Generated with Claude 3.5 Haiku via OpenRouter". **Recommendation:** yes, add a small "ai" pill in the diff viewer when `generationMode === "ai"`.
