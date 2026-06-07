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
| R004 | Support web, iOS, and Android as cross-platform product surfaces. | Explicit | Partially covered. Web is a runnable free MVP with customer/admin panels and a direct browser mobile UI route at `/?view=mobile` via `npm run mobile:web:demo`; the route is powered by the shared mobile customer contract and smoke-tested against JSON-manifest regression. Mobile is a tested Expo customer shell/config boundary with locale options, native render readiness register, and native build profile contract. Actual emulator proof and signed native artifacts remain open. | `src/App.tsx`; `src/styles.css`; `package.json`; `README.md`; `apps/mobile/README.md`; `apps/mobile/app.config.js`; `apps/mobile/src/App.tsx`; `apps/mobile/src/customerExperience.ts`; `src/mobileRenderReadiness.ts`; `src/mobileRenderReadinessData.mjs`; `scripts/mobile-render-readiness-doctor.mjs`; `tests/app-smoke.test.ts`; `tests/infra-contract.test.ts`; `tests/mobile-contract.test.ts`; `src/mobileRenderReadiness.test.ts`. |
| R005 | Model provider import for email/calendar with scoped access. | Explicit | Covered as free manual/ICS import, service contracts, cataloged Gmail/Google Calendar/Microsoft Graph/iCloud adapters, and no-network metadata-only request dry runs; not live OAuth. | `src/freeMvp.ts` `parseFreeImport`; `src/serviceKernel.ts` provider adapters; `src/providerCatalog.ts`; `src/providerRuntime.ts`; tests in `src/freeMvp.test.ts`, `src/serviceKernel.test.ts`, `src/providerCatalog.test.ts`, and `src/providerRuntime.test.ts`. |
| R006 | Detect event opportunities and preserve user approval/rejection decisions. | Explicit | Covered in UI state and deterministic service slice. | `buildOpportunity`; `OpportunitiesView` approve/snooze/dismiss; `importEvents`, `decideOpportunity`; Chrome smoke test. |
| R007 | Use relationship memory without hidden or creepy personalization. | Explicit | Covered as approved local UI memory and service repository with forget controls. | `addMemory`, `removeMemory`, Memory view; `InMemoryRelationshipMemoryRepository`, `approveRelationshipMemory`, memory tests. |
| R008 | Generate or validate 5x7 front, inside-left, inside-right, and back panels. | Explicit | Covered as free SVG export, local SVG/PDF/manifest print package export, and deterministic render packet contracts. | `generateCardDraft`, `buildPanelSvg`, `buildPrintExportPackage`, `validateCardDraft`; `renderPrintPacket`, `validatePrintLayout`; tests. |
| R009 | Validate layout safety, text overflow, DPI, pixels, and RTL-sensitive rendering. | Explicit | Covered by free MVP validation and service contract tests. | `validateCardDraft`; `validatePrintLayout`, `renderPrintPacket`, `src/serviceKernel.test.ts`; `render_packets` SQL constraints. |
| R010 | Keep Walgreens/retail behavior isolated behind a certified adapter boundary. | Explicit | Covered as hard-gated adapter contract. | `walgreensAdapter`, `adapterBlocksRealOrders`, `src/domain.test.ts`. |
| R011 | Never place real external orders until certification, live quote, approval, and kill-switch gates pass. | Explicit | Covered and blocked. Review-only public pricing observations and freshness reports are separated from live quotes. | `realOrdersEnabled: false`, `REAL_ORDER_KILL_SWITCH=disabled`, `transitionOrder`, `src/printerPricing.ts`, infra env examples, runtime doctor. |
| R012 | Model wrong-store, vendor rejection, event moved up, one-hour pickup, cancellation, and terminal states. | Explicit | Covered as state machine. | `OrderStatus`, `allowedOrderTransitions`, `transitionOrder`, `src/serviceKernel.test.ts`. |
| R013 | Separate dev/test/prod configuration and runtime readiness. | Explicit | Covered as config contracts and runtime doctor. | `getRuntimeConfig`, `validateRuntimeReadiness`, `scripts/validate-runtime-env.mjs`, Docker/Kubernetes manifests. |
| R014 | Provide cheap droplet and cloud-native deployment shapes. | Explicit | Covered as locally validated scaffolding, not deployed. The deployment doctor verifies local-dev, cheap-droplet, cloud-native, cloud-storage, runtime, and data lanes; the capacity-plan contract adds finite local-dev, cheap-droplet, cloud-native, and SaaS-scale planning profiles; and the production image serves API plus static web. | `src/capacityPlan.ts`, `src/capacityPlanData.mjs`, `scripts/capacity-plan-doctor.mjs`, `infra/docker-compose.droplet.yml`, `infra/k8s/app.yaml`, `infra/aws/artifact-store`, `Dockerfile`, `scripts/api-server.mjs`, `scripts/cloud-artifact-iac-doctor.mjs`, `scripts/deployment-readiness.mjs`, `infra/README.md`, `tests/infra-contract.test.ts`. |
| R015 | Provide durable database schema for users, providers, events, cards, memories, render packets, orders, consent, and audit. | Explicit | Covered as Postgres migration plus tested persistence contracts for auth sessions, account identities, account recovery challenges, idempotency replay, relationship-memory repository writes, render-packet repository writes, import-preview event/opportunity repository writes, card-project repository writes, manual handoff order/consent/event writes, data-request privacy/consent writes, queue jobs, render-packet artifact manifests, signed URL expiry, append-only audit, fake-pool Postgres runtime SQL behavior, isolated live Postgres route-auth/migration/runtime integration, process-level Postgres HTTP auth/idempotency/repository verification, and isolated account-auth storage/recovery integration. | `infra/migrations/001_initial_schema.sql`, `src/accountAuth.ts`, `src/accountAuth.test.ts`, `src/persistenceContracts.ts`, `src/persistenceContracts.test.ts`, `scripts/account-auth-doctor.mjs`, `scripts/api-runtime.mjs`, `scripts/postgres-runtime-doctor.mjs`, `scripts/postgres-integration-doctor.mjs`, `scripts/postgres-api-http-doctor.mjs`, `scripts/persistence-doctor.mjs`, `tests/infra-contract.test.ts`. |
| R016 | Include queues, workers, object storage, migrations, static production serving, and reviewer reset tooling. | Explicit | Covered as skeleton plus tested API/static server, executable memory-mode auth/idempotency/relationship-memory/render-packet/import-preview/card-project/manual-vendor-handoff/data-request runtime, injectable Postgres runtime contract doctor, isolated live Postgres route-auth integration doctor, process-level Postgres API HTTP doctor, isolated account-auth storage/recovery doctor, filesystem, injected S3-compatible, live MinIO/S3-compatible artifact-store write/read doctors, static AWS artifact bucket/IAM contract, cloud artifact proof readiness for applied bucket/IAM/signed-URL/access-log/secret-sync/restore-drill evidence, demo reset contract, and persistence-readiness boundary. | `scripts/worker.mjs`, `scripts/migrate.mjs`, `scripts/account-auth-doctor.mjs`, `scripts/artifact-store-doctor.mjs`, `scripts/artifact-store-s3-live-doctor.mjs`, `scripts/cloud-artifact-iac-doctor.mjs`, `scripts/cloud-artifact-proof-readiness-doctor.mjs`, `scripts/api-runtime.mjs`, `scripts/api-server.mjs`, `scripts/postgres-runtime-doctor.mjs`, `scripts/postgres-integration-doctor.mjs`, `scripts/postgres-api-http-doctor.mjs`, `scripts/demo-reset.mjs`, `scripts/persistence-doctor.mjs`, `scripts/serve-dist.mjs`, Docker Compose, Kubernetes manifests, `infra/aws/artifact-store`, `src/artifactStore.ts`, `src/cloudArtifactProofReadiness.ts`, `src/demoSeed.ts`, `tests/api-server.test.ts`, `tests/infra-contract.test.ts`. |
| R017 | Include regulatory, regional, consent, deletion, and vendor-sharing controls. | Explicit | Covered as decision contracts plus repository-backed data-request and consent mutation paths, not legal review. | `regionRequirements`, `evaluateRegulatoryDecision`, SQL `consent_records`, `data_requests`, `scripts/api-runtime.mjs`, `tests/api-server.test.ts`, `scripts/postgres-runtime-doctor.mjs`. |
| R018 | Document architecture, decisions, run commands, and reviewer handoff. | Inferred | Covered by current docs package. | README, this file, `docs/free-mvp-plan.md`, `docs/platform-expansion-design.md`, `docs/decisions.md`, `docs/verification.md`, `docs/handoff-notes.md`. |
| R019 | Keep AI/provider calls deterministic and dry-run testable. | Inferred | Covered by no live AI calls, deterministic extraction/rendering, contract-review fulfillment modes, and dry-run provider contracts that never call a network. | `src/freeMvp.ts`, `src/providerRuntime.ts`, `src/agentContracts.ts`, `runOperationalExtraction`, `stableId`, tests for free import, SVG generation, contract-review fulfillment modes, provider dry runs, weak-input blocking, and checksums. |
| R020 | Use production auth, real OAuth, vendor APIs, payment, live quotes, and physical certification. | Open | Partially modeled but not production-covered. Hosted auth adapters, durable account identity storage, hashed recovery challenges, route-scoped isolated Postgres session verification, payment no-network sandbox request contracts, payment readiness for no-payment fallback, sandbox provider contracts, webhook signatures, refund drills, settlement reconciliation, and no-card-storage boundaries, mobile render readiness for source render, viewport, RTL, emulator, and signed-artifact evidence gates, protected Vercel deployment evidence, hosted API proof readiness for Vercel env/DB/public-route/token/backup evidence gates, reviewer DB seed readiness for hosted seed/token/env/rollback proof gates, cloud artifact proof readiness for applied bucket ARN/IAM policy/signed URL/access-log/secret-sync/restore-drill evidence gates, a 13-item production launch-gate registry, a 15-item external audit readiness register, and an 8-item retail fulfillment readiness register exist, but production auth-provider token verification, OAuth approvals, live payment charges/refunds, vendor APIs, live quotes, live-applied cloud bucket/IAM proof, public DB-backed Vercel route proof, hosted reviewer DB seed execution, external audits, actual emulator proof, signed native artifact proof, retail certification, and physical certification remain intentionally blocked until evidence is attached. | README known gaps, `docs/free-mvp-plan.md`, `docs/handoff-notes.md`, `docs/deployment-evidence.md`, `src/productionReadiness.ts`, `src/externalAuditReadiness.ts`, `src/externalAuditReadinessData.mjs`, `scripts/external-audit-readiness-doctor.mjs`, `src/retailFulfillmentReadiness.ts`, `src/retailFulfillmentReadinessData.mjs`, `scripts/retail-fulfillment-readiness-doctor.mjs`, `src/paymentReadiness.ts`, `src/paymentReadinessData.mjs`, `scripts/payment-readiness-doctor.mjs`, `src/mobileRenderReadiness.ts`, `src/mobileRenderReadinessData.mjs`, `scripts/mobile-render-readiness-doctor.mjs`, `src/hostedApiReadiness.ts`, `src/hostedApiReadinessData.mjs`, `scripts/hosted-api-readiness-doctor.mjs`, `src/reviewerDbSeedReadiness.ts`, `src/reviewerDbSeedReadinessData.mjs`, `scripts/reviewer-db-seed-readiness-doctor.mjs`, `src/cloudArtifactProofReadiness.ts`, `src/cloudArtifactProofReadinessData.mjs`, `scripts/cloud-artifact-proof-readiness-doctor.mjs`, `src/accountAuth.ts`, `scripts/account-auth-doctor.mjs`, adapter kill switch, `src/providerCatalog.ts` blocked live vendor adapters and payment sandbox adapters, `src/providerRuntime.ts` payment dry runs, `src/productionReadiness.test.ts`, `src/externalAuditReadiness.test.ts`, `src/retailFulfillmentReadiness.test.ts`, `src/paymentReadiness.test.ts`, `src/mobileRenderReadiness.test.ts`, `src/hostedApiReadiness.test.ts`, `src/reviewerDbSeedReadiness.test.ts`, `src/cloudArtifactProofReadiness.test.ts`. |
| R021 | Provide customer and admin panels. | Explicit | Covered in the web UI. Customer panel starts with local workspace auth, reviewer/local bootstrap defaults, Paste invite or ICS import, gated Google Calendar readiness, manual Apple/iCloud export readiness, a tested one-prominent-action journey with compact supporting tasks that routes event review before card drafting, sendable deterministic local chat with customer-safe local/transcript copy, card proof path, locale readiness, production safety state, and customer-facing print recommendations for cheapest known price, fastest pickup candidate, and cheapest shipped option; admin panel shows provider coverage, a tested integration-owner workflow for credential vault, hosted token proof, alert drill, incident runbook, and external audit blockers, localization readiness, dry-run runtime readiness, env gates, CRM/workflow integration readiness, business engagement readiness, production launch gates, external audit readiness, AI provider readiness, observability readiness, retail fulfillment readiness, payment readiness, mobile render readiness, hosted API proof readiness, reviewer DB seed readiness, cloud artifact proof readiness, deployment readiness, capacity profiles, and blocked vendors. | `src/App.tsx`, `src/styles.css`, `src/reviewerBootstrap.ts`, `src/customerWebExperience.ts`, `src/adminOperations.ts`, `src/customerChat.ts`, `tests/app-smoke.test.ts`, `tests/infra-contract.test.ts`, `src/customerWebExperience.test.ts`, `src/adminOperations.test.ts`, `src/customerChat.test.ts`. |
| R022 | Load broad service-provider adapters for image generation, integrations, and text chat. | Explicit | Covered as a tested 121-adapter catalog plus executable no-network dry-run contracts with free local fallbacks, hosted-auth readiness, contact/address-book import readiness, CRM lifecycle integration readiness for CSV plus Salesforce/HubSpot/Zoho/Pipedrive/Dynamics/Shopify/Klaviyo/Mailchimp/ActiveCampaign/BigCommerce/WooCommerce/Square/Intercom, business engagement readiness, workflow automation readiness for Zapier/Make/Slack/Teams/Notion/Airtable/Google Sheets/n8n/Workato/Pipedream, notification readiness for email/SMS/WhatsApp/push/customer-messaging providers, payment sandbox readiness for Stripe/PayPal/Square/Adyen, payment readiness for 4 sandbox payment provider contracts and 1 no-payment fallback, AI provider readiness for 15 text and 15 image provider contracts, sendable local customer-chat session backed by the deterministic adapter, observability readiness for error/product/trace/metric/log providers, retail fulfillment readiness for 6 blocked retail-printer contracts and 2 manual fallbacks, explicit Walmart/FedEx/CVS/Walgreens retail adapter contracts for exact product URLs, price fetch, image upload, order placement, blocked request blueprints, and 12 certification packets for future certified transports, public printer pricing research with 12 official-source observations across 8 persisted source links, coupon provider/feed plus retailer coupon-page collection, provider-portal coupon-application proof policy, and freshness rules, local print package export, filesystem, injected S3-compatible, and live MinIO/S3-compatible artifact-store write/read verification, 88 credential-gated external providers, and hard-blocked live vendors; live provider/vendor/payment/workflow/customer-message calls are not implemented. | `src/providerCatalog.ts`, `src/providerRuntime.ts`, `src/retailPrinterContracts.ts`, `src/retailPrinterAdapters.ts`, `src/customerChat.ts`, `src/businessEngagementReadiness.ts`, `src/businessEngagementReadinessData.mjs`, `scripts/business-engagement-readiness-doctor.mjs`, `src/aiProviderReadiness.ts`, `src/aiProviderReadinessData.mjs`, `scripts/ai-provider-readiness-doctor.mjs`, `src/observabilityReadiness.ts`, `src/observabilityReadinessData.mjs`, `scripts/observability-readiness-doctor.mjs`, `src/retailFulfillmentReadiness.ts`, `src/retailFulfillmentReadinessData.mjs`, `scripts/retail-fulfillment-readiness-doctor.mjs`, `src/paymentReadiness.ts`, `src/paymentReadinessData.mjs`, `scripts/payment-readiness-doctor.mjs`, `src/printerPricing.ts`, `scripts/printer-pricing-doctor.mjs`, `src/printExport.ts`, `src/artifactStore.ts`, `scripts/artifact-store-s3-live-doctor.mjs`, `src/providerCatalog.test.ts`, `src/providerRuntime.test.ts`, `src/retailPrinterAdapters.test.ts`, `src/customerChat.test.ts`, `src/businessEngagementReadiness.test.ts`, `src/aiProviderReadiness.test.ts`, `src/observabilityReadiness.test.ts`, `src/retailFulfillmentReadiness.test.ts`, `src/paymentReadiness.test.ts`, `src/printerPricing.test.ts`, `src/printExport.test.ts`, `src/artifactStore.test.ts`, `infra/env/.env.example`, `docs/platform-expansion-design.md`, `docs/printer-pricing-research.md`. |
| R023 | Include a customer-facing text chat interface. | Explicit | Covered as a sendable deterministic local chat session in the customer panel and mobile shell, with redaction/no-network validation and dry-run request contracts for future model providers; live model providers remain gated. | `src/customerChat.ts`, `src/customerChat.test.ts`, `buildTextChatRuntime`, `CustomerPanelView`, `apps/mobile/src/customerExperience.ts`, `apps/mobile/src/App.tsx`, `src/providerCatalog.test.ts`, `src/providerRuntime.test.ts`, `tests/app-smoke.test.ts`, `tests/mobile-contract.test.ts`. |
| R024 | Include image-generation/render provider readiness. | Explicit | Covered by free browser SVG renderer plus dry-run gated OpenAI, Azure OpenAI, Amazon Bedrock, Gemini, Stability, Hugging Face, Replicate, Together, Ideogram, Leonardo, fal, Black Forest Labs, Adobe Firefly, Recraft, and Luma request contracts; `npm run ai:doctor` tracks model allowlist, prompt audit, image print QA, spend, evaluation, and rollout evidence; no live paid call. | `src/providerCatalog.ts`, `src/providerRuntime.ts`, `src/aiProviderReadiness.ts`, `scripts/ai-provider-readiness-doctor.mjs`, `CustomerPanelView`, `AdminPanelView`, `src/providerCatalog.test.ts`, `src/providerRuntime.test.ts`, `src/aiProviderReadiness.test.ts`, `tests/app-smoke.test.ts`. |
| R025 | Keep the system cheap and cloud-deployment ready through tested IaC. | Explicit | Partially covered. Free local fallback, executable local-dev/cheap-droplet/cloud-native/SaaS capacity profiles, droplet compose, Kubernetes manifests, env contract, static AWS artifact bucket/IAM contract, cloud artifact proof readiness register, object-store signing secret gates, filesystem/injected-S3/live-MinIO artifact-store write/read doctors, Vercel static/serverless deployment config, protected Vercel deployment evidence, hosted API proof readiness register, reviewer DB seed readiness register, runtime doctor, contract API doctor, memory API doctor, Postgres runtime contract doctor, isolated live Postgres route-auth integration doctor, Postgres API HTTP doctor, account-auth storage/recovery doctor, persistence doctor, deployment doctor, capacity doctor, cloud artifact IaC doctor, cloud artifact proof readiness doctor, CI verification workflow, and infra tests exist; hosted DB env vars, hosted reviewer seed execution, live-applied cloud bucket/IAM proof evidence, measured production capacity evidence, and public DB-backed Vercel route proof remain missing. | `src/capacityPlan.ts`, `src/capacityPlanData.mjs`, `src/hostedApiReadiness.ts`, `src/hostedApiReadinessData.mjs`, `src/reviewerDbSeedReadiness.ts`, `src/reviewerDbSeedReadinessData.mjs`, `src/cloudArtifactProofReadiness.ts`, `src/cloudArtifactProofReadinessData.mjs`, `scripts/capacity-plan-doctor.mjs`, `scripts/hosted-api-readiness-doctor.mjs`, `scripts/reviewer-db-seed-readiness-doctor.mjs`, `scripts/cloud-artifact-proof-readiness-doctor.mjs`, `infra/docker-compose.dev.yml`, `infra/docker-compose.droplet.yml`, `infra/k8s/app.yaml`, `infra/aws/artifact-store`, `infra/env/.env.example`, `vercel.json`, `api/[...path].mjs`, `docs/deployment-evidence.md`, `.github/workflows/verify.yml`, `scripts/account-auth-doctor.mjs`, `scripts/artifact-store-doctor.mjs`, `scripts/artifact-store-s3-live-doctor.mjs`, `scripts/cloud-artifact-iac-doctor.mjs`, `scripts/api-runtime.mjs`, `scripts/api-server.mjs`, `scripts/postgres-runtime-doctor.mjs`, `scripts/postgres-integration-doctor.mjs`, `scripts/postgres-api-http-doctor.mjs`, `scripts/persistence-doctor.mjs`, `scripts/deployment-readiness.mjs`, `src/artifactHandoff.ts`, `src/artifactStore.ts`, `tests/api-server.test.ts`, `tests/infra-contract.test.ts`, `docs/platform-expansion-design.md`. |
| R026 | Treat test coverage as an explicit quality goal. | Explicit | Covered for core, API, E2E matrix, capacity planning, external audit readiness, AI provider readiness, observability readiness, retail fulfillment readiness, payment readiness, mobile render readiness, hosted API proof readiness, reviewer DB seed readiness, cloud artifact proof readiness, business engagement readiness, admin operations, localization, persistence, orchestration, and mobile contract modules with V8 coverage thresholds in the standard check command; browser UI remains covered by smoke tests rather than unit coverage instrumentation. | `package.json` `test:coverage`, `check`, `e2e:coverage:doctor`, `admin:operations:doctor`, `ai:doctor`, `observability:doctor`, `retail:doctor`, `payment:doctor`, `mobile:render:doctor`, `hosted:api:doctor`, `reviewer:db:seed:doctor`, `cloud:artifact:proof:doctor`, and `business:engagement:doctor`; `vite.config.ts` coverage thresholds; `src/adminOperations.test.ts`; `src/e2eCoverage.test.ts`; `src/capacityPlan.test.ts`; `src/externalAuditReadiness.test.ts`; `src/aiProviderReadiness.test.ts`; `src/observabilityReadiness.test.ts`; `src/retailFulfillmentReadiness.test.ts`; `src/paymentReadiness.test.ts`; `src/mobileRenderReadiness.test.ts`; `src/hostedApiReadiness.test.ts`; `src/reviewerDbSeedReadiness.test.ts`; `src/cloudArtifactProofReadiness.test.ts`; `src/businessEngagementReadiness.test.ts`; `src/apiContracts.test.ts`; `src/localization.test.ts`; `src/persistenceContracts.test.ts`; `src/agentContracts.test.ts`; `tests/mobile-contract.test.ts`; `tests/infra-contract.test.ts`; `docs/verification.md`; `coverage/coverage-summary.json` generated by `npm run check`. |
| R027 | Support multiple languages and regional readiness. | Explicit | Covered as a launch-locale readiness contract for English (US), Spanish (US), Urdu, and Arabic across customer/admin web panels, API bootstrap/readiness payloads, and the mobile customer shell. RTL locales require layout validation, non-English/RTL copy stays human-review-gated, and live translation providers are disabled. | `src/localization.ts`; `src/localization.test.ts`; `scripts/localization-doctor.mjs`; `src/App.tsx`; `src/apiContracts.ts`; `scripts/api-server.mjs`; `apps/mobile/src/customerExperience.ts`; `apps/mobile/src/App.tsx`; `tests/app-smoke.test.ts`; `tests/mobile-contract.test.ts`; `.github/workflows/verify.yml`. |
| R028 | Let businesses use popular CRM/customer systems for lifecycle card campaigns. | Explicit | Covered as admin-only CRM lifecycle contracts for local CSV export plus Salesforce, HubSpot, Zoho CRM, Pipedrive, Dynamics 365 Sales, Shopify, Klaviyo, Mailchimp, ActiveCampaign, BigCommerce, WooCommerce, Square, and Intercom customer/order metadata reads, plus a business engagement readiness register that tracks CRM lifecycle source, trigger normalization, card-opportunity review, workflow payloads, customer message channels, consent/suppression gates, and campaign feedback. Birthday, purchase-anniversary, and warranty-anniversary triggers are metadata-only, opt-in gated, suppression-list gated, tenant-reviewed, revocation-aware, and no-network in this repo state; live CRM OAuth, customer messages, CRM writeback, and production campaign analytics remain unclaimed. | `src/providerCatalog.ts`; `src/providerRuntime.ts`; `src/providerGovernance.ts`; `src/businessEngagementReadiness.ts`; `src/businessEngagementReadinessData.mjs`; `scripts/business-engagement-readiness-doctor.mjs`; `src/providerCatalog.test.ts`; `src/providerRuntime.test.ts`; `src/providerGovernance.test.ts`; `src/businessEngagementReadiness.test.ts`; `infra/env/.env.example`; `docs/platform-expansion-design.md`. |
| R029 | Let businesses connect workflow and workspace systems for review queues. | Explicit | Covered as admin-only no-network workflow contracts for local payload export plus Zapier, Make, Slack, Microsoft Teams, Notion, Airtable, Google Sheets, n8n, Workato, and Pipedream. Payloads are aggregate/metadata-only, opt-in gated, suppression-list gated, redacted, and live sends remain disabled. | `src/providerCatalog.ts`; `src/providerRuntime.ts`; `src/providerGovernance.ts`; `src/providerCatalog.test.ts`; `src/providerRuntime.test.ts`; `src/providerGovernance.test.ts`; `infra/env/.env.example`; `tests/app-smoke.test.ts`. |
| R030 | Define user stories, onboarding processes, and popular calendar integration planning. | Explicit | Covered as typed onboarding stories, ordered onboarding stages, customer-visible onboarding choices, and Google Calendar/iCloud readiness contracts. Google Calendar is credential-gated behind OAuth setup and `calendar.events.readonly` / `https://www.googleapis.com/auth/calendar.events.readonly`; iCloud is manual ICS export contract-only. Web and mobile surfaces present `Paste invite or ICS` as the ready path and do not expose live Google/Apple sign-in CTAs. No fake live OAuth, provider callback, Apple credential storage, background sync, card project creation, memory creation, vendor sharing, payment, or order is enabled by these contracts. | `src/onboardingCalendar.ts`; `src/onboardingCalendar.test.ts`; `src/App.tsx`; `apps/mobile/src/customerExperience.ts`; `apps/mobile/src/App.tsx`; `tests/app-smoke.test.ts`; `tests/mobile-contract.test.ts`; `docs/onboarding-calendar-plan.md`; `docs/product-brief.md`; `docs/implementation-roadmap.md`. |

