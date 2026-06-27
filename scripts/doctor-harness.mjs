import { readFileSync } from "node:fs";

/**
 * Status vocabulary for repo-local doctors.
 *
 * Every doctor built on this harness validates the repository against itself
 * (registers, contracts, docs, CI wiring). Passing means the repo is
 * internally consistent — it is NOT evidence that a live capability works.
 * "ready" is reserved for env-gated live doctors that exercise real
 * deployments, providers, or databases.
 */
export const repoConsistentStatus = "repo-consistent";
export const contractDriftStatus = "contract-drift";

export function readTextFiles(files) {
  return Object.fromEntries(Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")]));
}

export function checkMinimum(lane, id, actual, minimum) {
  return {
    id,
    lane,
    passed: actual >= minimum,
    detail: actual >= minimum ? `${actual} is at least ${minimum}.` : `${actual} is below required minimum ${minimum}.`
  };
}

export function checkExact(lane, id, actual, expected) {
  return {
    id,
    lane,
    passed: actual === expected,
    detail: actual === expected ? `${actual} matched expected value.` : `${actual} did not match expected value ${expected}.`
  };
}

export function checkNoBlockers(lane, id, blockers, readyDetail = "Executable contract has no blockers.") {
  return {
    id,
    lane,
    passed: blockers.length === 0,
    detail: blockers.length === 0 ? readyDetail : blockers.join(" ")
  };
}

export function checkIncludes(lane, id, text, required, noun = "signals") {
  const missing = required.filter((needle) => !text.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Found ${required.length} required ${noun}.`
        : `Missing ${noun}: ${missing.join(", ")}`
  };
}

export function checkArrayIncludes(lane, id, values, required, noun = "signals") {
  const missing = required.filter((needle) => !values.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Found ${required.length} required ${noun}.`
        : `Missing ${noun}: ${missing.join(", ")}`
  };
}

export function checkAbsent(lane, id, text, forbidden, noun = "signals") {
  const present = forbidden.filter((needle) => text.includes(needle));
  return {
    id,
    lane,
    passed: present.length === 0,
    detail: present.length === 0 ? `No forbidden ${noun} found.` : `Forbidden ${noun} present: ${present.join(", ")}`
  };
}

export function checkItemsHaveKeys(lane, id, items, requiredKeys, options = {}) {
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
        ? (options.readyDetail ?? `Validated ${items.length} item shapes.`)
        : `${options.missingPrefix ?? "Missing item fields"}: ${missing.join(", ")}`
  };
}

export function summarizeCheckLanes(checks) {
  return Array.from(new Set(checks.map((check) => check.lane))).map((lane) => {
    const laneChecks = checks.filter((check) => check.lane === lane);
    return {
      lane,
      passed: laneChecks.filter((check) => check.passed).length,
      total: laneChecks.length,
      status: laneChecks.every((check) => check.passed) ? repoConsistentStatus : contractDriftStatus
    };
  });
}

export function failedChecks(checks) {
  return checks.filter((check) => !check.passed);
}

export function registerIssuesFromFailedChecks(checks) {
  return failedChecks(checks).map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }));
}

export function printDoctorReport(report) {
  console.log(JSON.stringify(report, null, 2));
}

export function exitIfBlocked(checks) {
  if (failedChecks(checks).length > 0) process.exit(1);
}

export function buildDoctorReport(baseReport, checks) {
  const failed = failedChecks(checks);
  return {
    ...baseReport,
    status: failed.length === 0 ? repoConsistentStatus : contractDriftStatus,
    scope: "repo-local",
    lanes: summarizeCheckLanes(checks),
    checks,
    registerIssues: registerIssuesFromFailedChecks(checks)
  };
}

export function buildDoctorManifest({ service, metrics = {}, checks }) {
  return buildDoctorReport({ service, ...metrics }, checks);
}

export function runDoctorManifest(manifest) {
  printDoctorReport(buildDoctorManifest(manifest));
  exitIfBlocked(manifest.checks);
}

export function runDoctorReport(baseReport, checks) {
  printDoctorReport(buildDoctorReport(baseReport, checks));
  exitIfBlocked(checks);
}
