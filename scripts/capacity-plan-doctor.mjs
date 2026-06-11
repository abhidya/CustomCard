import {
  capacityEvidenceThresholds,
  capacityProfiles,
  summarizeCapacityPlan,
  validateCapacityEvidenceThresholds,
  validateCapacityProfiles
} from "../src/capacityPlanData.mjs";
import {
  blockersFromFailedChecks,
  checkArrayIncludes,
  checkExact,
  checkIncludes,
  checkMinimum,
  checkNoBlockers,
  exitIfBlocked,
  failedChecks,
  printDoctorReport,
  readTextFiles,
  summarizeCheckLanes
} from "./doctor-harness.mjs";

const files = {
  capacityTest: "src/capacityPlan.test.ts",
  capacityData: "src/capacityPlanData.mjs",
  readinessSummaryData: "src/readinessSummaryData.mjs",
  app: "src/App.tsx",
  apiContracts: "src/apiContracts.ts",
  apiServer: "scripts/api-server.mjs",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml",
  docs: "docs/platform-expansion-design.md"
};

const contents = readTextFiles(files);

const summary = summarizeCapacityPlan(capacityProfiles);
const validationBlockers = validateCapacityProfiles(capacityProfiles);
const thresholdBlockers = validateCapacityEvidenceThresholds(capacityEvidenceThresholds, capacityProfiles);
const profileIds = capacityProfiles.map((profile) => profile.id);

const checks = [
  checkExact("profiles", "profile-count", summary.total, 4),
  checkMinimum("profiles", "max-daily-card-capacity", summary.maxDailyCards, 12000),
  checkMinimum("profiles", "max-daily-image-budget", summary.maxDailyImageGenerations, 1000),
  checkArrayIncludes("profiles", "required-profile-ids", profileIds, ["local-dev", "cheap-droplet", "cloud-native", "saas-scale"]),
  checkNoBlockers("profiles", "executable-summary-and-validation", validationBlockers),
  checkExact("evidence", "slo-threshold-count", summary.sloThresholds, 4),
  checkExact("evidence", "worker-backed-thresholds", summary.workerBackedThresholds, 1),
  checkExact("evidence", "database-thresholds", summary.databaseThresholds, 1),
  checkExact("evidence", "artifact-thresholds", summary.artifactThresholds, 1),
  checkExact("evidence", "provider-spend-thresholds", summary.providerSpendThresholds, 1),
  checkNoBlockers("evidence", "measurable-slo-thresholds", thresholdBlockers),
  checkProfilesShape("profiles", "profile-contract-shape", capacityProfiles),
  checkThresholdsShape("evidence", "threshold-contract-shape", capacityEvidenceThresholds),
  checkIncludes("tests", "capacity-tests", contents.capacityTest, [
    "defines finite cheap-to-scale profiles",
    "keeps droplet, cloud, and SaaS shapes honest",
    "flags capacity plans that hide live traffic",
    "defines measurable SLO thresholds"
  ]),
  checkIncludes("surfaces", "admin-api-capacity-surfaces", `${contents.app}\n${contents.apiContracts}\n${contents.apiServer}\n${contents.capacityData}\n${contents.readinessSummaryData}`, [
    "Capacity profiles",
    "capacityPlanData.mjs",
    "capacity:",
    "maxDailyCards",
    "liveProviderCalls",
    "sloThresholds"
  ]),
  checkIncludes("docs", "capacity-docs", contents.docs, [
    "Capacity profiles",
    "`src/capacityPlan.ts`",
    "`npm run capacity:doctor`",
    "not measured production benchmarks"
  ]),
  checkIncludes("ci", "capacity-doctor-scripted-and-gated", `${contents.packageJson}\n${contents.workflow}`, [
    '"capacity:doctor": "node scripts/capacity-plan-doctor.mjs"',
    "Validate capacity plan readiness",
    "npm run capacity:doctor"
  ]),
  checkExact("safety", "no-live-provider-calls", summary.liveProviderCalls, 0),
  checkExact("safety", "no-real-orders", summary.realOrdersEnabled, 0)
];

const lanes = summarizeCheckLanes(checks);
const failed = failedChecks(checks);

printDoctorReport({
  service: "customcard-capacity-plan-doctor",
  status: failed.length === 0 ? "ready" : "blocked",
  profiles: summary.total,
  maxDailyCards: summary.maxDailyCards,
  maxDailyImageGenerations: summary.maxDailyImageGenerations,
  sloThresholds: summary.sloThresholds,
  measuredEvidenceRequired: summary.measuredEvidenceRequired,
  liveProviderCalls: summary.liveProviderCalls > 0,
  realOrdersEnabled: summary.realOrdersEnabled > 0,
  lanes,
  checks,
  blockers: blockersFromFailedChecks(checks)
});

exitIfBlocked(checks);

function checkProfilesShape(lane, id, profiles) {
  const requiredKeys = [
    "id",
    "label",
    "lane",
    "runtimeShape",
    "dailyCardCapacity",
    "dailyImageGenerationBudget",
    "databaseMode",
    "queueMode",
    "objectStoreMode",
    "costGuardrails",
    "requiredEvidence",
    "scalingSignals",
    "tradeoffs"
  ];
  const missing = [];

  for (const profile of profiles) {
    for (const key of requiredKeys) {
      if (!(key in profile)) missing.push(`${profile.id ?? "unknown"}.${key}`);
    }
  }

  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Validated ${profiles.length} executable capacity profile shapes.`
        : `Missing capacity profile fields: ${missing.join(", ")}`
  };
}

function checkThresholdsShape(lane, id, thresholds) {
  const requiredKeys = ["id", "label", "metric", "profiles", "measuredBy", "warnAt", "blockAt", "requiredEvidence"];
  const missing = [];

  for (const threshold of thresholds) {
    for (const key of requiredKeys) {
      if (!(key in threshold)) missing.push(`${threshold.id ?? "unknown"}.${key}`);
    }
  }

  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Validated ${thresholds.length} measurable capacity threshold shapes.`
        : `Missing capacity threshold fields: ${missing.join(", ")}`
  };
}
