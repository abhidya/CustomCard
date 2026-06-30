import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  adminRuntimeConfigKeys,
  normalizeAdminAiFlowConfigInput,
  normalizeAdminWorkerConfigInput
} from "../src/adminRuntimeConfigData.mjs";
import {
  hasLiveProviderNetworkCall,
  normalizeProviderCompletionResult,
  providerArtifactUploadContract,
  sanitizeProviderJobPayload
} from "./provider-worker-payload-contract.mjs";

export {
  normalizeProviderCompletionResult,
  providerArtifactUploadContract,
  sanitizeProviderJobPayload
} from "./provider-worker-payload-contract.mjs";

export function createProviderJobRuntime({
  env = process.env,
  getPool,
  postgresRuntime,
  persistGeneratedImageArtifacts,
  workerConfig
} = {}) {
  async function readWorkerConfig(pool) {
    return readProviderAdminWorkerConfig({ pool, workerConfig });
  }

  return {
    authorize(route, request) {
      return authorizeProviderToken({ env, route, request });
    },
    async leaseJobs({ authContext, workerId, routeIds, limit } = {}) {
      const selectedWorkerId = safeProviderWorkerId(workerId);
      const pool = await getPool();
      const config = await readWorkerConfig(pool);
      const aiFlowAdminConfig = await readProviderAdminAiFlowConfig({ pool, env });
      const selectedRouteIds = allowedProviderRouteIds(config.providerWorker.routeIds, routeIds);
      if (!selectedWorkerId) {
        return {
          statusCode: 400,
          payload: { service: "customcard-api", status: "missing-worker-id", jobs: [] }
        };
      }
      if (selectedRouteIds.length === 0) {
        return {
          statusCode: 403,
          payload: { service: "customcard-api", status: "provider-route-not-allowed", jobs: [] }
        };
      }

      const leaseSeconds = config.providerWorker.leaseSeconds;
      await requeueExpiredProviderJobs(pool, leaseSeconds);
      const result = await pool.query(
        `WITH next_jobs AS (
           SELECT id
           FROM api_jobs
           WHERE status = 'queued'
             AND run_after <= NOW()
             AND route_id = ANY($2::text[])
           ORDER BY created_at ASC
           FOR UPDATE SKIP LOCKED
           LIMIT $1
         )
         UPDATE api_jobs
         SET status = 'running',
             locked_by = $3,
             locked_at = NOW(),
             attempt_count = attempt_count + 1,
             updated_at = NOW()
         WHERE id IN (SELECT id FROM next_jobs)
         RETURNING id, user_id, route_id, idempotency_key_id, payload, attempt_count, max_attempts, locked_at`,
        [providerLeaseLimit(limit, config.providerWorker.batchSize), selectedRouteIds, selectedWorkerId]
      );
      const jobs = result.rows.map((row) =>
        providerLeasePayload({
          row,
          workerId: selectedWorkerId,
          leaseSeconds,
          env,
          aiFlowAdminConfig
        })
      );
      return {
        statusCode: 200,
        payload: {
          service: "customcard-api",
          status: "ready",
          worker_id: selectedWorkerId,
          route_scope: selectedRouteIds,
          leased: jobs.length,
          jobs,
          artifact_upload: providerArtifactUploadContract()
        }
      };
    },
    async readStatus({ authContext, routeIds } = {}) {
      const pool = await getPool();
      const config = await readWorkerConfig(pool);
      const selectedRouteIds = allowedProviderRouteIds(config.providerWorker.routeIds, routeIds);
      if (selectedRouteIds.length === 0) {
        return {
          statusCode: 403,
          payload: { service: "customcard-api", status: "provider-route-not-allowed", route_scope: [] }
        };
      }

      const leaseSeconds = config.providerWorker.leaseSeconds;
      const result = await pool.query(
        `WITH scoped_jobs AS (
           SELECT status, created_at, updated_at, locked_at, attempt_count, max_attempts, result
           FROM api_jobs
           WHERE route_id = ANY($1::text[])
         )
         SELECT
           COUNT(*) FILTER (WHERE status = 'queued')::int AS queued_total,
           COUNT(*) FILTER (WHERE status = 'running')::int AS running_total,
           COUNT(*) FILTER (
             WHERE status = 'running'
               AND locked_at IS NOT NULL
               AND locked_at < NOW() - ($2::int * INTERVAL '1 second')
           )::int AS stale_running_total,
           COUNT(*) FILTER (WHERE status = 'succeeded')::int AS succeeded_total,
           COUNT(*) FILTER (
             WHERE status = 'dead_lettered'
                OR (status = 'failed' AND result->>'status' = 'dead_lettered')
           )::int AS dead_lettered_total,
           COALESCE(EXTRACT(EPOCH FROM (NOW() - MIN(created_at) FILTER (WHERE status = 'queued')))::int, 0) AS oldest_queued_age_seconds,
           COALESCE(MAX(attempt_count) FILTER (WHERE status IN ('queued', 'running')), 0)::int AS max_active_attempt_count,
           COALESCE(MAX(max_attempts), 0)::int AS max_attempts,
           MAX(updated_at) FILTER (WHERE status = 'succeeded') AS last_succeeded_at,
           MAX(updated_at) FILTER (
             WHERE status = 'dead_lettered'
                OR (status = 'failed' AND result->>'status' = 'dead_lettered')
           ) AS last_dead_lettered_at
         FROM scoped_jobs`,
        [selectedRouteIds, leaseSeconds]
      );
      const queueResult = await pool.query(
        `SELECT
           id,
           route_id,
           status,
           created_at,
           updated_at,
           locked_at,
           locked_by,
           run_after,
           attempt_count,
           max_attempts,
           last_error,
           result,
           payload,
           COALESCE(EXTRACT(EPOCH FROM (NOW() - created_at))::int, 0) AS age_seconds,
           COALESCE(EXTRACT(EPOCH FROM (NOW() - updated_at))::int, 0) AS updated_age_seconds,
           CASE
             WHEN locked_at IS NULL THEN 0
             ELSE COALESCE(EXTRACT(EPOCH FROM (NOW() - locked_at))::int, 0)
           END AS lease_age_seconds,
           CASE
             WHEN run_after IS NULL THEN 0
             ELSE COALESCE(EXTRACT(EPOCH FROM (run_after - NOW()))::int, 0)
           END AS run_after_delay_seconds,
           CASE
             WHEN locked_at IS NULL THEN NULL
             ELSE locked_at + ($2::int * INTERVAL '1 second')
           END AS lease_expires_at
         FROM api_jobs
         WHERE route_id = ANY($1::text[])
           AND (
             status IN ('queued', 'running', 'dead_lettered')
             OR (status = 'failed' AND result->>'status' = 'dead_lettered')
           )
         ORDER BY
           CASE
             WHEN status = 'running' THEN 0
             WHEN status = 'queued' THEN 1
             ELSE 2
           END,
           CASE WHEN status = 'queued' THEN created_at END ASC NULLS LAST,
           updated_at DESC
         LIMIT $3`,
        [selectedRouteIds, leaseSeconds, 25]
      );
      const metrics = normalizeProviderStatusMetrics(result.rows[0] ?? {});
      return {
        statusCode: 200,
        payload: {
          service: "customcard-api",
          status: "ready",
          route_scope: selectedRouteIds,
          lease_ttl_seconds: leaseSeconds,
          metrics,
          queue: {
            limit: 25,
            returned: queueResult.rows.length,
            items: queueResult.rows.map((row) => normalizeProviderQueueStatusRow(row))
          },
          artifact_upload: providerArtifactUploadContract()
        }
      };
    },
    async completeJob({ authContext, jobId, body, now = () => new Date() } = {}) {
      const selectedWorkerId = safeProviderWorkerId(body?.worker_id ?? body?.workerId);
      const selectedJobId = safeId(jobId ?? body?.job_id ?? body?.jobId, "");
      const leaseToken = String(body?.lease_token ?? body?.leaseToken ?? "").trim();
      if (!selectedWorkerId || !selectedJobId || !leaseToken) {
        return {
          statusCode: 400,
          payload: {
            service: "customcard-api",
            status: "invalid-provider-completion",
            detail: "worker_id, job id, and lease_token are required."
          }
        };
      }

      const pool = await getPool();
      const selected = await pool.query(
        `SELECT id, user_id, route_id, status, payload, result, attempt_count, max_attempts, locked_by, locked_at
         FROM api_jobs
         WHERE id = $1
         LIMIT 1`,
        [selectedJobId]
      );
      const row = selected.rows[0];
      if (!row) {
        return { statusCode: 404, payload: { service: "customcard-api", status: "job-not-found", job_id: selectedJobId } };
      }
      const config = await readWorkerConfig(pool);
      if (!allowedProviderRouteIds(config.providerWorker.routeIds, [row.route_id]).includes(row.route_id)) {
        return {
          statusCode: 403,
          payload: { service: "customcard-api", status: "provider-route-not-allowed", job_id: selectedJobId, route_id: row.route_id }
        };
      }
      const lockCheck = validateProviderLease({
        row,
        workerId: selectedWorkerId,
        leaseToken,
        env,
        leaseSeconds: config.providerWorker.leaseSeconds
      });
      if (!lockCheck.ok) {
        return {
          statusCode: lockCheck.statusCode,
          payload: { service: "customcard-api", status: lockCheck.status, job_id: selectedJobId, route_id: row.route_id }
        };
      }

      const job = normalizeProviderJobRow(row);
      const completionStatus = String(body?.status ?? "").trim().toLowerCase();
      if (completionStatus === "succeeded" || completionStatus === "success") {
        const completion = normalizeProviderCompletionResult(body?.result);
        const persisted = await persistGeneratedImageArtifacts?.({
          authContext: {
            ok: true,
            role: "customer",
            userId: job.userId,
            sessionId: "provider-worker-completion"
          },
          payload: completion.payload
        });
        const storedResult = {
          ...completion,
          payload: persisted?.payload ?? completion.payload,
          completedAtIso: now().toISOString(),
          liveNetworkCalls: Boolean(completion.liveNetworkCalls ?? hasLiveProviderNetworkCall(completion.payload)),
          artifact_persistence: providerArtifactPersistenceSummary(persisted?.payload ?? completion.payload)
        };
        await postgresRuntime.withTransaction(async (client) => {
          await client.query(
            `UPDATE api_jobs
             SET status = 'succeeded',
                 result = $2::jsonb,
                 locked_by = NULL,
                 locked_at = NULL,
                 last_error = NULL,
                 updated_at = NOW()
             WHERE id = $1`,
            [job.id, JSON.stringify(storedResult)]
          );
          await client.query(
            `INSERT INTO audit_log (subject_type, subject_id, actor_id, action, metadata)
             VALUES ('api_job', $1, $2, 'api.provider_job.succeeded', $3::jsonb)`,
            [job.id, job.userId, JSON.stringify({ routeId: job.routeId, workerId: selectedWorkerId })]
          );
        });
        return {
          statusCode: 200,
          payload: {
            service: "customcard-api",
            status: "completed",
            job_id: job.id,
            route_id: job.routeId,
            queue_status: "succeeded",
            result_available: true,
            artifact_persistence: storedResult.artifact_persistence
          }
        };
      }

      if (completionStatus === "failed" || completionStatus === "failure" || completionStatus === "error") {
        const failed = await failProviderJob({
          postgresRuntime,
          job,
          body,
          workerId: selectedWorkerId,
          retryBackoffSeconds: config.providerWorker.retryBackoffSeconds,
          now
        });
        return {
          statusCode: 200,
          payload: {
            service: "customcard-api",
            status: failed.status,
            job_id: job.id,
            route_id: job.routeId,
            queue_status: failed.status,
            result_available: false,
            retry_after_seconds: failed.status === "queued" ? config.providerWorker.retryBackoffSeconds : null
          }
        };
      }

      return {
        statusCode: 400,
        payload: {
          service: "customcard-api",
          status: "invalid-provider-completion-status",
          allowed: ["succeeded", "failed"]
        }
      };
    }
  };
}

