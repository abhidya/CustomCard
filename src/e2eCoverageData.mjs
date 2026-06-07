const requiredCoverageIds = [
  "customer-workspace-to-handoff",
  "customer-panel-readiness",
  "admin-panel-readiness",
  "adapter-matrix-readiness",
  "api-public-readiness",
  "api-contract-mutations",
  "api-memory-runtime",
  "api-postgres-runtime",
  "api-postgres-http-integration",
  "account-auth-storage-recovery",
  "mobile-customer-shell",
  "mobile-render-readiness",
  "mobile-native-release-profile",
  "artifact-store-handoff",
  "deployment-iac-readiness",
  "cloud-artifact-proof-readiness",
  "hosted-api-proof-readiness",
  "reviewer-db-seed-readiness",
  "business-engagement-readiness",
  "security-privacy-accessibility",
  "external-audit-evidence-register",
  "ai-provider-readiness",
  "observability-alerting-readiness",
  "retail-fulfillment-readiness",
  "payment-refund-readiness",
  "capacity-cost-readiness",
  "localization-rtl-readiness",
  "printer-pricing-research",
  "demo-reset-worker-readiness"
];

const requiredSurfaces = ["web-customer", "web-admin", "adapters", "api", "identity", "mobile", "infra", "governance"];
const allowedAutomationTypes = new Set(["browser-smoke", "contract-test", "doctor", "ci-workflow"]);

