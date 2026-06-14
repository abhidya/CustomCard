# Changelog

All notable changes to `@customcard/sdk` are documented here. This project
follows [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-06-14

### Added

- Initial release of the official CustomCard client SDK.
- `CustomCardClient` with resource namespaces: `health`, `customer`, `ai`,
  `imports`, `cards`, `privacy`, `retail`, `walgreens`, `admin`, and `public`.
- Coverage for all customer, admin, and public API routes.
- Bearer-token auth for customer-session and admin-session scopes, with
  runtime token rotation and async token providers.
- Automatic `X-Idempotency-Key` generation on every mutating request, with
  per-request override.
- Transport features: per-request timeouts, exponential backoff + full-jitter
  retries, `Retry-After`-aware rate-limit handling, and normalized typed errors.
- Queue-backed AI helpers: `generateCardAndWait` / `chatAndWait` and a
  configurable `waitForJob` poller.
- Paginated admin artifact-bucket iteration via `iterateArtifactBucket`.
- Dual ESM + CommonJS builds with bundled TypeScript declarations.
