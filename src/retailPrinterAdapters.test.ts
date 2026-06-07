import { describe, expect, it } from "vitest";
import { printerPriceCatalog } from "./printerPricing";
import {
  buildRetailPrinterAdapterPlan,
  buildRetailPrinterCertificationPackets,
  createRetailPrinterOperationAdapter,
  getRetailPrinterAdapter,
  getRetailPrinterAdapterForProvider,
  getRetailPrinterProductLink,
  getRetailPrinterProductLinkByProvider,
  retailPrinterAdapters,
  retailPrinterProductLinks,
  validateRetailPrinterAdapters,
  type RetailPrinterOperationKind,
  type RetailPrinterVendorId
} from "./retailPrinterAdapters";

const expectedRetailSources: Record<RetailPrinterVendorId, string> = {
  walmart:
    "https://photos3.walmart.com/category/725-5x7-photo-upload-cards?product=361-5x7-folded-card-blank-envelope&theme=wmcards-WMT.themepack%3Awmt_custom_5x7.card&design_code=standard.custom&selected_delivery_options=2",
  fedex: "https://www.office.fedex.com/default/greeting-cards-quick.html",
  cvs:
    "https://www.cvs.com/photo/design-detail?category=StoreCat_22821&dgId=02d8d8bfa1fd46bb8234635847ec8dfd&designId=1f0682a2d34546bf86cbb799c3811d4e&sku=CommerceProduct_26126&ptype=cards&pcat=erin_condren_3740_1725983028_cvs_us&designName=Erin%20Condren&dgCatId=erin_condren_3740_1725983028_cvs_us&sortCriteria=toppicks#/dgview?productCategory=Card%20%26%20Stationery",
  walgreens:
    "https://photo.walgreens.com/store/design-detail?category=StoreCat_24955&dgId=40e943c647fe44c5867d74bb91e5feca&designId=0c158c44e2f34d9fabc9e1b3ada2eaa6&sku=CommerceProduct_33272&ptype=cards&pcat=design_your_own_56061_1525293477_walgreens_us&scat=&filters=&searchPhrase=&designName=Upload%20Your%20Design&pcatName=Cards&withSku=N&searchPhrase=&dgCatId=design_your_own_56061_1525293477_walgreens_us#/dgview?productCategory=Card%20%26%20Stationery"
};

