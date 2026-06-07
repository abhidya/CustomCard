import { createServer } from "vite";

const userAgent = "CustomCard coupon research collector/0.1 (+local operator run; no checkout automation)";

const vite = await createServer({
  appType: "custom",
  logLevel: "error",
  server: { middlewareMode: true }
});

try {
  const {
    extractPrinterCouponCodes,
    extractPrinterCouponOffers,
    printerCouponCollectionTargets,
    printerCouponSources
  } = await vite.ssrLoadModule("/src/printerPricing.ts");
  const fmtcApiToken = process.env.FMTC_API_TOKEN?.trim();
  const allowedTargets = printerCouponCollectionTargets.filter(
    (target) => target.sourceProvider === "retailer" && target.readiness === "ready-public-page"
  );
  const providerFeedTargets = [];

  for (const target of printerCouponCollectionTargets.filter((candidate) => candidate.role === "provider-feed")) {
    const baseTarget = {
      id: target.id,
      vendorIds: target.vendorIds,
      collectionMethod: target.collectionMethod,
      readiness: target.readiness,
      url: target.url,
      credentialEnvKeys: target.credentialEnvKeys,
      verificationSignals: target.verificationSignals,
      legalReviewRequired: target.legalReviewRequired,
      fetched: false
    };

    if (!fmtcApiToken) {
      providerFeedTargets.push({
        ...baseTarget,
        provider: "FMTC Deal Feed",
        reason: "Credential-gated provider feed; set FMTC_API_TOKEN only in an approved server/operator environment."
      });
      continue;
    }

    const providerUrl = new URL("https://s3.fmtc.co/api/4.2.0/deals");
    providerUrl.searchParams.set("api_token", fmtcApiToken);
    providerUrl.searchParams.set("format", "json");
    providerUrl.searchParams.set("codesonly", "1");
    providerUrl.searchParams.set("active", "1");
    providerUrl.searchParams.set("country", "US");
    providerUrl.searchParams.set("page_size", "500");

    const response = await fetch(providerUrl, { headers: { "user-agent": userAgent } });
    const providerBody = await response.text();
    const parsed = safeParseJson(providerBody);
    const deals = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.deals) ? parsed.deals : Array.isArray(parsed?.data) ? parsed.data : [];
    const relevantDeals = deals
      .filter((deal) => /walgreens|cvs/i.test(`${deal.merchant_name ?? ""} ${deal.label ?? ""} ${deal.direct_link ?? ""}`))
      .map((deal) => ({
        id: deal.id,
        merchantName: deal.merchant_name,
        label: deal.label,
        code: deal.code,
        status: deal.status,
        startDate: deal.start_date,
        endDate: deal.end_date,
        codeVerifiedAt: deal.code_verified_at,
        linkVerifiedAt: deal.link_verified_at,
        couponCodeOnPage: deal.coupon_code_on_page
      }));

    providerFeedTargets.push({
      ...baseTarget,
      provider: "FMTC Deal Feed",
      fetched: true,
      status: response.status,
      ok: response.ok,
      endpoint: "https://s3.fmtc.co/api/4.2.0/deals",
      requestShape: {
        format: "json",
        codesonly: 1,
        active: 1,
        country: "US",
        page_size: 500
      },
      returnedDealCount: deals.length,
      relevantDealCount: relevantDeals.length,
      relevantDeals,
      tokenRedacted: true,
      reason:
        relevantDeals.length > 0
          ? "Provider-feed coupons are discovery evidence; official retailer source or provider-portal application proof is still required before discounting."
          : "Provider feed returned no Walgreens/CVS code candidates in the fetched page."
    });
  }

  const fetchedTargets = [];
  const sourceOffers = [];

  for (const target of allowedTargets) {
    const response = await fetch(target.url, { headers: { "user-agent": userAgent } });
    const body = await response.text();
    const matchedCodes = extractPrinterCouponCodes(body);
    const matchedVerificationSignals = target.verificationSignals.filter((signal) => body.toLowerCase().includes(signal.toLowerCase()));
    const missingVerificationSignals = target.verificationSignals.filter((signal) => !matchedVerificationSignals.includes(signal));

    fetchedTargets.push({
      id: target.id,
      role: target.role,
      vendorIds: target.vendorIds,
      collectionMethod: target.collectionMethod,
      expectedOfferCodes: target.expectedOfferCodes,
      verificationSignals: target.verificationSignals,
      renderedBrowserReadRequired: target.collectionMethod === "rendered-browser-read",
      legalReviewRequired: target.legalReviewRequired,
      status: response.status,
      ok: response.ok,
      url: target.url,
      matchedCodes,
      matchedExpectedCodes: target.expectedOfferCodes.filter((code) => matchedCodes.includes(code)),
      staticHtmlExpectedCodeVisible: target.expectedOfferCodes.length > 0 && target.expectedOfferCodes.every((code) => matchedCodes.includes(code)),
      matchedVerificationSignals,
      missingVerificationSignals,
      bytes: body.length
    });

    if (!response.ok || target.role !== "coupon-source" || target.collectionMethod !== "server-fetch-html") continue;

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
          portalApplicationEvidenceAttached: Boolean(offer.portalApplicationEvidence),
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
        collectionMethod: target.collectionMethod,
        ok: target.ok,
        expectedCodes: target.expectedOfferCodes.length > 0 ? target.expectedOfferCodes : expectedCodes,
        matchedCodes: target.matchedCodes,
        matchedExpectedCodes: target.matchedExpectedCodes,
        staticHtmlExpectedCodeVisible: target.staticHtmlExpectedCodeVisible,
        staticHtmlCodeVisible: target.staticHtmlExpectedCodeVisible,
        matchedVerificationSignals: target.matchedVerificationSignals,
        missingVerificationSignals: target.missingVerificationSignals,
        renderedBrowserReadRequired: target.renderedBrowserReadRequired,
        renderedBrowserEvidenceStatus: target.renderedBrowserReadRequired
          ? "operator-browser-or-provider-portal-proof-required"
          : "not-required",
        verificationSignals: target.verificationSignals
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
        collectionMethods: [...new Set(fetchedTargets.map((target) => target.collectionMethod))],
        renderedBrowserReadTargetCount: fetchedTargets.filter((target) => target.renderedBrowserReadRequired).length,
        credentialGatedProviderTargetCount: providerFeedTargets.length,
        providerFeedTargets,
        providerPortalApplicationProof: false,
        providerPortalCartTermsEvidenceRequired: true,
        bestPriceDiscountingAllowed: false,
        bestPriceDiscountingRule:
          "A coupon can affect ranking only after structured provider-portal evidence proves the same product, quantity, fulfillment mode, account state, and subtotal math.",
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

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
