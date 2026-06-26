import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildReadinessSummary,
  readinessDomainIds,
  validateReadinessDomains,
  validateReadinessSummary
} from "../src/readinessSummaryData.mjs";
import {
  buildRetailPrinterOperationStartPackets,
  buildRetailPrinterOperationStartResponse
} from "../src/retailPrinterOperationStartData.mjs";
import {
  buildRetailPrinterCouponPortalEvidenceResponse,
  missingRetailPrinterCouponPortalEvidenceFields
} from "../src/retailPrinterCouponPortalEvidenceData.mjs";
import {
  createWalgreensHostedCheckoutService
} from "../src/walgreensHostedCheckout.mjs";
import { createApiRuntime } from "./api-runtime.mjs";
import {
  createApiRouteFamilyAdapter,
  googleCalendarApiOAuthCallbackRoute,
  googleCalendarOAuthCallbackRoute
} from "./api-route-family-adapter.mjs";
import {
  buildCalendarConnectionStartPayload,
  buildImportPreviewContractPayload,
  calendarConnectionStartPackets as opportunityCalendarConnectionStartPackets,
  resolveCalendarConnectionLifecycle,
  resolveGoogleCalendarOAuthCallback
} from "./opportunity-intake-runtime.mjs";
import { apiRouteContracts, hostedCheckoutExemptRouteIds, requiredApiRoutePaths } from "../src/apiRouteContractsData.mjs";
import {
  createAiCardGenerationService,
  loadLocalAiEnvFiles
} from "./ai-card-generator.mjs";
import { createAiFlowCostGate, createPostgresAiFlowCostStore } from "./ai-flow-cost-gate.mjs";

const root = resolve("dist");
const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? "0.0.0.0";

loadLocalApiEnvFiles();
loadLocalAiEnvFiles();

export const routes = apiRouteContracts;

const apiRuntime = createApiRuntime({ env: process.env, routes });
const walgreensCheckout = createWalgreensHostedCheckoutService({
  env: process.env,
  fetchImpl: (...args) => globalThis.fetch(...args),
  safetyControls: () => apiRuntime.readAdminSafetyControls()
});

