# Workstreams

This file is the orchestration map for the active production-readiness push. It
links each lane to the design source, defined task shape, current evidence, and
remaining implementation gaps. It is intentionally stricter than a roadmap: a
lane is not "done" until its graduation evidence exists in the repo.

## Coordination Snapshot

No worker branch is currently awaiting integration. Recent merged lanes:

| Lane | Owner | Main commit | Scope | Validation |
| --- | --- | --- | --- | --- |
| Provider coupon proof | Lead agent | `10d83f2` | Coupon collector now extracts codes from exact Walgreens/CVS print links, reports print-link code/price evidence, supports credential-gated FMTC provider-feed polling with token redaction, and keeps discounts out of best-price ranking without same-cart portal proof. | Full `npm run check`, pricing doctor, coupon collector, focused pricing tests, build, diff whitespace check. |
| Admin operations workflow | Lead agent | `8f9dc82` | Admin panel now exposes a tested integration-owner workflow for credential vault, hosted token proof, alert drill, incident runbook, and owner-lane evidence actions. | Full `npm run check`, admin operations doctor, browser smoke suite, Browser desktop DOM/console check. |
| Customer web flow | Lead agent | `52efae6` | Customer dashboard now uses a tested one-primary-action journey model that routes event review before drafting and keeps customer copy free of internal provider/model jargon. | Full `npm run check`, browser smoke suite, focused customer/chat/API/provider/pricing tests, Browser desktop DOM/console check. |
| Mobile render snapshot | Lead agent | `e9b6580` | Expo mobile shell renders a tested customer-facing snapshot instead of importing raw contract arrays. | Full `npm run check`, mobile doctor, mobile render doctor, release doctor, focused mobile/infra tests. |
| Coupon source targets | Lead agent | `3c7543d` | Official Walgreens/CVS coupon sources, exact print-link code/price proof targets, and credential-gated FMTC provider-feed reporting. | Full `npm run check`, pricing doctor, coupon collector, focused pricing/API/app tests. |
| Retail operation blueprints | Lead agent | `e1d74d2` | Retail printer operations now carry blocked request/evidence blueprints for future certified price fetch, image upload, and order placement. | Full `npm run check`, retail doctor, focused retail/runtime tests. |
| Coupon portal evidence | Anscombe | `6ffd44d` | Structured same-cart provider-portal coupon evidence before best-price coupon ranking. | Full `npm run check`, pricing doctor, script syntax checks, focused pricing/API/fulfillment tests. |
| Demo/bootstrap boundary | Huygens | `dd71043` | Demo bootstrap values moved out of the primary React shell without behavior change. | Browser smoke tests and build. |
| Orchestration/workstream map | Lead agent | `c14c401` | Repo-local workstream map, branch hygiene, integration, and validation sequencing. | Infra contract test and diff whitespace check. |

## Product Surface Workstreams

| Workstream | Design source | Tasks already defined | Current coverage | Implementation gaps |
| --- | --- | --- | --- | --- |
| Customer web app | `docs/product-brief.md`, `docs/implementation-roadmap.md`, `docs/requirements-traceability.md` R021 | Local workspace, invite/ICS import, opportunity review before drafting, card proof path, memory controls, local chat, review-only fulfillment recommendations. | Vite/React app, tested customer web experience view-model, one-primary-action customer journey, browser smoke coverage, runtime console-error guard, local deterministic workflows. | Hosted production auth, live account recovery UX, real provider import, real payment/order flow, accessibility audit evidence. |
| Admin website | `docs/platform-expansion-design.md`, `docs/requirements-traceability.md` R021-R029 | Provider inventory, readiness gates, production launch gates, external audit/payment/mobile/hosted/cloud proof registers, owner-lane admin operations workflow. | Admin panel surfaces catalog, runtime, readiness, credential-vault action, hosted token proof, alert/incident drills, and blocked providers without enabling network calls. | Real credential-vault secret storage, production incident/alert evidence, hosted admin token proof output, integration-owner signoff workflow in a deployed admin account. |
| Native iOS/Android app | `apps/mobile/README.md`, `src/mobileRenderReadiness.ts`, `docs/requirements-traceability.md` R004 | Expo shell, API URL config, customer app contract, render snapshot, offline sync model, release profile doctor. | Native source contract, tested render snapshot consumed by Expo root, mobile doctor, release doctor, 390px browser mobile-preview smoke. | React Native renderer-package output, emulator screenshots, EAS build execution, signed iOS/Android artifacts, store-review evidence. |
| Onboarding and calendars | `docs/onboarding-calendar-plan.md`, `src/onboardingCalendar.ts`, R030 | User stories, staged onboarding, Google Calendar OAuth readiness, iCloud manual ICS export, ready `Paste invite or ICS` path. | Typed contracts, customer-visible choices, tests, docs, no fake Google/Apple CTAs. | Live OAuth app approvals, callback/token storage, revocation drill, hosted provider sync worker, metadata schema proof against real provider payloads. |

