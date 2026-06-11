# Production UI audit — Phase 0

Status: Active · Date: 2026-06-11 · Scope: consumer web shell (`webapp/`), backed by `src/apiRouteContractsData.mjs` (current snapshot)

This audit maps every proposed production UI surface to actual repo evidence before implementation. It supersedes earlier
planning notes that assumed anonymous Walgreens checkout routes.

## Corrections confirmed against the current route contract

| Earlier assumption | Current repo truth | Evidence |
| --- | --- | --- |
| Walgreens upload/session may be anonymous | Both require `customer-session` auth; only the callback is public | `src/apiRouteContractsData.mjs` `walgreens-checkout-upload`/`-session` (`auth: "customer-session"`), `-callback` (`auth: "none"`) |
| Manual handoff body: renderPacketId, vendorId, externalShareApproval | Requires `projectId`, `renderPacketId`, `storeId`, `externalShareApproval` | `mutationBodyContractSpecs["manual-vendor-handoff"]` |
| Card project body: opportunityId, approvedMemoryIds, locale | Requires `opportunityId` **and `recipientName`** | `mutationBodyContractSpecs["card-projects"]` |
| Data request body: action, region | Requires `requestType`, `region`, `consentGranted` | `mutationBodyContractSpecs["data-requests"]` |
| Import preview accepts generic paste | Requires explicit metadata fields (`metadataOnlyPayload.title/recipientName/startsAt`) or server-parsed raw invite/ICS text | `mutationBodyContractSpecs["import-preview"]` |

## Surface-by-surface audit

| Proposed UI surface | Existing support | Evidence | Gap | Safe fallback | Tests |
| --- | --- | --- | --- | --- | --- |
| Public landing (hero, how-it-works, free/Walgreens, privacy) | Partial: occasion-first home hero | `webapp/views/HomeView.tsx` | No how-it-works / free-vs-Walgreens / privacy sections | Pure static copy, no backend needed | `tests/customer-shell-ssr.test.tsx` |
| Create wizard, anonymous-first | Done: StudioView, local state, no account needed | `webapp/views/StudioView.tsx`, `src/appStateOrchestrator.ts` | — | — | SSR + smoke |
| Account gate before AI generation | Done: Clerk `SignInButton` gate; route requires customer-session + idempotency key | `StudioView` `aiRequiresSignIn`, route `ai-card-generate` | — | Deterministic local draft keeps working | SSR test |
| Draft autosave for signed-in users | Done | `webapp/customerShellCommands.ts` `useDraftAutosave`, routes `customer-draft-state*` | — | Local state when signed out | `tests/api-runtime.test.ts` |
| Per-panel generation status | Partial: artwork count + per-panel "Artwork ready/Template" labels; job evidence model exists | `StudioView` pagetabs, `src/aiGenerationJobs.ts` | No per-panel "creating" state during generation; no durable per-panel job route | Show generating label client-side; no fake job IDs | SSR test |
| Proof approval checklist gating Walgreens | Missing: checkout gated only on print manifest | `webapp/views/PrintView.tsx` (`canUseWalgreensCheckout`) | No explicit human approval step | Checklist is client-side; manifest gate stays | new `webapp/proofApproval` unit tests + SSR |
| Walgreens hosted checkout | Done: upload→session→popup with auth header, popup-block fallback | `webapp/walgreensCheckoutAdapter.ts`, `PrintView` | No inline field validation before submit; CTA copy | Validation client-side; errors already surfaced in friendly copy | `tests/frontend-architecture.test.ts` |
| Checkout status honesty | Done-ish: never claims order complete | `PrintView` status copy; callback contract is static-return | — | — | smoke |
| Fallback export secondary | Done: Save print package / upload panels / copy steps | `PrintView`, `webapp/customerShellCommands.ts` | — | — | smoke |
| My Cards statuses | Partial: in-progress resume card; no status labels | `webapp/views/NotesView.tsx`, `webapp/draftProgress.ts` | No draft/in-progress/ready labels in hub | Statuses derive from existing local model only | architecture test |
| Memory use-once vs save | Partial: notes save locally + POST `/api/memories/review` approve | `webapp/App.tsx` `addNote`, route `relationship-memories` | No "use once (don't save to account)" choice | Use-once keeps note local-only; no API write | SSR + architecture |
| Settings / privacy (data requests, legal, account) | Backend exists (`data-requests`, legal docs); no customer surface | route `data-requests`, `src/legalCompliance.ts` | New Settings view + nav | Signed-out: explain sign-in required; failures show retry copy | SSR + architecture |
| Admin/adapters gated, no consumer jargon | Done and test-guarded | `webapp/routePolicy.ts`, term patterns in `src/customerWebExperience.ts` | — | — | existing guards |
| Job-state API (`/generation-jobs`, per-panel retry) | **Not in repo** | route contract has no job routes | Backend gap — do not build UI that promises durable jobs | Client-side progress only | n/a |

## Decisions

- No new dependencies. Repo-local CSS tokens in `webapp/styles.css` already implement the warm-paper/terracotta brand; extend, don't replace.
- The 2D proof stays the source of truth (1500×2100 panels). No 3D preview in this pass.
- Customer copy must avoid the blocked term patterns (`provider`, `vendor`, `adapter`, `handoff`, `api`, `runtime`, `mvp`, …).
- Checkout CTA becomes "Continue to Walgreens", enabled only after print checks pass **and** the proof checklist is approved; approval resets when the draft changes.
- Settings exposes privacy choices through `/api/data-requests` with the current body contract (`requestType`, `region`, `consentGranted`).