## Acceptance Criteria Covered By Tests

- Weak/generic source text cannot create a successful print packet.
- Walgreens adapter is blocked unless physical certification, live quote, approval, and explicit policy gates exist.
- Metadata-only provider import rejects raw email/calendar content.
- Revoked or unsupported provider connections import no events.
- Card projects are created only after explicit `generate` decisions.
- Approved memories are filtered by recipient and can be forgotten.
- RTL locales are marked layout-sensitive and mismatches are blocked.
- Launch localization supports English (US), Spanish (US), Urdu, and Arabic on
  web, API, and mobile surfaces with complete bundles, human copy-review gates,
  and live translation disabled.
- Order lifecycle rejects invalid transitions and models recovery paths.
- Regional vendor-share policy blocks sharing without approval.
- Runtime config separates cheap droplet/dev behavior from cloud/prod behavior.
- Business CRM lifecycle sync stays admin-only, metadata-only, opt-in gated, and
  covered by local CSV fallback plus six credential-gated CRM contracts.
- Business workflow integrations stay admin-only, metadata-only, opt-in gated,
  and covered by local payload export plus seven credential-gated workflow
  contracts.
- Production launch gates and the external audit readiness register track live
  auth, OAuth, AI/image generation, vendor quotes, payments/refunds, direct
  retail ordering, telemetry, cloud IAM, deployed Postgres, Vercel DB access,
  native mobile proof, external audits, retail certification, and print
  certification without enabling live behavior or public production claims by
  default.