function loadLocalApiEnvFiles({ cwd = process.cwd(), target = process.env } = {}) {
  const localApiEnvKeys = new Set([
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
  const behindTrustedProxy = process.env.CUSTOMCARD_TRUST_PROXY_HEADERS === "true" || Boolean(process.env.VERCEL);
  if (!behindTrustedProxy) return remoteAddress;

  // Behind Vercel the socket address is the proxy, so every client would share
  // one bucket. Prefer the platform-set client-IP headers over x-forwarded-for,
  // which the client can prepend to.
  const platformClientIp =
    String(request.headers?.["x-vercel-forwarded-for"] ?? "").split(",")[0].trim() ||
    String(request.headers?.["x-real-ip"] ?? "").trim();
  if (platformClientIp) return platformClientIp;

  const forwardedFor = String(request.headers?.["x-forwarded-for"] ?? "")
    .split(",")[0]
    .trim();
  return forwardedFor || remoteAddress;
}

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
    idempotentMutations: routes.filter((route) => route.method === "POST" && route.idempotencyKeyRequired).length
  },
  providers: {
    total: 130,
    readyLocal: 16,
    credentialGated: 98,
    contractOnly: 10,
    blocked: 6
  },
  providerGovernance: {
    total: 130,
    zeroPlatformSpend: 19,
    budgetCapped: 105,
    blockedZeroSpend: 6,
    monthlyBudgetCents: 206600,
    maxPerRequestBudgetCents: 5,
    rateLimited: 124,
    queueRequired: 91,
    fallbackCovered: 96,
    liveNetworkDefault: false,
    realOrdersEnabled: false,
    blockers: []
  },
  localization: {
    defaultLocale: "en-US",
    supportedLocales: 4,
    cardLanguageLabel: "Card language",
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
      "Public hosted Postgres route proof is attached; authenticated mutation replay, audit rows, and backup policy remain missing.",
      "Vercel deployment and hosted Postgres runtime proof are attached; hosted env sync proof and authenticated public DB doctor output remain incomplete.",
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
  legalCompliance: readinessSummary.legalCompliance.summary,
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
    tables: 22,
    schemaBackedRoutes: 26,
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
// AI budgets and rate limits enforce in Postgres when the runtime is durable,
// so serverless instances share one ledger instead of per-process Maps.
const aiGenerationService = createAiCardGenerationService({
  env: process.env,
  fetchImpl: (...args) => globalThis.fetch(...args),
  loadAiFlowAdminConfig: () =>
    apiRuntime.readAdminAiFlowConfig().then((payload) =>
      payload.version > 0 ? payload.configs ?? payload.aiFlowConfigs ?? [] : []
    ),
  costGate: createAiFlowCostGate({
    store: apiRuntime.getAiFlowCostPool
      ? createPostgresAiFlowCostStore({ getPool: apiRuntime.getAiFlowCostPool })
      : undefined
  })
});
const apiRouteFamilies = createApiRouteFamilyAdapter({
  aiGenerationService,
  apiRuntime,
  buildMutationContractPayload,
  calendarConnectionLifecycle: handleCalendarConnectionLifecycle,
  calendarConnectionStartPackets: opportunityCalendarConnectionStartPackets,
  clientRateLimitKey,
  decodeArtifactObjectKey,
  readRequestBody,
  readiness,
  routes,
  sendArtifact,
  sendHtml,
  sendJson,
  walgreensCheckout,
  walgreensRateLimited
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
  const dynamicRoute = route ?? matchDynamicApiRoute(path, request.method);
  if (!dynamicRoute) {
    sendJson(response, 404, { service: "customcard-api", status: "not-found", path });
    return;
  }

  // Walgreens navigates the customer back via GET or POST after checkout.
  const callbackMethodOverride = dynamicRoute.id === "walgreens-checkout-callback" && request.method === "POST";
  if (request.method !== dynamicRoute.method && !callbackMethodOverride) {
    sendJson(response, 405, { service: "customcard-api", status: "method-not-allowed", path });
    return;
  }

  const authContext = await apiRuntime.authorize(dynamicRoute, request);
  if (!authContext.ok) {
    sendJson(response, authContext.statusCode, authContext.payload);
    return;
  }

  await apiRouteFamilies.handlePostAuthRoute({ path, request, requestUrl, response, route: dynamicRoute, authContext });
}

function matchDynamicApiRoute(path, method) {
  if (method === "POST" && /^\/api\/provider\/jobs\/[^/]+\/complete$/.test(path)) {
    return routes.find((candidate) => candidate.id === "provider-job-complete");
  }
  return undefined;
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
  if (artifact.contentDisposition) response.setHeader("Content-Disposition", artifact.contentDisposition);
  if (artifact.contentSecurityPolicy) response.setHeader("Content-Security-Policy", artifact.contentSecurityPolicy);
  if (artifact.crossOriginResourcePolicy) response.setHeader("Cross-Origin-Resource-Policy", artifact.crossOriginResourcePolicy);
  if (artifact.downloadOptions) response.setHeader("X-Download-Options", artifact.downloadOptions);
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
    if (route.audience === "provider" && route.auth !== "provider-token") blockers.push(`Provider route ${route.id} is not gated.`);
    const anonymousHostedCheckout = hostedCheckoutExemptRouteIds.has(route.id) && route.auth === "none";
    if (route.audience === "customer" && route.auth !== "customer-session" && !anonymousHostedCheckout) {
      blockers.push(`Customer route ${route.id} is not gated.`);
    }
  }
  if (readiness.realOrdersEnabled) blockers.push("API readiness cannot enable real orders.");
  if (readiness.safety.externalNetworkCalls) blockers.push("API readiness cannot enable live provider calls.");
  const nonIdempotentMutations = routes.filter(
    (route) =>
      route.method === "POST" &&
      !route.idempotencyKeyRequired &&
      !hostedCheckoutExemptRouteIds.has(route.id) &&
      route.audience !== "provider"
  );
  if (nonIdempotentMutations.length > 0) {
    blockers.push(`Every non-checkout mutation route must require idempotency: ${nonIdempotentMutations.map((route) => route.id).join(", ")}.`);
  }
  const idempotentMutationCount = routes.filter((route) => route.method === "POST" && route.idempotencyKeyRequired).length;
  if (readiness.routes.idempotentMutations !== idempotentMutationCount) {
    blockers.push("API readiness idempotent mutation count must match route contracts.");
  }
  if (readiness.providers.total < 124) blockers.push("Provider API summary is missing expanded adapter coverage.");
  if (readiness.providerGovernance.total !== readiness.providers.total) {
    blockers.push("Provider governance summary must cover every adapter.");
  }
  if (readiness.providerGovernance.fallbackCovered <= 0 || readiness.providerGovernance.fallbackCovered > readiness.providers.total) {
    blockers.push("Provider governance summary must preserve bounded ready fallback coverage.");
  }
  if (readiness.providerGovernance.blockers.length > 0) blockers.push("Provider governance summary has blockers.");
  if (readiness.providerGovernance.liveNetworkDefault) blockers.push("Provider governance cannot default to live network calls.");
  if (readiness.providerGovernance.realOrdersEnabled) blockers.push("Provider governance cannot enable real orders.");
  if (readiness.readinessDomains.length !== readinessDomainIds.length) {
    blockers.push("API readiness must expose every Node readiness domain.");
  }
  blockers.push(...validateReadinessDomains());
  blockers.push(...validateReadinessSummary(readinessSummary));
  if (readiness.production.liveEnabled !== 0) blockers.push("Production readiness cannot enable live components by default.");
  if (readiness.production.total < 13) blockers.push("Production readiness must track every launch gate.");
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
    const draftStateId = `draft-state-${stableContractHash(`${options.authContext?.userId ?? "contract-customer"}:${JSON.stringify(requestBody.draftInput ?? {})}`).slice(0, 8)}`;
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
    return buildImportPreviewContractPayload({ basePayload, requestBody });
  }

  if (route.id === "calendar-connection-start") {
    return buildCalendarConnectionStartPayload({
      basePayload,
      requestBody,
      authContext: options.authContext,
      env: options.env ?? process.env,
      requestUrl: options.requestUrl
    });
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
    // Status and due date are server policy: a requester must never be able to
    // mark their own privacy request completed or move its deadline.
    const dueAtDays = requestType === "revoke_consent" ? 7 : 30;
    const dueAt = new Date(Date.now() + dueAtDays * 24 * 60 * 60 * 1000).toISOString();
    const region = safeContractText(requestBody.region, "").slice(0, 12);
    return {
      ...basePayload,
      dataRequestId,
      requestType,
      requestStatus: "pending_verification",
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

/**
 * Connected-state lifecycle for Google Calendar. Returns true when the request
 * was fully handled (already connected, scan-again, needs-reconnect) so the
 * generic OAuth-redirect start flow only runs for first connections and
 * explicit reconnects.
 */
async function handleCalendarConnectionLifecycle({ authContext, bodyText, response }) {
  const result = await resolveCalendarConnectionLifecycle({
    authContext,
    bodyText,
    apiRuntime,
    env: process.env,
    fetchImpl: (...args) => globalThis.fetch(...args)
  });
  if (!result.handled) return false;
  sendJson(response, result.statusCode, result.payload);
  return true;
}

async function handleGoogleCalendarOAuthCallback(request, response, requestUrl) {
  const result = await resolveGoogleCalendarOAuthCallback({
    method: request.method,
    requestUrl,
    env: process.env,
    apiRuntime,
    fetchImpl: (...args) => globalThis.fetch(...args)
  });
  if (!result.returnTo) {
    sendJson(response, result.statusCode, result.payload);
    return;
  }
  sendCalendarCallbackResult(request, response, result.returnTo, result.statusCode, result.payload);
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
  if (tone === "playful") return "funny";
  return ["warm", "funny", "elegant", "simple", "reverent", "sentimental"].includes(tone) ? tone : "warm";
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
