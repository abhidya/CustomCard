# Decisions

This document records the implementation defaults chosen while turning the
ambiguous CustomCard brief into a reviewable repo.

## D001: Keep The Current Repo As A Free MVP Plus Contract-First Skeleton

Decision: represent the product as a Vite/React free local MVP plus typed
domain/service contracts, tests, database schema, and deployment scaffolding.

Reason: the brief asks for a production-shaped service, but no external
credentials, vendor access, legal approval, or physical certification evidence
were available. A contract-first skeleton lets reviewers inspect the hard parts
without pretending live integration exists.

Rejected: claim a finished SaaS or live ordering flow. That would hide the
highest-risk gaps.

## D002: Keep Real Ordering Disabled

Decision: `WalgreensFiveBySevenDoubleSidedCardAdapter` is a hard-gated contract
with `realOrdersEnabled: false` and runtime kill-switch requirements.

Reason: physical print errors and accidental external orders are the most
dangerous failure modes in this stage.

Rejected: browser automation or direct retail ordering in v1. Both require
terms review, sandbox/live evidence, and physical print certification.

## D003: Use Metadata-Only Provider Import Contracts

Decision: Gmail, Google Calendar, and Outlook are represented as scoped provider
adapters; raw email/calendar content is rejected.

Reason: email/calendar content is untrusted and sensitive. The current repo can
prove least-privilege import posture before OAuth plumbing exists.

Rejected: broad email ingestion or storage of full message bodies. That would
increase prompt-injection and privacy risk before the product needs it.

## D004: Structured Memory Before Vector Memory

Decision: approved relationship memory is modeled as structured records with
forget controls.

Reason: the product needs user-visible provenance and deletion before fuzzy
semantic recall. Structured memory is easier to audit and test.

Rejected: hidden vector-only relationship memory. It would be harder to explain,
delete, or constrain.

## D005: Deterministic Print Contracts Before AI Rendering

Decision: the repo validates and renders deterministic 1500x2100 SVG panels with
safe-margin and text-overflow checks.

Reason: print correctness needs exact dimensions and deterministic failure modes.
AI image generation can plug into the renderer later, but it should not own the
layout contract.

Rejected: generated mockups or decorative previews as production assets. They
can hide cropping, shadow, fold, DPI, and safe-zone defects.

## D006: Cheap Droplet And Cloud-Native Paths Share Contracts

Decision: the domain contracts stay the same across the local development contract,
five-dollar-droplet, and SaaS-scale profiles.

Reason: the brief explicitly asks for both a cost-efficient deployment and a
future scale path. Separating contracts from runtime mode keeps the cheap path
from becoming throwaway work.

Rejected: separate throwaway MVP architecture. It would make later scaling a
rewrite instead of a staged operational move.

## D007: Thin Mobile Shell For This Stage

Decision: iOS/Android are represented by an Expo app-shell boundary that resolves
the API URL from environment configuration and renders a tested customer
experience contract.

Reason: cross-platform architecture is required, but signed native apps are not
needed to prove the current service contracts. The repo-local proof is the pure
mobile customer model, Expo screen wiring, contract tests, and mobile doctor.

Rejected: claiming store-ready mobile releases. Signing, native build pipelines,
push notifications, emulator/native render proof, and mobile QA are outside this
pass.

## D008: Finish The Reviewable MVP With Free Local Substitutes

Decision: finish the user-facing app with local workspace auth, manual/ICS import,
deterministic templates, browser SVG export, and manual vendor handoff.

Reason: the requested finish line required free solutions only. These paths make
the core product workflow usable without credentials, paid model calls, vendor
accounts, payment processors, or production infrastructure.

Rejected: treating Gmail OAuth, paid AI generation, live vendor APIs, or real
orders as required for this pass. Those integrations remain open production work
with explicit safety gates.

## D009: Extract Coupon Cart-Terms Seam; Defer The Full Printer-Pricing Split

Decision: extract coupon Cart Terms validation (`isPrinterCouponActive`,
`hasMatchingProviderPortalCouponEvidence`,
`validatePrinterCouponPortalApplicationEvidence`) into
`src/printerCouponCartTerms.ts`, imported by both the ranking path in
`printerPricing.ts` and `printerCouponPortalEvidence.ts`. `printerPricing.ts`
re-exports the three so its existing importers are unaffected.

Reason: "is this coupon valid for this cart" is the one coupon rule reused across
modules; a named module concentrates it (locality) and lets the evidence-import
path depend on a small seam instead of the 2k-line pricing module. The further
catalog/policy/ranking file split proposed in architecture review is deferred: it
is reorganization-only (no behaviour or leakage change), `printerPricing.ts` has
~18 importers (high blast radius), and the review's premise of a
`printerPricing` ↔ `printerCouponPortalEvidence` import cycle proved false — the
dependency is one-way — so the split's main justification did not hold.

Rejected: splitting `printerPricing.ts` into three modules in this pass. Revisit
if the file grows materially or a second consumer needs the pricing catalog
independently of coupons.

## D010: Defer The Provider-Runtime / Provider-Catalog Plugin Split

Decision: keep `providerRuntime.ts` and `providerCatalog.ts` as single modules for
now; do not split the runtime into per-capability files or co-locate each
adapter's catalog entry with its request builder in this pass.

