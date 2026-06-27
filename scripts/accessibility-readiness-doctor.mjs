import { checkIncludes, readTextFiles, runDoctorManifest } from "./doctor-harness.mjs";

const files = {
  source: "src/accessibilityReadiness.ts",
  test: "src/accessibilityReadiness.test.ts",
  docs: "docs/accessibility-evidence.md",
  packageJson: "package.json"
};

const contents = readTextFiles(files);

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

runDoctorManifest({
  service: "customcard-accessibility-readiness-doctor",
  metrics: {
    requiredGates: requiredGateIds.length,
    liveExternalAuditClaimed: false,
    publicAuditClaimsAllowed: false
  },
  checks
});
