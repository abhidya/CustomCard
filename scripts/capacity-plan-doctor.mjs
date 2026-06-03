import { readFileSync } from "node:fs";
import { capacityProfiles, summarizeCapacityPlan, validateCapacityProfiles } from "../src/capacityPlanData.mjs";

const files = {
  capacityPlanInterface: "src/capacityPlan.ts",
  capacityPlanData: "src/capacityPlanData.mjs",
  capacityTest: "src/capacityPlan.test.ts",
  app: "src/App.tsx",
  apiContracts: "src/apiContracts.ts",
  apiServer: "scripts/api-server.mjs",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml",
  docs: "docs/platform-expansion-design.md"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const summary = summarizeCapacityPlan(capacityProfiles);
const validationBlockers = validateCapacityProfiles(capacityProfiles);
const profileIds = capacityProfiles.map((profile) => profile.id);

const checks = [
  checkExact("profiles", "profile-count", summary.total, 4),
  checkMinimum("profiles", "max-daily-card-capacity", summary.maxDailyCards, 12000),
  checkMinimum("profiles", "max-daily-image-budget", summary.maxDailyImageGenerations, 1000),
  checkArrayIncludes("profiles", "required-profile-ids", profileIds, ["local-dev", "cheap-droplet", "cloud-native", "saas-scale"]),
  checkNoBlockers("profiles", "executable-summary-and-validation", validationBlockers),
  checkIncludes("profiles", "typed-interface-and-shared-data", `${contents.capacityPlanInterface}\n${contents.capacityPlanData}`, [
    "capacityPlanData.mjs",
    "CapacityProfile",
    "capacityProfiles",
    "summarizeCapacityPlan",
    "validateCapacityProfiles",
    "Provider budget caps",
    "Queue concurrency limit",
    "Artifact retention window",
    "Real-order kill switch"
  ]),
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
  checkAbsent("safety", "no-live-capacity-claims", `${contents.capacityPlanData}\n${contents.apiServer}`, [
    "realOrdersEnabled: true",
    "liveProviderCalls: true",
    "real orders enabled",
    "live provider calls enabled"
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
      service: "customcard-capacity-plan-doctor",
      status: failed.length === 0 ? "ready" : "blocked",
      profiles: summary.total,
      maxDailyCards: summary.maxDailyCards,
      maxDailyImageGenerations: summary.maxDailyImageGenerations,
      liveProviderCalls: summary.liveProviderCalls > 0,
      realOrdersEnabled: summary.realOrdersEnabled > 0,
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

function checkArrayIncludes(lane, id, values, required) {
  const missing = required.filter((needle) => !values.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Found ${required.length} required capacity signals.`
        : `Missing capacity signals: ${missing.join(", ")}`
  };
}

function checkNoBlockers(lane, id, blockers) {
  return {
    id,
    lane,
    passed: blockers.length === 0,
    detail: blockers.length === 0 ? "Executable capacity contract has no blockers." : blockers.join(" ")
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
        ? `Found ${required.length} required capacity signals.`
        : `Missing capacity signals: ${missing.join(", ")}`
  };
}

function checkAbsent(lane, id, text, forbidden) {
  const present = forbidden.filter((needle) => text.includes(needle));
  return {
    id,
    lane,
    passed: present.length === 0,
    detail: present.length === 0 ? "No forbidden live capacity claims found." : `Forbidden claims present: ${present.join(", ")}`
  };
}
