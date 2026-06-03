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
| R004 | Support web, iOS, and Android as cross-platform product surfaces. | Explicit | Partially covered. Web is a runnable free MVP with customer/admin panels; mobile is a tested Expo customer shell/config boundary with a shared customer experience contract. | `src/App.tsx`; `apps/mobile/README.md`; `apps/mobile/app.config.js`; `apps/mobile/src/App.tsx`; `apps/mobile/src/customerExperience.ts`; `tests/infra-contract.test.ts`; `tests/mobile-contract.test.ts`. |
| R005 | Model provider import for email/calendar with scoped access. | Explicit | Covered as free manual/ICS import, service contracts, cataloged Gmail/Google Calendar/Microsoft Graph/iCloud adapters, and no-network metadata-only request dry runs; not live OAuth. | `src/freeMvp.ts` `parseFreeImport`; `src/serviceKernel.ts` provider adapters; `src/providerCatalog.ts`; `src/providerRuntime.ts`; tests in `src/freeMvp.test.ts`, `src/serviceKernel.test.ts`, `src/providerCatalog.test.ts`, and `src/providerRuntime.test.ts`. |
| R006 | Detect event opportunities and preserve user approval/rejection decisions. | Explicit | Covered in UI state and deterministic service slice. | `buildOpportunity`; `OpportunitiesView` approve/snooze/dismiss; `importEvents`, `decideOpportunity`; Chrome smoke test. |
| R007 | Use relationship memory without hidden or creepy personalization. | Explicit | Covered as approved local UI memory and service repository with forget controls. | `addMemory`, `removeMemory`, Memory view; `InMemoryRelationshipMemoryRepository`, `approveRelationshipMemory`, memory tests. |
| R008 | Generate or validate 5x7 front, inside-left, inside-right, and back panels. | Explicit | Covered as free SVG export, local SVG/PDF/manifest print package export, and deterministic render packet contracts. | `generateCardDraft`, `buildPanelSvg`, `buildPrintExportPackage`, `validateCardDraft`; `renderPrintPacket`, `validatePrintLayout`; tests. |
| R009 | Validate layout safety, text overflow, DPI, pixels, and RTL-sensitive rendering. | Explicit | Covered by free MVP validation and service contract tests. | `validateCardDraft`; `validatePrintLayout`, `renderPrintPacket`, `src/serviceKernel.test.ts`; `render_packets` SQL constraints. |
| R010 | Keep Walgreens/retail behavior isolated behind a certified adapter boundary. | Explicit | Covered as hard-gated adapter contract. | `walgreensAdapter`, `adapterBlocksRealOrders`, `src/domain.test.ts`. |
| R011 | Never place real external orders until certification, live quote, approval, and kill-switch gates pass. | Explicit | Covered and blocked. Review-only public pricing observations are separated from live quotes. | `realOrdersEnabled: false`, `REAL_ORDER_KILL_SWITCH=disabled`, `transitionOrder`, `src/printerPricing.ts`, infra env examples, runtime doctor. |
| R012 | Model wrong-store, vendor rejection, event moved up, one-hour pickup, cancellation, and terminal states. | Explicit | Covered as state machine. | `OrderStatus`, `allowedOrderTransitions`, `transitionOrder`, `src/serviceKernel.test.ts`. |
| R013 | Separate dev/test/prod configuration and runtime readiness. | Explicit | Covered as config contracts and runtime doctor. | `getRuntimeConfig`, `validateRuntimeReadiness`, `scripts/validate-runtime-env.mjs`, Docker/Kubernetes manifests. |
| R014 | Provide cheap droplet and cloud-native deployment shapes. | Explicit | Covered as locally validated scaffolding, not deployed. The deployment doctor verifies local-dev, cheap-droplet, cloud-native, runtime, and data lanes, and the production image now serves API plus static web. | `infra/docker-compose.droplet.yml`, `infra/k8s/app.yaml`, `Dockerfile`, `scripts/api-server.mjs`, `scripts/deployment-readiness.mjs`, `infra/README.md`, `tests/infra-contract.test.ts`. |
| R015 | Provide durable database schema for users, providers, events, cards, memories, render packets, orders, consent, and audit. | Explicit | Covered as Postgres migration plus tested persistence contracts for auth sessions, idempotency replay, queue jobs, render-packet artifact manifests, signed URL expiry, and append-only audit. | `infra/migrations/001_initial_schema.sql`, `src/persistenceContracts.ts`, `src/persistenceContracts.test.ts`, `scripts/persistence-doctor.mjs`, `tests/infra-contract.test.ts`. |
| R016 | Include queues, workers, object storage, migrations, static production serving, and reviewer reset tooling. | Explicit | Covered as skeleton plus tested API/static server, executable memory-mode auth/idempotency runtime, demo reset contract, and persistence-readiness boundary. | `scripts/worker.mjs`, `scripts/migrate.mjs`, `scripts/api-runtime.mjs`, `scripts/api-server.mjs`, `scripts/demo-reset.mjs`, `scripts/persistence-doctor.mjs`, `scripts/serve-dist.mjs`, Docker Compose, Kubernetes manifests, `src/demoSeed.ts`, `tests/api-server.test.ts`, `tests/infra-contract.test.ts`. |
| R017 | Include regulatory, regional, consent, deletion, and vendor-sharing controls. | Explicit | Covered as decision contracts, not legal review. | `regionRequirements`, `evaluateRegulatoryDecision`, SQL `consent_records`, `data_requests`, tests. |
| R018 | Document architecture, decisions, run commands, and reviewer handoff. | Inferred | Covered by current docs package. | README, this file, `docs/free-mvp-plan.md`, `docs/platform-expansion-design.md`, `docs/decisions.md`, `docs/verification.md`, `docs/handoff-notes.md`. |
| R019 | Keep AI/provider calls deterministic or mockable for tests. | Inferred | Covered by no live AI calls, deterministic extraction/rendering, and dry-run provider contracts that never call a network. | `src/freeMvp.ts`, `src/providerRuntime.ts`, `runOperationalExtraction`, `stableId`, tests for free import, SVG generation, provider dry runs, weak-input blocking, and checksums. |
| R020 | Use production auth, real OAuth, vendor APIs, payment, live quotes, and physical certification. | Open | Not covered. Intentionally blocked. | README known gaps, `docs/free-mvp-plan.md`, `docs/handoff-notes.md`, adapter kill switch, `src/providerCatalog.ts` blocked live vendor adapters. |
| R021 | Provide customer and admin panels. | Explicit | Covered in the web UI. Customer panel shows next-card state, local chat, image/render choices, and free fallbacks; admin panel shows provider coverage, dry-run runtime readiness, env gates, deployment readiness, and blocked vendors. | `src/App.tsx`, `src/styles.css`, `tests/app-smoke.test.ts`. |
| R022 | Load broad service-provider adapters for image generation, integrations, and text chat. | Explicit | Covered as a tested 44-adapter catalog plus executable no-network dry-run contracts with free local fallbacks, public printer pricing research, local print package export, 21 credential-gated external providers, and hard-blocked live vendors; live network calls are not implemented. | `src/providerCatalog.ts`, `src/providerRuntime.ts`, `src/printerPricing.ts`, `src/printExport.ts`, `src/providerCatalog.test.ts`, `src/providerRuntime.test.ts`, `src/printerPricing.test.ts`, `src/printExport.test.ts`, `infra/env/.env.example`, `docs/platform-expansion-design.md`, `docs/printer-pricing-research.md`. |
| R023 | Include a customer-facing text chat interface. | Explicit | Covered as deterministic local chat transcript in the customer panel and mobile shell, with dry-run request contracts for future model providers; live model providers remain gated. | `buildCustomerChatTranscript`, `buildTextChatRuntime`, `CustomerPanelView`, `apps/mobile/src/customerExperience.ts`, `apps/mobile/src/App.tsx`, `src/providerCatalog.test.ts`, `src/providerRuntime.test.ts`, `tests/app-smoke.test.ts`, `tests/mobile-contract.test.ts`. |
| R024 | Include image-generation/render provider readiness. | Explicit | Covered by free browser SVG renderer plus dry-run gated OpenAI, Gemini, Stability, Hugging Face, Replicate, Together, Ideogram, and Leonardo request contracts; no live paid call. | `src/providerCatalog.ts`, `src/providerRuntime.ts`, `CustomerPanelView`, `AdminPanelView`, `src/providerCatalog.test.ts`, `src/providerRuntime.test.ts`, `tests/app-smoke.test.ts`. |
| R025 | Keep the system cheap and cloud-deployment ready through tested IaC. | Explicit | Partially covered. Free local fallback, droplet compose, Kubernetes manifests, env contract, object-store signing secret gates, runtime doctor, contract API doctor, memory API doctor, persistence doctor, deployment doctor, CI verification workflow, and infra tests exist; no real cloud deployment evidence. | `infra/docker-compose.dev.yml`, `infra/docker-compose.droplet.yml`, `infra/k8s/app.yaml`, `infra/env/.env.example`, `.github/workflows/verify.yml`, `scripts/api-runtime.mjs`, `scripts/api-server.mjs`, `scripts/persistence-doctor.mjs`, `scripts/deployment-readiness.mjs`, `src/artifactHandoff.ts`, `tests/api-server.test.ts`, `tests/infra-contract.test.ts`, `docs/platform-expansion-design.md`. |
| R026 | Treat test coverage as an explicit quality goal. | Explicit | Covered for core, API, persistence, orchestration, and mobile contract modules with V8 coverage thresholds in the standard check command; browser UI remains covered by smoke tests rather than unit coverage instrumentation. | `package.json` `test:coverage` and `check`; `vite.config.ts` coverage thresholds; `src/apiContracts.test.ts`; `src/persistenceContracts.test.ts`; `src/agentContracts.test.ts`; `tests/mobile-contract.test.ts`; `tests/infra-contract.test.ts`; `docs/verification.md`; `coverage/coverage-summary.json` generated by `npm run check`. |

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
- Deployment doctor reports local-dev, cheap-droplet, cloud-native, runtime, and
  data lanes ready, and the droplet app/worker share persistent object storage.
