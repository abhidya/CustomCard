import { existsSync } from "node:fs";
import {
  externalAuditReadinessItems,
  summarizeExternalAuditReadiness,
  validateExternalAuditReadiness
} from "../src/externalAuditReadinessData.mjs";
import {
  checkArrayIncludes,
  checkExact,
  checkIncludes,
  checkItemsHaveKeys,
  checkNoBlockers,
  readTextFiles,
  runDoctorManifest
} from "./doctor-harness.mjs";

const files = {
  auditTest: "src/externalAuditReadiness.test.ts",
  app: "src/App.tsx",
  apiContracts: "src/apiContracts.ts",
  apiServer: "scripts/api-server.mjs",
  readinessSummaryData: "src/readinessSummaryData.mjs",
  productionReadiness: "src/productionReadiness.ts",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml",
  docs: "docs/platform-expansion-design.md"
};

const contents = readTextFiles(files);

const summary = summarizeExternalAuditReadiness(externalAuditReadinessItems);
const validationBlockers = validateExternalAuditReadiness(externalAuditReadinessItems);
const relatedGateIds = Array.from(new Set(externalAuditReadinessItems.flatMap((item) => item.relatedProductionGateIds)));

const checks = [
  checkExact("register", "item-count", summary.total, 15),
  checkExact("register", "production-blocked", summary.productionBlocked, summary.total),
  checkExact("register", "public-claims-gated-on-attached-evidence", summary.publicClaimsAllowed <= summary.externalEvidenceAttached, true),
  checkEvidenceRefsResolve("register", "evidence-artifact-refs-resolve", externalAuditReadinessItems),
  checkNoBlockers("register", "executable-summary-and-validation", validationBlockers),
  checkItemsHaveKeys(
    "register",
    "item-contract-shape",
    externalAuditReadinessItems,
    [
      "id",
      "label",
      "category",
      "status",
      "relatedProductionGateIds",
      "requiredEvidence",
      "currentEvidence",
      "evidenceArtifactRefs",
      "reviewer",
      "cadence",
      "externalReviewerRequired",
      "blocksProduction",
      "publicClaimAllowed",
      "blocker"
    ],
    {
      readyDetail: `Validated ${externalAuditReadinessItems.length} executable audit readiness item shapes.`,
      missingPrefix: "Missing audit readiness fields"
    }
  ),
  checkIncludes("launch-gates", "mapped-production-gates", contents.productionReadiness, relatedGateIds),
  checkIncludes("tests", "external-audit-tests", contents.auditTest, [
    "keeps external proof gaps explicit",
    "maps every external evidence item back to production launch gates",
    "flags unsafe audit claims"
  ]),
  checkIncludes("surfaces", "admin-api-audit-surfaces", `${contents.app}\n${contents.apiContracts}\n${contents.apiServer}\n${contents.readinessSummaryData}`, [
    "External audit readiness",
    "summarizeExternalAuditReadiness",
    "externalAudit",
    "publicClaimsAllowed",
    "externalArtifactsAttached"
  ]),
  checkIncludes("docs", "audit-docs", contents.docs, [
    "External audit readiness",
    "`src/externalAuditReadiness.ts`",
    "`npm run external:audit:doctor`",
    "not an external audit report"
  ]),
  checkIncludes("ci", "audit-doctor-scripted-and-gated", `${contents.packageJson}\n${contents.workflow}`, [
    '"external:audit:doctor": "node scripts/external-audit-readiness-doctor.mjs"',
    "Validate external audit evidence readiness",
    "npm run external:audit:doctor"
  ]),
  checkArrayIncludes("safety", "required-evidence-signals", summary.requiredEvidence, [
    "Security assessment report",
    "Privacy policy review",
    "WCAG audit report",
    "Retail partner certification",
    "Printed 5x7 sample",
    "Authenticated public route doctor"
  ])
];

runDoctorManifest({
  service: "customcard-external-audit-readiness-doctor",
  metrics: {
    items: summary.total,
    productionBlocked: summary.productionBlocked,
    publicClaimsAllowed: summary.publicClaimsAllowed,
    externalArtifactsAttached: summary.externalArtifactsAttached,
    externalEvidenceAttached: summary.externalEvidenceAttached
  },
  checks
});

/** Status upgrades are only honest when every referenced evidence artifact actually exists on disk. */
function checkEvidenceRefsResolve(lane, id, items) {
  const missing = items.flatMap((item) =>
    item.evidenceArtifactRefs.filter((ref) => !existsSync(ref)).map((ref) => `${item.id}: ${ref}`)
  );

  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `All ${items.reduce((total, item) => total + item.evidenceArtifactRefs.length, 0)} attached evidence refs resolve to files under docs/evidence/.`
        : `Evidence refs do not resolve to files: ${missing.join(", ")}`
  };
}
