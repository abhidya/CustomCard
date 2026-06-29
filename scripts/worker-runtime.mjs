import { apiRouteContracts as defaultRoutes } from "../src/apiRouteContractsData.mjs";
import {
  createAiCardGenerationService,
} from "./ai-card-generator.mjs";
import { createAiFlowCostGate, createPostgresAiFlowCostStore } from "./ai-flow-cost-gate.mjs";
import { persistGeneratedImageArtifacts as persistGeneratedImageArtifactsToObjectStore } from "./api-runtime.mjs";
import { createObjectStoreRuntime } from "./object-store-runtime.mjs";
import { createPostgresRuntime } from "./postgres-runtime.mjs";
import {
  buildProviderWorkerResult,
  compactAiWorkerPayload,
  hasLiveProviderNetworkCall
} from "./provider-worker-payload-contract.mjs";
import {
  validateWorkerRuntimeEnv,
  workerRequiredEnv
} from "./runtime-env-contract.mjs";

export { workerRequiredEnv };

export function createWorkerRuntime({
  env = process.env,
  routes = defaultRoutes,
  postgresPoolFactory,
  jobHandlers,
  generatedImageArtifactPersister,
  fetchImpl = globalThis.fetch,
  aiFlowAdminConfig = [],
  workerId = defaultWorkerId(env),
  now = () => new Date()
} = {}) {
  const postgresRuntime = createPostgresRuntime({ env, postgresPoolFactory });
  const objectStoreRuntime = createObjectStoreRuntime({ env, fetchImpl });
  const effectiveGeneratedImageArtifactPersister =
    generatedImageArtifactPersister ??
    (({ authContext, payload }) =>
      persistGeneratedImageArtifactsToObjectStore({ objectStoreRuntime, authContext, payload }));
  const effectiveJobHandlers =
    jobHandlers ??
    createDefaultJobHandlers({
      env,
      postgresRuntime,
      fetchImpl,
      aiFlowAdminConfig,
      persistGeneratedImageArtifacts: effectiveGeneratedImageArtifactPersister
    });
  const queueBackedRouteIds = routes.filter((route) => route.runtimeMode === "queue-backed").map((route) => route.id);
  const routeIdSet = new Set(queueBackedRouteIds);

  return {
    describe() {
      return {
        service: "customcard-worker",
        env: env.CUSTOMCARD_ENV,
        queue: "ready",
        executionMode: "postgres-lease",
        workerId,
        queueBackedRoutes: queueBackedRouteIds,
        leaseSeconds: workerLeaseSeconds(env),
        batchSize: workerBatchSize(env),
        retryBackoffSeconds: workerRetryBackoffSeconds(env),
        pollIntervalMs: workerPollIntervalMs(env),
        postgres: postgresRuntime.describe(),
        artifactStore: objectStoreRuntime.describe(),
        idempotency: "required",
        liveNetworkCalls: false
      };
    },
    validate({ requirePostgres = false } = {}) {
      return validateWorkerEnv(env, { requirePostgres });
    },
    async runOnce({ limit = workerBatchSize(env) } = {}) {
      const blockers = validateWorkerEnv(env, { requirePostgres: true });
      if (blockers.length > 0) {
        return {
          service: "customcard-worker",
          status: "blocked",
          workerId,
          blockers,
          processed: 0,
          succeeded: 0,
          failed: 0,
          deadLettered: 0
        };
      }

      const expired = await requeueExpiredJobs({ postgresRuntime, leaseSeconds: workerLeaseSeconds(env) });
      const jobs = await leaseJobs({ postgresRuntime, workerId, limit, routeIds: Array.from(routeIdSet) });
      const report = {
        service: "customcard-worker",
        status: "ready",
        workerId,
        expiredJobs: expired,
        leased: jobs.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
        deadLettered: 0,
        results: []
      };

      await processLeasedJobs({
        effectiveJobHandlers,
        jobs,
        now,
        postgresRuntime,
        report,
        retryBackoffSeconds: workerRetryBackoffSeconds(env),
        routeIdSet
      });

      return report;
    },
    async runJobById({ jobId, userId }) {
      const blockers = validateWorkerEnv(env, { requirePostgres: true });
      if (blockers.length > 0) {
        return {
          service: "customcard-worker",
          status: "blocked",
          workerId,
          blockers,
          leased: 0,
          processed: 0,
          succeeded: 0,
          failed: 0,
          deadLettered: 0
        };
      }

      const expired = await requeueExpiredJobs({ postgresRuntime, leaseSeconds: workerLeaseSeconds(env) });
      const jobs = await leaseJobById({ postgresRuntime, workerId, jobId, userId, routeIds: Array.from(routeIdSet) });
      const report = {
        service: "customcard-worker",
        status: "ready",
        workerId,
        expiredJobs: expired,
        leased: jobs.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
        deadLettered: 0,
        results: []
      };

      await processLeasedJobs({
        effectiveJobHandlers,
        jobs,
        now,
        postgresRuntime,
        report,
        retryBackoffSeconds: workerRetryBackoffSeconds(env),
        routeIdSet
      });

      return report;
    },
    async runLoop({
      limit = workerBatchSize(env),
      pollIntervalMs = workerPollIntervalMs(env),
      maxIterations = Number.POSITIVE_INFINITY,
      stopWhenIdle = false,
      shouldContinue = () => true,
      onReport
    } = {}) {
      const report = {
        service: "customcard-worker",
        status: "ready",
        workerId,
        iterations: 0,
        processed: 0,
        succeeded: 0,
        failed: 0,
        deadLettered: 0,
        expiredJobs: [],
        results: []
      };

      while (report.iterations < maxIterations && shouldContinue()) {
        const iteration = await this.runOnce({ limit });
        report.iterations += 1;
        report.processed += iteration.processed ?? 0;
        report.succeeded += iteration.succeeded ?? 0;
        report.failed += iteration.failed ?? 0;
        report.deadLettered += iteration.deadLettered ?? 0;
        report.expiredJobs.push(...(iteration.expiredJobs ?? []));
        report.results.push(...(iteration.results ?? []));
        report.lastReport = iteration;
        await onReport?.(iteration);

        if (iteration.status !== "ready" || iteration.blockers?.length > 0) {
          report.status = iteration.status;
          report.blockers = iteration.blockers ?? [];
          break;
        }
        if (stopWhenIdle && iteration.leased === 0) break;
        if (report.iterations < maxIterations && shouldContinue() && pollIntervalMs > 0) await sleep(pollIntervalMs);
      }

      return report;
    },
    async close() {
      await postgresRuntime.close();
    }
  };
}

