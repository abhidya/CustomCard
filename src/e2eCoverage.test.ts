import { describe, expect, it } from "vitest";
import {
  e2eCoverageItems,
  summarizeE2eCoverage,
  validateE2eCoverage,
  type E2eCoverageItem
} from "./e2eCoverage";

describe("end-to-end coverage matrix", () => {
  it("covers every repo-local reviewer workflow with CI-gated evidence", () => {
    const summary = summarizeE2eCoverage();

    expect(validateE2eCoverage()).toEqual([]);
    expect(summary).toMatchObject({
      total: 27,
      covered: 27,
      repoLocalCoveragePercent: 100,
      browserSmokeCovered: 4,
      contractTestCovered: 4,
      doctorCovered: 19,
      ciGated: 27,
      liveProductionProofs: 0,
      realOrdersEnabled: 0,
      externalNetworkCalls: 0,
      blockers: []
    });
    expect(summary.surfaces).toEqual([
      "adapters",
      "api",
      "governance",
      "identity",
      "infra",
      "mobile",
      "web-admin",
      "web-customer"
    ]);
    expect(summary.requiredCommandCount).toBeGreaterThanOrEqual(18);
  });

  it("maps the customer, admin, mobile, API, adapter, and infra journeys", () => {
    expect(e2eCoverageItems.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "customer-workspace-to-handoff",
        "customer-panel-readiness",
        "admin-panel-readiness",
        "adapter-matrix-readiness",
        "api-public-readiness",
        "api-contract-mutations",
        "api-memory-runtime",
        "api-postgres-runtime",
        "api-postgres-http-integration",
        "account-auth-storage-recovery",
        "mobile-customer-shell",
        "mobile-render-readiness",
        "mobile-native-release-profile",
        "artifact-store-handoff",
        "deployment-iac-readiness",
        "hosted-api-proof-readiness",
        "business-engagement-readiness",
        "security-privacy-accessibility",
        "external-audit-evidence-register",
        "ai-provider-readiness",
        "observability-alerting-readiness",
        "retail-fulfillment-readiness",
        "payment-refund-readiness",
        "capacity-cost-readiness",
        "localization-rtl-readiness",
        "printer-pricing-research",
        "demo-reset-worker-readiness"
      ])
    );
    expect(e2eCoverageItems.every((item) => item.ciGated)).toBe(true);
    expect(e2eCoverageItems.every((item) => item.testCommands.length > 0)).toBe(true);
    expect(e2eCoverageItems.find((item) => item.id === "mobile-render-readiness")).toMatchObject({
      surface: "mobile",
      automationType: "doctor",
      liveProductionProof: false
    });
    expect(e2eCoverageItems.find((item) => item.id === "mobile-render-readiness")?.testCommands).toContain(
      "npm run mobile:render:doctor"
    );
    expect(e2eCoverageItems.find((item) => item.id === "hosted-api-proof-readiness")).toMatchObject({
      surface: "infra",
      automationType: "doctor",
      liveProductionProof: false
    });
    expect(e2eCoverageItems.find((item) => item.id === "hosted-api-proof-readiness")?.testCommands).toContain(
      "npm run hosted:api:doctor"
    );
    expect(e2eCoverageItems.find((item) => item.id === "business-engagement-readiness")).toMatchObject({
      surface: "adapters",
      automationType: "doctor",
      liveProductionProof: false
    });
    expect(e2eCoverageItems.find((item) => item.id === "business-engagement-readiness")?.testCommands).toContain(
      "npm run business:engagement:doctor"
    );
  });

  it("flags unsafe or weak coverage claims before they reach admin or API readiness", () => {
    const unsafeItems: E2eCoverageItem[] = [
      {
        ...e2eCoverageItems[0],
        ciGated: false,
        testCommands: [],
        evidence: ["single weak signal"],
        liveProductionProof: true,
        realOrdersEnabled: true,
        externalNetworkCalls: true
      } as unknown as E2eCoverageItem,
      { ...e2eCoverageItems[0] }
    ];

    expect(validateE2eCoverage(unsafeItems)).toEqual(
      expect.arrayContaining([
        "Duplicate E2E coverage item: customer-workspace-to-handoff.",
        "E2E coverage item customer-workspace-to-handoff must be CI-gated.",
        "E2E coverage item customer-workspace-to-handoff must list test commands.",
        "E2E coverage item customer-workspace-to-handoff must list at least two evidence points.",
        "E2E coverage item customer-workspace-to-handoff must not claim live production proof.",
        "E2E coverage item customer-workspace-to-handoff must keep realOrdersEnabled=false.",
        "E2E coverage item customer-workspace-to-handoff must not require live external network calls.",
        "Missing E2E coverage item: customer-panel-readiness.",
        "Missing E2E coverage surface: web-admin."
      ])
    );
  });
});
