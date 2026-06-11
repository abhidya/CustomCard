import { apiRouteContracts as defaultRoutes } from "../src/apiRouteContractsData.mjs";
import { createPostgresRuntime } from "./postgres-runtime.mjs";

export const workerRequiredEnv = [
  "CUSTOMCARD_ENV",
  "CUSTOMCARD_API_RUNTIME",
  "DATABASE_URL",
  "QUEUE_URL",
  "OBJECT_STORE_URL",
  "OBJECT_STORE_SIGNING_SECRET",
  "AUTH_SESSION_SECRET",
  "REAL_ORDER_KILL_SWITCH"
];

const productionEnvNames = new Set(["prod", "production"]);

export function createWorkerRuntime({
  env = process.env,
  routes = defaultRoutes,
  postgresPoolFactory,
  jobHandlers = defaultJobHandlers,
  workerId = defaultWorkerId(env),
  now = () => new Date()
} = {}) {
  const postgresRuntime = createPostgresRuntime({ env, postgresPoolFactory });
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
        postgres: postgresRuntime.describe(),
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
      const jobs = await leaseJobs({ postgresRuntime, workerId, limit });
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

      for (const job of jobs) {
        if (!routeIdSet.has(job.routeId)) {
          await failJob({
            postgresRuntime,
            job,
            error: new Error(`Unknown queue-backed route: ${job.routeId}`),
            retryBackoffSeconds: workerRetryBackoffSeconds(env),
            now
          });
          report.processed += 1;
          report.failed += 1;
          if (job.attemptCount >= job.maxAttempts) report.deadLettered += 1;
          report.results.push({ id: job.id, routeId: job.routeId, status: "failed", reason: "unknown-route" });
          continue;
        }

        try {
          const result = await runJobAdapter(job, jobHandlers);
          await completeJob({ postgresRuntime, job, result, now });
          report.processed += 1;
          report.succeeded += 1;
          report.results.push({ id: job.id, routeId: job.routeId, status: "succeeded" });
        } catch (error) {
          const outcome = await failJob({ postgresRuntime, job, error, retryBackoffSeconds: workerRetryBackoffSeconds(env), now });
          report.processed += 1;
          if (outcome.status === "dead_lettered") {
            report.deadLettered += 1;
          } else {
            report.failed += 1;
          }
          report.results.push({ id: job.id, routeId: job.routeId, status: outcome.status, reason: errorMessage(error) });
        }
      }

      return report;
    },
    async close() {
      await postgresRuntime.close();
    }
  };
}

export function describeWorkerReadiness({ env = process.env, routes = defaultRoutes } = {}) {
  const runtime = createWorkerRuntime({ env, routes });
  const blockers = runtime.validate({ requirePostgres: false });
  return {
    ...runtime.describe(),
    status: blockers.length === 0 ? "ready" : "blocked",
    blockers
  };
}

export function validateWorkerEnv(env = process.env, { requirePostgres = false } = {}) {
  const missing = workerRequiredEnv.filter((key) => !env[key]);
  const blockers = missing.map((key) => `CustomCard worker missing env: ${key}`);
  const customCardEnv = String(env.CUSTOMCARD_ENV ?? "").trim().toLowerCase();
  const productionRuntime = productionEnvNames.has(customCardEnv) || env.NODE_ENV === "production";
  if ((productionRuntime || requirePostgres) && env.CUSTOMCARD_API_RUNTIME !== "postgres") {
    blockers.push("CustomCard worker execution requires CUSTOMCARD_API_RUNTIME=postgres.");
  }
  if (String(env.AUTH_SESSION_SECRET ?? "").length < 32) {
    blockers.push("CustomCard worker requires AUTH_SESSION_SECRET to be at least 32 characters.");
  }
  if (String(env.OBJECT_STORE_SIGNING_SECRET ?? "").length < 32) {
    blockers.push("CustomCard worker requires OBJECT_STORE_SIGNING_SECRET to be at least 32 characters.");
  }
  return blockers;
}

async function leaseJobs({ postgresRuntime, workerId, limit }) {
  const result = await postgresRuntime.query(
    `WITH next_jobs AS (
       SELECT id
       FROM api_jobs
       WHERE status = 'queued'
         AND run_after <= NOW()
       ORDER BY created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT $1
     )
     UPDATE api_jobs
     SET status = 'running',
         locked_by = $2,
         locked_at = NOW(),
         attempt_count = attempt_count + 1,
         updated_at = NOW()
     WHERE id IN (SELECT id FROM next_jobs)
     RETURNING id, user_id, route_id, idempotency_key_id, payload, attempt_count, max_attempts`,
    [limit, workerId]
  );
  return result.rows.map(normalizeJobRow);
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
          liveNetworkCalls: false
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

const defaultJobHandlers = {
  "ai-chat-respond": async ({ job }) => ({
    status: "chat-response-ready",
    routeId: job.routeId,
    providerCallMode: "no-live-network-call",
    evidence: "Worker adapter completed queued AI chat handoff without a live provider call."
  }),
  "ai-card-generate": async ({ job }) => ({
    status: "card-generation-ready",
    routeId: job.routeId,
    providerCallMode: "no-live-network-call",
    evidence: "Worker adapter completed queued card generation handoff without a live provider call."
  }),
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

function defaultWorkerId(env) {
  return String(env.CUSTOMCARD_WORKER_ID ?? `${env.HOSTNAME ?? "local"}:${process.pid}`);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function safeIntegerEnv(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}
