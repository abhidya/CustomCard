import { validateDurableRuntimeEnv } from "./runtime-env-contract.mjs";

export const runtimeEnvSourceSignals = Object.freeze(["OBJECT_STORE_SIGNING_SECRET", "externalShareApprovalRequired: true"]);

const report = validateDurableRuntimeEnv(process.env);

if (report.missing.length > 0 || report.placeholders.length > 0) {
  if (report.missing.length > 0) console.error(`CustomCard runtime missing env: ${report.missing.join(", ")}`);
  if (report.placeholders.length > 0) console.error(`CustomCard runtime has placeholder env: ${report.placeholders.join(", ")}`);
  process.exit(1);
}

if (report.blockers.length > 0) {
  for (const blocker of report.blockers) {
    console.error(blocker);
  }
  process.exit(1);
}

console.log(JSON.stringify({ service: "customcard-runtime-doctor", status: "ready", apiRuntime: report.runtimeMode, signedArtifactUrls: true }));
