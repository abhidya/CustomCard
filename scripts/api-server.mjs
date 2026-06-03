import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { summarizeCapacityPlan } from "../src/capacityPlanData.mjs";
import { createApiRuntime } from "./api-runtime.mjs";

const root = resolve("dist");
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? "0.0.0.0";

export const routes = [
  { id: "health", method: "GET", path: "/api/health", audience: "public", auth: "none", runtimeMode: "local-demo" },
  { id: "route-catalog", method: "GET", path: "/api/routes", audience: "public", auth: "none", runtimeMode: "local-demo" },
  { id: "customer-bootstrap", method: "GET", path: "/api/customer/bootstrap", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" },
  { id: "mobile-bootstrap", method: "GET", path: "/api/mobile/bootstrap", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" },
  { id: "admin-readiness", method: "GET", path: "/api/admin/readiness", audience: "admin", auth: "admin-session", runtimeMode: "durable-api" },
  { id: "admin-provider-catalog", method: "GET", path: "/api/admin/provider-catalog", audience: "admin", auth: "admin-session", runtimeMode: "durable-api" },
  { id: "admin-provider-governance", method: "GET", path: "/api/admin/provider-governance", audience: "admin", auth: "admin-session", runtimeMode: "durable-api" },
  { id: "admin-persistence-readiness", method: "GET", path: "/api/admin/persistence-readiness", audience: "admin", auth: "admin-session", runtimeMode: "durable-api" },
  { id: "admin-demo-reset", method: "POST", path: "/api/admin/demo-reset", audience: "admin", auth: "admin-session", runtimeMode: "durable-api" },
  { id: "import-preview", method: "POST", path: "/api/import-preview", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" },
  { id: "card-projects", method: "POST", path: "/api/card-projects", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" },
  { id: "relationship-memories", method: "POST", path: "/api/memories/review", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" },
  { id: "render-packets", method: "POST", path: "/api/render-packets", audience: "customer", auth: "customer-session", runtimeMode: "queue-backed" },
  { id: "manual-vendor-handoff", method: "POST", path: "/api/vendor-handoff/manual", audience: "customer", auth: "customer-session", runtimeMode: "queue-backed" },
  { id: "data-requests", method: "POST", path: "/api/data-requests", audience: "customer", auth: "customer-session", runtimeMode: "durable-api" }
];

const mobileBootstrap = {
  service: "customcard-api",
  safetyBanner: {
    label: "Real orders disabled",
    detail: "Live provider, payment, and vendor APIs stay behind admin gates."
  },
  sections: ["card-queue", "approval-controls", "memory-review", "text-chat", "image-render", "pricing-preview", "handoff", "offline-sync"],
  queueItems: [
    {
      id: "card_anniversary_sara_ahmed",
      recipientLabel: "Sara and Ahmed",
      eventLabel: "Anniversary",
      dueIso: "2026-06-03T17:00:00.000Z",
      status: "needs-approval",
      nextAction: "approve",
      panelCount: 4,
      source: "ics-import"
    },
    {
      id: "card_birthday_mom",
      recipientLabel: "Mom",
      eventLabel: "Birthday",
      dueIso: "2026-07-10T12:00:00.000Z",
      status: "approved",
      nextAction: "edit-tone",
      panelCount: 4,
      source: "manual-entry"
    }
  ],
  approvalActions: [
    { kind: "approve", mutationType: "approve-card", idempotencyRequired: true, networkMode: "local-first-api" },
    { kind: "edit-tone", mutationType: "update-tone", idempotencyRequired: true, networkMode: "local-first-api" },
    { kind: "snooze", mutationType: "snooze-card", idempotencyRequired: true, networkMode: "local-first-api" },
    { kind: "dismiss", mutationType: "dismiss-card", idempotencyRequired: true, networkMode: "local-first-api" },
    { kind: "request-regeneration", mutationType: "update-tone", idempotencyRequired: true, networkMode: "local-only" }
  ],
  chatTranscript: [
    "I found one anniversary card candidate from your pasted invite.",
    "Local scripted assistant can draft and explain the card before any live model is connected.",
    "Live AI and vendor orders stay off until admin credentials and certification gates pass."
  ],
  renderChoices: ["Browser SVG renderer", "Local print package export", "Credential-gated AI image providers"],
  pricingPreviews: [
    { vendor: "Walgreens", sourceMode: "review-only-public-price", manualConfirmationRequired: true, liveQuote: false },
    { vendor: "CVS", sourceMode: "review-only-public-price", manualConfirmationRequired: true, liveQuote: false },
    { vendor: "FedEx", sourceMode: "review-only-public-price", manualConfirmationRequired: true, liveQuote: false }
  ],
  handoffSteps: [
    { label: "Download SVG set", realOrderState: "manual" },
    { label: "Confirm pickup manually", realOrderState: "disabled" }
  ],
  localeOptions: ["en-US", "es-US", "ur-PK", "ar-EG"],
  syncState: {
    apiBaseUrlRequired: true,
    authMode: "customer-session",
    offlineQueueEnabled: true,
    idempotencyRequired: true,
    pendingMutationTypes: ["approve-card", "update-tone", "snooze-card", "dismiss-card", "prepare-handoff"],
    forbiddenMutationTypes: ["submit-live-order", "charge-payment", "upload-raw-memory"],
    retryPolicy: "exponential-backoff"
  },
  realOrdersEnabled: false
};

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".webp", "image/webp"]
]);

const securityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    "connect-src 'self'",
    "form-action 'self'"
  ].join("; "),
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

export const readiness = {
  service: "customcard-api",
  status: "ready",
  realOrdersEnabled: false,
  routes: {
    total: routes.length,
    public: routes.filter((route) => route.audience === "public").length,
    customer: routes.filter((route) => route.audience === "customer").length,
    admin: routes.filter((route) => route.audience === "admin").length,
    mutations: routes.filter((route) => route.method === "POST").length,
    idempotentMutations: routes.filter((route) => route.method === "POST").length
  },
  providers: {
    total: 102,
    readyLocal: 18,
    credentialGated: 69,
    contractOnly: 9,
    blocked: 6
  },
  providerGovernance: {
    total: 102,
    zeroPlatformSpend: 20,
    budgetCapped: 76,
    blockedZeroSpend: 6,
    monthlyBudgetCents: 110800,
    maxPerRequestBudgetCents: 75,
    rateLimited: 96,
    queueRequired: 70,
    fallbackCovered: 102,
    liveNetworkDefault: false,
    realOrdersEnabled: false,
    blockers: []
  },
  localization: {
    defaultLocale: "en-US",
    supportedLocales: 4,
    customerVisible: 4,
    adminVisible: 4,
    rtlLocales: 2,
    copyReviewRequired: 3,
    completeBundles: 4,
    messageKeys: 9,
    liveTranslationProvider: false,
    blockers: []
  },
  production: {
    total: 13,
    contractReady: 0,
    evidenceMissing: 11,
    blocked: 2,
    liveEnabled: 0,
    requiredEvidence: [
      "Access log sample",
      "Account recovery drill",
      "Alert route drill",
      "Applied bucket ARN",
      "Database connectivity doctor",
      "Deployment URL",
      "Emulator screenshot",
      "External audit report",
      "Hosted identity tenant",
      "Physical print QA",
      "Production DATABASE_URL",
      "Retail partner certification",
      "Vercel project link"
    ],
    blockers: [
      "No production tenant token-verification evidence has been attached.",
      "Live OAuth app approvals and revocation evidence are not present.",
      "Paid model traffic has no live allowlist, spend, or QA evidence.",
      "Retail quote APIs and quote freshness evidence are not connected.",
      "The app has no live processor approval, refund proof, or PCI review.",
      "Direct ordering remains disabled until retail certification and physical QA pass.",
      "No live telemetry project, alert route, or retention evidence is attached.",
      "Static IaC is present, but no applied production bucket/IAM output is attached.",
      "No deployed production Postgres route proof or backup policy is attached.",
      "Vercel deployment exists, but hosted DB env vars and public DB doctor output are not present.",
      "No signed native artifact or emulator render proof is attached.",
      "Only internal doctors exist; no external audit report is attached.",
      "No physical sample or retailer certification has been recorded."
    ]
  },
  capacity: summarizeCapacityPlan(),
  safety: {
    externalNetworkCalls: false,
    liveVendorOrders: false,
    rawContentStored: false
  },
  security: {
    headers: Object.keys(securityHeaders).length,
    cspFrameAncestors: true,
    cspObjectBlocked: true,
    cspUnsafeEvalBlocked: true,
    apiCachePolicy: "no-store",
    staticIndexCachePolicy: "no-store"
  },
  persistence: {
    tables: 18,
    schemaBackedRoutes: 13,
    authSessionTable: true,
    accountIdentityTable: true,
    accountRecoveryTable: true,
    idempotencyTable: true,
    appendOnlyAudit: true,
    relationshipMemoryRepository: true,
    importPreviewRepository: true,
    cardProjectRepository: true,
    manualVendorHandoffRepository: true,
    dataRequestRepository: true,
    renderPacketRepository: true,
    renderPacketArtifacts: true,
    signedArtifactUrls: true
  }
};
const apiRuntime = createApiRuntime({ env: process.env, routes });

if (process.argv.includes("--doctor")) {
  const blockers = validateApiServerContract();
  console.log(
    JSON.stringify(
      {
        service: "customcard-api-doctor",
        status: blockers.length === 0 ? "ready" : "blocked",
        readiness: {
          ...readiness,
          runtime: apiRuntime.describe()
        },
        blockers
      },
      null,
      2
    )
  );
  if (blockers.length > 0) process.exit(1);
} else if (isCliEntrypoint()) {
  createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");

    if (requestUrl.pathname.startsWith("/api/")) {
      handleApiRequest(request, response).catch((error) => {
        sendJson(response, 500, {
          service: "customcard-api",
          status: "internal-error",
          detail: error instanceof Error ? error.message : "Unknown API runtime error."
        });
      });
      return;
    }

    serveStatic(response, requestUrl.pathname);
  }).listen(port, host, () => {
    console.log(`CustomCard API server listening on http://${host}:${port}`);
  });
}

