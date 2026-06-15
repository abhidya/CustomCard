# Hosted Migration Rollback Plan

This plan covers hosted CustomCard API migrations on Vercel with Neon/Postgres.
It is a repo-local rollback plan, not proof that a production rollback drill has
been executed.

## Scope

- Hosted target: QA Preview or Production Vercel deployment.
- Database target: Neon/Postgres database referenced by `DATABASE_URL`.
- Migration runner: `npm run migrate`, backed by `scripts/migrate.mjs`.
- Restore drill: `npm run hosted:db:restore:drill`, backed by
  `scripts/hosted-db-restore-drill.mjs`.
- Env inventory: `npm run hosted:env:inventory`, backed by
  `scripts/hosted-vercel-env-inventory.mjs`.
- Reviewer seed rollback: demo-scoped cleanup only; no broad customer-data
  deletion.

## Invariants

- Forward-only migrations: do not assume a down migration exists.
- Restore-before-switch: validate a restored clone before pointing hosted
  traffic at it.
- Production URL separation: restore drills must refuse the exact production
  `DATABASE_URL`.
- No destructive live mutations without explicit operator approval and isolated
  rollback scope.
- No real orders, live provider calls, or external vendor calls during rollback
  proof collection.
- Preserve append-only `audit_log` evidence; do not rewrite audit history.
- Keep customer data export/deletion requests visible in `data_requests` during
  rollback triage.

## Preflight Evidence

Before a hosted migration or rollback window, capture a sanitized bundle:

1. `CUSTOMCARD_HOSTED_ENV_INVENTORY=enabled CUSTOMCARD_HOSTED_API_ENV=production CUSTOMCARD_VERCEL_ENV_TARGET=production CUSTOMCARD_HOSTED_API_BASE_URL=https://customcard-three.vercel.app npm run hosted:env:inventory`
2. `CUSTOMCARD_HOSTED_AUTH_PROBE=enabled CUSTOMCARD_HOSTED_API_ENV=production CUSTOMCARD_HOSTED_API_BASE_URL=https://customcard-three.vercel.app CUSTOMCARD_HOSTED_CUSTOMER_JWT=... CUSTOMCARD_HOSTED_ADMIN_JWT=... npm run hosted:auth:probe`
3. `CUSTOMCARD_HOSTED_DB_RESTORE_DRILL=enabled CUSTOMCARD_RESTORE_DATABASE_URL=postgres://... CUSTOMCARD_RESTORE_SOURCE=neon-branch CUSTOMCARD_RESTORE_POINT_IN_TIME=... CUSTOMCARD_BACKUP_RETENTION_DAYS=14 CUSTOMCARD_BACKUP_RPO_MINUTES=15 CUSTOMCARD_BACKUP_RTO_MINUTES=60 npm run hosted:db:restore:drill`
4. Record migration filename, deployment URL, deployment ID, operator, and
   planned restore point.

The evidence bundle must redact secrets and tokens.

## Rollback Decision Tree

1. If the migration failed before commit, rely on `scripts/migrate.mjs`
   transaction rollback and do not alter hosted env.
2. If the deployment failed but the database is healthy, promote or redeploy the
   last known good application build and keep the database unchanged.
3. If the schema migrated successfully but the new app path is broken, prefer a
   fix-forward migration or app patch when it is additive and safer than a
   database restore.
4. If customer data or critical table integrity is at risk, restore a cloned
   database from the approved restore point, run `hosted:db:restore:drill`
   against the clone, then switch hosted env only after approval.
5. If only reviewer seed data is wrong, run demo-scoped cleanup using the
   reset-key plan and verify row counts plus an audit entry. Do not delete
   non-demo customer rows.

## Restore-Switch Procedure

1. Freeze customer-facing writes by disabling launch controls and pausing
   operator-initiated hosted mutation probes.
2. Capture current `/api/health` and `/api/admin/readiness` responses.
3. Create or select the restored database clone.
4. Run `hosted:db:restore:drill` against `CUSTOMCARD_RESTORE_DATABASE_URL`.
5. Confirm required tables, key indexes, readable row counts, retention,
   restore point, RPO, and RTO.
6. Update hosted `DATABASE_URL` only after the restored clone passes.
7. Redeploy or restart the hosted target so env changes take effect.
8. Rerun `hosted:auth:probe`; if approved for a harmless row, rerun
   `hosted:mutation:probe`.
9. Attach sanitized outputs to `docs/evidence/hosted-api/`.

## Reviewer Seed Cleanup

- Cleanup must be scoped to deterministic demo IDs and reset keys.
- Cleanup must read post-rollback row counts from seeded tables.
- Cleanup must append a rollback audit entry.
- Cleanup must keep `destructiveLiveMutation=false` for non-demo data.
- Cleanup evidence must include: hosted rollback run, post-rollback row count,
  and rollback audit entry.

## Completion Evidence

A rollback is complete only when the evidence bundle includes:

- Sanitized `hosted:env:inventory` output.
- Sanitized `hosted:db:restore:drill` output for the restored clone.
- Sanitized `hosted:auth:probe` output after the switch.
- Sanitized `hosted:mutation:probe` output when a harmless live probe row is
  approved.
- Migration filename and deployment ID.
- Restore point, retention days, RPO minutes, and RTO minutes.
- Post-rollback row counts for affected tables.
- Rollback audit entry.
- Operator approval and timestamp.

## Current Status

- Rollback plan attached: yes.
- Executed hosted rollback drill: no.
- Executed restored clone switch: no.
- Executed production hosted mutation replay: no.
- Real orders enabled: no.
- Live provider calls enabled: no.
