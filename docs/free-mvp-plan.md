# Free MVP Plan

This pass finishes CustomCard as a usable, free-solutions-only local MVP while
preserving the production integration gates from the earlier service skeleton.

## Delivered Free Paths

| Path | Free solution | Evidence |
| --- | --- | --- |
| Local workspace auth | Local browser workspace stored in `localStorage`; no external auth provider. | `src/App.tsx`, `src/freeMvp.ts`, `tests/app-smoke.test.ts`. |
| Event import | Manual invite text or ICS paste parser. | `parseFreeImport`, `src/freeMvp.test.ts`. |
| Opportunity decision | Local approve, snooze, and dismiss states. | `OpportunitiesView`, Chrome smoke workflow. |
| Relationship memory | User-approved local memory records with add/delete controls. | `addMemory`, `removeMemory`, Memory view. |
| Card generation | Deterministic template engine; no paid AI call. | `generateCardDraft`, `validateCardDraft`. |
| Print export | Browser-generated 1500 x 2100 SVG panels plus a local 5x7 PDF proof and checksum manifest. | `buildPanelSvg`, `buildPrintExportPackage`, Handoff view. |
| Vendor handoff | Manual checklist for Walgreens, CVS, FedEx Office, Walmart, Staples, Office Depot, or local print shop plus review-only public price comparison. | `buildVendorHandoff`, `src/printerPricing.ts`, Adapter view. |

## Blocked Production Paths

- Production user auth and account recovery.
- Gmail, Google Calendar, Outlook, or iCloud OAuth.
- Paid AI text/image generation.
- Live vendor quotes, taxes, stock, pickup-window checks, payments, refunds, or
  real order placement. Coupon source collection is modeled, but coupon
  discounts require provider-portal application proof before best-price ranking.
- Physical print certification.
- External legal, privacy, security, accessibility, and deployment audits.

## Design Direction

- The first screen is the usable workflow, not a marketing page.
- The product shell exposes auth, import, card studio, memory, handoff, and adapter
  readiness as first-class surfaces.
- Free/manual substitutes are marked ready; production integrations are marked
  blocked instead of hidden.
- Real orders remain visibly disabled in navigation, handoff, and adapter views.

## Acceptance

- A reviewer can start a local workspace, scan the sample invite, approve card
  generation, edit tone/style/language, inspect four 5x7 panels, prepare manual
  vendor handoff, and see which integrations are ready or blocked.
- The app can be built and smoke-tested without paid services, external
  credentials, or network-side accounts.
