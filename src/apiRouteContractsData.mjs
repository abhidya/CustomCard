export const retailPrinterOperationStartRoute = "/api/retail-printers/operations/start";
export const retailPrinterCouponPortalEvidenceRoute = "/api/retail-printers/coupon-portal-evidence";

export const apiRouteContracts = [
  {
    id: "health",
    method: "GET",
    path: "/api/health",
    audience: "public",
    auth: "none",
    runtimeMode: "local-contract",
    requestSchema: [],
    responseSchema: ["service", "status", "realOrdersEnabled"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "No customer data returned.",
    backedBy: ["runtime doctor", "kill switch"]
  },
  {
    id: "route-catalog",
    method: "GET",
    path: "/api/routes",
    audience: "public",
    auth: "none",
    runtimeMode: "local-contract",
    requestSchema: [],
    responseSchema: ["routes"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Public route metadata only; no customer data returned.",
    backedBy: ["apiRouteContracts"]
  },
  {
    id: "customer-bootstrap",
    method: "GET",
    path: "/api/customer/bootstrap",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: ["session"],
    responseSchema: [
      "primaryActions",
      "readyFallbacks",
      "chatTranscript",
      "customerChat",
      "printerPricing",
      "fulfillmentRecommendations",
      "retailOperations",
      "localization"
    ],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Approved memories only; public printer pricing observations contain no customer data.",
    backedBy: ["buildCustomerPanelModel", "buildCustomerChatSession", "buildPrinterPricingComparison"]
  },
  {
    id: "customer-draft-state",
    method: "GET",
    path: "/api/customer/draft-state/current",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: ["session"],
    responseSchema: ["draftState", "updatedAtIso", "repository"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Returns only the signed-in customer's latest in-progress draft state; no browser-local draft data is required.",
    backedBy: ["draft_states", "customer-session auth"]
  },
  {
    id: "customer-draft-state-save",
    method: "POST",
    path: "/api/customer/draft-state",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: [
      "X-Idempotency-Key",
      "draftInput",
      "status",
      "opportunityId",
      "localeCode",
      "vendorId"
    ],
    responseSchema: ["draftStateId", "updatedAtIso", "repository"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy:
      "Stores signed-in customer draft fields and edit progress in draft_states; raw imported provider content stays out of the payload.",
    backedBy: ["draft_states", "customer-session auth", "idempotency_keys", "audit_log"]
  },
  {
    id: "customer-connections",
    method: "GET",
    path: "/api/customer/connections",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: ["session"],
    responseSchema: ["connections", "opportunities", "repository"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy:
      "Returns only the signed-in customer's provider connection status and metadata-only imported moments; no OAuth tokens or raw provider content are returned.",
    backedBy: ["provider_connections", "imported_events", "card_opportunities", "customer-session auth"]
  },
  {
    id: "mobile-bootstrap",
    method: "GET",
    path: "/api/mobile/bootstrap",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: ["session", "platform"],
    responseSchema: [
      "sections",
      "accountOptions",
      "importActions",
      "todaySummary",
      "queueItems",
      "approvalActions",
      "chatTranscript",
      "memoryReviewItems",
      "renderChoices",
      "pricingPreviews",
      "fulfillmentRecommendations",
      "printProofChecks",
      "handoffSteps",
      "syncState",
      "safetyBanner",
      "localeOptions",
      "localization"
    ],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Static customer experience state; no raw provider content.",
    backedBy: ["mobileExperience", "validateMobileExperience"]
  },
  {
    id: "ai-chat-respond",
    method: "POST",
    path: "/api/ai/chat/respond",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "queue-backed",
    requestSchema: [
      "X-Idempotency-Key",
      "customer_message",
      "recipient_name",
      "approved_memory_notes",
      "locale"
    ],
    responseSchema: [
      "job_id",
      "queue_status",
      "job_status_url",
      "retry_after_seconds",
      "result_available",
      "ai_queue",
      "assistant_message",
      "ai_flow",
      "ai_cost_gate",
      "ai_cost_ledger",
      "provider_call_events",
      "fallback_queued"
    ],
    idempotencyKeyRequired: true,
    externalNetworkCalls: true,
    realOrdersEnabled: false,
    piiPolicy:
      "Customer-session-protected chat text is minimized into api_jobs for worker execution; client aiFlowConfig and credentials are never accepted, and only the server-selected AI provider may run when live gates pass.",
    backedBy: ["api_jobs", "server-side aiFlowConfig", "server-side live AI gate", "ai-card-generator service"]
  },
  {
    id: "ai-card-generate",
    method: "POST",
    path: "/api/ai/card/generate",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "queue-backed",
    requestSchema: [
      "X-Idempotency-Key",
      "sender",
      "recipient",
      "relationship",
      "occasion",
      "tone",
      "style",
      "language",
      "personal_note",
      "memory_notes"
    ],
    responseSchema: [
      "job_id",
      "queue_status",
      "job_status_url",
      "retry_after_seconds",
      "result_available",
      "ai_queue",
      "draft_id",
      "card_copy",
      "images",
      "generated_image_persistence",
      "generated_by",
      "ai_flow",
      "ai_cost_gate",
      "ai_cost_ledger",
      "provider_call_events",
      "fallback_queued"
    ],
    idempotencyKeyRequired: true,
    externalNetworkCalls: true,
    realOrdersEnabled: false,
    piiPolicy:
      "Customer-session-protected card fields and approved memories are redacted and minimized into api_jobs for worker execution; client aiFlowConfig and credentials are never accepted, and inline generated images must not be stored in job results.",
    backedBy: ["api_jobs", "server-side aiFlowConfig", "server-side live AI gate", "ai-card-generator service", "app-rendered typography overlays"]
  },
  {
    id: "ai-job-status",
    method: "GET",
    path: "/api/ai/jobs/status",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: ["session", "job_id"],
    responseSchema: [
      "job_id",
      "route_id",
      "queue_status",
      "result_available",
      "attempt_count",
      "max_attempts",
      "retry_after_seconds",
      "result"
    ],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy:
      "Returns only the signed-in customer's api_jobs status and completed AI result; queued jobs are scoped by user_id and never expose credentials.",
    backedBy: ["api_jobs", "customer-session auth"]
  },
  {
    id: "provider-job-lease",
    method: "POST",
    path: "/api/provider/jobs/lease",
    audience: "provider",
    auth: "provider-token",
    runtimeMode: "durable-api",
    requestSchema: ["Authorization: Bearer provider token", "worker_id", "routes", "limit"],
    responseSchema: [
      "jobs",
      "lease_token",
      "lease_expires_at",
      "route_id",
      "payload",
      "artifact_upload"
    ],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy:
      "Provider-token-protected workers can lease minimized queue payloads for explicitly allowed route ids; customer session tokens, provider credentials, and raw database credentials are never exposed.",
    backedBy: ["api_jobs", "provider-token auth", "postgres lease lock"]
  },
  {
    id: "provider-job-status",
    method: "GET",
    path: "/api/provider/jobs/status",
    audience: "provider",
    auth: "provider-token",
    runtimeMode: "durable-api",
    requestSchema: ["Authorization: Bearer provider token", "routes"],
    responseSchema: [
      "route_scope",
      "lease_ttl_seconds",
      "queued_total",
      "running_total",
      "stale_running_total",
      "succeeded_total",
      "dead_lettered_total",
      "oldest_queued_age_seconds",
      "queue.items",
      "artifact_upload"
    ],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy:
      "Provider-token-protected workers can read aggregate queue health and compact sanitized queue rows only for explicitly allowed route ids; customer session tokens, provider credentials, database credentials, object-store credentials, and inline image bytes are never returned.",
    backedBy: ["api_jobs", "provider-token auth", "postgres aggregate status", "sanitized queue diagnostics"]
  },
  {
    id: "provider-job-heartbeat",
    method: "POST",
    path: "/api/provider/jobs/:id/heartbeat",
    audience: "provider",
    auth: "provider-token",
    runtimeMode: "durable-api",
    requestSchema: ["Authorization: Bearer provider token", "worker_id", "lease_token"],
    responseSchema: [
      "job_id",
      "route_id",
      "lease_token",
      "lease_expires_at",
      "lease_ttl_seconds",
      "heartbeat_at"
    ],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy:
      "Provider-token-protected workers renew only their currently leased jobs by signed lease token; no customer payload, credentials, or inline image bytes are returned.",
    backedBy: ["api_jobs", "provider-token auth", "postgres lease lock"]
  },
  {
    id: "admin-provider-job-status",
    method: "GET",
    path: "/api/admin/provider/jobs/status",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["Authorization: Bearer admin session", "routes"],
    responseSchema: [
      "route_scope",
      "lease_ttl_seconds",
      "queued_total",
      "running_total",
      "stale_running_total",
      "succeeded_total",
      "dead_lettered_total",
      "oldest_queued_age_seconds",
      "last_succeeded_at",
      "last_dead_lettered_at",
      "queue.items",
      "artifact_upload"
    ],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy:
      "Admin-session-protected operators can read aggregate provider queue health and compact sanitized queue rows for safe queue-backed route ids; provider credentials, database credentials, object-store credentials, worker bearer tokens, and inline image bytes are never returned.",
    backedBy: ["api_jobs", "admin-session auth", "postgres aggregate status", "sanitized queue diagnostics"]
  },
  {
    id: "provider-job-complete",
    method: "POST",
    path: "/api/provider/jobs/:id/complete",
    audience: "provider",
    auth: "provider-token",
    runtimeMode: "durable-api",
    requestSchema: ["Authorization: Bearer provider token", "worker_id", "lease_token", "status", "result", "error"],
    responseSchema: [
      "job_id",
      "route_id",
      "queue_status",
      "result_available",
      "retry_after_seconds",
      "artifact_persistence"
    ],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy:
      "Provider-token-protected workers can complete only currently leased jobs by signed lease token; prod persists generated artifacts to object storage and exposes only signed artifact references to customers.",
    backedBy: ["api_jobs", "provider-token auth", "object-store artifact persistence", "audit_log"]
  },
  {
    id: "admin-readiness",
    method: "GET",
    path: "/api/admin/readiness",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["adminSession"],
    responseSchema: [
      "coverage",
      "governance",
      "localization",
      "production",
      "externalAudit",
      "e2eCoverage",
      "aiProviderReadiness",
      "aiQueueOperations",
      "capacity",
      "observability",
      "retailFulfillment",
      "paymentReadiness",
      "mobileRenderReadiness",
      "hostedApiReadiness",
      "cloudArtifactProofReadiness",
      "runtime",
      "blockedProviders",
      "requiredEnv"
    ],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Operational metadata only; no customer content.",
    backedBy: ["buildAdminPanelModel", "buildProviderAdapterRuntime"]
  },
  {
    id: "admin-provider-catalog",
    method: "GET",
    path: "/api/admin/provider-catalog",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["adminSession"],
    responseSchema: ["adapters", "coverage"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Adapter metadata only.",
    backedBy: ["providerCatalog", "summarizeProviderCoverage"]
  },
  {
    id: "admin-provider-governance",
    method: "GET",
    path: "/api/admin/provider-governance",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["adminSession"],
    responseSchema: ["policies", "budgetCapped", "rateLimited", "fallbackCovered", "blockers"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Adapter governance metadata only; no customer content.",
    backedBy: ["summarizeProviderGovernance", "validateProviderGovernance"]
  },
  {
    id: "admin-ai-flow-configs",
    method: "GET",
    path: "/api/admin/ai-flow-configs",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["adminSession"],
    responseSchema: [
      "configs",
      "summary",
      "providerReadiness",
      "aiFlowDefaultsVersion",
      "version",
      "updatedAtIso",
      "updatedBy",
      "blockers"
    ],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Admin-owned AI provider policy only; no customer content or provider credentials.",
    backedBy: ["admin_runtime_configs", "server-side aiFlowConfig", "redacted provider readiness"]
  },
  {
    id: "admin-ai-flow-configs-save",
    method: "POST",
    path: "/api/admin/ai-flow-configs",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: [
      "X-Idempotency-Key",
      "configs",
      "primaryAdapterId",
      "fallbackAdapterId",
      "model",
      "budget",
      "promptInstructions"
    ],
    responseSchema: [
      "configs",
      "summary",
      "providerReadiness",
      "aiFlowDefaultsVersion",
      "version",
      "updatedAtIso",
      "updatedBy",
      "idempotencyPersisted",
      "repositoryPersisted"
    ],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Admin-owned AI provider policy only; no customer content or provider credentials.",
    backedBy: ["admin_runtime_configs", "admin-session auth", "idempotency key", "audit_log"]
  },
  {
    id: "admin-worker-config",
    method: "GET",
    path: "/api/admin/worker-config",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["adminSession"],
    responseSchema: [
      "worker",
      "providerWorker",
      "version",
      "updatedAtIso",
      "updatedBy",
      "blockers"
    ],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Admin-owned queue worker policy only; no customer content or provider credentials.",
    backedBy: ["admin_runtime_configs", "server-side worker config"]
  },
  {
    id: "admin-worker-config-save",
    method: "POST",
    path: "/api/admin/worker-config",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: [
      "X-Idempotency-Key",
      "worker",
      "providerWorker",
      "batchSize",
      "leaseSeconds",
      "retryBackoffSeconds",
      "pollIntervalMs",
      "routeIds"
    ],
    responseSchema: [
      "worker",
      "providerWorker",
      "version",
      "updatedAtIso",
      "updatedBy",
      "idempotencyPersisted",
      "repositoryPersisted"
    ],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Admin-owned queue worker policy only; no customer content or provider credentials.",
    backedBy: ["admin_runtime_configs", "admin-session auth", "idempotency key", "audit_log"]
  },
  {
    id: "admin-safety-controls",
    method: "GET",
    path: "/api/admin/safety-controls",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["adminSession"],
    responseSchema: [
      "realOrdersEnabled",
      "vendorModes",
      "vendorCertification",
      "productionMutationAcknowledged",
      "liveWriteAcknowledged",
      "blockers"
    ],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Admin-only safety gate state; no customer content or provider credentials.",
    backedBy: ["admin_runtime_configs", "admin-session auth", "fail-closed gate defaults"]
  },
  {
    id: "admin-safety-controls-save",
    method: "POST",
    path: "/api/admin/safety-controls",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: [
      "X-Idempotency-Key",
      "realOrdersEnabled",
      "vendorModes",
      "vendorCertification",
      "productionMutationAcknowledged",
      "liveWriteAcknowledged"
    ],
    responseSchema: [
      "realOrdersEnabled",
      "vendorModes",
      "vendorCertification",
      "productionMutationAcknowledged",
      "liveWriteAcknowledged",
      "updatedAtIso",
      "updatedBy",
      "blockers"
    ],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Admin-only safety gate state; no customer content or provider credentials.",
    backedBy: ["admin_runtime_configs", "admin-session auth", "idempotency key", "fail-closed gate defaults", "audit_log"]
  },
  {
    id: "admin-persistence-readiness",
    method: "GET",
    path: "/api/admin/persistence-readiness",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["adminSession"],
    responseSchema: ["tables", "auth", "idempotency", "localBrowserState", "blockers"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Persistence metadata only; no customer content.",
    backedBy: ["persistence contracts", "migration doctor"]
  },
  {
    id: "admin-artifact-bucket",
    method: "GET",
    path: "/api/admin/artifacts/bucket",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["adminSession", "prefix", "limit", "cursor", "sort", "order"],
    responseSchema: ["objectStore", "prefix", "limit", "sort", "order", "objectCount", "truncated", "nextCursor", "objects", "renderPackets", "blockers"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Object-store metadata only; no raw card text or object-store credentials are returned.",
    backedBy: ["object-store runtime", "signed artifact read contract"]
  },
  {
    id: "admin-model-benchmarks",
    method: "GET",
    path: "/api/admin/model-benchmarks",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["adminSession"],
    responseSchema: ["phases", "stories", "textCandidates", "imageCandidates", "recentRuns", "liveRunsAllowed", "evidenceRoot", "executableAdapters"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Benchmark metadata and redacted evidence paths only; no provider credentials or raw customer content.",
    backedBy: ["scripts/model-benchmark-loop.mjs", "docs/evidence/generated-card-comparisons"]
  },
  {
    id: "admin-model-benchmark-run",
    method: "POST",
    path: "/api/admin/model-benchmarks/run",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["X-Idempotency-Key", "phase", "story", "text", "image", "live"],
    responseSchema: ["dryRun", "outputDir", "phase", "phaseDir", "plannedRuns", "runs", "summaryPath", "providerHttpPath"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: true,
    realOrdersEnabled: false,
    piiPolicy:
      "Admin-only benchmark execution writes redacted evidence under docs/evidence; live provider calls require an explicit admin request checkbox and never expose provider credentials.",
    backedBy: ["scripts/model-benchmark-loop.mjs", "admin-session auth", "idempotency key", "admin live-run checkbox"]
  },
  {
    id: "admin-model-benchmark-grade",
    method: "POST",
    path: "/api/admin/model-benchmarks/grade",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: [
      "X-Idempotency-Key",
      "runDir",
      "productQualityScore",
      "promptPipelineContractScore",
      "routeReliability",
      "decision",
      "visibleBlockers",
      "notes"
    ],
    responseSchema: ["grade", "manualGradePath", "manualGradeJsonPath"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy:
      "Admin-entered manual grade only; persisted to benchmark evidence files with no provider credentials or customer account data.",
    backedBy: ["manual-grade.md", "manual-grade.json", "admin-session auth", "idempotency key"]
  },
  {
    id: "admin-local-ai-loop-run",
    method: "POST",
    path: "/api/admin/local-ai-loop/run",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: [
      "X-Idempotency-Key",
      "mode",
      "stories",
      "ensureUser",
      "outputDir"
    ],
    responseSchema: [
      "mode",
      "dryRun",
      "localOnly",
      "jobs",
      "queueResult",
      "workerResult",
      "report",
      "humanReview"
    ],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy:
      "Admin-only local AI loop queues sanitized benchmark story fields into api_jobs; model calls are restricted to localhost LM Studio/KoboldCPP and local ComfyUI, and admin review is required before promotion.",
    backedBy: ["scripts/local-ai-job-queue.mjs", "api_jobs", "audit_log", "local-openai-compatible-chat", "local-comfyui-api-image"]
  },
  {
    id: "admin-demo-reset",
    method: "POST",
    path: "/api/admin/demo-reset",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["X-Idempotency-Key", "resetKey", "confirmDemoOnly"],
    responseSchema: ["seedSummary", "tables", "rows", "signedArtifactUrls", "realOrdersEnabled"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Demo fixture reset only; no raw provider content or production credentials.",
    backedBy: ["buildDemoSeedPlan", "scripts/demo-reset.mjs"]
  },
  {
    id: "import-preview",
    method: "POST",
    path: "/api/import-preview",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: [
      "X-Idempotency-Key",
      "sourceKind",
      "metadataOnlyPayload",
      "rawImportText",
      "rawInviteText",
      "rawIcsText",
      "rawCalendarText"
    ],
    responseSchema: ["opportunities", "warnings", "rawContentStored"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Metadata-only import preview; raw content storage forbidden.",
    backedBy: ["resolveImportPreviewMetadata", "parseFreeImport", "serviceKernel.importEvents"]
  },
  {
    id: "calendar-connection-start",
    method: "POST",
    path: "/api/calendar/connections/start",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: ["X-Idempotency-Key", "calendarChoiceId", "returnTo"],
    responseSchema: [
      "startPacket",
      "serverOwned",
      "clientMayPrepareProviderRequest",
      "providerRequestUrl",
      "networkRequestPrepared",
      "credentialStorageEnabled",
      "externalNetworkCalls",
      "realOrdersEnabled",
      "rawContentStored",
      "nextApiRoute",
      "missingEnv",
      "oauth",
      "blockers"
    ],
    idempotencyKeyRequired: true,
    externalNetworkCalls: true,
    realOrdersEnabled: false,
    piiPolicy: "Server-owned Google OAuth start policy only; no provider credential or raw calendar content is returned.",
    backedBy: ["buildCalendarConnectionStartPackets", "validateCalendarConnectionStartPackets"]
  },
  {
    id: "retail-printer-operation-start",
    method: "POST",
    path: retailPrinterOperationStartRoute,
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: ["X-Idempotency-Key", "vendorId", "operation", "quantity", "fulfillmentMode", "renderPacketId"],
    responseSchema: [
      "startPacket",
      "serverOwned",
      "clientMayPrepareProviderRequest",
      "providerPortalUrl",
      "providerRequestUrl",
      "providerRequestPrepared",
      "networkRequestPrepared",
      "requestPrepared",
      "networkAttempted",
      "externalNetworkCalls",
      "realOrdersEnabled",
      "liveQuoteEnabled",
      "imageUploadEnabled",
      "orderPlacementEnabled",
      "blockers"
    ],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy:
      "Server-owned retail printer operation start packet only; no provider payload, upload, payment, or live order request is returned.",
    backedBy: ["buildRetailPrinterOperationStartPackets", "validateRetailPrinterOperationStartPackets"]
  },
  {
    id: "retail-printer-coupon-portal-evidence",
    method: "POST",
    path: retailPrinterCouponPortalEvidenceRoute,
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["X-Idempotency-Key", "evidenceArtifact", "portalApplicationPacketId"],
    responseSchema: [
      "providerPortalEvidenceImport",
      "acceptedEvidence",
      "rejectedEvidence",
      "pricingImpact",
      "rankedPricingImpacts",
      "bestPriceDiscountingAllowed",
      "serverOwned",
      "clientMayPrepareProviderRequest",
      "externalNetworkCalls",
      "realOrdersEnabled"
    ],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy:
      "Admin/server-owned coupon portal evidence intake only; no client-side coupon source selection, provider request payload, upload, payment, or live order request is accepted.",
    backedBy: [
      "buildRetailPrinterCouponPortalEvidenceResponse",
      "buildRetailPrinterOperationStartPackets",
      "buildPrinterPricingComparison"
    ]
  },
  {
    id: "card-projects",
    method: "POST",
    path: "/api/card-projects",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: ["X-Idempotency-Key", "opportunityId", "recipientName", "approvedMemoryIds", "locale", "occasion"],
    responseSchema: ["projectId", "renderStatus", "requiresRtlLayout", "category"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Uses approved memory ids only.",
    backedBy: ["createCardProject", "renderPrintPacket"]
  },
  {
    id: "relationship-memories",
    method: "POST",
    path: "/api/memories/review",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: ["X-Idempotency-Key", "recipientName", "text", "decision"],
    responseSchema: ["memoryId", "recipientName", "approved", "forgottenAt", "memoryUseAllowed"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Stores customer-approved relationship memory only; forget decision tombstones reuse.",
    backedBy: ["approveRelationshipMemory", "forgetRelationshipMemory", "relationship_memories"]
  },
  {
    id: "render-packets",
    method: "POST",
    path: "/api/render-packets",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "queue-backed",
    requestSchema: ["X-Idempotency-Key", "projectId", "panels"],
    responseSchema: ["renderPacketId", "checksum", "artifactManifest", "signedArtifactUrls", "status"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Stores validated panel artifacts only; signed URLs expire and require external-share approval.",
    backedBy: ["renderPrintPacket", "object-store render packets", "buildArtifactHandoffContract"]
  },
  {
    id: "manual-vendor-handoff",
    method: "POST",
    path: "/api/vendor-handoff/manual",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "queue-backed",
    requestSchema: ["X-Idempotency-Key", "projectId", "renderPacketId", "vendorId", "externalShareApproval"],
    responseSchema: ["handoffChecklist", "signedArtifactUrls", "realOrdersEnabled", "disabledReasons"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Manual checklist only; no live vendor order payload.",
    backedBy: ["buildVendorHandoff", "blocked live vendor adapters"]
  },
  {
    id: "data-requests",
    method: "POST",
    path: "/api/data-requests",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: ["X-Idempotency-Key", "requestType", "region", "consentGranted"],
    responseSchema: ["allowed", "requiredControls", "auditRequired"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Audited regional data-rights control.",
    backedBy: ["evaluateRegulatoryDecision", "audit_log"]
  },
  {
    id: "admin-card-gallery",
    method: "GET",
    path: "/api/admin/card-gallery",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["adminSession"],
    responseSchema: ["categories", "entries", "candidates", "repository"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy:
      "Admin-only curation view; gallery entries are redacted public-safe copies and candidate drafts are visible to admins only.",
    backedBy: ["card_gallery_entries", "draft_states", "admin-session auth"]
  },
  {
    id: "admin-card-gallery-save",
    method: "POST",
    path: "/api/admin/card-gallery",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: [
      "X-Idempotency-Key",
      "entryId",
      "category",
      "title",
      "publicCaption",
      "featured",
      "featuredRank",
      "publicApproved",
      "frontSvg",
      "sourceDraftId",
      "projectId",
      "renderPacketId",
      "remove"
    ],
    responseSchema: ["entryId", "category", "featured", "featuredRank", "publicApproved", "repository"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy:
      "Admin-curated public gallery entries only; private customer cards are never published without explicit admin approval, and stored copy must be public-safe.",
    backedBy: ["card_gallery_entries", "admin-session auth", "idempotency_keys", "audit_log"]
  },
  {
    id: "admin-card-gallery-regenerate",
    method: "POST",
    path: "/api/admin/card-gallery/regenerate",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["X-Idempotency-Key", "action", "category", "title", "publicCaption", "cardCopy"],
    responseSchema: ["cardCopy", "galleryCopy", "generated_by", "ai_flow", "ai_cost_gate", "provider_call_events"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: true,
    realOrdersEnabled: false,
    piiPolicy:
      "Admin-only gallery regeneration sends public-safe gallery metadata to server-selected AI providers; private customer names, memories, contact details, and provider credentials are never accepted.",
    backedBy: ["ai-card-generator service", "admin-session auth", "idempotency key", "provider_call_events"]
  },
  {
    id: "public-featured-cards",
    method: "GET",
    path: "/api/public/featured-cards",
    audience: "public",
    auth: "none",
    runtimeMode: "durable-api",
    requestSchema: [],
    responseSchema: ["categories"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy:
      "Returns only admin-approved, featured, redacted gallery entries; recipient names and private notes are never exposed.",
    backedBy: ["card_gallery_entries"]
  },
  {
    id: "walgreens-checkout-status",
    method: "GET",
    path: "/api/walgreens/checkout/status",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "local-contract",
    requestSchema: ["session"],
    responseSchema: ["ok", "status", "enabled", "mode", "uploadLimit", "expiresAtIso", "blockers", "upstreamCode"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: true,
    realOrdersEnabled: false,
    piiPolicy:
      "Checks Walgreens PhotoPrints credential readiness after customer-session auth; no card images, customer identity, payment fields, or order data are sent or stored.",
    backedBy: ["walgreensHostedCheckout service", "customer-session boundary", "admin safety controls", "per-IP rate limit"]
  },
  {
    id: "walgreens-checkout-upload",
    method: "POST",
    path: "/api/walgreens/checkout/upload",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "local-contract",
    requestSchema: ["imageBase64"],
    responseSchema: ["ok", "imageUrl", "imageName", "expiresAtIso"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: true,
    realOrdersEnabled: false,
    piiPolicy:
      "Card JPEG bytes are forwarded to Walgreens write-only photo storage only after customer-session auth; no customer identity fields are sent and nothing is persisted locally.",
    backedBy: ["walgreensHostedCheckout service", "customer-session boundary", "admin safety controls", "per-IP rate limit"]
  },
  {
    id: "walgreens-checkout-session",
    method: "POST",
    path: "/api/walgreens/checkout/session",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "local-contract",
    requestSchema: ["customer", "images", "lat", "lng"],
    responseSchema: ["ok", "checkoutUrl", "window", "imageCount", "mode"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: true,
    realOrdersEnabled: false,
    piiPolicy:
      "Customer name, email, and phone are validated, sanitized, and forwarded once after customer-session auth to the Walgreens mweb5url checkout service to pre-fill hosted checkout; nothing is persisted locally.",
    backedBy: ["walgreensHostedCheckout service", "customer-session boundary", "trusted image URL allowlist", "admin safety controls"]
  },
  {
    id: "walgreens-checkout-callback",
    method: "GET",
    path: "/api/walgreens/checkout/callback",
    audience: "public",
    auth: "none",
    runtimeMode: "local-contract",
    requestSchema: [],
    responseSchema: ["html"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Static return page; query params are read client-side only and never stored.",
    backedBy: ["buildWalgreensCallbackHtml"]
  }
];

export const hostedCheckoutExemptRouteIds = new Set([
  "walgreens-checkout-status",
  "walgreens-checkout-upload",
  "walgreens-checkout-session",
  "walgreens-checkout-callback"
]);

export const gatedProviderNetworkRouteIds = new Set([
  ...hostedCheckoutExemptRouteIds,
  "calendar-connection-start",
  "ai-chat-respond",
  "ai-card-generate",
  "admin-model-benchmark-run",
  "admin-card-gallery-regenerate"
]);

export const requiredApiRouteIds = apiRouteContracts.map((route) => route.id);
export const requiredApiRoutePaths = apiRouteContracts.map((route) => route.path);

export const repositoryBackedCustomerRouteIds = [
  "customer-draft-state",
  "customer-draft-state-save",
  "import-preview",
  "relationship-memories",
  "card-projects",
  "render-packets",
  "manual-vendor-handoff",
  "data-requests"
];

export const apiRoutePathById = Object.freeze(
  Object.fromEntries(apiRouteContracts.map((route) => [route.id, route.path]))
);

export const apiRouteIdByPath = Object.freeze(
  Object.fromEntries(apiRouteContracts.map((route) => [route.path, route.id]))
);

export const mutationBodyContractSpecs = Object.freeze({
  "ai-chat-respond": {
    requiredFields: ["customer_message", "recipient_name"],
    detail: "Queued AI chat requires a customer message and recipient before worker execution."
  },
  "ai-card-generate": {
    requiredFields: ["sender", "recipient", "occasion"],
    detail: "Queued AI card generation requires sender, recipient, and occasion before worker execution."
  },
  "import-preview": {
    requiredFields: [
      "sourceKind",
      "metadataOnlyPayload.title",
      "metadataOnlyPayload.recipientName",
      "metadataOnlyPayload.startsAt"
    ],
    detail:
      "Import preview requires explicit metadata-only event fields or server-parsed raw invite/ICS text before event/opportunity persistence."
  },
  "calendar-connection-start": {
    requiredFields: ["calendarChoiceId"],
    detail:
      "Calendar connection start requires an explicit provider choice so the server can return the safe start packet without client-owned provider logic."
  },
  "retail-printer-operation-start": {
    requiredFields: ["vendorId", "operation"],
    detail:
      "Retail printer operation start requires an explicit vendor and operation so the server can return the safe packet without client-owned provider logic."
  },
  "retail-printer-coupon-portal-evidence": {
    requiredFields: ["evidenceArtifact"],
    detail:
      "Retail printer coupon portal evidence requires a server-validated evidence artifact captured from the same provider portal cart; clients may not choose coupon sources or compute coupon pricing."
  },
  "customer-draft-state-save": {
    requiredFields: ["draftInput", "status"],
    detail:
      "Draft autosave requires signed-in draft fields and an explicit progress status so the browser can remain stateless."
  },
  "render-packets": {
    requiredFields: ["projectId"],
    detail: "Render packet creation requires an explicit card project before artifact records can be prepared."
  },
  "card-projects": {
    requiredFields: ["opportunityId", "recipientName"],
    detail: "Card project creation requires an explicit opportunity and recipient before project records can be prepared."
  },
  "relationship-memories": {
    requiredFields: ["recipientName", "text", "decision"],
    detail: "Relationship memory review requires explicit recipient, reviewed memory text, and approve/forget decision."
  },
  "manual-vendor-handoff": {
    requiredFields: ["projectId", "renderPacketId", "vendorId", "externalShareApproval"],
    detail: "Manual vendor handoff requires explicit project, render packet, selected vendor, and external-share approval state."
  },
  "admin-card-gallery-save": {
    requiredFields: ["category", "title", "publicCaption"],
    detail:
      "Card gallery curation requires an explicit category, public-safe title, and public-safe caption before an entry can be featured."
  },
  "admin-card-gallery-regenerate": {
    requiredFields: ["action", "category", "cardCopy"],
    detail:
      "Card gallery regeneration requires an explicit action, category, and current card copy before server-selected AI generation can run."
  },
  "data-requests": {
    requiredFields: ["requestType", "region", "consentGranted"],
    detail: "Data request intake requires explicit request type, region, and customer confirmation before privacy records can be prepared."
  }
});

export const persistedTablesByRouteId = Object.freeze({
  "customer-draft-state": ["auth_sessions", "draft_states", "audit_log"],
  "customer-draft-state-save": ["auth_sessions", "idempotency_keys", "draft_states", "audit_log"],
  "relationship-memories": ["auth_sessions", "idempotency_keys", "relationship_memories", "audit_log"],
  "ai-chat-respond": ["auth_sessions", "idempotency_keys", "provider_call_events", "api_jobs", "audit_log"],
  "ai-card-generate": ["auth_sessions", "idempotency_keys", "provider_call_events", "api_jobs", "audit_log"],
  "ai-job-status": ["auth_sessions", "api_jobs"],
  "provider-job-lease": ["api_jobs", "audit_log"],
  "provider-job-status": ["api_jobs"],
  "provider-job-heartbeat": ["api_jobs", "audit_log"],
  "admin-provider-job-status": ["auth_sessions", "api_jobs"],
  "provider-job-complete": ["api_jobs", "audit_log"],
  "admin-ai-flow-configs": ["auth_sessions", "admin_runtime_configs", "audit_log"],
  "admin-ai-flow-configs-save": ["auth_sessions", "idempotency_keys", "admin_runtime_configs", "audit_log"],
  "admin-worker-config": ["auth_sessions", "admin_runtime_configs", "audit_log"],
  "admin-worker-config-save": ["auth_sessions", "idempotency_keys", "admin_runtime_configs", "audit_log"],
  "admin-safety-controls": ["auth_sessions", "admin_runtime_configs", "audit_log"],
  "admin-safety-controls-save": ["auth_sessions", "idempotency_keys", "admin_runtime_configs", "audit_log"],
  "admin-local-ai-loop-run": ["auth_sessions", "idempotency_keys", "users", "api_jobs", "audit_log"],
  "admin-card-gallery-regenerate": ["auth_sessions", "idempotency_keys", "provider_call_events", "audit_log"],
  "render-packets": [
    "auth_sessions",
    "idempotency_keys",
    "card_projects",
    "render_packets",
    "provider_call_events",
    "api_jobs",
    "audit_log"
  ],
  "manual-vendor-handoff": [
    "auth_sessions",
    "idempotency_keys",
    "render_packets",
    "orders",
    "order_events",
    "consent_records",
    "api_jobs",
    "audit_log"
  ],
  "card-projects": ["auth_sessions", "idempotency_keys", "card_opportunities", "relationship_memories", "card_projects", "audit_log"],
  "import-preview": [
    "auth_sessions",
    "idempotency_keys",
    "provider_connections",
    "imported_events",
    "card_opportunities",
    "audit_log"
  ],
  "retail-printer-operation-start": ["auth_sessions", "idempotency_keys", "audit_log"],
  "retail-printer-coupon-portal-evidence": ["auth_sessions", "idempotency_keys", "audit_log"],
  "admin-demo-reset": [
    "auth_sessions",
    "idempotency_keys",
    "users",
    "provider_connections",
    "imported_events",
    "card_opportunities",
    "draft_states",
    "relationship_memories",
    "card_projects",
    "render_packets",
    "orders",
    "order_events",
    "vendor_quotes",
    "consent_records",
    "data_requests",
    "provider_call_events",
    "audit_log"
  ],
  "data-requests": ["auth_sessions", "idempotency_keys", "data_requests", "consent_records", "audit_log"],
  "admin-card-gallery-save": ["auth_sessions", "idempotency_keys", "card_gallery_entries", "audit_log"]
});

export function persistedTablesForRouteId(routeId) {
  return persistedTablesByRouteId[routeId] ?? ["auth_sessions", "idempotency_keys", "audit_log"];
}

export function getApiRouteById(routeId) {
  return apiRouteContracts.find((route) => route.id === routeId);
}
