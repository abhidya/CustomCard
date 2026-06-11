import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildLegalPolicyLinks,
  freeLegalToolOptions,
  legalDocumentLinks,
  legalDocumentPath,
  legalComplianceItems,
  summarizeLegalComplianceReadiness,
  validateLegalComplianceReadiness,
  type LegalComplianceItem
} from "./legalCompliance";

describe("legal compliance readiness", () => {
  it("covers EU and US launch requirements using only free or open-source tooling paths", () => {
    const summary = summarizeLegalComplianceReadiness();

    expect(validateLegalComplianceReadiness()).toEqual([]);
    expect(summary).toMatchObject({
      total: 12,
      euRequirements: 6,
      usRequirements: 6,
      repoLocalReady: 1,
      freeToolRequired: 7,
      externalReviewRequired: 12,
      launchBlocked: 12,
      publicClaimsAllowed: 0
    });
    expect(summary.freeToolOptions).toBeGreaterThanOrEqual(6);
    expect(summary.openSourceToolOptions).toBeGreaterThanOrEqual(2);
    expect(summary.policyGeneratorOptions).toBeGreaterThanOrEqual(4);
    expect(freeLegalToolOptions.every((tool) => ["free", "free-tier", "open-source"].includes(tool.cost))).toBe(true);
    expect(summary.requiredEvidence).toEqual(
      expect.arrayContaining([
        "Hosted privacy policy URL",
        "Free CMP configured",
        "Notice at collection",
        "AI disclosure page",
        "Refund/cancellation policy URL",
        "Hosted checkout PCI scope memo"
      ])
    );
    expect(summary.blockers).toEqual(
      expect.arrayContaining([
        "EU/UK traffic needs a configured free CMP and proof that optional trackers wait for consent.",
        "US state privacy launch needs notice-at-collection and opt-out/GPC proof before marketing or analytics."
      ])
    );
  });

  it("builds legal policy links from env vars and falls back to free tools", () => {
    const links = buildLegalPolicyLinks({
      VITE_LEGAL_TERMS_URL: "https://example.com/terms",
      VITE_LEGAL_PRIVACY_URL: ""
    });

    expect(links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "terms", configured: true, url: "https://example.com/terms" }),
        expect.objectContaining({
          id: "privacy",
          configured: false,
          fallbackLabel: "TermsFeed Privacy Policy Generator",
          url: "https://www.termsfeed.com/privacy-policy-generator/"
        })
      ])
    );
    expect(links.every((link) => link.url.startsWith("https://"))).toBe(true);
  });

  it("defines legal documents for the public footer", () => {
    expect(legalDocumentPath).toBe("/legal/docs.html");
    expect(legalDocumentPath).not.toMatch(/generated/i);
    expect(legalDocumentLinks).toHaveLength(6);
    expect(legalDocumentLinks.map((link) => link.id)).toEqual([
      "terms",
      "privacy",
      "cookies",
      "refunds",
      "ai-disclosure",
      "privacy-choices"
    ]);
    expect(legalDocumentLinks.every((link) => link.path.startsWith(`${legalDocumentPath}#`))).toBe(true);
    expect(legalDocumentLinks.every((link) => !/generated/i.test(link.path))).toBe(true);
    expect(legalDocumentLinks.every((link) => link.reviewRequired)).toBe(true);
  });

  it("keeps public legal docs free of generated route and UI copy", () => {
    const html = readFileSync(new URL("../public/legal/docs.html", import.meta.url), "utf8");

    expect(html).toContain("CustomCard legal docs");
    expect(html).toContain('id="refunds"');
    expect(html).not.toMatch(/generated/i);
  });

  it("flags unsafe legal-readiness claims before they reach the app", () => {
    const unsafeItems: LegalComplianceItem[] = [
      {
        ...legalComplianceItems[0],
        publicClaimAllowed: true,
        blocksLaunch: false,
        externalReviewRequired: false,
        freeToolIds: ["paid-only-tool"],
        requiredEvidence: []
      } as unknown as LegalComplianceItem,
      { ...legalComplianceItems[0] }
    ];

    expect(validateLegalComplianceReadiness(unsafeItems)).toEqual(
      expect.arrayContaining([
        "Duplicate legal compliance readiness item: eu-gdpr-privacy-notice-lawful-basis.",
        "Legal compliance item eu-gdpr-privacy-notice-lawful-basis references unknown free tool: paid-only-tool.",
        "Legal compliance item eu-gdpr-privacy-notice-lawful-basis must list at least two required evidence items.",
        "Legal compliance item eu-gdpr-privacy-notice-lawful-basis must require external legal review.",
        "Legal compliance item eu-gdpr-privacy-notice-lawful-basis must keep publicClaimAllowed=false.",
        "Legal compliance item eu-gdpr-privacy-notice-lawful-basis must block launch until evidence is attached.",
        "Missing legal compliance readiness item: eu-cookie-consent-eprivacy."
      ])
    );
  });
});
