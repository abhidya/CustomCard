<p align="center">
  <img src="public/icon.svg" width="72" alt="CustomCard icon" />
</p>

<h1 align="center">CustomCard</h1>

<p align="center">
  <strong>Relationship-aware greeting cards, from event signal to print-ready handoff.</strong>
</p>

<p align="center">
  CustomCard is a runnable local MVP and production-shaped skeleton for an AI card concierge:
  it spots card-worthy moments, helps compose personal notes, renders 5x7 panels, and prepares a safe retail-print handoff.
</p>

<p align="center">
  <a href="https://github.com/abhidya/CustomCard/actions/workflows/verify.yml"><img alt="Verify CustomCard" src="https://github.com/abhidya/CustomCard/actions/workflows/verify.yml/badge.svg" /></a>
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" />
  <img alt="Status" src="https://img.shields.io/badge/status-local%20MVP%20%2B%20contract%20skeleton-blue" />
</p>

<p align="center">
  <a href="#quick-start">Quick start</a>
  · <a href="#what-works-today">What works</a>
  · <a href="#architecture">Architecture</a>
  · <a href="#verification">Verification</a>
  · <a href="#project-map">Docs</a>
  · <a href="CONTRIBUTING.md">Contributing</a>
  · <a href="SECURITY.md">Security</a>
</p>

![CustomCard desktop workflow](docs/evidence/customcard-desktop.png)

## Why CustomCard

Buying a generic card is fast but impersonal. Writing a great one is meaningful,
but usually happens under time pressure. Retail print shops can produce nice
cards, but users still have to write the message, design the panels, format the
files, and avoid bad checkout surprises.

CustomCard is the product wedge between those worlds:

- Detect the moments where a card is warranted.
- Ask for only the relationship context that improves the card.
- Generate inspectable card copy and visual direction.
- Produce print-safe 5x7 panels and a checksum-backed render packet.
- Recommend pickup or shipping paths without placing a real order before certification.

## What Works Today

| Surface | Current state |
| --- | --- |
| Web app | Vite, React, and TypeScript app with customer, studio, print, mobile-preview, legal, and operations surfaces. |
| Local onboarding | Browser-local workspace auth plus manual invite text, ICS, vCard, and CSV import paths. |
| Card workflow | Opportunity review, relationship memory review, deterministic card draft generation, and 5x7 panel export. |
| Print handoff | Four 1500 x 2100 SVG panels, local PDF proof, checksum manifest, and manual printer checklist. |
| Fulfillment recommendations | Review-only public pricing and pickup/shipping recommendation contracts for retail printers. |
| Admin readiness | Provider catalog, readiness registers, production gates, deployment posture, and doctor scripts. |
| API skeleton | Contract, memory, fake-pool Postgres, isolated live Postgres, idempotency, audit, queue, and artifact-store boundaries. |
| Mobile shell | Expo customer app contract plus a browser-inspectable mobile route at `/?view=mobile`. |
| Deployment shape | Vercel/serverless route, static API server, Docker Compose, Kubernetes manifests, Postgres migration, worker, and object-store contracts. |

## Intentional Boundaries

The current repo is honest about what it does not prove yet.

| Area | Boundary |
| --- | --- |
| Live auth and OAuth | Credential-gated. Local review uses browser-local workspace state. |
| Live AI/image generation | Optional sidecar/server routes exist, but the default app uses deterministic no-cost generation. |
| Retail ordering | Disabled by design. The kill switch stays off until vendor certification, payment, refund, and physical print proof exist. |
| Live quotes and coupons | Public observations and same-cart proof contracts are modeled; checkout confirmation is still required. |
| Payments | Readiness contracts exist; live charge, refund, capture, PCI, and settlement proof are not claimed. |
| External audits | Repo-local security, privacy, and accessibility checks exist; external legal/security/privacy/accessibility audits are not claimed. |
| Native releases | Expo source and release contract exist; signed iOS/Android artifacts and emulator screenshot proof are still gated. |

## Quick Start

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open the Vite URL printed by the dev server. The app opens into the free local
workflow and does not require paid AI, payment, retail, CRM, email, or cloud
credentials.

To open the mobile customer UI in a desktop browser:

```sh
npm run mobile:web:preview
```

That launches the same app at `/?view=mobile`. The Expo dev-server URL is for
native runtime metadata and can render a JSON manifest in desktop browsers; the
Vite mobile route is the browser review path.

## Optional Provider Setup

The tracked `.env.example` is intentionally frontend-only. It includes the
public Clerk key placeholder, legal-policy link slots, optional AI sidecar URL,
server-owned Cloudflare Workers AI settings, and Google Calendar OAuth start
settings such as `GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY`.

Full backend/runtime variables live in `infra/env/.env.example`, including
Postgres, queue, object storage, signed artifact URLs, API runtime mode, session
tokens, and provider credentials. Runtime scripts fail closed when required
variables are missing or still use placeholder values.

Walgreens hosted checkout can be enabled in sandbox with server-only env values:
`WALGREENS_VENDOR_MODE=sandbox`, `WALGREENS_API_KEY`,
`WALGREENS_AFF_ID`, and `PUBLIC_APP_ORIGIN`. Keep real values in `.env.local`,
`infra/env/.env`, or Vercel environment variables only; tracked examples use
placeholders.

