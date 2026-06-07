import { readFileSync } from "node:fs";

const files = {
  source: "src/accessibilityReadiness.ts",
  test: "src/accessibilityReadiness.test.ts",
  docs: "docs/accessibility-evidence.md",
  packageJson: "package.json"
};

const contents = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const requiredGateIds = [
  "keyboard-path",
  "labels-and-names",
  "contrast-token-review",
  "responsive-overflow-evidence",
  "screen-reader-landmarks",
  "reduced-motion-policy",
  "external-accessibility-audit"
];

const unsafeClaimNeedles = [
  "WCAG 2.2 AA compliant",
  "Live accessibility audit passed",
  "publicClaimAllowed: true",
  "liveAuditClaimed: true",
  "fake-wcag-report.pdf"
];

const exactValidationCommand = "npm run test -- src/accessibilityReadiness.test.ts && npm run accessibility:doctor";

const checks = [
  checkIncludes("register", "required-gate-inventory", contents.source, requiredGateIds),
  checkIncludes("register", "customer-admin-surfaces", contents.source, ["customer-web", "admin-web"]),
  checkIncludes("register", "local-readiness-statuses", contents.source, [
    "repo-local-signal",
    "local-evidence-required",
    "external-audit-blocked"
  ]),
  checkIncludes("safety", "unsafe-claim-fields", contents.source, [
    "blocksExternalClaim",
    "publicClaimAllowed",
    "liveAuditClaimed",
    "auditArtifactRefs",
    "containsUnsafeAuditClaim"
  ]),
  checkIncludes("safety", "unsafe-claim-tests", contents.test, unsafeClaimNeedles),
  checkIncludes("tests", "summary-validation-test", contents.test, [
    "validates the local readiness summary",
    "fails unsafe live audit claims",
    "Missing accessibility readiness gate: reduced-motion-policy."
  ]),
  checkIncludes("docs", "evidence-doc-boundary", contents.docs, [
    "not a live external accessibility audit",
    "What is proven",
    "What remains blocked",
    exactValidationCommand
  ]),
  checkIncludes("script", "npm-script", contents.packageJson, [
    '"accessibility:doctor": "node scripts/accessibility-readiness-doctor.mjs"'
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
      service: "customcard-accessibility-readiness-doctor",
      status: failed.length === 0 ? "ready" : "blocked",
      requiredGates: requiredGateIds.length,
      liveExternalAuditClaimed: false,
      publicAuditClaimsAllowed: false,
      lanes,
      checks,
      blockers: failed.map((check) => ({ id: check.id, lane: check.lane, detail: check.detail }))
    },
    null,
    2
  )
);

if (failed.length > 0) process.exit(1);

function checkIncludes(lane, id, text, required) {
  const missing = required.filter((needle) => !text.includes(needle));
  return {
    id,
    lane,
    passed: missing.length === 0,
    detail:
      missing.length === 0
        ? `Found ${required.length} required accessibility readiness signals.`
        : `Missing accessibility readiness signals: ${missing.join(", ")}`
  };
}
