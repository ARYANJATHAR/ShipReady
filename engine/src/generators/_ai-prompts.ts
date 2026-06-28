/**
 * AI prompts for the policy generators.
 *
 * Centralizes every prompt + validation function for the three legal-doc
 * generators. Each generator's AI path:
 *   1. Builds a prompt from the codebase context + project context
 *   2. Calls the LLM
 *   3. Validates the output (must mention project name, contact email, etc.)
 *   4. Returns the text, or null if validation fails (caller falls back)
 *
 * Why a separate file:
 *   - Prompts are too long to live in the generator files (would be 90% prompt)
 *   - Easier to A/B test prompts in one place
 *   - Validation logic is shared across all three generators
 *
 * The system prompt enforces the "not legal advice" disclaimer, the
 * "match the tone of the existing README" instruction, and the requirement
 * to be specific to the actual tech stack (no hallucinated Stripe
 * references if payments is false, no GDPR sections if EU is false, etc.).
 */

import type { CodebaseContext } from "../types";
import type { ProjectContext } from "../types";
import { aiEnabled, defaultModel } from "@/lib/ai";
import { runPrompt } from "@/lib/ai/prompt";

// ============================================================================
// Shared helpers
// ============================================================================

/**
 * Strip a reasoning model's <think>...</think> block from the output.
 *
 * MiniMax-M3 (and other reasoning models) sometimes wrap their thinking
 * inside <<think>>...</<think>> tags at the start of the response. This is
 * noise for our use case — we want just the policy text.
 *
 * Behavior:
 *   - If the model returned a single leading <think> block, strip it.
 *   - If there are multiple <think> blocks (rare), keep only the content
 *     after the last one.
 *   - If no <think> blocks, return the text unchanged.
 */
