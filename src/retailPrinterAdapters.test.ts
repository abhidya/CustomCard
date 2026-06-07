import { describe, expect, it } from "vitest";
import { printerPriceCatalog } from "./printerPricing";
import {
  buildRetailPrinterAdapterPlan,
  createRetailPrinterOperationAdapter,
  getRetailPrinterAdapter,
  getRetailPrinterAdapterForProvider,
  retailPrinterAdapters,
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
      expect(adapter.productUrl).toBe(expectedRetailSources[adapter.vendorId]);
      expect(adapter.realOrdersEnabled).toBe(false);
      expect(adapter.liveQuoteEnabled).toBe(false);
      expect(adapter.imageUploadEnabled).toBe(false);
      expect(adapter.orderPlacementEnabled).toBe(false);
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
      expect(result.operationPacket.packetId).toBe(`fedex-${result.operation}-blocked-operation-packet`);
      expect(result.operationPacket.evidenceChecklist).toEqual(result.requiredEvidence);
      expect(result.operationPacket.operatorSteps.length).toBeGreaterThanOrEqual(4);
      expect(result.operationPacket.safetyChecks.join(" ")).toContain("Do not send a network request from CustomCard.");
      expect(result.operationPacket.sourceBackedFields).toEqual(
        result.operation === "place-order" ? ["quoteEvidenceId"] : expect.arrayContaining(["productSku"])
      );
      expect(result.operationPacket.missingInputFields).toEqual([]);
      expect(result.missingEvidence).toEqual(expect.arrayContaining(result.requiredEvidence));
      expect(result.blockedReason.toLowerCase()).toMatch(/certification|disabled|review-only/);
    }
    expect(price.operation).toBe("fetch-price");
    expect(upload.operation).toBe("upload-image");
    expect(order.operation).toBe("place-order");
    expect(order.missingEvidence).toEqual(expect.arrayContaining(["Vendor certification", "Payment and cancellation recovery proof"]));
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
});
