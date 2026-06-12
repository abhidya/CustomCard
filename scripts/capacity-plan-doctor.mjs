import {
  capacityEvidenceThresholds,
  capacityProfiles,
  summarizeCapacityPlan,
  validateCapacityEvidenceThresholds,
  validateCapacityProfiles
} from "../src/capacityPlanData.mjs";
import {
  checkArrayIncludes,
  checkExact,
  checkItemsHaveKeys,
  checkMinimum,
  checkNoBlockers,
  runDoctorReport
} from "./doctor-harness.mjs";
import {
  checkDoctorDocs,
  checkDoctorScriptedAndGated,
  checkDoctorSourceSignals,
  defineDoctorManifest,
  readDoctorManifestFiles
} from "./doctor-manifest.mjs";

const doctorManifest = defineDoctorManifest({
  id: "capacity",
  service: "customcard-capacity-plan-doctor",
  npmScript: "capacity:doctor",
  scriptPath: "scripts/capacity-plan-doctor.mjs",
  workflowLabel: "Validate capacity plan readiness",
  docsTitle: "Capacity profiles",
  readinessModule: "src/capacityPlan.ts",
  files: {
    capacityTest: "src/capacityPlan.test.ts",
    capacityData: "src/capacityPlanData.mjs",
    readinessSummaryData: "src/readinessSummaryData.mjs",
    app: "src/App.tsx",
    apiContracts: "src/apiContracts.ts",
    apiServer: "scripts/api-server.mjs",
    docs: "docs/platform-expansion-design.md"
  },
  docsKeys: ["docs"]
});

const contents = readDoctorManifestFiles(doctorManifest);

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
  checkItemsHaveKeys("profiles", "profile-contract-shape", capacityProfiles, [
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
  ], {
    readyDetail: `Validated ${capacityProfiles.length} executable capacity profile shapes.`,
    missingPrefix: "Missing capacity profile fields"
  }),
  checkItemsHaveKeys("evidence", "threshold-contract-shape", capacityEvidenceThresholds, [
    "id",
    "label",
    "metric",
    "profiles",
    "measuredBy",
    "warnAt",
    "blockAt",
    "requiredEvidence"
  ], {
    readyDetail: `Validated ${capacityEvidenceThresholds.length} measurable capacity threshold shapes.`,
    missingPrefix: "Missing capacity threshold fields"
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "tests",
    id: "capacity-tests",
    sourceKeys: ["capacityTest"],
    signals: [
      "defines finite cheap-to-scale profiles",
      "keeps droplet, cloud, and SaaS shapes honest",
      "flags capacity plans that hide live traffic",
      "defines measurable SLO thresholds"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "surfaces",
    id: "admin-api-capacity-surfaces",
    sourceKeys: ["app", "apiContracts", "apiServer", "capacityData", "readinessSummaryData"],
    signals: [
      "Capacity profiles",
      "capacityPlanData.mjs",
      "capacity:",
      "maxDailyCards",
      "liveProviderCalls",
      "sloThresholds"
    ]
  }),
  checkDoctorDocs(doctorManifest, contents, ["not measured production benchmarks"], { id: "capacity-docs" }),
  checkDoctorScriptedAndGated(doctorManifest, contents, { id: "capacity-doctor-scripted-and-gated" }),
  checkExact("safety", "no-live-provider-calls", summary.liveProviderCalls, 0),
  checkExact("safety", "no-real-orders", summary.realOrdersEnabled, 0)
];

runDoctorReport({
  service: doctorManifest.service,
  profiles: summary.total,
  maxDailyCards: summary.maxDailyCards,
  maxDailyImageGenerations: summary.maxDailyImageGenerations,
  sloThresholds: summary.sloThresholds,
  measuredEvidenceRequired: summary.measuredEvidenceRequired,
  liveProviderCalls: summary.liveProviderCalls > 0,
  realOrdersEnabled: summary.realOrdersEnabled > 0
}, checks);
