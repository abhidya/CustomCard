import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildRetailPrinterEntrypointEvidenceTargetDefinitions,
  findRetailPrinterEntrypointEvidenceTarget,
  getRetailPrinterEntrypointEvidenceStatus,
  retailPrinterEntrypointTargetId,
  summarizeRetailPrinterEntrypointEvidence,
  validateRetailPrinterEntrypointEvidenceArtifact,
  type RetailPrinterEntrypointEvidenceArtifact
} from "./retailPrinterEntrypointEvidence";
import { retailPrinterProductLinks, type RetailPrinterVendorId } from "./retailPrinterAdapters";

const expectedVendorIds: RetailPrinterVendorId[] = ["walmart", "fedex", "cvs", "walgreens"];

function evidenceTarget(vendorId: RetailPrinterVendorId, matchedPageSignals: string[]) {
  const productLink = retailPrinterProductLinks[vendorId];
  return {
    targetId: retailPrinterEntrypointTargetId(vendorId),
    vendorId,
    observedAtIso: "2026-06-07T22:30:00.000Z",
    url: productLink.productUrl,
    finalUrl: productLink.productUrl,
    expectedUrlTokens: productLink.requiredUrlTokens,
    expectedPageSignals: [productLink.productName, productLink.productSku],
    matchedUrlTokens: productLink.requiredUrlTokens,
    matchedPageSignals,
    status: 200,
    ok: true,
    bytes: 1200,
    noCheckoutAction: true,
    noUploadAction: true,
    noOrderPlaced: true
  };
}

describe("retail printer entrypoint evidence", () => {
  it("builds exact public product-entrypoint targets for every retail adapter", () => {
    const targets = buildRetailPrinterEntrypointEvidenceTargetDefinitions();

    expect(targets.map((target) => target.vendorId)).toEqual(expectedVendorIds);
    for (const target of targets) {
      const productLink = retailPrinterProductLinks[target.vendorId];
      expect(target).toMatchObject({
        targetId: retailPrinterEntrypointTargetId(target.vendorId),
        url: productLink.productUrl,
        expectedUrlTokens: productLink.requiredUrlTokens
      });
      expect(target.expectedPageSignals).toEqual(expect.arrayContaining([productLink.productName, productLink.productSku]));
    }
  });

  it("validates safe operator evidence without treating it as quote, upload, or order proof", () => {
    const artifact: RetailPrinterEntrypointEvidenceArtifact = {
      service: "customcard-retail-printer-entrypoint-evidence",
      generatedAtIso: "2026-06-07T22:31:00.000Z",
      runtime: "operator-server-fetch-html",
      operatorAction: "Fetched exact public provider product links; no login, upload, cart, payment, or order action.",
      targets: [
        evidenceTarget("walmart", ["5x7 folded card, blank envelope - upload your design", "361-5x7-folded-card-blank-envelope"]),
        evidenceTarget("fedex", ["Quick greeting and holiday cards", "fedex-office-quick-greeting-cards"]),
        evidenceTarget("cvs", ["Folded greeting card, 5x7", "CommerceProduct_26126"]),
        evidenceTarget("walgreens", ["5x7 folded cards, standard cardstock 85lb", "CommerceProduct_33272"])
      ]
    };

    expect(validateRetailPrinterEntrypointEvidenceArtifact(artifact)).toEqual([]);
    for (const vendorId of expectedVendorIds) {
      const summary = summarizeRetailPrinterEntrypointEvidence(
        findRetailPrinterEntrypointEvidenceTarget(artifact, vendorId),
        retailPrinterProductLinks[vendorId]
      );
      expect(summary).toMatchObject({
        exactUrlMatched: true,
        allUrlTokensMatched: true,
        allPageSignalsMatched: true,
        noProviderAction: true,
        status: "operator-public-page-read-attached",
        validationErrors: []
      });
    }
  });

  it("classifies url-only evidence as insufficient for a full public page read", () => {
    const productLink = retailPrinterProductLinks.walmart;
    const summary = summarizeRetailPrinterEntrypointEvidence(
      {
        targetId: retailPrinterEntrypointTargetId("walmart"),
        vendorId: "walmart",
        observedAtIso: "2026-06-07T22:30:00.000Z",
        url: productLink.productUrl,
        expectedUrlTokens: productLink.requiredUrlTokens,
        expectedPageSignals: [productLink.productName, productLink.productSku],
        matchedUrlTokens: productLink.requiredUrlTokens,
        matchedPageSignals: [],
        noCheckoutAction: true,
        noUploadAction: true,
        noOrderPlaced: true
      },
      productLink
    );

    expect(summary).toMatchObject({
      allUrlTokensMatched: true,
      allPageSignalsMatched: false,
      missingPageSignals: [productLink.productName, productLink.productSku],
      status: "operator-public-page-url-only-signals-missing"
    });
    expect(
      getRetailPrinterEntrypointEvidenceStatus({
        allUrlTokensMatched: true,
        allPageSignalsMatched: false,
        noProviderAction: true,
        validationErrors: []
      })
    ).toBe("operator-public-page-url-only-signals-missing");
  });

  it("rejects unsafe, missing, or mismatched entrypoint artifacts", () => {
    const unsafeArtifact: RetailPrinterEntrypointEvidenceArtifact = {
      service: "customcard-retail-printer-entrypoint-evidence",
      generatedAtIso: "2026-06-07T22:31:00.000Z",
      runtime: "operator-server-fetch-html",
      targets: [
        {
          ...evidenceTarget("cvs", ["Folded greeting card, 5x7", "CommerceProduct_26126"]),
          url: "https://www.cvs.com/photo/prints",
          noUploadAction: false
        }
      ]
    };

    expect(validateRetailPrinterEntrypointEvidenceArtifact(unsafeArtifact)).toEqual(
      expect.arrayContaining([
        "Retail printer entrypoint evidence target cvs-provider-product-entrypoint must prove no upload action.",
        "Retail printer entrypoint evidence target cvs-provider-product-entrypoint must match the persisted CVS Photo product URL.",
        "Retail printer entrypoint evidence artifact must include target for walmart.",
        "Retail printer entrypoint evidence artifact must include target for fedex.",
        "Retail printer entrypoint evidence artifact must include target for walgreens."
      ])
    );
  });

  it("validates the persisted operator entrypoint evidence artifact", () => {
    const artifact = JSON.parse(readFileSync("docs/retail-printer-entrypoint-evidence.json", "utf8")) as RetailPrinterEntrypointEvidenceArtifact;

    expect(validateRetailPrinterEntrypointEvidenceArtifact(artifact)).toEqual([]);
    expect(artifact.targets.map((target) => target.vendorId)).toEqual(expectedVendorIds);
    for (const vendorId of expectedVendorIds) {
      const summary = summarizeRetailPrinterEntrypointEvidence(
        findRetailPrinterEntrypointEvidenceTarget(artifact, vendorId),
        retailPrinterProductLinks[vendorId]
      );
      expect(summary?.allUrlTokensMatched).toBe(true);
      expect(summary?.noProviderAction).toBe(true);
      expect(summary?.status).not.toBe("operator-public-page-proof-invalid");
    }
  });
});