export function providerRuntimeUnavailable(runtimeMode) {
  return {
    statusCode: 503,
    payload: {
      service: "customcard-api",
      status: "provider-job-runtime-unavailable",
      runtimeMode,
      detail: "Provider job leasing requires CUSTOMCARD_API_RUNTIME=postgres."
    }
  };
}

async function readProviderAdminWorkerConfig({ pool, workerConfig }) {
  if (workerConfig) return normalizeAdminWorkerConfigInput(workerConfig);
  try {
    const result = await pool.query(
      `SELECT payload
       FROM admin_runtime_configs
       WHERE key = $1
       LIMIT 1`,
      [adminRuntimeConfigKeys.workerConfig]
    );
    return normalizeAdminWorkerConfigInput(result.rows[0]?.payload ?? {});
  } catch {
    return normalizeAdminWorkerConfigInput();
  }
}

async function readProviderAdminAiFlowConfig({ pool, env }) {
  try {
    const result = await pool.query(
      `SELECT payload
       FROM admin_runtime_configs
       WHERE key = $1
       LIMIT 1`,
      [adminRuntimeConfigKeys.aiFlowConfigs]
    );
    return normalizeAdminAiFlowConfigInput(result.rows[0]?.payload ?? {}, env, { migrateLegacyDefaults: true });
  } catch {
    return normalizeAdminAiFlowConfigInput({}, env, { migrateLegacyDefaults: true });
  }
}

