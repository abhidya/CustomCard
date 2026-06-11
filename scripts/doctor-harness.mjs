import { readFileSync } from "node:fs";

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

export function summarizeCheckLanes(checks) {
  return Array.from(new Set(checks.map((check) => check.lane))).map((lane) => {
    const laneChecks = checks.filter((check) => check.lane === lane);
    return {
      lane,
      passed: laneChecks.filter((check) => check.passed).length,
      total: laneChecks.length,
      status: laneChecks.every((check) => check.passed) ? "ready" : "blocked"
    };
  });
}

export function failedChecks(checks) {
  return checks.filter((check) => !check.passed);
}

export function blockersFromFailedChecks(checks) {
  return failedChecks(checks).map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }));
}

export function printDoctorReport(report) {
  console.log(JSON.stringify(report, null, 2));
}

export function exitIfBlocked(checks) {
  if (failedChecks(checks).length > 0) process.exit(1);
}
