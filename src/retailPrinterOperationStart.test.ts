import { describe, expect, it } from "vitest";
import {
  buildRetailPrinterOperationStartPackets,
  buildRetailPrinterOperationStartResponse,
  parseRetailPrinterOperationKind,
  parseRetailPrinterVendorId,
  retailPrinterOperationStartRoute,
  validateRetailPrinterOperationStartPackets
} from "./retailPrinterOperationStart";
import { retailPrinterOperationKinds, retailPrinterProductLinks } from "./retailPrinterAdapters";

describe("retail printer operation start packets", () => {
  it("builds server-owned start packets for every vendor operation", () => {
    const packets = buildRetailPrinterOperationStartPackets();

    expect(validateRetailPrinterOperationStartPackets(packets)).toEqual([]);
    expect(packets).toHaveLength(12);

    for (const vendorId of Object.keys(retailPrinterProductLinks)) {
      for (const operation of retailPrinterOperationKinds) {
        const packet = packets.find((candidate) => candidate.vendorId === vendorId && candidate.operation === operation);
        const productLink = retailPrinterProductLinks[vendorId as keyof typeof retailPrinterProductLinks];

        expect(packet).toMatchObject({
          id: `${vendorId}-${operation}-operation-start`,
          apiRoute: retailPrinterOperationStartRoute,
          providerAdapterId: productLink.providerAdapterId,
          productUrl: productLink.productUrl,
          providerPortalUrl: productLink.productUrl,
          providerRequestUrl: null,
          serverOwned: true,
          clientMayPrepareProviderRequest: false,
          providerRequestPrepared: false,
          networkRequestPrepared: false,
          requestPrepared: false,
          networkAttempted: false,
          noNetwork: true,
          externalNetworkCalls: false,
          realOrdersEnabled: false,
          liveQuoteEnabled: false,
          imageUploadEnabled: false,
          orderPlacementEnabled: false,
          couponPortalApplicationRequired: true,
          bestPriceRequiresProviderPortalEvidence: true,
          canAffectBestPriceBeforePortalEvidence: false
        });
        expect(packet?.couponCollectionPlan).toMatchObject({
          couponPolicy: expect.objectContaining({ providerPortalApplicationRequired: true }),
          bestPriceRequiresProviderPortalEvidence: true,
          canAffectBestPriceBeforePortalEvidence: false
        });
        expect(packet?.requiredInputFields.length).toBeGreaterThan(0);
        expect(packet?.expectedInputFields).toEqual(expect.arrayContaining(packet?.requiredInputFields ?? []));
        expect(packet?.operatorSteps.join(" ")).toContain(productLink.productUrl);
      }
    }
  });

  it("returns a blocked response for the requested operation without provider request preparation", () => {
    const response = buildRetailPrinterOperationStartResponse({
      vendorId: "cvs",
      operation: "fetch-price"
    });

    expect(response).toMatchObject({
      service: "customcard-retail-printer-operation-start",
      status: "blocked",
      requestedVendorId: "cvs",
      requestedOperation: "fetch-price",
      serverOwned: true,
      clientMayPrepareProviderRequest: false,
      providerPortalUrl: retailPrinterProductLinks.cvs.productUrl,
      providerRequestUrl: null,
      providerRequestPrepared: false,
      networkRequestPrepared: false,
      requestPrepared: false,
      networkAttempted: false,
      externalNetworkCalls: false,
      realOrdersEnabled: false,
      liveQuoteEnabled: false,
      imageUploadEnabled: false,
      orderPlacementEnabled: false,
      startPacket: expect.objectContaining({
        vendorId: "cvs",
        operation: "fetch-price",
        providerAdapterId: "cvs-live-order",
        couponPortalApplicationRequired: true
      })
    });
    expect(response.blockers).toEqual(
      expect.arrayContaining(["provider-coupon-portal-proof", "retail-price-freshness-proof"])
    );
  });

  it("parses only supported vendors and operations", () => {
    expect(parseRetailPrinterVendorId("walgreens")).toBe("walgreens");
    expect(parseRetailPrinterVendorId("example")).toBeUndefined();
    expect(parseRetailPrinterOperationKind("place-order")).toBe("place-order");
    expect(parseRetailPrinterOperationKind("checkout")).toBeUndefined();
  });
});
