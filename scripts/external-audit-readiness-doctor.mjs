import { existsSync, readFileSync } from "node:fs";
import {
  externalAuditReadinessItems,
  summarizeExternalAuditReadiness,
  validateExternalAuditReadiness
} from "../src/externalAuditReadinessData.mjs";
import { checkArrayIncludes, checkExact, checkIncludes, checkNoBlockers } from "./doctor-harness.mjs";

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

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const summary = summarizeExternalAuditReadiness(externalAuditReadinessItems);
const validationBlockers = validateExternalAuditReadiness(externalAuditReadinessItems);
const relatedGateIds = Array.from(new Set(externalAuditReadinessItems.flatMap((item) => item.relatedProductionGateIds)));

const checks = [
  checkExact("register", "item-count", summary.total, 15),
  checkExact("register", "production-blocked", summary.productionBlocked, summary.total),
  checkExact("register", "public-claims-gated-on-attached-evidence", summary.publicClaimsAllowed <= summary.externalEvidenceAttached, true),
  checkEvidenceRefsResolve("register", "evidence-artifact-refs-resolve", externalAuditReadinessItems),
  checkNoBlockers("register", "executable-summary-and-validation", validationBlockers),
  checkItemsShape("register", "item-contract-shape", externalAuditReadinessItems),
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

const lanes = Array.from(new Set(checks.map((check) => check.lane))).map((lane) => {
  const laneChecks = checks.filter((check) => check.lane === lane);
  return {
    lane,
    passed: laneChecks.filter((check) => check.passed).length,
    total: laneChecks.length,
    status: laneChecks.every((check) => check.passed) ? "repo-consistent" : "contract-drift"
  };
});

const failed = checks.filter((check) => !check.passed);

console.log(
  JSON.stringify(
    {
      service: "customcard-external-audit-readiness-doctor",
      status: failed.length === 0 ? "repo-consistent" : "contract-drift",
      scope: "repo-local",
      items: summary.total,
      productionBlocked: summary.productionBlocked,
      publicClaimsAllowed: summary.publicClaimsAllowed,
      externalArtifactsAttached: summary.externalArtifactsAttached,
      externalEvidenceAttached: summary.externalEvidenceAttached,
      lanes,
      checks,
      registerIssues: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);

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

function checkItemsShape(lane, id, items) {
  const requiredKeys = [
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
  ];
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
        ? `Validated ${items.length} executable audit readiness item shapes.`
        : `Missing audit readiness fields: ${missing.join(", ")}`
  };
}
