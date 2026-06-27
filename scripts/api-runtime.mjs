import { createHash, createHmac } from "node:crypto";
import { clerkVerificationConfigured, looksLikeJwt, verifyClerkSessionToken } from "./clerk-session.mjs";
import { resolveImportPreviewMetadata } from "../src/importPreviewMetadata.mjs";
import { normalizeCardCategory, publicCardCategories } from "../src/cardCategoriesData.mjs";
import { missingRetailPrinterCouponPortalEvidenceFields } from "../src/retailPrinterCouponPortalEvidenceData.mjs";
import { mutationBodyContractSpecs, persistedTablesForRouteId } from "../src/apiRouteContractsData.mjs";
import { normalizeAdminSafetyControls, updateAdminSafetyControls } from "../src/adminSafetyControlsData.mjs";
import {
  adminAiFlowConfigReadUnavailablePayload,
  adminRuntimeConfigKeys,
  buildAdminAiFlowConfigPayload,
  buildUpdatedAdminAiFlowConfigPayload
} from "../src/adminRuntimeConfigData.mjs";
import { createObjectStoreRuntime } from "./object-store-runtime.mjs";
import { createPostgresRuntime, postgresPoolConfig } from "./postgres-runtime.mjs";
import {
  authSessionSecretMessage,
  describeApiRuntimeModeAdapters,
  resolveApiRuntimeModeAdapter
} from "./api-runtime-mode-adapters.mjs";
import {
  authorizeProviderToken,
  createProviderJobRuntime,
  providerRuntimeUnavailable
} from "./provider-job-runtime.mjs";
import { createRouteMutationRuntime } from "./api-route-mutation-runtime.mjs";
import { hasStrongEnvSecret, isProductionRuntimeEnv } from "./runtime-env-contract.mjs";

export { postgresPoolConfig } from "./postgres-runtime.mjs";

export { describeApiRuntimeModeAdapters };
const generatedImageWebpQuality = 82;
const generatedImageWebpEffort = 4;
const generatedImageMaxEdgePixels = 2100;
const generatedImageRasterMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const localAuthFallbackOptInEnvName = "CUSTOMCARD_ENABLE_LOCAL_AUTH_FALLBACKS";
const routeMutationRuntime = createRouteMutationRuntime({
  missingRetailPrinterCouponPortalEvidenceFields,
  mutationBodyContractSpecs,
  normalizeJson,
  parseJsonBody,
  persistedTablesForRoute,
  readHeader,
  requestHash,
  resolveImportPreviewMetadata,
  safeBoolean,
  safeId,
  safeLocale,
  stableRuntimeId
});
let sharpCodecPromise;

function hasStrongAuthSessionSecret(env) {
  return hasStrongEnvSecret(env, "AUTH_SESSION_SECRET");
}

export function createApiRuntime({ env = process.env, routes = [], postgresPoolFactory } = {}) {
  const objectStoreRuntime = createObjectStoreRuntime({ env });
  const adapter = resolveApiRuntimeModeAdapter({
    env,
    factories: {
      contract: (input) => createContractApiRuntime({ env: input.env, routes: input.routes, objectStoreRuntime: input.objectStoreRuntime }),
      memory: (input) => createMemoryApiRuntime({ env: input.env, routes: input.routes, objectStoreRuntime: input.objectStoreRuntime }),
      postgres: (input) =>
        createPostgresApiRuntime({
          env: input.env,
          routes: input.routes,
          postgresPoolFactory: input.postgresPoolFactory,
          objectStoreRuntime: input.objectStoreRuntime
        })
    }
  });
  if (adapter.mode === "invalid") {
    return createInvalidApiRuntime({
      requestedMode: adapter.requestedMode,
      routes,
      objectStoreRuntime,
      validationMessages: adapter.blockers
    });
  }
  return adapter.create({ env, routes, postgresPoolFactory, objectStoreRuntime });
}

export function hashSessionToken(token, sessionSecret = "") {
  const normalizedSecret = String(sessionSecret ?? "");
  if (normalizedSecret.length >= 32) {
    return createHmac("sha256", normalizedSecret).update(token).digest("hex");
  }
  return createHash("sha256").update(token).digest("hex");
}

export function requestHash(routeId, bodyText) {
  return createHash("sha256").update(`${routeId}:${bodyText || "{}"}`).digest("hex");
}

function createContractApiRuntime({ env, routes, objectStoreRuntime }) {
  return {
    mode: "contract",
    describe() {
      return {
        mode: "contract",
        authEnforced: false,
        idempotencyEnforced: false,
        postgresConfigured: false,
        sessionsConfigured: 0,
        idempotencyRecords: 0,
        auditRecords: 0,
        queuedJobs: 0,
        providerConnectionRecords: 0,
        importedEventRecords: 0,
        cardOpportunityRecords: 0,
        draftStateRecords: 0,
        relationshipMemoryRecords: 0,
        cardProjectRecords: 0,
        renderPacketRecords: 0,
        providerCallEventRecords: 0,
        orderRecords: 0,
        orderEventRecords: 0,
        consentRecords: 0,
        dataRequestRecords: 0,
        statefulRoutes: routes.filter((route) => route.auth !== "none").length,
        artifactStore: objectStoreRuntime.describe()
      };
    },
    validate() {
      return objectStoreRuntime.validate();
    },
    async authorize(route, request) {
      if (route.audience === "admin" && route.method === "POST") {
        return {
          ok: false,
          statusCode: 403,
          payload: {
            service: "customcard-api",
            status: "admin-mutation-requires-durable-runtime",
            route: route.id,
            detail: "Admin mutations are not permitted in contract runtime. Set CUSTOMCARD_API_RUNTIME=postgres in deployed environments."
          }
        };
      }
      if (route.auth === "provider-token") return authorizeProviderToken({ env, route, request });
      if (route.auth === "none") return anonymousAuthContext(route);
      if (route.externalNetworkCalls && !readBearerToken(request)) {
        return authError(401, "auth-required", route);
      }
      return {
        ok: true,
        role: requiredRoleForAuth(route.auth),
        userId: route.auth === "admin-session" ? "contract-admin" : "contract-customer",
        sessionId: "contract-session"
      };
    },
    async persistMutation({ route, request, authContext, bodyText, responsePayload }) {
      const bodyValidation = routeMutationRuntime.validateMutationBody(route, bodyText);
      if (bodyValidation) return bodyValidation;
      const idempotencyKey = readHeader(request, "x-idempotency-key");
      const queueJob = routeMutationRuntime.buildQueuedJobRecord({
        route,
        authContext: authContext ?? anonymousAuthContext(route),
        idempotencyKey,
        bodyText
      });

      return {
        ok: true,
        statusCode: 202,
        payload: {
          ...responsePayload,
          ...routeMutationRuntime.publicQueuedJobAcceptance(queueJob),
          runtimeMode: "contract",
          idempotencyPersisted: false
        }
      };
    },
    async readQueuedJob({ authContext, jobId }) {
      return routeMutationRuntime.buildQueuedJobReadResult({
        runtimeMode: "contract",
        authContext,
        job: {
          id: safeId(jobId, ""),
          userId: authContext.userId,
          routeId: "ai-job",
          status: "unavailable",
          result: {},
          attemptCount: 0,
          maxAttempts: 3
        },
        statusCode: 404
      });
    },
    async leaseProviderJobs() {
      return providerRuntimeUnavailable("contract");
    },
    async readProviderJobStatus() {
      return providerRuntimeUnavailable("contract");
    },
    async completeProviderJob() {
      return providerRuntimeUnavailable("contract");
    },
    async recordProviderCallEvents() {
      return { persisted: false, count: 0, runtimeMode: "contract" };
    },
    async persistGeneratedImageArtifacts({ authContext, payload }) {
      return persistGeneratedImageArtifacts({ objectStoreRuntime, authContext, payload });
    },
    async persistGoogleCalendarImport({ record }) {
      return {
        persisted: false,
        payload: buildGoogleCalendarImportRepositoryPayload(record, "contract", false)
      };
    },
    async readArtifact(input) {
      return objectStoreRuntime.readSignedArtifact(input);
    },
    async listArtifacts(input) {
      return objectStoreRuntime.listBucketArtifacts(input);
    },
    async readDraftState({ authContext }) {
      return buildDraftStateReadPayload(undefined, "contract", authContext);
    },
    async readProviderConnection() {
      return undefined;
    },
    async readCustomerConnections({ authContext }) {
      return buildCustomerConnectionsPayload({ runtimeMode: "contract", authContext, connectionRecord: undefined, opportunities: [] });
    },
    async readFeaturedCards() {
      return buildFeaturedCardsPayload([], "contract");
    },
    async readCardGallery({ authContext }) {
      return buildCardGalleryReadPayload({ runtimeMode: "contract", authContext, entries: [], candidates: [] });
    },
    async readAdminAiFlowConfig() {
      return buildAdminAiFlowConfigPayload({ env, runtimeMode: "contract" });
    },
    async readAdminSafetyControls() {
      return normalizeAdminSafetyControls();
    },
    async close() {
      return undefined;
    }
  };
}

function createInvalidApiRuntime({ requestedMode, routes, objectStoreRuntime, validationMessage, validationMessages }) {
  const contractRuntime = createContractApiRuntime({ routes, objectStoreRuntime });
  const blockers =
    validationMessages?.length > 0
      ? validationMessages
      : [validationMessage ?? `Unsupported CUSTOMCARD_API_RUNTIME: ${requestedMode}. Expected contract, memory, or postgres.`];
  const payload = {
    service: "customcard-api",
    status: "api-runtime-invalid",
    requestedMode,
    blockers
  };
  return {
    ...contractRuntime,
    mode: "invalid",
    describe() {
      return {
        ...contractRuntime.describe(),
        mode: "invalid",
        requestedMode
      };
    },
    validate() {
      return blockers;
    },
    async authorize(route) {
      if (route.auth === "none") return anonymousAuthContext(route);
      return { ok: false, statusCode: 503, payload: { ...payload, route: route.id } };
    },
    async persistMutation({ route }) {
      return { ok: false, statusCode: 503, payload: { ...payload, route: route.id } };
    },
    async recordProviderCallEvents() {
      return { persisted: false, count: 0, runtimeMode: "invalid" };
    },
    async persistGeneratedImageArtifacts() {
      return undefined;
    },
    async leaseProviderJobs() {
      return providerRuntimeUnavailable("invalid");
    },
    async readProviderJobStatus() {
      return providerRuntimeUnavailable("invalid");
    },
    async completeProviderJob() {
      return providerRuntimeUnavailable("invalid");
    },
    async persistGoogleCalendarImport() {
      return { persisted: false, payload };
    },
    async readArtifact() {
      return { statusCode: 503, payload };
    },
    async listArtifacts() {
      return { statusCode: 503, payload: { ...payload, objects: [], objectCount: 0 } };
    },
    async readDraftState() {
      return { ...payload, draftState: null };
    }
  };
}

