import { createServer } from "vite";

const userAgent = "CustomCard coupon research collector/0.1 (+local operator run; no checkout automation)";

const vite = await createServer({
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true }
});

try {
  const {
    extractPrinterCouponOffers,
    printerCouponCollectionTargets,
    printerCouponSources
  } = await vite.ssrLoadModule("/src/printerPricing.ts");
  const allowedTargets = printerCouponCollectionTargets.filter(
    (target) => target.sourceProvider === "retailer" && target.readiness === "ready-public-page"
  );
  const fetchedTargets = [];
  const sourceOffers = [];

  for (const target of allowedTargets) {
    const response = await fetch(target.url, { headers: { "user-agent": userAgent } });
    const body = await response.text();
    const matchedCodes = [...new Set([...body.matchAll(/(?:Coupon code|Promo Code|Promo code):\s*([A-Z0-9]+)/g)].map((match) => match[1]))];

    fetchedTargets.push({
      id: target.id,
      role: target.role,
      vendorIds: target.vendorIds,
      status: response.status,
      ok: response.ok,
      url: target.url,
      matchedCodes,
      bytes: body.length
    });

    if (!response.ok || target.role !== "coupon-source") continue;

    for (const vendorId of target.vendorIds) {
      const source = vendorId === "walgreens" ? printerCouponSources.walgreensPhotoDeals : printerCouponSources.cvsPhotoCoupons;
      const extraction = extractPrinterCouponOffers({
        vendorId,
        source,
        documentText: body,
        observedAtIso: new Date().toISOString()
      });
      sourceOffers.push(
        ...extraction.offers.map((offer) => ({
          id: offer.id,
          vendorId: offer.vendorId,
          code: offer.code,
          label: offer.label,
          discountPercent: offer.discountPercent,
          startsAtIso: offer.startsAtIso,
          endsAtIso: offer.endsAtIso,
          evidenceStatus: offer.evidenceStatus,
          sourceUrl: offer.source.url,
          requiresLoggedInAccount: offer.requiresLoggedInAccount
        }))
      );
    }
  }

  const codesByVendor = new Map(sourceOffers.map((offer) => [offer.vendorId, offer.code]));
  const printEntrypointChecks = fetchedTargets
    .filter((target) => target.role === "print-entrypoint")
    .map((target) => {
      const expectedCodes = target.vendorIds.map((vendorId) => codesByVendor.get(vendorId)).filter(Boolean);
      return {
        id: target.id,
        vendorIds: target.vendorIds,
        ok: target.ok,
        expectedCodes,
        matchedCodes: target.matchedCodes,
        sameCodeVisible: expectedCodes.some((code) => target.matchedCodes.includes(code))
      };
    });

  console.log(
    JSON.stringify(
      {
        service: "customcard-printer-coupon-collector",
        generatedAtIso: new Date().toISOString(),
        networkRuntime: "operator-script-only",
        fetchedTargetCount: fetchedTargets.length,
        couponSourceOfferCount: sourceOffers.length,
        providerPortalApplicationProof: false,
        bestPriceDiscountingAllowed: false,
        fetchedTargets,
        sourceOffers,
        printEntrypointChecks,
        blockedFields: ["checkout subtotal", "coupon application proof", "tax", "pickup window", "real order placement"]
      },
      null,
      2
    )
  );
} finally {
  await vite.close();
}
