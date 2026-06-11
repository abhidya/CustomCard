import { readFileSync } from "node:fs";
import {
  aiProviderReadinessItems,
  summarizeAiProviderReadiness,
  validateAiProviderReadiness
} from "../src/aiProviderReadinessData.mjs";

const files = {
  aiTest: "src/aiProviderReadiness.test.ts",
  app: "src/App.tsx",
  apiContracts: "src/apiContracts.ts",
  apiServer: "scripts/api-server.mjs",
  providerCatalog: "src/providerCatalog.ts",
  providerRuntime: "src/providerRuntime.ts",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml",
  docs: "docs/platform-expansion-design.md"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const summary = summarizeAiProviderReadiness(aiProviderReadinessItems);
const validationBlockers = validateAiProviderReadiness(aiProviderReadinessItems);
const itemIds = aiProviderReadinessItems.map((item) => item.id);

const checks = [
  checkExact("register", "item-count", summary.total, 8),
  checkExact("register", "text-provider-contracts", summary.textProviderContracts, 16),
  checkExact("register", "image-provider-contracts", summary.imageProviderContracts, 17),
  checkExact("register", "local-fallbacks", summary.localFallbacks, 2),
  checkExact("register", "no-live-provider-calls", summary.liveProviderCallsEnabled, 0),
  checkExact("register", "no-live-external-network", summary.externalNetworkCalls, 0),
  checkExact("register", "no-production-traffic", summary.productionTrafficEnabled, 0),
  checkMinimum("register", "prompt-audit-count", summary.promptAuditRequired, 6),
  checkMinimum("register", "human-review-count", summary.humanReviewRequired, 5),
  checkNoBlockers("register", "executable-summary-and-validation", validationBlockers),
  checkArrayIncludes("register", "required-ai-readiness-ids", itemIds, [
    "ai-adapter-inventory",
    "model-allowlist-and-env-gates",
    "prompt-brand-safety-review",
    "pii-memory-minimization",
    "image-print-qa",
    "spend-budget-rate-limits",
    "evaluation-fixtures",
    "release-operations"
  ]),
  checkItemsShape("register", "ai-readiness-item-shape", aiProviderReadinessItems),
  checkIncludes("tests", "ai-readiness-tests", contents.aiTest, [
    "tracks text and image provider readiness without live model calls",
    "covers all existing AI text, image, and local fallback adapters explicitly",
    "flags unsafe AI launch claims"
  ]),
  checkIncludes("surfaces", "admin-api-ai-readiness-surfaces", `${contents.app}\n${contents.apiContracts}\n${contents.apiServer}`, [
    "AI provider readiness",
    "summarizeAiProviderReadiness",
    "aiProviderReadiness",
    "liveProviderCallsEnabled",
    "productionTrafficEnabled"
  ]),
  checkIncludes("provider-contracts", "provider-catalog-runtime-ai-contracts", `${contents.providerCatalog}\n${contents.providerRuntime}`, [
    "deterministic-customer-chat",
    "browser-svg-renderer",
    "openai-responses-chat",
    "anthropic-messages-chat",
    "google-gemini-chat",
    "cloudflare-workers-ai-chat",
    "openai-images",
    "cloudflare-workers-ai-image",
    "stability-stable-image",
    "deepai-text2img-image",
    "bfl-flux-image",
    "adobe-firefly-image",
    "recraft-image",
    "luma-image",
    "folded-card-four-panel-v1",
    "one-provider-request-per-panel",
    "panelRequests",
    "front-cover",
    "inside-left-panel",
    "inside-right-panel",
    "modelAllowlisted",
    "modelQualityReviewed"
  ]),
  checkIncludes("docs", "ai-readiness-docs", contents.docs, [
    "AI provider readiness",
    "`src/aiProviderReadiness.ts`",
    "`npm run ai:doctor`",
    "not live AI generation"
  ]),
  checkIncludes("ci", "ai-doctor-scripted-and-gated", `${contents.packageJson}\n${contents.workflow}`, [
    '"ai:doctor": "node scripts/ai-provider-readiness-doctor.mjs"',
    "Validate AI provider readiness",
    "npm run ai:doctor"
  ]),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "Approved model allowlist",
    "Prompt audit report",
    "Generated image sample set",
    "Provider spend alert export",
    "Rollback runbook"
  ])
];

const lanes = Array.from(new Set(checks.map((check) => check.lane))).map((lane) => {
  const laneChecks = checks.filter((check) => check.lane === lane);
  return {
    lane,
    passed: laneChecks.filter((check) => check.passed).length,
    total: laneChecks.length,
    status: laneChecks.every((check) => check.passed) ? "ready" : "blocked"
  };
});
const failed = checks.filter((check) => !check.passed);

console.log(
  JSON.stringify(
    {
      service: "customcard-ai-provider-readiness-doctor",
      status: failed.length === 0 ? "ready" : "blocked",
      items: summary.total,
      textProviderContracts: summary.textProviderContracts,
      imageProviderContracts: summary.imageProviderContracts,
      localFallbacks: summary.localFallbacks,
      promptAuditRequired: summary.promptAuditRequired,
      humanReviewRequired: summary.humanReviewRequired,
      liveProviderCallsEnabled: summary.liveProviderCallsEnabled,
      externalNetworkCalls: summary.externalNetworkCalls,
      productionTrafficEnabled: summary.productionTrafficEnabled,
      lanes,
      checks,
      blockers: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);

function checkMinimum(lane, id, actual, minimum) {
  return {
    id,
    lane,
    passed: actual >= minimum,
    detail: actual >= minimum ? `${actual} is at least ${minimum}.` : `${actual} is below required minimum ${minimum}.`
  };
}

function checkExact(lane, id, actual, expected) {
  return {
    id,
    lane,
    passed: actual === expected,
    detail: actual === expected ? `${actual} matched expected value.` : `${actual} did not match expected value ${expected}.`
  };
}

function checkNoBlockers(lane, id, blockers) {
  return {
    id,
    lane,
    passed: blockers.length === 0,
    detail: blockers.length === 0 ? "Executable AI provider readiness contract has no blockers." : blockers.join(" ")
  };
}

function checkItemsShape(lane, id, items) {
  const requiredKeys = [
    "id",
    "label",
    "lane",
    "status",
    "textAdapterIds",
    "imageAdapterIds",
    "localFallbackAdapterIds",
    "modelFamilies",
    "promptAuditRequired",
    "humanReviewRequired",
    "liveProviderCallsEnabled",
    "externalNetworkCalls",
    "productionTrafficEnabled",
    "currentEvidence",
    "requiredEvidence",
    "blocker"
  ];
  const missing = [];

  for (const item of items) {
    for (const key of requiredKeys) {
      if (!(key in item)) missing.push(`${item.id ?? "unknown"}.${key}`);
    }
  }

  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Validated ${items.length} executable AI provider readiness item shapes.`
        : `Missing AI provider readiness fields: ${missing.join(", ")}`
  };
}

function checkIncludes(lane, id, text, required) {
  const missing = required.filter((needle) => !text.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Found ${required.length} required AI provider readiness signals.`
        : `Missing AI provider readiness signals: ${missing.join(", ")}`
  };
}

function checkArrayIncludes(lane, id, values, required) {
  const missing = required.filter((needle) => !values.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Found ${required.length} required AI provider readiness signals.`
        : `Missing AI provider readiness signals: ${missing.join(", ")}`
  };
}
