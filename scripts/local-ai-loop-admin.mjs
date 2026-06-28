import {
  buildLocalAiQueuePlan,
  queueLocalAiJobs,
  runQueuedLocalAiJobs,
  writeLocalAiQueueReport
} from "./local-ai-job-queue.mjs";

const allowedModes = new Set(["plan", "queue", "queue-and-run"]);

export async function runAdminLocalAiLoop({ body = {}, env = process.env, postgresPoolFactory, writeReport = true } = {}) {
  const normalized = normalizeLocalAiLoopBody(body);
  if (normalized.error) {
    return {
      statusCode: 400,
      payload: {
        service: "customcard-api",
        status: "invalid-local-ai-loop-request",
        error: normalized.error,
        externalNetworkCalls: false,
        realOrdersEnabled: false
      }
    };
  }

  const args = {
    stories: normalized.stories.join(","),
    allStories: normalized.allStories ? "true" : "false",
    dryRun: normalized.mode === "plan" ? "true" : "false",
    write: normalized.mode === "plan" ? "false" : "true",
    runWorker: normalized.mode === "queue-and-run" ? "true" : "false",
    ensureUser: normalized.ensureUser ? "true" : "false",
    userId: normalized.userId,
    adminEmail: normalized.adminEmail,
    outputDir: normalized.outputDir
  };

  const plan = buildLocalAiQueuePlan({ args, env });
  let queueResult;
  let workerResult;
  let report;
  try {
    queueResult = await queueLocalAiJobs({ plan, env, postgresPoolFactory });
    workerResult = await runQueuedLocalAiJobs({ plan, env });
    report = writeReport ? safeWriteLocalAiQueueReport({ plan, queueResult, workerResult }) : plannedReportPaths(plan);
  } catch (error) {
    queueResult = {
      status: "blocked",
      error: error instanceof Error ? error.message : String(error)
    };
    report = writeReport ? safeWriteLocalAiQueueReport({ plan, queueResult, workerResult }) : plannedReportPaths(plan);
  }

  const blocked = plan.blockers.length > 0 || queueResult?.status === "blocked";
  const completedWorker =
    workerResult?.status === "processed" &&
    Array.isArray(workerResult.reports) &&
    workerResult.reports.every((result) => result.status === "ready" && result.failed === 0 && result.deadLettered === 0);
  const status =
    blocked ? "blocked" : normalized.mode === "plan" ? "planned" : normalized.mode === "queue-and-run" && completedWorker ? "processed" : "queued";

  return {
    statusCode: blocked ? 409 : 200,
    payload: {
      service: "customcard-api",
      status,
      mode: normalized.mode,
      dryRun: plan.dryRun,
      write: plan.write,
      runWorker: plan.runWorker,
      localOnly: plan.localOnly,
      aggregateTracking: plan.aggregateTracking,
      blockers: plan.blockers,
      jobs: plan.jobs.map(summarizePlannedJob),
      queueResult,
      workerResult,
      report,
      externalNetworkCalls: false,
      localMachineCallsOnly: true,
      realOrdersEnabled: false,
      humanReview: {
        required: true,
        role: "admin",
        status: "pending-admin-review",
        nextSteps: [
          "Open the report paths.",
          "Inspect generated copy, image artifacts, and provider call events.",
          "Run the aggregate benchmark before promoting any model or checkpoint."
        ]
      }
    }
  };
}

function safeWriteLocalAiQueueReport({ plan, queueResult, workerResult }) {
  try {
    return writeLocalAiQueueReport({ plan, queueResult, workerResult });
  } catch (error) {
    return {
      ...plannedReportPaths(plan),
      status: "report-write-blocked",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function plannedReportPaths(plan) {
  return {
    jsonPath: `${plan.outputDir}/planned-jobs.json`,
    markdownPath: `${plan.outputDir}/queued-jobs.md`
  };
}

function normalizeLocalAiLoopBody(body) {
  const mode = safeChoice(body.mode ?? body.action, allowedModes, "plan");
  const allStories = body.allStories === true || body.all_stories === true || body.stories === "all";
  const stories = allStories ? [] : stringList(body.stories ?? body.story ?? body.storyId).slice(0, 12);
  if (!allStories && stories.length === 0) stories.push("botanical-birthday");
  const outputDir = safeRelativeEvidenceDir(body.outputDir ?? body.output_dir);
  if ((body.outputDir || body.output_dir) && !outputDir) {
    return { error: "outputDir must stay under docs/evidence/generated-card-comparisons." };
  }
  return {
    mode,
    allStories,
    stories,
    ensureUser: body.ensureUser !== false && body.ensure_user !== false,
    userId: safeId(body.userId ?? body.user_id, "local-admin-human-loop"),
    adminEmail: safeEmail(body.adminEmail ?? body.admin_email, "local-admin@customcard.local"),
    outputDir
  };
}

function summarizePlannedJob(job) {
  return {
    id: job.id,
    userId: job.userId,
    routeId: job.routeId,
    storyId: job.storyId,
    status: job.status,
    idempotencyKey: job.payload.idempotencyKey,
    queueInsert: {
      table: "api_jobs",
      status: "queued",
      idempotencyKeyId: null,
      attemptCount: 0,
      maxAttempts: 3
    },
    body: job.payload.body,
    localLoop: job.payload.localLoop,
    security: job.payload.security
  };
}

function stringList(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
  return String(value ?? "")
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function safeChoice(value, allowed, fallback) {
  const normalized = String(value ?? "").trim();
  return allowed.has(normalized) ? normalized : fallback;
}

function safeId(value, fallback) {
  return String(value || fallback)
    .trim()
    .replace(/[^a-zA-Z0-9_.:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || fallback;
}

function safeEmail(value, fallback) {
  const text = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : fallback;
}

function safeRelativeEvidenceDir(value) {
  const text = String(value ?? "").trim().replaceAll("\\", "/");
  if (!text) return "";
  if (!text.startsWith("docs/evidence/generated-card-comparisons/")) return "";
  if (text.includes("..")) return "";
  return text;
}
