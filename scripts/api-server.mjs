import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildReadinessSummary,
  readinessDomainIds,
  validateReadinessDomains
} from "../src/readinessSummaryData.mjs";
import {
  buildRetailPrinterOperationStartPackets,
  buildRetailPrinterOperationStartResponse
} from "../src/retailPrinterOperationStartData.mjs";
import {
  buildRetailPrinterCouponPortalEvidenceResponse,
  missingRetailPrinterCouponPortalEvidenceFields,
  retailPrinterCouponPortalEvidenceRoute
} from "../src/retailPrinterCouponPortalEvidenceData.mjs";
import { resolveImportPreviewMetadata } from "../src/importPreviewMetadata.mjs";
import {
  WALGREENS_CHECKOUT_MAX_IMAGE_BYTES,
  buildWalgreensCallbackHtml,
  createWalgreensHostedCheckoutService,
  formatWalgreensCheckoutUpstreamError,
  walgreensCheckoutCallbackRoute,
  walgreensCheckoutSessionRoute,
  walgreensCheckoutUploadRoute
} from "../src/walgreensHostedCheckout.mjs";
import { createApiRuntime } from "./api-runtime.mjs";
import { createApiRouteFamilies } from "./api-route-families.mjs";
import { apiRouteContracts, hostedCheckoutExemptRouteIds, requiredApiRoutePaths } from "../src/apiRouteContractsData.mjs";
import {
  aiCardGenerateRoute,
  aiChatRespondRoute,
  createAiCardGenerationService,
  loadLocalAiEnvFiles
} from "./ai-card-generator.mjs";

const root = resolve("dist");
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? "0.0.0.0";

loadLocalApiEnvFiles();
loadLocalAiEnvFiles();

export const routes = apiRouteContracts;

const walgreensCheckout = createWalgreensHostedCheckoutService({
  env: process.env,
  fetchImpl: (...args) => globalThis.fetch(...args)
});
const aiGenerationService = createAiCardGenerationService({
  env: process.env,
  fetchImpl: (...args) => globalThis.fetch(...args)
});

function loadLocalApiEnvFiles({ cwd = process.cwd(), target = process.env } = {}) {
  const localApiEnvKeys = new Set([
    "WALGREENS_VENDOR_MODE",
    "WALGREENS_API_KEY",
    "WALGREENS_AFF_ID",
    "WALGREENS_PUBLISHER_ID",
    "PUBLIC_APP_ORIGIN",
    "GOOGLE_OAUTH_CLIENT_ID",
    "GOOGLE_OAUTH_CLIENT_SECRET",
    "GOOGLE_OAUTH_REDIRECT_URI",
    "GOOGLE_CALENDAR_REDIRECT_URI",
    "GOOGLE_OAUTH_STATE_SECRET",
    "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY",
    "GOOGLE_CALENDAR_ID",
    "GOOGLE_CALENDAR_IMPORT_MAX_RESULTS"
  ]);
  for (const filePath of [".env.local", "infra/env/.env"]) {
    const absolutePath = resolve(cwd, filePath);
    if (!existsSync(absolutePath)) continue;
    const parsed = parseLocalEnv(readFileSync(absolutePath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (!localApiEnvKeys.has(key)) continue;
      if (!target[key]) target[key] = value;
    }
  }
}

function parseLocalEnv(text) {
  const parsed = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) parsed[key] = value;
  }
  return parsed;
}

// Best-effort per-instance rate limit for the public Walgreens checkout routes.
const walgreensRateBuckets = new Map();
const WALGREENS_RATE_LIMIT = 30;
const WALGREENS_RATE_WINDOW_MS = 60_000;
const WALGREENS_UPLOAD_BODY_LIMIT = Math.ceil((WALGREENS_CHECKOUT_MAX_IMAGE_BYTES * 4) / 3) + 2_000_000;

function walgreensRateLimited(request) {
  const key = clientRateLimitKey(request);
  const now = Date.now();
  const fresh = (walgreensRateBuckets.get(key) ?? []).filter((timestamp) => now - timestamp < WALGREENS_RATE_WINDOW_MS);
  fresh.push(now);
  if (walgreensRateBuckets.size > 10_000) walgreensRateBuckets.clear();
  walgreensRateBuckets.set(key, fresh);
  return fresh.length > WALGREENS_RATE_LIMIT;
}

function clientRateLimitKey(request) {
  const remoteAddress = String(request.socket?.remoteAddress ?? "unknown").trim() || "unknown";
  if (process.env.CUSTOMCARD_TRUST_PROXY_HEADERS !== "true") return remoteAddress;

  const forwardedFor = String(request.headers?.["x-forwarded-for"] ?? "")
    .split(",")[0]
    .trim();
  return forwardedFor || remoteAddress;
}