- CI workflow runs full repository check, deployment doctor, contract API
  doctor, memory API doctor, persistence doctor, worker readiness, and mobile
  doctor on pushes to `main` and pull requests.
- API server exposes tested health, route catalog, customer/admin bootstrap,
  mobile bootstrap, provider readiness, and idempotent mutation contract
  endpoints with real orders and external calls disabled.
- API memory runtime enforces Bearer sessions on non-public routes and
  `X-Idempotency-Key` persistence/replay/conflict handling on mutations.
- Persistence contracts map 11 schema-backed API routes to auth-session,
  idempotency, queue-job, and audit-log tables.
- Mobile shell resolves API configuration from environment.
- Mobile customer shell mirrors the customer panel with tested card queue,
  memory, chat, render, and handoff sections.
- Mobile doctor validates the customer experience contract and fails if the
  repo-local real-order kill switch is enabled.
- Local demo auth works without external providers.
- ICS/manual import produces a reviewable opportunity.
- Card studio renders four 1500 x 2100 SVG-ready panels.
- Print package export produces four SVG artifacts, a combined 5x7 PDF proof,
  and a checksum manifest without network calls or real orders.
- Render-packet artifact handoff produces object-store URIs, HMAC-signed URL
  contracts, expiry metadata, and schema fields without live uploads.