## Provider And Fulfillment Workstreams

| Workstream | Design source | Tasks already defined | Current coverage | Implementation gaps |
| --- | --- | --- | --- | --- |
| Retail printer adapters | `src/retailPrinterAdapters.ts`, `src/providerCatalog.ts`, `docs/printer-pricing-research.md` | Walmart/FedEx/CVS/Walgreens adapter plans for price fetch, image upload, and order placement; manual fallback remains default. | Blocked adapter contracts with operation request blueprints, no-network runtime dry runs, retail readiness register, manual print package export. | Credentialed quote/upload/order APIs, vendor certification, kill-switch enforcement outside provider runtime, live quote snapshots, physical print QA. |
| Coupons and best price | `src/printerPricing.ts`, `src/fulfillmentRecommendation.ts`, `docs/printer-pricing-research.md` | Official Walgreens/CVS page collection, exact Walgreens/CVS print-link code/price proof targets, FMTC provider-feed target, provider-portal coupon application policy. | Review-only coupon offers and freshness rules; recommendations state coupons affect best price only after provider-portal application evidence; collector separates official coupon pages, exact print-entry links, and optional credentialed FMTC feed polling. | Same-cart provider portal proof, tax/stock/pickup-window confirmation, provider-feed credentials, licensed feed coverage validation, legal review of any scraping path. |
| Payments | `src/paymentReadiness.ts`, `src/paymentReadinessData.mjs` | Sandbox payment request contracts, no-card-storage boundary, webhook/refund/live approval gates. | Stripe/PayPal/Square/Adyen sandbox/no-network readiness, payment doctor, no live charge/refund/capture claims. | Processor live-mode approval, PCI/legal review, webhook signature/replay proof, refund/void/dispute drills, settlement reconciliation. |
| AI/image providers | `src/aiProviderReadiness.ts`, `src/providerRuntime.ts`, `src/customerChat.ts` | Text/image provider inventory, prompt/privacy/spend/QA gates, deterministic local chat fallback. | Local deterministic chat, provider dry-run contracts, no live model calls. | Live model allowlist, provider credentials, print QA run, spend/abuse monitoring, moderation evidence, model-output provenance in production storage. |

## Infrastructure And Evidence Workstreams

| Workstream | Design source | Tasks already defined | Current coverage | Implementation gaps |
| --- | --- | --- | --- | --- |
| Hosted API and database | `src/hostedApiReadiness.ts`, `src/reviewerDbSeedReadiness.ts`, `docs/deployment-evidence.md` | Vercel deployment evidence, hosted API proof register, reviewer seed proof register, Postgres doctors. | Local/isolated live Postgres doctors, process-level HTTP doctor, Vercel config/evidence register. | Public DB-backed hosted route proof, hosted token verification, Vercel env sync, hosted reviewer seed execution, backup/restore evidence. |
| Cloud artifact storage | `src/cloudArtifactProofReadiness.ts`, `infra/aws/artifact-store`, `docs/deployment-evidence.md` | Terraform/IAM/static bucket contract, signed URL proof gates, object-store doctors. | Filesystem, injected S3-compatible, live MinIO/S3-compatible write/read verification, static AWS IaC contract. | Applied bucket ARN/IAM proof, real signed URL cloud probes, access-log proof, secret-manager sync, restore drill. |
| Observability and audits | `src/observabilityReadiness.ts`, `src/externalAuditReadiness.ts` | Telemetry schema, redaction, sampling, alert-route, incident-review, external audit register. | Repo-local readiness doctors and tests keep live ingestion disabled. | Live telemetry project, alert delivery proof, retention enforcement, incident drill, external security/privacy/accessibility/legal audits. |
| Capacity and deployment | `src/capacityPlan.ts`, `infra/`, `docs/implementation-roadmap.md` | Local-dev, cheap-droplet, cloud-native, SaaS-scale profiles; Docker/Kubernetes manifests. | Deployment and capacity doctors validate local scaffolding and CI wiring. | Real droplet/Kubernetes deployment, measured load/cost evidence, production secrets, rollback procedure proof. |

## Graduation Rules

1. A workstream can merge only from its own branch/worktree with a focused
   commit and passing validation named in the commit trailers.
2. Customer-facing UI must not expose internal proof terms unless the surface is
   explicitly admin/reviewer-oriented.
3. Coupons may be displayed as source-listed offers, but they may affect best
   price only after same-cart provider-portal application evidence exists.
4. Live OAuth, model calls, payment charges, vendor uploads/orders, and external
   messages stay disabled until a doctor records credential, consent,
   revocation, kill-switch, and audit evidence.
5. Native mobile readiness remains contract-only until emulator render proof and
   signed artifacts are attached.
6. Main is pushed after each clean merge; if a browser/runtime issue appears
   after tests pass, it gets a separate fix before the next lane.