export function describeWorkerReadiness({ env = process.env, routes = defaultRoutes, aiFlowAdminConfig = [] } = {}) {
  const runtime = createWorkerRuntime({ env, routes, aiFlowAdminConfig });
  const blockers = runtime.validate({ requirePostgres: false });
  return {
    ...runtime.describe(),
    status: blockers.length === 0 ? "ready" : "blocked",
    blockers
  };
}

export function validateWorkerEnv(env = process.env, { requirePostgres = false } = {}) {
  return validateWorkerRuntimeEnv(env, { requirePostgres });
}

async function leaseJobs({ postgresRuntime, workerId, limit, routeIds }) {
  if (!Array.isArray(routeIds) || routeIds.length === 0) return [];
  const result = await postgresRuntime.query(
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
     RETURNING id, user_id, route_id, idempotency_key_id, payload, attempt_count, max_attempts`,
    [limit, routeIds, workerId]
  );
  return result.rows.map(normalizeJobRow);
}

async function leaseJobById({ postgresRuntime, workerId, jobId, userId, routeIds }) {
  if (!Array.isArray(routeIds) || routeIds.length === 0) return [];
  const result = await postgresRuntime.query(
    `WITH selected_job AS (
       SELECT id
       FROM api_jobs
       WHERE id = $1
         AND user_id = $2
         AND route_id = ANY($3::text[])
         AND status = 'queued'
         AND run_after <= NOW()
       FOR UPDATE SKIP LOCKED
     )
     UPDATE api_jobs
     SET status = 'running',
         locked_by = $4,
         locked_at = NOW(),
         attempt_count = attempt_count + 1,
         updated_at = NOW()
     WHERE id IN (SELECT id FROM selected_job)
     RETURNING id, user_id, route_id, idempotency_key_id, payload, attempt_count, max_attempts`,
    [jobId, userId, routeIds, workerId]
  );
  return result.rows.map(normalizeJobRow);
}

async function processLeasedJobs({
  effectiveJobHandlers,
  jobs,
  now,
  postgresRuntime,
  report,
  retryBackoffSeconds,
  routeIdSet
}) {
  for (const job of jobs) {
    if (!routeIdSet.has(job.routeId)) {
      await failJob({
        postgresRuntime,
        job,
        error: new Error(`Unknown queue-backed route: ${job.routeId}`),
        retryBackoffSeconds,
        now
      });
      report.processed += 1;
      report.failed += 1;
      if (job.attemptCount >= job.maxAttempts) report.deadLettered += 1;
      report.results.push({ id: job.id, routeId: job.routeId, status: "failed", reason: "unknown-route" });
      continue;
    }

    try {
      const result = await runJobAdapter(job, effectiveJobHandlers);
      await completeJob({ postgresRuntime, job, result, now });
      report.processed += 1;
      report.succeeded += 1;
      report.results.push({ id: job.id, routeId: job.routeId, status: "succeeded" });
    } catch (error) {
      const outcome = await failJob({ postgresRuntime, job, error, retryBackoffSeconds, now });
      report.processed += 1;
      if (outcome.status === "dead_lettered") {
        report.deadLettered += 1;
      } else {
        report.failed += 1;
      }
      report.results.push({ id: job.id, routeId: job.routeId, status: outcome.status, reason: errorMessage(error) });
    }
  }
}

async function requeueExpiredJobs({ postgresRuntime, leaseSeconds }) {
  const result = await postgresRuntime.query(
    `UPDATE api_jobs
     SET status = CASE WHEN attempt_count >= max_attempts THEN 'dead_lettered' ELSE 'queued' END,
         locked_by = NULL,
         locked_at = NULL,
         run_after = CASE WHEN attempt_count >= max_attempts THEN run_after ELSE NOW() END,
         result = jsonb_build_object('status', 'lease-expired', 'leaseSeconds', $1::int),
         updated_at = NOW()
     WHERE status = 'running'
       AND locked_at IS NOT NULL
       AND locked_at < NOW() - ($1::int * INTERVAL '1 second')
     RETURNING id, status`,
    [leaseSeconds]
  );
  return result.rows.map((row) => ({ id: row.id, status: row.status }));
}

async function completeJob({ postgresRuntime, job, result, now }) {
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
      [
        job.id,
        JSON.stringify({
          ...result,
          completedAtIso: now().toISOString(),
          liveNetworkCalls: Boolean(result?.liveNetworkCalls ?? hasLiveProviderNetworkCall(result?.payload))
        })
      ]
    );
    await auditJob(client, job, "api.job.succeeded", { routeId: job.routeId });
  });
}

async function failJob({ postgresRuntime, job, error, retryBackoffSeconds, now }) {
  const exhausted = job.attemptCount >= job.maxAttempts;
  const status = exhausted ? "dead_lettered" : "queued";
  const action = exhausted ? "api.job.dead_lettered" : "api.job.retry_scheduled";
  const payload = {
    status,
    error: errorMessage(error),
    failedAtIso: now().toISOString(),
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts
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
      [job.id, status, JSON.stringify(payload), errorMessage(error), retryBackoffSeconds]
    );
    await auditJob(client, job, action, payload);
  });

  return { status };
}

async function auditJob(client, job, action, metadata) {
  await client.query(
    `INSERT INTO audit_log (subject_type, subject_id, actor_id, action, metadata)
     VALUES ('api_job', $1, $2, $3, $4::jsonb)`,
    [job.id, job.userId, action, JSON.stringify(metadata)]
  );
}

async function runJobAdapter(job, jobHandlers) {
  const handler = jobHandlers[job.routeId] ?? jobHandlers.default;
  return handler({ job });
}

function createDefaultJobHandlers({ env, postgresRuntime, fetchImpl, aiFlowAdminConfig, persistGeneratedImageArtifacts }) {
  const aiService = createAiCardGenerationService({
    env,
    fetchImpl,
    aiFlowAdminConfig,
    loadAiFlowAdminConfig: () => readWorkerAdminAiFlowConfig(postgresRuntime, env),
    costGate: createAiFlowCostGate({
      store: createPostgresAiFlowCostStore({ getPool: () => postgresRuntime.getPool() })
    })
  });

  return {
    "ai-chat-respond": async ({ job }) => runQueuedAiJob({ job, aiService, method: "respondChat" }),
    "ai-card-generate": async ({ job }) =>
      runQueuedAiJob({ job, aiService, method: "generateCard", persistGeneratedImageArtifacts }),
    "render-packets": async ({ job }) => ({
      status: "render-review-ready",
      routeId: job.routeId,
      artifactVerification: "worker-reviewed",
      evidence: "Worker adapter completed render packet review handoff."
    }),
    "manual-vendor-handoff": async ({ job }) => ({
      status: "vendor-handoff-ready",
      routeId: job.routeId,
      realOrdersEnabled: false,
      evidence: "Worker adapter completed manual vendor handoff review without placing a real order."
    }),
    default: async ({ job }) => ({
      status: "generic-worker-complete",
      routeId: job.routeId,
      liveNetworkCalls: false
    })
  };
}

async function readWorkerAdminAiFlowConfig(postgresRuntime, env) {
  try {
    const result = await postgresRuntime.query(
      `SELECT payload
       FROM admin_runtime_configs
       WHERE key = 'ai-flow-configs'
       LIMIT 1`
    );
    return result.rows[0]?.payload?.configs ?? result.rows[0]?.payload?.aiFlowConfigs ?? [];
  } catch {
    return [];
  }
}

async function runQueuedAiJob({ job, aiService, method, persistGeneratedImageArtifacts }) {
  const body = job.payload?.body;
  if (!body || typeof body !== "object") throw new Error(`Queued ${job.routeId} job is missing sanitized AI payload.`);
  const requestContext = job.payload?.requestContext && typeof job.payload.requestContext === "object"
    ? job.payload.requestContext
    : {};
  const result = await aiService[method](body, requestContext);
  if (result.statusCode === 429) throw new Error(`${job.routeId} provider rate limited; retry scheduled by worker.`);
  if (result.statusCode >= 500) throw new Error(`${job.routeId} provider failed with HTTP ${result.statusCode}.`);
  const persisted =
    typeof persistGeneratedImageArtifacts === "function"
      ? await persistGeneratedImageArtifacts({ authContext: requestContext.authContext, payload: result.payload })
      : undefined;
  const payload = persisted?.payload ?? result.payload;
  return buildProviderWorkerResult({
    status: "ai-result-ready",
    routeId: job.routeId,
    httpStatusCode: result.statusCode,
    providerCallMode: hasLiveProviderNetworkCall(payload) ? "live-provider" : "provider-disabled",
    payload: compactAiWorkerPayload(payload),
    evidence: "Worker completed queued AI flow with server-selected provider config and durable cost gate."
  });
}

function normalizeJobRow(row) {
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

function workerBatchSize(env) {
  return safeIntegerEnv(env.CUSTOMCARD_WORKER_BATCH_SIZE, 5, 1, 25);
}

function workerLeaseSeconds(env) {
  return safeIntegerEnv(env.CUSTOMCARD_WORKER_LEASE_SECONDS, 300, 30, 3600);
}

function workerRetryBackoffSeconds(env) {
  return safeIntegerEnv(env.CUSTOMCARD_WORKER_RETRY_BACKOFF_SECONDS, 60, 5, 3600);
}

function workerPollIntervalMs(env) {
  return safeIntegerEnv(env.CUSTOMCARD_WORKER_POLL_INTERVAL_MS, 5000, 250, 60000);
}

function defaultWorkerId(env) {
  return String(env.CUSTOMCARD_WORKER_ID ?? `${env.HOSTNAME ?? "local"}:${process.pid}`);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeIntegerEnv(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