const mobileBootstrap = {
  service: "customcard-api",
  safetyBanner: {
    label: "Confirm before checkout",
    detail: "Printing, payment, and ordering happen only after customer review."
  },
  todaySummary: {
    cardQueueItemId: "card_anniversary_sara_ahmed",
    recipientLabel: "Sara and Ahmed",
    eventLabel: "Anniversary",
    dueLabel: "Today by 5:00 PM",
    primaryAction: "approve",
    riskBadge: "Review before handoff",
    panelCount: 4,
    offlineReady: true,
    realOrdersEnabled: false,
    customerVisible: true
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
  memoryReviewItems: [
    {
      id: "memory_sara_ahmed_first_apartment",
      cardQueueItemId: "card_anniversary_sara_ahmed",
      recipientLabel: "Sara and Ahmed",
      memoryLabel: "First apartment note",
      usage: "approved",
      approvalRequired: false,
      rawContentStored: false,
      customerVisible: true
    },
    {
      id: "memory_mom_garden",
      cardQueueItemId: "card_birthday_mom",
      recipientLabel: "Mom",
      memoryLabel: "Garden hobby note",
      usage: "review-required",
      approvalRequired: true,
      rawContentStored: false,
      customerVisible: true
    }
  ],
  renderChoices: ["Browser SVG renderer", "Local print package export", "Credential-gated AI image providers"],
  pricingPreviews: [
    { vendor: "Walgreens", sourceMode: "review-only-public-price", manualConfirmationRequired: true, liveQuote: false },
    { vendor: "CVS", sourceMode: "review-only-public-price", manualConfirmationRequired: true, liveQuote: false },
    { vendor: "FedEx", sourceMode: "review-only-public-price", manualConfirmationRequired: true, liveQuote: false }
  ],
  printProofChecks: [
    {
      id: "proof-size",
      label: "5x7 format",
      detail: "Four SVG panels match the manual print package.",
      passed: true,
      realOrderState: "manual",
      customerVisible: true
    },
    {
      id: "proof-resolution",
      label: "300 DPI export",
      detail: "Render packet keeps print dimensions and checksum evidence together.",
      passed: true,
      realOrderState: "manual",
      customerVisible: true
    },
    {
      id: "proof-safe-zone",
      label: "Safe zone",
      detail: "Panel text stays inside the tested SVG print area.",
      passed: true,
      realOrderState: "manual",
      customerVisible: true
    },
    {
      id: "proof-order-gate",
      label: "Order gate",
      detail: "Retail-printer submission stays blocked until certification evidence exists.",
      passed: true,
      realOrderState: "disabled",
      customerVisible: true
    }
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
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
};

const readinessSummary = buildReadinessSummary();

export const readiness = {
  service: "customcard-api",
  status: "ready",
  realOrdersEnabled: false,
  readinessDomains: readinessDomainIds,
  routes: {
    total: routes.length,
    public: routes.filter((route) => route.audience === "public").length,
    customer: routes.filter((route) => route.audience === "customer").length,
    admin: routes.filter((route) => route.audience === "admin").length,
    mutations: routes.filter((route) => route.method === "POST").length,
    idempotentMutations: routes.filter((route) => route.method === "POST").length
  },
  providers: {
    total: 131,
    readyLocal: 18,
    credentialGated: 97,
    contractOnly: 10,
    blocked: 6
  },
  providerGovernance: {
    total: 131,
    zeroPlatformSpend: 21,
    budgetCapped: 104,
    blockedZeroSpend: 6,
    monthlyBudgetCents: 202600,
    maxPerRequestBudgetCents: 5,
    rateLimited: 125,
    queueRequired: 91,
    fallbackCovered: 131,
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
  externalAudit: readinessSummary.externalAudit.summary,
  e2eCoverage: readinessSummary.e2eCoverage.summary,
  aiProviderReadiness: readinessSummary.aiProvider.summary,
  capacity: readinessSummary.capacity.summary,
  observability: readinessSummary.observability.summary,
  retailFulfillment: readinessSummary.retailFulfillment.summary,
  paymentReadiness: readinessSummary.payment.summary,
  mobileRenderReadiness: readinessSummary.mobileRender.summary,
  hostedApiReadiness: readinessSummary.hostedApi.summary,
  reviewerDbSeedReadiness: readinessSummary.reviewerDbSeed.summary,
  cloudArtifactProofReadiness: readinessSummary.cloudArtifactProof.summary,
  businessEngagementReadiness: readinessSummary.businessEngagement.summary,
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
    tables: 21,
    schemaBackedRoutes: 22,
    authSessionTable: true,
    accountIdentityTable: true,
    accountRecoveryTable: true,
    idempotencyTable: true,
    providerUsageLedgerTable: true,
    appendOnlyAudit: true,
    relationshipMemoryRepository: true,
    draftStateRepository: true,
    importPreviewRepository: true,
    cardProjectRepository: true,
    manualVendorHandoffRepository: true,
    dataRequestRepository: true,
    renderPacketRepository: true,
    renderPacketArtifacts: true,
    signedArtifactUrls: true,
    localBrowserState: {
      audited: true,
      auditSource: "src/localPersistenceAudit.ts",
      localStorageKeys: [],
      dbRequiredItems: 0,
      objectStoreRequiredItems: 0,
      browserOnlyItems: 0,
      dbRequiredData: [
        "migrated to account-scoped API routes"
      ],
      browserOnlyData: []
    }
  }
};
const apiRuntime = createApiRuntime({ env: process.env, routes });
const apiRouteFamilies = createApiRouteFamilies({
  aiCardGenerateRoute,
  aiChatRespondRoute,
  aiGenerationService,
  apiRuntime,
  buildMutationContractPayload,
  buildRetailPrinterOperationStartPackets,
  buildWalgreensCallbackHtml,
  calendarConnectionLifecycle: handleCalendarConnectionLifecycle,
  calendarConnectionStartPackets,
  clientRateLimitKey,
  decodeArtifactObjectKey,
  formatWalgreensCheckoutUpstreamError,
  mobileBootstrap,
  readRequestBody,
  readiness,
  retailPrinterCouponPortalEvidenceRoute,
  routes,
  sendArtifact,
  sendHtml,
  sendJson,
  walgreensCheckout,
  walgreensCheckoutCallbackRoute,
  walgreensCheckoutSessionRoute,
  walgreensCheckoutUploadRoute,
  walgreensRateLimited,
  walgreensUploadBodyLimit: WALGREENS_UPLOAD_BODY_LIMIT
});

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

    if (requestUrl.pathname.startsWith("/api/") || requestUrl.pathname === googleCalendarOAuthCallbackRoute) {
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
  await serveApi(request, response, requestUrl);
}

async function serveApi(request, response, requestUrl) {
  const path = requestUrl.pathname;
  if (apiRuntime.mode === "invalid" && path !== "/api/health") {
    sendJson(response, 503, invalidApiRuntimePayload(path));
    return;
  }

  if (path === googleCalendarOAuthCallbackRoute || path === googleCalendarApiOAuthCallbackRoute) {
    await handleGoogleCalendarOAuthCallback(request, response, requestUrl);
    return;
  }

  if (await apiRouteFamilies.handlePreAuthRoute({ path, request, requestUrl, response })) return;

  // Some paths (e.g. /api/admin/card-gallery) expose both a GET view and a
  // POST mutation, so the route lookup must respect the request method.
  const pathRoutes = routes.filter((candidate) => candidate.path === path);
  const route = pathRoutes.find((candidate) => candidate.method === request.method) ?? pathRoutes[0];
  if (!route) {
    sendJson(response, 404, { service: "customcard-api", status: "not-found", path });
    return;
  }

  // Walgreens navigates the customer back via GET or POST after checkout.
  const callbackMethodOverride = route.id === "walgreens-checkout-callback" && request.method === "POST";
  if (request.method !== route.method && !callbackMethodOverride) {
    sendJson(response, 405, { service: "customcard-api", status: "method-not-allowed", path });
    return;
  }

  const authContext = await apiRuntime.authorize(route, request);
  if (!authContext.ok) {
    sendJson(response, authContext.statusCode, authContext.payload);
    return;
  }

  await apiRouteFamilies.handlePostAuthRoute({ path, request, requestUrl, response, route, authContext });
}

function invalidApiRuntimePayload(path) {
  return {
    service: "customcard-api",
    status: "api-runtime-invalid",
    path,
    runtime: apiRuntime.describe(),
    blockers: apiRuntime.validate()
  };
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

function sendHtml(response, statusCode, html) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  applySecurityHeaders(response, "no-store");
  // The checkout callback page needs one small inline script to postMessage
  // back to the opener window; everything else stays locked down.
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; img-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'none'"
  );
  response.end(html);
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  applySecurityHeaders(response, "no-store");
  response.end(JSON.stringify(payload));
}

function sendArtifact(response, artifact) {
  response.statusCode = artifact.statusCode;
  response.setHeader("Content-Type", artifact.contentType ?? "application/octet-stream");
  response.setHeader("Content-Length", String(artifact.body.length));
  applySecurityHeaders(response, artifact.cacheControl ?? "private, max-age=60");
  response.end(artifact.body);
}

function applySecurityHeaders(response, cacheControl) {
  for (const [header, value] of Object.entries(securityHeaders)) {
    response.setHeader(header, value);
  }
  response.setHeader("Cache-Control", cacheControl);
}

function decodeArtifactObjectKey(path) {
  return path
    .slice("/api/artifacts/".length)
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .join("/");
}

function validateApiServerContract() {
  const blockers = [];
  const requiredRoutes = new Set(requiredApiRoutePaths);
  const routePaths = new Set(routes.map((route) => route.path));

  for (const requiredRoute of requiredRoutes) {
    if (!routePaths.has(requiredRoute)) blockers.push(`Missing API route: ${requiredRoute}`);
  }
  for (const route of routes) {
    if (route.audience === "admin" && route.auth !== "admin-session") blockers.push(`Admin route ${route.id} is not gated.`);
    const anonymousHostedCheckout = hostedCheckoutExemptRouteIds.has(route.id) && route.auth === "none";
    if (route.audience === "customer" && route.auth !== "customer-session" && !anonymousHostedCheckout) {
      blockers.push(`Customer route ${route.id} is not gated.`);
    }
  }
  if (readiness.realOrdersEnabled) blockers.push("API readiness cannot enable real orders.");
  if (readiness.safety.externalNetworkCalls) blockers.push("API readiness cannot enable live provider calls.");
  if (readiness.routes.mutations !== readiness.routes.idempotentMutations) {
    blockers.push("Every mutation route must require idempotency.");
  }
  if (readiness.providers.total < 124) blockers.push("Provider API summary is missing expanded adapter coverage.");
  if (readiness.providerGovernance.total !== readiness.providers.total) {
    blockers.push("Provider governance summary must cover every adapter.");
  }
  if (readiness.providerGovernance.fallbackCovered !== readiness.providers.total) {
    blockers.push("Provider governance summary must map every adapter to a ready fallback.");
  }
  if (readiness.providerGovernance.blockers.length > 0) blockers.push("Provider governance summary has blockers.");
  if (readiness.providerGovernance.liveNetworkDefault) blockers.push("Provider governance cannot default to live network calls.");
  if (readiness.providerGovernance.realOrdersEnabled) blockers.push("Provider governance cannot enable real orders.");
  if (readiness.readinessDomains.length !== readinessDomainIds.length) {
    blockers.push("API readiness must expose every Node readiness domain.");
  }
  blockers.push(...validateReadinessDomains());
  if (readiness.production.liveEnabled !== 0) blockers.push("Production readiness cannot enable live components by default.");
  if (readiness.production.total < 13) blockers.push("Production readiness must track every launch gate.");
  if (readiness.externalAudit.total < 15) blockers.push("External audit readiness must track every external proof gap.");
  if (readiness.externalAudit.productionBlocked !== readiness.externalAudit.total) {
    blockers.push("Every external audit readiness item must block production until evidence is attached.");
  }
  if (readiness.externalAudit.publicClaimsAllowed !== 0) blockers.push("External audit readiness cannot allow public production claims.");
  if (readiness.externalAudit.externalArtifactsAttached !== 0) {
    blockers.push("External audit readiness cannot claim attached artifacts in the free local MVP.");
  }
  if (readiness.externalAudit.blockers.length < readiness.externalAudit.total) {
    blockers.push("External audit readiness must expose blockers for every evidence item.");
  }
  if (readiness.e2eCoverage.repoLocalCoveragePercent !== 100) {
    blockers.push("E2E coverage must cover every repo-local reviewer workflow.");
  }
  if (readiness.e2eCoverage.ciGated !== readiness.e2eCoverage.total) {
    blockers.push("Every E2E coverage item must be CI-gated.");
  }
  if (readiness.e2eCoverage.liveProductionProofs !== 0) blockers.push("E2E coverage cannot claim live production proof.");
  if (readiness.e2eCoverage.realOrdersEnabled !== 0) blockers.push("E2E coverage cannot enable real orders.");
  if (readiness.e2eCoverage.externalNetworkCalls !== 0) blockers.push("E2E coverage cannot require live external network calls.");
  if (readiness.e2eCoverage.blockers.length > 0) blockers.push("E2E coverage summary has blockers.");
  if (readiness.aiProviderReadiness.total < 8) blockers.push("AI provider readiness must track text/image launch evidence.");
  if (readiness.aiProviderReadiness.textProviderContracts < 16) {
    blockers.push("AI provider readiness must cover every text provider contract.");
  }
  if (readiness.aiProviderReadiness.imageProviderContracts < 17) {
    blockers.push("AI provider readiness must cover every image provider contract.");
  }
  if (readiness.aiProviderReadiness.localFallbacks < 2) blockers.push("AI provider readiness must keep local fallbacks.");
  if (readiness.aiProviderReadiness.promptAuditRequired < 6) blockers.push("AI provider readiness must require prompt audits.");
  if (readiness.aiProviderReadiness.liveProviderCallsEnabled !== 0) {
    blockers.push("AI provider readiness cannot enable live provider calls.");
  }
  if (readiness.aiProviderReadiness.externalNetworkCalls !== 0) {
    blockers.push("AI provider readiness cannot require live external network calls.");
  }
  if (readiness.aiProviderReadiness.productionTrafficEnabled !== 0) {
    blockers.push("AI provider readiness cannot enable production AI traffic.");
  }
  if (readiness.aiProviderReadiness.blockers.length > 0) blockers.push("AI provider readiness summary has blockers.");
  if (readiness.observability.total < 7) blockers.push("Observability readiness must track telemetry and alerting evidence.");
  if (readiness.observability.providerContracts < 6) {
    blockers.push("Observability readiness must cover all observability provider contracts.");
  }
  if (readiness.observability.alertRoutesRequired < 4) blockers.push("Observability readiness must track alert route drills.");
  if (readiness.observability.liveIngestionEnabled !== 0) blockers.push("Observability readiness cannot enable live ingestion.");
  if (readiness.observability.externalNetworkCalls !== 0) {
    blockers.push("Observability readiness cannot require live external network calls.");
  }
  if (readiness.observability.productionAlertsEnabled !== 0) {
    blockers.push("Observability readiness cannot enable production alerts.");
  }
  if (readiness.observability.blockers.length > 0) blockers.push("Observability readiness summary has blockers.");
  if (readiness.retailFulfillment.total < 8) {
    blockers.push("Retail fulfillment readiness must track direct ordering launch evidence.");
  }
  if (readiness.retailFulfillment.liveVendorAdapterContracts < 6) {
    blockers.push("Retail fulfillment readiness must cover every blocked live vendor adapter.");
  }
  if (readiness.retailFulfillment.manualFallbacks < 2) {
    blockers.push("Retail fulfillment readiness must keep manual print and pricing fallbacks.");
  }
  if (readiness.retailFulfillment.recoveryDrillEvents < 12) {
    blockers.push("Retail fulfillment readiness must track pickup, cancellation, refund, and print QA drills.");
  }
  if (readiness.retailFulfillment.liveQuoteEnabled !== 0) {
    blockers.push("Retail fulfillment readiness cannot enable live quotes.");
  }
  if (readiness.retailFulfillment.directOrderEnabled !== 0) {
    blockers.push("Retail fulfillment readiness cannot enable direct retail orders.");
  }
  if (readiness.retailFulfillment.externalNetworkCalls !== 0) {
    blockers.push("Retail fulfillment readiness cannot require live external network calls.");
  }
  if (readiness.retailFulfillment.realPaymentsEnabled !== 0) {
    blockers.push("Retail fulfillment readiness cannot enable real payment/refund traffic.");
  }
  if (readiness.retailFulfillment.physicalCertificationAttached !== 0) {
    blockers.push("Retail fulfillment readiness cannot claim physical print certification.");
  }
  if (readiness.retailFulfillment.blockers.length > 0) blockers.push("Retail fulfillment readiness summary has blockers.");
  if (readiness.paymentReadiness.total < 8) blockers.push("Payment readiness must track live charge and refund launch evidence.");
  if (readiness.paymentReadiness.paymentProviderContracts < 4) {
    blockers.push("Payment readiness must cover every sandbox payment provider contract.");
  }
  if (readiness.paymentReadiness.localFallbacks < 1) blockers.push("Payment readiness must keep the no-payment fallback.");
  if (readiness.paymentReadiness.ledgerEvents < 20) blockers.push("Payment readiness must track ledger, refund, webhook, and settlement events.");
  if (readiness.paymentReadiness.liveChargesEnabled !== 0) blockers.push("Payment readiness cannot enable live charges.");
  if (readiness.paymentReadiness.liveRefundsEnabled !== 0) blockers.push("Payment readiness cannot enable live refunds.");
  if (readiness.paymentReadiness.liveCaptureEnabled !== 0) blockers.push("Payment readiness cannot enable live captures.");
  if (readiness.paymentReadiness.externalNetworkCalls !== 0) {
    blockers.push("Payment readiness cannot require live external network calls.");
  }
  if (readiness.paymentReadiness.cardDataStored !== 0) blockers.push("Payment readiness cannot store card data.");
  if (readiness.paymentReadiness.pciScopeApproved !== 0) blockers.push("Payment readiness cannot claim PCI approval.");
  if (readiness.paymentReadiness.blockers.length > 0) blockers.push("Payment readiness summary has blockers.");
  if (readiness.mobileRenderReadiness.total < 8) blockers.push("Mobile render readiness must track native render proof evidence.");
  if (readiness.mobileRenderReadiness.repoLocalReady < 5) blockers.push("Mobile render readiness must keep source-render contracts ready.");
  if (readiness.mobileRenderReadiness.viewportProfiles < 4) blockers.push("Mobile render readiness must cover small, standard, large, and tablet portrait viewports.");
  if (readiness.mobileRenderReadiness.nativeBuildProfiles < 3) blockers.push("Mobile render readiness must cover development, preview, and production native profiles.");
  if (readiness.mobileRenderReadiness.emulatorRenderProofs !== 0) blockers.push("Mobile render readiness cannot claim emulator render proof.");
  if (readiness.mobileRenderReadiness.signedArtifacts !== 0) blockers.push("Mobile render readiness cannot claim signed native artifacts.");
  if (readiness.mobileRenderReadiness.externalNetworkCalls !== 0) blockers.push("Mobile render readiness cannot require live external network calls.");
  if (readiness.mobileRenderReadiness.realOrdersEnabled !== 0) blockers.push("Mobile render readiness cannot enable real orders.");
  if (readiness.mobileRenderReadiness.liveProviderCalls !== 0) blockers.push("Mobile render readiness cannot enable live provider calls.");
  if (readiness.mobileRenderReadiness.blockers.length > 0) blockers.push("Mobile render readiness summary has blockers.");
  if (readiness.hostedApiReadiness.total < 8) blockers.push("Hosted API readiness must track Vercel and hosted DB proof evidence.");
  if (readiness.hostedApiReadiness.repoLocalReady < 2) blockers.push("Hosted API readiness must keep deployment and serverless contracts ready.");
  if (readiness.hostedApiReadiness.hostedDbRequired < 5) blockers.push("Hosted API readiness must identify hosted DB proof requirements.");
  if (readiness.hostedApiReadiness.publicRouteProofRequired < 3) {
    blockers.push("Hosted API readiness must identify public hosted route proof requirements.");
  }
  if (readiness.hostedApiReadiness.requiredEnvVars < 6) blockers.push("Hosted API readiness must track required hosted env vars.");
  if (readiness.hostedApiReadiness.envSyncProofs !== 0) blockers.push("Hosted API readiness cannot claim hosted env sync proof.");
  if (readiness.hostedApiReadiness.hostedDbProofs !== 0) blockers.push("Hosted API readiness cannot claim hosted DB connectivity.");
  if (readiness.hostedApiReadiness.publicRouteProofs !== 0) blockers.push("Hosted API readiness cannot claim public DB-backed route proof.");
  if (readiness.hostedApiReadiness.hostedTokenVerificationProofs !== 0) {
    blockers.push("Hosted API readiness cannot claim hosted token verification proof.");
  }
  if (readiness.hostedApiReadiness.backupPolicies !== 0) blockers.push("Hosted API readiness cannot claim hosted backup policy.");
  if (readiness.hostedApiReadiness.deploymentProtectionBypasses !== 0) {
    blockers.push("Hosted API readiness cannot claim deployment protection bypass proof.");
  }
  if (readiness.hostedApiReadiness.externalNetworkCalls !== 0) {
    blockers.push("Hosted API readiness cannot require live external network calls.");
  }
  if (readiness.hostedApiReadiness.realOrdersEnabled !== 0) blockers.push("Hosted API readiness cannot enable real orders.");
  if (readiness.hostedApiReadiness.liveProviderCalls !== 0) blockers.push("Hosted API readiness cannot enable live provider calls.");
  if (readiness.hostedApiReadiness.blockers.length > 0) blockers.push("Hosted API readiness summary has blockers.");
  if (readiness.reviewerDbSeedReadiness.total < 8) {
    blockers.push("Reviewer DB seed readiness must track hosted reviewer seed proof evidence.");
  }
  if (readiness.reviewerDbSeedReadiness.repoLocalReady < 3) {
    blockers.push("Reviewer DB seed readiness must keep seed plan, token, and SQL preview contracts ready.");
  }
  if (readiness.reviewerDbSeedReadiness.tableContracts < 14) {
    blockers.push("Reviewer DB seed readiness must cover all reviewer seed tables.");
  }
  if (readiness.reviewerDbSeedReadiness.requiredEnvVars < 6) {
    blockers.push("Reviewer DB seed readiness must track required hosted env vars.");
  }
  if (readiness.reviewerDbSeedReadiness.hostedDatabaseRequired < 5) {
    blockers.push("Reviewer DB seed readiness must identify hosted database proof requirements.");
  }
  if (readiness.reviewerDbSeedReadiness.hostedSeedExecutionRequired < 3) {
    blockers.push("Reviewer DB seed readiness must identify hosted seed execution proof requirements.");
  }
  if (readiness.reviewerDbSeedReadiness.hostedTokenProbeRequired < 4) {
    blockers.push("Reviewer DB seed readiness must identify hosted token probe requirements.");
  }
  if (readiness.reviewerDbSeedReadiness.hostedSeedProofs !== 0) {
    blockers.push("Reviewer DB seed readiness cannot claim hosted seed execution proof.");
  }
  if (readiness.reviewerDbSeedReadiness.hostedTokenProbeProofs !== 0) {
    blockers.push("Reviewer DB seed readiness cannot claim hosted token probe proof.");
  }
  if (readiness.reviewerDbSeedReadiness.vercelEnvSyncProofs !== 0) {
    blockers.push("Reviewer DB seed readiness cannot claim Vercel env sync proof.");
  }
  if (readiness.reviewerDbSeedReadiness.destructiveLiveMutations !== 0) {
    blockers.push("Reviewer DB seed readiness cannot enable destructive live mutations.");
  }
  if (readiness.reviewerDbSeedReadiness.externalNetworkCalls !== 0) {
    blockers.push("Reviewer DB seed readiness cannot require live external network calls.");
  }
  if (readiness.reviewerDbSeedReadiness.liveProviderCalls !== 0) {
    blockers.push("Reviewer DB seed readiness cannot enable live provider calls.");
  }
  if (readiness.reviewerDbSeedReadiness.realOrdersEnabled !== 0) {
    blockers.push("Reviewer DB seed readiness cannot enable real orders.");
  }
  if (readiness.reviewerDbSeedReadiness.blockers.length > 0) {
    blockers.push("Reviewer DB seed readiness summary has blockers.");
  }
  if (readiness.cloudArtifactProofReadiness.total < 8) {
    blockers.push("Cloud artifact proof readiness must track applied bucket and IAM proof evidence.");
  }
  if (readiness.cloudArtifactProofReadiness.repoLocalReady < 2) {
    blockers.push("Cloud artifact proof readiness must keep static IaC and plan-review contracts ready.");
  }
  if (readiness.cloudArtifactProofReadiness.appliedCloudRequired < 6) {
    blockers.push("Cloud artifact proof readiness must identify applied cloud proof requirements.");
  }
  if (readiness.cloudArtifactProofReadiness.terraformFileContracts < 3) {
    blockers.push("Cloud artifact proof readiness must cover artifact-store Terraform files.");
  }
  if (readiness.cloudArtifactProofReadiness.envOutputContracts < 6) {
    blockers.push("Cloud artifact proof readiness must track runtime object-store env outputs.");
  }
  if (readiness.cloudArtifactProofReadiness.terraformApplyExecutions !== 0) {
    blockers.push("Cloud artifact proof readiness cannot claim Terraform apply execution.");
  }
  if (readiness.cloudArtifactProofReadiness.appliedBucketArnProofs !== 0) {
    blockers.push("Cloud artifact proof readiness cannot claim applied bucket ARN proof.");
  }
  if (readiness.cloudArtifactProofReadiness.iamPolicyOutputProofs !== 0) {
    blockers.push("Cloud artifact proof readiness cannot claim IAM policy output proof.");
  }
  if (readiness.cloudArtifactProofReadiness.signedUrlProbeProofs !== 0) {
    blockers.push("Cloud artifact proof readiness cannot claim signed URL cloud probe proof.");
  }
  if (readiness.cloudArtifactProofReadiness.accessLogProofs !== 0) {
    blockers.push("Cloud artifact proof readiness cannot claim cloud access log proof.");
  }
  if (readiness.cloudArtifactProofReadiness.secretSyncProofs !== 0) {
    blockers.push("Cloud artifact proof readiness cannot claim secret manager sync proof.");
  }
  if (readiness.cloudArtifactProofReadiness.restoreDrillProofs !== 0) {
    blockers.push("Cloud artifact proof readiness cannot claim retention restore drill proof.");
  }
  if (readiness.cloudArtifactProofReadiness.externalNetworkCalls !== 0) {
    blockers.push("Cloud artifact proof readiness cannot require live external network calls.");
  }
  if (readiness.cloudArtifactProofReadiness.liveProviderCalls !== 0) {
    blockers.push("Cloud artifact proof readiness cannot enable live provider calls.");
  }
  if (readiness.cloudArtifactProofReadiness.realOrdersEnabled !== 0) {
    blockers.push("Cloud artifact proof readiness cannot enable real orders.");
  }
  if (readiness.cloudArtifactProofReadiness.blockers.length > 0) {
    blockers.push("Cloud artifact proof readiness summary has blockers.");
  }
  if (readiness.businessEngagementReadiness.total < 8) {
    blockers.push("Business engagement readiness must track CRM lifecycle campaign evidence.");
  }
  if (readiness.businessEngagementReadiness.crmAdapterContracts < 14) {
    blockers.push("Business engagement readiness must cover CSV plus popular CRM lifecycle adapters.");
  }
  if (readiness.businessEngagementReadiness.workflowAdapterContracts < 11) {
    blockers.push("Business engagement readiness must cover workflow payload adapters.");
  }
  if (readiness.businessEngagementReadiness.notificationAdapterContracts < 16) {
    blockers.push("Business engagement readiness must cover customer message channel adapters.");
  }
  if (readiness.businessEngagementReadiness.lifecycleTriggerKinds !== 3) {
    blockers.push("Business engagement readiness must cover birthday, purchase-anniversary, and warranty-anniversary triggers.");
  }
  if (readiness.businessEngagementReadiness.liveMessagesEnabled !== 0) {
    blockers.push("Business engagement readiness cannot enable live customer messages.");
  }
  if (readiness.businessEngagementReadiness.crmWritesEnabled !== 0) {
    blockers.push("Business engagement readiness cannot enable CRM writes.");
  }
  if (readiness.businessEngagementReadiness.externalNetworkCalls !== 0) {
    blockers.push("Business engagement readiness cannot require live external network calls.");
  }
  if (readiness.businessEngagementReadiness.realOrdersEnabled !== 0) {
    blockers.push("Business engagement readiness cannot enable real orders.");
  }
  if (readiness.businessEngagementReadiness.blockers.length > 0) {
    blockers.push("Business engagement readiness summary has blockers.");
  }
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
  if (!readiness.persistence.providerUsageLedgerTable) blockers.push("API readiness is missing provider usage ledger persistence.");
  if (!readiness.persistence.appendOnlyAudit) blockers.push("API readiness must use append-only audit persistence.");
  if (!readiness.persistence.relationshipMemoryRepository) blockers.push("API readiness is missing relationship-memory repository persistence.");
  if (!readiness.persistence.draftStateRepository) blockers.push("API readiness is missing draft-state repository persistence.");
  if (!readiness.persistence.importPreviewRepository) blockers.push("API readiness is missing import-preview repository persistence.");
  if (!readiness.persistence.cardProjectRepository) blockers.push("API readiness is missing card-project repository persistence.");
  if (!readiness.persistence.manualVendorHandoffRepository) {
    blockers.push("API readiness is missing manual vendor handoff repository persistence.");
  }
  if (!readiness.persistence.dataRequestRepository) blockers.push("API readiness is missing data-request repository persistence.");
  if (!readiness.persistence.renderPacketRepository) blockers.push("API readiness is missing render-packet repository persistence.");
  if (!readiness.persistence.renderPacketArtifacts) blockers.push("API readiness is missing render-packet artifact manifests.");
  if (!readiness.persistence.signedArtifactUrls) blockers.push("API readiness is missing signed artifact URL contracts.");
  if (!readiness.persistence.localBrowserState?.audited) blockers.push("API readiness is missing local browser persistence audit.");
  if ((readiness.persistence.localBrowserState?.localStorageKeys ?? []).length !== 0) {
    blockers.push("API readiness must not require browser localStorage keys.");
  }
  if (readiness.persistence.localBrowserState?.dbRequiredItems !== 0) {
    blockers.push("API readiness must keep browser-local customer data migration count at zero.");
  }
  blockers.push(...apiRuntime.validate());

  return blockers;
}

function buildMutationContractPayload(route, bodyText, options = {}) {
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
    const projectId = String(requestBody.projectId ?? "").trim();
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
    const opportunityId = safeContractId(requestBody.opportunityId, "");
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

  if (route.id === "customer-draft-state-save") {
    const draftStateId = safeContractId(requestBody.draftStateId, `draft-state-${stableContractHash(JSON.stringify(requestBody.draftInput ?? {})).slice(0, 8)}`);
    return {
      ...basePayload,
      draftStateId,
      updatedAtIso: safeTimestamp(requestBody.updatedAtIso, new Date().toISOString()),
      draftState: {
        draftStateId,
        status: safeContractDraftStatus(requestBody.status),
        draftInput: sanitizeContractDraftInput(requestBody.draftInput),
        opportunityId: safeContractId(requestBody.opportunityId, ""),
        opportunityDecision: safeContractOpportunityDecision(requestBody.opportunityDecision),
        vendorId: safeContractVendorId(requestBody.vendorId),
        localeCode: safeLocale(requestBody.localeCode ?? requestBody.locale)
      },
      repository: {
        table: "draft_states",
        runtimeMode: "contract",
        persisted: false,
        browserLocalState: false,
        rawContentStored: false
      }
    };
  }

  if (route.id === "relationship-memories") {
    const recipientName = safeContractText(requestBody.recipientName, "");
    const text = safeContractText(requestBody.text ?? requestBody.note, "");
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
    const resolvedImport = resolveImportPreviewMetadata(requestBody);
    const payload = resolvedImport.metadataOnlyPayload ?? {};
    const sourceKind = safeContractId(resolvedImport.sourceKind, "");
    const title = safeContractText(payload.title, "");
    const recipientName = safeContractText(payload.recipientName ?? payload.recipient_hint ?? payload.recipientHint, "");
    const startsAt = safeTimestamp(payload.startsAt ?? payload.starts_at, "");
    const eventId = safeContractId(requestBody.eventId, `event-${stableContractHash(`${sourceKind}:${title}:${startsAt}`).slice(0, 8)}`);
    const opportunityId = safeContractId(requestBody.opportunityId, `opportunity-${stableContractHash(`${eventId}:${recipientName}`).slice(0, 8)}`);
    return {
      ...basePayload,
      rawContentStored: false,
      warnings: resolvedImport.warnings,
      importParser: {
        parsedFromRawText: resolvedImport.parsedFromRawText,
        rawTextField: resolvedImport.rawTextField,
        rawContentStored: false,
        evidenceSummary: resolvedImport.evidenceSummary
      },
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

  if (route.id === "calendar-connection-start") {
    const requestedChoiceId = safeCalendarChoiceId(requestBody.calendarChoiceId ?? requestBody.choiceId ?? requestBody.providerId);
    const startPacket = buildCalendarConnectionStartPacket(requestedChoiceId);
    const googleStart =
      requestedChoiceId === "google-calendar-events"
        ? buildGoogleCalendarConnectionStart(startPacket, {
            authContext: options.authContext,
            env: options.env ?? process.env,
            requestBody,
            requestUrl: options.requestUrl
          })
        : null;
    const effectiveStartPacket = googleStart?.startPacket ?? startPacket;
    return {
      ...basePayload,
      status: googleStart?.status ?? (effectiveStartPacket.canStartNow ? "ready-local" : "blocked"),
      requestedChoiceId,
      startPacket: effectiveStartPacket,
      serverOwned: true,
      clientMayPrepareProviderRequest: false,
      providerRequestUrl: googleStart?.providerRequestUrl ?? null,
      networkRequestPrepared: googleStart?.networkRequestPrepared ?? false,
      credentialStorageEnabled: false,
      externalNetworkCalls: googleStart?.externalNetworkCalls ?? false,
      realOrdersEnabled: false,
      rawContentStored: false,
      nextApiRoute: effectiveStartPacket.nextApiRoute,
      blockers: googleStart?.blockers ?? effectiveStartPacket.missingRepoEvidenceIds,
      missingEnv: googleStart?.missingEnv ?? [],
      oauth: googleStart?.oauth,
      repository: {
        tables: ["auth_sessions", "idempotency_keys", "audit_log"],
        runtimeMode: "contract",
        persisted: false,
        rawContentStored: false,
        providerCredentialsStored: false
      }
    };
  }

  if (route.id === "retail-printer-operation-start") {
    const operationStart = buildRetailPrinterOperationStartResponse({
      vendorId: requestBody.vendorId ?? requestBody.providerId ?? requestBody.selectedVendorId,
      operation: requestBody.operation ?? requestBody.operationKind
    });
    return {
      ...basePayload,
      ...operationStart,
      repository: {
        tables: ["auth_sessions", "idempotency_keys", "audit_log"],
        runtimeMode: "contract",
        persisted: false,
        providerPayloadPrepared: false,
        realOrdersEnabled: false
      }
    };
  }

  if (route.id === "retail-printer-coupon-portal-evidence") {
    return {
      ...basePayload,
      ...buildRetailPrinterCouponPortalEvidenceResponse(requestBody)
    };
  }

  if (route.id === "manual-vendor-handoff") {
    const projectId = safeContractId(requestBody.projectId ?? requestBody.cardProjectId, "");
    const renderPacketId = safeContractId(requestBody.renderPacketId, "");
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
          url: `contract-only://customcard/artifacts/${encodeURIComponent(renderPacketId)}`
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
    const region = safeContractText(requestBody.region, "").slice(0, 12);
    return {
      ...basePayload,
      dataRequestId,
      requestType,
      requestStatus: safeDataRequestStatus(requestBody.status),
      dueAt,
      consentRecordId: `consent-${stableContractHash(`${dataRequestId}:data-request`).slice(0, 8)}`,
      consentGranted: safeBoolean(requestBody.consentGranted ?? requestBody.requestConfirmed),
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
        "provider_call_events",
        "audit_log"
      ],
      rows: 17,
      signedArtifactUrls: true
    };
  }

  return basePayload;
}

const googleCalendarOAuthScopeUri = "https://www.googleapis.com/auth/calendar.events.readonly";
const googleCalendarOAuthCallbackRoute = "/oauth/callback";
const googleCalendarApiOAuthCallbackRoute = "/api/oauth/callback";
const googleCalendarOAuthRequiredEnv = [
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "GOOGLE_OAUTH_STATE_SECRET",
  "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY"
];

function buildGoogleCalendarConnectionStart(
  basePacket,
  { authContext = { role: "customer", userId: "contract-customer", sessionId: "contract-session" }, env = process.env, requestBody = {}, requestUrl } = {}
) {
  const requestOrigin = requestUrl instanceof URL ? requestUrl.origin : "http://localhost:5173";
  const redirectUri = usableEnvValue(env.GOOGLE_OAUTH_REDIRECT_URI) || usableEnvValue(env.GOOGLE_CALENDAR_REDIRECT_URI) || "";
  const config = {
    clientId: usableEnvValue(env.GOOGLE_OAUTH_CLIENT_ID),
    clientSecret: usableEnvValue(env.GOOGLE_OAUTH_CLIENT_SECRET),
    redirectUri,
    stateSecret: strongSecretValue(env.GOOGLE_OAUTH_STATE_SECRET),
    tokenEncryptionKey: strongSecretValue(env.GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY)
  };
  const missingEnv = googleCalendarOAuthRequiredEnv.filter((name) => {
    if (name === "GOOGLE_OAUTH_CLIENT_ID") return !config.clientId;
    if (name === "GOOGLE_OAUTH_CLIENT_SECRET") return !config.clientSecret;
    if (name === "GOOGLE_OAUTH_REDIRECT_URI") return !config.redirectUri;
    if (name === "GOOGLE_OAUTH_STATE_SECRET") return !config.stateSecret;
    if (name === "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY") return !config.tokenEncryptionKey;
    return true;
  });

  if (missingEnv.length > 0) {
    const blockers = [
      ...missingEnv.map((name) => `missing-env:${name}`),
      ...basePacket.missingRepoEvidenceIds
    ];
    return {
      status: "blocked",
      providerRequestUrl: null,
      networkRequestPrepared: false,
      externalNetworkCalls: false,
      missingEnv,
      blockers,
      startPacket: {
        ...basePacket,
        requiredEnv: googleCalendarOAuthRequiredEnv,
        missingRepoEvidenceIds: blockers,
        blockedReason: `Missing Google OAuth env: ${missingEnv.join(", ")}.`
      }
    };
  }

  const returnTo = safeReturnToUrl(requestBody.returnTo, requestOrigin);
  const statePayload = buildOAuthStatePayload("google-calendar-events", returnTo, {
    authContext
  });
  const state = encodeOAuthState(statePayload, env);
  const codeVerifier = oauthCodeVerifier(statePayload, env);
  const codeChallenge = oauthCodeChallenge(codeVerifier);
  const providerRequestUrl = buildGoogleCalendarAuthorizationUrl({
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    state,
    codeChallenge
  });

  return {
    status: "oauth-ready",
    providerRequestUrl,
    networkRequestPrepared: true,
    externalNetworkCalls: true,
    missingEnv: [],
    blockers: [],
    oauth: {
      provider: "google-calendar",
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      redirectUri: config.redirectUri,
      returnTo,
      state,
      scopes: [googleCalendarOAuthScopeUri],
      tokenExchangeRequired: true,
      pkce: {
        codeChallengeMethod: "S256"
      },
      credentialStorageEnabled: false,
      rawContentStored: false
    },
    startPacket: {
      ...basePacket,
      startMode: "oauth-provider-redirect",
      canStartNow: true,
      liveOAuthEnabled: true,
      networkRequestPrepared: true,
      externalNetworkCalls: true,
      providerRequestUrl,
      nextApiRoute: null,
      requiredEnv: googleCalendarOAuthRequiredEnv,
      blockingEvidenceIds: [],
      missingRepoEvidenceIds: [],
      blockedReason: undefined
    }
  };
}

function buildGoogleCalendarAuthorizationUrl({ clientId, redirectUri, state, codeChallenge }) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", googleCalendarOAuthScopeUri);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  return url.toString();
}

/**
 * Connected-state lifecycle for Google Calendar. Returns true when the request
 * was fully handled (already connected, scan-again, needs-reconnect) so the
 * generic OAuth-redirect start flow only runs for first connections and
 * explicit reconnects.
 */
async function handleCalendarConnectionLifecycle({ authContext, bodyText, response }) {
  const body = parseJsonBodySafe(bodyText);
  const requestedChoiceId = safeCalendarChoiceId(body.calendarChoiceId ?? body.choiceId ?? body.providerId);
  if (requestedChoiceId !== "google-calendar-events") return false;
  const mode = String(body.mode ?? "").trim().toLowerCase();
  const forceReconnect = body.forceReconnect === true || mode === "reconnect";
  if (forceReconnect) return false;

  let connection;
  try {
    connection = await apiRuntime.readProviderConnection?.({ authContext, provider: "google_calendar" });
  } catch {
    connection = undefined;
  }
  if (!connection || connection.status !== "connected") return false;

  const credentialStorageEnabled = Boolean(connection.encryptedRefreshToken);

  if (mode === "scan") {
    if (!credentialStorageEnabled) {
      sendJson(response, 200, {
        service: "customcard-api",
        status: "google-calendar-needs-reconnect",
        needsReconnect: true,
        reconnectReason: "missing-refresh-token",
        providerRequestUrl: null,
        redirected: false,
        rawContentStored: false
      });
      return true;
    }
    try {
      const refreshToken = decryptTokenSecret(connection.encryptedRefreshToken, process.env);
      const token = await refreshGoogleAccessToken(refreshToken, process.env);
      const eventsPayload = await fetchGoogleCalendarEvents(token.accessToken, process.env);
      const record = buildGoogleCalendarImportRecord({
        authContext,
        encryptedRefreshToken: connection.encryptedRefreshToken,
        eventsPayload,
        grantedScopes: connection.scopes ?? []
      });
      const persistence = await apiRuntime.persistGoogleCalendarImport({ authContext, record });
      sendJson(response, 200, {
        service: "customcard-api",
        status: "google-calendar-scan-complete",
        scanned: true,
        importedEventCount: record.importedEvents.length,
        opportunityCount: record.cardOpportunities.length,
        providerRequestUrl: null,
        redirected: false,
        credentialStorageEnabled: true,
        rawContentStored: false,
        ...persistence.payload
      });
    } catch (error) {
      sendJson(response, 200, {
        service: "customcard-api",
        status: "google-calendar-needs-reconnect",
        needsReconnect: true,
        reconnectReason: "refresh-token-rejected",
        detail: error instanceof Error ? error.message : "Google Calendar scan failed.",
        providerRequestUrl: null,
        redirected: false,
        rawContentStored: false
      });
    }
    return true;
  }

  // Already connected and no reconnect requested: do not redirect to Google.
  sendJson(response, 200, {
    service: "customcard-api",
    status: "google-calendar-already-connected",
    alreadyConnected: true,
    providerRequestUrl: null,
    redirected: false,
    credentialStorageEnabled,
    canScanAgain: credentialStorageEnabled,
    nextApiRoute: "/api/customer/connections",
    rawContentStored: false
  });
  return true;
}

function parseJsonBodySafe(bodyText) {
  if (!bodyText) return {};
  try {
    return JSON.parse(bodyText);
  } catch {
    return {};
  }
}

async function handleGoogleCalendarOAuthCallback(request, response, requestUrl) {
  if (request.method !== "GET") {
    sendJson(response, 405, { service: "customcard-api", status: "method-not-allowed", path: googleCalendarOAuthCallbackRoute });
    return;
  }

  const stateResult = verifyOAuthState(requestUrl.searchParams.get("state"), process.env);
  if (!stateResult.ok) {
    sendJson(response, 400, {
      service: "customcard-api",
      status: "invalid-oauth-state",
      detail: stateResult.detail,
      rawContentStored: false
    });
    return;
  }

  const returnTo = stateResult.payload.returnTo;
  const providerError = requestUrl.searchParams.get("error");
  if (providerError) {
    sendCalendarCallbackResult(request, response, returnTo, 400, {
      service: "customcard-api",
      status: "google-calendar-oauth-error",
      detail: safeContractText(providerError, "Google OAuth returned an error."),
      rawContentStored: false
    });
    return;
  }

  const code = String(requestUrl.searchParams.get("code") ?? "").trim();
  if (!code) {
    sendCalendarCallbackResult(request, response, returnTo, 400, {
      service: "customcard-api",
      status: "missing-oauth-code",
      detail: "Google OAuth callback did not include an authorization code.",
      rawContentStored: false
    });
    return;
  }

  try {
    const token = await exchangeGoogleOAuthCode(code, process.env, {
      codeVerifier: oauthCodeVerifier(stateResult.payload, process.env)
    });
    const eventsPayload = await fetchGoogleCalendarEvents(token.accessToken, process.env);
    const authContext = {
      role: "customer",
      userId: stateResult.payload.userId,
      sessionId: stateResult.payload.sessionId
    };
    const record = buildGoogleCalendarImportRecord({
      authContext,
      encryptedRefreshToken: token.refreshToken ? encryptTokenSecret(token.refreshToken, process.env) : "",
      eventsPayload,
      grantedScopes: token.scope.split(/[ ,]+/).filter(Boolean)
    });
    const persistence = await apiRuntime.persistGoogleCalendarImport({ authContext, record });
    sendCalendarCallbackResult(request, response, returnTo, 200, {
      service: "customcard-api",
      status: "google-calendar-connected",
      importedEventCount: record.importedEvents.length,
      opportunityCount: record.cardOpportunities.length,
      credentialStorageEnabled: Boolean(record.providerConnection.encryptedRefreshToken),
      rawContentStored: false,
      ...persistence.payload
    });
  } catch (error) {
    sendCalendarCallbackResult(request, response, returnTo, 502, {
      service: "customcard-api",
      status: "google-calendar-import-failed",
      detail: error instanceof Error ? error.message : "Google Calendar import failed.",
      rawContentStored: false
    });
  }
}

function sendCalendarCallbackResult(request, response, returnTo, statusCode, payload) {
  if (wantsJson(request)) {
    sendJson(response, statusCode, payload);
    return;
  }

  const redirectUrl = new URL(returnTo);
  redirectUrl.searchParams.set("calendarConnection", payload.status === "google-calendar-connected" ? "connected" : "error");
  if (payload.importedEventCount !== undefined) redirectUrl.searchParams.set("calendarImported", String(payload.importedEventCount));
  if (payload.status !== "google-calendar-connected") {
    redirectUrl.searchParams.set("calendarError", safeContractText(payload.detail ?? payload.status, "Calendar connection failed."));
  }
  response.statusCode = 303;
  response.setHeader("Location", redirectUrl.toString());
  applySecurityHeaders(response, "no-store");
  response.end();
}

function wantsJson(request) {
  return String(request.headers?.accept ?? "").includes("application/json");
}

function buildOAuthStatePayload(choiceId, returnTo, { authContext, nowMs = Date.now() }) {
  return {
    version: 1,
    provider: "google-calendar",
    choiceId,
    userId: authContext.userId,
    sessionId: authContext.sessionId,
    returnTo,
    issuedAtMs: nowMs,
    expiresAtMs: nowMs + 15 * 60_000,
    nonce: randomBytes(18).toString("base64url")
  };
}

function encodeOAuthState(payload, env) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signOAuthState(encoded, env)}`;
}

function verifyOAuthState(value, env, nowMs = Date.now()) {
  const text = String(value ?? "");
  const [encoded, signature] = text.split(".");
  if (!encoded || !signature) return { ok: false, detail: "OAuth state is missing or malformed." };
  let expected;
  try {
    expected = signOAuthState(encoded, env);
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : "OAuth state cannot be verified."
    };
  }
  if (!safeEqualText(signature, expected)) return { ok: false, detail: "OAuth state signature did not match." };
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (payload.provider !== "google-calendar" || payload.choiceId !== "google-calendar-events") {
      return { ok: false, detail: "OAuth state provider did not match Google Calendar." };
    }
    if (!payload.userId || !payload.returnTo || Number(payload.expiresAtMs) < nowMs) {
      return { ok: false, detail: "OAuth state is expired or incomplete." };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, detail: "OAuth state payload could not be decoded." };
  }
}

function signOAuthState(encodedPayload, env) {
  return createHmac("sha256", oauthStateSecret(env)).update(encodedPayload).digest("base64url");
}

function oauthCodeVerifier(payload, env) {
  return createHmac("sha256", oauthStateSecret(env))
    .update(`pkce:${payload.provider}:${payload.choiceId}:${payload.userId}:${payload.sessionId}:${payload.issuedAtMs}:${payload.nonce}`)
    .digest("base64url");
}

function oauthCodeChallenge(codeVerifier) {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

function safeEqualText(actual, expected) {
  const actualBuffer = Buffer.from(String(actual ?? ""));
  const expectedBuffer = Buffer.from(String(expected ?? ""));
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function oauthStateSecret(env) {
  const secret = strongSecretValue(env.GOOGLE_OAUTH_STATE_SECRET);
  if (!secret) throw new Error("GOOGLE_OAUTH_STATE_SECRET must be at least 32 characters.");
  return secret;
}

async function exchangeGoogleOAuthCode(code, env, { codeVerifier, fetchImpl = globalThis.fetch } = {}) {
  const redirectUri = usableEnvValue(env.GOOGLE_OAUTH_REDIRECT_URI) || usableEnvValue(env.GOOGLE_CALENDAR_REDIRECT_URI);
  const clientId = usableEnvValue(env.GOOGLE_OAUTH_CLIENT_ID);
  const clientSecret = usableEnvValue(env.GOOGLE_OAUTH_CLIENT_SECRET);
  const missingEnv = [];
  if (!clientId) missingEnv.push("GOOGLE_OAUTH_CLIENT_ID");
  if (!clientSecret) missingEnv.push("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!redirectUri) missingEnv.push("GOOGLE_OAUTH_REDIRECT_URI");
  if (missingEnv.length > 0) throw new Error(`Missing Google OAuth env: ${missingEnv.join(", ")}.`);

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  });
  if (codeVerifier) body.set("code_verifier", codeVerifier);
  const response = await fetchImpl(usableEnvValue(env.GOOGLE_OAUTH_TOKEN_ENDPOINT) || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(safeContractText(payload.error_description ?? payload.error, "Google token exchange failed."));
  }
  const accessToken = String(payload.access_token ?? "").trim();
  if (!accessToken) throw new Error("Google token exchange did not return an access token.");
  const scope = String(payload.scope ?? googleCalendarOAuthScopeUri);
  if (!scope.split(/[ ,]+/).includes(googleCalendarOAuthScopeUri)) {
    throw new Error("Google token response did not grant the Calendar events readonly scope.");
  }
  return {
    accessToken,
    refreshToken: String(payload.refresh_token ?? "").trim(),
    expiresIn: Number(payload.expires_in ?? 0),
    scope
  };
}

async function fetchGoogleCalendarEvents(accessToken, env, fetchImpl = globalThis.fetch) {
  const url = googleCalendarEventsUrl(env);
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(safeContractText(payload.error?.message ?? payload.error_description ?? payload.error, "Google Calendar events import failed."));
  }
  return payload;
}

function googleCalendarEventsUrl(env, now = new Date()) {
  const base = usableEnvValue(env.GOOGLE_CALENDAR_EVENTS_ENDPOINT) ||
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(usableEnvValue(env.GOOGLE_CALENDAR_ID) || "primary")}/events`;
  const url = new URL(base);
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000).toISOString();
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("maxResults", String(safeCalendarMaxResults(env.GOOGLE_CALENDAR_IMPORT_MAX_RESULTS)));
  return url.toString();
}

