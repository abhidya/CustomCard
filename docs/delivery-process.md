# Delivery Process

This document records how the ambiguous brief was converted into the current
repo state. It is process evidence, not marketing.

## Recovery

- Read the existing README, product docs, roadmap, implementation files, tests,
  infra, and mobile shell.
- Inspected local history artifacts under `.omx/` and Codex attachment history
  to recover the seed prompt, user corrections, review gates, and verification
  evidence.
- Preserved the product-driving prompt excerpts in `docs/brief-context.md` while
  avoiding private card-message content.

## Requirements Expansion

- Converted the recovered prompt into explicit requirements in
  `docs/brief-context.md`.
- Mapped requirements to source, docs, tests, and gaps in
  `docs/requirements-traceability.md`.
- Kept external-access requirements open when the repo lacks credentials,
  deployment evidence, sandbox tests, or physical print certification.

## Design And Decision Records

- Recorded conservative implementation defaults in `docs/decisions.md`.
- Chose a free local MVP plus contract-first service skeleton because the prompt
  asks for a production-shaped service but no live provider/vendor access was
  available.
- Kept provider, AI, database, deployment, and vendor choices behind typed
  contracts or runtime configuration where practical.

## Implementation Lanes

- Discovery lane: recovered source prompt, repo history, current files, and
  hidden local state.
- Product lane: documented the product brief, storyboard chapters, and MVP
  roadmap.
- Architecture lane: modeled local prototype, cheap droplet, and SaaS-scale
  profiles.
- Implementation lane: built the Vite/React free local MVP, typed domain model,
  service kernel, infrastructure skeleton, and mobile shell boundary.
- Verification lane: added domain, service-kernel, UI smoke, and infra contract
  tests.
- Review lane: recorded known gaps and refused live-production claims where
  evidence is missing.
- Communication lane: wrote `docs/handoff-notes.md` with a reviewer path and
  suggested submission note.

## Review History Recovered

Local `.omx` logs show the repo moved through these phases:

- Empty or docs-only import of the CustomCard concept.
- A generic prototype that was rejected as insufficiently aligned.
- A rebuilt blueprint workbench centered on event timing, memory, print
  contracts, and fulfillment safety.
- A service-kernel and infra pass adding provider import contracts, approved
  memory, render validation, order lifecycle, regional policy, migrations, and
  deployment manifests.
- A free-MVP polish pass adding local workspace auth, manual/ICS import, deterministic
  card generation, SVG export, manual vendor handoff, and adapter readiness.
- Final verification and repository check-in.

## Evidence Boundary

The current repo demonstrates a reviewable free local MVP and production
skeleton. It does not demonstrate production auth, live OAuth, live AI
generation, live vendor quote/order behavior, deployment, payment, legal
approval, external security review, or physical print certification.
