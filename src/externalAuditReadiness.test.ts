import { describe, expect, it } from "vitest";
import {
  externalAuditReadinessItems,
  summarizeExternalAuditReadiness,
  validateExternalAuditReadiness,
  type ExternalAuditReadinessItem
} from "./externalAuditReadiness";
import { productionLaunchGates } from "./productionReadiness";

describe("external audit readiness", () => {
  it("keeps external proof gaps explicit without allowing public production claims", () => {
    const summary = summarizeExternalAuditReadiness();

    expect(validateExternalAuditReadiness()).toEqual([]);
    expect(summary).toMatchObject({
      total: 15,
      internalBaselineReady: 3,
      externalEvidenceMissing: 10,
      certificationBlocked: 2,
      productionBlocked: 15,
      publicClaimsAllowed: 0,
      externalArtifactsAttached: 0,
      externalReviewerRequired: 15
    });
    expect(summary.requiredEvidence).toEqual(
      expect.arrayContaining([
        "Security assessment report",
        "Privacy policy review",
        "WCAG audit report",
        "Retail partner certification",
        "Printed 5x7 sample",
        "Authenticated public route doctor"
      ])
    );
    expect(summary.blockers).toEqual(
      expect.arrayContaining([
        "No external legal review report is attached.",
        "Only internal security baseline evidence exists; no external security assessment is attached.",
        "No physical print sample, pickup proof, or retailer QA certification is attached."
      ])
    );
  });

  it("maps every external evidence item back to production launch gates", () => {
    const gateIds = new Set(productionLaunchGates.map((gate) => gate.id));
    const coveredGateIds = new Set(externalAuditReadinessItems.flatMap((item) => item.relatedProductionGateIds));

    for (const item of externalAuditReadinessItems) {
      expect(item.relatedProductionGateIds.every((gateId) => gateIds.has(gateId))).toBe(true);
      expect(item.blocksProduction).toBe(true);
      expect(item.publicClaimAllowed).toBe(false);
      expect(item.evidenceArtifactRefs).toEqual([]);
    }
    expect([...coveredGateIds]).toEqual(
      expect.arrayContaining([
        "production-user-auth",
        "live-oauth-provider-imports",
        "live-ai-generation",
        "live-vendor-quotes",
        "live-payment-charges-refunds",
        "direct-retail-printer-ordering",
        "live-telemetry-alerting",
        "cloud-bucket-iam-proof",
        "deployed-postgres-api",
        "vercel-deployment-db-access",
        "native-mobile-artifact",
        "external-audits",
        "physical-print-certification"
      ])
    );
  });

  it("flags unsafe audit claims before they can be surfaced", () => {
    const unsafeItems: ExternalAuditReadinessItem[] = [
      {
        ...externalAuditReadinessItems[0],
        publicClaimAllowed: true,
        blocksProduction: false,
        externalReviewerRequired: false,
        evidenceArtifactRefs: ["docs/audits/fake-report.pdf"],
        requiredEvidence: [],
        relatedProductionGateIds: []
      } as unknown as ExternalAuditReadinessItem,
      {
        ...externalAuditReadinessItems[0]
      }
    ];

    expect(validateExternalAuditReadiness(unsafeItems)).toEqual(
      expect.arrayContaining([
        "Duplicate external audit readiness item: production-auth-token-verification.",
        "External audit readiness item production-auth-token-verification must keep publicClaimAllowed=false until external evidence is reviewed.",
        "External audit readiness item production-auth-token-verification must block production until external evidence is attached.",
        "External audit readiness item production-auth-token-verification must require an external reviewer.",
        "External audit readiness item production-auth-token-verification must not claim attached external artifacts in the free local MVP.",
        "External audit readiness item production-auth-token-verification must list at least two required evidence items.",
        "External audit readiness item production-auth-token-verification must map to at least one production launch gate.",
        "Missing external audit readiness item: oauth-app-approval."
      ])
    );
  });
});