function safeCalendarMaxResults(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 10;
  return Math.max(1, Math.min(25, Math.floor(number)));
}

function buildGoogleCalendarImportRecord({ authContext, encryptedRefreshToken, eventsPayload, grantedScopes }) {
  const rawEvents = Array.isArray(eventsPayload.items) ? eventsPayload.items.slice(0, 25) : [];
  const connectionId = `connection-${stableContractHash(`${authContext.userId}:google-calendar-events`).slice(0, 12)}`;
  const importedEvents = [];
  const cardOpportunities = [];

  for (const [index, event] of rawEvents.entries()) {
    const normalized = normalizeGoogleCalendarEvent(event, authContext.userId, index);
    if (!normalized) continue;
    importedEvents.push({
      id: normalized.eventId,
      title: normalized.title,
      startsAt: normalized.startsAt,
      timezone: normalized.timezone,
      sourceEvidence: normalized.sourceEvidence,
      recipientHint: normalized.recipientHint
    });
    cardOpportunities.push({
      id: normalized.opportunityId,
      eventId: normalized.eventId,
      recipientName: normalized.recipientHint,
      leadTimeHours: normalized.leadTimeHours,
      confidence: normalized.confidence,
      decision: "pending",
      evidence: {
        sourceKind: "google-calendar-events",
        sourceEvidence: normalized.sourceEvidence,
        googleEventHash: normalized.googleEventHash,
        rawContentStored: false,
        metadataOnly: true
      }
    });
  }

  return {
    providerConnection: {
      id: connectionId,
      provider: "google_calendar",
      status: "connected",
      scopes: grantedScopes.length > 0 ? grantedScopes : [googleCalendarOAuthScopeUri],
      adapterVersion: "google-calendar-events-v1",
      encryptedRefreshToken,
      metadataSchema: {
        kind: "calendar_event_metadata",
        rawContentStored: false,
        metadataOnly: true,
        importedFields: ["id_hash", "summary", "start", "timezone", "location_presence"]
      }
    },
    importedEvents,
    cardOpportunities
  };
}

