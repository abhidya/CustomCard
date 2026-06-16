import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import {
  buildModelBenchmarkAdminCatalog,
  runModelBenchmarkLoopFromArgs,
  stories
} from "./model-benchmark-loop.mjs";

const repoRoot = resolve(import.meta.dirname, "..");
const evidenceRoot = resolve(repoRoot, "docs/evidence/generated-card-comparisons");
const allowedPhases = new Set(["smoke", "full", "pipeline-quality", "typography"]);
const reliabilityValues = new Set(["pass", "partial", "failed", "not-graded"]);
const decisionValues = new Set(["keep", "retry", "drop", "promote", "not-decided"]);
const liveRunGate = "admin-live-checkbox";

export function buildAdminModelBenchmarkCatalog({ env = process.env } = {}) {
  const catalog = buildModelBenchmarkAdminCatalog(env);
  return {
    service: "customcard-api",
    status: "ready",
    ...catalog,
    recentRuns: listRecentModelBenchmarkRuns(),
    liveRunsAllowed: true,
    liveRunGate,
    evidenceRoot: relativePath(evidenceRoot)
  };
}

export async function runAdminModelBenchmark({ body = {} } = {}) {
  const normalized = normalizeRunBody(body);
  if (normalized.error) {
    return {
      statusCode: 400,
      payload: {
        service: "customcard-api",
        status: "invalid-model-benchmark-run",
        error: normalized.error
      }
    };
  }

  mkdirSync(evidenceRoot, { recursive: true });
  const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = resolve(evidenceRoot, `admin-model-benchmark-${runStamp}`);
  const phaseDir = safeSegment(
    [
      normalized.phase,
      normalized.story || "all-stories",
      normalized.text || "default-text",
      normalized.image || "default-image",
      normalized.typographyMode || ""
    ].filter(Boolean).join("-")
  );

  const args = {
    phase: normalized.phase,
    "phase-dir": phaseDir,
    "output-dir": outputDir
  };
  if (normalized.story) args.story = normalized.story;
  if (normalized.text) args.text = normalized.text;
  if (normalized.image) args.image = normalized.image;
  if (normalized.typographyMode) args["typography-mode"] = normalized.typographyMode;
  args.live = normalized.live ? "true" : "false";

  try {
    const result = await runModelBenchmarkLoopFromArgs(args);
    return {
      statusCode: 200,
      payload: {
        service: "customcard-api",
        status: "completed",
        dryRun: result.dryRun,
        liveProviderCallsEnabled: result.liveProviderCallsEnabled,
        externalNetworkCalls: Boolean(normalized.live),
        realOrdersEnabled: false,
        outputDir: result.outputDir,
        phase: result.phase,
        phaseDir: result.phaseDir,
        plannedRuns: result.plannedRuns ?? result.summary?.plannedRuns ?? [],
        runs: summarizeRunsForAdmin(result.summary?.runs ?? []),
        summaryPath: result.dryRun
          ? relativePath(resolve(outputDir, `${phaseDir}-dry-run.json`))
          : relativePath(resolve(outputDir, `${phaseDir}-summary.json`)),
        providerHttpPath: result.dryRun ? null : relativePath(resolve(outputDir, `${phaseDir}-provider-http.json`))
      }
    };
  } catch (error) {
    return {
      statusCode: 500,
      payload: {
        service: "customcard-api",
        status: "model-benchmark-run-failed",
        error: error instanceof Error ? error.message : "Unknown model benchmark failure.",
        outputDir: relativePath(outputDir),
        phase: normalized.phase,
        phaseDir,
        externalNetworkCalls: Boolean(normalized.live),
        realOrdersEnabled: false
      }
    };
  }
}

export function saveAdminModelBenchmarkGrade({ body = {} } = {}) {
  const normalized = normalizeGradeBody(body);
  if (normalized.error) {
    return {
      statusCode: 400,
      payload: {
        service: "customcard-api",
        status: "invalid-model-benchmark-grade",
        error: normalized.error
      }
    };
  }

  mkdirSync(normalized.runDir, { recursive: true });
  const grade = {
    schemaVersion: 1,
    gradedAtIso: new Date().toISOString(),
    runDir: relativePath(normalized.runDir),
    productQualityScore: normalized.productQualityScore,
    promptPipelineContractScore: normalized.promptPipelineContractScore,
    routeReliability: normalized.routeReliability,
    decision: normalized.decision,
    visibleBlockers: normalized.visibleBlockers,
    notes: normalized.notes
  };
  const markdownPath = resolve(normalized.runDir, "manual-grade.md");
  const jsonPath = resolve(normalized.runDir, "manual-grade.json");
  writeFileSync(markdownPath, buildManualGradeMarkdown(grade));
  writeFileSync(jsonPath, `${JSON.stringify(grade, null, 2)}\n`);

  return {
    statusCode: 200,
    payload: {
      service: "customcard-api",
      status: "saved",
      grade,
      manualGradePath: relativePath(markdownPath),
      manualGradeJsonPath: relativePath(jsonPath),
      externalNetworkCalls: false,
      realOrdersEnabled: false
    }
  };
}

function normalizeRunBody(body) {
  const phase = safeChoice(body.phase, allowedPhases, "pipeline-quality");
  const story = safeOptionalId(body.story || body.storyId);
  if (story && !stories[story]) return { error: `Unknown benchmark story: ${story}` };
  const text = safeOptionalId(body.text || body.textCandidateId);
  const image = safeOptionalId(body.image || body.imageCandidateId);
  const typographyMode = safeOptionalId(body.typographyMode);
  const live = body.live === true || body.live === "true";
  return { phase, story, text, image, typographyMode, live };
}

