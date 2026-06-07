import { describe, expect, it } from "vitest";
import { printerPriceCatalog } from "./printerPricing";
import {
  buildRetailPrinterAdapterPlan,
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
        preparesRequest: false
      })
    });
    expect(plan.operations).toHaveLength(3);
    expect(getRetailPrinterAdapter("cvs").productSku).toBe("CommerceProduct_26126");
    expect(getRetailPrinterAdapterForProvider("walmart-live-print")?.productUrl).toBe(expectedRetailSources.walmart);
  });
});
