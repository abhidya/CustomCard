import { createHash, createHmac } from "node:crypto";
import { looksLikeJwt, verifyClerkSessionToken } from "./clerk-session.mjs";
import { resolveImportPreviewMetadata } from "../src/importPreviewMetadata.mjs";
import { normalizeCardCategory, publicCardCategories } from "../src/cardCategoriesData.mjs";
import { missingRetailPrinterCouponPortalEvidenceFields } from "../src/retailPrinterCouponPortalEvidenceData.mjs";
import { mutationBodyContractSpecs, persistedTablesForRouteId } from "../src/apiRouteContractsData.mjs";
import { createObjectStoreRuntime } from "./object-store-runtime.mjs";
import { createPostgresRuntime, postgresPoolConfig } from "./postgres-runtime.mjs";

export { postgresPoolConfig } from "./postgres-runtime.mjs";

const runtimeModes = new Set(["contract", "memory", "postgres"]);
const productionEnvNames = new Set(["prod", "production"]);

function isProductionRuntimeEnv(env) {
  const customCardEnv = String(env.CUSTOMCARD_ENV ?? "").trim().toLowerCase();
  const nodeEnv = String(env.NODE_ENV ?? "").trim().toLowerCase();
  return productionEnvNames.has(customCardEnv) || nodeEnv === "production";
}

export function createApiRuntime({ env = process.env, routes = [], postgresPoolFactory } = {}) {
  const configuredMode = String(env.CUSTOMCARD_API_RUNTIME ?? "").trim();
  const requestedMode = configuredMode || "contract";
  const objectStoreRuntime = createObjectStoreRuntime({ env });
  if (!runtimeModes.has(requestedMode)) return createInvalidApiRuntime({ requestedMode, routes, objectStoreRuntime });
  if (isProductionRuntimeEnv(env) && requestedMode !== "postgres") {
    return createInvalidApiRuntime({
      requestedMode: configuredMode || "(missing)",
      routes,
      objectStoreRuntime,
      validationMessage:
        "Production API runtime requires CUSTOMCARD_API_RUNTIME=postgres. Contract and memory runtimes are reviewer-only and do not provide durable production auth/idempotency."
    });
  }
  const mode = requestedMode;
  if (mode === "memory") return createMemoryApiRuntime({ env, routes, objectStoreRuntime });
  if (mode === "postgres") return createPostgresApiRuntime({ env, routes, postgresPoolFactory, objectStoreRuntime });
  return createContractApiRuntime({ routes, objectStoreRuntime });
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

function createContractApiRuntime({ routes, objectStoreRuntime }) {
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
    async persistMutation({ route, bodyText, responsePayload }) {
      const bodyValidation = validateMutationBody(route, bodyText);
      if (bodyValidation) return bodyValidation;

      return {
        ok: true,
        statusCode: 202,
        payload: {
          ...responsePayload,
          runtimeMode: "contract",
          idempotencyPersisted: false
        }
      };
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
    async close() {
      return undefined;
    }
  };
}

function createInvalidApiRuntime({ requestedMode, routes, objectStoreRuntime, validationMessage }) {
  const contractRuntime = createContractApiRuntime({ routes, objectStoreRuntime });
  const blockers = [validationMessage ?? `Unsupported CUSTOMCARD_API_RUNTIME: ${requestedMode}. Expected contract, memory, or postgres.`];
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

  addSession(sessions, env.CUSTOMCARD_CUSTOMER_SESSION_TOKEN, "customer", "user-demo", env.AUTH_SESSION_SECRET);
  addSession(sessions, env.CUSTOMCARD_ADMIN_SESSION_TOKEN, "admin", "admin-demo", env.AUTH_SESSION_SECRET);

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
        statefulRoutes: routes.filter((route) => route.auth !== "none").length,
        artifactStore: objectStoreRuntime.describe()
      };
    },
    validate() {
      const blockers = [];
      if (!env.CUSTOMCARD_CUSTOMER_SESSION_TOKEN) blockers.push("Memory API runtime requires CUSTOMCARD_CUSTOMER_SESSION_TOKEN.");
      if (!env.CUSTOMCARD_ADMIN_SESSION_TOKEN) blockers.push("Memory API runtime requires CUSTOMCARD_ADMIN_SESSION_TOKEN.");
      blockers.push(...objectStoreRuntime.validate());
      return blockers;
    },
    async authorize(route, request) {
      const sessionResult = authorizeFromSessions(route, request, sessions, env.AUTH_SESSION_SECRET);
      if (sessionResult.ok || sessionResult.statusCode !== 401) return sessionResult;

      // Clerk bridge: a signed-in browser sends the Clerk session JWT. Verify it
      // offline and mint a runtime session so customer routes stop returning 401.
      const token = readBearerToken(request);
      if (!token || !looksLikeJwt(token)) return sessionResult;
      const verification = verifyClerkSessionToken(token, env);
      if (!verification.ok) return sessionResult;
      const sessionId = stableRuntimeId("session", "clerk", verification.clerkUserId, verification.clerkSessionId);
      sessions.set(hashSessionToken(token, env.AUTH_SESSION_SECRET), {
        id: sessionId,
        sessionId,
        role: verification.role,
        userId: stableRuntimeId("user", "clerk", verification.clerkUserId),
        email: verification.email
      });
      return authorizeFromSessions(route, request, sessions, env.AUTH_SESSION_SECRET);
    },
    async persistMutation({ route, request, authContext, bodyText, responsePayload }) {
      const prepared = prepareIdempotentMutation({ route, request, authContext, bodyText, responsePayload });
      if (!prepared.ok) return prepared;

      const existing = idempotencyRecords.get(prepared.recordKey);
      if (existing) return replayOrConflict(existing, prepared.requestHash);

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
          cardGalleryEntries
        },
        route,
        authContext,
        bodyText,
        objectStoreRuntime
      });
      const payload = decorateMutationPayload({
        route,
        authContext,
        responsePayload,
        runtimeMode: "memory",
        idempotencyKey: prepared.idempotencyKey,
        idempotencyReplayed: false,
        routePersistence
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
          id: stableRuntimeId("job", authContext.userId, route.id, prepared.idempotencyKey),
          userId: authContext.userId,
          routeId: route.id,
          status: "queued"
        });
      }

      return { ok: true, statusCode: 202, payload };
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
    async close() {
      return undefined;
    }
  };
}