function normalizeGradeBody(body) {
  const runDir = safeEvidenceRunDir(body.runDir);
  if (!runDir) return { error: "Grade requires a runDir under docs/evidence/generated-card-comparisons." };
  const productQualityScore = boundedScore(body.productQualityScore);
  const promptPipelineContractScore = boundedScore(body.promptPipelineContractScore);
  if (productQualityScore === undefined) return { error: "Grade requires productQualityScore from 0 to 100." };
  if (promptPipelineContractScore === undefined) {
    return { error: "Grade requires promptPipelineContractScore from 0 to 100." };
  }
  const routeReliability = safeChoice(body.routeReliability, reliabilityValues, "not-graded");
  const decision = safeChoice(body.decision, decisionValues, "not-decided");
  const visibleBlockers = stringList(body.visibleBlockers).slice(0, 12);
  const notes = String(body.notes ?? "").trim().slice(0, 4000);
  return { runDir, productQualityScore, promptPipelineContractScore, routeReliability, decision, visibleBlockers, notes };
}

function safeEvidenceRunDir(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const absolute = resolve(repoRoot, raw);
  if (!isEvidencePath(absolute)) return "";
  return absolute;
}

function isEvidencePath(path) {
  return path === evidenceRoot || path.startsWith(`${evidenceRoot}/`);
}

function boundedScore(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return undefined;
  return Math.round(parsed);
}

function safeChoice(value, allowed, fallback) {
  const normalized = safeOptionalId(value);
  return allowed.has(normalized) ? normalized : fallback;
}

function safeOptionalId(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === "all") return "";
  return /^[a-zA-Z0-9._-]+$/.test(normalized) ? normalized : "";
}

function safeSegment(value) {
  return String(value || "model-benchmark")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180) || "model-benchmark";
}

function stringList(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
  return String(value ?? "")
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function listRecentModelBenchmarkRuns(limit = 12) {
  if (!existsSync(evidenceRoot)) return [];
  const dirs = readdirSync(evidenceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const absolutePath = resolve(evidenceRoot, entry.name);
      return { name: entry.name, absolutePath, mtimeMs: statSync(absolutePath).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, 80);
  const runs = [];
  for (const dir of dirs) {
    const summaries = readdirSync(dir.absolutePath)
      .filter((name) => name.endsWith("-summary.json"))
      .map((name) => resolve(dir.absolutePath, name));
    for (const summaryPath of summaries) {
      const summary = readJson(summaryPath);
      for (const run of summarizeRunsForAdmin(summary?.runs ?? [])) {
        runs.push({
          ...run,
          outputDir: relativePath(dir.absolutePath),
          summaryPath: relativePath(summaryPath),
          createdAtIso: summary?.createdAtIso,
          phase: summary?.phase ?? run.phase
        });
      }
    }
    if (runs.length >= limit) break;
  }
  return runs.slice(0, limit);
}

function summarizeRunsForAdmin(runs) {
  return runs.map((run) => ({
    storyId: run.storyId,
    phase: run.phase,
    textCandidateId: run.textCandidateId,
    imageCandidateId: run.imageCandidateId,
    status: run.status || (run.error ? "failed" : run.statusCode === 200 ? "ok" : "unknown"),
    generatedBy: run.generatedBy,
    panelCount: run.panelCount ?? 0,
    runDir: run.runDir,
    contactSheet: run.contactSheet,
    manualGradePath: run.runDir ? gradePathIfExists(run.runDir, "manual-grade.md") : null,
    productQualityScore: readManualGradeScore(run.runDir, "productQualityScore"),
    promptPipelineContractScore: readManualGradeScore(run.runDir, "promptPipelineContractScore"),
    providerFailures: run.providerFailures,
    autoChecks: run.autoChecks
  }));
}

function gradePathIfExists(runDir, fileName) {
  const path = resolve(repoRoot, runDir || "", fileName);
  return isEvidencePath(path) && existsSync(path) ? relativePath(path) : null;
}

function readManualGradeScore(runDir, key) {
  if (!runDir) return null;
  const path = resolve(repoRoot, runDir, "manual-grade.json");
  if (!isEvidencePath(path) || !existsSync(path)) return null;
  const grade = readJson(path);
  return typeof grade?.[key] === "number" ? grade[key] : null;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

function buildManualGradeMarkdown(grade) {
  const blockers = grade.visibleBlockers.length
    ? grade.visibleBlockers.map((blocker) => `- ${blocker}`).join("\n")
    : "- None recorded.";
  return [
    "# Manual Grade",
    "",
    `- Graded at: ${grade.gradedAtIso}`,
    `- Product quality score: ${grade.productQualityScore}/100`,
    `- Prompt/pipeline contract score: ${grade.promptPipelineContractScore}/100`,
    `- Route reliability: ${grade.routeReliability}`,
    `- Decision: ${grade.decision}`,
    "",
    "## Visible Blockers",
    "",
    blockers,
    "",
    "## Notes",
    "",
    grade.notes || "No notes recorded.",
    ""
  ].join("\n");
}

function relativePath(path) {
  return relative(repoRoot, path).replaceAll("\\", "/") || basename(path);
}