export function authorizeProviderToken({ env, route, request }) {
  const token = readBearerToken(request);
  if (!token) return authError(401, "auth-required", route);
  const configured = configuredProviderTokenHash(env);
  if (!configured) {
    return {
      ok: false,
      statusCode: 503,
      payload: {
        service: "customcard-api",
        status: "provider-token-unconfigured",
        route: route.id,
        requiredAuth: route.auth
      }
    };
  }
  const tokenHash = createHash("sha256").update(token).digest("hex");
  if (!timingSafeEqual(Buffer.from(tokenHash, "hex"), Buffer.from(configured, "hex"))) {
    return authError(401, "invalid-provider-token", route);
  }
  const providerId = safeId(env.CUSTOMCARD_PROVIDER_WORKER_PRINCIPAL_ID, `provider-${tokenHash.slice(0, 12)}`);
  return {
    ok: true,
    role: "provider",
    userId: providerId,
    sessionId: stableProviderId("provider-session", tokenHash)
  };
}

export function allowedProviderRouteIds(allowedRouteIds, requestedRouteIds) {
  const allowed = new Set(Array.isArray(allowedRouteIds) ? allowedRouteIds : []);
  const requested = Array.isArray(requestedRouteIds) && requestedRouteIds.length > 0
    ? requestedRouteIds.map((routeId) => safeId(routeId, "")).filter(Boolean)
    : Array.from(allowed);
  return requested.filter((routeId) => allowed.has(routeId));
}

