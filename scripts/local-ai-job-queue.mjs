#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadLocalAiEnvFiles } from "./ai-card-generator.mjs";
import { createLocalComfyWorkerRuntime, resolveLocalComfyWorkerEnv } from "./local-comfy-worker.mjs";
import { stories } from "./model-benchmark-loop.mjs";
import { createPostgresRuntime } from "./postgres-runtime.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const defaultStoryIds = ["botanical-birthday"];
const localHostnames = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

export function parseLocalAiQueueArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const next = argv[index + 1];
    if (inlineValue !== undefined) {
      args[key] = inlineValue;
    } else if (next && !next.startsWith("--")) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = "true";
    }
  }
  return args;
}

export function buildLocalAiQueuePlan({ args = {}, env = process.env, now = () => new Date() } = {}) {
  const timestamp = now().toISOString();
  const runId = safeId(args.runId, `local-ai-loop-${fileTimestamp(timestamp)}`);
  const workerEnv = localOnlyWorkerEnv(env);
  const write = enabled(args.write) || enabled(args.live);
  const dryRun = args.dryRun === undefined ? !write : enabled(args.dryRun);
  const selectedStories = selectStories(args);
  const localEndpoints = resolveLocalEndpoints(workerEnv);
  const blockers = validateLocalOnly(localEndpoints);
  const outputDir = resolve(
    repoRoot,
    args.outputDir || `docs/evidence/generated-card-comparisons/local-ai-job-queue-${fileTimestamp(timestamp)}`
  );
  const userId = safeId(args.userId || env.CUSTOMCARD_LOCAL_AI_QUEUE_USER_ID, "local-admin-human-loop");
  const sessionId = safeId(args.sessionId || env.CUSTOMCARD_LOCAL_AI_QUEUE_SESSION_ID, `${userId}-session`);
  const adminEmail = safeEmail(args.adminEmail || env.CUSTOMCARD_LOCAL_AI_QUEUE_ADMIN_EMAIL, "local-admin@customcard.local");
  const providerFingerprint = hashText(
    [
      localEndpoints.llmBaseUrl,
      localEndpoints.llmModel,
      localEndpoints.comfyUrl,
      localEndpoints.comfyCheckpoint,
      localEndpoints.comfyWorkflowId,
      localEndpoints.comfyWorkflowPath
    ].join("|")
  ).slice(0, 12);
  const jobs = selectedStories.map((story) =>
    buildLocalAiQueueJob({
      story,
      userId,
      sessionId,
      runId,
      timestamp,
      providerFingerprint,
      localEndpoints
    })
  );

  return {
    service: "customcard-local-ai-job-queue",
    status: blockers.length > 0 ? "blocked" : dryRun ? "dry-run" : "ready-to-write",
    runId,
    dryRun,
    write,
    runWorker: enabled(args.runWorker),
    ensureUser: enabled(args.ensureUser),
    outputDir,
    queuedAtIso: timestamp,
    user: {
      id: userId,
      email: adminEmail,
      role: "admin",
      sessionId
    },
    localOnly: {
      required: true,
      textAdapterId: "local-openai-compatible-chat",
      imageAdapterId: "local-comfyui-api-image",
      ...localEndpoints
    },
    aggregateTracking: {
      benchmarkAggregate: "npm run card:benchmark:aggregate",
      modelCoverage: "npm run card:benchmark:model-coverage",
      trackedDimensions: [
        "story_id",
        "text_adapter_id",
        "text_model",
        "image_adapter_id",
        "image_checkpoint",
        "comfy_workflow",
        "provider_endpoint",
        "run_id",
        "code_version",
        "technique"
      ]
    },
    blockers,
    jobs
  };
}

