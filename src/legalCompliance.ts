import { defineReadinessRegister } from "./readinessRegister.mjs";

export type LegalComplianceRegion = "eu" | "us";
export type LegalComplianceStatus = "repo-local-ready" | "free-tool-required" | "external-review-required";
export type FreeLegalToolCost = "free" | "free-tier" | "open-source";
export type LegalPolicyLinkId = "terms" | "privacy" | "cookies" | "refunds" | "ai-disclosure" | "privacy-choices";

export interface FreeLegalToolOption {
  id: string;
  label: string;
  url: string;
  cost: FreeLegalToolCost;
  covers: string[];
  useBoundary: string;
}

export interface LegalComplianceItem {
  id: string;
  label: string;
  region: LegalComplianceRegion;
  category: "privacy" | "consent" | "ai" | "commerce" | "children" | "marketing" | "payments";
  status: LegalComplianceStatus;
  freeToolIds: string[];
  currentEvidence: string[];
  requiredEvidence: string[];
  externalReviewRequired: boolean;
  publicClaimAllowed: false;
  blocksLaunch: boolean;
  blocker: string;
}

export interface LegalComplianceSummary {
  total: number;
  euRequirements: number;
  usRequirements: number;
  repoLocalReady: number;
  freeToolRequired: number;
  externalReviewRequired: number;
  freeToolOptions: number;
  openSourceToolOptions: number;
  policyGeneratorOptions: number;
  launchBlocked: number;
  publicClaimsAllowed: number;
  requiredEvidence: string[];
  blockers: string[];
}

export interface LegalPolicyLinkDefinition {
  id: LegalPolicyLinkId;
  label: string;
  envVar: string;
  fallbackToolId: string;
}

export interface LegalPolicyLink extends LegalPolicyLinkDefinition {
  configured: boolean;
  url: string;
  fallbackLabel: string;
}

const requiredLegalComplianceIds = [
  "eu-gdpr-privacy-notice-lawful-basis",
  "eu-cookie-consent-eprivacy",
  "eu-data-rights-dsar",
  "eu-ai-transparency",
  "eu-consumer-distance-selling",
  "eu-dpa-subprocessor-transfer",
  "us-ftc-privacy-security",
  "us-state-privacy-ccpa-cpra",
  "us-coppa-age-boundary",
  "us-marketing-consent",
  "us-payment-pci-refund-boundary",
  "us-shipping-refund-order-rule"
];

const allowedStatuses = new Set<LegalComplianceStatus>([
  "repo-local-ready",
  "free-tool-required",
  "external-review-required"
]);

