import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function createProviderJobRuntime({
  env = process.env,
  getPool,
  postgresRuntime,
  persistGeneratedImageArtifacts
} = {}) {
  return {
    authorize(route, request) {
      return authorizeProviderToken({ env, route, request });
    },
    async leaseJobs({ authContext, workerId, routeIds, limit } = {}) {
      const selectedWorkerId = safeProviderWorkerId(workerId);
      const selectedRouteIds = allowedProviderRouteIds(authContext, routeIds);
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

      const pool = await getPool();
      const leaseSeconds = providerLeaseSeconds(env);
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
        [providerLeaseLimit(limit), selectedRouteIds, selectedWorkerId]
      );
      const jobs = result.rows.map((row) =>
        providerLeasePayload({
          row,
          workerId: selectedWorkerId,
          leaseSeconds,
          env
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
      const selectedRouteIds = allowedProviderRouteIds(authContext, routeIds);
      if (selectedRouteIds.length === 0) {
        return {
          statusCode: 403,
          payload: { service: "customcard-api", status: "provider-route-not-allowed", route_scope: [] }
        };
      }

      const pool = await getPool();
      const leaseSeconds = providerLeaseSeconds(env);
      const result = await pool.query(
        `WITH scoped_jobs AS (
           SELECT status, created_at, updated_at, locked_at, attempt_count, max_attempts
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
           COUNT(*) FILTER (WHERE status = 'dead_lettered')::int AS dead_lettered_total,
           COALESCE(EXTRACT(EPOCH FROM (NOW() - MIN(created_at) FILTER (WHERE status = 'queued')))::int, 0) AS oldest_queued_age_seconds,
           COALESCE(MAX(attempt_count) FILTER (WHERE status IN ('queued', 'running')), 0)::int AS max_active_attempt_count,
           COALESCE(MAX(max_attempts), 0)::int AS max_attempts,
           MAX(updated_at) FILTER (WHERE status = 'succeeded') AS last_succeeded_at,
           MAX(updated_at) FILTER (WHERE status = 'dead_lettered') AS last_dead_lettered_at
         FROM scoped_jobs`,
        [selectedRouteIds, leaseSeconds]
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
      if (!allowedProviderRouteIds(authContext, [row.route_id]).includes(row.route_id)) {
        return {
          statusCode: 403,
          payload: { service: "customcard-api", status: "provider-route-not-allowed", job_id: selectedJobId, route_id: row.route_id }
        };
      }
      const lockCheck = validateProviderLease({ row, workerId: selectedWorkerId, leaseToken, env });
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
          retryBackoffSeconds: providerRetryBackoffSeconds(env),
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
            retry_after_seconds: failed.status === "queued" ? providerRetryBackoffSeconds(env) : null
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
    sessionId: stableProviderId("provider-session", tokenHash),
    providerRouteIds: providerRouteIdsFromEnv(env)
  };
}

export function allowedProviderRouteIds(authContext, requestedRouteIds) {
  const allowed = new Set(Array.isArray(authContext?.providerRouteIds) ? authContext.providerRouteIds : []);
  const requested = Array.isArray(requestedRouteIds) && requestedRouteIds.length > 0
    ? requestedRouteIds.map((routeId) => safeId(routeId, "")).filter(Boolean)
    : Array.from(allowed);
  return requested.filter((routeId) => allowed.has(routeId));
}

export function providerLeasePayload({ row, workerId, leaseSeconds, env }) {
  const lockedAtIso = safeDateIso(row.locked_at);
  const expiresAtIso = new Date(new Date(lockedAtIso).getTime() + leaseSeconds * 1000).toISOString();
  const job = normalizeProviderJobRow(row);
  return {
    job_id: job.id,
    route_id: job.routeId,
    attempt_count: job.attemptCount,
    max_attempts: job.maxAttempts,
    payload: sanitizeProviderJobPayload(job.payload),
    lease_token: providerLeaseToken({ jobId: job.id, workerId, lockedAtIso, attemptCount: job.attemptCount, env }),
    lease_expires_at: expiresAtIso,
    lease_ttl_seconds: leaseSeconds,
    artifact_upload: providerArtifactUploadContract()
  };
}

export function providerArtifactUploadContract() {
  return {
    mode: "api-complete-inline-data-url",
    r2CredentialsExposed: false,
    directR2UploadPlanned: true,
    detail: "The provider posts generated image data to complete; the production API persists artifacts to object storage."
  };
}

export function normalizeProviderCompletionResult(result) {
  const normalized = result && typeof result === "object" && !Array.isArray(result) ? result : {};
  const payload = normalized.payload && typeof normalized.payload === "object" && !Array.isArray(normalized.payload)
    ? normalized.payload
    : {};
  return {
    status: safeId(normalized.status, "ai-result-ready"),
    routeId: safeId(normalized.routeId ?? normalized.route_id, "ai-card-generate"),
    httpStatusCode: safeInteger(normalized.httpStatusCode ?? normalized.http_status_code, 200, 100, 599),
    providerCallMode: safeId(normalized.providerCallMode ?? normalized.provider_call_mode, "live-provider"),
    payload,
    evidence: safeText(normalized.evidence, "Provider worker completed the leased job."),
    liveNetworkCalls: Boolean(normalized.liveNetworkCalls ?? normalized.live_network_calls ?? hasLiveProviderNetworkCall(payload))
  };
}

export function sanitizeProviderJobPayload(payload) {
  const normalized = normalizeJson(payload);
  const requestContext = normalized.requestContext && typeof normalized.requestContext === "object"
    ? normalized.requestContext
    : {};
  const authContext = requestContext.authContext && typeof requestContext.authContext === "object"
    ? requestContext.authContext
    : {};
  return {
    ...normalized,
    requestContext: {
      ...requestContext,
      authContext: {
        ...authContext,
        sessionId: "provider-lease"
      }
    },
    security: {
      ...(normalized.security ?? {}),
      providerLeaseScoped: true,
      credentialsPersisted: false,
      rawProviderContentStored: false
    }
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

function providerRouteIdsFromEnv(env) {
  const configured = String(env.CUSTOMCARD_PROVIDER_WORKER_ROUTE_IDS ?? "ai-card-generate");
  return Array.from(
    new Set(
      configured
        .split(/[,\s]+/)
        .map((routeId) => safeId(routeId, ""))
        .filter(Boolean)
    )
  );
}

function safeProviderWorkerId(value) {
  return safeId(value, "");
}

function providerLeaseLimit(value) {
  return safeInteger(value, 1, 1, 5);
}

function providerLeaseSeconds(env) {
  return safeInteger(env.CUSTOMCARD_PROVIDER_WORKER_LEASE_SECONDS ?? env.CUSTOMCARD_WORKER_LEASE_SECONDS, 300, 30, 3600);
}

function providerRetryBackoffSeconds(env) {
  return safeInteger(
    env.CUSTOMCARD_PROVIDER_WORKER_RETRY_BACKOFF_SECONDS ?? env.CUSTOMCARD_WORKER_RETRY_BACKOFF_SECONDS,
    60,
    5,
    3600
  );
}

async function requeueExpiredProviderJobs(pool, leaseSeconds) {
  await pool.query(
    `UPDATE api_jobs
     SET status = CASE WHEN attempt_count >= max_attempts THEN 'dead_lettered' ELSE 'queued' END,
         locked_by = NULL,
         locked_at = NULL,
         run_after = CASE WHEN attempt_count >= max_attempts THEN run_after ELSE NOW() END,
         result = jsonb_build_object('status', 'lease-expired', 'leaseSeconds', $1::int),
         updated_at = NOW()
     WHERE status = 'running'
       AND locked_at IS NOT NULL
       AND locked_at < NOW() - ($1::int * INTERVAL '1 second')`,
    [leaseSeconds]
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

function validateProviderLease({ row, workerId, leaseToken, env }) {
  if (row.status !== "running") return { ok: false, statusCode: 409, status: "job-not-running" };
  if (row.locked_by !== workerId) return { ok: false, statusCode: 409, status: "job-locked-by-another-worker" };
  const lockedAtIso = safeDateIso(row.locked_at);
  const expiresAtMs = new Date(lockedAtIso).getTime() + providerLeaseSeconds(env) * 1000;
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
      [job.id, status, JSON.stringify(payload), error, retryBackoffSeconds]
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
  return { status };
}

function hasLiveProviderNetworkCall(payload = {}) {
  return Array.isArray(payload.provider_call_events)
    ? payload.provider_call_events.some((event) => event?.live_network_call === true && event?.status !== "blocked")
    : false;
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