function createPostgresApiRuntime({ env, routes, postgresPoolFactory, objectStoreRuntime }) {
  const postgresRuntime = createPostgresRuntime({ env, postgresPoolFactory });

  async function getPool() {
    return postgresRuntime.getPool();
  }

  return {
    mode: "postgres",
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
      blockers.push(...objectStoreRuntime.validate());
      return blockers;
    },
    async authorize(route, request) {
      if (route.auth === "none") return anonymousAuthContext(route);
      const token = readBearerToken(request);
      if (!token) return authError(401, "auth-required", route);

      const pool = await getPool();
      const sessionHash = hashSessionToken(token, env.AUTH_SESSION_SECRET);
      const result = await pool.query(
        `SELECT s.id AS session_id, s.user_id, s.role, u.email
         FROM auth_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.session_hash = $1
           AND s.revoked_at IS NULL
           AND s.expires_at > NOW()
         LIMIT 1`,
        [sessionHash]
      );
      const session = result.rows[0];
      const requiredRole = requiredRoleForAuth(route.auth);
      if (!session) {
        // Clerk bridge: verify the Clerk session JWT offline and mint a durable
        // auth_sessions row so signed-in browsers are never rejected with 401.
        if (looksLikeJwt(token)) {
          const verification = verifyClerkSessionToken(token, env);
          if (verification.ok) {
            const bridged = await postgresRuntime.withTransaction(async (client) =>
              ensureClerkAuthSession(client, { verification, sessionHash })
            );
            if (bridged.role !== requiredRole) return authError(403, "wrong-role", route);
            return { ok: true, role: bridged.role, userId: bridged.userId, sessionId: bridged.sessionId, email: bridged.email };
          }
        }
        return authError(401, "invalid-session", route);
      }
      if (session.role !== requiredRole) return authError(403, "wrong-role", route);

      return {
        ok: true,
        role: session.role,
        userId: session.user_id,
        sessionId: session.session_id,
        email: session.email
      };
    },
    async persistMutation({ route, request, authContext, bodyText, responsePayload }) {
      const prepared = prepareIdempotentMutation({ route, request, authContext, bodyText, responsePayload });
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
          return replayOrConflict(
            {
              requestHash: existing.rows[0].request_hash,
              responseBody: normalizeJson(existing.rows[0].response_body),
              statusCode: 202
            },
            prepared.requestHash
          );
        }

        const routePersistence = await persistPostgresRouteMutation({
          client,
          route,
          authContext,
          bodyText,
          objectStoreRuntime
        });
        const responseBody = decorateMutationPayload({
          route,
          authContext,
          responsePayload,
          runtimeMode: "postgres",
          idempotencyKey: prepared.idempotencyKey,
          idempotencyReplayed: false,
          routePersistence
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
              stableRuntimeId("job", authContext.userId, route.id, prepared.idempotencyKey),
              authContext.userId,
              route.id,
              idempotencyId,
              JSON.stringify({ routeId: route.id })
            ]
          );
        }
        return { ok: true, statusCode: 202, payload: responseBody };
      });
    },
    async readArtifact(input) {
      return objectStoreRuntime.readSignedArtifact(input);
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
    },
    async readCardGallery({ authContext }) {
      const pool = await getPool();
      const entriesResult = await pool.query(
        `SELECT id, project_id, render_packet_id, source_draft_id, category, title, public_caption,
                featured, featured_rank, public_approved, front_svg, created_at, updated_at
         FROM card_gallery_entries
         ORDER BY category ASC, featured_rank ASC, updated_at DESC
         LIMIT 200`
      );
      const candidatesResult = await pool.query(
        `SELECT id, user_id, status, draft_input, locale, updated_at
         FROM draft_states
         ORDER BY updated_at DESC
         LIMIT 25`
      );
      return buildCardGalleryReadPayload({
        runtimeMode: "postgres",
        authContext,
        entries: entriesResult.rows.map((row) =>
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
            createdAtIso: new Date(row.created_at).toISOString(),
            updatedAtIso: new Date(row.updated_at).toISOString()
          })
        ),
        candidates: candidatesResult.rows.map((row) =>
          publicGalleryCandidate({
            id: row.id,
            userId: row.user_id,
            status: row.status,
            draftInput: normalizeJson(row.draft_input),
            localeCode: row.locale,
            updatedAtIso: new Date(row.updated_at).toISOString()
          })
        )
      });
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
    userId
  });
}