- Cloud artifact proof readiness tracks applied bucket ARN, IAM policy output,
  signed URL cloud probe, access-log proof, secret-manager env sync, and
  retention/restore drill requirements while keeping Terraform apply and all
  applied-cloud proof claims at zero.
- Infra manifests include app, worker, database, queue, storage, migrations, probes, and kill-switch controls.
- Deployment doctor reports local-dev, cheap-droplet, cloud-native,
  cloud-storage, runtime, and data lanes ready, and the droplet app/worker share
  persistent object storage.
- Capacity plan doctor reports local-dev, cheap-droplet, cloud-native, and
  SaaS-scale profiles ready with finite limits, queue/object-store posture,
  admin/API surfaces, CI wiring, and no live provider calls or real orders.
- CI workflow runs full repository check, deployment doctor, contract API
  doctor, capacity doctor, memory API doctor, Postgres runtime contract doctor, live Postgres
  integration doctor, Postgres API HTTP doctor, account-auth doctor, cloud
  artifact IaC doctor, cloud artifact proof readiness doctor, localization
  doctor, persistence doctor, worker readiness, mobile doctor, mobile render
  readiness doctor, and mobile release doctor on pushes to `main` and pull
  requests.
- API server exposes tested health, route catalog, customer/admin bootstrap,
  mobile bootstrap with next-action, queue, memory-review, print-proof,
  pricing, and offline-sync state, provider
  readiness, and idempotent mutation contract endpoints with real orders and
  external calls disabled.
