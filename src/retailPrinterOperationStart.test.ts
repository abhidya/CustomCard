import { describe, expect, it } from "vitest";
import {
  buildRetailPrinterOperationStartPackets,
  buildRetailPrinterOperationStartResponse,
  parseRetailPrinterOperationKind,
  parseRetailPrinterVendorId,
  retailPrinterOperationKinds as operationStartOperationKinds,
  retailPrinterProductLinks as operationStartProductLinks,
  retailPrinterOperationStartRoute,
  validateRetailPrinterOperationStartPackets
} from "./retailPrinterOperationStart";
import { getRetailPrinterAdapter, retailPrinterOperationKinds, retailPrinterProductLinks } from "./retailPrinterAdapters";
import { getRetailPrinterOperationProfile } from "./retailPrinterOperationPacketData.mjs";
import {
  retailPrinterRegistryOperationKinds,
  retailPrinterRegistryProductLinks
} from "./retailPrinterRegistryData.mjs";

describe("retail printer operation start packets", () => {
  it("uses the shared retail printer registry for adapter and operation-start products", () => {
    expect(retailPrinterProductLinks).toBe(retailPrinterRegistryProductLinks);
    expect(operationStartProductLinks).toBe(retailPrinterRegistryProductLinks);
    expect(retailPrinterOperationKinds).toBe(retailPrinterRegistryOperationKinds);
    expect(operationStartOperationKinds).toBe(retailPrinterRegistryOperationKinds);
  });

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

  it("keeps coupon provider, print-link, and portal proof targets aligned with pricing collection", () => {
    const packets = buildRetailPrinterOperationStartPackets();
    const walgreens = packets.find((packet) => packet.id === "walgreens-fetch-price-operation-start");
    const cvs = packets.find((packet) => packet.id === "cvs-fetch-price-operation-start");
    const walmart = packets.find((packet) => packet.id === "walmart-fetch-price-operation-start");
    const fedex = packets.find((packet) => packet.id === "fedex-fetch-price-operation-start");

    expect(walgreens?.couponCollectionPlan).toMatchObject({
      collectionPriority: [
        expect.objectContaining({ id: "credentialed-coupon-provider-feed", collectionMethod: "provider-api-feed" }),
        expect.objectContaining({ id: "official-retailer-coupon-page", collectionMethod: "server-fetch-html" }),
        expect.objectContaining({ id: "exact-rendered-print-link", collectionMethod: "rendered-browser-read" }),
        expect.objectContaining({ id: "same-cart-provider-portal-proof", canAffectBestPrice: true })
      ],
      collectionTargetIds: [
        "fmtc-deal-feed",
        "rakuten-coupon-feed",
        "walgreens-photo-official-deals",
        "walgreens-photo-card-design-entrypoint"
      ],
      providerFeedTargetIds: ["fmtc-deal-feed", "rakuten-coupon-feed"],
      retailerCouponTargetIds: ["walgreens-photo-official-deals"],
      printEntrypointTargetIds: ["walgreens-photo-card-design-entrypoint"],
      candidateOfferCodes: ["CRISPCARD"],
      portalApplicationPacketIds: ["walgreens-crispcard-cards-2026-06-13-portal-application-packet"],
      couponProviderFeedPreferred: true,
      retailerScrapeFallbackAllowed: true,
      printLinkRenderFallbackAllowed: true,
      providerPortalApplicationRequired: true
    });
    expect(walgreens?.couponCollectionPlan.providerFeedTargets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "fmtc-deal-feed", collectionMethod: "provider-api-feed" }),
        expect.objectContaining({ id: "rakuten-coupon-feed", collectionMethod: "provider-api-feed" })
      ])
    );
    expect(walgreens?.couponCollectionPlan.printEntrypointTargets).toEqual([
      expect.objectContaining({
        id: "walgreens-photo-card-design-entrypoint",
        url: retailPrinterProductLinks.walgreens.productUrl,
        browserRenderProofRequired: true
      })
    ]);
    expect(walgreens?.couponCollectionPlan.portalApplicationPackets).toEqual([
      expect.objectContaining({
        id: "walgreens-crispcard-cards-2026-06-13-portal-application-packet",
        canAffectBestPrice: false,
        liveCheckoutAutomation: false,
        applicationTargets: [
          expect.objectContaining({
            sourcePriceObservationId: "walgreens-5x7-folded-card",
            expectedSubtotalAfterCouponCents: 140,
            cartTerms: expect.objectContaining({ accountState: "logged-in" })
          })
        ]
      })
    ]);

    expect(cvs?.couponCollectionPlan).toMatchObject({
      collectionTargetIds: ["fmtc-deal-feed", "rakuten-coupon-feed", "cvs-photo-official-coupons", "cvs-photo-card-design-entrypoint"],
      providerFeedTargetIds: ["fmtc-deal-feed", "rakuten-coupon-feed"],
      retailerCouponTargetIds: ["cvs-photo-official-coupons"],
      printEntrypointTargetIds: ["cvs-photo-card-design-entrypoint"],
      candidateOfferCodes: ["JUNESW"],
      portalApplicationPacketIds: ["cvs-junesw-sitewide-photo-2026-06-20-portal-application-packet"]
    });
    expect(cvs?.couponCollectionPlan.printEntrypointTargets).toEqual([
      expect.objectContaining({
        id: "cvs-photo-card-design-entrypoint",
        url: retailPrinterProductLinks.cvs.productUrl,
        browserRenderProofRequired: true
      })
    ]);
    expect(cvs?.couponCollectionPlan.portalApplicationPackets[0]).toMatchObject({
      id: "cvs-junesw-sitewide-photo-2026-06-20-portal-application-packet",
      canAffectBestPrice: false,
      liveCheckoutAutomation: false,
      applicationTargets: expect.arrayContaining([
        expect.objectContaining({ sourcePriceObservationId: "cvs-5x7-folded-card", expectedSubtotalAfterCouponCents: 449 }),
        expect.objectContaining({ sourcePriceObservationId: "cvs-5x7-photo-card", expectedSubtotalAfterCouponCents: 1090 })
      ])
    });

    for (const packet of [walmart, fedex]) {
      expect(packet?.couponCollectionPlan).toMatchObject({
        collectionTargetIds: [],
        providerFeedTargetIds: [],
        retailerCouponTargetIds: [],
        printEntrypointTargetIds: [],
        candidateOfferCodes: [],
        portalApplicationPacketIds: [],
        providerFeedTargets: [],
        retailerCouponTargets: [],
        printEntrypointTargets: [],
        portalApplicationPackets: []
      });
      expect(packet?.couponCollectionPlan.operatorSteps.join(" ")).toContain("do not invent third-party coupon candidates");
    }
  });

  it("drives operation-start and adapter packets from one operation profile", () => {
    const profile = getRetailPrinterOperationProfile("upload-image");
    const startPacket = buildRetailPrinterOperationStartPackets().find(
      (packet) => packet.id === "walgreens-upload-image-operation-start"
    );
    const adapterOperation = getRetailPrinterAdapter("walgreens").operations.find(
      (operation) => operation.kind === "upload-image"
    );

    expect(startPacket?.requiredEvidence).toEqual(profile.requiredEvidence);
    expect(startPacket?.forbiddenFields).toEqual(["raw relationship memories", "raw payment card data", "unapproved recipient PII"]);
    expect(startPacket?.providerEntrypoint).toMatchObject({
      evidenceMode: profile.evidenceMode,
      couponMode: profile.couponMode
    });
    expect(adapterOperation?.requiredEvidence).toEqual(profile.adapterRequiredEvidence);
    expect(adapterOperation?.certificationGateIds).toEqual(profile.adapterCertificationGateIds);
    expect(adapterOperation?.providerEntrypoint).toMatchObject({
      evidenceMode: profile.evidenceMode,
      couponMode: profile.providerEntrypointCouponMode
    });
  });

  it("parses only supported vendors and operations", () => {
    expect(parseRetailPrinterVendorId("walgreens")).toBe("walgreens");
    expect(parseRetailPrinterVendorId("example")).toBeUndefined();
    expect(parseRetailPrinterOperationKind("place-order")).toBe("place-order");
    expect(parseRetailPrinterOperationKind("checkout")).toBeUndefined();
  });
});