function normalizeGoogleCalendarEvent(event, userId, index) {
  const title = safeContractText(event?.summary, "Calendar event");
  const startsAt = googleEventStartIso(event?.start);
  if (!startsAt) return undefined;
  const timezone = safeContractText(event?.start?.timeZone ?? event?.end?.timeZone, "UTC");
  const googleEventHash = stableContractHash(`${event?.id ?? event?.iCalUID ?? index}:${startsAt}`);
  const eventId = `event-${stableContractHash(`${userId}:google-calendar:${googleEventHash}`).slice(0, 12)}`;
  const recipientHint = inferCalendarRecipient(title);
  return {
    eventId,
    opportunityId: `opportunity-${stableContractHash(`${eventId}:${recipientHint}`).slice(0, 12)}`,
    title,
    startsAt,
    timezone,
    recipientHint,
    sourceEvidence: "Google Calendar metadata: title and start time.",
    googleEventHash,
    leadTimeHours: leadTimeHoursFromNow(startsAt),
    confidence: safeConfidence(title === "Calendar event" ? 0.72 : 0.88, 0.82)
  };
}

function googleEventStartIso(start) {
  const value = start?.dateTime ?? start?.date;
  if (!value) return "";
  const isoValue = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00.000Z` : value;
  return safeTimestamp(isoValue, "");
}

function inferCalendarRecipient(title) {
  const withoutOccasion = title
    .replace(/\b(birthday|anniversary|wedding|graduation|dinner|party|celebration|brunch|lunch)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return safeContractText(withoutOccasion, "Someone important");
}

function leadTimeHoursFromNow(startsAt) {
  const delta = new Date(startsAt).getTime() - Date.now();
  if (!Number.isFinite(delta)) return 168;
  return Math.max(0, Math.min(8760, Math.round(delta / (60 * 60 * 1000))));
}

function encryptTokenSecret(value, env) {
  const text = String(value ?? "");
  if (!text) return "";
  const key = createHash("sha256").update(tokenEncryptionKeyMaterial(env)).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `aes-256-gcm:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

function decryptTokenSecret(value, env) {
  const [scheme, ivEncoded, tagEncoded, dataEncoded] = String(value ?? "").split(":");
  if (scheme !== "aes-256-gcm" || !ivEncoded || !tagEncoded || !dataEncoded) return "";
  try {
    const key = createHash("sha256").update(tokenEncryptionKeyMaterial(env)).digest();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivEncoded, "base64url"));
    decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(dataEncoded, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

function tokenEncryptionKeyMaterial(env) {
  const secret = strongSecretValue(env.GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY);
  if (!secret) throw new Error("GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY must be at least 32 characters.");
  return secret;
}

function strongSecretValue(value) {
  const text = usableEnvValue(value);
  return text && text.length >= 32 ? text : "";
}

async function refreshGoogleAccessToken(refreshToken, env, fetchImpl = globalThis.fetch) {
  if (!refreshToken) throw new Error("Google Calendar refresh token is unavailable.");
  const clientId = usableEnvValue(env.GOOGLE_OAUTH_CLIENT_ID);
  const clientSecret = usableEnvValue(env.GOOGLE_OAUTH_CLIENT_SECRET);
  if (!clientId || !clientSecret) throw new Error("Missing Google OAuth env for token refresh.");
  const response = await fetchImpl(usableEnvValue(env.GOOGLE_OAUTH_TOKEN_ENDPOINT) || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(safeContractText(payload.error_description ?? payload.error, "Google token refresh failed."));
  }
  const accessToken = String(payload.access_token ?? "").trim();
  if (!accessToken) throw new Error("Google token refresh did not return an access token.");
  return { accessToken };
}

function safeReturnToUrl(value, fallbackOrigin) {
  try {
    const parsed = new URL(String(value ?? ""), fallbackOrigin);
    const fallback = new URL(fallbackOrigin);
    return parsed.origin === fallback.origin ? parsed.toString() : `${fallback.origin}/`;
  } catch {
    return `${fallbackOrigin}/`;
  }
}

function usableEnvValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^(replace|todo|changeme|example|placeholder|dummy)/i.test(text)) return "";
  return text;
}