export const freeLegalToolOptions: FreeLegalToolOption[] = [
  {
    id: "termly-basic",
    label: "Termly Basic",
    url: "https://termly.io/resources/articles/is-termly-free/",
    cost: "free-tier",
    covers: ["privacy", "terms", "cookie-consent", "cookie-policy"],
    useBoundary: "Good MVP starter for one generated policy and cookie consent; legal review still required before launch."
  },
  {
    id: "iubenda-free",
    label: "iubenda Free",
    url: "https://www.iubenda.com/en/help/379-free-plan-limitations/",
    cost: "free-tier",
    covers: ["privacy", "cookie-policy", "auto-updated-clauses"],
    useBoundary: "Useful for limited privacy/cookie policy generation while the app stays in reviewer mode."
  },
  {
    id: "termsfeed-privacy",
    label: "TermsFeed Privacy Policy Generator",
    url: "https://www.termsfeed.com/privacy-policy-generator/",
    cost: "free",
    covers: ["privacy", "gdpr", "ccpa-cpra"],
    useBoundary: "Static policy draft source; verify every clause against CustomCard data flows."
  },
  {
    id: "termsfeed-terms",
    label: "TermsFeed Terms Generator",
    url: "https://www.termsfeed.com/terms-conditions-generator/",
    cost: "free",
    covers: ["terms", "acceptable-use", "liability"],
    useBoundary: "Static terms draft source; do not use as final counsel-reviewed terms."
  },
  {
    id: "termsfeed-disclaimer",
    label: "TermsFeed Disclaimer Generator",
    url: "https://www.termsfeed.com/disclaimer-generator/",
    cost: "free",
    covers: ["ai-disclosure", "refund-boundary", "estimate-only"],
    useBoundary: "Draft disclosure language for AI, estimates, and manual handoff boundaries."
  },
  {
    id: "cookieyes-free",
    label: "CookieYes Free",
    url: "https://www.cookieyes.com/pricing/",
    cost: "free-tier",
    covers: ["cookie-banner", "cookie-scan", "consent-log"],
    useBoundary: "Free cookie banner path for low traffic; pageview limits and feature limits apply."
  },
  {
    id: "klaro-oss",
    label: "Klaro open-source consent manager",
    url: "https://github.com/kiprotect/klaro",
    cost: "open-source",
    covers: ["cookie-banner", "consent-preferences", "script-blocking"],
    useBoundary: "Free developer-configured CMP path; CustomCard must still configure categories and script blocking."
  },
  {
    id: "silktide-oss",
    label: "Silktide Consent Manager",
    url: "https://silktide.com/consent-manager/",
    cost: "open-source",
    covers: ["cookie-banner", "google-consent-mode", "consent-preferences"],
    useBoundary: "Free consent banner path for analytics/ads if those are enabled later."
  }
];

export const legalPolicyLinkDefinitions: LegalPolicyLinkDefinition[] = [
  { id: "terms", label: "Terms", envVar: "VITE_LEGAL_TERMS_URL", fallbackToolId: "termsfeed-terms" },
  { id: "privacy", label: "Privacy", envVar: "VITE_LEGAL_PRIVACY_URL", fallbackToolId: "termsfeed-privacy" },
  { id: "cookies", label: "Cookies", envVar: "VITE_LEGAL_COOKIE_URL", fallbackToolId: "cookieyes-free" },
  { id: "refunds", label: "Refunds", envVar: "VITE_LEGAL_REFUND_URL", fallbackToolId: "termsfeed-disclaimer" },
  { id: "ai-disclosure", label: "AI disclosure", envVar: "VITE_LEGAL_AI_DISCLOSURE_URL", fallbackToolId: "termsfeed-disclaimer" },
  { id: "privacy-choices", label: "Privacy choices", envVar: "VITE_LEGAL_PRIVACY_CHOICES_URL", fallbackToolId: "termly-basic" }
];

