import { describe, expect, it } from "vitest";
import {
  blockersFromFailedChecks,
  checkAbsent,
  checkArrayIncludes,
  checkExact,
  checkIncludes,
  checkMinimum,
  checkNoBlockers,
  failedChecks,
  summarizeCheckLanes
} from "../scripts/doctor-harness.mjs";

describe("doctor harness", () => {
  it("builds consistent check, lane, and blocker output", () => {
    const checks = [
      checkExact("register", "exact", 2, 2),
      checkMinimum("register", "minimum", 3, 4),
      checkArrayIncludes("docs", "array", ["a"], ["a", "b"]),
      checkIncludes("docs", "text", "hello world", ["hello"]),
      checkAbsent("docs", "absent", "hello world", ["world"]),
      checkNoBlockers("runtime", "blockers", [])
    ];

    expect(failedChecks(checks).map((check) => check.id)).toEqual(["minimum", "array", "absent"]);
    expect(blockersFromFailedChecks(checks)).toEqual([
      { id: "minimum", lane: "register", detail: "3 is below required minimum 4." },
      { id: "array", lane: "docs", detail: "Missing signals: b" },
      { id: "absent", lane: "docs", detail: "Forbidden signals present: world" }
    ]);
    expect(summarizeCheckLanes(checks)).toEqual([
      { lane: "register", passed: 1, total: 2, status: "blocked" },
      { lane: "docs", passed: 1, total: 3, status: "blocked" },
      { lane: "runtime", passed: 1, total: 1, status: "ready" }
    ]);
  });
});
