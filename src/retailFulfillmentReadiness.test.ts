import { describe, expect, it } from "vitest";
import {
  retailFulfillmentReadinessItems,
  summarizeRetailFulfillmentReadiness,
  validateRetailFulfillmentReadiness,
  type RetailFulfillmentReadinessItem
} from "./retailFulfillmentReadiness";

describe("retail fulfillment readiness", () => {
  it("tracks direct retail-printer fulfillment readiness without live ordering claims", () => {
    const summary = summarizeRetailFulfillmentReadiness();

    expect(validateRetailFulfillmentReadiness()).toEqual([]);
    expect(summary).toMatchObject({
      total: 8,
      repoLocalReady: 3,
      evidenceMissing: 3,
      certificationBlocked: 2,
      liveVendorAdapterContracts: 6,
      manualFallbacks: 2,
      recoveryDrillEvents: 21,
      manualConfirmationRequired: 8,
      humanApprovalRequired: 8,
      liveQuoteEnabled: 0,
      directOrderEnabled: 0,
      externalNetworkCalls: 0,
      realPaymentsEnabled: 0,
      physicalCertificationAttached: 0,
      blockers: []
    });
    expect(summary.requiredEvidence).toEqual(
      expect.arrayContaining([
        "Retail partner certification",
        "Physical 5x7 sample set",
        "Wrong-store recovery drill",
        "Processor refund proof",
        "Sandbox live quote response"
      ])
    );
  });

  it("covers live vendor adapters, manual fallbacks, and recovery drills explicitly", () => {
    const quoteContracts = retailFulfillmentReadinessItems.find((item) => item.id === "live-quote-contracts");
    const manualPackage = retailFulfillmentReadinessItems.find((item) => item.id === "manual-handoff-package");
    const physicalQa = retailFulfillmentReadinessItems.find((item) => item.id === "physical-print-qa");

    expect(quoteContracts?.vendorAdapterIds).toEqual(
      expect.arrayContaining([
        "walgreens-live-order",
        "cvs-live-order",
        "fedex-live-print",
        "walmart-live-print",
        "staples-live-print",
        "office-depot-live-print"
      ])
    );
    expect(manualPackage?.fallbackAdapterIds).toEqual(expect.arrayContaining(["manual-vendor-handoff"]));
    expect(physicalQa).toMatchObject({
      status: "certification-blocked",
      humanApprovalRequired: true,
      liveQuoteEnabled: false,
      directOrderEnabled: false,
      realPaymentsEnabled: false,
      physicalCertificationAttached: false
    });
    expect(physicalQa?.recoveryEventNames).toEqual(
      expect.arrayContaining(["print_bleed_failed", "color_shift_detected", "physical_sample_rejected"])
    );
  });

  it("flags unsafe retail launch claims before admin or API readiness can expose them", () => {
    const unsafeItems: RetailFulfillmentReadinessItem[] = [
      {
        ...retailFulfillmentReadinessItems[0],
        liveQuoteEnabled: true,
        directOrderEnabled: true,
        externalNetworkCalls: true,
        realPaymentsEnabled: true,
        physicalCertificationAttached: true,
        manualConfirmationRequired: false,
        humanApprovalRequired: false,
        recoveryEventNames: [],
        currentEvidence: [],
        requiredEvidence: ["one"],
        blocker: ""
      } as unknown as RetailFulfillmentReadinessItem,
      {
        ...retailFulfillmentReadinessItems[0]
      }
    ];

    expect(validateRetailFulfillmentReadiness(unsafeItems)).toEqual(
      expect.arrayContaining([
        "Duplicate retail fulfillment readiness item: manual-handoff-package.",
        "Retail fulfillment readiness item manual-handoff-package must keep liveQuoteEnabled=false.",
        "Retail fulfillment readiness item manual-handoff-package must keep directOrderEnabled=false.",
        "Retail fulfillment readiness item manual-handoff-package must not require live external network calls.",
        "Retail fulfillment readiness item manual-handoff-package must keep realPaymentsEnabled=false.",
        "Retail fulfillment readiness item manual-handoff-package must not claim physicalCertificationAttached.",
        "Retail fulfillment readiness item manual-handoff-package must require manual confirmation.",
        "Retail fulfillment readiness item manual-handoff-package must require human approval.",
        "Retail fulfillment readiness item manual-handoff-package must list recovery event names.",
        "Retail fulfillment readiness item manual-handoff-package must list current repo-local evidence.",
        "Retail fulfillment readiness item manual-handoff-package must list at least two required evidence items.",
        "Retail fulfillment readiness item manual-handoff-package must explain its blocker.",
        "Missing retail fulfillment readiness item: live-quote-contracts.",
        "Missing retail fulfillment readiness item: physical-print-qa."
      ])
    );

    expect(
      validateRetailFulfillmentReadiness([
        {
          ...retailFulfillmentReadinessItems.find((item) => item.id === "vendor-api-certification")!,
          status: "evidence-missing",
          vendorAdapterIds: ["walgreens-live-order"]
        },
        {
          ...retailFulfillmentReadinessItems.find((item) => item.id === "physical-print-qa")!,
          status: "evidence-missing",
          vendorAdapterIds: ["walgreens-live-order"]
        }
      ])
    ).toEqual(
      expect.arrayContaining([
        "Retail vendor certification must include adapter: cvs-live-order.",
        "Retail vendor certification must remain certification-blocked.",
        "Retail physical print QA must include adapter: cvs-live-order.",
        "Retail physical print QA must remain certification-blocked."
      ])
    );
  });
});