export const legalComplianceItems: LegalComplianceItem[] = [
  {
    id: "eu-gdpr-privacy-notice-lawful-basis",
    label: "GDPR privacy notice and lawful basis",
    region: "eu",
    category: "privacy",
    status: "free-tool-required",
    freeToolIds: ["termly-basic", "iubenda-free", "termsfeed-privacy"],
    currentEvidence: ["Data-request API contract", "Raw-content storage blockers", "Relationship memory approval flow"],
    requiredEvidence: ["Hosted privacy policy URL", "Processing-purpose data map", "Legal-basis review"],
    externalReviewRequired: true,
    publicClaimAllowed: false,
    blocksLaunch: true,
    blocker: "EU launch needs a generated privacy notice mapped to CustomCard data flows and reviewed before public claims."
  },
  {
    id: "eu-cookie-consent-eprivacy",
    label: "EU/UK cookie and tracker consent",
    region: "eu",
    category: "consent",
    status: "free-tool-required",
    freeToolIds: ["cookieyes-free", "klaro-oss", "silktide-oss"],
    currentEvidence: ["No optional analytics or ad pixels loaded by default", "Theme preference is browser-local"],
    requiredEvidence: ["Free CMP configured", "Cookie scan", "Non-essential script blocking proof"],
    externalReviewRequired: true,
    publicClaimAllowed: false,
    blocksLaunch: true,
    blocker: "EU/UK traffic needs a configured free CMP and proof that optional trackers wait for consent."
  },
  {
    id: "eu-data-rights-dsar",
    label: "GDPR data subject rights",
    region: "eu",
    category: "privacy",
    status: "repo-local-ready",
    freeToolIds: ["termly-basic"],
    currentEvidence: ["Data-request mutation contract", "Consent record tables", "Deletion/correction request statuses"],
    requiredEvidence: ["Public request intake path", "Identity verification workflow", "Retention exception review"],
    externalReviewRequired: true,
    publicClaimAllowed: false,
    blocksLaunch: true,
    blocker: "The repo has a data-request contract, but public request intake and retention review evidence are not attached."
  },
  {
    id: "eu-ai-transparency",
    label: "EU AI transparency disclosure",
    region: "eu",
    category: "ai",
    status: "free-tool-required",
    freeToolIds: ["termsfeed-disclaimer", "termly-basic"],
    currentEvidence: ["AI provider readiness register", "Human proof-review workflow", "Live AI traffic disabled"],
    requiredEvidence: ["AI disclosure page", "Generated-content label copy", "Unsafe-output review log"],
    externalReviewRequired: true,
    publicClaimAllowed: false,
    blocksLaunch: true,
    blocker: "AI-assisted card generation needs visible disclosure and human-review language before live model rollout."
  },
  {
    id: "eu-consumer-distance-selling",
    label: "EU consumer distance-selling terms",
    region: "eu",
    category: "commerce",
    status: "free-tool-required",
    freeToolIds: ["termsfeed-terms", "termsfeed-disclaimer"],
    currentEvidence: ["Manual printer handoff", "Estimate-only pricing", "Real orders disabled"],
    requiredEvidence: ["Refund/cancellation policy URL", "Personalized-print exception review", "Seller-vs-printer responsibility language"],
    externalReviewRequired: true,
    publicClaimAllowed: false,
    blocksLaunch: true,
    blocker: "Printed-card checkout needs reviewed cancellation/refund language before EU consumer launch."
  },
  {
    id: "eu-dpa-subprocessor-transfer",
    label: "EU DPA, subprocessors, and transfer terms",
    region: "eu",
    category: "privacy",
    status: "external-review-required",
    freeToolIds: ["termly-basic", "iubenda-free"],
    currentEvidence: ["Provider catalog", "Credential-gated provider runtime", "External audit DPA review item"],
    requiredEvidence: ["Subprocessor list", "Provider DPA links", "International transfer review"],
    externalReviewRequired: true,
    publicClaimAllowed: false,
    blocksLaunch: true,
    blocker: "OAuth, AI, payment, CRM, and fulfillment providers need DPA/subprocessor review before EU production traffic."
  },
  {
    id: "us-ftc-privacy-security",
    label: "FTC privacy and security promises",
    region: "us",
    category: "privacy",
    status: "free-tool-required",
    freeToolIds: ["termly-basic", "termsfeed-privacy", "iubenda-free"],
    currentEvidence: ["Security/privacy/accessibility doctor", "Security headers", "No raw-content persistence default"],
    requiredEvidence: ["Hosted privacy policy URL", "Security controls summary", "Policy-to-behavior review"],
    externalReviewRequired: true,
    publicClaimAllowed: false,
    blocksLaunch: true,
    blocker: "US launch needs privacy promises generated from actual behavior and checked against implemented controls."
  },
  {
    id: "us-state-privacy-ccpa-cpra",
    label: "US state privacy, CCPA/CPRA, and GPC",
    region: "us",
    category: "privacy",
    status: "free-tool-required",
    freeToolIds: ["termly-basic", "iubenda-free", "cookieyes-free", "silktide-oss"],
    currentEvidence: ["Data request route", "Consent record persistence contract", "No sale/share claim in repo"],
    requiredEvidence: ["Notice at collection", "Your privacy choices URL", "GPC/opt-out handling proof"],
    externalReviewRequired: true,
    publicClaimAllowed: false,
    blocksLaunch: true,
    blocker: "US state privacy launch needs notice-at-collection and opt-out/GPC proof before marketing or analytics."
  },
  {
    id: "us-coppa-age-boundary",
    label: "COPPA age and child-data boundary",
    region: "us",
    category: "children",
    status: "external-review-required",
    freeToolIds: ["termsfeed-terms", "termsfeed-privacy"],
    currentEvidence: ["Account-gated app shell", "No child-directed positioning in product docs"],
    requiredEvidence: ["Minimum-age terms", "Under-13 blocking copy", "Support escalation for child-data requests"],
    externalReviewRequired: true,
    publicClaimAllowed: false,
    blocksLaunch: true,
    blocker: "The app needs explicit age terms and child-data handling before broad US consumer launch."
  },
  {
    id: "us-marketing-consent",
    label: "CAN-SPAM, TCPA, and suppression lists",
    region: "us",
    category: "marketing",
    status: "external-review-required",
    freeToolIds: ["termly-basic", "termsfeed-terms"],
    currentEvidence: ["Business engagement readiness consent/suppression gate", "Live customer messaging disabled"],
    requiredEvidence: ["Marketing opt-in sample", "Unsubscribe/suppression workflow", "SMS consent proof before texting"],
    externalReviewRequired: true,
    publicClaimAllowed: false,
    blocksLaunch: true,
    blocker: "CRM and notification campaigns need consent and suppression proof before any live US marketing messages."
  },
  {
    id: "us-payment-pci-refund-boundary",
    label: "Payment, PCI, refunds, and disputes",
    region: "us",
    category: "payments",
    status: "external-review-required",
    freeToolIds: ["termsfeed-disclaimer", "termsfeed-terms"],
    currentEvidence: ["Payment readiness register", "No card data storage", "Live charges disabled"],
    requiredEvidence: ["Hosted checkout PCI scope memo", "Refund/dispute policy", "Processor webhook proof"],
    externalReviewRequired: true,
    publicClaimAllowed: false,
    blocksLaunch: true,
    blocker: "Payment launch needs PCI scope, refund/dispute language, and processor evidence before live charges."
  },
  {
    id: "us-shipping-refund-order-rule",
    label: "US online order, shipping, and refund promises",
    region: "us",
    category: "commerce",
    status: "free-tool-required",
    freeToolIds: ["termsfeed-disclaimer", "termsfeed-terms"],
    currentEvidence: ["Retail fulfillment readiness register", "Manual handoff checklist", "Real-order kill switch"],
    requiredEvidence: ["Shipping/fulfillment policy URL", "Delay/refund support script", "Printer responsibility disclosure"],
    externalReviewRequired: true,
    publicClaimAllowed: false,
    blocksLaunch: true,
    blocker: "US print fulfillment needs reviewed shipping, delay, refund, and responsibility language before live orders."
  }
];