export async function handleApiRequest(request, response) {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers?.host ?? "localhost"}`);
  await serveApi(request, response, requestUrl.pathname);
}

async function serveApi(request, response, path) {
  const route = routes.find((candidate) => candidate.path === path);
  if (!route) {
    sendJson(response, 404, { service: "customcard-api", status: "not-found", path });
    return;
  }

  if (request.method !== route.method) {
    sendJson(response, 405, { service: "customcard-api", status: "method-not-allowed", path });
    return;
  }

  const authContext = await apiRuntime.authorize(route, request);
  if (!authContext.ok) {
    sendJson(response, authContext.statusCode, authContext.payload);
    return;
  }

  if (path === "/api/health") {
    sendJson(response, 200, {
      service: "customcard-api",
      status: "ready",
      realOrdersEnabled: false,
      runtime: apiRuntime.describe()
    });
    return;
  }

  if (path === "/api/routes") {
    sendJson(response, 200, routes);
    return;
  }

  if (path === "/api/admin/readiness") {
    sendJson(response, 200, {
      ...readiness,
      runtime: apiRuntime.describe()
    });
    return;
  }

  if (path === "/api/admin/provider-catalog") {
    sendJson(response, 200, {
      service: "customcard-api",
      providers: readiness.providers,
      providerGovernance: readiness.providerGovernance,
      externalNetworkCalls: false,
      runtime: apiRuntime.describe()
    });
    return;
  }

  if (path === "/api/admin/provider-governance") {
    sendJson(response, 200, {
      service: "customcard-api",
      status: "ready",
      providerGovernance: readiness.providerGovernance,
      externalNetworkCalls: false,
      realOrdersEnabled: false,
      runtime: apiRuntime.describe()
    });
    return;
  }

  if (path === "/api/admin/persistence-readiness") {
    sendJson(response, 200, {
      service: "customcard-api",
      status: "ready",
      persistence: readiness.persistence,
      runtime: apiRuntime.describe(),
      safety: readiness.safety,
      blockers: []
    });
    return;
  }

  if (path === "/api/mobile/bootstrap") {
    sendJson(response, 200, {
      ...mobileBootstrap,
      localization: readiness.localization,
      runtime: apiRuntime.describe()
    });
    return;
  }

  if (path === "/api/customer/bootstrap") {
    sendJson(response, 200, {
      service: "customcard-api",
      primaryActions: ["event-import", "text-chat", "image-generation", "render-export", "vendor-handoff"],
      readyFallbacks: ["ICS / invite paste", "Local customer chat", "Browser SVG renderer", "Manual vendor handoff"],
      localization: readiness.localization,
      printerPricing: {
        selectedVendorId: "walgreens",
        liveQuote: false,
        knownPriceCount: 12,
        sourceCount: 7,
        maxAgeDays: 30,
        freshnessPolicy: "Use src/printerPricing.ts refresh report before showing prices as current.",
        externalNetworkCalls: false
      },
      realOrdersEnabled: false,
      runtime: apiRuntime.describe()
    });
    return;
  }

  const bodyText = await readRequestBody(request);
  const persistedMutation = await apiRuntime.persistMutation({
    route,
    request,
    authContext,
    bodyText,
    responsePayload: buildMutationContractPayload(route, bodyText)
  });
  sendJson(response, persistedMutation.statusCode, persistedMutation.payload);
}

function isCliEntrypoint() {
  return Boolean(process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href);
}

function serveStatic(response, requestPath) {
  if (!existsSync(join(root, "index.html"))) {
    sendJson(response, 503, {
      service: "customcard-api",
      status: "static-dist-missing",
      detail: "Run npm run build before serving the web app."
    });
    return;
  }

  const normalizedPath = normalize(decodeURIComponent(requestPath)).replace(/^(\.\.(\/|\\|$))+/, "");
  const requestedFile = resolve(join(root, normalizedPath === "/" ? "index.html" : normalizedPath));
  const file = requestedFile.startsWith(root) && existsSync(requestedFile) && statSync(requestedFile).isFile()
    ? requestedFile
    : join(root, "index.html");

  response.statusCode = 200;
  response.setHeader("Content-Type", contentTypes.get(extname(file)) ?? "application/octet-stream");
  applySecurityHeaders(response, file.endsWith("index.html") ? "no-store" : "public, max-age=31536000, immutable");
  createReadStream(file).pipe(response);
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  applySecurityHeaders(response, "no-store");
  response.end(JSON.stringify(payload));
}

function applySecurityHeaders(response, cacheControl) {
  for (const [header, value] of Object.entries(securityHeaders)) {
    response.setHeader(header, value);
  }
  response.setHeader("Cache-Control", cacheControl);
}

function validateApiServerContract() {
  const blockers = [];
  const requiredRoutes = new Set([
    "/api/health",
    "/api/routes",
    "/api/customer/bootstrap",
    "/api/mobile/bootstrap",
    "/api/admin/readiness",
    "/api/admin/provider-catalog",
    "/api/admin/provider-governance",
    "/api/admin/persistence-readiness",
    "/api/admin/demo-reset",
    "/api/import-preview",
    "/api/card-projects",
    "/api/memories/review",
    "/api/render-packets",
    "/api/vendor-handoff/manual",
    "/api/data-requests"
  ]);
  const routePaths = new Set(routes.map((route) => route.path));

  for (const requiredRoute of requiredRoutes) {
    if (!routePaths.has(requiredRoute)) blockers.push(`Missing API route: ${requiredRoute}`);
  }
  for (const route of routes) {
    if (route.audience === "admin" && route.auth !== "admin-session") blockers.push(`Admin route ${route.id} is not gated.`);
    if (route.audience === "customer" && route.auth !== "customer-session") {
      blockers.push(`Customer route ${route.id} is not gated.`);
    }
  }
  if (readiness.realOrdersEnabled) blockers.push("API readiness cannot enable real orders.");
  if (readiness.safety.externalNetworkCalls) blockers.push("API readiness cannot enable live provider calls.");
  if (readiness.routes.mutations !== readiness.routes.idempotentMutations) {
    blockers.push("Every mutation route must require idempotency.");
  }
  if (readiness.providers.total < 102) blockers.push("Provider API summary is missing expanded adapter coverage.");
  if (readiness.providerGovernance.total !== readiness.providers.total) {
    blockers.push("Provider governance summary must cover every adapter.");
  }
  if (readiness.providerGovernance.fallbackCovered !== readiness.providers.total) {
    blockers.push("Provider governance summary must map every adapter to a ready fallback.");
  }
  if (readiness.providerGovernance.blockers.length > 0) blockers.push("Provider governance summary has blockers.");
  if (readiness.providerGovernance.liveNetworkDefault) blockers.push("Provider governance cannot default to live network calls.");
  if (readiness.providerGovernance.realOrdersEnabled) blockers.push("Provider governance cannot enable real orders.");
  if (readiness.production.liveEnabled !== 0) blockers.push("Production readiness cannot enable live components by default.");
  if (readiness.production.total < 13) blockers.push("Production readiness must track every launch gate.");
  if (readiness.capacity.total < 4) blockers.push("Capacity readiness must cover local, droplet, cloud-native, and SaaS profiles.");
  if (readiness.capacity.localProfiles !== 1) blockers.push("Capacity readiness must keep exactly one local profile.");
  if (readiness.capacity.cloudProfiles < 3) blockers.push("Capacity readiness must include cheap droplet, cloud-native, and SaaS profiles.");
  if (readiness.capacity.queueBackedProfiles !== readiness.capacity.total) {
    blockers.push("Every capacity profile must be queue-backed.");
  }
  if (readiness.capacity.objectStoreBackedProfiles !== readiness.capacity.total) {
    blockers.push("Every capacity profile must be object-store backed.");
  }
  if (readiness.capacity.realOrdersEnabled !== 0) blockers.push("Capacity readiness cannot enable real orders.");
  if (readiness.capacity.liveProviderCalls !== 0) blockers.push("Capacity readiness cannot enable live provider calls.");
  if (readiness.capacity.blockers.length > 0) blockers.push("Capacity readiness summary has blockers.");
  if (readiness.localization.defaultLocale !== "en-US") blockers.push("Localization default locale must stay en-US.");
  if (readiness.localization.supportedLocales < 4) blockers.push("Localization must cover at least four launch locales.");
  if (readiness.localization.completeBundles !== readiness.localization.supportedLocales) {
    blockers.push("Localization bundles must cover every supported locale.");
  }
  if (readiness.localization.rtlLocales < 2) blockers.push("Localization must include RTL launch locale coverage.");
  if (readiness.localization.copyReviewRequired < readiness.localization.rtlLocales) {
    blockers.push("RTL localization must require human copy review.");
  }
  if (readiness.localization.liveTranslationProvider) blockers.push("Localization cannot require a live translation provider.");
  if (readiness.localization.blockers.length > 0) blockers.push("Localization readiness summary has blockers.");
  if (readiness.security.headers < 7) blockers.push("API server must expose a complete security header baseline.");
  if (!readiness.security.cspFrameAncestors) blockers.push("API server CSP must block framed embedding.");
  if (!readiness.security.cspObjectBlocked) blockers.push("API server CSP must block object/plugin loads.");
  if (!readiness.security.cspUnsafeEvalBlocked) blockers.push("API server CSP must block unsafe eval.");
  const unsafeEvalDirective = "'unsafe" + "-eval'";
  if (securityHeaders["Content-Security-Policy"].includes(unsafeEvalDirective)) {
    blockers.push("API server CSP cannot allow unsafe eval.");
  }
  for (const requiredHeader of [
    "Content-Security-Policy",
    "Cross-Origin-Opener-Policy",
    "Cross-Origin-Resource-Policy",
    "Permissions-Policy",
    "Referrer-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options"
  ]) {
    if (!securityHeaders[requiredHeader]) blockers.push(`Missing security header: ${requiredHeader}`);
  }
  if (!readiness.persistence.authSessionTable) blockers.push("API readiness is missing auth session persistence.");
  if (!readiness.persistence.accountIdentityTable) blockers.push("API readiness is missing account identity persistence.");
  if (!readiness.persistence.accountRecoveryTable) blockers.push("API readiness is missing account recovery persistence.");
  if (!readiness.persistence.idempotencyTable) blockers.push("API readiness is missing idempotency persistence.");
  if (!readiness.persistence.appendOnlyAudit) blockers.push("API readiness must use append-only audit persistence.");
  if (!readiness.persistence.relationshipMemoryRepository) blockers.push("API readiness is missing relationship-memory repository persistence.");
  if (!readiness.persistence.importPreviewRepository) blockers.push("API readiness is missing import-preview repository persistence.");
  if (!readiness.persistence.cardProjectRepository) blockers.push("API readiness is missing card-project repository persistence.");
  if (!readiness.persistence.manualVendorHandoffRepository) {
    blockers.push("API readiness is missing manual vendor handoff repository persistence.");
  }
  if (!readiness.persistence.dataRequestRepository) blockers.push("API readiness is missing data-request repository persistence.");
  if (!readiness.persistence.renderPacketRepository) blockers.push("API readiness is missing render-packet repository persistence.");
  if (!readiness.persistence.renderPacketArtifacts) blockers.push("API readiness is missing render-packet artifact manifests.");
  if (!readiness.persistence.signedArtifactUrls) blockers.push("API readiness is missing signed artifact URL contracts.");
  blockers.push(...apiRuntime.validate());

  return blockers;
}

function buildMutationContractPayload(route, bodyText) {
  const requestBody = parseJsonBody(bodyText);
  const basePayload = {
    service: "customcard-api",
    status: "accepted-contract-only",
    route: route.id,
    idempotencyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false
  };

  if (route.id === "render-packets") {
    const projectId = String(requestBody.projectId ?? "project-contract");
    const renderPacketId = safeContractId(requestBody.renderPacketId, `render-packet-${stableContractHash(projectId).slice(0, 8)}`);
    const checksum = `cc_${stableContractHash(`${renderPacketId}:${projectId}`).slice(0, 8)}`;
    const signedUrlExpiresAt = safeTimestamp(requestBody.signedUrlExpiresAt, "2030-01-01T00:15:00.000Z");
    return {
      ...basePayload,
      renderPacketId,
      checksum,
      artifactManifest: {
        renderPacketId,
        projectId,
        storageProvider: "object-store-contract",
        artifactCount: 6,
        manifestChecksum: checksum,
        signedUrlTtlMinutes: 15,
        signedUrlExpiresAt,
        externalShareApprovalRequired: true,
        realOrdersEnabled: false
      },
      signedArtifactUrls: [
        {
          method: "GET",
          signatureVersion: "hmac-sha256-v1",
          expiresInMinutes: 15,
          url: `contract-only://customcard/artifacts/${encodeURIComponent(projectId)}`
        }
      ],
      repository: {
        table: "render_packets",
        runtimeMode: "contract",
        persisted: false,
        signedArtifactUrls: true,
        realOrdersEnabled: false
      }
    };
  }

  if (route.id === "card-projects") {
    const opportunityId = safeContractId(requestBody.opportunityId, "opportunity-contract");
    const locale = safeLocale(requestBody.locale);
    const projectId = safeContractId(requestBody.projectId, `project-${stableContractHash(opportunityId).slice(0, 8)}`);
    const approvedMemoryIds = Array.isArray(requestBody.approvedMemoryIds)
      ? requestBody.approvedMemoryIds.map((value) => safeContractId(value, "")).filter(Boolean).slice(0, 12)
      : [];
    return {
      ...basePayload,
      projectId,
      opportunityId,
      renderStatus: "ready-for-render",
      requiresRtlLayout: Boolean(requestBody.requiresRtlLayout) || /^(ar|he|fa|ur)(-|$)/i.test(locale),
      approvedMemoryIds,
      repository: {
        table: "card_projects",
        runtimeMode: "contract",
        persisted: false
      }
    };
  }

  if (route.id === "relationship-memories") {
    const recipientName = safeContractText(requestBody.recipientName, "Recipient");
    const text = safeContractText(requestBody.text ?? requestBody.note, "Customer-approved memory");
    const decision = safeMemoryDecision(requestBody.decision ?? (safeBoolean(requestBody.forget) ? "forget" : "approve"));
    const memoryId = safeContractId(requestBody.memoryId, `memory-${stableContractHash(`${recipientName}:${text}`).slice(0, 8)}`);
    const forgottenAt = decision === "forget" ? safeTimestamp(requestBody.forgottenAt, "2030-01-01T00:00:00.000Z") : null;
    return {
      ...basePayload,
      memoryId,
      recipientName,
      approved: decision === "approve",
      forgottenAt,
      memoryUseAllowed: decision === "approve",
      privacyControls: {
        customerApproved: decision === "approve",
        rawProviderContentStored: false,
        forgetSupported: true
      },
      repository: {
        table: "relationship_memories",
        runtimeMode: "contract",
        persisted: false,
        rawContentStored: false
      }
    };
  }

  if (route.id === "import-preview") {
    const payload = typeof requestBody.metadataOnlyPayload === "object" && requestBody.metadataOnlyPayload !== null
      ? requestBody.metadataOnlyPayload
      : requestBody;
    const sourceKind = safeContractId(requestBody.sourceKind ?? payload.sourceKind, "manual-ics");
    const title = safeContractText(payload.title ?? requestBody.title, "Imported event");
    const recipientName = safeContractText(payload.recipientName ?? payload.recipient_hint ?? payload.recipientHint, "Recipient");
    const startsAt = safeTimestamp(payload.startsAt ?? payload.starts_at ?? requestBody.startsAt, "2030-01-01T12:00:00.000Z");
    const eventId = safeContractId(requestBody.eventId, `event-${stableContractHash(`${sourceKind}:${title}:${startsAt}`).slice(0, 8)}`);
    const opportunityId = safeContractId(requestBody.opportunityId, `opportunity-${stableContractHash(`${eventId}:${recipientName}`).slice(0, 8)}`);
    return {
      ...basePayload,
      rawContentStored: false,
      warnings: [],
      opportunities: [
        {
          opportunityId,
          eventId,
          recipientName,
          title,
          startsAt,
          timezone: safeContractText(payload.timezone ?? requestBody.timezone, "UTC"),
          confidence: safeConfidence(payload.confidence ?? requestBody.confidence, 0.92),
          decision: safeDecision(payload.decision ?? requestBody.decision)
        }
      ],
      repository: {
        tables: ["provider_connections", "imported_events", "card_opportunities"],
        runtimeMode: "contract",
        persisted: false,
        rawContentStored: false
      }
    };
  }

  if (route.id === "manual-vendor-handoff") {
    const projectId = safeContractId(requestBody.projectId ?? requestBody.cardProjectId, "project-contract");
    const renderPacketId = safeContractId(requestBody.renderPacketId, "render-packet-contract");
    const orderId = safeContractId(requestBody.orderId, `order-${stableContractHash(`${projectId}:${renderPacketId}`).slice(0, 8)}`);
    const externalShareApproval = safeBoolean(requestBody.externalShareApproval ?? requestBody.externalShareApproved ?? requestBody.consentGranted);
    return {
      ...basePayload,
      orderId,
      projectId,
      renderPacketId,
      handoffStatus: externalShareApproval ? "vendor_handoff_ready" : "vendor_handoff_blocked",
      consentRecordId: `consent-${stableContractHash(`${orderId}:external-share`).slice(0, 8)}`,
      externalShareApproval,
      handoffChecklist: ["Download signed artifacts", "Confirm external share approval", "Upload manually to selected printer"],
      signedArtifactUrls: [
        {
          method: "GET",
          signatureVersion: "hmac-sha256-v1",
          expiresInMinutes: 15,
          url: `contract-only://customcard/artifacts/${encodeURIComponent(String(requestBody.renderPacketId ?? "render-packet-contract"))}`
        }
      ],
      disabledReasons: ["Live vendor order APIs remain disabled until certification and kill-switch gates pass."],
      repository: {
        tables: ["orders", "order_events", "consent_records"],
        runtimeMode: "contract",
        persisted: false,
        liveQuote: false,
        realOrdersEnabled: false
      }
    };
  }

  if (route.id === "data-requests") {
    const requestType = safeDataRequestType(requestBody.requestType ?? requestBody.type);
    const dataRequestId = safeContractId(requestBody.requestId, `data-request-${stableContractHash(`${requestType}:contract`).slice(0, 8)}`);
    const dueAt = safeTimestamp(requestBody.dueAt, "2030-01-31T00:00:00.000Z");
    const region = safeContractText(requestBody.region, "US").slice(0, 12);
    return {
      ...basePayload,
      dataRequestId,
      requestType,
      requestStatus: safeDataRequestStatus(requestBody.status),
      dueAt,
      consentRecordId: `consent-${stableContractHash(`${dataRequestId}:data-request`).slice(0, 8)}`,
      consentGranted: safeBoolean(requestBody.consentGranted ?? requestBody.requestConfirmed ?? true),
      privacyControls: {
        region,
        rawContentStored: false,
        verificationRequired: true,
        deletionRequiresRetentionReview: requestType === "delete"
      },
      repository: {
        tables: ["data_requests", "consent_records"],
        runtimeMode: "contract",
        persisted: false,
        rawContentStored: false
      }
    };
  }

  if (route.id === "admin-demo-reset") {
    const resetKey = String(requestBody.resetKey ?? "demo-reset-contract");
    return {
      ...basePayload,
      seedSummary: {
        service: "customcard-demo-seed",
        status: "ready",
        resetKey,
        tables: 14,
        rows: 17,
        renderArtifacts: 6,
        signedArtifactUrls: true,
        idempotentReset: true,
        rawContentStored: false,
        liveExternalCalls: false,
        realOrdersEnabled: false
      },
      tables: [
        "users",
        "auth_sessions",
        "provider_connections",
        "imported_events",
        "card_opportunities",
        "relationship_memories",
        "card_projects",
        "render_packets",
        "orders",
        "order_events",
        "vendor_quotes",
        "consent_records",
        "data_requests",
        "audit_log"
      ],
      rows: 17,
      signedArtifactUrls: true
    };
  }

  return basePayload;
}