- API memory runtime enforces Bearer sessions on non-public routes and
  `X-Idempotency-Key` persistence/replay/conflict handling on mutations.
- API Postgres runtime contract doctor exercises session lookup, wrong-role
  blocking, idempotency insert/replay/conflict, render-packet insert,
  import-preview insert, relationship-memory insert, card-project insert, manual
  handoff order/consent/event insert, data-request privacy/consent insert, audit
  insert, and queue-job insert through an injected fake pool.
- API live Postgres integration doctor applies the committed migration to an
  isolated database, seeds auth sessions, verifies all 6 repository-backed
  customer routes plus admin readiness through real Postgres sessions, and
  exercises the same auth,
  idempotency, relationship-memory, render-packet, import-preview, card-project,
  manual handoff, data-request, audit, and queue path through the real `pg`
  runtime.
- API Postgres HTTP doctor starts the real API server in Postgres mode against
  an isolated migrated database, verifies public health/routes, admin/customer
  Bearer auth, missing/wrong-role auth blocking, missing idempotency blocking,
  all 6 repository-backed customer HTTP mutations, idempotency replay/conflict,
  audit rows, queue jobs, and repository table counts.
- Account auth doctor applies the committed migration to an isolated database,
  stores a hosted identity without raw profile data, enforces provider-subject
  uniqueness, stores a hashed recovery challenge, creates a durable session, and
  appends audit.
