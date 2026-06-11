import { readFileSync } from "node:fs";
import { buildAdminOperationsWorkflow, validateAdminOperationsWorkflow } from "../src/adminOperationsData.mjs";
import { checkArrayIncludes, checkExact, checkIncludes, checkMinimum, checkNoBlockers } from "./doctor-harness.mjs";

const files = {
  app: "src/App.tsx",
  adminOperations: "src/adminOperations.ts",
  adminOperationsData: "src/adminOperationsData.mjs",
  adminOperationsTest: "src/adminOperations.test.ts",
  appSmokeTest: "tests/app-smoke.test.ts",
  hostedApiReadinessData: "src/hostedApiReadinessData.mjs",
  observabilityReadinessData: "src/observabilityReadinessData.mjs",
  platformDocs: "docs/platform-expansion-design.md",
  requirementsDocs: "docs/requirements-traceability.md",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const workflow = buildAdminOperationsWorkflow(buildDoctorFixtureInput());
const validationBlockers = validateAdminOperationsWorkflow(workflow);

const checks = [
  checkExact("workflow", "owner-count", workflow.summary.ownerCount, 5),
  checkExact("workflow", "live-enabled-zero", workflow.summary.liveEnabled, 0),
  checkMinimum("workflow", "p0-actions", workflow.summary.p0Tasks, 3),
  checkNoBlockers("workflow", "validation", validationBlockers),
  checkArrayIncludes(
    "workflow",
    "required-task-ids",
    workflow.tasks.map((task) => task.id),
    ["production-user-auth", "credential-vault-required-env", "hosted-account-token-verification", "alert-routing-drill", "incident-review-runbook"]
  ),
  checkIncludes("tests", "admin-operations-tests", contents.adminOperationsTest, [
    "turns readiness evidence into owner lanes without live-production claims",
    "keeps credential vault, hosted token, and incident drill work explicit",
    "rejects unsafe or unactionable operations tasks"
  ]),
  checkIncludes("surfaces", "admin-ui-operation-surface", `${contents.app}\n${contents.adminOperationsData}\n${contents.hostedApiReadinessData}\n${contents.observabilityReadinessData}\n${contents.appSmokeTest}`, [
    "Integration owner workflow",
    "Credential vault setup",
    "Hosted account-token verification",
    "Alert route drill",
    "Incident review runbook",
    "Live enabled"
  ]),
  checkIncludes("docs", "admin-operation-docs", `${contents.platformDocs}\n${contents.requirementsDocs}`, [
    "Admin operations workflow",
    "`src/adminOperations.ts`",
    "`npm run admin:operations:doctor`",
    "credential-vault",
    "hosted token proof",
    "alert route drill",
    "incident-review runbook"
  ]),
  checkIncludes("ci", "admin-operations-scripted-and-gated", `${contents.packageJson}\n${contents.workflow}`, [
    '"admin:operations:doctor": "node scripts/admin-operations-doctor.mjs"',
    "Validate admin operations workflow",
    "npm run admin:operations:doctor"
  ]),
  checkIncludes("module", "admin-operations-module-exports", `${contents.adminOperations}\n${contents.adminOperationsData}`, [
    "buildAdminOperationsWorkflow",
    "validateAdminOperationsWorkflow",
    "credential-vault-required-env",
    "liveEnabled"
  ])
];

const lanes = Array.from(new Set(checks.map((check) => check.lane))).map((lane) => {
  const laneChecks = checks.filter((check) => check.lane === lane);
  return {
    lane,
    passed: laneChecks.filter((check) => check.passed).length,
    total: laneChecks.length,
    status: laneChecks.every((check) => check.passed) ? "ready" : "blocked"
  };
});
const failed = checks.filter((check) => !check.passed);

console.log(
  JSON.stringify(
    {
      service: "customcard-admin-operations-doctor",
      status: failed.length === 0 ? "ready" : "blocked",
      ownerCount: workflow.summary.ownerCount,
      taskCount: workflow.summary.taskCount,
      p0Tasks: workflow.summary.p0Tasks,
      evidenceRequired: workflow.summary.evidenceRequired,
      liveEnabled: workflow.summary.liveEnabled,
      lanes,
      checks,
      blockers: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);

function buildDoctorFixtureInput() {
  return {
    model: {
      coverage: {
        requiredEnv: ["DATABASE_URL", "AUTH_SESSION_SECRET", "CUSTOMCARD_ADMIN_SESSION_TOKEN"]
      }
    },
    productionGates: [
      productionGate("production-user-auth", "Production user auth", "identity"),
      productionGate("live-oauth-provider-imports", "Live OAuth imports", "provider"),
      productionGate("live-payment-charges-refunds", "Live payment charges and refunds", "commerce"),
      productionGate("deployed-postgres-api", "Deployed production Postgres API", "cloud"),
      productionGate("external-audits", "External audits", "audit")
    ],
    hostedApiReadinessItems: [
      hostedItem("hosted-account-token-verification", "Hosted account-token verification", [
        "Hosted customer token probe",
        "Hosted admin token probe"
      ])
    ],
    retailFulfillmentReadinessItems: [],
    paymentReadinessItems: [
      paymentItem("live-charge-capture-approval", "Live charge and capture approval"),
      paymentItem("refund-void-dispute-drills", "Refund void and dispute drills")
    ],
    observabilityReadinessItems: [
      observabilityItem("alert-routing-drill", "Alert route drill"),
      observabilityItem("incident-review-runbook", "Incident review runbook")
    ],
    externalAuditReadinessItems: []
  };
}

function productionGate(id, label, category) {
  return {
    id,
    label,
    category,
    status: "evidence-missing",
    liveEnabled: false,
    requiredEvidence: [`${label} proof`, `${label} signoff`],
    currentEvidence: [`${label} repo-local contract`],
    blocker: `${label} production evidence is not attached.`,
    adminAction: `Attach ${label.toLowerCase()} evidence before launch.`
  };
}

function hostedItem(id, label, requiredEvidence) {
  return {
    id,
    label,
    status: "evidence-missing",
    envVarNames: ["CUSTOMCARD_ADMIN_SESSION_TOKEN"],
    requiredEvidence,
    currentEvidence: ["Hosted API readiness contract"],
    blocker: `${label} output is not attached.`,
    liveProofClaimed: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveProviderCalls: false
  };
}

function paymentItem(id, label) {
  return {
    id,
    label,
    status: "evidence-missing",
    requiredEvidence: [`${label} transcript`, `${label} signoff`],
    currentEvidence: ["Payment readiness contract"],
    blocker: `${label} evidence is not attached.`,
    liveChargesEnabled: false,
    liveRefundsEnabled: false,
    liveCaptureEnabled: false,
    externalNetworkCalls: false,
    cardDataStored: false
  };
}

function observabilityItem(id, label) {
  return {
    id,
    label,
    status: "evidence-missing",
    requiredEvidence: [`${label} transcript`, `${label} signoff`],
    currentEvidence: ["Observability readiness contract"],
    blocker: `${label} evidence is not attached.`,
    liveIngestionEnabled: false,
    externalNetworkCalls: false,
    productionAlertEnabled: false
  };
}