export const e2eCoverageItems = [
  {
    id: "customer-workspace-to-handoff",
    label: "Customer workspace to print options",
    surface: "web-customer",
    automationType: "browser-smoke",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run test -- --run tests/app-smoke.test.ts", "npm run check"],
    evidence: ["Starts local workspace", "Scans free import", "Generates four-panel card", "Prepares print options"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "customer-panel-readiness",
    label: "Your cards readiness",
    surface: "web-customer",
    automationType: "browser-smoke",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run test -- --run tests/app-smoke.test.ts", "npm run check"],
    evidence: ["Your cards view visible", "Local chat transcript visible", "Render choices visible", "No horizontal overflow"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "admin-panel-readiness",
    label: "Admin panel readiness",
    surface: "web-admin",
    automationType: "browser-smoke",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run test -- --run tests/app-smoke.test.ts", "npm run check"],
    evidence: ["Provider governance visible", "Launch gates visible", "External audit readiness visible", "Capacity profiles visible"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "adapter-matrix-readiness",
    label: "Adapter matrix readiness",
    surface: "adapters",
    automationType: "browser-smoke",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run test -- --run tests/app-smoke.test.ts", "npm run provider:governance:doctor", "npm run check"],
    evidence: ["Ready local adapters visible", "Credential-gated adapters visible", "Blocked live vendor adapters visible"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "api-public-readiness",
    label: "API health and readiness",
    surface: "api",
    automationType: "contract-test",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run test -- --run tests/api-server.test.ts", "npm run api:doctor", "npm run check"],
    evidence: ["/api/health responds", "/api/routes responds", "/api/admin/readiness responds", "Security headers enforced"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "api-contract-mutations",
    label: "API contract mutation workflow",
    surface: "api",
    automationType: "contract-test",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run test -- --run tests/api-server.test.ts src/apiContracts.test.ts", "npm run check"],
    evidence: ["Import preview accepted contract-only", "Card project accepted contract-only", "Render packet accepted contract-only", "Manual handoff accepted contract-only", "Data request accepted contract-only"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "api-memory-runtime",
    label: "API memory runtime auth and idempotency",
    surface: "api",
    automationType: "contract-test",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run test -- --run tests/api-server.test.ts", "npm run api:doctor:memory", "npm run check"],
    evidence: ["Bearer auth enforced", "Wrong role blocked", "Idempotency key required", "Replay and conflict behavior covered"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "api-postgres-runtime",
    label: "Postgres runtime repository workflow",
    surface: "api",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run api:doctor:postgres", "npm run api:doctor:postgres:live", "npm run check"],
    evidence: ["Migration applied to isolated database", "Repository-backed customer routes authorized", "Audit rows written", "Queue jobs written"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "api-postgres-http-integration",
    label: "Postgres HTTP integration workflow",
    surface: "api",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run api:doctor:postgres:http", "npm run check"],
    evidence: ["API server starts in Postgres mode", "HTTP auth enforced", "Six repository-backed mutations covered", "Replay/conflict behavior covered"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "account-auth-storage-recovery",
    label: "Account auth storage and recovery",
    surface: "identity",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run account:doctor:live", "npm run check"],
    evidence: ["Hosted identity rows stored without raw profile", "Hashed recovery challenge stored", "Durable session created", "Audit row appended"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "mobile-customer-shell",
    label: "Mobile customer shell workflow",
    surface: "mobile",
    automationType: "contract-test",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run test -- --run tests/mobile-contract.test.ts", "npm --prefix apps/mobile run doctor", "npm run check"],
    evidence: ["Next-action summary covered", "Memory review covered", "Print proof checks covered", "Offline sync posture covered"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "mobile-render-readiness",
    label: "Mobile render readiness",
    surface: "mobile",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run mobile:render:doctor", "npm run test -- --run src/mobileRenderReadiness.test.ts", "npm run check"],
    evidence: ["Native shell source render covered", "Viewport profiles tracked", "Emulator proof remains unclaimed", "Signed artifact remains unclaimed"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "mobile-native-release-profile",
    label: "Mobile native release profile gate",
    surface: "mobile",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run mobile:release:doctor", "npm run check"],
    evidence: ["iOS profile present", "Android profile present", "API URL environment sourced", "Signed artifact not claimed"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "artifact-store-handoff",
    label: "Artifact store handoff workflow",
    surface: "infra",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run artifact:doctor", "npm run artifact:doctor:s3:live", "npm run check"],
    evidence: ["Filesystem write/read verified", "Injected S3-compatible write/read verified", "Live MinIO/S3-compatible write/read verified", "Signed artifact URLs preserved"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "deployment-iac-readiness",
    label: "Deployment and IaC readiness",
    surface: "infra",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run deployment:doctor", "npm run cloud:doctor", "npm run check"],
    evidence: ["Local dev lane ready", "Cheap droplet lane ready", "Cloud-native lane ready", "Static AWS artifact-store IaC verified"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "cloud-artifact-proof-readiness",
    label: "Cloud artifact proof readiness",
    surface: "infra",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run cloud:artifact:proof:doctor", "npm run test -- --run src/cloudArtifactProofReadiness.test.ts", "npm run check"],
    evidence: ["Terraform artifact bucket contract covered", "Applied bucket ARN proof gap tracked", "IAM output proof gap tracked", "Applied cloud proof remains unclaimed"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "hosted-api-proof-readiness",
    label: "Hosted API proof readiness",
    surface: "infra",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run hosted:api:doctor", "npm run test -- --run src/hostedApiReadiness.test.ts", "npm run check"],
    evidence: ["Vercel deployment metadata tracked", "Hosted env proof gaps tracked", "Public DB route proof remains unclaimed", "Hosted token proof remains unclaimed"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "reviewer-db-seed-readiness",
    label: "Reviewer DB seed readiness",
    surface: "infra",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run reviewer:db:seed:doctor", "npm run test -- --run src/reviewerDbSeedReadiness.test.ts", "npm run check"],
    evidence: ["Demo seed tables covered", "Reviewer session tokens covered", "Hosted seed proof remains unclaimed", "Rollback drill evidence required"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "business-engagement-readiness",
    label: "CRM lifecycle engagement readiness",
    surface: "adapters",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run business:engagement:doctor", "npm run test -- --run src/businessEngagementReadiness.test.ts", "npm run check"],
    evidence: ["CRM lifecycle triggers covered", "Workflow payload contracts covered", "Customer message channels covered", "Live customer sends disabled"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "security-privacy-accessibility",
    label: "Security privacy accessibility baseline",
    surface: "governance",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run security:doctor", "npm run customer:accessibility:doctor", "npm run check"],
    evidence: [
      "Security headers verified",
      "Raw content storage blocked",
      "Signed artifact sharing controlled",
      "App-shell accessibility landmarks verified",
      "Customer accessibility evidence doctor",
      "Labeled customer controls covered",
      "External accessibility audit remains unclaimed"
    ],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "external-audit-evidence-register",
    label: "External audit evidence register",
    surface: "governance",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run external:audit:doctor", "npm run check"],
    evidence: ["15 evidence gaps tracked", "Production-gate mappings verified", "Public production claims disabled", "Attached external artifacts not claimed"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "ai-provider-readiness",
    label: "AI provider readiness",
    surface: "governance",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run ai:doctor", "npm run test -- --run src/aiProviderReadiness.test.ts", "npm run check"],
    evidence: ["Text provider contracts covered", "Image provider contracts covered", "Prompt audits required", "Live AI calls disabled"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "observability-alerting-readiness",
    label: "Observability and alerting readiness",
    surface: "governance",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run observability:doctor", "npm run test -- --run src/observabilityReadiness.test.ts", "npm run check"],
    evidence: ["Telemetry schema covered", "PII redaction required", "Alert route drill tracked", "Live ingestion disabled"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "retail-fulfillment-readiness",
    label: "Retail fulfillment readiness",
    surface: "governance",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run retail:doctor", "npm run test -- --run src/retailFulfillmentReadiness.test.ts", "npm run check"],
    evidence: ["Live vendor adapters covered", "Manual fallbacks covered", "Recovery drills tracked", "Direct orders disabled"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "payment-refund-readiness",
    label: "Payment and refund readiness",
    surface: "governance",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run payment:doctor", "npm run test -- --run src/paymentReadiness.test.ts", "npm run check"],
    evidence: ["Payment provider contracts covered", "No-payment fallback covered", "Refund drills tracked", "Live charges disabled"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "capacity-cost-readiness",
    label: "Capacity and cost readiness",
    surface: "infra",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run capacity:doctor", "npm run provider:governance:doctor", "npm run check"],
    evidence: ["Four capacity profiles covered", "Provider budgets capped", "Queue/object-store posture covered", "Live provider calls disabled"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "localization-rtl-readiness",
    label: "Localization and RTL readiness",
    surface: "web-customer",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run localization:doctor", "npm run test -- --run tests/mobile-contract.test.ts tests/app-smoke.test.ts", "npm run check"],
    evidence: ["Four launch locales covered", "Two RTL locales covered", "Human copy review required", "Mobile locale options covered"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "printer-pricing-research",
    label: "Printer pricing research workflow",
    surface: "adapters",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run printer:pricing:doctor", "npm run test -- --run tests/app-smoke.test.ts", "npm run check"],
    evidence: ["Official-source observations covered", "Freshness policy covered", "Manual confirmation required", "No live quote claim"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  },
  {
    id: "demo-reset-worker-readiness",
    label: "Demo reset and worker readiness",
    surface: "infra",
    automationType: "doctor",
    status: "covered",
    ciGated: true,
    testCommands: ["npm run demo:doctor", "npm run worker", "npm run check"],
    evidence: ["Demo fixture reset covered", "Worker runtime starts", "No live provider calls", "No real orders"],
    liveProductionProof: false,
    realOrdersEnabled: false,
    externalNetworkCalls: false
  }
];

export function summarizeE2eCoverage(items = e2eCoverageItems) {
  const covered = items.filter((item) => item.status === "covered").length;
  return {
    total: items.length,
    covered,
    repoLocalCoveragePercent: items.length === 0 ? 0 : Math.round((covered / items.length) * 100),
    browserSmokeCovered: items.filter((item) => item.automationType === "browser-smoke").length,
    contractTestCovered: items.filter((item) => item.automationType === "contract-test").length,
    doctorCovered: items.filter((item) => item.automationType === "doctor").length,
    ciGated: items.filter((item) => item.ciGated).length,
    surfaces: Array.from(new Set(items.map((item) => item.surface))).sort(),
    liveProductionProofs: items.filter((item) => item.liveProductionProof).length,
    realOrdersEnabled: items.filter((item) => item.realOrdersEnabled).length,
    externalNetworkCalls: items.filter((item) => item.externalNetworkCalls).length,
    requiredCommandCount: Array.from(new Set(items.flatMap((item) => item.testCommands))).length,
    blockers: validateE2eCoverage(items)
  };
}

export function validateE2eCoverage(items = e2eCoverageItems) {
  const issues = [];
  const ids = new Set();
  const surfaces = new Set();

  for (const item of items) {
    if (ids.has(item.id)) issues.push(`Duplicate E2E coverage item: ${item.id}.`);
    ids.add(item.id);
    surfaces.add(item.surface);

    if (item.status !== "covered") issues.push(`E2E coverage item ${item.id} must be covered in the repo-local matrix.`);
    if (!allowedAutomationTypes.has(item.automationType)) {
      issues.push(`E2E coverage item ${item.id} has unsupported automation type.`);
    }
    if (item.ciGated !== true) issues.push(`E2E coverage item ${item.id} must be CI-gated.`);
    if (item.testCommands.length === 0) issues.push(`E2E coverage item ${item.id} must list test commands.`);
    if (item.evidence.length < 2) issues.push(`E2E coverage item ${item.id} must list at least two evidence points.`);
    if (item.liveProductionProof !== false) {
      issues.push(`E2E coverage item ${item.id} must not claim live production proof.`);
    }
    if (item.realOrdersEnabled !== false) issues.push(`E2E coverage item ${item.id} must keep realOrdersEnabled=false.`);
    if (item.externalNetworkCalls !== false) {
      issues.push(`E2E coverage item ${item.id} must not require live external network calls.`);
    }
  }

  for (const requiredId of requiredCoverageIds) {
    if (!ids.has(requiredId)) issues.push(`Missing E2E coverage item: ${requiredId}.`);
  }
  for (const requiredSurface of requiredSurfaces) {
    if (!surfaces.has(requiredSurface)) issues.push(`Missing E2E coverage surface: ${requiredSurface}.`);
  }

  return issues;
}
