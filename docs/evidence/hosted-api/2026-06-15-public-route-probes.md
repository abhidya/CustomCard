# Hosted API Public Route Probes

Date: 2026-06-15.

Scope: unauthenticated public Vercel probes against
`https://customcard-three.vercel.app`. These probes verify that deployment
protection is no longer blocking public route proof, the hosted API reaches the
Postgres runtime, and protected admin routes fail at the app auth layer. They do
not prove authenticated Clerk customer/admin sessions, idempotent mutation
replay, hosted audit-row writes, backup restore drills, or live provider calls.

## Commands

```sh
curl -sS -D /tmp/customcard-root-headers.txt -o /tmp/customcard-root.html \
  https://customcard-three.vercel.app/

curl -sS -D /tmp/customcard-health-headers.txt -o /tmp/customcard-health.json \
  https://customcard-three.vercel.app/api/health

curl -sS -D /tmp/customcard-admin-bucket-headers.txt -o /tmp/customcard-admin-bucket.json \
  https://customcard-three.vercel.app/api/admin/artifacts/bucket
```

## Results

- `GET /` returned HTTP 200 from Vercel with `content-type: text/html; charset=utf-8`.
- `GET /api/health` returned HTTP 200 from Vercel with `content-type: application/json; charset=utf-8`.
- `/api/health` reported `status: "ready"`, `runtime.mode: "postgres"`, `authEnforced: true`,
  `idempotencyEnforced: true`, `postgresConfigured: true`, `statefulRoutes: 28`, and `blockers: []`.
- `/api/health` reported artifact storage configured for Cloudflare R2 with provider
  `cloudflare-r2`, bucket `customcard-prod`, public base URL
  `https://customcard-three.vercel.app/api/artifacts`, split write/read credentials, and no artifact
  blockers.
- `GET /api/admin/artifacts/bucket` returned HTTP 401 with app JSON:
  `{"service":"customcard-api","status":"auth-required","route":"admin-artifact-bucket","requiredAuth":"admin-session"}`.

## Boundary

This is live public route and hosted Postgres runtime evidence. This is not authenticated hosted Clerk token verification evidence, not a public DB-backed mutation replay, not a backup/restore policy, not store-review evidence, and not authorization to enable real orders or live payment captures.