export async function queueLocalAiJobs({ plan, env = process.env, postgresPoolFactory } = {}) {
  if (!plan) throw new Error("queueLocalAiJobs requires a plan.");
  if (plan.blockers.length > 0) {
    throw new Error(`Local AI queue is blocked: ${plan.blockers.join("; ")}`);
  }
  if (!plan.write || plan.dryRun) {
    return { status: "dry-run", inserted: 0, skipped: 0, jobs: plan.jobs.map((job) => ({ id: job.id, status: "planned" })) };
  }
  if (env.CUSTOMCARD_API_RUNTIME !== "postgres") {
    throw new Error("Writing local AI jobs requires CUSTOMCARD_API_RUNTIME=postgres.");
  }
  if (!env.DATABASE_URL) {
    throw new Error("Writing local AI jobs requires DATABASE_URL.");
  }

  const postgresRuntime = createPostgresRuntime({ env, postgresPoolFactory });
  try {
    const results = await postgresRuntime.withTransaction(async (client) => {
      if (plan.ensureUser) {
        await client.query(
          `INSERT INTO users (id, email, locale, region, platform)
           VALUES ($1, $2, 'en-US', 'US', 'local-admin-loop')
           ON CONFLICT (id) DO NOTHING`,
          [plan.user.id, plan.user.email]
        );
      }

      const rows = [];
      for (const job of plan.jobs) {
        const inserted = await client.query(
          `INSERT INTO api_jobs (id, user_id, route_id, idempotency_key_id, status, payload, result)
           VALUES ($1, $2, $3, NULL, 'queued', $4::jsonb, '{}'::jsonb)
           ON CONFLICT (id) DO NOTHING`,
          [job.id, job.userId, job.routeId, JSON.stringify(job.payload)]
        );
        const status = Number(inserted.rowCount ?? 0) > 0 ? "queued" : "already-existed";
        rows.push({ id: job.id, status });
        await client.query(
          `INSERT INTO audit_log (subject_type, subject_id, actor_id, action, metadata)
           VALUES ('api_job', $1, $2, 'local_ai_loop.job_queued', $3::jsonb)`,
          [
            job.id,
            plan.user.id,
            JSON.stringify({
              runId: plan.runId,
              storyId: job.storyId,
              status,
              localOnly: true,
              humanReviewRequired: true
            })
          ]
        );
      }
      return rows;
    });
    return {
      status: "queued",
      inserted: results.filter((row) => row.status === "queued").length,
      skipped: results.filter((row) => row.status !== "queued").length,
      jobs: results
    };
  } finally {
    await postgresRuntime.close();
  }
}

export async function runQueuedLocalAiJobs({ plan, env = process.env } = {}) {
  if (!plan?.runWorker) return { status: "skipped", reason: "runWorker disabled", reports: [] };
  const runtime = createLocalComfyWorkerRuntime({ env: localOnlyWorkerEnv(env) });
  try {
    const reports = [];
    for (const job of plan.jobs) {
      reports.push(await runtime.runJobById({ jobId: job.id, userId: job.userId }));
    }
    return { status: "processed", reports };
  } finally {
    await runtime.close();
  }
}

export function writeLocalAiQueueReport({ plan, queueResult, workerResult } = {}) {
  if (!plan) throw new Error("writeLocalAiQueueReport requires a plan.");
  mkdirSync(plan.outputDir, { recursive: true });
  const jsonPath = resolve(plan.outputDir, "planned-jobs.json");
  const markdownPath = resolve(plan.outputDir, "queued-jobs.md");
  writeJson(jsonPath, { ...plan, queueResult, workerResult });
  writeText(markdownPath, renderQueueMarkdown({ plan, queueResult, workerResult }));
  return { jsonPath, markdownPath };
}

function buildLocalAiQueueJob({ story, userId, sessionId, runId, timestamp, providerFingerprint, localEndpoints }) {
  const routeId = "ai-card-generate";
  const body = sanitizeAiCardJobBody(story.request);
  const idempotencyKey = `local-ai-loop:${runId}:${story.id}:${providerFingerprint}`;
  const jobId = stableRuntimeId("job", userId, routeId, idempotencyKey);

  return {
    id: jobId,
    userId,
    routeId,
    storyId: story.id,
    status: "queued",
    payload: {
      routeId,
      jobKind: "ai-flow",
      idempotencyKey,
      requestContext: {
        rateKey: userId,
        idempotencyKey,
        authContext: {
          userId,
          sessionId,
          role: "admin"
        }
      },
      security: {
        payloadMinimized: true,
        clientAiFlowConfigAccepted: false,
        credentialsPersisted: false,
        rawProviderContentStored: false,
        localOnlyModelCalls: true
      },
      flowId: "card-generation",
      body,
      localLoop: {
        source: "scripts/local-ai-job-queue.mjs",
        runId,
        queuedAtIso: timestamp,
        benchmarkStoryId: story.id,
        benchmarkStory: {
          customerType: story.customer_type,
          occasion: story.occasion,
          memoryLoad: story.memory_load,
          mustInclude: story.must_include,
          mustAvoid: story.must_avoid
        },
        providers: {
          textAdapterId: "local-openai-compatible-chat",
          textModel: localEndpoints.llmModel,
          textBaseUrl: localEndpoints.llmBaseUrl,
          imageAdapterId: "local-comfyui-api-image",
          imageCheckpoint: localEndpoints.comfyCheckpoint,
          comfyUrl: localEndpoints.comfyUrl,
          comfyWorkflowId: localEndpoints.comfyWorkflowId,
          comfyWorkflowPath: localEndpoints.comfyWorkflowPath
        },
        humanReview: {
          required: true,
          role: "admin",
          status: "pending-admin-review",
          promotionGate: "benchmark score, rendered panels, and copy fidelity must be reviewed before model promotion."
        },
        technique: [
          "api_jobs queue",
          "local OpenAI-compatible chat",
          "local ComfyUI image generation",
          "admin human-in-the-loop review"
        ],
        codeVersion: localEndpoints.codeVersion
      }
    }
  };
}

