import { readFileSync } from "node:fs";
import { checkAbsent, checkIncludes } from "./doctor-harness.mjs";

const files = {
  controlPlane: "src/aiProviderControlPlane.ts",
  controlPlaneTest: "src/aiProviderControlPlane.test.ts",
  benchmarkData: "src/benchmarkResultsData.ts",
  migration: "infra/migrations/005_ai_provider_control_plane.sql",
  docs: "docs/ai-provider-control-plane-design.md",
  decisions: "docs/decisions.md",
  queueRunbook: "docs/ai-queue-operations-runbook.md",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const checks = [
  checkIncludes("catalog", "runtime-provider-catalog", contents.controlPlane, [
    "aiProviderModelCatalog",
    "deepai-text2img-standard",
    "deepai-text2img-hd",
    "deepai-text2img-genius",
    "deepai-text2img-super-genius",
    "@cf/qwen/qwen3-30b-a3b-fp8",
    "imageGeneratorVersion",
    "negativePrompt"
  ]),
  checkIncludes("routing", "runtime-route-policy", contents.controlPlane, [
    "aiRoutePolicies",
    "card-copy-route-v1",
    "card-image-route-v1",
    "customerErrorPolicy",
    "generic-status-only",
    "queueRequired",
    "adminChangeMode: \"runtime-config\""
  ]),
  checkIncludes("benchmarks", "persisted-grade-scorecards", `${contents.controlPlane}\n${contents.benchmarkData}`, [
    "buildAiModelScorecard",
    "aiBenchmarkGradePersistenceContract",
    "model-benchmark-20260614-fixed-provider-requests",
    "productScore: 66",
    "contractScore: 94",
    "manual-grade.md"
  ]),
  checkIncludes("schema", "control-plane-tables", contents.migration, [
    "CREATE TABLE IF NOT EXISTS ai_provider_models",
    "CREATE TABLE IF NOT EXISTS ai_route_policies",
    "CREATE TABLE IF NOT EXISTS ai_prompt_profiles",
    "CREATE TABLE IF NOT EXISTS ai_benchmark_runs",
    "CREATE TABLE IF NOT EXISTS ai_benchmark_grades",
    "customer_error_policy TEXT NOT NULL CHECK (customer_error_policy = 'generic-status-only')",
    "raw_prompt_stored BOOLEAN NOT NULL DEFAULT FALSE CHECK (raw_prompt_stored = FALSE)"
  ]),
  checkIncludes("tests", "control-plane-regression-tests", contents.controlPlaneTest, [
    "models DeepAI text2img variants",
    "without promoting DeepAI below the product gate",
    "requires grade persistence and generic customer error policy",
    "ships a migration for provider catalog imports"
  ]),
  checkIncludes("docs", "operator-design-record", `${contents.docs}\n${contents.decisions}\n${contents.queueRunbook}`, [
    "AI provider control plane",
    "Original brief",
    "DeepAI text2img",
    "runtime config",
    "benchmark grades",
    "customer_error_policy"
  ]),
  checkIncludes("ci", "control-plane-doctor-is-gated", `${contents.packageJson}\n${contents.workflow}`, [
    "\"ai:control-plane:doctor\": \"node scripts/ai-provider-control-plane-doctor.mjs\"",
    "Validate AI provider control plane",
    "npm run ai:control-plane:doctor"
  ]),
  checkAbsent("safety", "no-customer-provider-error-leakage", `${contents.controlPlane}\n${contents.migration}`, [
    "customerErrorPolicy: \"provider-message\"",
    "customer_error_policy = 'provider-message'",
    "raw_prompt_stored BOOLEAN NOT NULL DEFAULT TRUE"
  ])
];

const lanes = Array.from(new Set(checks.map((check) => check.lane))).map((lane) => {
  const laneChecks = checks.filter((check) => check.lane === lane);
  return {
    lane,
    passed: laneChecks.filter((check) => check.passed).length,
    total: laneChecks.length,
    status: laneChecks.every((check) => check.passed) ? "repo-consistent" : "contract-drift"
  };
});
const failed = checks.filter((check) => !check.passed);

console.log(
  JSON.stringify(
    {
      service: "customcard-ai-provider-control-plane-doctor",
      status: failed.length === 0 ? "repo-consistent" : "contract-drift",
      scope: "repo-local",
      catalogModels: 8,
      routePolicies: 2,
      persistedBenchmarkTables: 5,
      liveProviderCalls: false,
      realOrdersEnabled: false,
      lanes,
      checks,
      registerIssues: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);