- Admin demo reset produces deterministic reviewer fixture contracts across 14
  tables and 17 rows without production credentials or live calls.
- Manual vendor handoff blocks real orders and live vendor API claims.
- Public printer pricing research compares Walgreens/CVS/FedEx/Walmart/Staples/
  Office Depot observations but keeps `liveQuote: false` and requires checkout
  confirmation.
- Customer/admin panels expose the local customer path and provider operations state.
- Adapter readiness shows free-ready substitutes, credential-gated providers, contract-only adapters, and blocked live vendor integrations.
- Provider catalog covers 47 adapters: 12 ready-local, 21 credential-gated, 8
  contract-only, and 6 blocked.
- Admin/adapters UI surfaces no-network runtime readiness, blocked dry-run
  state, and missing credential references.
- Provider runtime dry runs cover every catalog adapter, redact contact/payment
  data before external provider contracts, keep imports metadata-only, and never
  prepare live vendor order requests.
- Core, API, persistence, orchestration, and mobile contract coverage thresholds
  are enforced in `npm run check`: 90% statements, 80% branches, 90% functions,
  and 90% lines.

## Remaining Gaps

- No production user auth or account recovery.
- No live OAuth consent flow.
- No live Postgres API integration test, production account auth flow, or account
  recovery.
- No live object-storage upload or cloud object-store integration.
- No actual image generation or physical print QA; local SVG/PDF/manifest export
  and signed artifact handoff contracts are covered, but live object-store writes
  are not.
- No live text-chat model call.
- No live vendor quote/order/refund integration.
- Public printer prices are review-only observations, not live quote, tax,
  coupon, stock, or pickup-window guarantees.
- No legal, security, privacy, or accessibility audit.
- Browser UI smoke behavior is not included in the V8 unit coverage percentage.
- No real droplet or Kubernetes deployment has been executed.
- Hosted GitHub Actions verification exists for main pushes, but no real droplet
  or Kubernetes deployment has been executed.
- No React Native render test, emulator run, native build, or signed mobile
  artifact has been produced.