function authorizeFromSessions(route, request, sessions, sessionSecret) {
  if (route.auth === "none") return anonymousAuthContext(route);
  const token = readBearerToken(request);
  if (!token) return authError(401, "auth-required", route);
  const session = sessions.get(hashSessionToken(token, sessionSecret));
  if (!session) return authError(401, "invalid-session", route);
  const requiredRole = requiredRoleForAuth(route.auth);
  if (session.role !== requiredRole) return authError(403, "wrong-role", route);
  return { ok: true, ...session };
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
  return auth === "admin-session" ? "admin" : "customer";
}

function prepareIdempotentMutation({ route, request, authContext, bodyText }) {
  const idempotencyKey = readHeader(request, "x-idempotency-key");
  if (!idempotencyKey) {
    return {
      ok: false,
      statusCode: 400,
      payload: {
        service: "customcard-api",
        status: "idempotency-key-required",
        route: route.id
      }
    };
  }
  if (idempotencyKey.length < 12) {
    return {
      ok: false,
      statusCode: 400,
      payload: {
        service: "customcard-api",
        status: "idempotency-key-too-short",
        route: route.id
      }
    };
  }

  const bodyValidation = validateMutationBody(route, bodyText);
  if (bodyValidation) return bodyValidation;

  return {
    ok: true,
    idempotencyKey,
    requestHash: requestHash(route.id, bodyText),
    recordKey: `${authContext.userId}:${route.id}:${idempotencyKey}`
  };
}

