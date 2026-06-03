# Printer Pricing Research

This file records review-only public price observations for manual fulfillment.
It is not a live quote feed, a checkout integration, or a promise that a store
has stock at checkout time.

Observed on: June 3, 2026.

## Public Observations

| Vendor | Observed product | Public price captured | Source |
| --- | --- | --- | --- |
| Walgreens | 5x7 folded card | $2.99 each | [Walgreens photo product catalog](https://developer.walgreens.com/support/photo-product-catalog) |
| CVS Photo | Same Day 5x7 Premium / double-sided cardstock card | $2.49 each with a 20-card minimum in the app contract | [CVS Photo cards](https://www.cvs.com/Photo/Cards) |
| CVS Photo | 5x7 folded card | $2.99 each | [CVS Photo cards](https://www.cvs.com/Photo/Cards) |
| FedEx Office | Quick 5x7 double-sided greeting card | $17.99 for 10, represented as a package-start observation | [FedEx Office greeting cards](https://www.office.fedex.com/default/greeting-cards) |
| FedEx Office | Premium 5x7 folded greeting card | $22.99 for 20 folded, represented as a package-start observation | [FedEx Office greeting cards](https://www.office.fedex.com/default/greeting-cards) |
| Walmart Photo | Same-day folded photo card | $1.42 each, marked public-ambiguous until checkout confirms the local store price | [Walmart Photo same-day folded photo card](https://business.walmart.com/ip/Same-Day-Folded-Photo-Card/15907786) |
| Staples Print | 5x7 folded card bundle | $29.99 for 25, represented as a package-start observation with coupon/window confirmation required | [Staples cards and invitations](https://www.staples.com/services/printing/cards-invitations/) |
| Office Depot | 7x5 custom photo holiday card bundle | $77.60 for 25, represented as a package-start observation | [Office Depot custom photo holiday cards](https://www.officedepot.com/a/products/7395368/Custom-Photo-Holiday-Cards-With-Envelopes/) |

## Product Boundary

- `src/printerPricing.ts` stores these as public observations with source URLs,
  observation dates, minimum quantities, and manual-confirmation flags.
- `public-printer-pricing-research` is a ready-local adapter in
  `src/providerCatalog.ts` and returns a local comparison from
  `src/providerRuntime.ts`.
- The Handoff UI shows the selected vendor's observed price plus ranked public
  options, but it always states that checkout confirmation is required.
- `liveQuote` is always `false`; real quotes, taxes, coupons, stock, pickup
  windows, payments, and orders remain blocked until vendor sandbox/live API
  contracts and physical print certification exist.
