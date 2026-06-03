export type ProductionLaunchGateStatus = "contract-ready" | "evidence-missing" | "blocked";

export interface ProductionLaunchGate {
  id: string;
  label: string;
  category: "identity" | "provider" | "commerce" | "cloud" | "mobile" | "audit" | "print";
  status: ProductionLaunchGateStatus;
  liveEnabled: false;
  requiredEvidence: string[];
  currentEvidence: string[];
  blocker: string;
  adminAction: string;
}

export interface ProductionReadinessSummary {
  total: number;
  contractReady: number;
  evidenceMissing: number;
  blocked: number;
  liveEnabled: number;
  requiredEvidence: string[];
  blockers: string[];
}

export const productionLaunchGates: ProductionLaunchGate[] = [
  {
    id: "production-user-auth",
    label: "Production user auth",
    category: "identity",
    status: "evidence-missing",
    liveEnabled: false,
    requiredEvidence: ["Hosted identity tenant", "Token verification logs", "Account recovery drill", "Session secret rotation"],
    currentEvidence: ["Auth0/Clerk/Supabase/Firebase/Cognito adapter contracts", "Account auth doctor", "Session hardening tests"],
    blocker: "No production tenant token-verification evidence has been attached.",
    adminAction: "Connect a hosted identity tenant and run account:doctor:live against production-equivalent tokens."
  },
  {
    id: "live-oauth-provider-imports",
    label: "Live OAuth imports",
    category: "provider",
    status: "evidence-missing",
    liveEnabled: false,
    requiredEvidence: ["Provider OAuth app review", "Scoped consent screenshots", "Revocation drill", "Metadata schema validation"],
    currentEvidence: ["Google, Microsoft, CardDAV, Salesforce, HubSpot, Zoho, Pipedrive, Dynamics, and Shopify contracts"],
    blocker: "Live OAuth app approvals and revocation evidence are not present.",
    adminAction: "Record provider approvals, scoped consent, and revocation test evidence before enabling live sync."
  },
  {
    id: "live-ai-generation",
    label: "Live AI text and image generation",
    category: "provider",
    status: "evidence-missing",
    liveEnabled: false,
    requiredEvidence: ["Provider keys", "Model allowlist", "Prompt audit", "Quality review", "Spend limits"],
    currentEvidence: ["No-network request contracts", "PII redaction tests", "Provider governance budgets"],
    blocker: "Paid model traffic has no live allowlist, spend, or QA evidence.",
    adminAction: "Attach provider credentials, approve the model allowlist, and complete prompt/quality review."
  },
  {
    id: "live-vendor-quotes",
    label: "Live vendor quotes",
    category: "commerce",
    status: "evidence-missing",
    liveEnabled: false,
    requiredEvidence: ["Retail API access", "Fresh quote capture", "Store availability proof", "Tax and pickup policy review"],
    currentEvidence: ["Public printer pricing research", "Manual vendor handoff", "Quote freshness disclaimers"],
    blocker: "Retail quote APIs and quote freshness evidence are not connected.",
    adminAction: "Connect approved quote APIs and store quote snapshots with timestamped source evidence."
  },
  {
    id: "live-payment-charges-refunds",
    label: "Live payment charges and refunds",
    category: "commerce",
    status: "evidence-missing",
    liveEnabled: false,
    requiredEvidence: ["Processor live mode approval", "Webhook verification", "Refund drill", "PCI scope review"],
    currentEvidence: ["Stripe/PayPal/Square/Adyen sandbox contracts", "No-payment checkout fallback", "Webhook gate tests"],
    blocker: "The app has no live processor approval, refund proof, or PCI review.",
    adminAction: "Run sandbox-to-live processor certification and record refund/webhook evidence."
  },
  {
    id: "direct-retail-printer-ordering",
    label: "Direct retail-printer ordering",
    category: "commerce",
    status: "blocked",
    liveEnabled: false,
    requiredEvidence: ["Retail partner certification", "Physical print QA", "Real-order kill switch release", "Wrong-store recovery drill"],
    currentEvidence: ["Walgreens/CVS/FedEx/Walmart/Staples/Office Depot blocked adapters", "Local print package export"],
    blocker: "Direct ordering remains disabled until retail certification and physical QA pass.",
    adminAction: "Complete partner certification, physical print QA, and recovery drills before any order API mutation."
  },
  {
    id: "live-telemetry-alerting",
    label: "Live telemetry ingestion and alerting",
    category: "cloud",
    status: "evidence-missing",
    liveEnabled: false,
    requiredEvidence: ["Telemetry endpoint proof", "PII redaction sample", "Alert route drill", "Retention policy approval"],
    currentEvidence: ["Sentry/PostHog/OTLP/Grafana/Datadog/Better Stack contracts", "Local health audit fallback"],
    blocker: "No live telemetry project, alert route, or retention evidence is attached.",
    adminAction: "Connect a telemetry workspace and run a redacted alert-routing drill."
  },
  {
    id: "cloud-bucket-iam-proof",
    label: "Cloud bucket and IAM proof",
    category: "cloud",
    status: "evidence-missing",
    liveEnabled: false,
    requiredEvidence: ["Applied bucket ARN", "IAM policy output", "Signed URL probe", "Access log sample"],
    currentEvidence: ["Static AWS IaC contract", "Local MinIO/S3-compatible doctor", "Artifact manifest tests"],
    blocker: "Static IaC is present, but no applied production bucket/IAM output is attached.",
    adminAction: "Apply cloud storage IaC in a production account and record the signed-artifact probe output."
  },
  {
    id: "deployed-postgres-api",
    label: "Deployed production Postgres API",
    category: "cloud",
    status: "evidence-missing",
    liveEnabled: false,
    requiredEvidence: ["Production DATABASE_URL", "Migration run", "Route auth probe", "Idempotency/audit rows", "Backup policy"],
    currentEvidence: ["Postgres integration doctors", "HTTP Postgres API doctor", "Persistence contract tests"],
    blocker: "No deployed production Postgres route proof or backup policy is attached.",
    adminAction: "Run migrations against the hosted database and capture authenticated route doctor output."
  },
  {
    id: "vercel-deployment-db-access",
    label: "Vercel deployment and DB access",
    category: "cloud",
    status: "evidence-missing",
    liveEnabled: false,
    requiredEvidence: ["Vercel project link", "Environment variable sync", "Deployment URL", "Database connectivity doctor"],
    currentEvidence: [
      "Static/API server build",
      "Deployment readiness doctor",
      "Env template",
      "Vercel project linked",
      "Protected production deployment inspected"
    ],
    blocker: "Vercel deployment exists, but hosted DB env vars and public DB doctor output are not present.",
    adminAction: "Set Vercel Postgres env vars, disable or bypass deployment protection for verification, and run the hosted API DB doctor."
  },
  {
    id: "native-mobile-artifact",
    label: "Signed native mobile artifact",
    category: "mobile",
    status: "evidence-missing",
    liveEnabled: false,
    requiredEvidence: ["EAS build ID", "Signed iOS/Android artifact", "Emulator screenshot", "Push credential proof"],
    currentEvidence: ["Expo customer shell contract", "Mobile release doctor", "Mobile contract tests"],
    blocker: "No signed native artifact or emulator render proof is attached.",
    adminAction: "Run EAS build or emulator QA and attach artifact IDs plus screenshots."
  },
  {
    id: "external-audits",
    label: "External legal/security/privacy/accessibility audit",
    category: "audit",
    status: "evidence-missing",
    liveEnabled: false,
    requiredEvidence: ["Legal review", "Security assessment", "Privacy/DPA review", "Accessibility audit report"],
    currentEvidence: ["Security/privacy/accessibility doctor", "Policy docs", "Data request contract"],
    blocker: "Only internal doctors exist; no external audit report is attached.",
    adminAction: "Commission and attach external review reports before production launch."
  },
  {
    id: "physical-print-certification",
    label: "Physical print certification",
    category: "print",
    status: "blocked",
    liveEnabled: false,
    requiredEvidence: ["Printed 5x7 sample", "DPI/color/safe-zone QA", "Fold/cut inspection", "Retail pickup proof"],
    currentEvidence: ["Print export package", "Safe-zone validator", "Manual handoff checklist"],
    blocker: "No physical sample or retailer certification has been recorded.",
    adminAction: "Print certified samples through each enabled vendor and attach QA evidence."
  }
];

