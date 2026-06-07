# Printer Pricing Research

This file records review-only public price observations for manual fulfillment.
It is not a live quote feed, a checkout integration, or a promise that a store
has stock at checkout time.

Observed on: June 7, 2026.

## Public Observations

| Vendor | Observed product | Public price captured | Source |
| --- | --- | --- | --- |
| Walgreens Photo | 5x7 folded cards, standard cardstock 85lb | $3.49 each from JSON-LD offer for `CommerceProduct_33272`; checkout confirmation required | [Walgreens Photo 5x7 folded upload card](https://photo.walgreens.com/store/design-detail?category=StoreCat_24955&dgId=40e943c647fe44c5867d74bb91e5feca&designId=0c158c44e2f34d9fabc9e1b3ada2eaa6&sku=CommerceProduct_33272&ptype=cards&pcat=design_your_own_56061_1525293477_walgreens_us&scat=&filters=&searchPhrase=&designName=Upload%20Your%20Design&pcatName=Cards&withSku=N&searchPhrase=&dgCatId=design_your_own_56061_1525293477_walgreens_us#/dgview?productCategory=Card%20%26%20Stationery) |
| CVS Photo | 5x7 double-sided cardstock card | $1.99 each with a 20-card minimum in the app contract; category-level pricing observation, not the retail adapter source-link contract | [CVS Photo cards category](https://www.cvs.com/Photo/Cards) |
| CVS Photo | 5x7 photo card | $1.09 each with a 20-card minimum in the app contract; category-level pricing observation, not the retail adapter source-link contract | [CVS Photo cards category](https://www.cvs.com/Photo/Cards) |
| CVS Photo | Same Day 5x7 Premium card | $2.49 each with a 20-card minimum in the app contract; category-level pricing observation, not the retail adapter source-link contract | [CVS Photo cards category](https://www.cvs.com/Photo/Cards) |
| CVS Photo | Folded greeting card, 5x7 | $8.98 each from JSON-LD offer for `CommerceProduct_26126`; quantity, pickup, tax, and availability require checkout confirmation | [CVS Photo 5x7 folded greeting card design detail](https://www.cvs.com/photo/design-detail?category=StoreCat_22821&dgId=02d8d8bfa1fd46bb8234635847ec8dfd&designId=1f0682a2d34546bf86cbb799c3811d4e&sku=CommerceProduct_26126&ptype=cards&pcat=erin_condren_3740_1725983028_cvs_us&designName=Erin%20Condren&dgCatId=erin_condren_3740_1725983028_cvs_us&sortCriteria=toppicks#/dgview?productCategory=Card%20%26%20Stationery) |
| FedEx Office | Quick 5x7 single-sided greeting card | $13.99 for 10, represented as a package-start observation; quick page now documents upload-file formats and same-day/24-hour pickup, while live checkout confirms current price | [FedEx Office quick greeting and holiday cards](https://www.office.fedex.com/default/greeting-cards-quick.html) |
| FedEx Office | Quick 5x7 double-sided greeting card | $17.99 for 10, represented as a package-start observation; quick page now documents upload-file formats and same-day/24-hour pickup, while live checkout confirms current price | [FedEx Office quick greeting and holiday cards](https://www.office.fedex.com/default/greeting-cards-quick.html) |
| FedEx Office | Premium 5x7 folded greeting card | $22.99 for 20 folded, represented as a package-start observation; quick page now documents upload-file formats and same-day/24-hour pickup, while live checkout confirms current price | [FedEx Office quick greeting and holiday cards](https://www.office.fedex.com/default/greeting-cards-quick.html) |
| Walmart Photo | 5x7 folded card upload your design | $0.56 each for one card; the page also lists larger quantity tiers such as 60 for $33.60 | [Walmart Photo 5x7 folded card upload your design](https://photos3.walmart.com/category/725-5x7-photo-upload-cards?product=361-5x7-folded-card-blank-envelope&theme=wmcards-WMT.themepack%3Awmt_custom_5x7.card&design_code=standard.custom&selected_delivery_options=2) |
| Staples Print | 5x7 folded card bundle | $49.99 for 25, represented as a package-start observation with coupon/window confirmation required | [Staples folded cards](https://www.staples.com/services/printing/cards-invitations-announcements/folded-cards/) |
| Staples Print | 5x7 same-day card bundle | $49.99 pre-tax base for 25; coupon candidates require provider-portal application proof before best-price ranking | [Staples same-day cards](https://www.staples.com/services/printing/cards-invitations-announcements/same-day-cards/) |
| Office Depot | 7x5 custom photo holiday card bundle | $77.60 for 25, represented as a package-start observation | [Office Depot custom photo holiday cards](https://www.officedepot.com/a/products/7395368/Custom-Photo-Holiday-Cards-With-Envelopes/) |

## Retail Adapter Source Links

These links are owned by `retailPrinterProductLinks` in
`src/retailPrinterContracts.ts`. The provider catalog derives the four live
printer `docsUrl` values through `getRetailPrinterProductLinkByProvider()`, and
`src/retailPrinterAdapters.ts` consumes the same contract module when building
blocked operation packets. That keeps provider identity, exact product URLs,
provider-specific operation policy, operation blueprints, certification packets,
provider operation entrypoints, admin catalog links, and docs from drifting to
generic category pages or placeholder links.

`docs/retail-printer-entrypoint-evidence.json` records the latest operator
public-page read of those four exact provider product URLs. Refresh it with
`CUSTOMCARD_RETAIL_ENTRYPOINT_EVIDENCE_OUT=docs/retail-printer-entrypoint-evidence.json npm run retail:entrypoints:collect`.
The artifact proves only source-link freshness, exact URL-token preservation,
and no checkout/upload/order action. It is not quote, upload, cart, payment, or
order proof.

| Vendor | Product link | Price collection entrypoint | Upload preview entrypoint | Final cart review entrypoint |
| --- | --- | --- | --- | --- |
| Walmart Photo | [5x7 folded card upload your design](https://photos3.walmart.com/category/725-5x7-photo-upload-cards?product=361-5x7-folded-card-blank-envelope&theme=wmcards-WMT.themepack%3Awmt_custom_5x7.card&design_code=standard.custom&selected_delivery_options=2) | `public-product-price-review`; coupon mode `apply-during-price-collection`; blocked no-network operation using review-only public observation | `provider-project-preview-review`; coupon mode `preserve-price-collection-coupon-state`; blocked until certified Walmart Photo upload contract or reviewed browser-session automation exists | `provider-cart-final-review`; coupon mode `final-cart-coupon-recheck`; blocked until vendor certification, payment, cancellation recovery, and kill-switch evidence exist |
| FedEx Office | [Quick greeting and holiday cards](https://www.office.fedex.com/default/greeting-cards-quick.html) | `public-product-price-review`; coupon mode `apply-during-price-collection`; blocked no-network operation while live checkout confirms final current price | `provider-project-preview-review`; coupon mode `preserve-price-collection-coupon-state`; blocked until FedEx upload-file contract, file acceptance, and crop/fold preview evidence exist | `provider-cart-final-review`; coupon mode `final-cart-coupon-recheck`; blocked until vendor certification, payment, cancellation recovery, and kill-switch evidence exist |
| CVS Photo | [5x7 folded greeting card design detail](https://www.cvs.com/photo/design-detail?category=StoreCat_22821&dgId=02d8d8bfa1fd46bb8234635847ec8dfd&designId=1f0682a2d34546bf86cbb799c3811d4e&sku=CommerceProduct_26126&ptype=cards&pcat=erin_condren_3740_1725983028_cvs_us&designName=Erin%20Condren&dgCatId=erin_condren_3740_1725983028_cvs_us&sortCriteria=toppicks#/dgview?productCategory=Card%20%26%20Stationery) | `public-product-price-review`; coupon mode `apply-during-price-collection`; blocked no-network operation using review-only public observation | `provider-project-preview-review`; coupon mode `preserve-price-collection-coupon-state`; blocked until CVS Photo/Snapfish project creation and preview evidence exists | `provider-cart-final-review`; coupon mode `final-cart-coupon-recheck`; blocked until vendor certification, payment, cancellation recovery, and kill-switch evidence exist |
| Walgreens Photo | [5x7 folded upload card](https://photo.walgreens.com/store/design-detail?category=StoreCat_24955&dgId=40e943c647fe44c5867d74bb91e5feca&designId=0c158c44e2f34d9fabc9e1b3ada2eaa6&sku=CommerceProduct_33272&ptype=cards&pcat=design_your_own_56061_1525293477_walgreens_us&scat=&filters=&searchPhrase=&designName=Upload%20Your%20Design&pcatName=Cards&withSku=N&searchPhrase=&dgCatId=design_your_own_56061_1525293477_walgreens_us#/dgview?productCategory=Card%20%26%20Stationery) | `public-product-price-review`; coupon mode `apply-during-price-collection`; blocked no-network operation using review-only public observation | `provider-project-preview-review`; coupon mode `preserve-price-collection-coupon-state`; blocked until Walgreens Photo/Snapfish project creation and preview evidence exists | `provider-cart-final-review`; coupon mode `final-cart-coupon-recheck`; blocked until vendor certification, payment, cancellation recovery, and kill-switch evidence exist |

Each retail adapter now persists source links for `product`, `fetch-price`,
`upload-image`, and `place-order`. Each operation also carries a blocked
request blueprint that names the future certified transport, required request
fields, response evidence, forbidden data fields, and success criteria. The
`createRetailPrinterOperationAdapter` Interface exposes callable no-network
methods for price, upload, and order attempts. Each method returns an
`operationPacket` with the persisted product link, pricing observation,
provider operation entrypoint, public page evidence, evidence checklist,
operator steps, safety checks, source-backed fields, and missing input fields.
The packet now also includes an `operationPolicy` and `policyViolations` list
so provider-specific rules stay inside the Adapter Module instead of leaking
into customer or admin callers. Those policies encode minimum quantity,
quantity increment, supported pickup/shipping modes, same-cart checkout
discount proof, accepted print artifacts, provider account mode, required
approval fields, and recovery evidence. The provider entrypoint encodes the
exact operation evidence mode, coupon application mode, source title, page
signals, and required operator proof for price collection, upload preview, and
final cart review. The packet is an operator evidence checklist, not a provider
API
payload: every result keeps `requestPrepared: false`, `networkAttempted:
false`, and the operation status `blocked` until certification evidence exists.
Raw relationship memories, raw payment card data, and unapproved recipient PII
are forbidden from every operation.

Each operation packet also carries a `certificationPacket` for the future
certification review. It records the exact provider portal URL, product SKU,
pricing observation, required certification gates, provider evidence fields,
blocked live-operation fields, and live-enablement checks while keeping
`canEnableLiveOperation: false`. `buildRetailPrinterCertificationPackets()`
returns the 12 provider-operation certification packets for Walmart, FedEx, CVS,
and Walgreens so a future certified transport can graduate behind the same
Adapter Interface without changing customer/admin call sites.

`validateRetailPrinterProductUrl()` rejects generic product/category pages and
placeholder-like URLs (`example`, `localhost`, `placeholder`, `dummy`, `todo`,
or `mock`). The Walmart, FedEx, CVS, and Walgreens adapters must keep the exact
user-supplied product URL plus provider-specific tokens such as SKU, design ID,
product code, or delivery options. This keeps the Adapter Interface honest:
`fetch-price`, `upload-image`, and `place-order` packets point at the real
provider entrypoint even while runtime execution remains no-network and
certification-blocked.

## Collection Contract

- `printerPricingCollectionRules` defines the official public page or product
  page allowed for each observation, expected extraction hints, a 30-day maximum
  freshness window, and fields that must stay blocked.
- `buildPrinterPricingRefreshReport` reports source count, fresh/stale sources,
  future-dated observations, and whether the comparison is safe to show.
- `buildPrinterCouponCollectionPlan` is the pricing Module Interface used by
  retail Adapter packets. It bundles credentialed provider-feed targets,
  official retailer coupon targets, rendered print-entrypoint targets, active
  candidate codes, provider-portal application packets, and the rule that no
  discount can affect best available price before same-cart portal evidence is
  attached. Customer and admin clients consume the packet; they do not choose
  coupon sources or compute portal proof themselves.
- `buildRetailPrinterOperationStartPackets` exposes the same adapter/coupon
  contract through the server-owned
  `/api/retail-printers/operations/start` route and customer bootstrap. The
  12 packets cover Walmart/FedEx/CVS/Walgreens price, upload, and order starts,
  return the exact provider portal URL for manual review, and keep
  `providerRequestUrl`, request preparation, upload, payment, and live order
  execution disabled. Clients consume the packet; they do not construct
  provider portal requests or rank coupon discounts.
- `npm run printer:pricing:doctor` verifies the observed official-source
  catalog, no-network collection rules, manual-confirmation posture, UI/API
  exposure, and CI wiring.
- `npm run printer:coupons:collect` is an operator-run collector for the
  explicit coupon targets in `src/printerPricing.ts`. It fetches public
  retailer coupon pages, can open the exact Walgreens/CVS print links with a
  local headless browser, optionally polls the credential-gated FMTC Deal Feed
  when `FMTC_API_TOKEN` is present, optionally polls the credential-gated
  Rakuten Advertising Coupon Feed API when `RAKUTEN_ADVERTISING_API_TOKEN` is
  present, and still returns
  `bestPriceDiscountingAllowed: false` until checkout proves a code applied to
  the same cart. The collector does not log in, upload files, submit payment,
  place an order, print provider credentials, or claim live checkout automation.
  Provider-feed request builders and parsers live in
  `src/printerCouponProviderFeeds.ts` so the credentialed FMTC/Rakuten paths are
  tested without requiring live credentials.
- Set `CUSTOMCARD_COUPON_BROWSER_EVIDENCE=docs/printer-coupon-browser-evidence.json`
  when the operator wants the collector to attach the read-only browser proof
  from the exact print links. The artifact records no login, upload, cart,
  payment, or order action.
- Set `CUSTOMCARD_COUPON_PORTAL_EVIDENCE=/absolute/path/to/portal-evidence.json`
  only after an operator has opened the provider portal, selected the same
  product, quantity, fulfillment mode, and account state, applied the coupon,
  recorded pre-coupon subtotal, discount, post-coupon subtotal, and stopped
  before upload, payment, or order placement. The collector imports that
  artifact through `src/printerCouponPortalEvidence.ts`; accepted records attach
  `PrinterCouponPortalApplicationEvidence` to matching offers, while rejected
  records are reported without changing prices.
- Set `CUSTOMCARD_COUPON_RENDER_PRINT_LINKS=1` to have the collector launch
  local Chrome/Chromium and read the exact print entrypoints. Add
  `CUSTOMCARD_COUPON_RENDER_EVIDENCE_OUT=docs/printer-coupon-browser-evidence.json`
  to refresh the persisted evidence artifact from that operator run.
- The June 7, 2026 22:07 UTC operator render opened the exact Walgreens and CVS 5x7 print
  entrypoints without login, upload, cart, payment, or order action. CVS exposed
  `JUNESW` in visible rendered text alongside the 5x7 folded-card product
  signals. Walgreens exposed `CRISPCARD` in rendered page HTML alongside
  `CommerceProduct_33272` and `$3.49`, but not as visible text; that remains
  `operator-browser-html-signal-attached-visible-proof-still-required`, not full
  rendered proof.
- Coupon signal matching normalizes retailer typography such as registered and
  trademark marks before comparing evidence, so live text like `CVS Health(R)
  app` can satisfy the canonical `CVS Health app` verification signal without
  weakening the provider-portal proof requirement.
- Scraped source offers now include `sourceEvidence` with source label, source
  URL, source authority, source type, observed timestamp, raw evidence snippet,
  deterministic `rawSnippetHash`, and matched source terms. The collector also
  emits `ignoredCouponSignals` for codes that are visible on a page but are not
  paired to supported terms, are expired, or belong to another product scope, so
  volatile CVS page content cannot silently become a best-price coupon.
- Browser evidence parsing, validation, and status classification live in
  `src/printerCouponBrowserEvidence.ts`. The collector imports that Module so
  exact print-link proof, HTML-only coupon signals, invalid no-upload/no-order
  evidence, and provider-portal discount proof stay separated at one tested
  Adapter seam. Rendered print-link proof is valid only when the expected coupon
  code is visible, every registered product/price/SKU verification signal is
  matched, and the artifact proves no checkout, upload, payment, or order
  action.
- The customer bootstrap exposes only a safe pricing preview: selected vendor,
  known public price count, source count, maximum source age policy, and
  `liveQuote: false`.
- Blocked fields remain tax, coupon portal proof, local stock, pickup windows,
  checkout availability, payments, and live order placement.

## Coupon Treatment

Coupons are part of pricing collection. The safest production shape is a
licensed coupon provider feed for discovery, official retailer coupon pages for
Walgreens/CVS promo terms, exact rendered print links for product/code/price
signals, and finally provider-portal application while collecting pricing.
Candidate codes must still be applied in the provider portal/cart before ranking
a best available price. Coupon discounts are applied only after provider-portal
evidence proves the code worked for the same product, quantity, fulfillment
mode, and account state.

The proper provider-feed candidates remain FMTC and Rakuten for discovery, but
they do not prove final cart price by themselves. Walgreens also publishes an
official Native Photo Prints coupon-validation API path at
`https://services.walgreens.com/api/photo/order/coupon/v3`; the repo models
that as `walgreens-native-photo-coupon-validation`, a credential-gated
server-side future validation provider. It requires `apiKey`, `affId`,
`couponCode`, `act=getdiscount`, app/device metadata, and exact
`productDetails[].productId` plus `productDetails[].qty`, and returns
`orderTotalPrice`/`orderDiscountPrice` evidence. That is stronger than scraping
for Walgreens once partner credentials and certification exist, but it is still
blocked from runtime and cannot submit uploads, payment, or orders.

The Coupon Bureau Universal Coupons network is a proper coupon-provider
infrastructure lane for manufacturer Universal Coupons, but it is separate from
Walgreens/CVS photo promo codes. Model it as a future generic coupon provider
only when the product being priced is actually eligible for Universal Coupons;
do not use it to infer retailer photo-card promo discounts.

Authenticated coupon centers and loyalty clip-to-card flows stay out of the
collector. Public photo promo pages may be read as ephemeral metadata, but
account-gated CVS ExtraCare or Walgreens loyalty coupons, printable barcode
summaries, and automated clipping require a documented retailer API, explicit
user action, and legal review before entering the pricing Module.

Coupon collection targets distinguish static coupon sources, print entrypoints,
and provider feeds. Official deal/coupon pages use `server-fetch-html`. The
exact print/product links use `rendered-browser-read` because customer-visible
banners and product widgets may be hydrated client-side, even though the current
Walgreens/CVS print-link HTML already includes coupon and JSON-LD price signals.
Retailer scraping and provider-feed usage both keep `legalReviewRequired: true`.
Print-entrypoint targets now also distinguish `staticHtmlSignalAllowed` from
`browserRenderProofRequired` so the collector cannot mistake scraped HTML for a
visible browser proof.

`docs/printer-coupon-browser-evidence.json` records the June 7, 2026
22:07 UTC `operator-chromium-rendered-read` check against the exact print
links. A matching visible browser read opened both print links after the
collector run. CVS rendered the `JUNESW` code visibly on the 5x7 folded card
page, so the browser-evidence Module reports
`operator-browser-proof-attached` when that evidence is attached or generated.
Walgreens rendered the 5x7 product and $3.49 price visibly, while `CRISPCARD`
was present in page HTML but not visible text; the Module reports
`operator-browser-html-signal-attached-visible-proof-still-required`. The raw
CVS public page can drift between offers and may contain unrelated promo-code
signals such as `SAMEDAY65`, a navigation/category heading such as
`GRADUATION`, or expired/product-scoped terms; those are reported as ignored
signals unless the code appears in paired promo-code terms with product scope
and dates.
Neither rendered status is provider-portal cart evidence, and neither can
discount a best-price ranking.

That proof is modeled as structured `PrinterCouponPortalApplicationEvidence`:
provider portal URL, source price observation ID, pre-coupon subtotal, discount,
post-coupon subtotal, same-cart terms, `sameCartTermsProven: true`, and
`noOrderPlaced: true`. A `provider-portal-applied` status by itself is not
enough to discount or rank; `hasMatchingProviderPortalCouponEvidence` must match
the evidence to the public price observation and subtotal math.

`buildPrinterCouponCollectionPlan()` now wraps the provider-feed targets,
retailer coupon targets, exact print-entrypoint targets, candidate source-listed
codes, and `buildPrinterCouponPortalApplicationPackets()` output into one
operator plan per vendor. The current Walgreens plan points to FMTC, Rakuten,
the Walgreens official deals page, the Walgreens exact print link, `CRISPCARD`,
and the `walgreens-crispcard-cards-2026-06-13-portal-application-packet`. The
current CVS plan points to FMTC, Rakuten, the CVS official coupons page, the
CVS exact print link, `JUNESW`, and the
`cvs-junesw-sitewide-photo-2026-06-20-portal-application-packet`. Vendors with
no registered coupon targets return an empty no-network plan that explicitly
blocks invented third-party coupon candidates.

`buildPrinterCouponPortalApplicationPackets()` emits the operator packet that
should be used while collecting pricing. The current coupon set produces 2
packets and 5 same-cart application targets: one Walgreens target for the
single-card folded-card observation and four CVS targets for the current CVS
5x7 card observations. Each packet carries portal URLs, source observation IDs,
expected pre-coupon subtotal, expected discount, expected post-coupon subtotal,
cart terms, required evidence, operator steps, and no-order blocked fields. The
operator can use those packets to apply coupons in the provider portal during
pricing collection, but the packet still reports `canAffectBestPrice: false`
until matching `PrinterCouponPortalApplicationEvidence` is attached. The retail
`fetch-price` Adapter packet includes this collection plan so clients can show
the correct operator workflow without owning coupon-source logic. The operator
collector also emits `activeAtCollection`,
`bestPriceEligibleAtCollection`, and `bestPriceBlocker` for each scraped source
offer so source discovery and best-price eligibility cannot be confused.

Portal application evidence uses this artifact shape:

```json
{
  "service": "customcard-printer-coupon-portal-evidence",
  "generatedAtIso": "2026-06-07T12:15:00.000Z",
  "operatorAction": "Opened the provider portal, applied the coupon, recorded subtotal evidence, and stopped before upload, payment, or order placement.",
  "blockedFields": ["payment submission", "live order placement", "card upload", "tax finalization", "pickup slot reservation"],
  "records": [
    {
      "offerId": "walgreens-crispcard-cards-2026-06-13",
      "code": "CRISPCARD",
      "evidence": {
        "observedAtIso": "2026-06-07T12:15:00.000Z",
        "portalUrl": "https://photo.walgreens.com/store/cart",
        "providerPortal": true,
        "sourcePriceObservationId": "walgreens-5x7-folded-card",
        "subtotalBeforeCouponCents": 349,
        "discountCents": 209,
        "subtotalAfterCouponCents": 140,
        "cartTerms": {
          "vendorId": "walgreens",
          "productKind": "folded-card",
          "size": "5x7",
          "pricedQuantity": 1,
          "fulfillmentMode": "pickup",
          "accountState": "logged-in"
        },
        "sameCartTermsProven": true,
        "noOrderPlaced": true,
        "blockedFields": ["payment submission", "live order placement", "tax", "pickup window"]
      }
    }
  ]
}
```

| Vendor | Coupon source | Observed card offer | Runtime treatment |
| --- | --- | --- | --- |
| Walgreens Photo | [Walgreens Photo deals](https://photo.walgreens.com/store/deals?tab=photo_downsplash_top) plus the [5x7 folded card design-detail print link](https://photo.walgreens.com/store/design-detail?category=StoreCat_24955&dgId=40e943c647fe44c5867d74bb91e5feca&designId=0c158c44e2f34d9fabc9e1b3ada2eaa6&sku=CommerceProduct_33272&ptype=cards&pcat=design_your_own_56061_1525293477_walgreens_us&scat=&filters=&searchPhrase=&designName=Upload%20Your%20Design&pcatName=Cards&withSku=N&searchPhrase=&dgCatId=design_your_own_56061_1525293477_walgreens_us#/dgview?productCategory=Card%20%26%20Stationery) | `CRISPCARD`, 60% off all photo cards and premium stationery, listed with June 13, 2026 expiration; the print link contains the expected code, `CommerceProduct_33272`, and the $3.49 public price signal | Stored as active source-listed evidence on June 7, 2026; browser artifact confirms product/price visible and code in page HTML, but visible code proof is still required before treating the print link as visible-code proof |
| CVS Photo | [CVS Photo coupons](https://www.cvs.com/photo/cvs-photo-coupons?cid=cvs-home-s5-shop-photo) plus the [5x7 folded greeting card design-detail print link](https://www.cvs.com/photo/design-detail?category=StoreCat_22821&dgId=02d8d8bfa1fd46bb8234635847ec8dfd&designId=1f0682a2d34546bf86cbb799c3811d4e&sku=CommerceProduct_26126&ptype=cards&pcat=erin_condren_3740_1725983028_cvs_us&designName=Erin%20Condren&dgCatId=erin_condren_3740_1725983028_cvs_us&sortCriteria=toppicks#/dgview?productCategory=Card%20%26%20Stationery) | `JUNESW`, 50% off sitewide photo products, listed with June 20, 2026 expiration; the print link contains the expected code, `CommerceProduct_26126`, and the $8.98 JSON-LD public price signal | Stored as active source-listed evidence on June 7, 2026; browser artifact confirms visible code/product/price proof, but discounting still requires provider-portal checkout evidence |

| Provider-feed target | Current treatment |
| --- | --- |
| [FMTC Deal Feed](https://docs.fmtc.co/kb/deals-4-2-0) | Recommended credential-gated provider candidate for coupon discovery and affiliate metadata. It is represented as `fmtc-deal-feed` with `FMTC_API_TOKEN`, `provider-api-feed`, and verification signals for status plus code/link verification timestamps; provider-fed coupons remain lower-confidence than official retailer page or checkout evidence. When the token is present, the operator collector requests JSON active code deals through the tested provider-feed seam and redacts the token from output. |
| [Rakuten Advertising Coupon Feed API](https://pubhelp.rakutenadvertising.com/hc/en-us/articles/5949828511757-Coupon-Feed-API) | Credential-gated publisher coupon-feed candidate. It is represented as `rakuten-coupon-feed` with `RAKUTEN_ADVERTISING_API_TOKEN`, `provider-api-feed`, and verification signals for coupon code, promotional link, advertiser, offer start date, and offer end date. The tested provider-feed seam requests XML coupon pages with bearer authorization, redacts the token from output, and keeps provider-fed coupons as discovery evidence until official retailer or provider-portal evidence confirms applicability. |

| Official coupon-validation provider | Current treatment |
| --- | --- |
| [Walgreens Native Photo Prints API](https://developer.walgreens.com/sites/default/files/v3_Native_PhotoPrintsAPI.html) | Future certified server-side validation path for Walgreens only. It is represented as `walgreens-native-photo-coupon-validation`, requires `WALGREENS_API_KEY` and `WALGREENS_AFFILIATE_ID`, and records the `coupon/v3` request/response fields needed to prove an exact `productDetails[]` discount. It is not a scraping target, is not wired to client code, and remains blocked until partner/API certification exists. |

The handoff UI and API bootstrap show coupon-source counts and portal-proof
status. The customer print panel also shows the active source-listed code for
the selected print shop so the customer or operator can try it during the
retailer checkout step. It still shows active source-listed offers separately
from portal-applied offers and must not show a discounted total as best
available until the vendor checkout confirms the discount on the same product,
quantity, store, pickup or shipping path, and customer account state. This is
an evidence contract only; the repo still does not automate a live checkout or
place orders.

## Product Boundary

- `src/printerPricing.ts` stores these as public observations with source URLs,
  observation dates, minimum quantities, and manual-confirmation flags.
- `public-printer-pricing-research` is a ready-local adapter in
  `src/providerCatalog.ts` and returns a local comparison from
  `src/providerRuntime.ts`.
- The Handoff UI shows the selected vendor's observed price, ranked public
  options, and source freshness, but it always states that checkout confirmation
  is required.
- `liveQuote` is always `false`; real quotes, taxes, coupon portal application,
  stock, pickup windows, payments, and orders remain blocked until vendor
  sandbox/live API contracts and physical print certification exist.
