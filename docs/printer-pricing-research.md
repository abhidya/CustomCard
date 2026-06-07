# Printer Pricing Research

This file records review-only public price observations for manual fulfillment.
It is not a live quote feed, a checkout integration, or a promise that a store
has stock at checkout time.

Observed on: June 7, 2026.

## Public Observations

| Vendor | Observed product | Public price captured | Source |
| --- | --- | --- | --- |
| Walgreens Photo | 5x7 folded cards, standard cardstock 85lb | $3.49 each from JSON-LD offer for `CommerceProduct_33272`; checkout confirmation required | [Walgreens Photo 5x7 folded upload card](https://photo.walgreens.com/store/design-detail?category=StoreCat_24955&dgId=40e943c647fe44c5867d74bb91e5feca&designId=0c158c44e2f34d9fabc9e1b3ada2eaa6&sku=CommerceProduct_33272&ptype=cards&pcat=design_your_own_56061_1525293477_walgreens_us&scat=&filters=&searchPhrase=&designName=Upload%20Your%20Design&pcatName=Cards&withSku=N&searchPhrase=&dgCatId=design_your_own_56061_1525293477_walgreens_us#/dgview?productCategory=Card%20%26%20Stationery) |
| CVS Photo | 5x7 double-sided cardstock card | $1.99 each with a 20-card minimum in the app contract | [CVS Photo cards](https://www.cvs.com/Photo/Cards) |
| CVS Photo | 5x7 photo card | $1.09 each with a 20-card minimum in the app contract | [CVS Photo cards](https://www.cvs.com/Photo/Cards) |
| CVS Photo | Same Day 5x7 Premium card | $2.49 each with a 20-card minimum in the app contract | [CVS Photo cards](https://www.cvs.com/Photo/Cards) |
| CVS Photo | Folded greeting card, 5x7 | $8.98 each from JSON-LD offer for `CommerceProduct_26126`; quantity, pickup, tax, and availability require checkout confirmation | [CVS Photo 5x7 folded greeting card design detail](https://www.cvs.com/photo/design-detail?category=StoreCat_22821&dgId=02d8d8bfa1fd46bb8234635847ec8dfd&designId=1f0682a2d34546bf86cbb799c3811d4e&sku=CommerceProduct_26126&ptype=cards&pcat=erin_condren_3740_1725983028_cvs_us&designName=Erin%20Condren&dgCatId=erin_condren_3740_1725983028_cvs_us&sortCriteria=toppicks#/dgview?productCategory=Card%20%26%20Stationery) |
| FedEx Office | Quick 5x7 single-sided greeting card | $13.99 for 10, represented as a package-start observation; quick page now documents upload-file formats and same-day/24-hour pickup, while live checkout confirms current price | [FedEx Office quick greeting and holiday cards](https://www.office.fedex.com/default/greeting-cards-quick.html) |
| FedEx Office | Quick 5x7 double-sided greeting card | $17.99 for 10, represented as a package-start observation; quick page now documents upload-file formats and same-day/24-hour pickup, while live checkout confirms current price | [FedEx Office quick greeting and holiday cards](https://www.office.fedex.com/default/greeting-cards-quick.html) |
| FedEx Office | Premium 5x7 folded greeting card | $22.99 for 20 folded, represented as a package-start observation; quick page now documents upload-file formats and same-day/24-hour pickup, while live checkout confirms current price | [FedEx Office quick greeting and holiday cards](https://www.office.fedex.com/default/greeting-cards-quick.html) |
| Walmart Photo | 5x7 folded card upload your design | $0.56 each for one card; the page also lists larger quantity tiers such as 60 for $33.60 | [Walmart Photo 5x7 folded card upload your design](https://photos3.walmart.com/category/725-5x7-photo-upload-cards?product=361-5x7-folded-card-blank-envelope&theme=wmcards-WMT.themepack%3Awmt_custom_5x7.card&design_code=standard.custom&selected_delivery_options=2) |
| Staples Print | 5x7 folded card bundle | $49.99 for 25, represented as a package-start observation with coupon/window confirmation required | [Staples folded cards](https://www.staples.com/services/printing/cards-invitations-announcements/folded-cards/) |
| Staples Print | 5x7 same-day card bundle | $49.99 pre-tax base for 25; coupon candidates require provider-portal application proof before best-price ranking | [Staples same-day cards](https://www.staples.com/services/printing/cards-invitations-announcements/same-day-cards/) |
| Office Depot | 7x5 custom photo holiday card bundle | $77.60 for 25, represented as a package-start observation | [Office Depot custom photo holiday cards](https://www.officedepot.com/a/products/7395368/Custom-Photo-Holiday-Cards-With-Envelopes/) |

## Retail Adapter Source Links

These links are persisted in `src/retailPrinterAdapters.ts`, `src/providerCatalog.ts`,
and `src/printerPricing.ts`.

| Vendor | Product link | Price fetch | Image upload | Order placement |
| --- | --- | --- | --- | --- |
| Walmart Photo | [5x7 folded card upload your design](https://photos3.walmart.com/category/725-5x7-photo-upload-cards?product=361-5x7-folded-card-blank-envelope&theme=wmcards-WMT.themepack%3Awmt_custom_5x7.card&design_code=standard.custom&selected_delivery_options=2) | Blocked no-network operation using review-only public observation | Blocked until certified Walmart Photo upload contract or reviewed browser-session automation exists | Blocked until vendor certification, payment, cancellation recovery, and kill-switch evidence exist |
| FedEx Office | [Quick greeting and holiday cards](https://www.office.fedex.com/default/greeting-cards-quick.html) | Blocked no-network operation; live checkout confirms final current price | Blocked until FedEx upload-file contract, file acceptance, and crop/fold preview evidence exist | Blocked until vendor certification, payment, cancellation recovery, and kill-switch evidence exist |
| CVS Photo | [5x7 folded greeting card design detail](https://www.cvs.com/photo/design-detail?category=StoreCat_22821&dgId=02d8d8bfa1fd46bb8234635847ec8dfd&designId=1f0682a2d34546bf86cbb799c3811d4e&sku=CommerceProduct_26126&ptype=cards&pcat=erin_condren_3740_1725983028_cvs_us&designName=Erin%20Condren&dgCatId=erin_condren_3740_1725983028_cvs_us&sortCriteria=toppicks#/dgview?productCategory=Card%20%26%20Stationery) | Blocked no-network operation using review-only public observation | Blocked until CVS Photo/Snapfish project creation and preview evidence exist | Blocked until vendor certification, payment, cancellation recovery, and kill-switch evidence exist |
| Walgreens Photo | [5x7 folded upload card](https://photo.walgreens.com/store/design-detail?category=StoreCat_24955&dgId=40e943c647fe44c5867d74bb91e5feca&designId=0c158c44e2f34d9fabc9e1b3ada2eaa6&sku=CommerceProduct_33272&ptype=cards&pcat=design_your_own_56061_1525293477_walgreens_us&scat=&filters=&searchPhrase=&designName=Upload%20Your%20Design&pcatName=Cards&withSku=N&searchPhrase=&dgCatId=design_your_own_56061_1525293477_walgreens_us#/dgview?productCategory=Card%20%26%20Stationery) | Blocked no-network operation using review-only public observation | Blocked until Walgreens Photo/Snapfish project creation and preview evidence exist | Blocked until vendor certification, payment, cancellation recovery, and kill-switch evidence exist |

## Collection Contract

- `printerPricingCollectionRules` defines the official public page or product
  page allowed for each observation, expected extraction hints, a 30-day maximum
  freshness window, and fields that must stay blocked.
- `buildPrinterPricingRefreshReport` reports source count, fresh/stale sources,
  future-dated observations, and whether the comparison is safe to show.
- `npm run printer:pricing:doctor` verifies the observed official-source
  catalog, no-network collection rules, manual-confirmation posture, UI/API
  exposure, and CI wiring.
- The customer bootstrap exposes only a safe pricing preview: selected vendor,
  known public price count, source count, maximum source age policy, and
  `liveQuote: false`.
- Blocked fields remain tax, coupon portal proof, local stock, pickup windows,
  checkout availability, payments, and live order placement.

## Coupon Treatment

Coupons are part of pricing collection. The collector may use a proper coupon
provider feed or scrape retailer public coupon pages, then must apply candidate
codes in the provider portal/cart before ranking a best available price.
coupon discounts are applied only after provider-portal evidence proves the
code worked for the same product, quantity, fulfillment mode, and account state.

| Vendor | Coupon source | Observed card offer | Runtime treatment |
| --- | --- | --- | --- |
| Walgreens Photo | [Walgreens Photo deals](https://photo.walgreens.com/store/deals?tab=photo_downsplash_top) | `CRISPCARD`, 60% off all photo cards and premium stationery, listed with June 6, 2026 expiration | Stored as source-listed evidence only on June 7, 2026; not applied unless a provider-portal checkout session still applies it |
| CVS Photo | [CVS Photo coupons](https://www.cvs.com/photo/cvs-photo-coupons?cid=cvs-home-s5-l2-bnrshop-fs-photo) | `GRADUATION`, 60% off premium cards, listed with June 6, 2026 expiration | Stored as source-listed evidence only on June 7, 2026; not applied unless a provider-portal checkout session still applies it |

The handoff UI and API bootstrap show coupon-source counts and portal-proof
status. They must not show a discounted total as best available until the vendor
checkout confirms the discount on the same product, quantity, store, pickup or
shipping path, and customer account state.

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
