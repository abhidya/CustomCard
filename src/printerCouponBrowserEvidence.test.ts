import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  combinePrinterCouponBrowserEvidence,
  findPrinterCouponBrowserEvidenceTarget,
  getPrinterCouponRenderedEvidenceStatus,
  summarizePrinterCouponBrowserEvidence,
  validatePrinterCouponBrowserEvidenceArtifact,
  type PrinterCouponBrowserEvidenceArtifact
} from "./printerCouponBrowserEvidence";
import { printerCouponCollectionTargets } from "./printerPricing";

const walgreensPrintTarget = printerCouponCollectionTargets.find((target) => target.id === "walgreens-photo-card-design-entrypoint")!;
const cvsPrintTarget = printerCouponCollectionTargets.find((target) => target.id === "cvs-photo-card-design-entrypoint")!;

const renderedPrintLinkArtifact: PrinterCouponBrowserEvidenceArtifact = {
  service: "customcard-printer-coupon-browser-evidence",
  generatedAtIso: "2026-06-07T17:25:09.340Z",
  runtime: "operator-chromium-rendered-read",
  operatorAction: "Opened exact Walgreens and CVS 5x7 print links; no login, upload, cart, payment, or order action.",
  targets: [
    {
      targetId: "walgreens-photo-card-design-entrypoint",
      observedAtIso: "2026-06-07T17:24:53.135Z",
      url: walgreensPrintTarget.url,
      finalUrl: walgreensPrintTarget.url,
      renderedTitle: "5x7 Folded Cards, Standard Cardstock 85lb | Folded Cards | Cards & Stationary | Walgreens Photo",
      expectedOfferCodes: ["CRISPCARD"],
      visibleTextSignals: ["5x7 folded card", "3.49"],
      pageHtmlSignals: ["CRISPCARD", "5x7 folded card", "3.49", "CommerceProduct_33272"],
      noCheckoutAction: true,
      noUploadAction: true,
      noOrderPlaced: true
    },
    {
      targetId: "cvs-photo-card-design-entrypoint",
      observedAtIso: "2026-06-07T17:25:07.637Z",
      url: cvsPrintTarget.url,
      finalUrl: cvsPrintTarget.url,
      renderedTitle: "Folded Greeting Card, 5x7 | Cards | Cards & Stationery | CVS Photo",
      expectedOfferCodes: ["JUNESW"],
      visibleTextSignals: ["JUNESW", "8.98", "CommerceProduct_26126"],
      pageHtmlSignals: ["JUNESW", "Folded Greeting Card, 5x7", "8.98", "CommerceProduct_26126"],
      noCheckoutAction: true,
      noUploadAction: true,
      noOrderPlaced: true
    }
  ]
};