function calendarConnectionStartPackets() {
  return [
    buildCalendarConnectionStartPacket("manual-invite-or-ics"),
    buildCalendarConnectionStartPacket("google-calendar-events"),
    buildCalendarConnectionStartPacket("icloud-ics-fallback")
  ];
}

function buildCalendarConnectionStartPacket(choiceId) {
  const packets = {
    "manual-invite-or-ics": {
      id: "manual-invite-or-ics",
      provider: "Manual invite or ICS paste",
      label: "Paste invite or ICS",
      status: "ready-local",
      startMode: "metadata-import",
      nextApiRoute: "/api/import-preview",
      canStartNow: true,
      sourceMode: "local-paste",
      officialDocs: [],
      requiredEnv: [],
      requiredScopes: [],
      officialScopeUris: [],
      dataBoundary: "Customer-provided invite text or ICS event metadata only.",
      credentialBoundary: "No provider account, OAuth token, Apple credential, or background sync.",
      safetyChecks: [
        "Treat pasted invite and ICS text as untrusted input.",
        "Extract event metadata only.",
        "Require opportunity approval before card creation."
      ],
      requiredEvidenceIds: ["manual-import-preview-visible", "manual-input-parser-untrusted"],
      blockingEvidenceIds: [],
      missingRepoEvidenceIds: [],
      customerSteps: [
        {
          actor: "customer",
          title: "Paste event details",
          detail: "Paste an invite, selected event fields, or ICS text into the local import path.",
          evidenceRequired: ["Customer-provided event text exists."]
        }
      ],
      operatorSteps: [
        {
          actor: "system",
          title: "Validate untrusted input",
          detail: "Run the manual import parser and reject raw body persistence before showing opportunity review.",
          evidenceRequired: ["Manual import parser tests pass.", "Raw content storage checks pass."]
        }
      ]
    },
    "google-calendar-events": {
      id: "google-calendar-events",
      provider: "Google Calendar API",
      label: "Google Calendar connection",
      status: "credential-gated",
      startMode: "oauth-evidence-required",
      nextApiRoute: null,
      canStartNow: false,
      sourceMode: "oauth-readiness",
      officialDocs: ["https://developers.google.com/workspace/calendar/api/auth"],
      requiredEnv: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI"],
      requiredScopes: ["calendar.events.readonly"],
      officialScopeUris: ["https://www.googleapis.com/auth/calendar.events.readonly"],
      dataBoundary: "Event metadata only after explicit consent; raw descriptions stay out of storage.",
      credentialBoundary: "Needs OAuth client, consent screen, redirect URI, token storage, and revocation handling.",
      safetyChecks: [
        "OAuth consent required",
        "Calendar scope consent",
        "Metadata schema validation",
        "Revocation handling",
        "No raw content storage"
      ],
      requiredEvidenceIds: [
        "google-scope-review",
        "google-oauth-env-and-redirect",
        "google-revocation-proof",
        "google-metadata-schema-fixture",
        "google-manual-fallback-visible"
      ],
      blockingEvidenceIds: [
        "google-scope-review",
        "google-oauth-env-and-redirect",
        "google-revocation-proof",
        "google-metadata-schema-fixture"
      ],
      missingRepoEvidenceIds: [
        "google-scope-review",
        "google-oauth-env-and-redirect",
        "google-revocation-proof",
        "google-metadata-schema-fixture"
      ],
      customerSteps: [
        {
          actor: "customer",
          title: "Review Google access",
          detail: "Review the metadata-only scope and use manual paste while OAuth is not enabled.",
          evidenceRequired: ["Scope URI is visible.", "Manual fallback remains available."]
        }
      ],
      operatorSteps: [
        {
          actor: "operator",
          title: "Register OAuth app",
          detail: "Configure the OAuth client, redirect URI, consent screen, and required environment variables.",
          evidenceRequired: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI"]
        },
        {
          actor: "operator",
          title: "Prove revocation and token boundary",
          detail: "Implement token storage, disconnect, and revocation handling before any provider request is prepared.",
          evidenceRequired: ["Revocation test evidence.", "Token storage boundary review.", "Metadata schema fixture tests."]
        }
      ],
      fallbackChoiceId: "manual-invite-or-ics",
      blockedReason: "No live OAuth consent flow is implemented in this repository state."
    },
    "icloud-ics-fallback": {
      id: "icloud-ics-fallback",
      provider: "iCloud Calendar export",
      label: "Apple Calendar ICS export",
      status: "manual-export",
      startMode: "manual-export-guide",
      nextApiRoute: "/api/import-preview",
      canStartNow: true,
      sourceMode: "manual-export",
      officialDocs: [
        "https://support.apple.com/guide/calendar/import-or-export-calendars-icl1023/mac",
        "https://support.apple.com/en-gb/108306"
      ],
      requiredEnv: [],
      requiredScopes: [],
      officialScopeUris: [],
      dataBoundary: "Customer exports an .ics file or downloads a temporary iCloud.com ICS copy, then pastes selected event data.",
      credentialBoundary: "No Apple ID, app-specific password, CalDAV session, or native Apple Calendar sync.",
      safetyChecks: ["Manual export only", "No Apple account credentials stored", "Metadata schema validation"],
      requiredEvidenceIds: [
        "icloud-export-instructions-visible",
        "icloud-no-credential-collection",
        "icloud-metadata-import-preview"
      ],
      blockingEvidenceIds: [],
      missingRepoEvidenceIds: [],
      customerSteps: [
        {
          actor: "customer",
          title: "Export or download ICS",
          detail: "Export an event from Calendar on Mac or download a temporary iCloud.com calendar copy, then stop sharing when finished.",
          evidenceRequired: ["Customer-controlled ICS export exists."]
        }
      ],
      operatorSteps: [
        {
          actor: "operator",
          title: "Keep Apple credentials out",
          detail: "Do not collect Apple ID, app-specific password, CalDAV session, or native Apple Calendar credentials.",
          evidenceRequired: ["Credential collection is absent.", "Manual ICS parser tests pass."]
        }
      ],
      fallbackChoiceId: "manual-invite-or-ics",
      blockedReason: "Live iCloud CalDAV/native sync is intentionally not implemented."
    }
  };
  const packet = packets[choiceId] ?? packets["manual-invite-or-ics"];

  return {
    ...packet,
    apiRoute: "/api/calendar/connections/start",
    serverOwned: true,
    clientMayPrepareProviderRequest: false,
    customerVisible: true,
    liveOAuthEnabled: false,
    networkRequestPrepared: false,
    credentialStorageEnabled: false,
    providerRequestUrl: null,
    rawContentStored: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false
  };
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

function safeCalendarChoiceId(value) {
  const id = safeContractId(value, "manual-invite-or-ics");
  return ["manual-invite-or-ics", "google-calendar-events", "icloud-ics-fallback"].includes(id)
    ? id
    : "manual-invite-or-ics";
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

function safeContractDraftStatus(value) {
  const status = String(value ?? "draft").trim().toLowerCase();
  return ["draft", "in-progress", "ready-for-review"].includes(status) ? status : "draft";
}

function safeContractOpportunityDecision(value) {
  const decision = String(value ?? "pending").trim().toLowerCase();
  return ["pending", "accepted", "snoozed", "dismissed"].includes(decision) ? decision : "pending";
}

function safeContractVendorId(value) {
  const vendorId = String(value ?? "walgreens").trim().toLowerCase();
  return ["walgreens", "cvs", "fedex", "walmart", "staples", "office-depot", "local-print-shop"].includes(vendorId)
    ? vendorId
    : "walgreens";
}

function sanitizeContractDraftInput(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    sender: safeContractText(input.sender, "Local User"),
    recipient: safeContractText(input.recipient, "Someone important"),
    relationship: safeContractText(input.relationship, "Friends"),
    occasion: safeContractText(input.occasion, "card"),
    tone: safeContractTone(input.tone),
    style: safeContractVisualStyle(input.style),
    language: safeContractLanguage(input.language),
    personalNote: safeContractLongText(input.personalNote, ""),
    useMemory: safeBoolean(input.useMemory)
  };
}

function safeContractLongText(value, fallback) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text.slice(0, 1000) || fallback;
}

function safeContractTone(value) {
  const tone = String(value ?? "warm").trim().toLowerCase();
  return ["warm", "playful", "elegant", "simple", "reverent", "sentimental"].includes(tone) ? tone : "warm";
}

function safeContractVisualStyle(value) {
  const style = String(value ?? "botanical").trim().toLowerCase();
  return ["botanical", "bold-type", "photo-note", "minimal"].includes(style) ? style : "botanical";
}

function safeContractLanguage(value) {
  const language = String(value ?? "English").trim();
  return ["English", "Spanish", "Urdu", "Arabic"].includes(language) ? language : "English";
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

function readRequestBody(request, limit = 256_000) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > limit) {
        request.destroy(new Error("Request body too large."));
      }
    });
    request.on("error", reject);
    request.on("end", () => resolve(body));
  });
}
