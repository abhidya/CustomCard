import type { AdminOperationsWorkflow } from "./adminOperations";
import type { AdminPanelModel } from "./providerCatalog";
import type { ProviderGovernanceSummary } from "./providerGovernance";
import type { ProviderOpsModel, ProviderOpsProvider } from "./providerOps";
import type { RuntimeReadiness } from "./providerRuntime";
import type { ProductionReadinessSummary } from "./productionReadiness";
import type { ReadinessSummary } from "./readinessSummary";
import type { OrderStatus } from "./serviceKernel";

export type AdminPortalSectionId = "ops" | "orders" | "users" | "assets" | "providers" | "ai-loop" | "launch";
export type AdminPortalStatus = "ready" | "attention" | "blocked";
export type AdminPortalRisk = "low" | "medium" | "high";

export interface AdminPortalMetric {
  label: string;
  value: string;
}

export interface AdminPortalControl {
  id: string;
  label: string;
  detail: string;
  enabled: boolean;
}

export interface AdminPortalRecord {
  id: string;
  label: string;
  domain: string;
  owner: string;
  source: string;
  status: AdminPortalStatus;
  risk: AdminPortalRisk;
  detail: string;
  action: string;
  evidence: string[];
  liveMutationEnabled: boolean;
  rawContentExposed: boolean;
}

export interface AdminPortalArea {
  id: AdminPortalSectionId;
  label: string;
  eyebrow: string;
  summary: string;
  metrics: AdminPortalMetric[];
  controls: AdminPortalControl[];
  records: AdminPortalRecord[];
  orderQueue?: AdminPortalOrderQueueItem[];
  aiReviewQueue?: AdminPortalAiReviewQueueItem[];
}

export interface AdminPortalOrderQueueItem {
  id: string;
  customer: string;
  projectId: string;
  provider: string;
  status: OrderStatus;
  source: string;
  quote: string;
  pickup: string;
  nextAction: string;
  evidence: string[];
}

export interface AdminPortalAiReviewQueueItem {
  id: string;
  storyId: string;
  textModel: string;
  imageModel: string;
  provider: string;
  queueStatus: "planned" | "queued" | "running" | "ready" | "blocked";
  humanReview: "pending" | "approved" | "rejected";
  nextAction: string;
  evidence: string[];
}

export interface AdminPortalNavigationItem {
  id: AdminPortalSectionId;
  label: string;
  count: number;
  status: AdminPortalStatus;
}

export interface AdminPortalSummary {
  sections: number;
  opsSignals: number;
  orderQueues: number;
  userQueues: number;
  assetQueues: number;
  providerQueues: number;
  aiReviewQueues: number;
  launchGates: number;
  liveMutationsEnabled: number;
  rawContentExposed: number;
}

export interface AdminPortalModel {
  summary: AdminPortalSummary;
  navigation: AdminPortalNavigationItem[];
  areas: Record<AdminPortalSectionId, AdminPortalArea>;
  blockers: string[];
}

export interface AdminPortalModelInput {
  model: AdminPanelModel;
  readiness: ReadinessSummary;
  providerGovernance: ProviderGovernanceSummary;
  providerOps: ProviderOpsModel;
  productionReadiness: ProductionReadinessSummary;
  runtimeReadiness: Map<string, RuntimeReadiness>;
  adminOperationsWorkflow: AdminOperationsWorkflow;
}

export interface AdminPortalRecordFilter {
  query?: string;
  status?: AdminPortalStatus | "all";
}

export function buildAdminPortalModel(input: AdminPortalModelInput): AdminPortalModel {
  const runtimeItems = Array.from(input.runtimeReadiness.values());
  const runtimeBlocked = runtimeItems.filter((item) => item.mode === "blocked").length;
  const runtimeReady = runtimeItems.filter((item) => item.mode === "local-result").length;
  const ops = buildOpsArea(input, runtimeBlocked, runtimeReady);
  const orders = buildOrdersArea(input);
  const users = buildUsersArea(input);
  const assets = buildAssetsArea(input);
  const providers = buildProvidersArea(input, runtimeBlocked, runtimeReady);
  const aiLoop = buildAiLoopArea(input, runtimeBlocked, runtimeReady);
  const launch = buildLaunchArea(input);
  const areas = { ops, orders, users, assets, providers, "ai-loop": aiLoop, launch };
  const records = Object.values(areas).flatMap((area) => area.records);
  const summary: AdminPortalSummary = {
    sections: Object.keys(areas).length,
    opsSignals: ops.records.length,
    orderQueues: orders.records.length,
    userQueues: users.records.length,
    assetQueues: assets.records.length,
    providerQueues: input.providerOps.summary.fallbackQueues,
    aiReviewQueues: aiLoop.aiReviewQueue?.length ?? 0,
    launchGates: launch.records.length,
    liveMutationsEnabled: records.filter((record) => record.liveMutationEnabled).length,
    rawContentExposed: records.filter((record) => record.rawContentExposed).length
  };
  const navigation: AdminPortalNavigationItem[] = Object.values(areas).map((area) => ({
    id: area.id,
    label: area.label,
    count: area.records.length,
    status: summarizeAreaStatus(area.records)
  }));
  const model: AdminPortalModel = {
    summary,
    navigation,
    areas,
    blockers: []
  };

  return {
    ...model,
    blockers: validateAdminPortalModel(model)
  };
}