function createMemoryApiRuntime({ env, routes, objectStoreRuntime }) {
  const sessions = new Map();
  const idempotencyRecords = new Map();
  const auditRecords = [];
  const queuedJobs = [];
  const providerConnections = new Map();
  const importedEvents = new Map();
  const cardOpportunities = new Map();
  const draftStates = new Map();
  const relationshipMemories = new Map();
  const cardProjects = new Map();
  const renderPackets = new Map();
  const providerCallEvents = new Map();
  const orders = new Map();
  const orderEvents = new Map();
  const consentRecords = new Map();
  const dataRequests = new Map();
  const cardGalleryEntries = new Map();
  const adminRuntimeConfigs = new Map();

  if (localAuthFallbacksEnabled(env)) {
    addSession(sessions, env.CUSTOMCARD_CUSTOMER_SESSION_TOKEN, "customer", "user-demo", env.AUTH_SESSION_SECRET);
    addSession(sessions, env.CUSTOMCARD_ADMIN_SESSION_TOKEN, "admin", "admin-demo", env.AUTH_SESSION_SECRET);
  }

  return {
    mode: "memory",
    describe() {
      return {
        mode: "memory",
        authEnforced: true,
        idempotencyEnforced: true,
        postgresConfigured: false,
        sessionsConfigured: sessions.size,
        idempotencyRecords: idempotencyRecords.size,
        auditRecords: auditRecords.length,
        queuedJobs: queuedJobs.length,
        providerConnectionRecords: providerConnections.size,
        importedEventRecords: importedEvents.size,
        cardOpportunityRecords: cardOpportunities.size,
        draftStateRecords: draftStates.size,
        relationshipMemoryRecords: relationshipMemories.size,
        cardProjectRecords: cardProjects.size,
        renderPacketRecords: renderPackets.size,
        providerCallEventRecords: providerCallEvents.size,
        orderRecords: orders.size,
        orderEventRecords: orderEvents.size,
        consentRecords: consentRecords.size,
        dataRequestRecords: dataRequests.size,
        adminRuntimeConfigRecords: adminRuntimeConfigs.size,
        statefulRoutes: routes.filter((route) => route.auth !== "none").length,
        artifactStore: objectStoreRuntime.describe()
      };
    },
    validate() {
      const blockers = [];
      if (!memoryAuthConfigured(env)) {
        blockers.push(
          `Memory API runtime requires Clerk JWT verification config or ${localAuthFallbackOptInEnvName}=enabled with CUSTOMCARD_CUSTOMER_SESSION_TOKEN plus CUSTOMCARD_ADMIN_SESSION_TOKEN.`
        );
      }
      blockers.push(...objectStoreRuntime.validate());
      return blockers;
    },
    async authorize(route, request) {
      if (route.auth === "provider-token") return authorizeProviderToken({ env, route, request });
      const sessionResult = authorizeFromSessions(route, request, sessions, env.AUTH_SESSION_SECRET);
      if (sessionResult.ok || sessionResult.statusCode !== 401) return sessionResult;

      // Clerk bridge: a signed-in browser sends the Clerk session JWT. Verify it
      // offline and mint a runtime session so customer routes stop returning 401.
      const token = readBearerToken(request);
      if (!token || !looksLikeJwt(token)) return sessionResult;
      const verification = verifyClerkSessionToken(token, env);
      if (!verification.ok) {
        const localSessionResult = authorizeLocalMemoryClerkCustomer({ route, request, sessions, env, token, verification });
        return localSessionResult ?? sessionResult;
      }
      const sessionId = stableRuntimeId("session", "clerk", verification.clerkUserId, verification.clerkSessionId);
      sessions.set(hashSessionToken(token, env.AUTH_SESSION_SECRET), {
        id: sessionId,
        sessionId,
        role: verification.role,
        userId: stableRuntimeId("user", "clerk", verification.clerkUserId),
        email: verification.email,
        provider: verification.provider ?? "clerk"
      });
      return authorizeFromSessions(route, request, sessions, env.AUTH_SESSION_SECRET);
    },
    async persistMutation({ route, request, authContext, bodyText, responsePayload }) {
      const prepared = routeMutationRuntime.prepareIdempotentMutation({ route, request, authContext, bodyText, responsePayload });
      if (!prepared.ok) return prepared;

      const existing = idempotencyRecords.get(prepared.recordKey);
      if (existing) return routeMutationRuntime.replayOrConflict(existing, prepared.requestHash);

      const queueJob = routeMutationRuntime.buildQueuedJobRecord({
        route,
        authContext,
        idempotencyKey: prepared.idempotencyKey,
        bodyText
      });
      const routePersistence = await persistMemoryRouteMutation({
        repositories: {
          providerConnections,
          importedEvents,
          cardOpportunities,
          draftStates,
          relationshipMemories,
          cardProjects,
          renderPackets,
          providerCallEvents,
          orders,
          orderEvents,
          consentRecords,
          dataRequests,
          cardGalleryEntries,
          adminRuntimeConfigs
        },
        route,
        authContext,
        bodyText,
        env,
        objectStoreRuntime
      });
      const payload = routeMutationRuntime.decorateMutationPayload({
        route,
        authContext,
        responsePayload,
        runtimeMode: "memory",
        idempotencyKey: prepared.idempotencyKey,
        idempotencyReplayed: false,
        routePersistence,
        queueJob
      });
      const record = {
        requestHash: prepared.requestHash,
        statusCode: 202,
        responseBody: payload
      };
      idempotencyRecords.set(prepared.recordKey, record);
      auditRecords.push({
        actorId: authContext.userId,
        routeId: route.id,
        action: "api.mutation.accepted",
        idempotencyKey: prepared.idempotencyKey
      });
      if (route.runtimeMode === "queue-backed") {
        queuedJobs.push({
          id: queueJob.id,
          userId: authContext.userId,
          routeId: route.id,
          status: "queued",
          payload: queueJob.payload,
          result: {},
          attemptCount: 0,
          maxAttempts: queueJob.maxAttempts,
          createdAtIso: new Date().toISOString()
        });
      }

      return { ok: true, statusCode: 202, payload };
    },
    async readQueuedJob({ authContext, jobId }) {
      const id = safeId(jobId, "");
      const job = queuedJobs.find((candidate) => candidate.id === id && candidate.userId === authContext.userId);
      return routeMutationRuntime.buildQueuedJobReadResult({ runtimeMode: "memory", authContext, job, statusCode: job ? 200 : 404 });
    },
    async leaseProviderJobs() {
      return providerRuntimeUnavailable("memory");
    },
    async readProviderJobStatus() {
      return providerRuntimeUnavailable("memory");
    },
    async completeProviderJob() {
      return providerRuntimeUnavailable("memory");
    },
    async recordProviderCallEvents({ authContext, events = [] }) {
      const normalized = normalizeProviderCallEvents({ authContext, events });
      for (const event of normalized) {
        providerCallEvents.set(event.id, event);
      }
      return { persisted: normalized.length > 0, count: normalized.length, runtimeMode: "memory" };
    },
    async persistGeneratedImageArtifacts({ authContext, payload }) {
      return persistGeneratedImageArtifacts({ objectStoreRuntime, authContext, payload });
    },
    async readArtifact(input) {
      return objectStoreRuntime.readSignedArtifact(input);
    },
    async listArtifacts(input) {
      return objectStoreRuntime.listBucketArtifacts(input);
    },
    async persistGoogleCalendarImport({ authContext, record }) {
      providerConnections.set(record.providerConnection.id, {
        ...record.providerConnection,
        userId: authContext?.userId,
        createdAtIso: new Date().toISOString()
      });
      for (const importedEvent of record.importedEvents) {
        importedEvents.set(importedEvent.id, { ...importedEvent, connectionId: record.providerConnection.id });
      }
      for (const cardOpportunity of record.cardOpportunities) cardOpportunities.set(cardOpportunity.id, cardOpportunity);
      return {
        persisted: true,
        payload: buildGoogleCalendarImportRepositoryPayload(record, "memory", true)
      };
    },
    async readDraftState({ authContext }) {
      return buildDraftStateReadPayload(draftStates.get(authContext.userId), "memory", authContext);
    },
    async readProviderConnection({ authContext, provider = "google_calendar" }) {
      return [...providerConnections.values()].find(
        (connection) => connection.provider === provider && (!connection.userId || connection.userId === authContext.userId)
      );
    },
    async readCustomerConnections({ authContext }) {
      const connectionRecord = [...providerConnections.values()].find(
        (connection) => connection.provider === "google_calendar" && (!connection.userId || connection.userId === authContext.userId)
      );
      const events = connectionRecord
        ? [...importedEvents.values()].filter((event) => event.connectionId === connectionRecord.id)
        : [];
      const eventById = new Map(events.map((event) => [event.id, event]));
      const opportunities = [...cardOpportunities.values()]
        .filter((opportunity) => eventById.has(opportunity.eventId))
        .map((opportunity) => publicOpportunity(opportunity, eventById.get(opportunity.eventId)));
      return buildCustomerConnectionsPayload({
        runtimeMode: "memory",
        authContext,
        connectionRecord: connectionRecord
          ? {
              status: connectionRecord.status,
              scopes: connectionRecord.scopes,
              credentialStorageEnabled: Boolean(connectionRecord.encryptedRefreshToken),
              connectedAtIso: connectionRecord.createdAtIso,
              importedEventCount: events.length,
              opportunityCount: opportunities.length,
              lastImportedAtIso: connectionRecord.createdAtIso
            }
          : undefined,
        opportunities
      });
    },
    async readFeaturedCards() {
      return buildFeaturedCardsPayload([...cardGalleryEntries.values()], "memory");
    },
    async readCardGallery({ authContext }) {
      const candidates = [...draftStates.values()].map((record) => publicGalleryCandidate(record));
      return buildCardGalleryReadPayload({
        runtimeMode: "memory",
        authContext,
        entries: [...cardGalleryEntries.values()].map((entry) => publicGalleryEntry(entry)),
        candidates
      });
    },
    async readAdminAiFlowConfig() {
      return readAdminAiFlowConfigMemory(adminRuntimeConfigs, env);
    },
    async readAdminSafetyControls() {
      return readAdminSafetyControlsMemory(adminRuntimeConfigs);
    },
    async close() {
      return undefined;
    }
  };
}

function authorizeLocalMemoryClerkCustomer({ route, request, sessions, env, token, verification }) {
  if (verification?.status !== "clerk-not-configured") return undefined;
  if (isProductionRuntimeEnv(env)) return undefined;
  if (!localAuthFallbacksEnabled(env)) return undefined;
  if (route.auth !== "customer-session") return undefined;
  const preview = readLocalClerkJwtPreview(token);
  if (!preview) return undefined;
  const sessionId = stableRuntimeId("session", "local-clerk", preview.clerkUserId, preview.clerkSessionId);
  sessions.set(hashSessionToken(token, env.AUTH_SESSION_SECRET), {
    id: sessionId,
    sessionId,
    role: "customer",
    userId: stableRuntimeId("user", "local-clerk", preview.clerkUserId),
    email: preview.email,
    provider: "local-clerk"
  });
  return authorizeFromSessions(route, request, sessions, env.AUTH_SESSION_SECRET);
}

function memoryAuthConfigured(env) {
  return Boolean(
    clerkVerificationConfigured(env) ||
      (localAuthFallbacksEnabled(env) && env.CUSTOMCARD_CUSTOMER_SESSION_TOKEN && env.CUSTOMCARD_ADMIN_SESSION_TOKEN)
  );
}

function localAuthFallbacksEnabled(env) {
  return String(env?.[localAuthFallbackOptInEnvName] ?? "").trim().toLowerCase() === "enabled";
}

function readLocalClerkJwtPreview(token, { nowMs = Date.now() } = {}) {
  if (!looksLikeJwt(token)) return undefined;
  const [, encodedPayload] = String(token).split(".");
  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return undefined;
  }
  const clerkUserId = String(payload.sub ?? "").trim();
  const clerkSessionId = String(payload.sid ?? "").trim();
  if (!/^user_/.test(clerkUserId) || !/^sess_/.test(clerkSessionId)) return undefined;
  const expiresAtMs = Number(payload.exp) * 1000;
  if (!Number.isFinite(expiresAtMs) || expiresAtMs < nowMs) return undefined;
  const notBeforeMs = Number(payload.nbf) * 1000;
  if (Number.isFinite(notBeforeMs) && notBeforeMs > nowMs) return undefined;
  return {
    clerkUserId,
    clerkSessionId,
    email: readJwtEmailPreview(payload)
  };
}

function readJwtEmailPreview(payload) {
  for (const key of ["email", "primary_email", "primaryEmail", "email_address", "emailAddress"]) {
    const value = String(payload[key] ?? "").trim();
    if (value.includes("@")) return value;
  }
  return "";
}