function localOnlyWorkerEnv(env) {
  return resolveLocalComfyWorkerEnv({
    ...env,
    CUSTOMCARD_AI_CARD_COPY_ADAPTER_ID: "local-openai-compatible-chat",
    CUSTOMCARD_AI_CARD_COPY_FALLBACK_ADAPTER_ID: "local-openai-compatible-chat",
    CUSTOMCARD_AI_CARD_IMAGE_ADAPTER_ID: "local-comfyui-api-image",
    CUSTOMCARD_AI_CARD_IMAGE_FALLBACK_ADAPTER_ID: "local-comfyui-api-image"
  });
}

function resolveLocalEndpoints(env) {
  return {
    llmBaseUrl: firstNonEmpty(env.CUSTOMCARD_LOCAL_LLM_BASE_URL, env.LMSTUDIO_BASE_URL, env.KOBOLDCPP_BASE_URL),
    llmModel: firstNonEmpty(
      env.CUSTOMCARD_LOCAL_LLM_MODEL,
      env.LMSTUDIO_MODEL,
      env.KOBOLDCPP_MODEL,
      env.CUSTOMCARD_AI_CARD_COPY_MODEL,
      "local-default"
    ),
    comfyUrl: firstNonEmpty(env.CUSTOMCARD_COMFYUI_URL, env.COMFYUI_URL, "http://127.0.0.1:8188"),
    comfyCheckpoint: firstNonEmpty(
      env.CUSTOMCARD_COMFYUI_CHECKPOINT,
      env.COMFYUI_CHECKPOINT,
      env.CUSTOMCARD_COMFYUI_MODEL_CHECKPOINT,
      "DreamShaper_8_pruned.safetensors"
    ),
    comfyWorkflowId: firstNonEmpty(env.CUSTOMCARD_COMFYUI_WORKFLOW_ID, env.COMFYUI_WORKFLOW_ID, "api-sdxl-checkpoint-card-v1"),
    comfyWorkflowPath: firstNonEmpty(env.CUSTOMCARD_COMFYUI_WORKFLOW_PATH, env.COMFYUI_WORKFLOW_PATH, ""),
    codeVersion: firstNonEmpty(env.CUSTOMCARD_CODE_VERSION, env.VERCEL_GIT_COMMIT_SHA, "local-worktree")
  };
}

function validateLocalOnly(localEndpoints) {
  const blockers = [];
  if (!localEndpoints.llmBaseUrl) {
    blockers.push("CUSTOMCARD_LOCAL_LLM_BASE_URL, LMSTUDIO_BASE_URL, or KOBOLDCPP_BASE_URL must point at a local LLM server.");
  } else if (!isLocalUrl(localEndpoints.llmBaseUrl)) {
    blockers.push(`Local LLM base URL must be localhost/127.0.0.1, got ${localEndpoints.llmBaseUrl}.`);
  }
  if (!isLocalUrl(localEndpoints.comfyUrl)) {
    blockers.push(`ComfyUI URL must be localhost/127.0.0.1, got ${localEndpoints.comfyUrl}.`);
  }
  return blockers;
}