describe("printer coupon browser evidence", () => {
  it("distinguishes visible print-link coupon proof from HTML-only coupon signals", () => {
    const artifact = combinePrinterCouponBrowserEvidence(renderedPrintLinkArtifact);

    expect(artifact).toBeTruthy();
    expect(validatePrinterCouponBrowserEvidenceArtifact(artifact, printerCouponCollectionTargets)).toEqual([]);

    const walgreensEvidence = summarizePrinterCouponBrowserEvidence(
      findPrinterCouponBrowserEvidenceTarget(artifact, walgreensPrintTarget),
      walgreensPrintTarget
    );
    const cvsEvidence = summarizePrinterCouponBrowserEvidence(findPrinterCouponBrowserEvidenceTarget(artifact, cvsPrintTarget), cvsPrintTarget);

    expect(walgreensEvidence).toMatchObject({
      visibleTextExpectedCodeVisible: false,
      pageHtmlExpectedCodeVisible: true,
      matchedHtmlExpectedCodes: ["CRISPCARD"],
      missingVerificationSignals: [],
      allVerificationSignalsMatched: true,
      validForRenderedProof: false,
      noCheckoutAction: true
    });
    expect(getPrinterCouponRenderedEvidenceStatus(walgreensPrintTarget, true, walgreensEvidence)).toBe(
      "operator-browser-html-signal-attached-visible-proof-still-required"
    );

    expect(cvsEvidence).toMatchObject({
      visibleTextExpectedCodeVisible: true,
      pageHtmlExpectedCodeVisible: true,
      matchedVisibleExpectedCodes: ["JUNESW"],
      missingVerificationSignals: [],
      allVerificationSignalsMatched: true,
      validForRenderedProof: true,
      noCheckoutAction: true
    });
    expect(getPrinterCouponRenderedEvidenceStatus(cvsPrintTarget, true, cvsEvidence)).toBe("operator-browser-proof-attached");
  });

  it("classifies the persisted operator print-link evidence artifact", () => {
    const artifact = JSON.parse(readFileSync("docs/printer-coupon-browser-evidence.json", "utf8")) as PrinterCouponBrowserEvidenceArtifact;

    expect(validatePrinterCouponBrowserEvidenceArtifact(artifact, printerCouponCollectionTargets)).toEqual([]);

    const walgreensEvidence = summarizePrinterCouponBrowserEvidence(
      findPrinterCouponBrowserEvidenceTarget(artifact, walgreensPrintTarget),
      walgreensPrintTarget
    );
    const cvsEvidence = summarizePrinterCouponBrowserEvidence(findPrinterCouponBrowserEvidenceTarget(artifact, cvsPrintTarget), cvsPrintTarget);

    expect(walgreensEvidence).toMatchObject({
      pageHtmlExpectedCodeVisible: true,
      visibleTextExpectedCodeVisible: false,
      allVerificationSignalsMatched: true,
      validForRenderedProof: false
    });
    expect(getPrinterCouponRenderedEvidenceStatus(walgreensPrintTarget, true, walgreensEvidence)).toBe(
      "operator-browser-html-signal-attached-visible-proof-still-required"
    );
    expect(cvsEvidence).toMatchObject({
      visibleTextExpectedCodeVisible: true,
      allVerificationSignalsMatched: true,
      validForRenderedProof: true
    });
    expect(getPrinterCouponRenderedEvidenceStatus(cvsPrintTarget, true, cvsEvidence)).toBe("operator-browser-proof-attached");
  });

  it("keeps visible coupon text blocked when print-link product signals are missing", () => {
    const incompleteEvidence = summarizePrinterCouponBrowserEvidence(
      {
        targetId: "cvs-photo-card-design-entrypoint",
        observedAtIso: "2026-06-07T17:25:07.637Z",
        url: cvsPrintTarget.url,
        finalUrl: cvsPrintTarget.url,
        renderedTitle: "Folded Greeting Card, 5x7 | Cards | Cards & Stationery | CVS Photo",
        visibleTextSignals: ["JUNESW"],
        pageHtmlSignals: ["JUNESW"],
        noCheckoutAction: true,
        noUploadAction: true,
        noOrderPlaced: true
      },
      cvsPrintTarget
    );

    expect(incompleteEvidence).toMatchObject({
      visibleTextExpectedCodeVisible: true,
      allVerificationSignalsMatched: false,
      missingVerificationSignals: expect.arrayContaining(["Folded Greeting Card, 5x7", "8.98", "CommerceProduct_26126"]),
      validForRenderedProof: false
    });
    expect(getPrinterCouponRenderedEvidenceStatus(cvsPrintTarget, true, incompleteEvidence)).toBe(
      "operator-browser-verification-signals-missing"
    );
  });

  it("rejects unsafe or mismatched rendered print-link evidence", () => {
    const unsafeArtifact: PrinterCouponBrowserEvidenceArtifact = {
      ...renderedPrintLinkArtifact,
      targets: [
        {
          ...renderedPrintLinkArtifact.targets[1],
          url: "https://www.cvs.com/photo/prints",
          noUploadAction: false
        }
      ]
    };
    const errors = validatePrinterCouponBrowserEvidenceArtifact(unsafeArtifact, printerCouponCollectionTargets);
    const evidence = summarizePrinterCouponBrowserEvidence(unsafeArtifact.targets[0], cvsPrintTarget);

    expect(errors).toEqual(
      expect.arrayContaining([
        "Printer coupon browser evidence target cvs-photo-card-design-entrypoint must prove no upload action.",
        "Printer coupon browser evidence target cvs-photo-card-design-entrypoint must match the registered print entrypoint URL."
      ])
    );
    expect(evidence).toMatchObject({
      validForRenderedProof: false,
      noCheckoutAction: false,
      validationErrors: expect.arrayContaining([
        "Printer coupon browser evidence target cvs-photo-card-design-entrypoint must prove no upload action."
      ])
    });
    expect(getPrinterCouponRenderedEvidenceStatus(cvsPrintTarget, true, evidence)).toBe("operator-browser-proof-invalid");
  });
});