describe("retail printer adapters", () => {
  it("persists the supplied product links and keeps all live operations blocked", () => {
    expect(validateRetailPrinterAdapters()).toEqual([]);
    expect(retailPrinterAdapters.map((adapter) => adapter.vendorId)).toEqual(["walmart", "fedex", "cvs", "walgreens"]);

    for (const adapter of retailPrinterAdapters) {
      expect(getRetailPrinterProductLink(adapter.vendorId).productUrl).toBe(expectedRetailSources[adapter.vendorId]);
      expect(getRetailPrinterProductLinkByProvider(adapter.providerAdapterId)?.productUrl).toBe(
        expectedRetailSources[adapter.vendorId]
      );
      expect(retailPrinterProductLinks[adapter.vendorId].productUrl).toBe(expectedRetailSources[adapter.vendorId]);
      expect(adapter.productUrl).toBe(expectedRetailSources[adapter.vendorId]);
      expect(adapter.realOrdersEnabled).toBe(false);
      expect(adapter.liveQuoteEnabled).toBe(false);
      expect(adapter.imageUploadEnabled).toBe(false);
      expect(adapter.orderPlacementEnabled).toBe(false);
      expect(adapter.operationPolicy).toMatchObject({
        vendorId: adapter.vendorId,
        providerAdapterId: adapter.providerAdapterId,
        productUrl: expectedRetailSources[adapter.vendorId],
        productSku: adapter.productSku,
        price: expect.objectContaining({
          couponProof: "same-cart-provider-portal",
          requiredEvidenceFields: expect.arrayContaining(["subtotal", "taxStatus", "pickupOrShippingWindow"])
        }),
        upload: expect.objectContaining({
          acceptedArtifactKinds: expect.arrayContaining(["combined-pdf-proof", "svg-panel-set"]),
          previewEvidenceFields: expect.arrayContaining(["providerPreviewScreenshot", "cropFoldState"])
        }),
        order: expect.objectContaining({
          requiredApprovalFields: expect.arrayContaining(["customerApprovalId", "quoteEvidenceId"]),
          recoveryEvidenceFields: expect.arrayContaining(["cancellationRecoveryPlanId", "wrongStoreRecoveryPlanId"])
        })
      });
      expect(adapter.operationPolicy.productIdentityTokens).toEqual(
        expect.arrayContaining(retailPrinterProductLinks[adapter.vendorId].requiredUrlTokens)
      );
      expect(adapter.sourceLinks.map((sourceLink) => sourceLink.purpose)).toEqual([
        "product",
        "fetch-price",
        "upload-image",
        "place-order"
      ]);
      expect(adapter.sourceLinks.every((sourceLink) => sourceLink.url === expectedRetailSources[adapter.vendorId])).toBe(true);
      expect(printerPriceCatalog.some((observation) => observation.id === adapter.pricingObservationId)).toBe(true);
      expect(adapter.operations.map((operation) => operation.kind)).toEqual([
        "fetch-price",
        "upload-image",
        "place-order"
      ] satisfies RetailPrinterOperationKind[]);

      for (const operation of adapter.operations) {
        expect(operation.status).toBe("blocked");
        expect(operation.sourceUrl).toBe(adapter.productUrl);
        expect(operation.noNetwork).toBe(true);
        expect(operation.preparesRequest).toBe(false);
        expect(operation.requiredEvidence.length).toBeGreaterThanOrEqual(3);
        expect(operation.certificationGateIds).toEqual(
          expect.arrayContaining(["vendor-certification", "real-order-kill-switch", "customer-approval"])
        );
        expect(operation.requestBlueprint.transport).toBe("future-certified-api-or-reviewed-browser-session");
        expect(operation.requestBlueprint.requestFields.length).toBeGreaterThanOrEqual(4);
        expect(operation.requestBlueprint.requestFields.every((field) => typeof field.required === "boolean")).toBe(true);
        expect(operation.requestBlueprint.requestFields.filter((field) => !field.required).map((field) => field.name)).toEqual(
          operation.kind === "fetch-price" ? ["couponCode"] : []
        );
        expect(operation.requestBlueprint.responseEvidence.length).toBeGreaterThanOrEqual(3);
        expect(operation.requestBlueprint.forbiddenFields).toEqual(
          expect.arrayContaining(["raw relationship memories", "raw payment card data", "unapproved recipient PII"])
        );
        expect(operation.requestBlueprint.successCriteria.length).toBeGreaterThanOrEqual(2);
        expect(operation.blockedReason.toLowerCase()).toMatch(/certified|certification|review-only|disabled/);
      }
    }
  });

  it("rejects generic or placeholder product URLs for retail printer adapters", () => {
    const walmart = getRetailPrinterAdapter("walmart");
    const genericUrl = "https://photos3.walmart.com/category/725-5x7-photo-upload-cards";
    const genericWalmart = {
      ...walmart,
      productUrl: genericUrl,
      sourceLinks: walmart.sourceLinks.map((sourceLink) => ({ ...sourceLink, url: genericUrl })),
      operations: walmart.operations.map((operation) => ({ ...operation, sourceUrl: genericUrl }))
    };

    expect(validateRetailPrinterAdapters([genericWalmart])).toEqual(
      expect.arrayContaining([
        "walmart adapter must use the exact supplied Walmart Photo product URL.",
        "walmart adapter product URL is missing required product token: product=361-5x7-folded-card-blank-envelope.",
        "walmart adapter product URL is missing required product token: theme=wmcards-WMT.themepack%3Awmt_custom_5x7.card.",
        "walmart adapter product URL is missing required product token: design_code=standard.custom.",
        "walmart adapter product URL is missing required product token: selected_delivery_options=2."
      ])
    );

    const placeholderWalmart = {
      ...walmart,
      productUrl: "https://example.com/placeholder/walmart-card",
      sourceLinks: walmart.sourceLinks.map((sourceLink) => ({
        ...sourceLink,
        url: "https://example.com/placeholder/walmart-card"
      })),
      operations: walmart.operations.map((operation) => ({
        ...operation,
        sourceUrl: "https://example.com/placeholder/walmart-card"
      }))
    };

    expect(validateRetailPrinterAdapters([placeholderWalmart])).toEqual(
      expect.arrayContaining([
        "walmart adapter product URL must not be placeholder, demo, localhost, or example content."
      ])
    );
  });

  it("builds a selected no-network operation plan for runtime display", () => {
    const plan = buildRetailPrinterAdapterPlan("walgreens", "upload-image");

    expect(plan).toMatchObject({
      vendorId: "walgreens",
      vendorName: "Walgreens Photo",
      productUrl: expectedRetailSources.walgreens,
      selectedOperation: "upload-image",
      noNetwork: true,
      realOrdersEnabled: false,
      liveQuoteEnabled: false,
      imageUploadEnabled: false,
      orderPlacementEnabled: false,
      operation: expect.objectContaining({
        kind: "upload-image",
        status: "blocked",
        preparesRequest: false,
        requestBlueprint: expect.objectContaining({
          requestFields: expect.arrayContaining([
            expect.objectContaining({ name: "renderPacketArtifactUris", source: "render-packet" }),
            expect.objectContaining({ name: "customerApprovalId", source: "customer-approval" })
          ]),
          responseEvidence: expect.arrayContaining(["Vendor preview screenshot", "Asset acceptance result"])
        })
      })
    });
    expect(plan.operations).toHaveLength(3);
    expect(plan.sourceLinks.map((sourceLink) => sourceLink.purpose)).toEqual([
      "product",
      "fetch-price",
      "upload-image",
      "place-order"
    ]);
    expect(getRetailPrinterAdapter("cvs").productSku).toBe("CommerceProduct_26126");
    expect(getRetailPrinterAdapterForProvider("walmart-live-print")?.productUrl).toBe(expectedRetailSources.walmart);
  });

  it("exposes executable no-network adapters for price, upload, and order attempts", () => {
    const adapter = createRetailPrinterOperationAdapter("fedex");
    const price = adapter.fetchPrice({
      quantity: 10,
      fulfillmentMode: "pickup",
      storeOrShippingZip: "10001",
      couponCode: "JUNESW"
    });
    const upload = adapter.uploadImages({
      renderPacketArtifactUris: ["s3://customcard-review/render-packets/fedex-front.png"],
      panelManifestChecksum: "sha256:fedex-review-packet",
      customerApprovalId: "approval-fedex-upload-1",
      providerAccountReference: "provider-account-redacted"
    });
    const order = adapter.placeOrder({
      providerCartId: "cart-fedex-redacted",
      quoteEvidenceId: "quote-fedex-1",
      paymentAuthorizationReference: "payment-auth-redacted",
      customerApprovalId: "approval-fedex-order-1",
      cancellationRecoveryPlanId: "recovery-fedex-1"
    });

    for (const result of [price, upload, order]) {
      expect(result).toMatchObject({
        vendorId: "fedex",
        providerAdapterId: "fedex-live-print",
        status: "blocked",
        networkAttempted: false,
        requestPrepared: false,
        productUrl: expectedRetailSources.fedex,
        sourceLink: expect.objectContaining({ url: expectedRetailSources.fedex }),
        forbiddenFields: expect.arrayContaining(["raw relationship memories", "raw payment card data", "unapproved recipient PII"])
      });
      expect(result.operationPacket).toMatchObject({
        vendorId: "fedex",
        providerAdapterId: "fedex-live-print",
        operation: result.operation,
        productUrl: expectedRetailSources.fedex,
        pricingObservationId: "fedex-quick-5x7-single-sided-card",
        noNetwork: true,
        networkAttempted: false,
        requestPrepared: false,
        sourceLink: expect.objectContaining({ purpose: result.operation, url: expectedRetailSources.fedex }),
        forbiddenFields: expect.arrayContaining(["raw relationship memories", "raw payment card data", "unapproved recipient PII"])
      });
      expect(result.operationPacket.operationPolicy).toEqual(expect.any(Object));
      if (result.operation === "fetch-price") {
        expect(result.operationPacket.operationPolicy).toMatchObject({
          supportedFulfillmentModes: ["pickup", "shipping"]
        });
      }
      expect(result.operationPacket.certificationPacket).toMatchObject({
        packetId: `fedex-${result.operation}-certification-packet`,
        vendorId: "fedex",
        providerAdapterId: "fedex-live-print",
        operation: result.operation,
        providerPortalUrl: expectedRetailSources.fedex,
        productUrl: expectedRetailSources.fedex,
        productSku: "fedex-office-quick-greeting-cards",
        pricingObservationId: "fedex-quick-5x7-single-sided-card",
        status: "certification-evidence-required",
        requiredEvidenceArtifacts: result.requiredEvidence,
        canEnableLiveOperation: false,
        blockedLiveOperationFields: expect.arrayContaining([
          "network request from CustomCard",
          "provider API payload preparation",
          "raw payment card data"
        ])
      });
      expect(result.operationPacket.certificationPacket.requiredGateIds).toEqual(
        expect.arrayContaining(["vendor-certification", "real-order-kill-switch", "customer-approval"])
      );
      expect(result.operationPacket.certificationPacket.requiredProviderEvidence.length).toBeGreaterThanOrEqual(3);
      expect(result.operationPacket.certificationPacket.liveEnablementChecks.join(" ")).toContain(expectedRetailSources.fedex);
      expect(result.operationPacket.packetId).toBe(`fedex-${result.operation}-blocked-operation-packet`);
      expect(result.operationPacket.evidenceChecklist).toEqual(result.requiredEvidence);
      expect(result.operationPacket.operatorSteps.length).toBeGreaterThanOrEqual(4);
      expect(result.operationPacket.safetyChecks.join(" ")).toContain("Do not send a network request from CustomCard.");
      expect(result.operationPacket.sourceBackedFields).toEqual(
        result.operation === "place-order" ? ["quoteEvidenceId"] : expect.arrayContaining(["productSku"])
      );
      expect(result.operationPacket.missingInputFields).toEqual([]);
      expect(result.operationPacket.policyViolations).toEqual([]);
      expect(result.missingEvidence).toEqual(expect.arrayContaining(result.requiredEvidence));
      expect(result.blockedReason.toLowerCase()).toMatch(/certification|disabled|review-only/);
    }
    expect(price.operation).toBe("fetch-price");
    expect(upload.operation).toBe("upload-image");
    expect(order.operation).toBe("place-order");
    expect(order.missingEvidence).toEqual(expect.arrayContaining(["Vendor certification", "Payment and cancellation recovery proof"]));
  });

  it("keeps provider-specific operation rules inside the retail adapter packet", () => {
    const walmart = createRetailPrinterOperationAdapter("walmart");
    const invalidShipping = walmart.fetchPrice({
      quantity: 0,
      fulfillmentMode: "shipping",
      storeOrShippingZip: ""
    });

    expect(invalidShipping.operationPacket.operationPolicy).toMatchObject({
      minimumQuantity: 1,
      quantityIncrement: 1,
      supportedFulfillmentModes: ["pickup"],
      couponProof: "same-cart-provider-portal"
    });
    expect(invalidShipping.operationPacket.policyViolations).toEqual(
      expect.arrayContaining([
        "walmart fetch-price quantity must be at least 1.",
        "walmart fetch-price fulfillment mode shipping is not supported for this product link.",
        "walmart fetch-price requires store or shipping context before provider portal collection."
      ])
    );
    expect(invalidShipping.networkAttempted).toBe(false);
    expect(invalidShipping.requestPrepared).toBe(false);

    const fedex = createRetailPrinterOperationAdapter("fedex").fetchPrice({
      quantity: 10,
      fulfillmentMode: "shipping",
      storeOrShippingZip: "10001"
    });

    expect(fedex.operationPacket.operationPolicy).toMatchObject({
      minimumQuantity: 10,
      supportedFulfillmentModes: ["pickup", "shipping"]
    });
    expect(fedex.operationPacket.policyViolations).toEqual([]);
  });

  it("builds operation packets for every retail vendor operation without preparing provider requests", () => {
    for (const vendorId of Object.keys(expectedRetailSources) as RetailPrinterVendorId[]) {
      const adapter = createRetailPrinterOperationAdapter(vendorId);
      const results = [
        adapter.fetchPrice({
          quantity: 20,
          fulfillmentMode: "pickup",
          storeOrShippingZip: "10001"
        }),
        adapter.uploadImages({
          renderPacketArtifactUris: [`s3://customcard-review/render-packets/${vendorId}-proof.pdf`],
          panelManifestChecksum: `sha256:${vendorId}-manifest`,
          customerApprovalId: `approval-${vendorId}-upload`,
          providerAccountReference: "provider-account-redacted"
        }),
        adapter.placeOrder({
          providerCartId: `cart-${vendorId}-redacted`,
          quoteEvidenceId: `quote-${vendorId}`,
          paymentAuthorizationReference: "payment-auth-redacted",
          customerApprovalId: `approval-${vendorId}-order`,
          cancellationRecoveryPlanId: `recovery-${vendorId}`
        })
      ];

      expect(results.map((result) => result.operation)).toEqual(["fetch-price", "upload-image", "place-order"]);
      for (const result of results) {
        expect(result.networkAttempted).toBe(false);
        expect(result.requestPrepared).toBe(false);
        expect(result.operationPacket).toMatchObject({
          vendorId,
          productUrl: expectedRetailSources[vendorId],
          sourceLink: expect.objectContaining({
            purpose: result.operation,
            url: expectedRetailSources[vendorId]
          }),
          noNetwork: true,
          networkAttempted: false,
          requestPrepared: false,
          missingInputFields: []
        });
        expect(result.operationPacket.certificationPacket).toMatchObject({
          packetId: `${vendorId}-${result.operation}-certification-packet`,
          vendorId,
          operation: result.operation,
          providerPortalUrl: expectedRetailSources[vendorId],
          productUrl: expectedRetailSources[vendorId],
          status: "certification-evidence-required",
          canEnableLiveOperation: false
        });
        expect(result.operationPacket.certificationPacket.requiredEvidenceArtifacts).toEqual(result.requiredEvidence);
        expect(result.operationPacket.certificationPacket.requiredGateIds.length).toBeGreaterThanOrEqual(3);
        expect(result.operationPacket.certificationPacket.requiredProviderEvidence).toEqual(
          expect.arrayContaining(result.operation === "fetch-price" ? ["Coupon application status"] : [])
        );
        expect(result.operationPacket.expectedInputFields).toEqual(result.requestFieldNames);
        expect(result.operationPacket.receivedInputFields).toEqual(result.receivedFieldNames);
        expect(result.operationPacket.operatorSteps.join(" ")).toContain(expectedRetailSources[vendorId]);
        expect(result.operationPacket.safetyChecks).toEqual(
          expect.arrayContaining(["Do not prepare a provider API payload in app runtime."])
        );
      }
    }
  });

  it("keeps operation blueprints specific to price, upload, and order contracts", () => {
    const walmart = getRetailPrinterAdapter("walmart");
    const price = walmart.operations.find((operation) => operation.kind === "fetch-price");
    const upload = walmart.operations.find((operation) => operation.kind === "upload-image");
    const order = walmart.operations.find((operation) => operation.kind === "place-order");

    expect(price?.requestBlueprint.requestFields.map((field) => field.name)).toEqual(
      expect.arrayContaining(["productUrl", "productSku", "quantity", "fulfillmentMode", "storeOrShippingZip", "couponCode"])
    );
    expect(price?.requestBlueprint.responseEvidence).toEqual(
      expect.arrayContaining(["Quoted subtotal", "Tax estimate or tax blocked reason", "Coupon application status"])
    );
    expect(upload?.requestBlueprint.requestFields.map((field) => field.name)).toEqual(
      expect.arrayContaining(["renderPacketArtifactUris", "panelManifestChecksum", "productSku", "customerApprovalId"])
    );
    expect(upload?.requestBlueprint.successCriteria).toEqual(
      expect.arrayContaining(["Preview shows the intended 5x7 panels", "No raw memory text leaves the system"])
    );
    expect(order?.requestBlueprint.requestFields.map((field) => field.name)).toEqual(
      expect.arrayContaining(["providerCartId", "quoteEvidenceId", "paymentAuthorizationReference", "customerApprovalId"])
    );
    expect(order?.certificationGateIds).toEqual(
      expect.arrayContaining(["payment-certification", "cancellation-recovery", "physical-print-qa"])
    );
  });

  it("builds certification packets for every retail provider operation", () => {
    const packets = buildRetailPrinterCertificationPackets();

    expect(packets).toHaveLength(12);
    expect(packets.map((packet) => packet.packetId)).toEqual(
      expect.arrayContaining([
        "walmart-fetch-price-certification-packet",
        "fedex-upload-image-certification-packet",
        "cvs-place-order-certification-packet",
        "walgreens-place-order-certification-packet"
      ])
    );

    for (const packet of packets) {
      expect(packet.providerPortalUrl).toBe(expectedRetailSources[packet.vendorId]);
      expect(packet.productUrl).toBe(expectedRetailSources[packet.vendorId]);
      expect(packet.status).toBe("certification-evidence-required");
      expect(packet.canEnableLiveOperation).toBe(false);
      expect(packet.requiredGateIds).toEqual(
        expect.arrayContaining(["vendor-certification", "real-order-kill-switch", "customer-approval"])
      );
      expect(packet.requiredEvidenceArtifacts.length).toBeGreaterThanOrEqual(3);
      expect(packet.requiredProviderEvidence.length).toBeGreaterThanOrEqual(3);
      expect(packet.blockedLiveOperationFields).toEqual(
        expect.arrayContaining(["network request from CustomCard", "provider API payload preparation", "raw payment card data"])
      );
      expect(packet.liveEnablementChecks.join(" ")).toContain(packet.providerPortalUrl);
      if (packet.operation === "place-order") {
        expect(packet.requiredGateIds).toEqual(
          expect.arrayContaining(["payment-certification", "cancellation-recovery", "physical-print-qa"])
        );
      }
    }

    expect(buildRetailPrinterCertificationPackets("walgreens").map((packet) => packet.vendorId)).toEqual([
      "walgreens",
      "walgreens",
      "walgreens"
    ]);
  });
});