export function providerLeasePayload({ row, workerId, leaseSeconds, env, aiFlowAdminConfig = [] }) {
  const lockedAtIso = safeDateIso(row.locked_at);
  const expiresAtIso = new Date(new Date(lockedAtIso).getTime() + leaseSeconds * 1000).toISOString();
  const job = normalizeProviderJobRow(row);
  const payload = sanitizeProviderJobPayload({
    ...job.payload,
    aiFlowAdminConfig
  });
  return {
    job_id: job.id,
    route_id: job.routeId,
    attempt_count: job.attemptCount,
    max_attempts: job.maxAttempts,
    payload,
    lease_token: providerLeaseToken({ jobId: job.id, workerId, lockedAtIso, attemptCount: job.attemptCount, env }),
    lease_expires_at: expiresAtIso,
    lease_ttl_seconds: leaseSeconds,
    artifact_upload: providerArtifactUploadContract()
  };
}

function authError(statusCode, status, route) {
  return {
    ok: false,
    statusCode,
    payload: {
      service: "customcard-api",
      status,
      route: route.id,
      requiredAuth: route.auth
    }
  };
}

function readBearerToken(request) {
  const authorization = readHeader(request, "authorization");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}

function readHeader(request, name) {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function configuredProviderTokenHash(env) {
  const configuredHash = String(env.CUSTOMCARD_PROVIDER_WORKER_TOKEN_SHA256 ?? "").trim().toLowerCase();
  if (/^[a-f0-9]{64}$/.test(configuredHash)) return configuredHash;
  const token = String(env.CUSTOMCARD_PROVIDER_WORKER_TOKEN ?? "").trim();
  if (token.length < 32) return "";
  return createHash("sha256").update(token).digest("hex");
}

function safeProviderWorkerId(value) {
  return safeId(value, "");
}

function providerLeaseLimit(value, fallback) {
  return safeInteger(value, fallback, 1, 5);
}

async function requeueExpiredProviderJobs(pool, leaseSeconds) {
  try {
    await updateExpiredProviderJobs(pool, leaseSeconds, "dead_lettered");
  } catch (error) {
    if (!isDeadLetterStatusConstraintError(error)) throw error;
    await updateExpiredProviderJobs(pool, leaseSeconds, "failed");
  }
}

async function updateExpiredProviderJobs(pool, leaseSeconds, exhaustedPhysicalStatus) {
  await pool.query(
    `UPDATE api_jobs
     SET status = CASE WHEN attempt_count >= max_attempts THEN $2 ELSE 'queued' END,
         locked_by = NULL,
         locked_at = NULL,
         run_after = CASE WHEN attempt_count >= max_attempts THEN run_after ELSE NOW() END,
         result = CASE
           WHEN attempt_count >= max_attempts
             THEN jsonb_build_object('status', 'dead_lettered', 'reason', 'lease-expired', 'leaseSeconds', $1::int)
           ELSE jsonb_build_object('status', 'lease-expired', 'leaseSeconds', $1::int)
         END,
         updated_at = NOW()
     WHERE status = 'running'
       AND locked_at IS NOT NULL
       AND locked_at < NOW() - ($1::int * INTERVAL '1 second')`,
    [leaseSeconds, exhaustedPhysicalStatus]
  );
}

function providerLeaseToken({ jobId, workerId, lockedAtIso, attemptCount, env }) {
  return createHmac("sha256", providerLeaseSigningSecret(env))
    .update([jobId, workerId, lockedAtIso, attemptCount].join(":"))
    .digest("hex");
}

function providerLeaseSigningSecret(env) {
  const explicit = String(env.CUSTOMCARD_PROVIDER_LEASE_SIGNING_SECRET ?? "").trim();
  if (explicit.length >= 32) return explicit;
  return String(env.AUTH_SESSION_SECRET ?? env.OBJECT_STORE_SIGNING_SECRET ?? "customcard-provider-lease-dev-secret").trim();
}

function validateProviderLease({ row, workerId, leaseToken, env, leaseSeconds }) {
  if (row.status !== "running") return { ok: false, statusCode: 409, status: "job-not-running" };
  if (row.locked_by !== workerId) return { ok: false, statusCode: 409, status: "job-locked-by-another-worker" };
  const lockedAtIso = safeDateIso(row.locked_at);
  const expiresAtMs = new Date(lockedAtIso).getTime() + leaseSeconds * 1000;
  if (Date.now() > expiresAtMs) return { ok: false, statusCode: 409, status: "lease-expired" };
  const expected = providerLeaseToken({
    jobId: row.id,
    workerId,
    lockedAtIso,
    attemptCount: Number(row.attempt_count ?? 1),
    env
  });
  if (!/^[a-f0-9]{64}$/i.test(leaseToken)) return { ok: false, statusCode: 403, status: "invalid-lease-token" };
  if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(leaseToken, "hex"))) {
    return { ok: false, statusCode: 403, status: "invalid-lease-token" };
  }
  return { ok: true };
}

function normalizeProviderJobRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    routeId: row.route_id,
    idempotencyKeyId: row.idempotency_key_id,
    payload: normalizeJson(row.payload),
    attemptCount: Number(row.attempt_count ?? 1),
    maxAttempts: Number(row.max_attempts ?? 3)
  };
}

function providerArtifactPersistenceSummary(payload) {
  const persistence = payload?.generated_image_persistence;
  if (persistence && typeof persistence === "object") return persistence;
  return {
    status: Array.isArray(payload?.images) && payload.images.some((image) => image?.image_object_key) ? "stored" : "not-applicable",
    inlineImageBytesPersisted: false
  };
}

function normalizeProviderStatusMetrics(row) {
  return {
    queued_total: Number(row.queued_total ?? 0),
    running_total: Number(row.running_total ?? 0),
    stale_running_total: Number(row.stale_running_total ?? 0),
    succeeded_total: Number(row.succeeded_total ?? 0),
    dead_lettered_total: Number(row.dead_lettered_total ?? 0),
    oldest_queued_age_seconds: Number(row.oldest_queued_age_seconds ?? 0),
    max_active_attempt_count: Number(row.max_active_attempt_count ?? 0),
    max_attempts: Number(row.max_attempts ?? 0),
    last_succeeded_at: row.last_succeeded_at ? safeDateIso(row.last_succeeded_at) : null,
    last_dead_lettered_at: row.last_dead_lettered_at ? safeDateIso(row.last_dead_lettered_at) : null
  };
}