Useful modes:

```sh
# Static/local reviewer mode
CUSTOMCARD_API_RUNTIME=contract npm run api:doctor

# Memory-mode API contract
npm run api:doctor:memory

# Postgres runtime contract
npm run api:doctor:postgres
```

## Product Walkthrough

1. Create or enter a local workspace.
2. Paste an invite or ICS event.
3. Review the detected card opportunity.
4. Approve, snooze, or dismiss the opportunity.
5. Review visible relationship memory before generation.
6. Generate deterministic card copy and panel directions.
7. Export the 5x7 render packet.
8. Compare pickup/shipping recommendations.
9. Use the manual checkout checklist. No order is placed by the app.

![CustomCard studio](docs/evidence/customcard-studio.png)

## Architecture

```mermaid
flowchart LR
  Web["React web app"]
  Mobile["Expo mobile shell"]
  Domain["Typed domain contracts"]
  Kernel["Service kernel"]
  API["API contracts and routes"]
  Persistence["Postgres and memory runtimes"]
  Artifacts["Render packet object store"]
  Providers["No-network provider runtime"]
  Doctors["Readiness doctors"]

  Web --> Domain
  Mobile --> Domain
  Domain --> Kernel
  Kernel --> API
  API --> Persistence
  API --> Artifacts
  Kernel --> Providers
  Providers --> Doctors
  Persistence --> Doctors
  Artifacts --> Doctors
```

The important boundary is deliberate: provider adapters and retail-printer paths
prepare redacted request contracts and handoff packets in this stage. They do
not make live calls, charge cards, send messages, ingest telemetry, or place
orders unless a future release explicitly unlocks those gates with evidence.

## Verification

For the broad local check:

```sh
npm run check
```

That runs the Vitest suite, coverage gate, production build, and high-severity
dependency audit.

Focused readiness checks:

```sh
npm run deployment:doctor
npm run runtime:doctor
npm run api:doctor
npm run security:doctor
npm run customer:accessibility:doctor
npm run e2e:coverage:doctor
npm run ai:doctor
npm run observability:doctor
npm run retail:doctor
npm run payment:doctor
npm run mobile:render:doctor
npm run hosted:api:doctor
npm run reviewer:db:seed:doctor
npm run business:engagement:doctor
npm run provider:governance:doctor
npm run provider:operations:doctor
npm run capacity:doctor
npm run printer:pricing:doctor
npm run localization:doctor
npm run persistence:doctor
npm run demo:doctor
```

Credentialed/live-local checks exist for Postgres, account auth, and
S3-compatible artifact storage. They are opt-in and guarded by explicit
environment flags; see [docs/verification.md](docs/verification.md).

## Deployment

The app has three deployment shapes:

- **Local static reviewer mode**: Vite app plus contract-mode API behavior.
- **Cheap single-host mode**: Docker Compose, Postgres, worker, queue, and object-store posture.
- **Cloud/serverless mode**: Vercel static build plus `/api/*` serverless route, hosted Postgres, and S3/R2-compatible artifact storage.

`vercel.json` builds the Vite app into `dist` while leaving `/api/*` for the
`api/[...path].mjs` serverless function; the SPA fallback explicitly excludes
API paths. Static hosting works without database credentials; DB-backed hosted
API proof requires environment sync, deployment-protection handling, and hosted
DB doctor evidence.

## Project Map

| Path | Purpose |
| --- | --- |
| `webapp/` | Main React app shell, routes, views, theme, and CSS. |
| `src/` | Domain contracts, readiness registers, API contracts, provider runtime, tests, and orchestration. |
| `scripts/` | Doctors, runtime validators, API/static server, migration runner, worker, and collectors. |
| `api/[...path].mjs` | Vercel serverless API entrypoint. |
| `infra/` | Docker, Kubernetes, migration, env, and AWS artifact-store IaC contracts. |
| `apps/mobile/` | Expo mobile customer shell and release doctor. |
| `card_gen/` | Optional Python card-generation sidecar. |
| `docs/` | Product brief, decisions, verification, deployment evidence, roadmap, requirements, and operational notes. |
| `docs/evidence/` | Screenshot and generated-card comparison artifacts used for review. |

Start here:

- [Product brief](docs/product-brief.md)
- [Design source of truth](DESIGN.md)
- [Domain vocabulary](CONTEXT.md)
- [Decisions](docs/decisions.md)
- [Verification](docs/verification.md)
- [Deployment evidence](docs/deployment-evidence.md)
- [Implementation roadmap](docs/implementation-roadmap.md)
- [Infrastructure](infra/README.md)
- [Mobile shell](apps/mobile/README.md)

## Contributing

Contributions should preserve the project boundary: make the local MVP easier to
review, improve contract coverage, or move a gated production path forward with
evidence. Do not enable live provider calls, live ordering, live payments, or
production claims without the matching readiness proof.

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, testing, and PR expectations.

## Security

Do not commit secrets, live provider tokens, customer data, card message content,
or retail checkout artifacts with private information. The app should fail
closed when required production variables are missing or placeholders.

See [SECURITY.md](SECURITY.md) for vulnerability reporting and current security
boundaries.

## License

No open-source license has been declared yet. Until a license is added, all
rights are reserved by default.
