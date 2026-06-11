import { capacityProfiles, summarizeCapacityPlan, validateCapacityProfiles } from "../src/capacityPlanData.mjs";
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
const profileIds = capacityProfiles.map((profile) => profile.id);

const checks = [
  checkExact("profiles", "profile-count", summary.total, 4),
  checkMinimum("profiles", "max-daily-card-capacity", summary.maxDailyCards, 12000),
  checkMinimum("profiles", "max-daily-image-budget", summary.maxDailyImageGenerations, 1000),
  checkArrayIncludes("profiles", "required-profile-ids", profileIds, ["local-dev", "cheap-droplet", "cloud-native", "saas-scale"]),
  checkNoBlockers("profiles", "executable-summary-and-validation", validationBlockers),
  checkProfilesShape("profiles", "profile-contract-shape", capacityProfiles),
  checkIncludes("tests", "capacity-tests", contents.capacityTest, [
    "defines finite cheap-to-scale profiles",
    "keeps droplet, cloud, and SaaS shapes honest",
    "flags capacity plans that hide live traffic"
  ]),
  checkIncludes("surfaces", "admin-api-capacity-surfaces", `${contents.app}\n${contents.apiContracts}\n${contents.apiServer}`, [
    "Capacity profiles",
    "summarizeCapacityPlan",
    "capacityPlanData.mjs",
    "capacity:",
    "maxDailyCards",
    "liveProviderCalls"
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