function normalizeProviderQueueStatusRow(row) {
  const status = safeId(row.status, "unknown");
  const sanitizedPayload = sanitizeProviderJobPayload(normalizeJson(row.payload));
  return {
    job_id: safeId(row.id, "unknown"),
    route_id: safeId(row.route_id, "unknown"),
    status,
    queue_lane: status === "running" ? "running" : status === "queued" ? "queued" : "attention",
    created_at: row.created_at ? safeDateIso(row.created_at) : null,
    updated_at: row.updated_at ? safeDateIso(row.updated_at) : null,
    locked_at: row.locked_at ? safeDateIso(row.locked_at) : null,
    run_after: row.run_after ? safeDateIso(row.run_after) : null,
    lease_expires_at: row.lease_expires_at ? safeDateIso(row.lease_expires_at) : null,
    locked_by: row.locked_by ? safeText(row.locked_by, "") : "",
    attempt_count: Number(row.attempt_count ?? 0),
    max_attempts: Number(row.max_attempts ?? 0),
    age_seconds: Number(row.age_seconds ?? 0),
    updated_age_seconds: Number(row.updated_age_seconds ?? 0),
    lease_age_seconds: Number(row.lease_age_seconds ?? 0),
    run_after_delay_seconds: Number(row.run_after_delay_seconds ?? 0),
    last_error: safeDiagnosticText(row.last_error, 320),
    input_summary: summarizeProviderQueuePayload(sanitizedPayload),
    result_summary: summarizeProviderDiagnostic(normalizeJson(row.result), 0)
  };
}

