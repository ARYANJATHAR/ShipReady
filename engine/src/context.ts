/**
 * The 5 context questions.
 *
 * Design goals:
 *  1. Each is answerable in <10 seconds (binary or 2-3 options).
 *  2. Each one unlocks a specific behavior in the engine (template variant,
 *     clause inclusion, scanner priority).
 *  3. Together they cover the 4 highest-impact legal/compliance dimensions:
 *     data collected, money taken, jurisdiction, tracking.
 *  4. They feel like a conversation, not a form.
 *
 * The questions are designed so that "no" answers are as informative as "yes"
 * answers. A blog with no emails, no payments, no EU users, no cookies, in the US
 * needs a fundamentally different privacy policy than a SaaS in the EU taking
 * Stripe payments.
 */

import type { ProjectContext, BusinessType, Region } from "./types";

export type { ProjectContext, BusinessType, Region };

export interface ContextQuestion {
  id: keyof ProjectContext;
  /** The question shown to the user */
  question: string;
  /** One-line helper text under the question */
  hint: string;
  /** Why we ask — shown in a small tooltip / "why we ask" link */
  why: string;
  /** The answer type controls the UI */
  type: "boolean" | "select";
  /** Options for select */
  options?: Array<{ value: string; label: string; description?: string }>;
  /** Default value if the user skips */
  defaultValue: boolean | string;
}

export const CONTEXT_QUESTIONS: ContextQuestion[] = [
  {
    id: "collectsEmails",
    type: "boolean",
    question: "Do you collect email addresses?",
    hint: "Sign-ups, newsletter, contact forms, waitlists",
    why: "Triggers email-specific clauses: data retention, unsubscribe, double opt-in language.",
    defaultValue: false,
  },
  {
    id: "processesPayments",
    type: "boolean",
    question: "Do you take payments?",
    hint: "Stripe, Paddle, LemonSqueezy, anything that touches a card",
    why: "Triggers payment-processor disclosure (Stripe Privacy Policy reference), refund/cancellation clauses, PCI language.",
    defaultValue: false,
  },
  {
    id: "servesEuUsers",
    type: "boolean",
    question: "Do you serve users in the EU, EEA, or UK?",
    hint: "If you're not sure, you probably do. GDPR is opt-in for users, not for you.",
    why: "Triggers full GDPR compliance: legal basis, data subject rights, DPO mention, international transfer language (SCCs).",
    defaultValue: true,
  },
  {
    id: "usesCookies",
    type: "boolean",
    question: "Do you use cookies or similar tracking?",
    hint: "Analytics (Plausible, GA), auth tokens, ad pixels, anything in localStorage",
    why: "Triggers cookie policy, cookie consent banner code, ePrivacy compliance language.",
    defaultValue: false,
  },
  {
    id: "businessType",
    type: "select",
    question: "What kind of product is this?",
    hint: "Picks the base template + adjusts which clauses matter most",
    why: "SaaS needs uptime SLAs and subscription language. E-commerce needs shipping/returns. A blog needs comment moderation. Each is a different document.",
    defaultValue: "saas",
    options: [
      {
        value: "saas",
        label: "SaaS / web app",
        description: "Subscription product, user accounts, dashboard",
      },
      {
        value: "ecommerce",
        label: "E-commerce",
        description: "Selling physical or digital goods",
      },
      {
        value: "blog",
        label: "Blog / content",
        description: "Articles, newsletter, maybe comments",
      },
      {
        value: "portfolio",
        label: "Portfolio / landing",
        description: "Personal site, agency, no transactions",
      },
      {
        value: "other",
        label: "Something else",
        description: "We'll pick the most neutral template",
      },
    ],
  },
];

/**
 * Region is a 6th question, but we infer it from language/currency hints
 * in the repo OR let the user override. For now, we ask explicitly.
 */