export function summarizeProductionReadiness(
  gates: ProductionLaunchGate[] = productionLaunchGates
): ProductionReadinessSummary {
  const requiredEvidence = Array.from(new Set(gates.flatMap((gate) => gate.requiredEvidence))).sort();
  return {
    total: gates.length,
    contractReady: gates.filter((gate) => gate.status === "contract-ready").length,
    evidenceMissing: gates.filter((gate) => gate.status === "evidence-missing").length,
    blocked: gates.filter((gate) => gate.status === "blocked").length,
    liveEnabled: gates.filter((gate) => gate.liveEnabled).length,
    requiredEvidence,
    blockers: gates.filter((gate) => gate.status !== "contract-ready").map((gate) => gate.blocker)
  };
}

export function validateProductionReadiness(gates: ProductionLaunchGate[] = productionLaunchGates): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();

  for (const gate of gates) {
    if (ids.has(gate.id)) issues.push(`Duplicate production launch gate: ${gate.id}`);
    ids.add(gate.id);

    if (gate.liveEnabled) {
      issues.push(`Production launch gate ${gate.id} must not enable live behavior without external evidence.`);
    }
    if (gate.requiredEvidence.length === 0) {
      issues.push(`Production launch gate ${gate.id} must list required evidence.`);
    }
    if (gate.currentEvidence.length === 0) {
      issues.push(`Production launch gate ${gate.id} must list current contract evidence.`);
    }
    if (gate.status !== "contract-ready" && !gate.blocker) {
      issues.push(`Production launch gate ${gate.id} must explain its blocker.`);
    }
  }

  return issues;
}