export function stripThinking(text: string): string {
  // Strategy: find the LAST </think> and return everything after it.
  // If there's no </think>, return the text unchanged.
  // Reasoning models wrap their thinking inside <<think>>...</<think>>
  // and put the actual response AFTER the closing tag.
  const lastClose = text.lastIndexOf("</think>");
  if (lastClose === -1) {
    // No closing tag — the entire response is the answer
    return text.trim();
  }

  // Return content after the last </think>
  const after = text.slice(lastClose + "</think>".length).trim();
  if (after.length > 0) return after;

  // The entire response was wrapped in a single <think>...</think> block
  // (no content after the close). Extract what's inside if it looks like
  // a real answer (Markdown header, "not legal advice" phrase, or policy keyword).
  const firstOpen = text.indexOf("<think>");
  if (firstOpen !== -1) {
    const inside = text.slice(firstOpen + "<think>".length, lastClose).trim();
    if (inside.length > 100 && (/^#/.test(inside) || /not legal advice/i.test(inside) || /\bprivacy\b|\bterms\b|\bcookie\b/i.test(inside))) {
      return inside;
    }
  }

  return text.trim();
}

/**
 * Strip LLM meta-commentary that sometimes appears at the start of the output.
 *
 * Reasoning models occasionally emit thinking as plain text (no <think> tags),
 * starting with phrases like "The user wants...", "Let me draft...", etc.
 * The actual policy follows, typically starting with a Markdown header (#).
 *
 * Strategy: if the text starts with a known meta-phrase, find the first
 * Markdown header and return everything from there.
 */
export function stripMetaCommentary(text: string): string {
  // If the disclaimer is already in the first 500 chars, leave the text alone.
  // The disclaimer must come before the H1 title.
  const head = text.slice(0, 500);
  if (/not legal advice/i.test(head)) {
    return stripTrailingMeta(text);
  }

  // Otherwise, check for leading meta-commentary and strip down to the
  // first Markdown header. Only strip if the meta-pattern is detected —
  // otherwise we'd risk chopping off a valid policy that just happens
  // to start with one of these words.
  const metaPatterns = /^(the user wants|i need to|let me (draft|write|create|analyze)|sure[,.]?|here'?s|i'?ll (draft|write|create)|let'?s (start|begin|draft|write)|certainly[,.]?)/i;
  if (!metaPatterns.test(text.trim())) {
    return stripTrailingMeta(text);
  }

  // Find the first Markdown header (#, ##, ###) and start from there
  const headerMatch = text.match(/^#\s+/m);
  if (headerMatch && headerMatch.index !== undefined) {
    return stripTrailingMeta(text.slice(headerMatch.index));
  }
  return stripTrailingMeta(text);
}

/**
 * Strip LLM meta-commentary that appears AFTER the policy (e.g. "Let me count
 * the words...", "Actually, let me re-read...").
 *
 * Heuristic: find the last "## Contact" or "## " header near the end, and
 * cut at the first meta-pattern after it. If no meta-pattern is detected,
 * return the text unchanged.
 */
function stripTrailingMeta(text: string): string {
  // Find a meta-pattern after the last major section header
  const metaRegex = /(let me (count|re-?read|reconsider|also|expand|add|revise|check)|actually,? let me|i should|i can also|let me also|the output should|i'?ll (just|also)|let me write the final|let me expand)/gi;
  const match = text.match(metaRegex);
  if (!match || !match.index) return text;

  // Find the last section header (## ...) before the meta. If the meta is
  // after the last header, cut there.
  const metaStart = match.index;
  const beforeMeta = text.slice(0, metaStart);

  // Only cut if the meta is in the last 30% of the text
  if (metaStart < text.length * 0.7) return text;

  // Cut at the meta, then trim trailing whitespace
  return beforeMeta.trimEnd() + "\n";
}

/**
 * Build a compact, human-readable description of the codebase for the prompt.
 * Keeps the token count bounded (~500 tokens max) so the prompt stays cheap.
 */
function describeCodebase(ctx: CodebaseContext): string {
  const lines: string[] = [];
  lines.push(`- Project name: ${ctx.projectDisplayName} (slug: ${ctx.projectName})`);
  if (ctx.description) lines.push(`- Description: ${ctx.description}`);
  if (ctx.siteUrl) lines.push(`- Website: ${ctx.siteUrl}`);
  if (ctx.contactEmail) lines.push(`- Contact email: ${ctx.contactEmail}`);
  lines.push(`- Framework: ${ctx.framework}`);
  lines.push(`- Package manager: ${ctx.packageManager}`);
  lines.push(`- Region (best guess): ${ctx.region}`);
  if (ctx.pages.length > 0) {
    lines.push(`- Pages in the app: ${ctx.pages.join(", ")}`);
  }
  if (ctx.components.length > 0) {
    lines.push(`- Components: ${ctx.components.slice(0, 10).join(", ")}${ctx.components.length > 10 ? ` (+${ctx.components.length - 10} more)` : ""}`);
  }
  lines.push(`- Has tests: ${ctx.hasTests ? "yes" : "no"}`);
  lines.push(`- Has CI: ${ctx.hasCI ? "yes" : "no"}`);
  if (ctx.existingCopy.readmeSnippet) {
    lines.push(`- Existing README snippet (first ~500 chars):\n"""\n${ctx.existingCopy.readmeSnippet.slice(0, 500)}\n"""`);
  }
  if (Object.keys(ctx.existingCopy.existingPolicies).length > 0) {
    lines.push(`- Existing policies found: ${Object.keys(ctx.existingCopy.existingPolicies).join(", ")}`);
  }
  return lines.join("\n");
}

/**
 * Build a compact, human-readable description of the user's project context
 * (the 5 onboarding answers). Used to keep policy language aligned with the
 * business's actual surface area.
 */
function describeProjectContext(ctx: ProjectContext): string {
  return [
    `- Collects emails: ${ctx.collectsEmails ? "yes" : "no"}`,
    `- Processes payments: ${ctx.processesPayments ? "yes" : "no"}`,
    `- Serves EU/EEA/UK users: ${ctx.servesEuUsers ? "yes" : "no"}`,
    `- Uses cookies/tracking: ${ctx.usesCookies ? "yes" : "no"}`,
    `- Business type: ${ctx.businessType}`,
    `- Region: ${ctx.region}`,
  ].join("\n");
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a policy output. Returns true if the text is usable, false
 * otherwise. Catches the most common AI failure modes:
 *   - Empty or too short
 *   - Missing the project name (forgot to fill in the placeholder)
 *   - Missing the contact email
 *   - Missing the "not legal advice" disclaimer
 *   - Fewer than 5 section headers (truncated, hallucinated skeleton)
 */
export function validatePolicyOutput(
  text: string,
  projectName: string,
  contactEmail: string
): { ok: boolean; reason?: string } {
  if (!text || text.length < 500) {
    return { ok: false, reason: "too_short" };
  }

  // Strip the thinking block for validation purposes
  const cleaned = stripThinking(text).toLowerCase();

  // Must mention the project name (case-insensitive, allow partial match
  // for names like "shipready" matching "ShipReady")
  const nameLower = projectName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (nameLower.length >= 3 && !cleaned.includes(nameLower)) {
    return { ok: false, reason: "missing_project_name" };
  }

  // Must mention the contact email
  if (contactEmail && !cleaned.includes(contactEmail.toLowerCase())) {
    return { ok: false, reason: "missing_contact_email" };
  }

  // Must include the disclaimer. We accept a few common phrasings:
  //   "not legal advice"
  //   "does not constitute legal advice"
  //   "is not legal advice"
  //   "not a substitute for legal advice"
  const hasDisclaimer =
    /not legal advice/i.test(text) ||
    /not constitute legal advice/i.test(text) ||
    /does not (constitute|provide) legal advice/i.test(text) ||
    /not a substitute for legal advice/i.test(text);
  if (!hasDisclaimer) {
    return { ok: false, reason: "missing_disclaimer" };
  }

  // Must have at least 5 section headers
  const headerCount = (text.match(/^##\s+\d+\./gm) ?? []).length
    + (text.match(/^##\s+[A-Z]/gm) ?? []).length;
  if (headerCount < 5) {
    return { ok: false, reason: "too_few_sections" };
  }

  return { ok: true };
}

// ============================================================================
// Privacy policy
// ============================================================================

const PRIVACY_POLICY_SYSTEM = `You are a careful legal-writing assistant. You draft privacy policies for indie developers and small teams. Your output:

- Is grounded in the actual repo context provided. Never invent tech that isn't there.
- References only the frameworks the user actually needs (GDPR only if EU users, CCPA only if US, etc.).
- Uses the exact contact email and project name provided. Never use placeholders.
- Is written in plain English, with short paragraphs and clear section headings.
- Includes a "not legal advice" disclaimer at the top.
- Follows the section structure provided.
- CRITICAL — Payment processing: If 'processesPayments' is false, you MUST NOT mention Stripe, Paddle, or any payment processor by name, and MUST NOT include language about payment processing, billing, subscriptions, invoicing, transaction fees, credit card collection, or refund policies. Write as if payment processing simply does not exist. If 'processesPayments' is true, mention Stripe generically ("we use a third-party payment processor such as Stripe") — never invent a specific processor.
- Does not include analysis, commentary, or anything outside the policy text itself.
- Does not start with greetings like "Sure, here is..." — start directly with the policy.
- IMPORTANT: do NOT include any meta-commentary, thinking, planning, or preambles in your output. Output ONLY the policy text starting with the H1 title. No "Let me draft...", no "The user wants...", no "I'll write...".`;

const PRIVACY_POLICY_SECTIONS = `1. Introduction / What This Policy Covers
2. Information We Collect (only categories that match the context)
3. How We Use Your Information
4. Legal Basis for Processing (only if EU users)
5. Cookies and Tracking (only if cookies are used)
6. Third-Party Services We Use (only the ones relevant to this project)
7. International Data Transfers (only if EU users and data is hosted outside EEA)
8. Data Retention
9. Your Rights (GDPR or CCPA section, based on region)
10. Children's Privacy
11. Security
12. Changes to This Policy
13. Contact Us

Use the section numbers above. Skip sections that don't apply (e.g. omit "Legal Basis" if no EU users).`;

export async function generatePrivacyPolicyWithAI(input: {
  projectName: string;
  contactEmail: string;
  description: string;
  projectContext: ProjectContext;
  codebase: CodebaseContext;
  effectiveDate?: string;
}): Promise<{ ok: true; text: string; model: string } | { ok: false; reason: string; model: string; raw?: string }> {
  if (!aiEnabled) return { ok: false, reason: "ai_disabled", model: defaultModel };

  const date = input.effectiveDate || new Date().toISOString().slice(0, 10);

  const userPrompt = `Draft a privacy policy for the following project.

PROJECT CONTEXT (the user's 5 onboarding answers):
${describeProjectContext(input.projectContext)}

CODEBASE CONTEXT (what we read from the repo):
${describeCodebase(input.codebase)}

OUTPUT REQUIREMENTS:
- Effective date: ${date}
- Project name to use: ${input.projectName}
- Contact email to use: ${input.contactEmail}
- Write in Markdown, with a single H1 title and numbered H2 sections
- Section structure (skip sections that don't apply based on the context):
${PRIVACY_POLICY_SECTIONS}
- Match the tone of the existing README snippet if one is provided
- Keep the policy to ~1500-2500 words. Concise but complete.
- Use the exact contact email (${input.contactEmail}) and project name (${input.projectName}) throughout — no placeholders
- Output ONLY the policy text. No preamble, no explanation, no "Here's your policy" intro.
- CRITICAL: If PROJECT CONTEXT says processesPayments is false, ABSOLUTELY DO NOT mention Stripe, billing, subscriptions, refunds, or payment processing of any kind. The policy must read as if payments are not part of the service.`;

  const result = await runPrompt({
    system: PRIVACY_POLICY_SYSTEM,
    user: userPrompt,
    temperature: 0.3,
    maxTokens: 2500,
  });

  if (!result.ok) {
    return { ok: false, reason: result.error, model: result.model };
  }

  const cleaned = stripMetaCommentary(stripThinking(result.text));
  const validation = validatePolicyOutput(cleaned, input.projectName, input.contactEmail);
  if (!validation.ok) {
    return { ok: false, reason: validation.reason || "validation_failed", model: result.model, raw: cleaned };
  }

  return { ok: true, text: cleaned, model: result.model };
}

// ============================================================================
// Terms of service
// ============================================================================

const TERMS_SYSTEM = `You are a careful legal-writing assistant. You draft terms of service for indie developers and small teams. Your output:

- Is grounded in the actual repo context provided. Never invent tech that isn't there.
- Uses the exact contact email and project name provided. Never use placeholders.
- Is written in plain English, with short paragraphs and clear section headings.
- Includes a "not legal advice" disclaimer at the top.
- CRITICAL — Payment processing: If 'processesPayments' is false, you MUST OMIT all subscription, billing, payment, and refund sections entirely. Do NOT mention Stripe, payment processors, transaction fees, pricing tiers, late fees, invoice disputes, or any payment-related language. If 'processesPayments' is true, include standard subscription and refund language (mention Stripe generically, never invent a specific processor).
- Includes the right governing law for the region (Delaware for US, Ireland for EU, etc.).
- Does not include analysis, commentary, or anything outside the terms text itself.
- Does not start with greetings like "Sure, here is..." — start directly with the terms.
- IMPORTANT: do NOT include any meta-commentary, thinking, planning, or preambles in your output. Output ONLY the terms text starting with the H1 title. No "Let me draft...", no "The user wants...", no "I'll write...".`;

const TERMS_SECTIONS = `1. Acceptance of These Terms
2. Accounts
3. Use of the Service
4. Subscriptions and Payments (only if the project processes payments)
5. Refunds (only if the project processes payments)
6. Intellectual Property
7. Termination
8. Limitation of Liability
9. Disclaimer (warranty disclaimer)
10. Changes to These Terms
11. Governing Law
12. Contact Us

Use the section numbers above. Skip sections that don't apply (e.g. omit "Subscriptions and Payments" and "Refunds" if no payments).`;

export async function generateTermsWithAI(input: {
  projectName: string;
  contactEmail: string;
  description: string;
  projectContext: ProjectContext;
  codebase: CodebaseContext;
  effectiveDate?: string;
}): Promise<{ ok: true; text: string; model: string } | { ok: false; reason: string; model: string; raw?: string }> {
  if (!aiEnabled) return { ok: false, reason: "ai_disabled", model: defaultModel };

  const date = input.effectiveDate || new Date().toISOString().slice(0, 10);

  const userPrompt = `Draft terms of service for the following project.

PROJECT CONTEXT (the user's 5 onboarding answers):
${describeProjectContext(input.projectContext)}

CODEBASE CONTEXT (what we read from the repo):
${describeCodebase(input.codebase)}

OUTPUT REQUIREMENTS:
- Effective date: ${date}
- Project name to use: ${input.projectName}
- Contact email to use: ${input.contactEmail}
- Write in Markdown, with a single H1 title and numbered H2 sections
- Section structure (skip sections that don't apply):
${TERMS_SECTIONS}
- Choose the governing law based on the region: US → State of Delaware, EU → Republic of Ireland, UK → England and Wales, CA → Province of Ontario, AU → New South Wales, otherwise → "the jurisdiction in which our company is registered"
- Keep the terms to ~1200-2000 words. Concise but complete.
- Use the exact contact email (${input.contactEmail}) and project name (${input.projectName}) throughout — no placeholders
- Output ONLY the terms text. No preamble, no explanation, no "Here's your terms" intro.
- CRITICAL: If PROJECT CONTEXT says processesPayments is false, ABSOLUTELY DO NOT include any subscription, billing, payment, or refund clauses. Skip those sections entirely. The terms must read as if payments are not part of the service.`;

  const result = await runPrompt({
    system: TERMS_SYSTEM,
    user: userPrompt,
    temperature: 0.3,
    maxTokens: 2000,
  });

  if (!result.ok) {
    return { ok: false, reason: result.error, model: result.model };
  }

  const cleaned = stripMetaCommentary(stripThinking(result.text));
  const validation = validatePolicyOutput(cleaned, input.projectName, input.contactEmail);
  if (!validation.ok) {
    return { ok: false, reason: validation.reason || "validation_failed", model: result.model };
  }

  return { ok: true, text: cleaned, model: result.model };
}

// ============================================================================
// Cookie policy
// ============================================================================

const COOKIE_POLICY_SYSTEM = `You are a careful legal-writing assistant. You draft cookie policies for indie developers and small teams. Your output:

- Is grounded in the actual repo context provided. Never invent tech that isn't there.
- Uses the exact contact email and project name provided. Never use placeholders.
- Is written in plain English, with short paragraphs and clear section headings.
- Includes a "not legal advice" disclaimer at the top.
- Only describes cookie categories that the project actually uses (strictly necessary, analytics, functionality).
- CRITICAL — Payment processing: If 'processesPayments' is false, do NOT mention payment processor cookies, Stripe, or any payment-related tracking. Only list cookie categories that actually apply.
- Mentions specific cookie providers (Google Analytics, Plausible, etc.) only if there's evidence in the codebase. Otherwise, keep it generic.
- Does not include analysis, commentary, or anything outside the policy text itself.
- Does not start with greetings like "Sure, here is..." — start directly with the policy.
- IMPORTANT: do NOT include any meta-commentary, thinking, planning, or preambles in your output. Output ONLY the policy text starting with the H1 title. No "Let me draft...", no "The user wants...", no "I'll write...".`;

export async function generateCookiePolicyWithAI(input: {
  projectName: string;
  contactEmail: string;
  projectContext: ProjectContext;
  codebase: CodebaseContext;
  effectiveDate?: string;
}): Promise<{ ok: true; text: string; model: string } | { ok: false; reason: string; model: string; raw?: string }> {
  if (!aiEnabled) return { ok: false, reason: "ai_disabled", model: defaultModel };

  const date = input.effectiveDate || new Date().toISOString().slice(0, 10);

  const userPrompt = `Draft a cookie policy for the following project.

PROJECT CONTEXT:
${describeProjectContext(input.projectContext)}

CODEBASE CONTEXT:
${describeCodebase(input.codebase)}

OUTPUT REQUIREMENTS:
- Effective date: ${date}
- Project name to use: ${input.projectName}
- Contact email to use: ${input.contactEmail}
- Write in Markdown, with a single H1 title and H2 sections (no need to number them)
- Section structure:
  1. What Are Cookies? (brief explanation)
  2. What Cookies Do We Use? (one subsection per category: strictly necessary, analytics, functionality — only include categories that the project uses)
  3. Third-Party Cookies (only if the project uses analytics or payment processing)
  4. How to Manage Cookies (browser settings, opt-out tools, and a consent banner mention ONLY if EU users are served)
  5. Changes to This Cookie Policy
  6. Contact
- Keep the policy to ~600-1000 words. Concise but complete.
- Use the exact contact email (${input.contactEmail}) and project name (${input.projectName}) throughout — no placeholders
- Output ONLY the policy text. No preamble, no explanation.
- CRITICAL: If PROJECT CONTEXT says processesPayments is false, do NOT mention payment processor cookies, Stripe, or any payment-related tracking in the Third-Party Cookies section.`;

  const result = await runPrompt({
    system: COOKIE_POLICY_SYSTEM,
    user: userPrompt,
    temperature: 0.3,
    maxTokens: 1500,
  });

  if (!result.ok) {
    return { ok: false, reason: result.error, model: result.model };
  }

  const cleaned = stripMetaCommentary(stripThinking(result.text));
  // Cookie policy is shorter, so relax the section count to 4+
  const headerCount = (cleaned.match(/^##\s+/gm) ?? []).length;
  if (headerCount < 4) {
    return { ok: false, reason: "too_few_sections", model: result.model, raw: cleaned };
  }
  if (!(
    /not legal advice/i.test(cleaned) ||
    /not constitute legal advice/i.test(cleaned) ||
    /does not (constitute|provide) legal advice/i.test(cleaned) ||
    /not a substitute for legal advice/i.test(cleaned)
  )) {
    return { ok: false, reason: "missing_disclaimer", model: result.model, raw: cleaned };
  }
  if (input.contactEmail && !cleaned.toLowerCase().includes(input.contactEmail.toLowerCase())) {
    return { ok: false, reason: "missing_contact_email", model: result.model, raw: cleaned };
  }

  return { ok: true, text: cleaned, model: result.model };
}
