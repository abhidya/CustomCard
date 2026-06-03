# Platform Expansion Design

Date: 2026-06-03

## Objective

Expand the free CustomCard MVP toward the requested end state: broad provider
adapter coverage, customer and admin panels, a customer mobile app surface,
tested UI/UX, and cheap cloud-deployment readiness. This pass keeps the free
local path runnable while making credential-gated provider work explicit and
testable.

## Design Before Build

The system remains adapter-first:

- Customer surfaces consume capability groups: event import, text chat,
  image/render, memory, and handoff.
- Admin surfaces consume the same adapter catalog to see readiness, required
  environment variables, safety gates, blocked live-order providers, and cloud
  runtime shape.
- Provider adapters are data contracts first. Live network calls are not enabled
  until credentials, consent, logging, cost controls, and security review exist.
- Each capability must have at least one free local fallback so review, tests,
  and demos do not require paid APIs.

## Provider Coverage

The canonical list lives in `src/providerCatalog.ts`. It covers:

- Auth: local demo auth plus hosted auth contract.
- Event import: ICS/manual note, Gmail, Google Calendar, Microsoft Graph mail,
  Microsoft Graph calendar, and iCloud ICS fallback.
- Text chat: deterministic local chat plus OpenAI Responses, Anthropic
  Messages, Google Gemini, Hugging Face, and self-hosted OpenAI-compatible
  endpoints.
- Image generation/rendering: browser SVG renderer plus OpenAI Images, Google
  Gemini image generation, Stability AI, Hugging Face, Replicate, and
  object-store render packets.
- Memory: local relationship memory plus Postgres memory contract.
- Vendor handoff: manual upload ready; Walgreens, CVS, and FedEx live ordering
  blocked.
- Notifications: local UI status ready; transactional email contract gated.
- Cloud runtime: local Docker Compose ready; droplet Compose and Kubernetes
  manifests contract-ready.

Official documentation anchors used for the adapter contracts:

- OpenAI Responses API: https://platform.openai.com/docs/api-reference/responses
- OpenAI Images API: https://platform.openai.com/docs/api-reference/images
- Anthropic Messages API: https://docs.anthropic.com/en/api/messages
- Google Gemini API: https://ai.google.dev/gemini-api/docs
- Google Gemini image generation: https://ai.google.dev/gemini-api/docs/image-generation
- Gmail API guides: https://developers.google.com/gmail/api/guides
- Google Calendar API overview: https://developers.google.com/calendar/api/guides/overview
- Microsoft Graph Outlook mail: https://learn.microsoft.com/en-us/graph/outlook-mail-concept-overview
- Microsoft Graph Outlook calendar: https://learn.microsoft.com/en-us/graph/outlook-calendar-concept-overview
- Hugging Face Inference Providers: https://huggingface.co/docs/inference-providers/index
- Stability image API: https://platform.stability.ai/docs/getting-started/stable-image
- Replicate HTTP API: https://replicate.com/docs/reference/http

## Customer Panel

The customer panel is the first web surface. It shows the current card
opportunity, local workspace state, panel count, handoff vendor, quick actions
for the free workflow, a deterministic customer chat transcript, image/render
choices, and ready local fallbacks.

The customer path stays cheap:

- No live AI chat call.
- No live image-generation call.
- No provider OAuth required.
- No real vendor order.
- SVG export and manual handoff remain the working path.

## Admin Panel

The admin panel turns the adapter catalog into an operations surface:

- Total adapters and capability count.
- Ready, credential-gated, contract-only, and blocked counts.
- Per-capability local fallback coverage.
- Required env vars for provider and deployment readiness.
- Gated provider queue.
- Cloud runtime adapters.
- Blocked live-order vendors.

This is intentionally not a settings page that pretends credentials are present.
It is a readiness console for what must be connected, reviewed, and certified.

## Mobile Customer App

`apps/mobile/src/App.tsx` is now a customer app surface instead of a placeholder.
It mirrors the web customer panel with card queue, memory review, local scripted
chat, image/render status, and manual handoff. Native builds and platform
signing remain outside the repo-local verification loop.

## Cheap Cloud Deployment Shape

The low-cost path remains:

1. Local development with Docker Compose, Postgres, Redis, and MinIO.
2. Small droplet Compose deployment for early hosted validation.
3. Kubernetes web and worker manifests when the app needs cloud-native scaling.

The runtime remains fail-closed:

- `REAL_ORDER_KILL_SWITCH=disabled` keeps live orders off.
- Provider keys are named in `infra/env/.env.example` but not committed.
- Production Kubernetes secrets are annotated for pre-created secret-manager
  provisioning.
- Backups, observability, and managed secrets remain required before production
  traffic.

## Verification Strategy

Implemented checks:

- `src/providerCatalog.test.ts` validates catalog coverage, local fallbacks,
  external provider docs/env gates, admin model, customer model, and blocked
  vendor status.
- UI smoke tests cover customer/admin panels, the core local workflow, mobile
  overflow, and adapter matrix visibility.
- Infra tests require provider env vars and mobile customer panel evidence.

Remaining high-risk work:

- No live OAuth flow.
- No live AI/image provider call.
- No payment, quote, or live order adapter.
- No native iOS/Android build artifact.
- No cloud deployment proof against a real cluster.
- No legal/security/privacy/accessibility audit.
