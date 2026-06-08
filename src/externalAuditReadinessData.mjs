import { defineReadinessRegister } from "./readinessRegister.mjs";

const requiredAuditIds = [
  "production-auth-token-verification",
  "oauth-app-approval",
  "ai-generation-quality-review",
  "vendor-quote-freshness-proof",
  "payment-pci-refund-review",
  "telemetry-alert-drill",
  "cloud-bucket-iam-application",
  "deployed-postgres-public-proof",
  "native-mobile-artifact-proof",
  "legal-review",
  "security-assessment",
  "privacy-dpa-review",
  "accessibility-audit",
  "retail-partner-certification",
  "physical-print-certification"
];

const allowedStatuses = new Set(["internal-baseline-ready", "external-evidence-missing", "certification-blocked"]);

export const externalAuditReadinessItems = [
  {
    id: "production-auth-token-verification",
    label: "Production account-token verification",
    category: "identity",
    status: "external-evidence-missing",
    relatedProductionGateIds: ["production-user-auth"],
    requiredEvidence: ["Hosted identity tenant", "Production-equivalent JWT/JWKS verification logs", "Recovery drill transcript"],
    currentEvidence: ["Account auth storage/recovery doctor", "Hosted auth adapter contracts", "Route-scoped session tables"],
    evidenceArtifactRefs: [],
    reviewer: "identity owner",
    cadence: "before launch and after auth-provider changes",
    externalReviewerRequired: true,
    blocksProduction: true,
    publicClaimAllowed: false,
    blocker: "Hosted account-token verification outside isolated local/live Postgres doctors is not attached."
  },
  {
    id: "oauth-app-approval",
    label: "OAuth app approval and revocation review",
    category: "provider",
    status: "external-evidence-missing",
    relatedProductionGateIds: ["live-oauth-provider-imports"],
    requiredEvidence: ["Provider app approval", "Scoped consent screenshot", "Revocation drill output"],
    currentEvidence: ["OAuth provider request contracts", "Credential-gated adapter catalog", "Metadata-only import tests"],
    evidenceArtifactRefs: [],
    reviewer: "provider integrations owner",
    cadence: "before each provider is enabled",
    externalReviewerRequired: true,
    blocksProduction: true,
    publicClaimAllowed: false,
    blocker: "Live OAuth app approvals and revocation evidence are not attached."
  },
  {
    id: "ai-generation-quality-review",
    label: "AI text and image quality review",
    category: "ai",
    status: "external-evidence-missing",
    relatedProductionGateIds: ["live-ai-generation"],
    requiredEvidence: ["Model allowlist", "Prompt audit report", "Image safety QA", "Spend-limit approval"],
    currentEvidence: ["No-network AI request contracts", "PII redaction tests", "Provider governance budgets"],
    evidenceArtifactRefs: [],
    reviewer: "AI safety and product owner",
    cadence: "before model enablement and quarterly",
    externalReviewerRequired: true,
    blocksProduction: true,
    publicClaimAllowed: false,
    blocker: "No live model QA report, prompt audit, allowlist, or spend approval is attached."
  },
  {
    id: "vendor-quote-freshness-proof",
    label: "Live vendor quote freshness proof",
    category: "commerce",
    status: "external-evidence-missing",
    relatedProductionGateIds: ["live-vendor-quotes"],
    requiredEvidence: ["Retail API access proof", "Fresh quote capture", "Tax and pickup policy review"],
    currentEvidence: ["Review-only public printer pricing research", "Manual checkout confirmation warning", "Pricing doctor"],
    evidenceArtifactRefs: [],
    reviewer: "commerce owner",
    cadence: "before quote display and monthly",
    externalReviewerRequired: true,
    blocksProduction: true,
    publicClaimAllowed: false,
    blocker: "Retail quote APIs and timestamped quote freshness proof are not attached."
  },
  {
    id: "payment-pci-refund-review",
    label: "Payment PCI and refund review",
    category: "commerce",
    status: "external-evidence-missing",
    relatedProductionGateIds: ["live-payment-charges-refunds"],
    requiredEvidence: ["Processor live-mode approval", "Webhook signature proof", "Refund drill output", "PCI scope memo"],
    currentEvidence: ["Payment provider no-network contracts", "Webhook gate tests", "Real-order kill switch"],
    evidenceArtifactRefs: [],
    reviewer: "finance and security owner",
    cadence: "before charging customers and after processor changes",
    externalReviewerRequired: true,
    blocksProduction: true,
    publicClaimAllowed: false,
    blocker: "No live processor approval, refund drill, or PCI scope review is attached."
  },
  {
    id: "telemetry-alert-drill",
    label: "Telemetry ingestion and alert drill",
    category: "operations",
    status: "external-evidence-missing",
    relatedProductionGateIds: ["live-telemetry-alerting"],
    requiredEvidence: ["Telemetry project proof", "PII redaction sample", "Alert route drill", "Retention approval"],
    currentEvidence: ["Observability provider contracts", "Local health/readiness doctors", "No external telemetry default"],
    evidenceArtifactRefs: [],
    reviewer: "operations owner",
    cadence: "before production traffic and quarterly",
    externalReviewerRequired: true,
    blocksProduction: true,
    publicClaimAllowed: false,
    blocker: "No live telemetry workspace, alert route, or retention evidence is attached."
  },
  {
    id: "cloud-bucket-iam-application",
    label: "Applied cloud bucket and IAM proof",
    category: "cloud",
    status: "external-evidence-missing",
    relatedProductionGateIds: ["cloud-bucket-iam-proof"],
    requiredEvidence: ["Applied bucket ARN", "IAM policy output", "Signed URL probe", "Access log sample"],
    currentEvidence: ["Static AWS IaC contract", "Local filesystem artifact doctor", "Live MinIO/S3-compatible doctor"],
    evidenceArtifactRefs: [],
    reviewer: "cloud owner",
    cadence: "before launch and after storage policy changes",
    externalReviewerRequired: true,
    blocksProduction: true,
    publicClaimAllowed: false,
    blocker: "Applied production bucket/IAM output and signed URL probe evidence are not attached."
  },
  {
    id: "deployed-postgres-public-proof",
    label: "Deployed Postgres API proof",
    category: "cloud",
    status: "external-evidence-missing",
    relatedProductionGateIds: ["deployed-postgres-api", "vercel-deployment-db-access"],
    requiredEvidence: ["Hosted DATABASE_URL env proof", "Migration run output", "Authenticated public route doctor", "Backup policy"],
    currentEvidence: ["Postgres runtime contract doctor", "Live isolated Postgres integration doctor", "Postgres HTTP doctor"],
    evidenceArtifactRefs: [],
    reviewer: "platform owner",
    cadence: "before hosted launch and after schema changes",
    externalReviewerRequired: true,
    blocksProduction: true,
    publicClaimAllowed: false,
    blocker: "No public DB-backed hosted API route proof or backup policy is attached."
  },
  {
    id: "native-mobile-artifact-proof",
    label: "Signed native mobile artifact proof",
    category: "mobile",
    status: "external-evidence-missing",
    relatedProductionGateIds: ["native-mobile-artifact"],
    requiredEvidence: ["EAS build ID", "Signed iOS or Android artifact", "Emulator screenshot", "Push credential proof"],
    currentEvidence: ["Expo/EAS release profile contract", "Mobile shell doctor", "Mobile contract tests"],
    evidenceArtifactRefs: [],
    reviewer: "mobile owner",
    cadence: "before mobile distribution and each release",
    externalReviewerRequired: true,
    blocksProduction: true,
    publicClaimAllowed: false,
    blocker: "No signed native artifact, build ID, or emulator render proof is attached."
  },
  {
    id: "legal-review",
    label: "External legal review",
    category: "external-review",
    status: "external-evidence-missing",
    relatedProductionGateIds: ["external-audits"],
    requiredEvidence: ["Terms review", "Consumer fulfillment review", "Warranty/refund language review"],
    currentEvidence: ["Policy-oriented docs", "Known gap registry", "Real-order disabled posture"],
    evidenceArtifactRefs: [],
    reviewer: "external legal counsel",
    cadence: "before public launch and material policy changes",
    externalReviewerRequired: true,
    blocksProduction: true,
    publicClaimAllowed: false,
    blocker: "No external legal review report is attached."
  },
  {
    id: "security-assessment",
    label: "External security assessment",
    category: "external-review",
    status: "internal-baseline-ready",
    relatedProductionGateIds: ["external-audits"],
    requiredEvidence: ["Security assessment report", "Remediation log", "Retest signoff"],
    currentEvidence: ["Security/privacy/accessibility doctor", "Security header baseline", "Container hardening tests"],
    evidenceArtifactRefs: [],
    reviewer: "external security assessor",
    cadence: "before production launch and annually",
    externalReviewerRequired: true,
    blocksProduction: true,
    publicClaimAllowed: false,
    blocker: "Only internal security baseline evidence exists; no external security assessment is attached."
  },
  {
    id: "privacy-dpa-review",
    label: "External privacy and DPA review",
    category: "external-review",
    status: "internal-baseline-ready",
    relatedProductionGateIds: ["external-audits"],
    requiredEvidence: ["Privacy policy review", "DPA review", "Data deletion workflow review"],
    currentEvidence: ["Data request contract", "Raw-content storage checks", "Consent/audit persistence contracts"],
    evidenceArtifactRefs: [],
    reviewer: "external privacy reviewer",
    cadence: "before production launch and policy changes",
    externalReviewerRequired: true,
    blocksProduction: true,
    publicClaimAllowed: false,
    blocker: "Only internal privacy controls exist; no external privacy/DPA report is attached."
  },
  {
    id: "accessibility-audit",
    label: "External accessibility audit",
    category: "external-review",
    status: "internal-baseline-ready",
    relatedProductionGateIds: ["external-audits"],
    requiredEvidence: ["WCAG audit report", "Assistive technology test notes", "Remediation signoff"],
    currentEvidence: [
      "App shell landmarks",
      "Skip-link focus tests",
      "Chrome overflow smoke tests",
      "Customer accessibility evidence doctor",
      "customerAccessibilityEvidence Module"
    ],
    evidenceArtifactRefs: [],
    reviewer: "external accessibility auditor",
    cadence: "before production launch and major UI changes",
    externalReviewerRequired: true,
    blocksProduction: true,
    publicClaimAllowed: false,
    blocker: "Only internal accessibility baseline checks exist; no external accessibility audit is attached."
  },
  {
    id: "retail-partner-certification",
    label: "Retail partner certification",
    category: "print",
    status: "certification-blocked",
    relatedProductionGateIds: ["direct-retail-printer-ordering"],
    requiredEvidence: ["Retail partner certification", "Order mutation approval", "Wrong-store recovery drill"],
    currentEvidence: ["Blocked retail-printer adapters", "Manual vendor handoff", "Real-order kill switch"],
    evidenceArtifactRefs: [],
    reviewer: "retail partnerships owner",
    cadence: "before enabling each retail order API",
    externalReviewerRequired: true,
    blocksProduction: true,
    publicClaimAllowed: false,
    blocker: "Direct retail-printer ordering remains blocked until partner certification is attached."
  },
  {
    id: "physical-print-certification",
    label: "Physical print certification",
    category: "print",
    status: "certification-blocked",
    relatedProductionGateIds: ["physical-print-certification"],
    requiredEvidence: ["Printed 5x7 sample", "DPI/color/safe-zone QA", "Fold/cut inspection", "Retail pickup proof"],
    currentEvidence: ["Print export package", "Safe-zone validator", "Manual handoff checklist"],
    evidenceArtifactRefs: [],
    reviewer: "print QA owner",
    cadence: "before each enabled vendor and after template changes",
    externalReviewerRequired: true,
    blocksProduction: true,
    publicClaimAllowed: false,
    blocker: "No physical print sample, pickup proof, or retailer QA certification is attached."
  }
];

