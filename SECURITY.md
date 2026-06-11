# Security Policy

## Supported version

Security review applies to the current `main` branch and active pull requests.
There are no published release lines yet.

## Reporting a vulnerability

If GitHub private vulnerability reporting is enabled for this repository, use it.
Otherwise, open a minimal public issue asking for a private security contact.
Do not include exploit details, secrets, customer data, private card content, or
live checkout artifacts in a public issue.

Useful report details:

- Affected surface or file path.
- Impact summary.
- Reproduction steps using dummy data.
- Whether secrets, customer data, payments, ordering, or external providers are involved.
- Suggested fix, if known.

## Current security boundary

CustomCard is a local MVP and production-shaped skeleton. The default workflow
does not require live provider credentials and should not place orders, charge
cards, send messages, ingest telemetry, or make live AI/CRM/retail calls.

Important guardrails:

- Secrets must remain server-side. Do not expose provider secrets through `VITE_*`.
- Placeholder secrets should fail closed in runtime and doctor scripts.
- Raw customer content and generated card bodies should not be committed.
- Signed artifact URLs, object-store keys, and checkout evidence must not expose
  private data.
- `REAL_ORDER_KILL_SWITCH` should remain disabled until certification evidence
  exists and a release owner intentionally changes it.

Repo-local checks include:

```sh
npm run security:doctor
npm run runtime:doctor
npm run api:doctor
npm run payment:doctor
npm run retail:doctor
```

These checks are not a substitute for an external legal, security, privacy, or
accessibility audit.

