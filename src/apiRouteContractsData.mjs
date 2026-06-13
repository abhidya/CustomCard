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
      "assistant_message",
      "ai_flow",
      "ai_cost_gate",
      "ai_cost_ledger",
      "provider_call_events",
      "live_provider_calls_enabled",
      "fallback_queued",
      "external_network_calls"
    ],
    idempotencyKeyRequired: true,
    externalNetworkCalls: true,
    realOrdersEnabled: false,
    piiPolicy:
      "Customer-session-protected chat text is redacted and sent only to the server-selected AI provider when the flow is live, configured, rate-limited, and fallback-covered; the route does not persist transcripts.",
    backedBy: ["server-side aiFlowConfig", "server-side live AI gate", "ai-card-generator service", "deterministic-customer-chat fallback"]
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
      "draft_id",
      "card_copy",
      "images",
      "generated_by",
      "ai_flow",
      "ai_cost_gate",
      "ai_cost_ledger",
      "provider_call_events",
      "live_provider_calls_enabled",
      "fallback_queued",
      "external_network_calls"
    ],
    idempotencyKeyRequired: true,
    externalNetworkCalls: true,
    realOrdersEnabled: false,
    piiPolicy:
      "Customer-session-protected card fields and approved memories are minimized and sent only to the server-selected AI provider when the flow is live, configured, rate-limited, and fallback-covered; the route does not place orders or store raw drafts.",
    backedBy: ["server-side aiFlowConfig", "server-side live AI gate", "ai-card-generator service", "browser-svg-renderer fallback"]
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
    id: "public-featured-cards",
    method: "GET",
    path: "/api/public/featured-cards",
    audience: "public",
    auth: "none",
    runtimeMode: "durable-api",
    requestSchema: [],
    responseSchema: ["categories", "fallbackToBuiltInExamples"],
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
    backedBy: ["walgreensHostedCheckout service", "customer-session boundary", "WALGREENS_VENDOR_MODE gate", "per-IP rate limit"]
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
    backedBy: ["walgreensHostedCheckout service", "customer-session boundary", "WALGREENS_VENDOR_MODE gate", "per-IP rate limit"]
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
    backedBy: ["walgreensHostedCheckout service", "customer-session boundary", "trusted image URL allowlist", "WALGREENS_VENDOR_MODE gate"]
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
  "ai-card-generate"
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
  "data-requests": {
    requiredFields: ["requestType", "region", "consentGranted"],
    detail: "Data request intake requires explicit request type, region, and customer confirmation before privacy records can be prepared."
  }
});

export const persistedTablesByRouteId = Object.freeze({
  "customer-draft-state": ["auth_sessions", "draft_states", "audit_log"],
  "customer-draft-state-save": ["auth_sessions", "idempotency_keys", "draft_states", "audit_log"],
  "relationship-memories": ["auth_sessions", "idempotency_keys", "relationship_memories", "audit_log"],
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