const mutationBodyContracts = {
  "import-preview": {
    ...mutationBodyContractSpecs["import-preview"],
    missingFields(body) {
      return resolveImportPreviewMetadata(body).missingFields;
    }
  },
  "calendar-connection-start": {
    ...mutationBodyContractSpecs["calendar-connection-start"],
    missingFields(body) {
      const calendarChoiceId = String(body.calendarChoiceId ?? body.choiceId ?? body.providerId ?? "").trim();
      return ["manual-invite-or-ics", "google-calendar-events", "icloud-ics-fallback"].includes(calendarChoiceId)
        ? []
        : ["calendarChoiceId"];
    }
  },
  "retail-printer-operation-start": {
    ...mutationBodyContractSpecs["retail-printer-operation-start"],
    missingFields(body) {
      const missingFields = [];
      const vendorId = String(body.vendorId ?? body.providerId ?? body.selectedVendorId ?? "").trim();
      const operation = String(body.operation ?? body.operationKind ?? "").trim();
      if (!["walmart", "fedex", "cvs", "walgreens"].includes(vendorId)) missingFields.push("vendorId");
      if (!["fetch-price", "upload-image", "place-order"].includes(operation)) missingFields.push("operation");
      return missingFields;
    }
  },
  "retail-printer-coupon-portal-evidence": {
    ...mutationBodyContractSpecs["retail-printer-coupon-portal-evidence"],
    missingFields(body) {
      return missingRetailPrinterCouponPortalEvidenceFields(body);
    }
  },
  "customer-draft-state-save": {
    ...mutationBodyContractSpecs["customer-draft-state-save"],
    missingFields(body) {
      const missingFields = [];
      if (!body.draftInput || typeof body.draftInput !== "object" || Array.isArray(body.draftInput)) {
        missingFields.push("draftInput");
      }
      if (!hasValidDraftStatus(body.status)) missingFields.push("status");
      return missingFields;
    }
  },
  "render-packets": {
    ...mutationBodyContractSpecs["render-packets"],
    missingFields(body) {
      return hasRequiredText(body.projectId) ? [] : ["projectId"];
    }
  },
  "card-projects": {
    ...mutationBodyContractSpecs["card-projects"],
    missingFields(body) {
      const missingFields = [];
      if (!hasRequiredText(body.opportunityId)) missingFields.push("opportunityId");
      if (!hasRequiredText(body.recipientName)) missingFields.push("recipientName");
      return missingFields;
    }
  },
  "relationship-memories": {
    ...mutationBodyContractSpecs["relationship-memories"],
    missingFields(body) {
      const missingFields = [];
      if (!hasRequiredText(body.recipientName ?? body.recipient)) missingFields.push("recipientName");
      if (!hasRequiredText(body.text ?? body.note)) missingFields.push("text");
      if (!hasExplicitMemoryDecision(body)) missingFields.push("decision");
      return missingFields;
    }
  },
  "manual-vendor-handoff": {
    ...mutationBodyContractSpecs["manual-vendor-handoff"],
    missingFields(body) {
      const missingFields = [];
      if (!hasRequiredText(body.projectId ?? body.cardProjectId)) missingFields.push("projectId");
      if (!hasRequiredText(body.renderPacketId)) missingFields.push("renderPacketId");
      if (!hasRequiredText(body.vendorId ?? body.storeId ?? body.selectedVendorId)) missingFields.push("vendorId");
      if (!hasExplicitBoolean(body.externalShareApproval ?? body.externalShareApproved ?? body.consentGranted)) {
        missingFields.push("externalShareApproval");
      }
      return missingFields;
    }
  },
  "data-requests": {
    ...mutationBodyContractSpecs["data-requests"],
    missingFields(body) {
      const missingFields = [];
      if (!hasValidDataRequestType(body.requestType ?? body.type)) missingFields.push("requestType");
      if (!hasRequiredText(body.region)) missingFields.push("region");
      if (!hasExplicitBoolean(body.consentGranted ?? body.requestConfirmed)) missingFields.push("consentGranted");
      return missingFields;
    }
  },
  "admin-card-gallery-save": {
    ...mutationBodyContractSpecs["admin-card-gallery-save"],
    missingFields(body) {
      if (safeBoolean(body.remove)) {
        return hasRequiredText(body.entryId ?? body.id) ? [] : ["entryId"];
      }
      const missingFields = [];
      if (!hasRequiredText(body.category ?? body.occasion)) missingFields.push("category");
      if (!hasRequiredText(body.title)) missingFields.push("title");
      if (!hasRequiredText(body.publicCaption ?? body.caption)) missingFields.push("publicCaption");
      return missingFields;
    }
  }
};

