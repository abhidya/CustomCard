import { checkIncludes, readTextFiles } from "./doctor-harness.mjs";

export const commonDoctorFiles = Object.freeze({
  adminApp: "src/App.tsx",
  apiContracts: "src/apiContracts.ts",
  apiServer: "scripts/api-server.mjs",
  app: "src/App.tsx",
  packageJson: "package.json",
  platformDocs: "docs/platform-expansion-design.md",
  readinessSummaryData: "src/readinessSummaryData.mjs",
  readme: "README.md",
  verificationDocs: "docs/verification.md",
  workflow: ".github/workflows/verify.yml"
});

export function defineDoctorManifest(config) {
  const npmScript = requiredString(config.npmScript, "npmScript");
  const scriptPath = requiredString(config.scriptPath, "scriptPath");
  const command = config.command ?? `npm run ${npmScript}`;
  const id = config.id ?? npmScript.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");

  return Object.freeze({
    id,
    npmScript,
    scriptPath,
    command,
    service: requiredString(config.service, "service"),
    workflowLabel: requiredString(config.workflowLabel, "workflowLabel"),
    docsTitle: requiredString(config.docsTitle, "docsTitle"),
    readinessModule: requiredString(config.readinessModule, "readinessModule"),
    files: Object.freeze({
      packageJson: commonDoctorFiles.packageJson,
      workflow: commonDoctorFiles.workflow,
      ...config.files
    }),
    docsKeys: Object.freeze(config.docsKeys ?? ["platformDocs"])
  });
}

export function readDoctorManifestFiles(manifest) {
  return readTextFiles(manifest.files);
}

export function doctorSource(contents, keys) {
  return keys.map((key) => contents[key] ?? "").join("\n");
}

export function checkDoctorScriptedAndGated(manifest, contents, options = {}) {
  return checkIncludes(
    options.lane ?? "ci",
    options.id ?? `${manifest.id}-doctor-scripted-and-gated`,
    doctorSource(contents, ["packageJson", "workflow"]),
    [
      `"${manifest.npmScript}": "node ${manifest.scriptPath}"`,
      manifest.workflowLabel,
      manifest.command
    ],
    options.noun ?? "signals"
  );
}

export function checkDoctorDocs(manifest, contents, requiredSignals, options = {}) {
  return checkIncludes(
    options.lane ?? "docs",
    options.id ?? `${manifest.id}-docs`,
    options.source ?? doctorSource(contents, options.sourceKeys ?? manifest.docsKeys),
    [
      manifest.docsTitle,
      `\`${manifest.readinessModule}\``,
      `\`${manifest.command}\``,
      ...requiredSignals
    ],
    options.noun ?? "signals"
  );
}

export function checkDoctorSourceSignals(manifest, contents, options) {
  return checkIncludes(
    requiredString(options.lane, "lane"),
    requiredString(options.id, "id"),
    options.source ?? doctorSource(contents, options.sourceKeys),
    options.signals,
    options.noun ?? "signals"
  );
}

function requiredString(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`Doctor manifest requires ${name}.`);
  return text;
}