function createPostgresApiRuntime({ env, routes, postgresPoolFactory, objectStoreRuntime }) {
  const postgresRuntime = createPostgresRuntime({ env, postgresPoolFactory });

  async function getPool() {
    return postgresRuntime.getPool();
  }

  const providerJobRuntime = createProviderJobRuntime({
    env,
    getPool,
    postgresRuntime,
    persistGeneratedImageArtifacts: ({ authContext, payload }) =>
      persistGeneratedImageArtifacts({ objectStoreRuntime, authContext, payload })
  });

  return {
    mode: "postgres",
    /** Shared pool access for the durable AI cost gate (provider_call_events). */
    getAiFlowCostPool: getPool,
    describe() {
      const poolConfig = postgresRuntime.describe();
      return {
        mode: "postgres",
        authEnforced: true,
        idempotencyEnforced: true,
        postgresConfigured: Boolean(env.DATABASE_URL),
        pool: {
          max: poolConfig.max,
          connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
          idleTimeoutMillis: poolConfig.idleTimeoutMillis,
          lifecycleAttached: poolConfig.lifecycleAttached
        },
        sessionsConfigured: null,
        idempotencyRecords: null,
        auditRecords: null,
        queuedJobs: null,
        providerConnectionRecords: null,
        importedEventRecords: null,
        cardOpportunityRecords: null,
        draftStateRecords: null,
        relationshipMemoryRecords: null,
        cardProjectRecords: null,
        renderPacketRecords: null,
        providerCallEventRecords: null,
        orderRecords: null,
        orderEventRecords: null,
        consentRecords: null,
        dataRequestRecords: null,
        statefulRoutes: routes.filter((route) => route.auth !== "none").length,
        artifactStore: objectStoreRuntime.describe()
      };
    },
    validate() {
      const blockers = [];
      if (!env.DATABASE_URL) blockers.push("Postgres API runtime requires DATABASE_URL.");
      if (!hasStrongAuthSessionSecret(env)) blockers.push(authSessionSecretMessage);
      blockers.push(...objectStoreRuntime.validate());
      return blockers;
    },
    async authorize(route, request) {
      if (route.auth === "provider-token") return authorizeProviderToken({ env, route, request });
      if (route.auth === "none") return anonymousAuthContext(route);
      const token = readBearerToken(request);
      if (!token) return authError(401, "auth-required", route);

      const pool = await getPool();
      const sessionHash = hashSessionToken(token, env.AUTH_SESSION_SECRET);
      const result = await pool.query(
        `SELECT s.id AS session_id, s.user_id, s.role, u.email, ai.provider AS identity_provider
         FROM auth_sessions s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN account_identities ai ON ai.user_id = s.user_id AND ai.provider = 'clerk'
         WHERE s.session_hash = $1
           AND s.revoked_at IS NULL
           AND s.expires_at > NOW()
         LIMIT 1`,
        [sessionHash]
      );
      const sessionRow = result.rows[0];
      const session = sessionRow
        ? {
            id: sessionRow.session_id,
            sessionId: sessionRow.session_id,
            role: sessionRow.role,
            userId: sessionRow.user_id,
            email: sessionRow.email,
            provider: sessionRow.identity_provider ?? "auth-session"
          }
        : null;
      if (!session) {
        // Clerk bridge: verify the Clerk session JWT offline and mint a durable
        // auth_sessions row so signed-in browsers are never rejected with 401.
        if (looksLikeJwt(token)) {
          const verification = verifyClerkSessionToken(token, env);
          if (verification.ok) {
            const bridged = await postgresRuntime.withTransaction(async (client) =>
              ensureClerkAuthSession(client, { verification, sessionHash })
            );
            return authorizeSessionForRoute(route, bridged);
          }
        }
        return authError(401, "invalid-session", route);
      }
      return authorizeSessionForRoute(route, session);
    },
    async persistMutation({ route, request, authContext, bodyText, responsePayload }) {
      const prepared = routeMutationRuntime.prepareIdempotentMutation({ route, request, authContext, bodyText, responsePayload });
      if (!prepared.ok) return prepared;

      return postgresRuntime.withTransaction(async (client) => {
        const idempotencyId = stableRuntimeId("idem", authContext.userId, route.id, prepared.idempotencyKey);
        const reserved = await client.query(
          `INSERT INTO idempotency_keys
             (id, user_id, route_id, idempotency_key, request_hash, response_body, status, expires_at)
           VALUES ($1, $2, $3, $4, $5, '{}'::jsonb, 'processing', NOW() + INTERVAL '24 hours')
           ON CONFLICT DO NOTHING`,
          [idempotencyId, authContext.userId, route.id, prepared.idempotencyKey, prepared.requestHash]
        );

        if (reserved.rowCount === 0) {
          const existing = await client.query(
            `SELECT request_hash, response_body, status
             FROM idempotency_keys
             WHERE user_id = $1 AND route_id = $2 AND idempotency_key = $3
             FOR UPDATE`,
            [authContext.userId, route.id, prepared.idempotencyKey]
          );
          return routeMutationRuntime.replayOrConflict(
            {
              requestHash: existing.rows[0].request_hash,
              responseBody: normalizeJson(existing.rows[0].response_body),
              statusCode: 202
            },
            prepared.requestHash
          );
        }

        const queueJob = routeMutationRuntime.buildQueuedJobRecord({
          route,
          authContext,
          idempotencyKey: prepared.idempotencyKey,
          idempotencyKeyId: idempotencyId,
          bodyText
        });
        const routePersistence = await persistPostgresRouteMutation({
          client,
          route,
          authContext,
          bodyText,
          env,
          objectStoreRuntime
        });
        const responseBody = routeMutationRuntime.decorateMutationPayload({
          route,
          authContext,
          responsePayload,
          runtimeMode: "postgres",
          idempotencyKey: prepared.idempotencyKey,
          idempotencyReplayed: false,
          routePersistence,
          queueJob
        });
        await client.query(
          `UPDATE idempotency_keys
           SET response_body = $2::jsonb, status = 'completed'
           WHERE id = $1`,
          [idempotencyId, JSON.stringify(responseBody)]
        );
        if (route.id === "render-packets") {
          const providerCallEvent = buildRenderProviderCallEvent({ authContext, bodyText, idempotencyId });
          await client.query(
            `INSERT INTO provider_call_events
               (id, tenant_id, user_id, route_id, idempotency_key_id, adapter_id, provider, capability, status,
                fallback_from_adapter_id, fallback_reason, month_bucket, request_units, estimated_cost_cents,
                actual_cost_cents, rate_limit_window_start, latency_ms, error_class, pii_free, live_network_call, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'fallback-selected',
                     NULL, 'no-preferred-provider', to_char(NOW(), 'YYYY-MM'), 1, 0,
                     NULL, date_trunc('minute', NOW()), NULL, NULL, TRUE, FALSE, $9::jsonb)
             ON CONFLICT (id) DO NOTHING`,
            [
              providerCallEvent.id,
              providerCallEvent.tenantId,
              authContext.userId,
              route.id,
              idempotencyId,
              providerCallEvent.adapterId,
              providerCallEvent.provider,
              providerCallEvent.capability,
              JSON.stringify(providerCallEvent.metadata)
            ]
          );
        }
        await client.query(
          `INSERT INTO audit_log (subject_type, subject_id, actor_id, action, metadata)
           VALUES ('api_route', $1, $2, 'api.mutation.accepted', $3::jsonb)`,
          [route.id, authContext.userId, JSON.stringify({ idempotencyKey: prepared.idempotencyKey })]
        );
        if (route.runtimeMode === "queue-backed") {
          await client.query(
            `INSERT INTO api_jobs (id, user_id, route_id, idempotency_key_id, status, payload, result)
             VALUES ($1, $2, $3, $4, 'queued', $5::jsonb, '{}'::jsonb)`,
            [
              queueJob.id,
              authContext.userId,
              route.id,
              idempotencyId,
              JSON.stringify(queueJob.payload)
            ]
          );
        }
        return { ok: true, statusCode: 202, payload: responseBody };
      });
    },
    async recordProviderCallEvents({ authContext, events = [] }) {
      const normalized = normalizeProviderCallEvents({ authContext, events });
      if (normalized.length === 0) return { persisted: false, count: 0, runtimeMode: "postgres" };
      return postgresRuntime.withTransaction(async (client) => {
        for (const event of normalized) {
          await client.query(
            `INSERT INTO provider_call_events
               (id, tenant_id, user_id, route_id, idempotency_key_id, adapter_id, provider, capability, status,
                fallback_from_adapter_id, fallback_reason, month_bucket, request_units, estimated_cost_cents,
                actual_cost_cents, rate_limit_window_start, latency_ms, error_class, pii_free, live_network_call, metadata)
             VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8,
                     $9, $10, $11, $12, $13,
                     $14, $15::timestamptz, $16, $17, TRUE, $18, $19::jsonb)
             ON CONFLICT (id) DO NOTHING`,
            [
              event.id,
              event.tenantId,
              event.userId,
              event.routeId,
              event.adapterId,
              event.provider,
              event.capability,
              event.status,
              event.fallbackFromAdapterId,
              event.fallbackReason,
              event.monthBucket,
              event.requestUnits,
              event.estimatedCostCents,
              event.actualCostCents,
              event.rateLimitWindowStartIso,
              event.latencyMs,
              event.errorClass,
              event.liveNetworkCall,
              JSON.stringify(event.metadata)
            ]
          );
        }
        return { persisted: true, count: normalized.length, runtimeMode: "postgres" };
      });
    },
    async persistGeneratedImageArtifacts({ authContext, payload }) {
      return persistGeneratedImageArtifacts({ objectStoreRuntime, authContext, payload });
    },
    async readArtifact(input) {
      return objectStoreRuntime.readSignedArtifact(input);
    },
    async readQueuedJob({ authContext, jobId }) {
      const pool = await getPool();
      const result = await pool.query(
        `SELECT id, user_id, route_id, status, result, attempt_count, max_attempts, last_error, created_at, updated_at
         FROM api_jobs
         WHERE id = $1 AND user_id = $2
         LIMIT 1`,
        [safeId(jobId, ""), authContext.userId]
      );
      const row = result.rows[0];
      const job = row
        ? {
            id: row.id,
            userId: row.user_id,
            routeId: row.route_id,
            status: row.status,
            result: normalizeJson(row.result),
            attemptCount: Number(row.attempt_count ?? 0),
            maxAttempts: Number(row.max_attempts ?? 3),
            lastError: row.last_error ?? "",
            createdAtIso: new Date(row.created_at).toISOString(),
            updatedAtIso: new Date(row.updated_at).toISOString()
          }
        : undefined;
      return routeMutationRuntime.buildQueuedJobReadResult({ runtimeMode: "postgres", authContext, job, statusCode: job ? 200 : 404 });
    },
    async leaseProviderJobs(input = {}) {
      return providerJobRuntime.leaseJobs(input);
    },
    async readProviderJobStatus(input = {}) {
      return providerJobRuntime.readStatus(input);
    },
    async completeProviderJob(input = {}) {
      return providerJobRuntime.completeJob(input);
    },
    async listArtifacts(input) {
      return objectStoreRuntime.listBucketArtifacts(input);
    },
    async persistGoogleCalendarImport({ authContext, record }) {
      return postgresRuntime.withTransaction(async (client) => {
        await persistGoogleCalendarImportPostgres(client, authContext, record);
        await client.query(
          `INSERT INTO audit_log (subject_type, subject_id, actor_id, action, metadata)
           VALUES ('provider_connection', $1, $2, 'google_calendar.oauth.imported', $3::jsonb)`,
          [
            record.providerConnection.id,
            authContext.userId,
            JSON.stringify({
              importedEventCount: record.importedEvents.length,
              rawContentStored: false,
              provider: "google-calendar"
            })
          ]
        );
        return {
          persisted: true,
          payload: buildGoogleCalendarImportRepositoryPayload(record, "postgres", true)
        };
      });
    },
    async readDraftState({ authContext }) {
      const pool = await getPool();
      const result = await pool.query(
        `SELECT id, status, draft_input, opportunity_id, opportunity_decision, vendor_id, locale, updated_at
         FROM draft_states
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT 1`,
        [authContext.userId]
      );
      const row = result.rows[0];
      if (!row) return buildDraftStateReadPayload(undefined, "postgres", authContext);
      return buildDraftStateReadPayload(
        {
          id: row.id,
          status: row.status,
          draftInput: normalizeJson(row.draft_input),
          opportunityId: row.opportunity_id,
          opportunityDecision: row.opportunity_decision,
          vendorId: row.vendor_id,
          localeCode: row.locale,
          updatedAtIso: new Date(row.updated_at).toISOString()
        },
        "postgres",
        authContext
      );
    },
    async readProviderConnection({ authContext, provider = "google_calendar" }) {
      const pool = await getPool();
      const result = await pool.query(
        `SELECT id, provider, scopes, status, encrypted_refresh_token, created_at
         FROM provider_connections
         WHERE user_id = $1 AND provider = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [authContext.userId, provider]
      );
      const row = result.rows[0];
      if (!row) return undefined;
      return {
        id: row.id,
        provider: row.provider,
        scopes: row.scopes ?? [],
        status: row.status,
        encryptedRefreshToken: row.encrypted_refresh_token ?? "",
        createdAtIso: new Date(row.created_at).toISOString()
      };
    },
    async readCustomerConnections({ authContext }) {
      const pool = await getPool();
      const connectionResult = await pool.query(
        `SELECT id, scopes, status, encrypted_refresh_token, created_at
         FROM provider_connections
         WHERE user_id = $1 AND provider = 'google_calendar'
         ORDER BY created_at DESC
         LIMIT 1`,
        [authContext.userId]
      );
      const row = connectionResult.rows[0];
      let connectionRecord;
      let opportunities = [];
      if (row) {
        const statsResult = await pool.query(
          `SELECT COUNT(*)::int AS imported_count, MAX(created_at) AS last_imported_at
           FROM imported_events
           WHERE connection_id = $1`,
          [row.id]
        );
        const opportunityResult = await pool.query(
          `SELECT o.id, o.recipient_name, o.confidence, o.decision, o.evidence,
                  e.id AS event_id, e.title, e.starts_at, e.timezone, e.source_evidence
           FROM card_opportunities o
           JOIN imported_events e ON e.id = o.event_id
           WHERE e.connection_id = $1
           ORDER BY e.starts_at ASC
           LIMIT 25`,
          [row.id]
        );
        opportunities = opportunityResult.rows.map((opportunityRow) =>
          publicOpportunity(
            {
              id: opportunityRow.id,
              eventId: opportunityRow.event_id,
              recipientName: opportunityRow.recipient_name,
              confidence: Number(opportunityRow.confidence),
              decision: opportunityRow.decision,
              evidence: normalizeJson(opportunityRow.evidence)
            },
            {
              id: opportunityRow.event_id,
              title: opportunityRow.title,
              startsAt: new Date(opportunityRow.starts_at).toISOString(),
              timezone: opportunityRow.timezone,
              sourceEvidence: opportunityRow.source_evidence
            }
          )
        );
        const stats = statsResult.rows[0] ?? {};
        connectionRecord = {
          status: row.status,
          scopes: row.scopes ?? [],
          credentialStorageEnabled: Boolean(row.encrypted_refresh_token),
          connectedAtIso: new Date(row.created_at).toISOString(),
          importedEventCount: Number(stats.imported_count ?? 0),
          opportunityCount: opportunities.length,
          lastImportedAtIso: stats.last_imported_at ? new Date(stats.last_imported_at).toISOString() : undefined
        };
      }
      return buildCustomerConnectionsPayload({ runtimeMode: "postgres", authContext, connectionRecord, opportunities });
    },
    async readFeaturedCards() {
      const pool = await getPool();
      try {
        const result = await pool.query(
          `SELECT id, category, title, public_caption, featured, featured_rank, public_approved,
                  front_svg, thumbnail_artifact_uri, front_artifact_uri
           FROM card_gallery_entries
           WHERE featured = TRUE AND public_approved = TRUE
           ORDER BY category ASC, featured_rank ASC, created_at ASC
           LIMIT 60`
        );
        return buildFeaturedCardsPayload(
          result.rows.map((row) => ({
            id: row.id,
            category: row.category,
            title: row.title,
            publicCaption: row.public_caption,
            featured: row.featured,
            featuredRank: Number(row.featured_rank),
            publicApproved: row.public_approved,
            frontSvg: row.front_svg ?? undefined,
            thumbnailArtifactUri: row.thumbnail_artifact_uri ?? undefined,
            frontArtifactUri: row.front_artifact_uri ?? undefined
          })),
          "postgres"
        );
      } catch {
        return buildFeaturedCardsPayload([], "postgres");
      }
    },
    async readCardGallery({ authContext }) {
      const pool = await getPool();
      const readIssues = [];
      let entriesRows = [];
      let candidateRows = [];
      try {
        const entriesResult = await pool.query(
          `SELECT id, project_id, render_packet_id, source_draft_id, category, title, public_caption,
                  featured, featured_rank, public_approved, front_svg, thumbnail_artifact_uri,
                  front_artifact_uri, created_at, updated_at
           FROM card_gallery_entries
           ORDER BY category ASC, featured_rank ASC, updated_at DESC
           LIMIT 200`
        );
        entriesRows = entriesResult.rows;
      } catch (error) {
        readIssues.push(repositoryReadIssue("card_gallery_entries", error));
      }
      try {
        const candidatesResult = await pool.query(
          `SELECT id, user_id, status, draft_input, locale, updated_at
           FROM draft_states
           ORDER BY updated_at DESC
           LIMIT 25`
        );
        candidateRows = candidatesResult.rows;
      } catch (error) {
        readIssues.push(repositoryReadIssue("draft_states", error));
      }
      return buildCardGalleryReadPayload({
        runtimeMode: "postgres",
        authContext,
        entries: entriesRows.map((row) =>
          publicGalleryEntry({
            id: row.id,
            projectId: row.project_id,
            renderPacketId: row.render_packet_id,
            sourceDraftId: row.source_draft_id,
            category: row.category,
            title: row.title,
            publicCaption: row.public_caption,
            featured: row.featured,
            featuredRank: Number(row.featured_rank),
            publicApproved: row.public_approved,
            frontSvg: row.front_svg ?? undefined,
            thumbnailArtifactUri: row.thumbnail_artifact_uri ?? undefined,
            frontArtifactUri: row.front_artifact_uri ?? undefined,
            createdAtIso: new Date(row.created_at).toISOString(),
            updatedAtIso: new Date(row.updated_at).toISOString()
          })
        ),
        candidates: candidateRows.map((row) =>
          publicGalleryCandidate({
            id: row.id,
            userId: row.user_id,
            status: row.status,
            draftInput: normalizeJson(row.draft_input),
            localeCode: row.locale,
            updatedAtIso: new Date(row.updated_at).toISOString()
          })
        ),
        readIssues
      });
    },
    async readAdminAiFlowConfig() {
      return readAdminAiFlowConfigPostgres({ getPool, env });
    },
    async readAdminSafetyControls() {
      return readAdminSafetyControlsPostgres({ getPool });
    },
    async close() {
      await postgresRuntime.close();
    }
  };
}

function addSession(sessions, token, role, userId, sessionSecret) {
  if (!token) return;
  sessions.set(hashSessionToken(token, sessionSecret), {
    id: stableRuntimeId("session", role, userId),
    role,
    userId,
    provider: "seeded"
  });
}

function authorizeFromSessions(route, request, sessions, sessionSecret) {
  if (route.auth === "none") return anonymousAuthContext(route);
  const token = readBearerToken(request);
  if (!token) return authError(401, "auth-required", route);
  const session = sessions.get(hashSessionToken(token, sessionSecret));
  if (!session) return authError(401, "invalid-session", route);
  return authorizeSessionForRoute(route, session);
}

function authorizeSessionForRoute(route, session) {
  const requiredRole = requiredRoleForAuth(route.auth);
  if (session.role === requiredRole) return { ok: true, ...session, role: requiredRole };
  if (canClerkAdminUseCustomerRoute(session, requiredRole)) return { ok: true, ...session, role: "customer" };
  return authError(403, "wrong-role", route);
}

function canClerkAdminUseCustomerRoute(session, requiredRole) {
  return (
    requiredRole === "customer" &&
    session.role === "admin" &&
    String(session.provider ?? "")
      .toLowerCase()
      .includes("clerk")
  );
}

function anonymousAuthContext(route) {
  const role = route.audience === "admin" ? "admin" : route.audience;
  return {
    ok: true,
    role,
    userId: role === "customer" ? "anonymous-customer" : "public",
    sessionId: "anonymous"
  };
}

function requiredRoleForAuth(auth) {
  if (auth === "admin-session") return "admin";
  if (auth === "provider-token") return "provider";
  return "customer";
}

const memoryRoutePersistenceAdapters = {
  "import-preview": persistImportPreviewMemory,
  "card-projects": persistCardProjectMemory,
  "customer-draft-state-save": persistDraftStateMemory,
  "relationship-memories": persistRelationshipMemoryMemory,
  "render-packets": persistRenderPacketMemory,
  "manual-vendor-handoff": persistManualVendorHandoffMemory,
  "data-requests": persistDataRequestMemory,
  "admin-card-gallery-save": persistCardGalleryMemory,
  "admin-ai-flow-configs-save": persistAdminAiFlowConfigMemory,
  "admin-safety-controls-save": persistAdminSafetyControlsMemory
};

const postgresRoutePersistenceAdapters = {
  "import-preview": persistImportPreviewPostgres,
  "card-projects": persistCardProjectPostgres,
  "customer-draft-state-save": persistDraftStatePostgres,
  "relationship-memories": persistRelationshipMemoryPostgres,
  "render-packets": persistRenderPacketPostgres,
  "manual-vendor-handoff": persistManualVendorHandoffPostgres,
  "data-requests": persistDataRequestPostgres,
  "admin-card-gallery-save": persistCardGalleryPostgres,
  "admin-ai-flow-configs-save": persistAdminAiFlowConfigPostgres,
  "admin-safety-controls-save": persistAdminSafetyControlsPostgres
};

export function describeApiRoutePersistenceAdapters() {
  return {
    memory: Object.keys(memoryRoutePersistenceAdapters).sort(),
    postgres: Object.keys(postgresRoutePersistenceAdapters).sort()
  };
}

async function persistMemoryRouteMutation(input) {
  return memoryRoutePersistenceAdapters[input.route.id]?.(input);
}

async function persistPostgresRouteMutation(input) {
  return postgresRoutePersistenceAdapters[input.route.id]?.(input);
}

function persistImportPreviewMemory({ repositories, authContext, bodyText }) {
  const record = buildImportPreviewRecord({ authContext, bodyText });
  repositories.providerConnections.set(record.providerConnection.id, record.providerConnection);
  repositories.importedEvents.set(record.importedEvent.id, record.importedEvent);
  repositories.cardOpportunities.set(record.cardOpportunity.id, record.cardOpportunity);
  return {
    persisted: true,
    payload: buildImportPreviewRepositoryPayload(record, "memory")
  };
}

function persistCardProjectMemory({ repositories, authContext, bodyText }) {
  const record = buildCardProjectRecord({ authContext, bodyText });
  repositories.cardProjects.set(record.projectId, record);
  return {
    persisted: true,
    payload: buildCardProjectRepositoryPayload(record, "memory")
  };
}

function persistDraftStateMemory({ repositories, authContext, bodyText }) {
  const record = buildDraftStateRecord({ authContext, bodyText });
  repositories.draftStates.set(authContext.userId, record);
  return {
    persisted: true,
    payload: buildDraftStateRepositoryPayload(record, "memory")
  };
}

function persistRelationshipMemoryMemory({ repositories, authContext, bodyText }) {
  const record = buildRelationshipMemoryRecord({ authContext, bodyText });
  repositories.relationshipMemories.set(record.id, record);
  return {
    persisted: true,
    payload: buildRelationshipMemoryRepositoryPayload(record, "memory")
  };
}

async function persistRenderPacketMemory({ repositories, route, authContext, bodyText, objectStoreRuntime }) {
  const record = buildRenderPacketRecord({ authContext, bodyText });
  const artifactPersistence = await objectStoreRuntime.persistRenderPacketArtifacts({ record, bodyText, authContext });
  const persistedRecord = artifactPersistence.record;
  repositories.renderPackets.set(persistedRecord.id, persistedRecord);
  const providerCallEvent = buildRenderProviderCallEvent({
    authContext,
    bodyText,
    idempotencyId: stableRuntimeId("idem", authContext.userId, route.id, persistedRecord.id)
  });
  repositories.providerCallEvents.set(providerCallEvent.id, providerCallEvent);
  return {
    persisted: true,
    payload: buildRenderPacketRepositoryPayload(persistedRecord, "memory", artifactPersistence.payload)
  };
}

function persistManualVendorHandoffMemory({ repositories, authContext, bodyText }) {
  const record = buildManualVendorHandoffRecord({ authContext, bodyText });
  repositories.orders.set(record.order.id, record.order);
  repositories.orderEvents.set(record.orderEvent.id, record.orderEvent);
  repositories.consentRecords.set(record.consentRecord.id, record.consentRecord);
  return {
    persisted: true,
    payload: buildManualVendorHandoffRepositoryPayload(record, "memory")
  };
}

function persistDataRequestMemory({ repositories, authContext, bodyText }) {
  const record = buildDataRequestRecord({ authContext, bodyText });
  repositories.dataRequests.set(record.dataRequest.id, record.dataRequest);
  repositories.consentRecords.set(record.consentRecord.id, record.consentRecord);
  return {
    persisted: true,
    payload: buildDataRequestRepositoryPayload(record, "memory")
  };
}

function persistCardGalleryMemory({ repositories, authContext, bodyText }) {
  const record = buildCardGalleryEntryRecord({ authContext, bodyText });
  if (record.remove) {
    repositories.cardGalleryEntries.delete(record.id);
  } else {
    repositories.cardGalleryEntries.set(record.id, { ...record, updatedAtIso: new Date().toISOString() });
  }
  return {
    persisted: true,
    payload: buildCardGalleryRepositoryPayload(record, "memory")
  };
}

function readAdminAiFlowConfigMemory(adminRuntimeConfigs, env) {
  const record = adminRuntimeConfigs.get(adminRuntimeConfigKeys.aiFlowConfigs);
  return buildAdminAiFlowConfigPayload({
    input: record?.payload,
    env,
    runtimeMode: "memory",
    version: record?.version ?? 0,
    updatedAtIso: record?.updatedAtIso ?? null,
    updatedBy: record?.updatedBy ?? null
  });
}

function persistAdminAiFlowConfigMemory({ repositories, authContext, bodyText, env }) {
  const current = readAdminAiFlowConfigMemory(repositories.adminRuntimeConfigs, env);
  const payload = buildUpdatedAdminAiFlowConfigPayload({
    body: parseJsonBody(bodyText),
    env,
    authContext,
    current,
    runtimeMode: "memory"
  });
  repositories.adminRuntimeConfigs.set(adminRuntimeConfigKeys.aiFlowConfigs, {
    payload,
    version: payload.version,
    updatedAtIso: payload.updatedAtIso,
    updatedBy: payload.updatedBy
  });
  return {
    persisted: true,
    payload
  };
}

function readAdminSafetyControlsMemory(adminRuntimeConfigs) {
  const record = adminRuntimeConfigs.get(adminRuntimeConfigKeys.safetyControls);
  return normalizeAdminSafetyControls(record?.payload);
}

function persistAdminSafetyControlsMemory({ repositories, authContext, bodyText }) {
  const current = readAdminSafetyControlsMemory(repositories.adminRuntimeConfigs);
  const payload = updateAdminSafetyControls(current, parseJsonBody(bodyText), { authContext });
  repositories.adminRuntimeConfigs.set(adminRuntimeConfigKeys.safetyControls, {
    payload,
    version: Number(repositories.adminRuntimeConfigs.get(adminRuntimeConfigKeys.safetyControls)?.version ?? 0) + 1,
    updatedAtIso: payload.updatedAtIso,
    updatedBy: payload.updatedBy
  });
  return {
    persisted: true,
    payload
  };
}

async function persistImportPreviewPostgres({ client, authContext, bodyText }) {
  const record = buildImportPreviewRecord({ authContext, bodyText });
  await client.query(
    `INSERT INTO provider_connections
       (id, user_id, provider, scopes, status, adapter_version, metadata_schema, raw_content_stored)
     VALUES ($1, $2, $3, $4::text[], 'connected', $5, $6::jsonb, FALSE)
     ON CONFLICT (id) DO UPDATE SET
       provider = EXCLUDED.provider,
       scopes = EXCLUDED.scopes,
       status = EXCLUDED.status,
       adapter_version = EXCLUDED.adapter_version,
       metadata_schema = EXCLUDED.metadata_schema,
       raw_content_stored = FALSE`,
    [
      record.providerConnection.id,
      authContext.userId,
      record.providerConnection.provider,
      record.providerConnection.scopes,
      record.providerConnection.adapterVersion,
      JSON.stringify(record.providerConnection.metadataSchema)
    ]
  );
  await client.query(
    `INSERT INTO imported_events
       (id, connection_id, title, starts_at, timezone, source_evidence, recipient_hint)
     VALUES ($1, $2, $3, $4::timestamptz, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       connection_id = EXCLUDED.connection_id,
       title = EXCLUDED.title,
       starts_at = EXCLUDED.starts_at,
       timezone = EXCLUDED.timezone,
       source_evidence = EXCLUDED.source_evidence,
       recipient_hint = EXCLUDED.recipient_hint`,
    [
      record.importedEvent.id,
      record.providerConnection.id,
      record.importedEvent.title,
      record.importedEvent.startsAt,
      record.importedEvent.timezone,
      record.importedEvent.sourceEvidence,
      record.importedEvent.recipientHint
    ]
  );
  await client.query(
    `INSERT INTO card_opportunities
       (id, event_id, recipient_name, lead_time_hours, confidence, decision, evidence)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     ON CONFLICT (id) DO UPDATE SET
       event_id = EXCLUDED.event_id,
       recipient_name = EXCLUDED.recipient_name,
       lead_time_hours = EXCLUDED.lead_time_hours,
       confidence = EXCLUDED.confidence,
       decision = EXCLUDED.decision,
       evidence = EXCLUDED.evidence`,
    [
      record.cardOpportunity.id,
      record.importedEvent.id,
      record.cardOpportunity.recipientName,
      record.cardOpportunity.leadTimeHours,
      record.cardOpportunity.confidence,
      record.cardOpportunity.decision,
      JSON.stringify(record.cardOpportunity.evidence)
    ]
  );
  return {
    persisted: true,
    payload: buildImportPreviewRepositoryPayload(record, "postgres")
  };
}

async function persistCardProjectPostgres({ client, authContext, bodyText }) {
  const record = buildCardProjectRecord({ authContext, bodyText });
  await client.query(
    `INSERT INTO card_projects
       (id, opportunity_id, recipient_name, locale, requires_rtl_layout, approved_memory_ids)
     VALUES ($1, $2, $3, $4, $5, $6::text[])
     ON CONFLICT (id) DO UPDATE SET
       opportunity_id = EXCLUDED.opportunity_id,
       recipient_name = EXCLUDED.recipient_name,
       locale = EXCLUDED.locale,
       requires_rtl_layout = EXCLUDED.requires_rtl_layout,
       approved_memory_ids = EXCLUDED.approved_memory_ids`,
    [
      record.projectId,
      record.opportunityId,
      record.recipientName,
      record.locale,
      record.requiresRtlLayout,
      record.approvedMemoryIds
    ]
  );
  return {
    persisted: true,
    payload: buildCardProjectRepositoryPayload(record, "postgres")
  };
}

async function persistDraftStatePostgres({ client, authContext, bodyText }) {
  const record = buildDraftStateRecord({ authContext, bodyText });
  const result = await client.query(
    `INSERT INTO draft_states
       (id, user_id, status, draft_input, opportunity_id, opportunity_decision, vendor_id, locale, raw_content_stored, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, FALSE, $9::timestamptz)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       draft_input = EXCLUDED.draft_input,
       opportunity_id = EXCLUDED.opportunity_id,
       opportunity_decision = EXCLUDED.opportunity_decision,
       vendor_id = EXCLUDED.vendor_id,
       locale = EXCLUDED.locale,
       raw_content_stored = FALSE,
       updated_at = EXCLUDED.updated_at
     WHERE draft_states.user_id = EXCLUDED.user_id
     RETURNING id`,
    [
      record.id,
      authContext.userId,
      record.status,
      JSON.stringify(record.draftInput),
      record.opportunityId,
      record.opportunityDecision,
      record.vendorId,
      record.localeCode,
      record.updatedAtIso
    ]
  );
  if (result.rowCount !== 1) {
    return {
      persisted: false,
      payload: buildDraftStateConflictPayload(record, "postgres")
    };
  }
  return {
    persisted: true,
    payload: buildDraftStateRepositoryPayload(record, "postgres")
  };
}

async function persistRelationshipMemoryPostgres({ client, authContext, bodyText }) {
  const record = buildRelationshipMemoryRecord({ authContext, bodyText });
  await client.query(
    `INSERT INTO relationship_memories
       (id, user_id, recipient_name, approved, sensitivity, locale, source, text, forgotten_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz)
     ON CONFLICT (id) DO UPDATE SET
       recipient_name = EXCLUDED.recipient_name,
       approved = EXCLUDED.approved,
       sensitivity = EXCLUDED.sensitivity,
       locale = EXCLUDED.locale,
       source = EXCLUDED.source,
       text = EXCLUDED.text,
       forgotten_at = EXCLUDED.forgotten_at`,
    [
      record.id,
      authContext.userId,
      record.recipientName,
      record.approved,
      record.sensitivity,
      record.locale,
      record.source,
      record.text,
      record.forgottenAt
    ]
  );
  return {
    persisted: true,
    payload: buildRelationshipMemoryRepositoryPayload(record, "postgres")
  };
}

async function persistRenderPacketPostgres({ client, authContext, bodyText, objectStoreRuntime }) {
  const record = buildRenderPacketRecord({ authContext, bodyText });
  const artifactPersistence = await objectStoreRuntime.persistRenderPacketArtifacts({ record, bodyText, authContext });
  const persistedRecord = artifactPersistence.record;
  await client.query(
    `INSERT INTO render_packets
       (id, project_id, kind, width, height, dpi, locale, direction, safe_zone_passed, text_overflow,
        checksum, artifact_uri, storage_provider, artifact_count, artifact_manifest,
        signed_url_expires_at, external_share_approval_required, real_orders_enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
             $11, $12, $13, $14, $15::jsonb, $16::timestamptz, $17, FALSE)
     ON CONFLICT (id) DO UPDATE SET
       project_id = EXCLUDED.project_id,
       kind = EXCLUDED.kind,
       width = EXCLUDED.width,
       height = EXCLUDED.height,
       dpi = EXCLUDED.dpi,
       locale = EXCLUDED.locale,
       direction = EXCLUDED.direction,
       safe_zone_passed = EXCLUDED.safe_zone_passed,
       text_overflow = EXCLUDED.text_overflow,
       checksum = EXCLUDED.checksum,
       artifact_uri = EXCLUDED.artifact_uri,
       storage_provider = EXCLUDED.storage_provider,
       artifact_count = EXCLUDED.artifact_count,
       artifact_manifest = EXCLUDED.artifact_manifest,
       signed_url_expires_at = EXCLUDED.signed_url_expires_at,
       external_share_approval_required = EXCLUDED.external_share_approval_required,
       real_orders_enabled = FALSE`,
    [
      persistedRecord.id,
      persistedRecord.projectId,
      persistedRecord.kind,
      persistedRecord.width,
      persistedRecord.height,
      persistedRecord.dpi,
      persistedRecord.locale,
      persistedRecord.direction,
      persistedRecord.safeZonePassed,
      persistedRecord.textOverflow,
      persistedRecord.checksum,
      persistedRecord.artifactUri,
      persistedRecord.storageProvider,
      persistedRecord.artifactCount,
      JSON.stringify(persistedRecord.artifactManifest),
      persistedRecord.signedUrlExpiresAt,
      persistedRecord.externalShareApprovalRequired
    ]
  );
  return {
    persisted: true,
    payload: buildRenderPacketRepositoryPayload(persistedRecord, "postgres", artifactPersistence.payload)
  };
}

async function persistManualVendorHandoffPostgres({ client, authContext, bodyText }) {
  const record = buildManualVendorHandoffRecord({ authContext, bodyText });
  await client.query(
    `INSERT INTO orders
       (id, project_id, status, store_id, quote_cents, pickup_window_minutes, certification_recorded, recovery_actions)
     VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7::jsonb)
     ON CONFLICT (id) DO UPDATE SET
       project_id = EXCLUDED.project_id,
       status = EXCLUDED.status,
       store_id = EXCLUDED.store_id,
       quote_cents = EXCLUDED.quote_cents,
       pickup_window_minutes = EXCLUDED.pickup_window_minutes,
       certification_recorded = FALSE,
       recovery_actions = EXCLUDED.recovery_actions,
       updated_at = NOW()`,
    [
      record.order.id,
      record.order.projectId,
      record.order.status,
      record.order.storeId,
      record.order.quoteCents,
      record.order.pickupWindowMinutes,
      JSON.stringify(record.order.recoveryActions)
    ]
  );
  await client.query(
    `INSERT INTO order_events (order_id, event_type, payload)
     VALUES ($1, $2, $3::jsonb)`,
    [record.order.id, record.orderEvent.eventType, JSON.stringify(record.orderEvent.payload)]
  );
  await client.query(
    `INSERT INTO consent_records (id, user_id, action, region, granted, controls)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (id) DO UPDATE SET
       action = EXCLUDED.action,
       region = EXCLUDED.region,
       granted = EXCLUDED.granted,
       controls = EXCLUDED.controls`,
    [
      record.consentRecord.id,
      authContext.userId,
      record.consentRecord.action,
      record.consentRecord.region,
      record.consentRecord.granted,
      JSON.stringify(record.consentRecord.controls)
    ]
  );
  return {
    persisted: true,
    payload: buildManualVendorHandoffRepositoryPayload(record, "postgres")
  };
}

async function persistDataRequestPostgres({ client, authContext, bodyText }) {
  const record = buildDataRequestRecord({ authContext, bodyText });
  await client.query(
    `INSERT INTO data_requests (id, user_id, request_type, status, due_at, completed_at)
     VALUES ($1, $2, $3, $4, $5::timestamptz, NULL)
     ON CONFLICT (id) DO UPDATE SET
       request_type = EXCLUDED.request_type,
       status = EXCLUDED.status,
       due_at = EXCLUDED.due_at,
       completed_at = EXCLUDED.completed_at`,
    [
      record.dataRequest.id,
      authContext.userId,
      record.dataRequest.requestType,
      record.dataRequest.status,
      record.dataRequest.dueAt
    ]
  );
  await client.query(
    `INSERT INTO consent_records (id, user_id, action, region, granted, controls)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (id) DO UPDATE SET
       action = EXCLUDED.action,
       region = EXCLUDED.region,
       granted = EXCLUDED.granted,
       controls = EXCLUDED.controls`,
    [
      record.consentRecord.id,
      authContext.userId,
      record.consentRecord.action,
      record.consentRecord.region,
      record.consentRecord.granted,
      JSON.stringify(record.consentRecord.controls)
    ]
  );
  return {
    persisted: true,
    payload: buildDataRequestRepositoryPayload(record, "postgres")
  };
}

async function persistCardGalleryPostgres({ client, authContext, bodyText }) {
  const record = buildCardGalleryEntryRecord({ authContext, bodyText });
  if (record.remove) {
    await client.query(`DELETE FROM card_gallery_entries WHERE id = $1`, [record.id]);
    return { persisted: true, payload: buildCardGalleryRepositoryPayload(record, "postgres") };
  }
  // The curating admin must exist in users for the created_by FK.
  await client.query(
    `INSERT INTO users (id, email, locale, region, platform)
     VALUES ($1, $2, 'en-US', 'us', 'web')
     ON CONFLICT (id) DO NOTHING`,
    [authContext.userId, authContext.email || `${authContext.userId}@customcard.invalid`]
  );
  const projectExists = record.projectId
    ? (await client.query(`SELECT 1 FROM card_projects WHERE id = $1`, [record.projectId])).rowCount > 0
    : false;
  const renderPacketExists = record.renderPacketId
    ? (await client.query(`SELECT 1 FROM render_packets WHERE id = $1`, [record.renderPacketId])).rowCount > 0
    : false;
  await client.query(
    `INSERT INTO card_gallery_entries
       (id, project_id, render_packet_id, source_draft_id, category, title, public_caption,
        featured, featured_rank, public_approved, front_svg, thumbnail_artifact_uri, front_artifact_uri,
        redacted, created_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, $14, NOW())
     ON CONFLICT (id) DO UPDATE SET
       project_id = EXCLUDED.project_id,
       render_packet_id = EXCLUDED.render_packet_id,
       source_draft_id = EXCLUDED.source_draft_id,
       category = EXCLUDED.category,
       title = EXCLUDED.title,
       public_caption = EXCLUDED.public_caption,
       featured = EXCLUDED.featured,
       featured_rank = EXCLUDED.featured_rank,
       public_approved = EXCLUDED.public_approved,
       front_svg = COALESCE(EXCLUDED.front_svg, card_gallery_entries.front_svg),
       thumbnail_artifact_uri = COALESCE(EXCLUDED.thumbnail_artifact_uri, card_gallery_entries.thumbnail_artifact_uri),
       front_artifact_uri = COALESCE(EXCLUDED.front_artifact_uri, card_gallery_entries.front_artifact_uri),
       redacted = TRUE,
       updated_at = NOW()`,
    [
      record.id,
      projectExists ? record.projectId : null,
      renderPacketExists ? record.renderPacketId : null,
      record.sourceDraftId || null,
      record.category,
      record.title,
      record.publicCaption,
      record.featured,
      record.featuredRank,
      record.publicApproved,
      record.frontSvg || null,
      record.thumbnailArtifactUri || null,
      record.frontArtifactUri || null,
      authContext.userId
    ]
  );
  return { persisted: true, payload: buildCardGalleryRepositoryPayload(record, "postgres") };
}

async function readAdminRuntimeConfigPostgres({ getPool, key }) {
  const pool = await getPool();
  const result = await pool.query(
    `SELECT key, payload, version, updated_by, updated_at
     FROM admin_runtime_configs
     WHERE key = $1
     LIMIT 1`,
    [key]
  );
  return result.rows[0];
}

async function readAdminAiFlowConfigPostgres({ getPool, env }) {
  try {
    const row = await readAdminRuntimeConfigPostgres({ getPool, key: adminRuntimeConfigKeys.aiFlowConfigs });
    return buildAdminAiFlowConfigPayload({
      input: normalizeJson(row?.payload ?? {}),
      env,
      runtimeMode: "postgres",
      version: row?.version ?? 0,
      updatedAtIso: row?.updated_at ? new Date(row.updated_at).toISOString() : null,
      updatedBy: row?.updated_by ?? null
    });
  } catch (error) {
    return adminAiFlowConfigReadUnavailablePayload({ env, runtimeMode: "postgres", error });
  }
}

async function persistAdminAiFlowConfigPostgres({ client, authContext, bodyText, env }) {
  const existing = await client.query(
    `SELECT payload, version, updated_by, updated_at
     FROM admin_runtime_configs
     WHERE key = $1
     FOR UPDATE`,
    [adminRuntimeConfigKeys.aiFlowConfigs]
  );
  const currentRow = existing.rows[0];
  const current = buildAdminAiFlowConfigPayload({
    input: normalizeJson(currentRow?.payload ?? {}),
    env,
    runtimeMode: "postgres",
    version: currentRow?.version ?? 0,
    updatedAtIso: currentRow?.updated_at ? new Date(currentRow.updated_at).toISOString() : null,
    updatedBy: currentRow?.updated_by ?? null
  });
  const payload = buildUpdatedAdminAiFlowConfigPayload({
    body: parseJsonBody(bodyText),
    env,
    authContext,
    current,
    runtimeMode: "postgres"
  });
  await client.query(
    `INSERT INTO admin_runtime_configs (key, payload, version, updated_by)
     VALUES ($1, $2::jsonb, $3, $4)
     ON CONFLICT (key) DO UPDATE SET
       payload = EXCLUDED.payload,
       version = EXCLUDED.version,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()`,
    [adminRuntimeConfigKeys.aiFlowConfigs, JSON.stringify(payload), payload.version, payload.updatedBy]
  );
  return {
    persisted: true,
    payload
  };
}

async function readAdminSafetyControlsPostgres({ getPool }) {
  try {
    const row = await readAdminRuntimeConfigPostgres({ getPool, key: adminRuntimeConfigKeys.safetyControls });
    return normalizeAdminSafetyControls(normalizeJson(row?.payload ?? {}));
  } catch (error) {
    return {
      ...normalizeAdminSafetyControls(),
      blockers: [`Admin safety controls store unavailable: ${error instanceof Error ? error.message : "unknown error"}`],
      status: "fail-closed"
    };
  }
}

async function persistAdminSafetyControlsPostgres({ client, authContext, bodyText }) {
  const existing = await client.query(
    `SELECT payload, version
     FROM admin_runtime_configs
     WHERE key = $1
     FOR UPDATE`,
    [adminRuntimeConfigKeys.safetyControls]
  );
  const currentPayload = normalizeAdminSafetyControls(normalizeJson(existing.rows[0]?.payload ?? {}));
  const payload = updateAdminSafetyControls(currentPayload, parseJsonBody(bodyText), { authContext });
  const version = Number(existing.rows[0]?.version ?? 0) + 1;
  await client.query(
    `INSERT INTO admin_runtime_configs (key, payload, version, updated_by)
     VALUES ($1, $2::jsonb, $3, $4)
     ON CONFLICT (key) DO UPDATE SET
       payload = EXCLUDED.payload,
       version = EXCLUDED.version,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()`,
    [adminRuntimeConfigKeys.safetyControls, JSON.stringify(payload), version, payload.updatedBy]
  );
  return {
    persisted: true,
    payload
  };
}

async function persistGoogleCalendarImportPostgres(client, authContext, record) {
  await client.query(
    `INSERT INTO provider_connections
       (id, user_id, provider, scopes, status, adapter_version, metadata_schema, raw_content_stored, encrypted_refresh_token)
     VALUES ($1, $2, $3, $4::text[], 'connected', $5, $6::jsonb, FALSE, $7)
     ON CONFLICT (id) DO UPDATE SET
       provider = EXCLUDED.provider,
       scopes = EXCLUDED.scopes,
       status = EXCLUDED.status,
       adapter_version = EXCLUDED.adapter_version,
       metadata_schema = EXCLUDED.metadata_schema,
       raw_content_stored = FALSE,
       encrypted_refresh_token = COALESCE(EXCLUDED.encrypted_refresh_token, provider_connections.encrypted_refresh_token)`,
    [
      record.providerConnection.id,
      authContext.userId,
      record.providerConnection.provider,
      record.providerConnection.scopes,
      record.providerConnection.adapterVersion,
      JSON.stringify(record.providerConnection.metadataSchema),
      record.providerConnection.encryptedRefreshToken || null
    ]
  );

  for (const importedEvent of record.importedEvents) {
    await client.query(
      `INSERT INTO imported_events
         (id, connection_id, title, starts_at, timezone, source_evidence, recipient_hint)
       VALUES ($1, $2, $3, $4::timestamptz, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         connection_id = EXCLUDED.connection_id,
         title = EXCLUDED.title,
         starts_at = EXCLUDED.starts_at,
         timezone = EXCLUDED.timezone,
         source_evidence = EXCLUDED.source_evidence,
         recipient_hint = EXCLUDED.recipient_hint`,
      [
        importedEvent.id,
        record.providerConnection.id,
        importedEvent.title,
        importedEvent.startsAt,
        importedEvent.timezone,
        importedEvent.sourceEvidence,
        importedEvent.recipientHint
      ]
    );
  }

  for (const cardOpportunity of record.cardOpportunities) {
    await client.query(
      `INSERT INTO card_opportunities
         (id, event_id, recipient_name, lead_time_hours, confidence, decision, evidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         event_id = EXCLUDED.event_id,
         recipient_name = EXCLUDED.recipient_name,
         lead_time_hours = EXCLUDED.lead_time_hours,
         confidence = EXCLUDED.confidence,
         decision = EXCLUDED.decision,
         evidence = EXCLUDED.evidence`,
      [
        cardOpportunity.id,
        cardOpportunity.eventId,
        cardOpportunity.recipientName,
        cardOpportunity.leadTimeHours,
        cardOpportunity.confidence,
        cardOpportunity.decision,
        JSON.stringify(cardOpportunity.evidence)
      ]
    );
  }
}

function buildImportPreviewRecord({ authContext, bodyText }) {
  const body = parseJsonBody(bodyText);
  const resolvedImport = resolveImportPreviewMetadata(body);
  const payload = resolvedImport.metadataOnlyPayload ?? {};
  const sourceKind = safeId(resolvedImport.sourceKind, "");
  const title = safeText(payload.title, "");
  const recipientName = safeText(payload.recipientName ?? payload.recipient_hint ?? payload.recipientHint, "");
  const startsAt = safeTimestamp(payload.startsAt ?? payload.starts_at, "");
  const timezone = safeText(payload.timezone ?? body.timezone, "UTC");
  const sourceEvidence = safeText(payload.sourceEvidence ?? payload.source_evidence ?? `${sourceKind}:metadata-only`, "metadata-only");
  const leadTimeHours = safeInteger(payload.leadTimeHours ?? body.leadTimeHours, 168, 0, 8760);
  const confidence = safeConfidence(payload.confidence ?? body.confidence, 0.92);
  const decision = safeDecision(payload.decision ?? body.decision);
  const connectionId = safeId(body.connectionId, stableRuntimeId("connection", authContext.userId, sourceKind));
  const eventId = safeId(body.eventId, stableRuntimeId("event", authContext.userId, sourceKind, title, startsAt));
  const opportunityId = safeId(body.opportunityId, stableRuntimeId("opportunity", eventId, recipientName));
  return {
    providerConnection: {
      id: connectionId,
      provider: sourceKind,
      scopes: ["event-metadata"],
      adapterVersion: `${sourceKind}-v1`,
      metadataSchema: {
        sourceKind,
        rawContentStored: false,
        metadataOnly: true,
        rawTextAccepted: resolvedImport.parsedFromRawText
      }
    },
    importedEvent: {
      id: eventId,
      title,
      startsAt,
      timezone,
      sourceEvidence,
      recipientHint: recipientName
    },
    cardOpportunity: {
      id: opportunityId,
      recipientName,
      leadTimeHours,
      confidence,
      decision,
      evidence: {
        sourceKind,
        sourceEvidence,
        rawContentStored: false,
        parsedFromRawText: resolvedImport.parsedFromRawText
      }
    },
    importParser: {
      parsedFromRawText: resolvedImport.parsedFromRawText,
      rawTextField: resolvedImport.rawTextField,
      rawContentStored: false,
      evidenceSummary: resolvedImport.evidenceSummary,
      warnings: resolvedImport.warnings
    }
  };
}

function buildImportPreviewRepositoryPayload(record, runtimeMode) {
  return {
    rawContentStored: false,
    warnings: record.importParser.warnings,
    importParser: record.importParser,
    opportunities: [
      {
        opportunityId: record.cardOpportunity.id,
        eventId: record.importedEvent.id,
        recipientName: record.cardOpportunity.recipientName,
        title: record.importedEvent.title,
        startsAt: record.importedEvent.startsAt,
        timezone: record.importedEvent.timezone,
        confidence: record.cardOpportunity.confidence,
        decision: record.cardOpportunity.decision
      }
    ],
    repository: {
      tables: ["provider_connections", "imported_events", "card_opportunities"],
      runtimeMode,
      persisted: true,
      rawContentStored: false
    }
  };
}

function buildGoogleCalendarImportRepositoryPayload(record, runtimeMode, persisted) {
  return {
    calendarConnection: {
      id: record.providerConnection.id,
      provider: record.providerConnection.provider,
      status: record.providerConnection.status,
      scopes: record.providerConnection.scopes,
      adapterVersion: record.providerConnection.adapterVersion,
      credentialStorageEnabled: Boolean(record.providerConnection.encryptedRefreshToken),
      rawContentStored: false
    },
    importedEvents: record.importedEvents.map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      timezone: event.timezone,
      sourceEvidence: event.sourceEvidence,
      recipientHint: event.recipientHint
    })),
    opportunities: record.cardOpportunities.map((opportunity) => {
      const importedEvent = record.importedEvents.find((event) => event.id === opportunity.eventId);
      return {
        opportunityId: opportunity.id,
        eventId: opportunity.eventId,
        recipientName: opportunity.recipientName,
        title: importedEvent?.title ?? "Calendar event",
        startsAt: importedEvent?.startsAt ?? "",
        timezone: importedEvent?.timezone ?? "UTC",
        confidence: opportunity.confidence,
        decision: opportunity.decision
      };
    }),
    repository: {
      tables: ["provider_connections", "imported_events", "card_opportunities"],
      runtimeMode,
      persisted,
      rawContentStored: false,
      providerCredentialsStored: Boolean(record.providerConnection.encryptedRefreshToken)
    }
  };
}

function buildCardProjectRecord({ authContext, bodyText }) {
  const body = parseJsonBody(bodyText);
  const opportunityId = safeId(body.opportunityId, "");
  const locale = safeLocale(body.locale);
  const approvedMemoryIds = Array.isArray(body.approvedMemoryIds)
    ? body.approvedMemoryIds.map((value) => safeId(value, "")).filter(Boolean).slice(0, 12)
    : [];
  return {
    projectId: safeId(body.projectId, stableRuntimeId("project", authContext.userId, opportunityId, approvedMemoryIds.join(","), locale)),
    opportunityId,
    recipientName: safeText(body.recipientName, ""),
    // Every generated card project is tagged with a normalized category so the
    // admin gallery can curate by occasion. Unknown occasions become "custom".
    category: normalizeCardCategory(body.category ?? body.occasion),
    locale,
    requiresRtlLayout: Boolean(body.requiresRtlLayout) || /^(ar|he|fa|ur)(-|$)/i.test(locale),
    approvedMemoryIds
  };
}

function buildCardProjectRepositoryPayload(record, runtimeMode) {
  return {
    projectId: record.projectId,
    opportunityId: record.opportunityId,
    category: record.category,
    renderStatus: "ready-for-render",
    requiresRtlLayout: record.requiresRtlLayout,
    approvedMemoryIds: record.approvedMemoryIds,
    repository: {
      table: "card_projects",
      runtimeMode,
      persisted: true
    }
  };
}

async function ensureClerkAuthSession(client, { verification, sessionHash }) {
  const email = (verification.email || `${verification.clerkUserId}@clerk-user.customcard.invalid`).toLowerCase();
  const identity = await client.query(
    `SELECT user_id FROM account_identities WHERE provider = 'clerk' AND provider_subject = $1 LIMIT 1`,
    [verification.clerkUserId]
  );
  let userId = identity.rows[0]?.user_id;
  if (!userId) {
    const existingUser = await client.query(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [email]);
    userId = existingUser.rows[0]?.id ?? stableRuntimeId("user", "clerk", verification.clerkUserId);
    await client.query(
      `INSERT INTO users (id, email, locale, region, platform)
       VALUES ($1, $2, 'en-US', 'us', 'web')
       ON CONFLICT (id) DO NOTHING`,
      [userId, email]
    );
  }
  await client.query(
    `INSERT INTO account_identities
       (id, user_id, provider, provider_subject, email, role, raw_profile_stored, claims_schema, verified_at, last_login_at)
     VALUES ($1, $2, 'clerk', $3, $4, $5, FALSE, '{}'::jsonb, NOW(), NOW())
     ON CONFLICT (provider, provider_subject) DO UPDATE SET
       email = EXCLUDED.email,
       role = EXCLUDED.role,
       last_login_at = NOW()`,
    [stableRuntimeId("identity", "clerk", verification.clerkUserId), userId, verification.clerkUserId, email, verification.role]
  );
  const sessionId = stableRuntimeId(
    "session",
    "clerk",
    verification.clerkUserId,
    verification.clerkSessionId,
    sessionHash.slice(0, 16)
  );
  await client.query(
    `INSERT INTO auth_sessions (id, user_id, session_hash, role, expires_at)
     VALUES ($1, $2, $3, $4, to_timestamp($5))
     ON CONFLICT DO NOTHING`,
    [sessionId, userId, sessionHash, verification.role, verification.expiresAtSeconds]
  );
  await client.query(
    `INSERT INTO audit_log (subject_type, subject_id, actor_id, action, metadata)
     VALUES ('auth_session', $1, $2, 'auth.clerk_session.bridged', $3::jsonb)`,
    [sessionId, userId, JSON.stringify({ provider: "clerk", role: verification.role })]
  );
  return { userId, role: verification.role, sessionId, email, provider: verification.provider ?? "clerk" };
}

function publicOpportunity(opportunity, importedEvent) {
  return {
    opportunityId: opportunity.id,
    eventId: opportunity.eventId,
    recipientName: opportunity.recipientName,
    title: importedEvent?.title ?? "Calendar event",
    startsAt: importedEvent?.startsAt ?? "",
    timezone: importedEvent?.timezone ?? "UTC",
    sourceEvidence: importedEvent?.sourceEvidence ?? "metadata-only",
    confidence: opportunity.confidence,
    decision: opportunity.decision,
    evidence: opportunity.evidence ?? { rawContentStored: false, metadataOnly: true }
  };
}

function buildCustomerConnectionsPayload({ runtimeMode, authContext, connectionRecord, opportunities }) {
  let status = "not_connected";
  let reconnectReason;
  if (connectionRecord) {
    if (connectionRecord.status === "revoked") {
      status = "revoked";
    } else if (connectionRecord.status === "connected" && connectionRecord.credentialStorageEnabled) {
      status = "connected";
    } else if (connectionRecord.status === "connected") {
      status = "needs_reconnect";
      reconnectReason = "missing-refresh-token";
    } else {
      status = "needs_reconnect";
      reconnectReason = `provider-status-${connectionRecord.status}`;
    }
  }
  const connection = {
    provider: "google_calendar",
    status,
    scopes: connectionRecord?.scopes ?? [],
    connectedAtIso: connectionRecord?.connectedAtIso,
    lastImportedAtIso: connectionRecord?.lastImportedAtIso,
    importedEventCount: connectionRecord?.importedEventCount ?? 0,
    opportunityCount: connectionRecord?.opportunityCount ?? 0,
    credentialStorageEnabled: Boolean(connectionRecord?.credentialStorageEnabled),
    rawContentStored: false,
    canScanAgain: status === "connected",
    ...(reconnectReason ? { reconnectReason } : {})
  };
  return {
    service: "customcard-api",
    status: "ready",
    authenticatedUserId: authContext.userId,
    connections: [connection],
    opportunities: opportunities ?? [],
    rawContentStored: false,
    repository: {
      tables: ["provider_connections", "imported_events", "card_opportunities"],
      runtimeMode,
      persisted: Boolean(connectionRecord),
      rawContentStored: false
    }
  };
}

function buildFeaturedCardsPayload(entries, runtimeMode) {
  const approved = entries.filter((entry) => entry.featured && entry.publicApproved);
  const byCategory = new Map();
  for (const entry of approved) {
    const category = normalizeCardCategory(entry.category);
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category).push({
      id: entry.id,
      title: entry.title,
      caption: entry.publicCaption,
      thumbnailUrl: publicBrowserImageUrl(entry.thumbnailArtifactUri),
      frontSvg: entry.frontSvg,
      frontImageUrl: publicBrowserImageUrl(entry.frontArtifactUri),
      featuredRank: Number(entry.featuredRank ?? 100)
    });
  }
  const categories = publicCardCategories
    .filter((category) => byCategory.has(category))
    .map((category) => ({
      category,
      label: cardCategoryLabel(category),
      cards: byCategory.get(category).sort((a, b) => a.featuredRank - b.featuredRank)
    }));
  return {
    service: "customcard-api",
    status: "ready",
    categories,
    rawContentStored: false,
    repository: {
      table: "card_gallery_entries",
      runtimeMode,
      persisted: categories.length > 0
    }
  };
}

function cardCategoryLabel(category) {
  return category
    .split("-")
    .map((part, index) => (index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function publicBrowserImageUrl(value) {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  if (text.startsWith("data:image/")) return text;
  if (text.startsWith("/api/artifacts/")) return text;
  if (text.startsWith("/") || text.startsWith("//")) return undefined;
  try {
    const url = new URL(text);
    if ((url.protocol === "http:" || url.protocol === "https:") && url.pathname.startsWith("/api/artifacts/")) {
      return url.toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function buildCardGalleryEntryRecord({ authContext, bodyText }) {
  const body = parseJsonBody(bodyText);
  const sourceDraftId = safeId(body.sourceDraftId ?? body.draftStateId, "");
  const projectId = safeId(body.projectId, "");
  const renderPacketId = safeId(body.renderPacketId, "");
  const category = normalizeCardCategory(body.category ?? body.occasion);
  const id = safeId(
    body.entryId ?? body.id,
    stableRuntimeId("gallery", sourceDraftId || projectId || String(body.title ?? ""), category)
  );
  const frontSvg = typeof body.frontSvg === "string" && body.frontSvg.trim().startsWith("<svg")
    ? body.frontSvg.slice(0, 200_000)
    : "";
  return {
    id,
    projectId,
    renderPacketId,
    sourceDraftId,
    category,
    title: safeText(body.title, "").slice(0, 80),
    publicCaption: safeText(body.publicCaption ?? body.caption, "").slice(0, 160),
    featured: safeBoolean(body.featured),
    featuredRank: safeInteger(body.featuredRank, 100, 0, 10_000),
    publicApproved: safeBoolean(body.publicApproved),
    frontSvg,
    thumbnailArtifactUri: safeOptionalArtifactReference(body.thumbnailArtifactUri ?? body.thumbnailUrl),
    frontArtifactUri: safeOptionalArtifactReference(body.frontArtifactUri ?? body.frontImageUrl),
    redacted: true,
    createdBy: authContext.userId,
    remove: safeBoolean(body.remove)
  };
}

function buildCardGalleryRepositoryPayload(record, runtimeMode) {
  return {
    entryId: record.id,
    category: record.category,
    title: record.title,
    publicCaption: record.publicCaption,
    featured: record.featured,
    featuredRank: record.featuredRank,
    publicApproved: record.publicApproved,
    removed: record.remove === true,
    rawContentStored: false,
    repository: {
      table: "card_gallery_entries",
      runtimeMode,
      persisted: true,
      rawContentStored: false
    }
  };
}

function publicGalleryEntry(entry) {
  return {
    entryId: entry.id,
    projectId: entry.projectId || undefined,
    renderPacketId: entry.renderPacketId || undefined,
    sourceDraftId: entry.sourceDraftId || undefined,
    category: entry.category,
    title: entry.title,
    publicCaption: entry.publicCaption,
    featured: Boolean(entry.featured),
    featuredRank: Number(entry.featuredRank ?? 100),
    publicApproved: Boolean(entry.publicApproved),
    frontSvg: entry.frontSvg || undefined,
    thumbnailUrl: publicBrowserImageUrl(entry.thumbnailArtifactUri),
    frontImageUrl: publicBrowserImageUrl(entry.frontArtifactUri),
    createdAtIso: entry.createdAtIso,
    updatedAtIso: entry.updatedAtIso
  };
}

function publicGalleryCandidate(draftStateRecord) {
  const draftInput = draftStateRecord.draftInput ?? {};
  return {
    sourceDraftId: draftStateRecord.id,
    status: draftStateRecord.status,
    draftInput,
    derivedCategory: normalizeCardCategory(draftInput.occasion),
    localeCode: draftStateRecord.localeCode,
    updatedAtIso: draftStateRecord.updatedAtIso
  };
}

function buildCardGalleryReadPayload({ runtimeMode, authContext, entries, candidates, readIssues = [] }) {
  const degraded = readIssues.length > 0;
  return {
    service: "customcard-api",
    status: degraded ? "degraded" : "ready",
    authenticatedUserId: authContext.userId,
    categories: [...publicCardCategories],
    entries,
    candidates,
    ...(degraded
      ? {
          galleryReadStatus: {
            ok: false,
            message: "Gallery repository is not fully available yet.",
            issues: readIssues
          }
        }
      : {}),
    rawContentStored: false,
    repository: {
      tables: ["card_gallery_entries", "draft_states"],
      runtimeMode,
      persisted: entries.length > 0,
      degraded
    }
  };
}

function repositoryReadIssue(table, error) {
  return {
    table,
    status: "read-unavailable",
    detail: safeErrorDetail(error)
  };
}

function safeErrorDetail(error) {
  if (!(error instanceof Error)) return "Repository read failed.";
  return String(error.message || "Repository read failed.").slice(0, 240);
}

function buildDraftStateRecord({ authContext, bodyText }) {
  const body = parseJsonBody(bodyText);
  const draftInput = sanitizeDraftInput(body.draftInput);
  const opportunityId = safeId(body.opportunityId, stableRuntimeId("opportunity", authContext.userId, draftInput.recipient, draftInput.occasion));
  const id = stableRuntimeId("draft-state", authContext.userId);

  return {
    id,
    userId: authContext.userId,
    status: safeDraftStatus(body.status),
    draftInput,
    opportunityId,
    opportunityDecision: safeOpportunityDecision(body.opportunityDecision),
    vendorId: safeVendorId(body.vendorId),
    localeCode: safeLocale(body.localeCode ?? body.locale),
    updatedAtIso: safeTimestamp(body.updatedAtIso, new Date().toISOString())
  };
}

function buildDraftStateConflictPayload(record, runtimeMode) {
  return {
    draftStateId: record.id,
    updatedAtIso: record.updatedAtIso,
    repository: {
      table: "draft_states",
      runtimeMode,
      persisted: false,
      browserLocalState: false,
      rawContentStored: false,
      conflict: "draft-state-owned-by-another-user"
    }
  };
}

function buildDraftStateRepositoryPayload(record, runtimeMode) {
  return {
    draftStateId: record.id,
    updatedAtIso: record.updatedAtIso,
    draftState: publicDraftState(record),
    repository: {
      table: "draft_states",
      runtimeMode,
      persisted: true,
      browserLocalState: false,
      rawContentStored: false
    }
  };
}

function buildDraftStateReadPayload(record, runtimeMode, authContext) {
  return {
    service: "customcard-api",
    status: "ready",
    authenticatedUserId: authContext.userId,
    draftState: record ? publicDraftState(record) : null,
    updatedAtIso: record?.updatedAtIso ?? null,
    repository: {
      table: "draft_states",
      runtimeMode,
      persisted: Boolean(record),
      browserLocalState: false,
      rawContentStored: false
    }
  };
}

function publicDraftState(record) {
  return {
    draftStateId: record.id,
    status: record.status,
    draftInput: record.draftInput,
    opportunityId: record.opportunityId,
    opportunityDecision: record.opportunityDecision,
    vendorId: record.vendorId,
    localeCode: record.localeCode,
    updatedAtIso: record.updatedAtIso
  };
}

function buildRelationshipMemoryRecord({ authContext, bodyText }) {
  const body = parseJsonBody(bodyText);
  const recipientName = safeText(body.recipientName ?? body.recipient, "");
  const text = safeMemoryText(body.text ?? body.note);
  const decision = safeMemoryDecision(body.decision ?? (safeBoolean(body.forget) ? "forget" : "approve"));
  const approved = decision === "approve";
  return {
    id: safeId(body.memoryId, stableRuntimeId("memory", authContext.userId, recipientName, text)),
    userId: authContext.userId,
    recipientName,
    approved,
    sensitivity: safeMemorySensitivity(body.sensitivity),
    locale: safeLocale(body.locale),
    source: safeMemorySource(body.source),
    text,
    forgottenAt: approved ? null : safeTimestamp(body.forgottenAt, new Date().toISOString())
  };
}

function buildRelationshipMemoryRepositoryPayload(record, runtimeMode) {
  return {
    memoryId: record.id,
    recipientName: record.recipientName,
    approved: record.approved,
    forgottenAt: record.forgottenAt,
    memoryUseAllowed: record.approved && !record.forgottenAt,
    privacyControls: {
      customerApproved: record.approved,
      rawProviderContentStored: false,
      forgetSupported: true
    },
    repository: {
      table: "relationship_memories",
      runtimeMode,
      persisted: true,
      rawContentStored: false
    }
  };
}

function buildRenderPacketRecord({ authContext, bodyText }) {
  const body = parseJsonBody(bodyText);
  const projectId = safeId(body.projectId, "");
  const locale = safeLocale(body.locale);
  const direction = safeDirection(body.direction, locale);
  const renderPacketId = safeId(body.renderPacketId, stableRuntimeId("render-packet", authContext.userId, projectId, locale));
  const checksum = `cc_${createHash("sha256").update(`${renderPacketId}:${projectId}:${locale}:${direction}`).digest("hex").slice(0, 8)}`;
  const storageProvider = safeStorageProvider(body.storageProvider);
  const artifactCount = safeInteger(body.artifactCount, 6, 1, 24);
  const signedUrlExpiresAt = safeFutureTimestamp(body.signedUrlExpiresAt, defaultSignedUrlExpiresAt());
  const artifactUri = safeArtifactUri(
    body.artifactUri,
    `file:///tmp/customcard-artifacts/projects/${projectId}/render-packets/${renderPacketId}/artifact-handoff-manifest.json`
  );
  const externalShareApprovalRequired = body.externalShareApprovalRequired === undefined
    ? true
    : safeBoolean(body.externalShareApprovalRequired);
  const safeZonePassed = body.safeZonePassed === undefined ? true : safeBoolean(body.safeZonePassed);
  const textOverflow = body.textOverflow === undefined ? false : safeBoolean(body.textOverflow);
  const kind = safeRenderPacketKind(body.kind, safeZonePassed, textOverflow);
  const artifactManifest = {
    renderPacketId,
    projectId,
    storageProvider,
    artifactCount,
    manifestChecksum: checksum,
    signedUrlExpiresAt,
    externalShareApprovalRequired,
    realOrdersEnabled: false,
    noNetwork: true,
    width: 1500,
    height: 2100,
    dpi: 300,
    locale,
    direction,
    safeZonePassed,
    textOverflow
  };

  return {
    id: renderPacketId,
    projectId,
    kind,
    width: 1500,
    height: 2100,
    dpi: 300,
    locale,
    direction,
    safeZonePassed,
    textOverflow,
    checksum,
    artifactUri,
    storageProvider,
    artifactCount,
    artifactManifest,
    signedUrlExpiresAt,
    externalShareApprovalRequired
  };
}

function buildRenderProviderCallEvent({ authContext, bodyText, idempotencyId }) {
  const renderPacket = buildRenderPacketRecord({ authContext, bodyText });
  return {
    id: stableRuntimeId("provider-call", authContext.userId, "render-packets", idempotencyId),
    tenantId: authContext.userId,
    adapterId: "customcard-render-packet",
    provider: "CustomCard render packet",
    capability: "image-generation",
    metadata: {
      renderPacketId: renderPacket.id,
      projectId: renderPacket.projectId,
      policy: "app-rendered-no-live-network",
      auditEventName: "provider.render.completed"
    }
  };
}

const providerEventStatuses = new Set(["reserved", "succeeded", "failed", "blocked", "fallback-selected"]);
const providerFallbackReasons = new Set([
  "missing-credentials",
  "safety-gate",
  "monthly-budget-exceeded",
  "per-request-budget-exceeded",
  "rate-limit-exceeded",
  "provider-blocked",
  "provider-unavailable",
  "circuit-open",
  "no-preferred-provider"
]);

function normalizeProviderCallEvents({ authContext, events }) {
  return (Array.isArray(events) ? events : [])
    .filter((event) => event && typeof event === "object")
    .map((event, index) => {
      const routeId = safeText(event.routeId ?? event.route_id, "ai-flow").slice(0, 80);
      const flowId = safeText(event.flowId ?? event.flow_id, "ai-flow").slice(0, 80);
      const adapterId = safeText(event.adapterId ?? event.adapter_id, "unknown-adapter").slice(0, 120);
      const status = providerEventStatuses.has(event.status) ? event.status : "reserved";
      const fallbackReasonInput = event.fallbackReason ?? event.fallback_reason;
      const fallbackReason = providerFallbackReasons.has(fallbackReasonInput) ? fallbackReasonInput : null;
      const monthBucket = safeMonthBucket(event.monthBucket ?? event.month_bucket);
      const rateLimitWindowStartIso = safeIso(event.rateLimitWindowStartIso ?? event.rate_limit_window_start, new Date());
      const requestUnits = Math.max(1, safeEventInteger(event.requestUnits ?? event.request_units, 1));
      const estimatedCostCents = Math.max(0, safeEventInteger(event.estimatedCostCents ?? event.estimated_cost_cents, 0));
      const actualCostInput = event.actualCostCents ?? event.actual_cost_cents;
      const actualCostCents = actualCostInput === undefined || actualCostInput === null
        ? null
        : Math.max(0, safeEventInteger(actualCostInput, 0));
      const id = safeText(
        event.id,
        stableRuntimeId("provider-call", authContext.userId, routeId, flowId, adapterId, String(index), rateLimitWindowStartIso)
      ).slice(0, 160);
      return {
        id,
        tenantId: safeText(event.tenantId ?? event.tenant_id, authContext.userId).slice(0, 120),
        userId: authContext.userId,
        routeId,
        flowId,
        adapterId,
        provider: safeText(event.provider, "AI provider").slice(0, 120),
        capability: safeText(event.capability, "text-chat").slice(0, 80),
        status,
        fallbackFromAdapterId: optionalSafeText(event.fallbackFromAdapterId ?? event.fallback_from_adapter_id, 120),
        fallbackReason,
        monthBucket,
        requestUnits,
        estimatedCostCents,
        actualCostCents,
        rateLimitWindowStartIso,
        latencyMs: optionalSafeInteger(event.latencyMs ?? event.latency_ms),
        errorClass: optionalSafeText(event.errorClass ?? event.error_class, 120),
        liveNetworkCall: Boolean(event.liveNetworkCall ?? event.live_network_call),
        metadata: sanitizeProviderEventMetadata(event.metadata)
      };
    });
}

function sanitizeProviderEventMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return {};
  const result = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (/token|secret|key|authorization|api/i.test(key)) continue;
    if (typeof value === "string") result[key] = value.slice(0, 500);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) result[key] = value;
  }
  return result;
}

function safeMonthBucket(value) {
  const text = safeText(value, new Date().toISOString().slice(0, 7));
  return /^[0-9]{4}-[0-9]{2}$/.test(text) ? text : new Date().toISOString().slice(0, 7);
}

function safeIso(value, fallbackDate) {
  const timestamp = Date.parse(String(value ?? ""));
  return Number.isNaN(timestamp) ? fallbackDate.toISOString() : new Date(timestamp).toISOString();
}

function safeEventInteger(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric) : fallback;
}

