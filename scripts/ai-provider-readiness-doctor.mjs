import {
  aiProviderReadinessItems,
  summarizeAiProviderReadiness,
  validateAiProviderReadiness
} from "../src/aiProviderReadinessData.mjs";
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
  id: "ai",
  service: "customcard-ai-provider-readiness-doctor",
  npmScript: "ai:doctor",
  scriptPath: "scripts/ai-provider-readiness-doctor.mjs",
  workflowLabel: "Validate AI provider readiness",
  docsTitle: "AI provider readiness",
  readinessModule: "src/aiProviderReadiness.ts",
  files: {
    aiTest: "src/aiProviderReadiness.test.ts",
    app: "src/App.tsx",
    apiContracts: "src/apiContracts.ts",
    apiServer: "scripts/api-server.mjs",
    readinessSummaryData: "src/readinessSummaryData.mjs",
    providerCatalog: "src/providerCatalog.ts",
    providerRuntime: "src/providerRuntime.ts",
    docs: "docs/platform-expansion-design.md"
  },
  docsKeys: ["docs"]
});

const contents = readDoctorManifestFiles(doctorManifest);

const summary = summarizeAiProviderReadiness(aiProviderReadinessItems);
const validationBlockers = validateAiProviderReadiness(aiProviderReadinessItems);
const itemIds = aiProviderReadinessItems.map((item) => item.id);

const checks = [
  checkExact("register", "item-count", summary.total, 8),
  checkExact("register", "text-provider-contracts", summary.textProviderContracts, 17),
  checkExact("register", "image-provider-contracts", summary.imageProviderContracts, 19),
  checkExact("register", "local-fallbacks", summary.localFallbacks, 0),
  checkExact("register", "no-live-provider-calls", summary.liveProviderCallsEnabled, 0),
  checkExact("register", "no-live-external-network", summary.externalNetworkCalls, 0),
  checkExact("register", "no-production-traffic", summary.productionTrafficEnabled, 0),
  checkMinimum("register", "prompt-audit-count", summary.promptAuditRequired, 6),
  checkMinimum("register", "human-review-count", summary.humanReviewRequired, 5),
  checkNoBlockers("register", "executable-summary-and-validation", validationBlockers),
  checkArrayIncludes("register", "required-ai-readiness-ids", itemIds, [
    "ai-adapter-inventory",
    "model-allowlist-and-env-gates",
    "prompt-brand-safety-review",
    "pii-memory-minimization",
    "image-print-qa",
    "spend-budget-rate-limits",
    "evaluation-fixtures",
    "release-operations"
  ]),
  checkItemsHaveKeys("register", "ai-readiness-item-shape", aiProviderReadinessItems, [
    "id",
    "label",
    "lane",
    "status",
    "textAdapterIds",
    "imageAdapterIds",
    "localFallbackAdapterIds",
    "modelFamilies",
    "promptAuditRequired",
    "humanReviewRequired",
    "liveProviderCallsEnabled",
    "externalNetworkCalls",
    "productionTrafficEnabled",
    "currentEvidence",
    "requiredEvidence",
    "blocker"
  ], {
    readyDetail: `Validated ${aiProviderReadinessItems.length} executable AI provider readiness item shapes.`,
    missingPrefix: "Missing AI provider readiness fields"
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "tests",
    id: "ai-readiness-tests",
    sourceKeys: ["aiTest"],
    signals: [
      "tracks text and image provider readiness without live model calls",
      "covers all existing AI text and image adapters explicitly without local fallbacks",
      "flags unsafe AI launch claims"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "surfaces",
    id: "admin-api-ai-readiness-surfaces",
    sourceKeys: ["app", "apiContracts", "apiServer", "readinessSummaryData"],
    signals: [
      "AI provider readiness",
      "summarizeAiProviderReadiness",
      "aiProviderReadiness",
      "liveProviderCallsEnabled",
      "productionTrafficEnabled"
    ]
  }),
  checkDoctorSourceSignals(doctorManifest, contents, {
    lane: "provider-contracts",
    id: "provider-catalog-runtime-ai-contracts",
    sourceKeys: ["providerCatalog", "providerRuntime"],
    signals: [
      "openai-responses-chat",
      "anthropic-messages-chat",
      "google-gemini-chat",
      "cloudflare-workers-ai-chat",
      "openai-images",
      "cloudflare-workers-ai-image",
      "stability-stable-image",
      "deepai-text2img-image",
      "bfl-flux-image",
      "runcomfy-model-api-image",
      "adobe-firefly-image",
      "recraft-image",
      "luma-image",
      "folded-card-four-panel-v1",
      "one-provider-request-per-panel",
      "panelRequests",
      "front-cover",
      "inside-left-panel",
      "inside-right-panel",
      "modelAllowlisted",
      "modelQualityReviewed"
    ]
  }),
  checkDoctorDocs(doctorManifest, contents, ["not live AI generation"], { id: "ai-readiness-docs" }),
  checkDoctorScriptedAndGated(doctorManifest, contents, { id: "ai-doctor-scripted-and-gated" }),
  checkArrayIncludes("evidence", "required-evidence-signals", summary.requiredEvidence, [
    "Approved model allowlist",
    "Prompt audit report",
    "Generated image sample set",
    "Provider spend alert export",
    "Rollback runbook"
  ])
];

runDoctorReport({
  service: doctorManifest.service,
  items: summary.total,
  textProviderContracts: summary.textProviderContracts,
  imageProviderContracts: summary.imageProviderContracts,
  localFallbacks: summary.localFallbacks,
  promptAuditRequired: summary.promptAuditRequired,
  humanReviewRequired: summary.humanReviewRequired,
  liveProviderCallsEnabled: summary.liveProviderCallsEnabled,
  externalNetworkCalls: summary.externalNetworkCalls,
  productionTrafficEnabled: summary.productionTrafficEnabled
}, checks);
