import { describe, expect, it } from "vitest";
import {
  productionLaunchGates,
  summarizeProductionReadiness,
  validateProductionReadiness
} from "./productionReadiness";

describe("production readiness gates", () => {
  it("tracks every live production component as blocked or evidence-gated", () => {
    const summary = summarizeProductionReadiness();

    expect(summary.total).toBe(13);
    expect(summary.liveEnabled).toBe(0);
    expect(summary.evidenceMissing).toBe(11);
    expect(summary.blocked).toBe(2);
    expect(summary.blockers).toEqual(
      expect.arrayContaining([
        "No production tenant token-verification evidence has been attached.",
        "Retail quote APIs and quote freshness evidence are not connected.",
        "The app has no live processor approval, refund proof, or PCI review.",
        "Direct ordering remains disabled until retail certification and physical QA pass.",
        "Vercel deployment exists, but hosted DB env vars and public DB doctor output are not present.",
        "No signed native artifact or emulator render proof is attached.",
        "No physical sample or retailer certification has been recorded."
      ])
    );
  });

  it("keeps launch gates explicit, evidenced, and non-live by default", () => {
    expect(validateProductionReadiness()).toEqual([]);
    expect(productionLaunchGates.map((gate) => gate.id)).toEqual(
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
    expect(productionLaunchGates.every((gate) => gate.liveEnabled === false)).toBe(true);
    expect(productionLaunchGates.every((gate) => gate.requiredEvidence.length > 0)).toBe(true);
    expect(productionLaunchGates.every((gate) => gate.currentEvidence.length > 0)).toBe(true);
  });
});