export function filterAdminPortalRecords(records: AdminPortalRecord[], filter: AdminPortalRecordFilter = {}): AdminPortalRecord[] {
  const query = filter.query?.trim().toLowerCase() ?? "";
  const status = filter.status ?? "all";

  return records.filter((record) => {
    const statusMatch = status === "all" || record.status === status;
    const queryMatch =
      !query ||
      [
        record.label,
        record.domain,
        record.owner,
        record.source,
        record.detail,
        record.action,
        ...record.evidence
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    return statusMatch && queryMatch;
  });
}

export function validateAdminPortalModel(portal: AdminPortalModel): string[] {
  const issues: string[] = [];
  const requiredSections: AdminPortalSectionId[] = ["ops", "orders", "users", "assets", "providers", "ai-loop", "launch"];
  const records = Object.values(portal.areas).flatMap((area) => area.records);

  for (const section of requiredSections) {
    const area = portal.areas[section];
    if (!area) {
      issues.push(`Missing admin portal section: ${section}.`);
      continue;
    }
    if (area.records.length < 1) issues.push(`Admin portal section ${section} must include records.`);
    if (area.metrics.length < 1) issues.push(`Admin portal section ${section} must include metrics.`);
  }

  for (const record of records) {
    if (!record.action) issues.push(`Admin portal record ${record.id} must name an admin action.`);
    if (record.evidence.length < 1) issues.push(`Admin portal record ${record.id} must list required evidence.`);
    if (record.liveMutationEnabled) issues.push(`Admin portal record ${record.id} must not enable live mutations.`);
    if (record.rawContentExposed) issues.push(`Admin portal record ${record.id} must not expose raw customer content.`);
  }

  if (portal.summary.liveMutationsEnabled !== records.filter((record) => record.liveMutationEnabled).length) {
    issues.push("Admin portal live mutation summary is out of sync with records.");
  }
  if (portal.summary.rawContentExposed !== records.filter((record) => record.rawContentExposed).length) {
    issues.push("Admin portal raw content summary is out of sync with records.");
  }

  return issues;
}

function buildOpsArea(input: AdminPortalModelInput, runtimeBlocked: number, runtimeReady: number): AdminPortalArea {
  const { readiness, adminOperationsWorkflow } = input;

  return {
    id: "ops",
    label: "Ops",
    eyebrow: "Ops monitoring",
    summary: "Incident, alerting, runtime, fulfillment, and payment signals for the operator desk.",
    metrics: [
      { label: "Owner lanes", value: `${adminOperationsWorkflow.summary.ownerCount}` },
      { label: "P0 actions", value: `${adminOperationsWorkflow.summary.p0Tasks}` },
      { label: "Blocked", value: `${adminOperationsWorkflow.summary.blocked}` },
      { label: "Runtime blocked", value: `${runtimeBlocked}` },
      { label: "Runtime ready", value: `${runtimeReady}` },
      { label: "Live enabled", value: `${adminOperationsWorkflow.summary.liveEnabled}` }
    ],
    controls: [
      offControl("ops-live-ingestion", "Live telemetry ingestion", "Requires provider token, redaction proof, and alert-route drill."),
      offControl("ops-provider-calls", "Provider network calls", "Dry-run readiness only until credential and kill-switch gates pass."),
      offControl("ops-real-orders", "Retail order execution", "Manual handoff remains the only order path.")
    ],
    records: [
      record({
        id: "ops-alert-routing",
        label: "Alert route drill",
        domain: "Monitoring",
        owner: "Observability and audit",
        source: "Observability readiness",
        status: readiness.observability.summary.alertRoutesRequired > 0 ? "attention" : "ready",
        risk: "high",
        detail: `${readiness.observability.summary.alertRoutesRequired} alert routes require drill evidence.`,
        action: "Attach alert routing transcript and on-call escalation owner.",
        evidence: ["Alert routing drill", "Redaction proof", "On-call owner"]
      }),
      record({
        id: "ops-incident-review",
        label: "Incident review runbook",
        domain: "Operations",
        owner: "Observability and audit",
        source: "Admin operations workflow",
        status: adminOperationsWorkflow.tasks.some((task) => task.id === "incident-review-runbook") ? "attention" : "blocked",
        risk: "medium",
        detail: "Incident-review runbook is queued as an admin-owned readiness task.",
        action: "Attach incident review dry run and response checklist.",
        evidence: ["Incident review runbook", "Dry-run transcript"]
      }),
      record({
        id: "ops-hosted-api",
        label: "Hosted API health",
        domain: "API",
        owner: "Platform infrastructure",
        source: "Hosted API readiness",
        status: readiness.hostedApi.summary.publicRouteProofRequired > 0 ? "blocked" : "ready",
        risk: "high",
        detail: `${readiness.hostedApi.summary.routeContracts} route contracts exist; public DB-backed proof is still required.`,
        action: "Run hosted route probes with admin and customer Clerk JWTs.",
        evidence: ["Hosted API route probe", "Hosted database proof", "Clerk JWT verification"]
      }),
      record({
        id: "ops-payment-exceptions",
        label: "Payment exception monitor",
        domain: "Commerce",
        owner: "Commerce and fulfillment",
        source: "Payment readiness",
        status: readiness.payment.summary.liveChargesEnabled > 0 ? "blocked" : "attention",
        risk: "high",
        detail: `${readiness.payment.summary.paymentProviderContracts} payment provider contracts remain no-charge.`,
        action: "Attach refund, void, dispute, webhook, and reconciliation drills before live charges.",
        evidence: ["Refund/void drill", "Webhook signature proof", "Settlement reconciliation"]
      }),
      record({
        id: "ops-retail-fulfillment",
        label: "Retail fulfillment monitor",
        domain: "Fulfillment",
        owner: "Commerce and fulfillment",
        source: "Retail fulfillment readiness",
        status: readiness.retailFulfillment.summary.directOrderEnabled > 0 ? "blocked" : "attention",
        risk: "high",
        detail: `${readiness.retailFulfillment.summary.liveVendorAdapterContracts} retail adapter contracts use manual fallbacks.`,
        action: "Attach quote, pickup/cancel recovery, and physical print QA evidence.",
        evidence: ["Vendor certification", "Recovery drill", "Physical print QA"]
      })
    ]
  };
}

function buildOrdersArea(input: AdminPortalModelInput): AdminPortalArea {
  const { readiness } = input;
  const directOrdersEnabled = readiness.retailFulfillment.summary.directOrderEnabled;
  const paymentChargesEnabled = readiness.payment.summary.liveChargesEnabled;
  const orderQueue: AdminPortalOrderQueueItem[] = [
    {
      id: "order-demo-manual-handoff",
      customer: "Demo customer",
      projectId: "project-demo-anniversary-card",
      provider: "Walgreens",
      status: "vendor_handoff_blocked",
      source: "demo seed orders row",
      quote: "Review-only",
      pickup: "Not confirmed",
      nextAction: "Use hosted checkout or the customer-controlled print package; no live vendor order API call is made.",
      evidence: ["orders.status", "order_events.payload", "vendor_quotes.live_quote=false"]
    },
    {
      id: "manual-vendor-handoff-approved",
      customer: "Signed-in customer",
      projectId: "from /api/vendor-handoff/manual",
      provider: "Selected retail printer",
      status: "vendor_handoff_ready",
      source: "manual-vendor-handoff mutation",
      quote: "Not charged",
      pickup: "Customer confirms with vendor",
      nextAction: "Verify consent, render packet, and order_events before supporting customer checkout.",
      evidence: ["consent_records", "orders", "order_events"]
    },
    {
      id: "order-status-recovery-drill",
      customer: "Support queue",
      projectId: "service-kernel transition graph",
      provider: "Any printer",
      status: "wrong_store",
      source: "order recovery state machine",
      quote: "Re-quote required",
      pickup: "Re-check deadline",
      nextAction: "Re-quote the correct store, rerender if needed, and keep the audit trail attached.",
      evidence: ["transitionOrder", "recoveryActions", "auditTrail"]
    }
  ];

  return {
    id: "orders",
    label: "Orders",
    eyebrow: "Order status",
    summary: "Manual handoff order records, status transitions, recovery actions, and blocked live vendor sync.",
    metrics: [
      { label: "Order tables", value: "3" },
      { label: "Tracked rows", value: `${orderQueue.length}` },
      { label: "Statuses", value: "11" },
      { label: "Direct orders", value: `${directOrdersEnabled}` },
      { label: "Live charges", value: `${paymentChargesEnabled}` },
      { label: "Vendor sync", value: "0" },
      { label: "Queue writes", value: "manual" }
    ],
    controls: [
      offControl("orders-live-submit", "Submit live vendor orders", "Requires vendor certification, customer approval, payment, and kill-switch proof."),
      offControl("orders-vendor-status-sync", "Vendor status sync", "Requires certified webhook or polling integration plus recovery runbooks."),
      offControl("orders-refunds-cancels", "Refunds and cancellations", "Requires payment provider, vendor policy review, and audited support actions.")
    ],
    records: [
      record({
        id: "orders-manual-handoff",
        label: "Manual handoff orders",
        domain: "Orders",
        owner: "Commerce and fulfillment",
        source: "manual-vendor-handoff API",
        status: "attention",
        risk: "medium",
        detail: "Customer handoff mutations persist order, order event, consent, queue, and audit records when durable runtime is enabled.",
        action: "Expose the persisted order list to admins with customer-safe metadata, status, store, quote, pickup window, and recovery actions.",
        evidence: ["orders table", "order_events table", "manual-vendor-handoff mutation"]
      }),
      record({
        id: "orders-status-state-machine",
        label: "Order status state machine",
        domain: "Order lifecycle",
        owner: "Commerce and fulfillment",
        source: "service kernel",
        status: "ready",
        risk: "medium",
        detail: "Tracked states include draft, rendered, quoted, external-share approved, handoff blocked/ready, rejected, wrong-store, moved-up, cancelled, and fulfilled.",
        action: "Keep admin status labels mapped to the service-kernel transition graph before adding live vendor callbacks.",
        evidence: ["OrderStatus union", "transitionOrder", "migration status check"]
      }),
      record({
        id: "orders-vendor-confirmation",
        label: "Vendor confirmation status",
        domain: "Retail fulfillment",
        owner: "Provider integrations",
        source: "Retail fulfillment readiness",
        status: directOrdersEnabled > 0 ? "blocked" : "attention",
        risk: "high",
        detail: "No live quote, pickup, payment, cancellation, or vendor confirmation feed is enabled in the customer/admin runtime.",
        action: "Attach Walgreens/CVS/FedEx/Walmart certification, webhook or polling proof, and recovery drills before showing live vendor-confirmed statuses.",
        evidence: ["Vendor certification", "Status sync proof", "Recovery drill"]
      }),
      record({
        id: "orders-payment-boundary",
        label: "Payment and refund boundary",
        domain: "Payments",
        owner: "Commerce and fulfillment",
        source: "Payment readiness",
        status: paymentChargesEnabled > 0 ? "blocked" : "attention",
        risk: "high",
        detail: "Payment providers are contract-only; CustomCard does not charge, refund, or reconcile order payments yet.",
        action: "Add payment event mapping and refund/dispute runbooks before admins can operate paid orders.",
        evidence: ["Payment provider contract", "Refund drill", "Reconciliation report"]
      })
    ],
    orderQueue
  };
}

function buildUsersArea(input: AdminPortalModelInput): AdminPortalArea {
  const { readiness, model } = input;

  return {
    id: "users",
    label: "Users",
    eyebrow: "User management",
    summary: "Admin roles, customer sessions, support queues, consent, and data-request controls.",
    metrics: [
      { label: "Auth env vars", value: `${model.coverage.requiredEnv.filter((envVar) => /AUTH|CLERK|COGNITO|SESSION/.test(envVar)).length}` },
      { label: "Static-token proofs", value: `${readiness.reviewerDbSeed.summary.hostedTokenProbeProofs}` },
      { label: "Seed proofs", value: `${readiness.reviewerDbSeed.summary.hostedSeedProofs}` },
      { label: "Opt-in gates", value: `${readiness.businessEngagement.summary.optInRequired}` },
      { label: "Live sends", value: `${readiness.businessEngagement.summary.liveMessagesEnabled}` },
      { label: "Mutations live", value: "0" }
    ],
    controls: [
      offControl("user-impersonation", "Support impersonation", "Requires scoped audit trail and customer-visible support notice."),
      offControl("user-bulk-export", "Bulk customer export", "Requires admin approval, suppression review, and metadata-only export."),
      offControl("user-live-messaging", "Live lifecycle messaging", "Requires opt-in sample, campaign approval, and provider OAuth.")
    ],
    records: [
      record({
        id: "users-admin-roles",
        label: "Admin roles and sessions",
        domain: "Identity",
        owner: "Identity and access",
        source: "Hosted API readiness",
        status: readiness.hostedApi.summary.hostedTokenVerificationProofs > 0 ? "ready" : "attention",
        risk: "high",
        detail: "Admin routes require Clerk-admin role verification; hosted Clerk JWT proof is not attached yet.",
        action: "Attach Clerk admin JWT probe and role mapping for operator, support, auditor, and owner roles.",
        evidence: ["Hosted Clerk admin JWT probe", "Role mapping", "Session expiry policy"]
      }),
      record({
        id: "users-customer-accounts",
        label: "Customer account lookup",
        domain: "Accounts",
        owner: "Identity and access",
        source: "Reviewer DB seed readiness",
        status: readiness.reviewerDbSeed.summary.hostedTokenProbeProofs > 0 ? "ready" : "attention",
        risk: "medium",
        detail: "Customer account lookup remains a contract until hosted seed and token probes are attached.",
        action: "Wire account lookup to metadata-only customer profile rows with no raw invite or memory content.",
        evidence: ["Hosted seed execution", "Customer token probe", "Metadata-only profile row"]
      }),
      record({
        id: "users-support-review",
        label: "Support review queue",
        domain: "Support",
        owner: "Observability and audit",
        source: "Business engagement readiness",
        status: "attention",
        risk: "medium",
        detail: "Support actions need audit, escalation, and no-contact safeguards before live operation.",
        action: "Attach approval transcript, escalation owner, and customer-visible support reason codes.",
        evidence: ["Approval transcript", "Escalation owner", "Support audit log"]
      }),
      record({
        id: "users-consent-suppression",
        label: "Consent and suppression lists",
        domain: "Privacy",
        owner: "Provider integrations",
        source: "Business engagement readiness",
        status: readiness.businessEngagement.summary.optInRequired > 0 ? "attention" : "ready",
        risk: "high",
        detail: `${readiness.businessEngagement.summary.optInRequired} opt-in gates remain before live lifecycle messaging.`,
        action: "Attach suppression list review and marketing opt-in sample before any CRM writeback or send.",
        evidence: ["Suppression list review", "Marketing opt-in sample", "No-contact rejection sample"]
      }),
      record({
        id: "users-data-requests",
        label: "Data request desk",
        domain: "Privacy",
        owner: "Observability and audit",
        source: "API contract",
        status: "attention",
        risk: "high",
        detail: "The API contract has data-request mutations, but admin fulfillment evidence is not attached.",
        action: "Add admin review queue for export, delete, and memory-forget requests with idempotent handling.",
        evidence: ["Data request mutation proof", "Idempotency audit", "Tombstone reuse policy"]
      })
    ]
  };
}

function buildAssetsArea(input: AdminPortalModelInput): AdminPortalArea {
  const { readiness } = input;

  return {
    id: "assets",
    label: "Assets",
    eyebrow: "Asset management",
    summary: "Generated panels, print packages, cloud artifacts, seed fixtures, coupon evidence, and signed mobile assets.",
    metrics: [
      { label: "Cloud repo-ready", value: `${readiness.cloudArtifactProof.summary.repoLocalReady}` },
      { label: "Cloud applied req.", value: `${readiness.cloudArtifactProof.summary.appliedCloudRequired}` },
      { label: "Signed URLs", value: `${readiness.cloudArtifactProof.summary.signedUrlProbeProofs}` },
      { label: "Seed proof", value: `${readiness.reviewerDbSeed.summary.hostedSeedProofs}` },
      { label: "Mobile artifacts", value: `${readiness.mobileRender.summary.signedArtifacts}` },
      { label: "Live writes", value: "0" }
    ],
    controls: [
      offControl("asset-cloud-write", "Cloud artifact writes", "Requires applied bucket, IAM, signed URL, access log, and restore proof."),
      offControl("asset-public-sharing", "Public artifact sharing", "Requires external-share approval and expiring signed URLs."),
      offControl("asset-ai-rendering", "Live AI asset generation", "Requires provider allowlist, prompt audit, spend cap, and human review.")
    ],
    records: [
      record({
        id: "assets-card-panels",
        label: "Generated card panels",
        domain: "Render packets",
        owner: "Commerce and fulfillment",
        source: "Render/export contract",
        status: "ready",
        risk: "low",
        detail: "Browser SVG panels and local print package export are repo-local ready.",
        action: "Keep checksum manifest and panel validation attached to every render packet.",
        evidence: ["SVG panel validation", "Checksum manifest"]
      }),
      record({
        id: "assets-print-packages",
        label: "Print export packages",
        domain: "Print package",
        owner: "Commerce and fulfillment",
        source: "Print export contract",
        status: "ready",
        risk: "low",
        detail: "Local SVG/PDF package export supports manual vendor handoff.",
        action: "Keep manual handoff checklist paired with render artifact manifest.",
        evidence: ["Manual vendor checklist", "Print export manifest"]
      }),
      record({
        id: "assets-object-store",
        label: "Object-store artifacts",
        domain: "Cloud artifacts",
        owner: "Platform infrastructure",
        source: "Cloud artifact proof readiness",
        status: readiness.cloudArtifactProof.summary.appliedCloudRequired > 0 ? "blocked" : "ready",
        risk: "high",
        detail: "Terraform and contract files exist; applied bucket/IAM/signed URL proof is still required.",
        action: "Attach applied bucket ARN, IAM output, signed URL probe, access log, and restore-drill proof.",
        evidence: ["Applied bucket ARN", "IAM policy output", "Signed URL probe", "Restore drill"]
      }),
      record({
        id: "assets-reviewer-seeds",
        label: "Reviewer seed fixtures",
        domain: "Seed data",
        owner: "Platform infrastructure",
        source: "Reviewer DB seed readiness",
        status: readiness.reviewerDbSeed.summary.hostedSeedProofs > 0 ? "ready" : "attention",
        risk: "medium",
        detail: "Reviewer seed plans are modeled, but hosted migration and local static-token probe proof are not attached.",
        action: "Run hosted seed, rollback, and local static-token probes before exposing seeded admin/customer data.",
        evidence: ["Hosted seed execution", "Rollback proof", "Local static-token probe"]
      }),
      record({
        id: "assets-coupon-evidence",
        label: "Coupon portal evidence",
        domain: "Pricing proof",
        owner: "Commerce and fulfillment",
        source: "Retail coupon evidence intake",
        status: "attention",
        risk: "medium",
        detail: "Admin-only coupon proof can be accepted only as same-cart provider-portal evidence.",
        action: "Review accepted/rejected evidence artifacts before allowing best-price discounting.",
        evidence: ["Portal application packet", "Same-cart subtotal proof", "No-order evidence"]
      }),
      record({
        id: "assets-mobile-artifacts",
        label: "Signed mobile artifacts",
        domain: "Mobile builds",
        owner: "Platform infrastructure",
        source: "Mobile render readiness",
        status: readiness.mobileRender.summary.signedArtifacts > 0 ? "ready" : "blocked",
        risk: "high",
        detail: "Mobile screens and profiles are modeled; signed native artifact proof is missing.",
        action: "Attach emulator render proof and signed iOS/Android artifacts before mobile release claims.",
        evidence: ["Emulator render proof", "Signed native artifact"]
      })
    ]
  };
}

function buildProvidersArea(input: AdminPortalModelInput, runtimeBlocked: number, runtimeReady: number): AdminPortalArea {
  const { providerOps } = input;
  const providerMetricSourceLabels = Array.from(
    new Set(providerOps.selectedProviders.map((provider) => provider.metricSource.label))
  ).slice(0, 4);

  return {
    id: "providers",
    label: "Providers",
    eyebrow: "Provider operations",
    summary: "Credential-ready providers, admin live gates, fallback queues, limits, ORR latency, and user-management gates.",
    metrics: [
      { label: "Available", value: `${providerOps.summary.availableProviders}` },
      { label: "Credentials ready", value: `${providerOps.summary.envConfiguredProviders}` },
      { label: "Live ready", value: `${providerOps.summary.liveReadyProviders}` },
      { label: "Admin gated", value: `${providerOps.summary.liveGatedProviders}` },
      { label: "Fallback queues", value: `${providerOps.summary.fallbackQueues}` },
      { label: "Cost flows", value: `${providerOps.usage.configuredFlows}` },
      { label: "Budget month", value: formatCents(providerOps.usage.monthlyBudgetCents) },
      { label: "Spend est.", value: formatCents(providerOps.usage.reservedOrSpentCents) },
      { label: "Req capacity", value: `${providerOps.usage.estimatedMonthlyRequestsAtBudget}` },
      { label: "Provider sources", value: `${providerOps.usage.providerSourcedMetricAdapters}` },
      { label: "Ledger-only", value: `${providerOps.usage.localLedgerMetricAdapters}` },
      { label: "Latency gates", value: `${providerOps.orr.latencyGateRequired}` },
      { label: "Runtime blocked", value: `${runtimeBlocked}` },
      { label: "Runtime ready", value: `${runtimeReady}` },
      { label: "User credentials", value: `${providerOps.users.userManagementRequiredEnv.length}` }
    ],
    controls: [
      offControl("provider-live-calls", "Live provider calls", "Requires credentials, network allowlist, spend cap, and fallback coverage."),
      offControl("provider-paid-ai", "Paid AI requests", "Requires model allowlist, request budget, queue, and human review."),
      offControl("provider-direct-orders", "Direct vendor orders", "Requires retail certification and kill-switch proof.")
    ],
    records: [
      ...providerOps.selectedProviders.slice(0, 8).map(providerOpsRecord),
      record({
        id: "provider-user-management",
        label: "User management gates",
        domain: "Identity and support",
        owner: "Identity and access",
        source: "Provider Ops",
        status: providerOps.users.liveMessagesEnabled > 0 || providerOps.users.crmWritesEnabled > 0 ? "blocked" : "attention",
        risk: "high",
        detail: `${providerOps.users.adminTokenProofs} admin Clerk proof placeholders, ${providerOps.users.customerTokenProofs} customer Clerk proof placeholders, ${providerOps.users.optInGates} opt-in gates.`,
        action: "Keep admin/customer support queues metadata-only until hosted Clerk token, seed, opt-in, and audit evidence are attached.",
        evidence: providerOps.users.userManagementRequiredEnv.slice(0, 4)
      }),
      record({
        id: "provider-usage-costs",
        label: "Usage cost ledger",
        domain: "Provider spend",
        owner: "Provider integrations",
        source: "Provider Ops",
        status: providerOps.usage.overBudgetBlocks > 0 || providerOps.usage.rateLimitBlocks > 0
          ? "blocked"
          : providerOps.usage.configuredFlows > 0
            ? "attention"
            : "ready",
        risk: providerOps.usage.liveEnabledConfiguredFlows > 0 ? "high" : "medium",
        detail: `${formatCents(providerOps.usage.monthlyBudgetCents)} configured monthly budget across ${providerOps.usage.configuredFlows} admin-configured flow policies; ${formatCents(providerOps.usage.reservedOrSpentCents)} reserved/spent in ${providerOps.usage.monthBucket}; ${providerOps.usage.providerSourcedMetricAdapters} provider-sourced metric adapters and ${providerOps.usage.localLedgerMetricAdapters} ledger-only adapters.`,
        action: "Review provider_call_events, provider usage dashboards/APIs, monthly budget caps, per-request ceilings, and rate windows before enabling paid provider traffic.",
        evidence: ["provider_call_events", ...providerMetricSourceLabels, "monthlyBudgetCents", "perRequestBudgetCents"].slice(0, 6)
      }),
      record({
        id: "provider-orr-latency",
        label: "ORR latency and alert gates",
        domain: "Operations readiness",
        owner: "Observability and audit",
        source: "Provider Ops",
        status: providerOps.orr.productionAlertsEnabled > 0 || providerOps.orr.liveIngestionEnabled > 0 ? "blocked" : "attention",
        risk: "medium",
        detail: `${providerOps.orr.latencyGateRequired} provider latency gates, ${providerOps.orr.alertRoutesRequired} alert routes, ${providerOps.orr.maxRetentionDays} day max retention.`,
        action: "Attach latency budget, alert route, sampling, retention, and incident review evidence before live provider operations.",
        evidence: ["Latency budget evidence", "Alert routing drill", "Retention policy proof"]
      })
    ]
  };
}

function providerOpsRecord(provider: ProviderOpsProvider): AdminPortalRecord {
  const status: AdminPortalStatus =
    provider.liveGate === "blocked" || provider.liveGate === "contract-only" ? "blocked" : provider.liveGate === "live-ready" ? "ready" : "attention";
  const evidence = provider.missingEnv.length > 0
    ? provider.missingEnv.slice(0, 3)
    : provider.blockedReasons.length > 0
      ? provider.blockedReasons.slice(0, 3)
      : [`Fallback: ${provider.fallbackAdapterId}`];

  return record({
    id: `provider-ops-${provider.adapterId}`,
    label: provider.label,
    domain: provider.capabilityLabel,
    owner: "Provider integrations",
    source: "Provider Ops",
    status,
    risk: provider.liveGate === "live-ready" || provider.liveGate === "local-ready" ? "low" : "medium",
    detail: `${provider.availability}; ${provider.liveGate}; fallback ${provider.fallbackAdapterId}; ${provider.rateLimitPerMinute}/min; ${formatCents(provider.monthlyBudgetCents)} monthly cap; ${formatCents(provider.perRequestBudgetCents)} request cap; metrics from ${provider.metricSource.label} (${provider.metricSource.usageUnit}).`,
    action: provider.liveGate === "live-ready"
      ? "Keep spend, queue, and ORR evidence attached while live use is enabled."
      : "Attach missing credentials, admin gates, fallback queue, and ORR evidence before live use.",
    evidence: [...evidence, provider.metricSource.label].slice(0, 4)
  });
}

function buildAiLoopArea(input: AdminPortalModelInput, runtimeBlocked: number, runtimeReady: number): AdminPortalArea {
  const localTextRuntime = input.runtimeReadiness.get("local-openai-compatible-chat");
  const localImageRuntime = input.runtimeReadiness.get("local-comfyui-api-image");
  const localTextReady = localTextRuntime?.mode === "local-result";
  const localImageReady = localImageRuntime?.mode === "local-result";
  const aiReviewQueue: AdminPortalAiReviewQueueItem[] = [
    {
      id: "local-ai-queue-botanical-birthday",
      storyId: "botanical-birthday",
      textModel: "Qwen3 local chat via LM Studio or KoboldCPP",
      imageModel: "DreamShaper, SDXL, or FLUX checkpoint via ComfyUI",
      provider: "local-openai-compatible-chat + local-comfyui-api-image",
      queueStatus: "planned",
      humanReview: "pending",
      nextAction: "Use POST /api/admin/local-ai-loop/run with mode=queue-and-run, or npm run card:queue:local for CLI fallback.",
      evidence: ["admin-local-ai-loop-run", "api_jobs.payload.localLoop", "audit_log.local_ai_loop.job_queued"]
    },
    {
      id: "local-ai-benchmark-aggregate",
      storyId: "all local benchmark stories",
      textModel: "tracked per run",
      imageModel: "tracked per run",
      provider: "local benchmark aggregate",
      queueStatus: "ready",
      humanReview: "pending",
      nextAction: "npm run card:benchmark:aggregate",
      evidence: ["model ranking score", "inputs", "code version", "provider adapter ids"]
    },
    {
      id: "local-ai-model-coverage",
      storyId: "local model inventory",
      textModel: "D:/models GGUF inventory",
      imageModel: "ComfyUI model folders",
      provider: "local model coverage",
      queueStatus: "ready",
      humanReview: "pending",
      nextAction: "npm run card:benchmark:model-coverage",
      evidence: ["local-model-coverage.json", "missing models list", "download placement plan"]
    }
  ];

  return {
    id: "ai-loop",
    label: "AI Loop",
    eyebrow: "Local model loop",
    summary: "Queue-backed local LLM and ComfyUI generation with admin review before benchmark promotion or model distillation.",
    metrics: [
      { label: "Queue backend", value: "api_jobs" },
      { label: "Review rows", value: `${aiReviewQueue.length}` },
      { label: "Text local", value: localTextReady ? "ready" : "configured by script" },
      { label: "Image local", value: localImageReady ? "ready" : "configured by worker" },
      { label: "Runtime ready", value: `${runtimeReady}` },
      { label: "Runtime blocked", value: `${runtimeBlocked}` },
      { label: "Aggregate", value: "rankings" },
      { label: "Network AI", value: "0" }
    ],
    controls: [
      offControl("ai-loop-local-queue-write", "Queue local AI jobs", "Admin uses the local AI loop route after reviewing planned payloads."),
      offControl("ai-loop-worker-run", "Run local Comfy worker", "Worker execution remains a local machine process behind explicit admin approval."),
      offControl("ai-loop-promote-model", "Promote benchmark champion", "Requires admin grade, aggregate score, artifact proof, and rollback path.")
    ],
    records: [
      record({
        id: "ai-loop-human-review-queue",
        label: "Local AI human review queue",
        domain: "AI job queue",
        owner: "Admin reviewer",
        source: "/api/admin/local-ai-loop/run",
        status: "attention",
        risk: "medium",
        detail: "Benchmark stories can be converted into sanitized ai-card-generate api_jobs with local provider metadata and pending admin review.",
        action: "Run plan mode first, then queue or queue-and-run from the admin route and inspect rendered panels before promoting a model.",
        evidence: ["admin-local-ai-loop-run", "planned-jobs.json", "api_jobs", "audit_log"]
      }),
      record({
        id: "ai-loop-local-comfy-worker",
        label: "Production local Comfy worker",
        domain: "Image generation",
        owner: "Provider integrations",
        source: "scripts/local-comfy-worker.mjs",
        status: localImageReady ? "ready" : "attention",
        risk: "medium",
        detail: "The local worker scopes route execution to ai-card-generate and forces local-comfyui-api-image for generated card panels.",
        action: "Keep ComfyUI running locally, verify checkpoint/workflow metadata, and process only admin-approved queued jobs.",
        evidence: ["worker:comfy", "local-comfyui-api-image", "CUSTOMCARD_COMFYUI_URL"]
      }),
      record({
        id: "ai-loop-local-llm-provider",
        label: "Local LLM provider",
        domain: "Text generation",
        owner: "Provider integrations",
        source: "local-openai-compatible-chat",
        status: localTextReady ? "ready" : "attention",
        risk: "medium",
        detail: "LM Studio or KoboldCPP can provide the OpenAI-compatible chat endpoint used for copy, prompts, and benchmark improvement turns.",
        action: "Point CUSTOMCARD_LOCAL_LLM_BASE_URL, LMSTUDIO_BASE_URL, or KOBOLDCPP_BASE_URL at localhost before queue writes.",
        evidence: ["D:/models", "local-openai-compatible-chat", "Admin model profile"]
      }),
      record({
        id: "ai-loop-benchmark-rankings",
        label: "Benchmark aggregate and rankings",
        domain: "Model evaluation",
        owner: "Admin reviewer",
        source: "scripts/model-benchmark-aggregate.mjs",
        status: "attention",
        risk: "medium",
        detail: "Aggregate ranking tracks story inputs, model IDs, provider adapters, code version, generated artifacts, score, and quality notes.",
        action: "Review aggregate rankings and failure notes before selecting a candidate for production default or distillation data.",
        evidence: ["card:benchmark:aggregate", "card:benchmark:model-coverage", "generated-card-comparisons"]
      }),
      record({
        id: "ai-loop-distillation-design",
        label: "Custom distilled model design",
        domain: "Model improvement",
        owner: "Provider integrations",
        source: "docs/evidence/local-model-improvement-design.md",
        status: "attention",
        risk: "high",
        detail: "Distilled image models should be trained from approved prompt/artifact pairs and evaluated against the same aggregate before use.",
        action: "Keep distillation as a design-and-dataset stage until consent, licensing, eval, and rollback evidence are attached.",
        evidence: ["approved artifacts", "training dataset manifest", "holdout benchmark"]
      })
    ],
    aiReviewQueue
  };
}

function buildLaunchArea(input: AdminPortalModelInput): AdminPortalArea {
  const { productionReadiness, adminOperationsWorkflow } = input;
  const ownerLabels = new Map(adminOperationsWorkflow.ownerLanes.map((lane) => [lane.id, lane.label]));

  return {
    id: "launch",
    label: "Launch",
    eyebrow: "Launch gates",
    summary: "Production evidence, external audits, E2E coverage, capacity, and release blockers.",
    metrics: [
      { label: "Tracked", value: `${productionReadiness.total}` },
      { label: "Evidence missing", value: `${productionReadiness.evidenceMissing}` },
      { label: "Blocked", value: `${productionReadiness.blocked}` },
      { label: "Live enabled", value: `${productionReadiness.liveEnabled}` },
      { label: "Priority actions", value: `${adminOperationsWorkflow.priorityTasks.length}` }
    ],
    controls: [
      offControl("launch-production", "Production launch switch", "Requires all evidence gates, external audits, hosted proof, and rollback evidence."),
      offControl("launch-public-claims", "Public production claims", "Requires external audit artifacts and signed release evidence."),
      offControl("launch-real-commerce", "Real commerce", "Requires payment, fulfillment, refund, dispute, and certification proof.")
    ],
    records: adminOperationsWorkflow.priorityTasks.map((task) =>
      record({
        id: `launch-${task.id}`,
        label: task.label,
        domain: task.source,
        owner: ownerLabels.get(task.ownerId) ?? task.ownerId,
        source: "Admin operations workflow",
        status: task.status === "repo-local-ready" ? "ready" : task.status === "evidence-required" ? "attention" : "blocked",
        risk: task.priority === "p0" ? "high" : task.priority === "p1" ? "medium" : "low",
        detail: task.blocker,
        action: task.adminAction,
        evidence: task.requiredEvidence.slice(0, 3)
      })
    )
  };
}

function summarizeAreaStatus(records: AdminPortalRecord[]): AdminPortalStatus {
  if (records.some((record) => record.status === "blocked")) return "blocked";
  if (records.some((record) => record.status === "attention")) return "attention";
  return "ready";
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function offControl(id: string, label: string, detail: string): AdminPortalControl {
  return { id, label, detail, enabled: false };
}

function record(input: Omit<AdminPortalRecord, "liveMutationEnabled" | "rawContentExposed">): AdminPortalRecord {
  return {
    ...input,
    liveMutationEnabled: false,
    rawContentExposed: false
  };
}