function summarizeProviderQueuePayload(payload) {
  const body = payload?.body && typeof payload.body === "object" && !Array.isArray(payload.body) ? payload.body : {};
  const requestContext =
    payload?.requestContext && typeof payload.requestContext === "object" && !Array.isArray(payload.requestContext)
      ? payload.requestContext
      : {};
  return {
    payload_keys: Object.keys(payload ?? {}).slice(0, 18),
    body_keys: Object.keys(body).slice(0, 24),
    body: summarizeProviderDiagnostic(body, 0),
    request_context: summarizeProviderDiagnostic(requestContext, 0)
  };
}

function summarizeProviderDiagnostic(value, depth) {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return safeDiagnosticText(value, 220);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 12).map((item) => summarizeProviderDiagnostic(item, depth + 1));
  if (typeof value !== "object") return safeDiagnosticText(value, 220);
  if (depth >= 3) return safeDiagnosticText(JSON.stringify(value), 220);
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 24)
      .map(([key, child]) => [key, summarizeProviderDiagnostic(child, depth + 1)])
  );
}

function safeDiagnosticText(value, maxLength = 220) {
  const text = String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer <redacted>")
    .replace(/(TOKEN|SECRET|KEY|PASSWORD)=([^;\s]+)/gi, "$1=<redacted>")
    .replace(/("?(?:token|secret|password|api[_-]?key|database_url)"?\s*[:=]\s*)("[^"]+"|[^,\s}]+)/gi, "$1<redacted>")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

async function failProviderJob({ postgresRuntime, job, body, workerId, retryBackoffSeconds, now }) {
  const exhausted = job.attemptCount >= job.maxAttempts;
  const status = exhausted ? "dead_lettered" : "queued";
  const error = safeText(body?.error?.message ?? body?.error ?? body?.reason, "Provider worker failed.");
  const payload = {
    status,
    error,
    failedAtIso: now().toISOString(),
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
    workerId
  };
  try {
    await writeProviderJobFailure({
      postgresRuntime,
      job,
      status,
      physicalStatus: status,
      payload,
      error,
      retryBackoffSeconds,
      exhausted
    });
  } catch (writeError) {
    if (!exhausted || !isDeadLetterStatusConstraintError(writeError)) throw writeError;
    await writeProviderJobFailure({
      postgresRuntime,
      job,
      status,
      physicalStatus: "failed",
      payload,
      error,
      retryBackoffSeconds,
      exhausted
    });
  }
  return { status };
}

async function writeProviderJobFailure({ postgresRuntime, job, status, physicalStatus, payload, error, retryBackoffSeconds, exhausted }) {
  await postgresRuntime.withTransaction(async (client) => {
    await client.query(
      `UPDATE api_jobs
       SET status = $2,
           result = $3::jsonb,
           locked_by = NULL,
           locked_at = NULL,
           last_error = $4,
           run_after = CASE WHEN $2 = 'dead_lettered' THEN run_after ELSE NOW() + ($5::int * INTERVAL '1 second') END,
           updated_at = NOW()
       WHERE id = $1`,
      [job.id, physicalStatus, JSON.stringify(payload), error, retryBackoffSeconds]
    );
    await client.query(
      `INSERT INTO audit_log (subject_type, subject_id, actor_id, action, metadata)
       VALUES ('api_job', $1, $2, $3, $4::jsonb)`,
      [
        job.id,
        job.userId,
        exhausted ? "api.provider_job.dead_lettered" : "api.provider_job.retry_scheduled",
        JSON.stringify({ ...payload, routeId: job.routeId })
      ]
    );
  });
}

function isDeadLetterStatusConstraintError(error) {
  return error?.code === "23514" && /api_jobs_status_check|dead_lettered|status/i.test(String(error?.message ?? ""));
}

function safeDateIso(value) {
  const date = new Date(value ?? Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function safeId(value, fallback) {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || fallback;
}

function safeInteger(value, fallback, min, max) {
  const number = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function safeText(value, fallback) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text.slice(0, 120) || fallback;
}

function stableProviderId(...parts) {
  return `rt_${createHash("sha256").update(parts.join(":")).digest("hex").slice(0, 16)}`;
}

function normalizeJson(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}