- Persistence contracts map 13 schema-backed API routes to auth-session,
  account identity, account recovery, idempotency, relationship-memory
  repository, render-packet repository, import-preview repository, card-project
  repository, manual handoff order/consent/event, data-request privacy/consent,
  queue-job, and audit-log tables.
- Mobile shell resolves API configuration from environment.
- Mobile customer app keeps the native shell customer-facing with a tested
  render snapshot for account import, next-action summary, card queue items,
  approval controls, memory-review items, card assistant, print-proof checks,
  render, review-only pricing, offline idempotent API sync, and handoff sections
  while proof/readiness diagnostics stay in contract data, doctors, and admin/web
  proof surfaces.
- Mobile doctor validates the customer experience contract and fails if the
  repo-local real-order kill switch is enabled.
- Local workspace auth works without external providers.
- ICS/manual import produces a reviewable opportunity.
- Card studio renders four 1500 x 2100 SVG-ready panels.
- Print package export produces four SVG artifacts, a combined 5x7 PDF proof,
  and a checksum manifest without network calls or real orders.
- Render-packet artifact handoff produces object-store URIs, HMAC-signed URL
  contracts, expiry metadata, schema fields, temporary filesystem write/read
  verification, injected S3-compatible write/read contract verification, and
  live MinIO/S3-compatible write/read doctor verification.