const legalComplianceRegister = defineReadinessRegister({
  domainLabel: "legal compliance",
  items: legalComplianceItems,
  requiredIds: requiredLegalComplianceIds,
  itemRules(item: LegalComplianceItem) {
    const issues: string[] = [];
    if (!["eu", "us"].includes(item.region)) issues.push(`Legal compliance item ${item.id} has unsupported region.`);
    if (!allowedStatuses.has(item.status)) issues.push(`Legal compliance item ${item.id} has unsupported status.`);
    if (item.freeToolIds.length === 0) issues.push(`Legal compliance item ${item.id} must reference at least one free tool.`);
    for (const toolId of item.freeToolIds) {
      if (!freeLegalToolOptions.some((tool) => tool.id === toolId)) {
        issues.push(`Legal compliance item ${item.id} references unknown free tool: ${toolId}.`);
      }
    }
    if (item.currentEvidence.length === 0) issues.push(`Legal compliance item ${item.id} must list current repo-local evidence.`);
    if (item.requiredEvidence.length < 2) issues.push(`Legal compliance item ${item.id} must list at least two required evidence items.`);
    if (item.externalReviewRequired !== true) issues.push(`Legal compliance item ${item.id} must require external legal review.`);
    if (item.publicClaimAllowed !== false) issues.push(`Legal compliance item ${item.id} must keep publicClaimAllowed=false.`);
    if (item.blocksLaunch !== true) issues.push(`Legal compliance item ${item.id} must block launch until evidence is attached.`);
    if (!item.blocker) issues.push(`Legal compliance item ${item.id} must explain its blocker.`);
    return issues;
  },
  crossRules(_itemsById: Map<string, LegalComplianceItem>, items: LegalComplianceItem[]) {
    const issues: string[] = [];
    if (items.filter((item) => item.region === "eu").length < 6) issues.push("Legal compliance readiness must cover at least 6 EU requirements.");
    if (items.filter((item) => item.region === "us").length < 6) issues.push("Legal compliance readiness must cover at least 6 US requirements.");
    if (!freeLegalToolOptions.some((tool) => tool.cost === "open-source" && tool.covers.includes("cookie-banner"))) {
      issues.push("Legal compliance readiness must include a free open-source cookie consent option.");
    }
    if (!freeLegalToolOptions.some((tool) => tool.cost !== "open-source" && tool.covers.includes("privacy"))) {
      issues.push("Legal compliance readiness must include a free policy generator option.");
    }
    return issues;
  },
  summarize(items: LegalComplianceItem[]) {
    const referencedToolIds = new Set(items.flatMap((item) => item.freeToolIds));
    const referencedTools = freeLegalToolOptions.filter((tool) => referencedToolIds.has(tool.id));

    return {
      euRequirements: items.filter((item) => item.region === "eu").length,
      usRequirements: items.filter((item) => item.region === "us").length,
      repoLocalReady: items.filter((item) => item.status === "repo-local-ready").length,
      freeToolRequired: items.filter((item) => item.status === "free-tool-required").length,
      externalReviewRequired: items.filter((item) => item.externalReviewRequired).length,
      freeToolOptions: referencedTools.length,
      openSourceToolOptions: referencedTools.filter((tool) => tool.cost === "open-source").length,
      policyGeneratorOptions: referencedTools.filter((tool) => tool.covers.includes("privacy") || tool.covers.includes("terms")).length,
      launchBlocked: items.filter((item) => item.blocksLaunch).length,
      publicClaimsAllowed: items.filter((item) => item.publicClaimAllowed).length,
      requiredEvidence: Array.from(new Set(items.flatMap((item) => item.requiredEvidence))).sort()
    };
  }
});

export function summarizeLegalComplianceReadiness(items: LegalComplianceItem[] = legalComplianceItems): LegalComplianceSummary {
  return {
    ...legalComplianceRegister.summarize(items),
    blockers: items.filter((item) => item.blocksLaunch).map((item) => item.blocker)
  } as LegalComplianceSummary;
}

export function validateLegalComplianceReadiness(items: LegalComplianceItem[] = legalComplianceItems): string[] {
  return legalComplianceRegister.validate(items);
}

export function buildLegalPolicyLinks(env: Record<string, unknown> = {}): LegalPolicyLink[] {
  return legalPolicyLinkDefinitions.map((definition) => {
    const configuredUrl = String(env[definition.envVar] ?? "").trim();
    const fallbackTool = freeLegalToolOptions.find((tool) => tool.id === definition.fallbackToolId);
    return {
      ...definition,
      configured: /^https?:\/\//i.test(configuredUrl),
      url: /^https?:\/\//i.test(configuredUrl) ? configuredUrl : fallbackTool?.url ?? "#",
      fallbackLabel: fallbackTool?.label ?? "Free generator"
    };
  });
}
