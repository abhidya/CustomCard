import { readFileSync } from "node:fs";

const files = {
  apiServer: "scripts/api-server.mjs",
  app: "src/App.tsx",
  styles: "src/styles.css",
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
  checkIncludes("accessibility", "semantic-app-shell", contents.app, [
    'className="skipLink"',
    'href="#main-content"',
    'aria-label="CustomCard navigation"',
    '<main className="appMain" id="main-content">',
    'aria-label="Checkout status"',
    "aria-label={`${capability.label} ready-local adapter coverage`}"
  ]),
  checkIncludes("accessibility", "skip-link-focus-style", contents.styles, [
    ".skipLink",
    ".skipLink:focus",
    "transform: translateY(0)"
  ]),
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
    status: laneChecks.every((check) => check.passed) ? "ready" : "blocked"
  };
});

const failed = checks.filter((check) => !check.passed);

console.log(
  JSON.stringify(
    {
      service: "customcard-security-privacy-accessibility-doctor",
      status: failed.length === 0 ? "ready" : "blocked",
      externalAudit: false,
      legalReview: false,
      liveProviderCalls: false,
      realOrdersEnabled: false,
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
    detail: missing.length === 0 ? `Found ${required.length} required baseline signals.` : `Missing required baseline signals: ${missing.join(", ")}`
  };
}

function checkAbsent(lane, id, text, forbidden) {
  const present = forbidden.filter((needle) => text.includes(needle));
  return {
    id,
    lane,
    passed: present.length === 0,
    detail: present.length === 0 ? "No forbidden baseline signals found." : `Forbidden baseline signals present: ${present.join(", ")}`
  };
}