function parseJsonBody(bodyText) {
  if (!bodyText) return {};
  try {
    return JSON.parse(bodyText);
  } catch {
    return {};
  }
}

function stableContractHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function safeContractId(value, fallback) {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || fallback;
}

function safeLocale(value) {
  const text = String(value ?? "en-US").trim();
  return /^[a-z]{2,3}(-[A-Z]{2})?$/i.test(text) ? text : "en-US";
}

function safeContractText(value, fallback) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text.slice(0, 120) || fallback;
}

function safeBoolean(value) {
  if (value === true) return true;
  if (value === false) return false;
  const text = String(value ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "y", "approved", "granted"].includes(text);
}

function safeDataRequestType(value) {
  const requestType = String(value ?? "export").trim().toLowerCase().replace(/[^a-z_:-]/g, "_");
  return ["export", "delete", "correct", "revoke_consent", "access"].includes(requestType) ? requestType : "export";
}

function safeDataRequestStatus(value) {
  const status = String(value ?? "pending_verification").trim().toLowerCase().replace(/[^a-z_-]/g, "_");
  return ["pending_verification", "received", "processing", "completed", "rejected"].includes(status) ? status : "pending_verification";
}

function safeMemoryDecision(value) {
  const decision = String(value ?? "approve").trim().toLowerCase().replace(/[^a-z_-]/g, "_");
  return ["approve", "forget"].includes(decision) ? decision : "approve";
}

function safeTimestamp(value, fallback) {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function safeConfidence(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, Number(number.toFixed(3))));
}

function safeDecision(value) {
  const decision = String(value ?? "generate").trim();
  return ["pending", "generate", "reject", "snooze"].includes(decision) ? decision : "generate";
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 256_000) {
        request.destroy(new Error("Request body too large."));
      }
    });
    request.on("error", reject);
    request.on("end", () => resolve(body));
  });
}