Reason: architecture review flagged that adding a provider means editing two large
files (`providerCatalog.ts` ~2.3k lines of adapter data, `providerRuntime.ts` ~3k
lines of dispatch). But the seam is already real and centralized:
`buildProviderAdapterRuntime` dispatches through a capability handler table
(`providerRuntimeSeams` + `providerRuntimeHandlers`), and `validateRuntimeCoverage`
guards that every capability has a handler. The proposed change is therefore a
large reorganization over an existing, working seam — high blast radius
(`providerRuntime` is referenced by the catalog, the API server, several doctors
with source-text checks, and a ~1.3k-line test) for a payoff of navigability, not
behaviour or leakage. That cost/risk is not justified in a behaviour-preserving
pass made alongside three other deepenings.

Rejected: a partial extraction (shared kernel only, or a single capability) in this
pass — it would leave an inconsistent half-split for low incremental value. Revisit
as a dedicated effort when provider-add frequency makes the two-file edit cost
dominant; do it per-capability behind the existing handler table, with each adapter
module owning both its catalog metadata and its request builder.

## D011: Collapse Readiness Fan-Out Behind ReadinessSummary Seam (C2)

Decision: create `readinessSummary.ts` as a single-import facade for all 12 readiness
domains. `App.tsx` calls `buildReadinessSummary()` once; `AdminPanelView` receives
one `readiness: ReadinessSummary` prop instead of 29 individual readiness params.

Reason: the 12 individual readiness imports in `App.tsx` had grown into a shallow
fan-out — each domain followed the same `getXxxReadinessItems()` / `getXxxReadinessSummary()`
pattern with no domain logic differentiating their call sites. Aggregating them behind
one seam concentrates the "which domains exist" knowledge in one file, makes adding
a 13th domain a single-file change, and cuts `AdminPanelView`'s prop count from 29
to 6. The deletion test: removing the facade causes complexity to reappear across all
12 call sites.

## D012: Name The Hidden Coupon Evidence Coordinator (C3)

Decision: create `printerCouponEvidence.ts` as the canonical import point for the
coupon evidence subsystem (portal evidence, browser evidence, provider feeds). Add
`importCatalogBackedCouponPortalEvidence()` to expose the catalog injection point
explicitly.

Reason: the three evidence-source modules (`printerCouponPortalEvidence`,
`printerCouponBrowserEvidence`, `printerCouponProviderFeeds`) were logically a
subsystem but had no named seam. Callers imported from whichever module happened to
export the symbol they needed, so the subsystem's entry point was invisible. Naming
it concentrates subsystem knowledge and makes the catalog binding explicit rather
than buried inside the portal-evidence module.

## D013: Split OnboardingCalendar Type Layer From Logic (C5)

Decision: extract the 12 type aliases and 11 interfaces from `onboardingCalendar.ts`
(~220 lines) into `onboardingCalendarTypes.ts`. `onboardingCalendar.ts` re-exports
all types for backward compatibility.

Reason: callers that only need the data shapes (e.g., test fixtures, API contract
checkers) were forced to import from an 800-line module containing unrelated function
bodies and data arrays. The type layer has zero runtime weight; separating it lets
type-only consumers avoid the full module load and makes the interface inspectable
without navigating implementation.

Note: the initial commit missed `import type { ... }` alongside `export type { ... }`,
so `onboardingCalendar.ts` function bodies lost visibility of their own types. Fixed
in the next commit.

## D014: Absorb Fulfillment Recommendation Derivation Into CustomerWebExperience (C4)

Decision: add `fulfillmentRecommendationSet: FulfillmentRecommendationSet` to
`CustomerWebExperienceState`. `buildCustomerWebExperienceFromState` computes the
`recommendationByKind` Map and populates `lowestEstimate`, `fastestPickup`,
`cheapestShipped`, and `disclaimer` onto `CustomerWebFulfillmentSummary`.

Reason: `CustomerPanelView` was doing 6 lines of Map construction and property
extraction that belonged in the module's composition layer. The view's job is to
render data, not derive it. Moving the computation into `buildCustomerWebExperienceFromState`
concentrates fulfillment presentation logic in one testable function and adds 4 new
fields to `CustomerWebFulfillmentSummary` as the stable interface for fulfillment
display state.

## D015: Extract App State Orchestration Into useAppState Hook (C1)

Decision: create `appStateOrchestrator.ts` exporting `useAppState()`, a custom React
hook that owns all 13 `useState` + 14 `useMemo` + 3 `useEffect` calls previously
inline in `App()`. `App()` now calls `useAppState()` and destructures the result.
Move `initialViewFromLocation`, `loadWorkspace`, and `buildRuntimeReadinessMap`
helpers into the orchestrator.

Reason: `App()` mixed state management (dependency chains, derivation logic, effect
lifecycle) with view composition (JSX, event handlers). The 70-line state block was
the highest-friction area in the component — difficult to test in isolation and
requiring readers to parse a dense dependency graph before understanding the view
structure. The hook provides a typed `AppState` interface as the test surface; the
initial-view and workspace-loading helpers become testable without rendering the
full component tree.

## D016: Promote ReadinessSummary Into A Domain Manifest

Decision: create `readinessDomains.ts` as the canonical manifest for the 12
Readiness Register domains. `readinessSummary.ts` now re-exports that seam;
`apiContracts.ts` builds API readiness, customer bootstrap readiness payloads, and
readiness validation through `buildReadinessSummary()` and
`validateReadinessDomains()` instead of importing each domain directly.

Reason: D011 collapsed the admin fan-out, but the same domain list still leaked
into API bootstrap and API validation. The manifest concentrates each domain's
payload, summary function, and validator in one module, so adding or changing a
Readiness Register no longer requires hand-editing every API caller. The deletion
test: removing the manifest makes the domain list reappear in both
`readinessSummary.ts` and `apiContracts.ts`.