function validateMutationBody(route, bodyText) {
  const contract = mutationBodyContracts[route.id];
  if (!contract) return undefined;
  const body = parseJsonBody(bodyText);
  const missingFields = contract.missingFields(body);

  if (missingFields.length === 0) return undefined;

  return {
    ok: false,
    statusCode: 400,
    payload: {
      service: "customcard-api",
      status: `invalid-${route.id}-payload`,
      route: route.id,
      detail: contract.detail,
      requiredFields: contract.requiredFields,
      missingFields,
      rawContentStored: false
    }
  };
}

function hasRequiredText(value) {
  return String(value ?? "").trim().length > 0;
}

function hasExplicitBoolean(value) {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

function hasExplicitMemoryDecision(body) {
  const decision = String(body.decision ?? "").trim().toLowerCase();
  return decision === "approve" || decision === "forget" || hasExplicitBoolean(body.forget);
}

function hasValidDataRequestType(value) {
  const requestType = String(value ?? "").trim().toLowerCase().replace(/[^a-z_:-]/g, "_");
  return ["export", "delete", "correct", "revoke_consent", "access"].includes(requestType);
}

function hasValidDraftStatus(value) {
  return ["draft", "in-progress", "ready-for-review"].includes(String(value ?? "").trim());
}

function replayOrConflict(record, nextRequestHash) {
  if (record.requestHash !== nextRequestHash) {
    return {
      ok: false,
      statusCode: 409,
      payload: {
        service: "customcard-api",
        status: "idempotency-conflict",
        detail: "The same idempotency key was used with a different request body."
      }
    };
  }

  return {
    ok: true,
    statusCode: record.statusCode,
    payload: {
      ...record.responseBody,
      idempotencyReplayed: true
    }
  };
}

function decorateMutationPayload({ route, authContext, responsePayload, runtimeMode, idempotencyKey, idempotencyReplayed, routePersistence }) {
  return {
    ...responsePayload,
    ...(routePersistence?.payload ?? {}),
    runtimeMode,
    authenticatedUserId: authContext.userId,
    persistedTables: persistedTablesForRoute(route),
    idempotencyKey,
    idempotencyPersisted: true,
    repositoryPersisted: Boolean(routePersistence?.persisted),
    idempotencyReplayed
  };
}

async function persistMemoryRouteMutation({ repositories, route, authContext, bodyText, objectStoreRuntime }) {
  if (route.id === "import-preview") {
    const record = buildImportPreviewRecord({ authContext, bodyText });
    repositories.providerConnections.set(record.providerConnection.id, record.providerConnection);
    repositories.importedEvents.set(record.importedEvent.id, record.importedEvent);
    repositories.cardOpportunities.set(record.cardOpportunity.id, record.cardOpportunity);
    return {
      persisted: true,
      payload: buildImportPreviewRepositoryPayload(record, "memory")
    };
  }

  if (route.id === "card-projects") {
    const record = buildCardProjectRecord({ authContext, bodyText });
    repositories.cardProjects.set(record.projectId, record);
    return {
      persisted: true,
      payload: buildCardProjectRepositoryPayload(record, "memory")
    };
  }

  if (route.id === "customer-draft-state-save") {
    const record = buildDraftStateRecord({ authContext, bodyText });
    repositories.draftStates.set(authContext.userId, record);
    return {
      persisted: true,
      payload: buildDraftStateRepositoryPayload(record, "memory")
    };
  }

  if (route.id === "relationship-memories") {
    const record = buildRelationshipMemoryRecord({ authContext, bodyText });
    repositories.relationshipMemories.set(record.id, record);
    return {
      persisted: true,
      payload: buildRelationshipMemoryRepositoryPayload(record, "memory")
    };
  }

  if (route.id === "render-packets") {
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

  if (route.id === "manual-vendor-handoff") {
    const record = buildManualVendorHandoffRecord({ authContext, bodyText });
    repositories.orders.set(record.order.id, record.order);
    repositories.orderEvents.set(record.orderEvent.id, record.orderEvent);
    repositories.consentRecords.set(record.consentRecord.id, record.consentRecord);
    return {
      persisted: true,
      payload: buildManualVendorHandoffRepositoryPayload(record, "memory")
    };
  }

  if (route.id === "data-requests") {
    const record = buildDataRequestRecord({ authContext, bodyText });
    repositories.dataRequests.set(record.dataRequest.id, record.dataRequest);
    repositories.consentRecords.set(record.consentRecord.id, record.consentRecord);
    return {
      persisted: true,
      payload: buildDataRequestRepositoryPayload(record, "memory")
    };
  }

  if (route.id === "admin-card-gallery-save") {
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

  return undefined;
}

async function persistPostgresRouteMutation({ client, route, authContext, bodyText, objectStoreRuntime }) {
  if (route.id === "import-preview") {
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

  if (route.id === "manual-vendor-handoff") {
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

  if (route.id === "data-requests") {
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

  if (route.id === "relationship-memories") {
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

  if (route.id === "customer-draft-state-save") {
    const record = buildDraftStateRecord({ authContext, bodyText });
    await client.query(
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
         updated_at = EXCLUDED.updated_at`,
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
    return {
      persisted: true,
      payload: buildDraftStateRepositoryPayload(record, "postgres")
    };
  }

  if (route.id === "render-packets") {
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

  if (route.id === "admin-card-gallery-save") {
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
          featured, featured_rank, public_approved, front_svg, redacted, created_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, $12, NOW())
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
        authContext.userId
      ]
    );
    return { persisted: true, payload: buildCardGalleryRepositoryPayload(record, "postgres") };
  }

  if (route.id !== "card-projects") return undefined;
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
      scopes: ["calendar.metadata"],
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
  return { userId, role: verification.role, sessionId, email };
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
      thumbnailUrl: entry.thumbnailArtifactUri,
      frontSvg: entry.frontSvg,
      frontImageUrl: entry.frontArtifactUri,
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
    fallbackToBuiltInExamples: categories.length === 0,
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
    title: safeText(body.title, "Featured card").slice(0, 80),
    publicCaption: safeText(body.publicCaption ?? body.caption, "Made with CustomCard").slice(0, 160),
    featured: safeBoolean(body.featured),
    featuredRank: safeInteger(body.featuredRank, 100, 0, 10_000),
    publicApproved: safeBoolean(body.publicApproved),
    frontSvg,
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

function buildCardGalleryReadPayload({ runtimeMode, authContext, entries, candidates }) {
  return {
    service: "customcard-api",
    status: "ready",
    authenticatedUserId: authContext.userId,
    categories: [...publicCardCategories],
    entries,
    candidates,
    rawContentStored: false,
    repository: {
      tables: ["card_gallery_entries", "draft_states"],
      runtimeMode,
      persisted: entries.length > 0
    }
  };
}

function buildDraftStateRecord({ authContext, bodyText }) {
  const body = parseJsonBody(bodyText);
  const draftInput = sanitizeDraftInput(body.draftInput);
  const opportunityId = safeId(body.opportunityId, stableRuntimeId("opportunity", authContext.userId, draftInput.recipient, draftInput.occasion));
  const id = safeId(body.draftStateId ?? body.id, stableRuntimeId("draft-state", authContext.userId));

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
    adapterId: "browser-svg-renderer",
    provider: "CustomCard renderer",
    capability: "image-generation",
    metadata: {
      renderPacketId: renderPacket.id,
      projectId: renderPacket.projectId,
      policy: "local-fallback-no-live-network",
      auditEventName: "provider.fallback.selected"
    }
  };
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
  const dueAt = safeTimestamp(body.dueAt ?? defaultDataRequestDueAt(requestType), defaultDataRequestDueAt(requestType));
  const status = safeDataRequestStatus(body.status);
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
  return ["warm", "playful", "elegant", "reverent"].includes(tone) ? tone : "warm";
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

function safeDataRequestStatus(value) {
  const status = String(value ?? "pending_verification").trim().toLowerCase().replace(/[^a-z_-]/g, "_");
  return ["pending_verification", "received", "processing", "completed", "rejected"].includes(status) ? status : "pending_verification";
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