function optionalSafeInteger(value) {
  if (value === undefined || value === null) return null;
  return Math.max(0, safeEventInteger(value, 0));
}

function optionalSafeText(value, maxLength) {
  if (value === undefined || value === null || value === "") return null;
  return safeText(value, "").slice(0, maxLength);
}

function buildRenderPacketRepositoryPayload(record, runtimeMode, artifactPersistencePayload) {
  return {
    renderPacketId: record.id,
    checksum: record.checksum,
    artifactManifest: record.artifactManifest,
    ...(record.signedArtifactUrls ? { signedArtifactUrls: record.signedArtifactUrls } : {}),
    ...(artifactPersistencePayload ?? {}),
    repository: {
      table: "render_packets",
      runtimeMode,
      persisted: true,
      signedArtifactUrls: true,
      realOrdersEnabled: false
    }
  };
}

export async function persistGeneratedImageArtifacts({ objectStoreRuntime, authContext, payload }) {
  const objectStoreDescription = objectStoreRuntime?.describe?.();
  const images = Array.isArray(payload?.images) ? payload.images : [];
  const artifacts = (
    await Promise.all(images.map((image, index) => normalizeGeneratedImageArtifact(image, index)))
  ).filter(Boolean);
  if (artifacts.length === 0) return undefined;
  if (!objectStoreDescription?.configured) {
    const blockers = objectStoreDescription?.blockers ?? [];
    return blockers.length > 0
      ? {
          payload: {
            ...payload,
            generated_image_persistence: {
              status: "blocked",
              blockers,
              inlineImageBytesPersisted: false,
              liveNetworkCalls: false
            }
          }
        }
      : undefined;
  }

  const draftId = safeId(
    payload?.draft_id ?? payload?.draftId,
    stableRuntimeId("ai-draft", authContext?.userId ?? "anonymous", generatedImageHashInput(artifacts))
  );
  const projectId = safeId(
    payload?.project_id ?? payload?.projectId,
    `ai-${safeId(authContext?.userId, stableRuntimeId("user", "anonymous"))}`
  );
  const firstImage = images.find((image) => image && typeof image === "object") ?? {};
  const record = {
    id: draftId,
    projectId,
    kind: "validated_print_packet",
    width: safeInteger(firstImage.width, 1500, 1, 10_000),
    height: safeInteger(firstImage.height, 2100, 1, 10_000),
    dpi: 300,
    locale: "en-US",
    direction: "ltr",
    safeZonePassed: true,
    textOverflow: false,
    checksum: `cc_${createHash("sha256").update(generatedImageHashInput(artifacts)).digest("hex").slice(0, 8)}`,
    artifactUri: "",
    storageProvider: "filesystem",
    artifactCount: artifacts.length,
    artifactManifest: {
      renderPacketId: draftId,
      projectId,
      artifactCount: artifacts.length,
      persistenceStatus: "pending",
      blockers: []
    },
    signedUrlExpiresAt: defaultSignedUrlExpiresAt(),
    externalShareApprovalRequired: true
  };

  const persistence = await objectStoreRuntime.persistRenderPacketArtifacts({
    record,
    authContext,
    bodyText: JSON.stringify({ artifacts })
  });
  const artifactPersistence = persistence.payload?.artifactPersistence;
  const compressionSummary = summarizeGeneratedImageCompression(artifacts);
  if (artifactPersistence?.status !== "stored") {
    return {
      payload: {
        ...payload,
        generated_image_persistence: {
          ...(artifactPersistence ?? {}),
          status: artifactPersistence?.status ?? "blocked",
          inlineImageBytesPersisted: false,
          compression: compressionSummary
        }
      }
    };
  }

  const storedByPanel = new Map();
  const compressionByPanel = new Map(artifacts.map((artifact) => [artifact.panelId, artifact.compression]));
  const manifestArtifacts = persistence.record.artifactManifest?.artifacts ?? [];
  const signedDownloads = persistence.record.signedArtifactUrls ?? [];
  manifestArtifacts.forEach((artifact, index) => {
    if (!artifact?.panelId || !signedDownloads[index]?.url) return;
    storedByPanel.set(artifact.panelId, {
      artifact,
      signedDownload: signedDownloads[index]
    });
  });

  return {
    record: persistence.record,
    payload: {
      ...payload,
      images: images.map((image) => {
        const panelId = String(image?.panel_id ?? image?.panelId ?? "").trim();
        const stored = storedByPanel.get(panelId);
        if (!stored) return image;
        const { artifact, signedDownload } = stored;
        const compression = compressionByPanel.get(panelId);
        return {
          ...image,
          image_url: signedDownload.url,
          image_artifact_uri: artifact.artifactUri,
          image_object_key: artifact.objectKey,
          image_content_hash: artifact.contentHash,
          image_byte_length: artifact.byteLength,
          image_storage_provider: persistence.record.storageProvider,
          image_signed_url_expires_at: signedDownload.expiresAtIso,
          image_inline_bytes_persisted: false,
          image_compression: compression,
          ...(artifact.duplicateOfObjectKey
            ? {
                duplicate_of_object_key: artifact.duplicateOfObjectKey,
                duplicate_of_file_name: artifact.duplicateOfFileName
              }
            : {})
        };
      }),
      generated_image_persistence: {
        ...artifactPersistence,
        manifestUri: persistence.record.artifactUri,
        signedUrlExpiresAt: persistence.record.signedUrlExpiresAt,
        inlineImageBytesPersisted: false,
        compression: compressionSummary
      }
    }
  };
}