const externalAuditReadinessRegister = defineReadinessRegister({
  domainLabel: "external audit",
  items: externalAuditReadinessItems,
  requiredIds: requiredAuditIds,
  itemRules(item) {
    const issues = [];
    if (!allowedStatuses.has(item.status)) issues.push(`External audit readiness item ${item.id} has unsupported status.`);
    if (item.publicClaimAllowed !== false) {
      issues.push(`External audit readiness item ${item.id} must keep publicClaimAllowed=false until external evidence is reviewed.`);
    }
    if (item.blocksProduction !== true) {
      issues.push(`External audit readiness item ${item.id} must block production until external evidence is attached.`);
    }
    if (item.externalReviewerRequired !== true) {
      issues.push(`External audit readiness item ${item.id} must require an external reviewer.`);
    }
    if (item.evidenceArtifactRefs.length > 0) {
      issues.push(`External audit readiness item ${item.id} must not claim attached external artifacts in the free local MVP.`);
    }
    if (item.requiredEvidence.length < 2) {
      issues.push(`External audit readiness item ${item.id} must list at least two required evidence items.`);
    }
    if (item.currentEvidence.length === 0) {
      issues.push(`External audit readiness item ${item.id} must list current internal evidence.`);
    }
    if (item.relatedProductionGateIds.length === 0) {
      issues.push(`External audit readiness item ${item.id} must map to at least one production launch gate.`);
    }
    if (!item.blocker) {
      issues.push(`External audit readiness item ${item.id} must explain the missing external proof.`);
    }
    return issues;
  },
  summarize(items) {
    return {
      internalBaselineReady: items.filter((item) => item.status === "internal-baseline-ready").length,
      externalEvidenceMissing: items.filter((item) => item.status === "external-evidence-missing").length,
      certificationBlocked: items.filter((item) => item.status === "certification-blocked").length,
      productionBlocked: items.filter((item) => item.blocksProduction).length,
      publicClaimsAllowed: items.filter((item) => item.publicClaimAllowed).length,
      externalArtifactsAttached: items.reduce((total, item) => total + item.evidenceArtifactRefs.length, 0),
      externalReviewerRequired: items.filter((item) => item.externalReviewerRequired).length,
      requiredEvidence: Array.from(new Set(items.flatMap((item) => item.requiredEvidence))).sort()
    };
  }
});

export function summarizeExternalAuditReadiness(items = externalAuditReadinessItems) {
  return {
    ...externalAuditReadinessRegister.summarize(items),
    blockers: items.filter((item) => item.blocksProduction).map((item) => item.blocker)
  };
}

export function validateExternalAuditReadiness(items = externalAuditReadinessItems) {
  return externalAuditReadinessRegister.validate(items);
}