- Admin demo reset produces deterministic reviewer fixture contracts across 14
  tables and 17 rows without production credentials or live calls.
- Manual vendor handoff blocks real orders and live vendor API claims.
- Public printer pricing research compares 12 official-source
  Walgreens/CVS/FedEx/Walmart/Staples/Office Depot observations across 8 source
  links, reports source freshness, keeps `liveQuote: false`, requires checkout
  confirmation, collects credentialed FMTC/Rakuten provider-feed and official
  retailer page coupon candidates, keeps exact rendered Walgreens/CVS print-link
  coupon proof targets, and applies coupons to best-price ranking only when
  structured provider-portal evidence proves the same cart terms.
- Customer/admin panels expose the local customer path and provider operations state; the customer path is backed by a tested view-model that permits exactly one primary action per state and routes event review before card drafting.
- Customer/admin panels expose localization readiness, including RTL and human
  copy-review counts.
- Adapter readiness shows free-ready substitutes, credential-gated providers, contract-only adapters, and blocked live vendor integrations.
- Provider catalog covers 121 adapters: 18 ready-local, 88 credential-gated, 9
  contract-only, and 6 blocked.
- Admin/adapters UI surfaces no-network runtime readiness, blocked dry-run
  state, missing credential references, and owner-lane admin operation actions
  for credential vault, hosted token proof, alert route drill, and incident
  review evidence.