async function normalizeGeneratedImageArtifact(image, index) {
  if (!image || typeof image !== "object") return undefined;
  const dataUrl = String(image.image_url ?? image.imageUrl ?? "");
  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) return undefined;
  const panelId = safeGeneratedImagePanelId(image.panel_id ?? image.panelId, index);
  const fileIndex = String(index + 1).padStart(2, "0");
  const compressed = await compressGeneratedImageDataUrl(parsed);
  return {
    kind: "generated-image",
    fileName: `provider-${fileIndex}-${panelId}.${compressed.extension}`,
    mimeType: compressed.mimeType,
    panelId,
    compression: compressed.compression,
    ...(compressed.text ? { text: compressed.text } : { base64: compressed.buffer.toString("base64") })
  };
}

function parseImageDataUrl(value) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]*)$/i.exec(String(value));
  if (!match) return undefined;
  const mimeType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length <= 0) return undefined;
  return {
    mimeType,
    extension: imageExtensionForMimeType(mimeType),
    buffer
  };
}

async function compressGeneratedImageDataUrl(parsed) {
  if (parsed.mimeType !== "image/svg+xml") return await compressRasterImageData(parsed);
  const minified = minifySvgText(parsed.buffer.toString("utf8"));
  const minifiedBytes = Buffer.byteLength(minified, "utf8");
  if (!minified || minifiedBytes >= parsed.buffer.length) {
    return {
      buffer: parsed.buffer,
      mimeType: parsed.mimeType,
      extension: parsed.extension,
      compression: {
        status: "skipped",
        algorithm: "svg-minify-v1",
        reason: "not-smaller",
        originalMimeType: parsed.mimeType,
        storedMimeType: parsed.mimeType,
        originalByteLength: parsed.buffer.length,
        storedByteLength: parsed.buffer.length,
        savedBytes: 0
      }
    };
  }

  return {
    text: minified,
    mimeType: parsed.mimeType,
    extension: parsed.extension,
    compression: {
      status: "compressed",
      algorithm: "svg-minify-v1",
      originalMimeType: parsed.mimeType,
      storedMimeType: parsed.mimeType,
      originalByteLength: parsed.buffer.length,
      storedByteLength: minifiedBytes,
      savedBytes: parsed.buffer.length - minifiedBytes
    }
  };
}

