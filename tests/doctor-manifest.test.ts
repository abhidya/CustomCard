import { describe, expect, it } from "vitest";
import {
  checkDoctorDocs,
  checkDoctorScriptedAndGated,
  checkDoctorSourceSignals,
  defineDoctorManifest,
  doctorSource
} from "../scripts/doctor-manifest.mjs";

describe("doctor manifest", () => {
  it("builds shared CI, docs, and source-signal checks", () => {
    const manifest = defineDoctorManifest({
      id: "sample",
      service: "customcard-sample-doctor",
      npmScript: "sample:doctor",
      scriptPath: "scripts/sample-doctor.mjs",
      workflowLabel: "Validate sample readiness",
      docsTitle: "Sample readiness",
      readinessModule: "src/sampleReadiness.ts",
      files: {
        docs: "docs/sample.md",
        sampleTest: "src/sample.test.ts"
      },
      docsKeys: ["docs"]
    });
    const contents = {
      packageJson: '"sample:doctor": "node scripts/sample-doctor.mjs"',
      workflow: "Validate sample readiness\nnpm run sample:doctor",
      docs: "Sample readiness `src/sampleReadiness.ts` `npm run sample:doctor` no live sample claims",
      sampleTest: "tracks sample readiness"
    };

    expect(manifest.files).toMatchObject({
      docs: "docs/sample.md",
      packageJson: "package.json",
      workflow: ".github/workflows/verify.yml"
    });
    expect(checkDoctorScriptedAndGated(manifest, contents)).toMatchObject({ passed: true, lane: "ci" });
    expect(checkDoctorDocs(manifest, contents, ["no live sample claims"])).toMatchObject({ passed: true, lane: "docs" });
    expect(checkDoctorSourceSignals(manifest, contents, {
      lane: "tests",
      id: "sample-tests",
      sourceKeys: ["sampleTest"],
      signals: ["tracks sample readiness"]
    })).toMatchObject({ passed: true, lane: "tests" });
    expect(doctorSource(contents, ["docs", "missing", "sampleTest"])).toContain("tracks sample readiness");
  });

  it("requires load-bearing manifest fields", () => {
    expect(() => defineDoctorManifest({
      npmScript: "broken:doctor",
      scriptPath: "scripts/broken-doctor.mjs",
      workflowLabel: "Validate broken readiness",
      docsTitle: "Broken readiness",
      readinessModule: "src/brokenReadiness.ts",
      files: {}
    })).toThrow("Doctor manifest requires service.");
  });
});