- Provider runtime dry runs cover every catalog adapter, redact contact/payment
  data before external provider contracts, keep imports metadata-only, prepare
  payment provider requests only as sandbox/no-network contracts, prepare
  observability provider requests only as sampled/redacted no-network contracts,
  and never prepare live vendor order requests.
- Onboarding calendar contracts cover Google Calendar and iCloud user stories,
  preserve consent-before-import and import-before-generation stage ordering,
  align adapter IDs to the provider catalog, and keep live OAuth/provider request
  factories disabled.
- Core, API, localization, persistence, orchestration, and mobile contract
  coverage thresholds are enforced in `npm run check`: 90% statements, 80%
  branches, 90% functions, and 90% lines.

## Remaining Gaps

- No live production user auth or delivered account recovery flow; durable
  account identity and hashed recovery challenge storage are covered by doctor.
- No live OAuth consent flow.
- No deployed production Postgres API integration or production hosted
  account-token verification outside the isolated live Postgres route-auth,
  Postgres API HTTP, and account-auth doctors.
- AI provider readiness is covered as repo-local text/image adapter inventory,
  model allowlist, prompt safety, privacy, print QA, spend, evaluation, and
  rollout gates; no live text-chat model call, live image-generation provider
  call, model output QA run, or production AI traffic is claimed.
