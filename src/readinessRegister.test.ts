import { describe, expect, it } from "vitest";
import { defineReadinessRegister, evidenceArtifactRefPattern, invalidEvidenceArtifactRefs } from "./readinessRegister.mjs";

const items = [
  { id: "a", live: false },
  { id: "b", live: false }
];

describe("readiness register kernel", () => {
  it("wires total, domain summary fields, and validator blockers into the summary", () => {
    const register = defineReadinessRegister({
      domainLabel: "sample",
      items,
      requiredIds: ["a", "b"],
      summarize: (rows) => ({ live: rows.filter((row) => row.live).length })
    });

    expect(register.summarize()).toMatchObject({ total: 2, live: 0, registerIssues: [], blockers: [] });
  });

  it("accepts only docs/evidence artifact refs that follow the recorded-proof convention", () => {
    expect(evidenceArtifactRefPattern.test("docs/evidence/external-audit/2026-06-12-security-assessment.pdf")).toBe(true);
    expect(
      invalidEvidenceArtifactRefs([
        "docs/evidence/e2e/2026-06-12-coverage-doctor.json",
        "docs/audits/fake-report.pdf",
        "docs/evidence/e2e/coverage-doctor.json",
        "https://example.com/report.pdf"
      ])
    ).toEqual(["docs/audits/fake-report.pdf", "docs/evidence/e2e/coverage-doctor.json", "https://example.com/report.pdf"]);
    expect(invalidEvidenceArtifactRefs(undefined)).toEqual([]);
  });

  it("flags duplicate ids, missing required ids, and item rule failures with default messages", () => {
    const register = defineReadinessRegister({
      domainLabel: "sample",
      items,
      requiredIds: ["a", "b", "c"],
      itemRules: (item) => (item.live === false ? [] : [`Sample readiness item ${item.id} must keep live=false.`])
    });

    const issues = register.validate([
      { id: "a", live: true },
      { id: "a", live: false }
    ]);

    expect(issues).toEqual(
      expect.arrayContaining([
        "Duplicate sample readiness item: a.",
        "Sample readiness item a must keep live=false.",
        "Missing sample readiness item: b.",
        "Missing sample readiness item: c."
      ])
    );
  });

  it("runs cross-item rules after the per-item and required-id passes", () => {
    const register = defineReadinessRegister({
      domainLabel: "sample",
      items,
      crossRules: (byId) => (byId.has("a") ? [] : ["Sample register must include item a."])
    });

    expect(register.validate([{ id: "b", live: false }])).toContain("Sample register must include item a.");
    expect(register.validate(items)).toEqual([]);
  });

  it("supports duplicate and missing message overrides", () => {
    const register = defineReadinessRegister({
      domainLabel: "sample",
      items,
      requiredIds: ["z"],
      missingMessage: (id) => `custom missing ${id}`
    });

    expect(register.validate(items)).toContain("custom missing z");
  });

  it("throws when domainLabel or items are absent", () => {
    expect(() => defineReadinessRegister({ items } as never)).toThrow();
    expect(() => defineReadinessRegister({ domainLabel: "x" } as never)).toThrow();
  });
});
