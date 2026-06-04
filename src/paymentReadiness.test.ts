import { describe, expect, it } from "vitest";
import {
  paymentReadinessItems,
  summarizePaymentReadiness,
  validatePaymentReadiness,
  type PaymentReadinessItem
} from "./paymentReadiness";

describe("payment readiness", () => {
  it("tracks payment and refund readiness without live charge claims", () => {
    const summary = summarizePaymentReadiness();

    expect(validatePaymentReadiness()).toEqual([]);
    expect(summary).toMatchObject({
      total: 8,
      repoLocalReady: 4,
      evidenceMissing: 3,
      certificationBlocked: 1,
      paymentProviderContracts: 4,
      localFallbacks: 1,
      ledgerEvents: 23,
      idempotencyRequired: 8,
      webhookSignatureRequired: 5,
      processorApprovalRequired: 3,
      liveChargesEnabled: 0,
      liveRefundsEnabled: 0,
      liveCaptureEnabled: 0,
      externalNetworkCalls: 0,
      cardDataStored: 0,
      pciScopeApproved: 0,
      blockers: []
    });
    expect(summary.requiredEvidence).toEqual(
      expect.arrayContaining([
        "Processor live-mode approval",
        "Refund drill output",
        "Webhook signature proof",
        "PCI scope memo",
        "Settlement report sample"
      ])
    );
  });

  it("covers sandbox payment providers, fallback, and refund ledger events explicitly", () => {
    const sandboxContracts = paymentReadinessItems.find((item) => item.id === "sandbox-payment-contracts");
    const localGate = paymentReadinessItems.find((item) => item.id === "no-payment-local-gate");
    const refunds = paymentReadinessItems.find((item) => item.id === "refund-void-dispute-drills");
    const liveApproval = paymentReadinessItems.find((item) => item.id === "live-charge-capture-approval");

    expect(sandboxContracts?.paymentAdapterIds).toEqual(
      expect.arrayContaining([
        "stripe-checkout-payment",
        "paypal-orders-payment",
        "square-payments-sandbox",
        "adyen-checkout-payment"
      ])
    );
    expect(localGate?.fallbackAdapterIds).toEqual(expect.arrayContaining(["no-payment-checkout-gate"]));
    expect(refunds?.ledgerEventNames).toEqual(
      expect.arrayContaining(["payment.refund_requested", "payment.refund_failed", "payment.dispute_opened"])
    );
    expect(liveApproval).toMatchObject({
      status: "certification-blocked",
      processorApprovalRequired: true,
      webhookSignatureRequired: true,
      liveChargesEnabled: false,
      liveCaptureEnabled: false,
      cardDataStored: false,
      pciScopeApproved: false
    });
  });

  it("flags unsafe payment launch claims before admin or API readiness can expose them", () => {
    const unsafeItems: PaymentReadinessItem[] = [
      {
        ...paymentReadinessItems[0],
        idempotencyRequired: false,
        liveChargesEnabled: true,
        liveRefundsEnabled: true,
        liveCaptureEnabled: true,
        externalNetworkCalls: true,
        cardDataStored: true,
        pciScopeApproved: true,
        ledgerEventNames: [],
        currentEvidence: [],
        requiredEvidence: ["one"],
        blocker: ""
      } as unknown as PaymentReadinessItem,
      {
        ...paymentReadinessItems[0]
      }
    ];

    expect(validatePaymentReadiness(unsafeItems)).toEqual(
      expect.arrayContaining([
        "Duplicate payment readiness item: no-payment-local-gate.",
        "Payment readiness item no-payment-local-gate must require idempotency.",
        "Payment readiness item no-payment-local-gate must keep liveChargesEnabled=false.",
        "Payment readiness item no-payment-local-gate must keep liveRefundsEnabled=false.",
        "Payment readiness item no-payment-local-gate must keep liveCaptureEnabled=false.",
        "Payment readiness item no-payment-local-gate must not require live external network calls.",
        "Payment readiness item no-payment-local-gate must keep cardDataStored=false.",
        "Payment readiness item no-payment-local-gate must not claim pciScopeApproved.",
        "Payment readiness item no-payment-local-gate must list ledger event names.",
        "Payment readiness item no-payment-local-gate must list current repo-local evidence.",
        "Payment readiness item no-payment-local-gate must list at least two required evidence items.",
        "Payment readiness item no-payment-local-gate must explain its blocker.",
        "Missing payment readiness item: sandbox-payment-contracts.",
        "Missing payment readiness item: refund-void-dispute-drills."
      ])
    );

    expect(
      validatePaymentReadiness([
        {
          ...paymentReadinessItems.find((item) => item.id === "live-charge-capture-approval")!,
          status: "evidence-missing",
          processorApprovalRequired: false,
          webhookSignatureRequired: false,
          paymentAdapterIds: ["stripe-checkout-payment"]
        },
        {
          ...paymentReadinessItems.find((item) => item.id === "refund-void-dispute-drills")!,
          processorApprovalRequired: false,
          webhookSignatureRequired: false,
          paymentAdapterIds: ["stripe-checkout-payment"]
        }
      ])
    ).toEqual(
      expect.arrayContaining([
        "Payment live charge and capture approval must include adapter: paypal-orders-payment.",
        "Payment live charge and capture approval must remain certification-blocked.",
        "Payment live charge and capture approval must require processor approval and webhook signatures.",
        "Payment refund void and dispute drills must include adapter: paypal-orders-payment.",
        "Payment refund void and dispute drills must require processor approval and webhook signatures."
      ])
    );
  });
});