async function compressRasterImageData(parsed) {
  if (!generatedImageRasterMimeTypes.has(parsed.mimeType)) {
    return uncompressedGeneratedImage(parsed, {
      algorithm: "none",
      reason: "unsupported-image-mime-type"
    });
  }

  try {
    const sharp = await loadSharpCodec();
    const result = await sharp(parsed.buffer, {
      failOn: "none",
      limitInputPixels: generatedImageMaxEdgePixels * generatedImageMaxEdgePixels * 2
    })
      .rotate()
      .resize({
        width: generatedImageMaxEdgePixels,
        height: generatedImageMaxEdgePixels,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({
        quality: generatedImageWebpQuality,
        effort: generatedImageWebpEffort,
        smartSubsample: true
      })
      .toBuffer({ resolveWithObject: true });

    if (!result?.data || result.data.length <= 0) {
      return uncompressedGeneratedImage(parsed, {
        algorithm: "sharp-webp-v1",
        reason: "empty-compressed-output"
      });
    }
    if (result.data.length >= parsed.buffer.length) {
      return uncompressedGeneratedImage(parsed, {
        algorithm: "sharp-webp-v1",
        reason: "not-smaller"
      });
    }

    return {
      buffer: result.data,
      mimeType: "image/webp",
      extension: "webp",
      compression: {
        status: "compressed",
        algorithm: "sharp-webp-v1",
        originalMimeType: parsed.mimeType,
        storedMimeType: "image/webp",
        originalByteLength: parsed.buffer.length,
        storedByteLength: result.data.length,
        savedBytes: parsed.buffer.length - result.data.length,
        width: result.info?.width,
        height: result.info?.height,
        quality: generatedImageWebpQuality
      }
    };
  } catch (error) {
    return uncompressedGeneratedImage(parsed, {
      algorithm: "sharp-webp-v1",
      reason: "raster-compression-failed",
      detail: safeText(error?.message, "Image compression failed.").slice(0, 160)
    });
  }
}

function uncompressedGeneratedImage(parsed, { algorithm, reason, detail } = {}) {
  return {
    buffer: parsed.buffer,
    mimeType: parsed.mimeType,
    extension: parsed.extension,
    compression: {
      status: "skipped",
      algorithm: algorithm ?? "none",
      reason,
      ...(detail ? { detail } : {}),
      originalMimeType: parsed.mimeType,
      storedMimeType: parsed.mimeType,
      originalByteLength: parsed.buffer.length,
      storedByteLength: parsed.buffer.length,
      savedBytes: 0
    }
  };
}

async function loadSharpCodec() {
  if (!sharpCodecPromise) sharpCodecPromise = import("sharp").then((module) => module.default ?? module);
  return sharpCodecPromise;
}

function minifySvgText(value) {
  return String(value)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function summarizeGeneratedImageCompression(artifacts) {
  const compression = artifacts.map((artifact) => artifact.compression).filter(Boolean);
  const originalBytes = compression.reduce((total, item) => total + (item.originalByteLength ?? 0), 0);
  const storedBytes = compression.reduce((total, item) => total + (item.storedByteLength ?? item.originalByteLength ?? 0), 0);
  const savedBytes = compression.reduce((total, item) => total + (item.savedBytes ?? 0), 0);
  return {
    attemptedArtifactCount: compression.length,
    compressedArtifactCount: compression.filter((item) => item.status === "compressed").length,
    skippedArtifactCount: compression.filter((item) => item.status === "skipped").length,
    originalBytes,
    storedBytes,
    savedBytes,
    algorithms: Array.from(new Set(compression.filter((item) => item.status === "compressed").map((item) => item.algorithm))).sort()
  };
}

function imageExtensionForMimeType(mimeType) {
  if (mimeType === "image/svg+xml") return "svg";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/png") return "png";
  return "img";
}

function safeGeneratedImagePanelId(value, index) {
  const fallback = `panel-${index + 1}`;
  return safeId(value, fallback).toLowerCase() || fallback;
}

function generatedImageHashInput(artifacts) {
  return artifacts
    .map((artifact) => `${artifact.fileName}:${artifact.mimeType}:${artifact.text ?? artifact.base64 ?? artifact.dataUrl ?? ""}`)
    .join("\n");
}

function buildManualVendorHandoffRecord({ authContext, bodyText }) {
  const body = parseJsonBody(bodyText);
  const projectId = safeId(body.projectId ?? body.cardProjectId, "");
  const renderPacketId = safeId(body.renderPacketId, "");
  const orderId = safeId(body.orderId, stableRuntimeId("order", authContext.userId, projectId, renderPacketId));
  const storeId = safeId(body.storeId ?? body.vendorId ?? body.selectedVendorId, "");
  const region = safeText(body.region, "US").slice(0, 12);
  const externalShareApproval = safeBoolean(body.externalShareApproval ?? body.externalShareApproved ?? body.consentGranted);
  const status = externalShareApproval ? "vendor_handoff_ready" : "vendor_handoff_blocked";
  const recoveryActions = externalShareApproval
    ? ["manual_upload_only", "live_vendor_api_disabled"]
    : ["external_share_approval_required", "manual_upload_only", "live_vendor_api_disabled"];
  const controls = {
    orderId,
    projectId,
    renderPacketId,
    storeId,
    manualUploadOnly: true,
    liveVendorApisDisabled: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false
  };

  return {
    order: {
      id: orderId,
      projectId,
      status,
      storeId,
      quoteCents: null,
      pickupWindowMinutes: null,
      recoveryActions
    },
    orderEvent: {
      id: stableRuntimeId("order-event", orderId, "attempt_vendor_handoff"),
      orderId,
      eventType: "attempt_vendor_handoff",
      payload: {
        ...controls,
        externalShareApproval,
        recoveryActions
      }
    },
    consentRecord: {
      id: safeId(body.consentRecordId, stableRuntimeId("consent", authContext.userId, orderId, "external-share")),
      userId: authContext.userId,
      action: "external_share_approval",
      region,
      granted: externalShareApproval,
      controls
    }
  };
}

function buildManualVendorHandoffRepositoryPayload(record, runtimeMode) {
  return {
    orderId: record.order.id,
    projectId: record.order.projectId,
    renderPacketId: record.orderEvent.payload.renderPacketId,
    handoffStatus: record.order.status,
    consentRecordId: record.consentRecord.id,
    externalShareApproval: record.consentRecord.granted,
    manualOrderTrail: {
      orderId: record.order.id,
      status: record.order.status,
      eventType: record.orderEvent.eventType,
      consentRecordId: record.consentRecord.id,
      storeId: record.order.storeId
    },
    repository: {
      tables: ["orders", "order_events", "consent_records"],
      runtimeMode,
      persisted: true,
      liveQuote: false,
      realOrdersEnabled: false
    }
  };
}

function buildDataRequestRecord({ authContext, bodyText }) {
  const body = parseJsonBody(bodyText);
  const requestType = safeDataRequestType(body.requestType ?? body.type);
  const requestId = safeId(body.requestId, stableRuntimeId("data-request", authContext.userId, requestType));
  const region = safeText(body.region, "").slice(0, 12);
  // Status and due date are server policy: a requester must never be able to
  // mark their own privacy request completed or move its deadline.
  const dueAt = defaultDataRequestDueAt(requestType);
  const status = "pending_verification";
  const granted = safeBoolean(body.consentGranted ?? body.requestConfirmed);
  const controls = {
    requestId,
    requestType,
    region,
    dueAt,
    rawContentStored: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    verificationRequired: true,
    deletionRequiresRetentionReview: requestType === "delete"
  };

  return {
    dataRequest: {
      id: requestId,
      userId: authContext.userId,
      requestType,
      status,
      dueAt,
      completedAt: null
    },
    consentRecord: {
      id: safeId(body.consentRecordId, stableRuntimeId("consent", authContext.userId, requestId, "data-request")),
      userId: authContext.userId,
      action: `data_request:${requestType}`,
      region,
      granted,
      controls
    }
  };
}

function buildDataRequestRepositoryPayload(record, runtimeMode) {
  return {
    dataRequestId: record.dataRequest.id,
    requestType: record.dataRequest.requestType,
    requestStatus: record.dataRequest.status,
    dueAt: record.dataRequest.dueAt,
    consentRecordId: record.consentRecord.id,
    consentGranted: record.consentRecord.granted,
    privacyControls: {
      region: record.consentRecord.region,
      rawContentStored: false,
      verificationRequired: true,
      deletionRequiresRetentionReview: record.dataRequest.requestType === "delete"
    },
    repository: {
      tables: ["data_requests", "consent_records"],
      runtimeMode,
      persisted: true,
      rawContentStored: false
    }
  };
}

function persistedTablesForRoute(route) {
  return persistedTablesForRouteId(route.id);
}

function authError(statusCode, status, route) {
  return {
    ok: false,
    statusCode,
    payload: {
      service: "customcard-api",
      status,
      route: route.id,
      requiredAuth: route.auth
    }
  };
}

function readBearerToken(request) {
  const authorization = readHeader(request, "authorization");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}

function readHeader(request, name) {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function stableRuntimeId(...parts) {
  return `rt_${createHash("sha256").update(parts.join(":")).digest("hex").slice(0, 16)}`;
}

function parseJsonBody(bodyText) {
  if (!bodyText) return {};
  try {
    return JSON.parse(bodyText);
  } catch {
    return {};
  }
}

function safeId(value, fallback) {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || fallback;
}

function safeLocale(value) {
  const text = String(value ?? "en-US").trim();
  return /^[a-z]{2,3}(-[A-Z]{2})?$/i.test(text) ? text : "en-US";
}

function safeDirection(value, locale) {
  const direction = String(value ?? "").trim().toLowerCase();
  if (direction === "rtl" || direction === "ltr") return direction;
  return /^(ar|he|fa|ur)(-|$)/i.test(locale) ? "rtl" : "ltr";
}

function safeRenderPacketKind(value, safeZonePassed, textOverflow) {
  const kind = String(value ?? "").trim();
  if (kind === "blocked") return "blocked";
  if (kind === "validated_print_packet") return "validated_print_packet";
  return safeZonePassed && !textOverflow ? "validated_print_packet" : "blocked";
}

function safeStorageProvider(value) {
  const provider = String(value ?? "filesystem").trim();
  return provider === "s3-compatible" ? "s3-compatible" : "filesystem";
}

function safeArtifactUri(value, fallback) {
  const text = String(value ?? "").trim();
  if (/^(file|s3):\/\//.test(text)) return text.slice(0, 240);
  return fallback;
}

function safeOptionalArtifactReference(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^(file|s3|memory):\/\//.test(text)) return text.slice(0, 500);
  if (text.startsWith("/api/artifacts/")) return text.slice(0, 1000);
  try {
    const url = new URL(text);
    if ((url.protocol === "http:" || url.protocol === "https:") && url.pathname.startsWith("/api/artifacts/")) {
      return url.toString().slice(0, 1000);
    }
  } catch {
    return "";
  }
  return "";
}

function safeMemoryText(value) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text.slice(0, 500);
}

function safeMemorySensitivity(value) {
  const sensitivity = String(value ?? "normal").trim().toLowerCase().replace(/[^a-z_-]/g, "_");
  return ["normal", "sensitive", "restricted"].includes(sensitivity) ? sensitivity : "normal";
}

function safeMemorySource(value) {
  const source = String(value ?? "customer-review").trim().toLowerCase().replace(/[^a-z0-9._:-]/g, "-");
  return source.slice(0, 60) || "customer-review";
}

function safeMemoryDecision(value) {
  const decision = String(value ?? "approve").trim().toLowerCase().replace(/[^a-z_-]/g, "_");
  return ["approve", "forget"].includes(decision) ? decision : "approve";
}

function safeDraftStatus(value) {
  const status = String(value ?? "draft").trim().toLowerCase();
  return ["draft", "in-progress", "ready-for-review"].includes(status) ? status : "draft";
}

function safeOpportunityDecision(value) {
  const decision = String(value ?? "pending").trim().toLowerCase();
  return ["pending", "accepted", "snoozed", "dismissed"].includes(decision) ? decision : "pending";
}

function safeVendorId(value) {
  const vendorId = String(value ?? "walgreens").trim().toLowerCase();
  return ["walgreens", "cvs", "fedex", "walmart", "staples", "office-depot", "local-print-shop"].includes(vendorId)
    ? vendorId
    : "walgreens";
}

function sanitizeDraftInput(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    sender: safeDraftText(input.sender, "Local User"),
    recipient: safeDraftText(input.recipient, "Someone important"),
    relationship: safeDraftText(input.relationship, "Friends"),
    occasion: safeDraftText(input.occasion, "card"),
    tone: safeTone(input.tone),
    style: safeVisualStyle(input.style),
    language: safeLanguage(input.language),
    personalNote: safeLongDraftText(input.personalNote, ""),
    useMemory: safeBoolean(input.useMemory)
  };
}

function safeDraftText(value, fallback) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text.slice(0, 120) || fallback;
}

function safeLongDraftText(value, fallback) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text.slice(0, 1000) || fallback;
}

function safeTone(value) {
  const tone = String(value ?? "warm").trim().toLowerCase();
  if (tone === "playful") return "funny";
  return ["warm", "funny", "elegant", "simple", "reverent", "sentimental"].includes(tone) ? tone : "warm";
}

function safeVisualStyle(value) {
  const style = String(value ?? "botanical").trim().toLowerCase();
  return ["botanical", "bold-type", "photo-note", "minimal"].includes(style) ? style : "botanical";
}

function safeLanguage(value) {
  const language = String(value ?? "English").trim();
  return ["English", "Spanish", "Urdu", "Arabic"].includes(language) ? language : "English";
}

function safeText(value, fallback) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text.slice(0, 120) || fallback;
}

function safeTimestamp(value, fallback) {
  const date = new Date(String(value ?? ""));
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function safeFutureTimestamp(value, fallback) {
  const date = new Date(String(value ?? ""));
  const fallbackDate = new Date(fallback);
  const minimumExpiresAt = Date.now() + 60 * 1000;
  const candidate = Number.isNaN(date.getTime()) ? fallbackDate : date;
  return candidate.getTime() > minimumExpiresAt ? candidate.toISOString() : fallbackDate.toISOString();
}

function safeInteger(value, fallback, min, max) {
  const number = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
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

function defaultDataRequestDueAt(requestType) {
  const days = requestType === "revoke_consent" ? 7 : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function defaultSignedUrlExpiresAt() {
  return new Date(Date.now() + 15 * 60 * 1000).toISOString();
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

function normalizeJson(value) {
  return typeof value === "string" ? JSON.parse(value) : value;
}
