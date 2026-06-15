import { readFileSync } from "node:fs";
import {
  customerAccessibilityEvidenceItems,
  summarizeCustomerAccessibilityEvidence,
  validateCustomerAccessibilityEvidence
} from "../src/customerAccessibilityEvidenceData.mjs";
import { checkAbsent, checkExact, checkIncludes, checkNoBlockers } from "./doctor-harness.mjs";

const files = {
  apiServer: "scripts/api-server.mjs",
  app: "src/App.tsx",
  webappApp: "webapp/App.tsx",
  webappPrint: "webapp/views/PrintView.tsx",
  styles: "src/styles.css",
  webappStyles: "webapp/styles.css",
  migration: "infra/migrations/001_initial_schema.sql",
  artifactHandoff: "src/artifactHandoff.ts",
  runtimeEnv: "scripts/validate-runtime-env.mjs",
  dockerfile: "Dockerfile",
  k8s: "infra/k8s/app.yaml",
  packageJson: "package.json",
  workflow: ".github/workflows/verify.yml"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);
const customerAccessibilitySummary = summarizeCustomerAccessibilityEvidence(customerAccessibilityEvidenceItems);
const customerAccessibilityBlockers = validateCustomerAccessibilityEvidence(customerAccessibilityEvidenceItems);

const checks = [
  checkIncludes("security", "http-security-headers", contents.apiServer, [
    "Content-Security-Policy",
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "Cross-Origin-Opener-Policy",
    "Cross-Origin-Resource-Policy",
    "Permissions-Policy",
    "Referrer-Policy",
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Cache-Control"
  ]),
  checkAbsent("security", "csp-does-not-allow-unsafe-eval", contents.apiServer, ["'unsafe-eval'"]),
  checkIncludes("security", "container-and-k8s-hardening", `${contents.dockerfile}\n${contents.k8s}`, [
    "USER node",
    "seccompProfile:",
    "type: RuntimeDefault",
    "allowPrivilegeEscalation: false",
    'drop: ["ALL"]',
    "runAsGroup: 1000",
    "runAsNonRoot: true",
    "runAsUser: 1000"
  ]),
  checkIncludes("privacy", "raw-provider-content-stays-off", contents.migration, [
    "raw_profile_stored BOOLEAN NOT NULL DEFAULT FALSE CHECK (raw_profile_stored = FALSE)",
    "raw_content_stored BOOLEAN NOT NULL DEFAULT FALSE CHECK (raw_content_stored = FALSE)",
    "CREATE TABLE consent_records",
    "CREATE TABLE data_requests",
    "forgotten_at TIMESTAMPTZ"
  ]),
  checkIncludes("privacy", "signed-artifact-share-controls", `${contents.artifactHandoff}\n${contents.runtimeEnv}`, [
    "externalShareApprovalRequired: true",
    "Artifact handoff must require external share approval.",
    "signatureVersion: \"hmac-sha256-v1\"",
    "OBJECT_STORE_SIGNING_SECRET",
    "REAL_ORDER_KILL_SWITCH=disabled"
  ]),
  checkIncludes("accessibility", "semantic-app-shell", `${contents.app}\n${contents.webappApp}\n${contents.webappPrint}`, [
    'className="skipLink"',
    'href="#main-content"',
    'aria-label="CustomCard navigation"',
    'id="main-content"',
    'aria-label="Print-shop payment status"',
    "aria-label={`${capability.label} ready-local adapter coverage`}"
  ]),
  checkIncludes("accessibility", "skip-link-focus-style", `${contents.styles}\n${contents.webappStyles}`, [
    ".skipLink",
    ".skipLink:focus",
    "transform: translateY(0)"
  ]),
  checkExact("accessibility", "customer-accessibility-evidence", customerAccessibilitySummary.total, 6),
  checkExact("accessibility", "customer-accessibility-external-audit-claims", customerAccessibilitySummary.externalAuditAttached, 0),
  checkExact("accessibility", "customer-accessibility-screen-reader-claims", customerAccessibilitySummary.manualScreenReaderProofAttached, 0),
  checkNoBlockers("accessibility", "customer-accessibility-evidence-contract", customerAccessibilityBlockers),
  checkIncludes("ci", "baseline-doctor-is-scripted-and-gated", `${contents.packageJson}\n${contents.workflow}`, [
    '"security:doctor": "node scripts/security-privacy-accessibility-doctor.mjs"',
    "Validate security privacy accessibility baseline",
    "npm run security:doctor"
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
      service: "customcard-security-privacy-accessibility-doctor",
      status: failed.length === 0 ? "repo-consistent" : "contract-drift",
      scope: "repo-local",
      externalAudit: false,
      legalReview: false,
      liveProviderCalls: false,
      realOrdersEnabled: false,
      customerAccessibilityEvidence: {
        items: customerAccessibilitySummary.total,
        repoLocalReady: customerAccessibilitySummary.repoLocalReady,
        externalEvidenceMissing: customerAccessibilitySummary.externalEvidenceMissing,
        externalAuditAttached: customerAccessibilitySummary.externalAuditAttached,
        manualScreenReaderProofAttached: customerAccessibilitySummary.manualScreenReaderProofAttached
      },
      lanes,
      checks,
      registerIssues: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);