- No physical print QA; local SVG/PDF/manifest export, signed artifact handoff
  contracts, temporary filesystem object-store write/read verification, injected
  S3-compatible write/read contract verification, live CI/local MinIO/S3-
  compatible doctor coverage, static AWS artifact bucket/IAM, and Cloud artifact
  proof readiness are covered; live-applied production cloud IAM is not.
- No live payment charge/refund or vendor quote/order/refund integration.
- Observability readiness is covered as repo-local telemetry schema, redaction,
  sampling, retention, provider-contract, alert-route, and incident-review
  gates; no live observability ingestion, alert delivery, retention enforcement,
  or incident-response drill is claimed.
- Public printer prices are review-only observations with a 30-day source
  freshness contract and coupon-source collection. Coupon collection includes
  official Walgreens/CVS pages, exact rendered Walgreens/CVS print entrypoint
  evidence, and credential-gated FMTC/Rakuten provider-feed targets. They are not
  live quote, tax, stock, pickup-window, live checkout automation, or coupon
  provider-portal application guarantees. Coupon discounts require structured
  same-product, quantity, fulfillment mode, account state, subtotal, and
  no-order-placed provider-portal evidence before best-price ranking can use
  them.
- Non-English and RTL localization is readiness-gated only; professional
  translation QA, native RTL render proof, and live translation providers are
  not covered.
- No external legal/security/privacy/accessibility audit; repo-local baseline
  doctor covers concrete security/privacy/accessibility signals, and the
  external audit readiness register tracks missing evidence without allowing
  public production claims.
- Browser UI smoke behavior is not included in the V8 unit coverage percentage.
- No real droplet or Kubernetes deployment has been executed.
- Hosted GitHub Actions verification exists for main pushes, but no real droplet
  or Kubernetes deployment has been executed.
- No actual React Native renderer-package output, emulator run, EAS/native
  build, or signed mobile artifact has been produced; mobile render snapshot
  validation, mobile render readiness, EAS profiles, and release doctor are
  covered as repo-local contracts.
