# Requirements And Traceability

Requirement types:

- Explicit: directly requested in the recovered brief.
- Inferred: chosen to make the request reviewable and testable.
- Open: important, but not implemented or not verifiable without external access.

## Matrix

| ID | Requirement | Type | Current coverage | Evidence |
| --- | --- | --- | --- | --- |
| R001 | Preserve the founder card-origin story and product wedge. | Explicit | Covered in docs and UI thesis. | `docs/brief-context.md`, `docs/product-brief.md`, `src/domain.ts` `oneLiner` and `sourceThesis`, README. |
| R002 | Extract the messy context into storyboard chapters. | Explicit | Covered in domain contracts and docs; the current UI prioritizes the free MVP workflow. | `src/domain.ts` `storyboards`, `computeBlueprintCoverage`; `src/domain.test.ts` chapter coverage test; `docs/brief-context.md`. |
| R003 | Show user paths for proactive, last-minute, recurring-memory, and high-care flows. | Explicit | Covered in the product workflow plus domain storyboards. | `src/App.tsx` opportunity/studio/memory/handoff views; `src/domain.ts` storyboard acceptance criteria. |
| R004 | Support web, iOS, and Android as cross-platform product surfaces. | Explicit | Partially covered. Web is a runnable free MVP; mobile is a thin shell/config boundary. | `src/App.tsx`; `apps/mobile/README.md`; `apps/mobile/app.config.js`; `apps/mobile/src/App.tsx`; `tests/infra-contract.test.ts`. |
| R005 | Model provider import for email/calendar with scoped access. | Explicit | Covered as free manual/ICS import in the MVP and service contracts for future OAuth; not live OAuth. | `src/freeMvp.ts` `parseFreeImport`; `src/serviceKernel.ts` provider adapters; tests in `src/freeMvp.test.ts` and `src/serviceKernel.test.ts`. |
| R006 | Detect event opportunities and preserve user approval/rejection decisions. | Explicit | Covered in UI state and deterministic service slice. | `buildOpportunity`; `OpportunitiesView` approve/snooze/dismiss; `importEvents`, `decideOpportunity`; Chrome smoke test. |
| R007 | Use relationship memory without hidden or creepy personalization. | Explicit | Covered as approved local UI memory and service repository with forget controls. | `addMemory`, `removeMemory`, Memory view; `InMemoryRelationshipMemoryRepository`, `approveRelationshipMemory`, memory tests. |
| R008 | Generate or validate 5x7 front, inside-left, inside-right, and back panels. | Explicit | Covered as free SVG export in the UI and deterministic render packet contracts. | `generateCardDraft`, `buildPanelSvg`, `validateCardDraft`; `renderPrintPacket`, `validatePrintLayout`; tests. |
| R009 | Validate layout safety, text overflow, DPI, pixels, and RTL-sensitive rendering. | Explicit | Covered by free MVP validation and service contract tests. | `validateCardDraft`; `validatePrintLayout`, `renderPrintPacket`, `src/serviceKernel.test.ts`; `render_packets` SQL constraints. |
| R010 | Keep Walgreens/retail behavior isolated behind a certified adapter boundary. | Explicit | Covered as hard-gated adapter contract. | `walgreensAdapter`, `adapterBlocksRealOrders`, `src/domain.test.ts`. |
| R011 | Never place real external orders until certification, live quote, approval, and kill-switch gates pass. | Explicit | Covered and blocked. | `realOrdersEnabled: false`, `REAL_ORDER_KILL_SWITCH=disabled`, `transitionOrder`, infra env examples, runtime doctor. |
| R012 | Model wrong-store, vendor rejection, event moved up, one-hour pickup, cancellation, and terminal states. | Explicit | Covered as state machine. | `OrderStatus`, `allowedOrderTransitions`, `transitionOrder`, `src/serviceKernel.test.ts`. |
| R013 | Separate dev/test/prod configuration and runtime readiness. | Explicit | Covered as config contracts and runtime doctor. | `getRuntimeConfig`, `validateRuntimeReadiness`, `scripts/validate-runtime-env.mjs`, Docker/Kubernetes manifests. |
| R014 | Provide cheap droplet and cloud-native deployment shapes. | Explicit | Covered as scaffolding, not deployed. | `infra/docker-compose.droplet.yml`, `infra/k8s/app.yaml`, `Dockerfile`, `infra/README.md`. |
| R015 | Provide durable database schema for users, providers, events, cards, memories, render packets, orders, consent, and audit. | Explicit | Covered as Postgres migration. | `infra/migrations/001_initial_schema.sql`, `tests/infra-contract.test.ts`. |
| R016 | Include queues, workers, object storage, migrations, and static production serving. | Explicit | Covered as skeleton. | `scripts/worker.mjs`, `scripts/migrate.mjs`, `scripts/serve-dist.mjs`, Docker Compose, Kubernetes manifests. |
| R017 | Include regulatory, regional, consent, deletion, and vendor-sharing controls. | Explicit | Covered as decision contracts, not legal review. | `regionRequirements`, `evaluateRegulatoryDecision`, SQL `consent_records`, `data_requests`, tests. |
| R018 | Document architecture, decisions, run commands, and reviewer handoff. | Inferred | Covered by current docs package. | README, this file, `docs/free-mvp-plan.md`, `docs/decisions.md`, `docs/verification.md`, `docs/handoff-notes.md`. |
| R019 | Keep AI/provider calls deterministic or mockable for tests. | Inferred | Covered by no live AI calls and deterministic extraction/rendering. | `src/freeMvp.ts`, `runOperationalExtraction`, `stableId`, tests for free import, SVG generation, weak-input blocking, and checksums. |
| R020 | Use production auth, real OAuth, vendor APIs, payment, live quotes, and physical certification. | Open | Not covered. Intentionally blocked. | README known gaps, `docs/free-mvp-plan.md`, `docs/handoff-notes.md`, adapter kill switch. |

## Acceptance Criteria Covered By Tests

- Weak/generic source text cannot create a successful print packet.
- Walgreens adapter is blocked unless physical certification, live quote, approval, and explicit policy gates exist.
- Metadata-only provider import rejects raw email/calendar content.
- Revoked or unsupported provider connections import no events.
- Card projects are created only after explicit `generate` decisions.
- Approved memories are filtered by recipient and can be forgotten.
- RTL locales are marked layout-sensitive and mismatches are blocked.
- Order lifecycle rejects invalid transitions and models recovery paths.
- Regional vendor-share policy blocks sharing without approval.
- Runtime config separates cheap droplet/dev behavior from cloud/prod behavior.
- Infra manifests include app, worker, database, queue, storage, migrations, probes, and kill-switch controls.
- Mobile shell resolves API configuration from environment.
- Local demo auth works without external providers.
- ICS/manual import produces a reviewable opportunity.
- Card studio renders four 1500 x 2100 SVG-ready panels.
- Manual vendor handoff blocks real orders and live vendor API claims.
- Adapter readiness shows free-ready substitutes and blocked production integrations.

## Remaining Gaps

- No production user auth or account recovery.
- No live OAuth consent flow.
- No persistent application API server.
- No production object-storage upload or signed URL implementation.
- No actual image generation, print PNG/PDF export, or physical print QA.
- No live vendor quote/order/refund integration.
- No legal, security, privacy, or accessibility audit.
- No coverage reporting threshold is configured.