export const REGION_QUESTION: ContextQuestion = {
  id: "region",
  type: "select",
  question: "What's your primary jurisdiction?",
  hint: "Where you're incorporated or where the bulk of your users are",
  why: "Determines which legal framework dominates the policy text and which clauses are required vs. recommended.",
  defaultValue: "us",
  options: [
    { value: "us", label: "United States", description: "CCPA, state laws" },
    { value: "eu", label: "European Union", description: "GDPR, ePrivacy" },
    { value: "uk", label: "United Kingdom", description: "UK GDPR, PECR" },
    { value: "ca", label: "Canada", description: "PIPEDA, Quebec Law 25" },
    { value: "au", label: "Australia / NZ", description: "Privacy Act 1988" },
    { value: "global", label: "Global / multi-region", description: "Most restrictive defaults" },
  ],
};

/**
 * Build a ProjectContext from the 5 answers (+ region).
 * Validates the input and fills in defaults.
 */
export function buildContext(answers: Partial<ProjectContext>): ProjectContext {
  return {
    collectsEmails: answers.collectsEmails ?? false,
    processesPayments: answers.processesPayments ?? false,
    servesEuUsers: answers.servesEuUsers ?? true, // safe default
    usesCookies: answers.usesCookies ?? false,
    businessType: (answers.businessType as BusinessType) ?? "saas",
    region: (answers.region as Region) ?? "us",
  };
}

/**
 * Decide which template variant to use based on context.
 * This is the core "context engine" logic — it determines which clauses
 * get included in the generated policy.
 */
export interface PolicyRules {
  /** Include the "International Data Transfers" section (SCCs) */
  internationalTransfers: boolean;
  /** Include the "Your Rights" section with explicit GDPR Art. 15-22 */
  dataSubjectRights: boolean;
  /** Reference Stripe (or generic "payment processor") in third-party list */
  paymentProcessorDisclosure: boolean;
  /** Include email-specific clauses (retention, unsubscribe) */
  emailHandling: boolean;
  /** Include cookie consent banner code recommendation */
  cookieConsent: boolean;
  /** Include the "Do Not Sell" CCPA clause */
  doNotSell: boolean;
  /** Include "Children's Privacy" section (required if children may use) */
  childrensPrivacy: boolean;
  /** Include the "Changes to This Policy" section with version tracking */
  policyVersioning: boolean;
  /** Reference specific frameworks (GDPR/CCPA/PIPEDA) by name */
  frameworks: string[];
}

export function deriveRules(ctx: ProjectContext): PolicyRules {
  const servesEu = ctx.servesEuUsers;
  const isUs = ctx.region === "us" || ctx.region === "global";
  const isCa = ctx.region === "ca" || ctx.region === "global";
  const isGlobal = ctx.region === "global";

  return {
    internationalTransfers: servesEu && (ctx.region === "us" || isGlobal),
    dataSubjectRights: servesEu,
    paymentProcessorDisclosure: ctx.processesPayments,
    emailHandling: ctx.collectsEmails,
    cookieConsent: ctx.usesCookies,
    doNotSell: isUs,
    childrensPrivacy: true, // always include
    policyVersioning: true, // always include
    frameworks: [
      ...(servesEu ? ["GDPR", "ePrivacy"] : []),
      ...(isUs ? ["CCPA"] : []),
      ...(isCa ? ["PIPEDA"] : []),
      ...(isGlobal ? ["GDPR", "CCPA", "PIPEDA"] : []),
    ],
  };
}

/**
 * Build the full context in one call from a raw form submission.
 */
export function makeContext(answers: Record<string, unknown>): ProjectContext {
  return buildContext({
    collectsEmails: answers.collectsEmails as boolean | undefined,
    processesPayments: answers.processesPayments as boolean | undefined,
    servesEuUsers: answers.servesEuUsers as boolean | undefined,
    usesCookies: answers.usesCookies as boolean | undefined,
    businessType: answers.businessType as BusinessType | undefined,
    region: answers.region as Region | undefined,
  });
}