function selectStories(args) {
  if (enabled(args.allStories)) return Object.values(stories);
  const ids = String(args.stories || defaultStoryIds.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const missing = ids.filter((id) => !stories[id]);
  if (missing.length > 0) {
    throw new Error(`Unknown benchmark story id(s): ${missing.join(", ")}`);
  }
  return ids.map((id) => stories[id]);
}

function sanitizeAiCardJobBody(body) {
  return {
    sender: safeQueuedText(body.sender, 120),
    recipient: safeQueuedText(body.recipient, 120),
    relationship: safeQueuedText(body.relationship, 80),
    occasion: safeQueuedText(body.occasion, 120),
    tone: safeQueuedText(body.tone, 80),
    style: safeQueuedText(body.style, 160),
    language: safeQueuedText(body.language, 40),
    personal_note: safeQueuedText(body.personal_note ?? body.personalNote, 1200),
    memory_notes: safeQueuedTextArray(body.memory_notes ?? body.memoryNotes, 6, 600)
  };
}

function safeQueuedTextArray(value, maxItems, maxLength) {
  return (Array.isArray(value) ? value : [])
    .map((item) => safeQueuedText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function safeQueuedText(value, maxLength) {
  const text = String(value ?? "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b(?:\d[ -]*?){13,16}\b/g, "[redacted-payment]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[redacted-phone]")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, Math.max(1, maxLength));
}

function renderQueueMarkdown({ plan, queueResult, workerResult }) {
  const lines = [
    `# Local AI Job Queue`,
    ``,
    `- Run: ${plan.runId}`,
    `- Status: ${plan.status}`,
    `- Dry run: ${plan.dryRun}`,
    `- Local LLM: ${plan.localOnly.llmModel} at ${plan.localOnly.llmBaseUrl || "not configured"}`,
    `- ComfyUI: ${plan.localOnly.comfyUrl}`,
    `- Image checkpoint: ${plan.localOnly.comfyCheckpoint}`,
    `- Human review: admin required before promotion`,
    ``,
    `## Jobs`,
    ``
  ];
  for (const job of plan.jobs) {
    lines.push(
      `- ${job.id}`,
      `  - Story: ${job.storyId}`,
      `  - Route: ${job.routeId}`,
      `  - Queue payload: api_jobs.payload, sanitized card fields only`,
      `  - Review gate: ${job.payload.localLoop.humanReview.promotionGate}`
    );
  }
  if (plan.blockers.length > 0) {
    lines.push(``, `## Blockers`, ``);
    for (const blocker of plan.blockers) lines.push(`- ${blocker}`);
  }
  if (queueResult) {
    lines.push(``, `## Queue Result`, ``, "```json", JSON.stringify(queueResult, null, 2), "```");
  }
  if (workerResult) {
    lines.push(``, `## Worker Result`, ``, "```json", JSON.stringify(workerResult, null, 2), "```");
  }
  lines.push(``);
  return lines.join("\n");
}

function stableRuntimeId(prefix, ...parts) {
  return `${prefix}_${hashText(parts.join(":")).slice(0, 24)}`;
}

function hashText(value) {
  return createHash("sha256").update(String(value)).digest("hex");
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

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function enabled(value) {
  return /^(1|true|yes|enabled|on)$/i.test(String(value ?? ""));
}

function isLocalUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && localHostnames.has(url.hostname);
  } catch {
    return false;
  }
}

function fileTimestamp(value) {
  return String(value).replace(/[:.]/g, "-");
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, value);
}

if (isCliEntrypoint()) {
  loadLocalAiEnvFiles();
  const args = parseLocalAiQueueArgs();
  const plan = buildLocalAiQueuePlan({ args });
  let queueResult;
  let workerResult;
  try {
    queueResult = await queueLocalAiJobs({ plan, env: localOnlyWorkerEnv(process.env) });
    workerResult = await runQueuedLocalAiJobs({ plan, env: localOnlyWorkerEnv(process.env) });
  } catch (error) {
    queueResult = { status: "blocked", error: error instanceof Error ? error.message : String(error) };
    process.exitCode = 1;
  } finally {
    const report = writeLocalAiQueueReport({ plan, queueResult, workerResult });
    console.log(JSON.stringify({ planStatus: plan.status, queueResult, workerResult, report }, null, 2));
    if (plan.blockers.length > 0) process.exitCode = 1;
  }
}

function isCliEntrypoint() {
  return Boolean(process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href);
}
