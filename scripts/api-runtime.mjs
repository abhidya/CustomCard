import { createHash } from "node:crypto";
import { resolveImportPreviewMetadata } from "../src/importPreviewMetadata.mjs";
import { missingRetailPrinterCouponPortalEvidenceFields } from "../src/retailPrinterCouponPortalEvidenceData.mjs";

const runtimeModes = new Set(["contract", "memory", "postgres"]);

export function createApiRuntime({ env = process.env, routes = [], postgresPoolFactory } = {}) {
  const requestedMode = env.CUSTOMCARD_API_RUNTIME ?? "contract";
  if (!runtimeModes.has(requestedMode)) return createInvalidApiRuntime({ requestedMode, routes });
  const mode = requestedMode;
  if (mode === "memory") return createMemoryApiRuntime({ env, routes });
  if (mode === "postgres") return createPostgresApiRuntime({ env, routes, postgresPoolFactory });
  return createContractApiRuntime({ routes });
}

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function requestHash(routeId, bodyText) {
  return createHash("sha256").update(`${routeId}:${bodyText || "{}"}`).digest("hex");
}

function createContractApiRuntime({ routes }) {
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
        relationshipMemoryRecords: 0,
        cardProjectRecords: 0,
        renderPacketRecords: 0,
        orderRecords: 0,
        orderEventRecords: 0,
        consentRecords: 0,
        dataRequestRecords: 0,
        statefulRoutes: routes.filter((route) => route.audience !== "public").length
      };
    },
    validate() {
      return [];
    },
    async authorize(route) {
      return {
        ok: true,
        role: route.audience,
        userId: route.audience === "admin" ? "contract-admin" : "contract-customer",
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
    async close() {
      return undefined;
    }
  };
}

function createInvalidApiRuntime({ requestedMode, routes }) {
  const contractRuntime = createContractApiRuntime({ routes });
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
      return [`Unsupported CUSTOMCARD_API_RUNTIME: ${requestedMode}. Expected contract, memory, or postgres.`];
    }
  };
}

function createMemoryApiRuntime({ env, routes }) {
  const sessions = new Map();
  const idempotencyRecords = new Map();
  const auditRecords = [];
  const queuedJobs = [];
  const providerConnections = new Map();
  const importedEvents = new Map();
  const cardOpportunities = new Map();
  const relationshipMemories = new Map();
  const cardProjects = new Map();
  const renderPackets = new Map();
  const orders = new Map();
  const orderEvents = new Map();
  const consentRecords = new Map();
  const dataRequests = new Map();

  addSession(sessions, env.CUSTOMCARD_CUSTOMER_SESSION_TOKEN, "customer", "user-demo");
  addSession(sessions, env.CUSTOMCARD_ADMIN_SESSION_TOKEN, "admin", "admin-demo");

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
        relationshipMemoryRecords: relationshipMemories.size,
        cardProjectRecords: cardProjects.size,
        renderPacketRecords: renderPackets.size,
        orderRecords: orders.size,
        orderEventRecords: orderEvents.size,
        consentRecords: consentRecords.size,
        dataRequestRecords: dataRequests.size,
        statefulRoutes: routes.filter((route) => route.audience !== "public").length
      };
    },
    validate() {
      const blockers = [];
      if (!env.CUSTOMCARD_CUSTOMER_SESSION_TOKEN) blockers.push("Memory API runtime requires CUSTOMCARD_CUSTOMER_SESSION_TOKEN.");
      if (!env.CUSTOMCARD_ADMIN_SESSION_TOKEN) blockers.push("Memory API runtime requires CUSTOMCARD_ADMIN_SESSION_TOKEN.");
      return blockers;
    },
    async authorize(route, request) {
      return authorizeFromSessions(route, request, sessions);
    },
    async persistMutation({ route, request, authContext, bodyText, responsePayload }) {
      const prepared = prepareIdempotentMutation({ route, request, authContext, bodyText, responsePayload });
      if (!prepared.ok) return prepared;

      const existing = idempotencyRecords.get(prepared.recordKey);
      if (existing) return replayOrConflict(existing, prepared.requestHash);

      const routePersistence = persistMemoryRouteMutation({
        repositories: {
          providerConnections,
          importedEvents,
          cardOpportunities,
          relationshipMemories,
          cardProjects,
          renderPackets,
          orders,
          orderEvents,
          consentRecords,
          dataRequests
        },
        route,
        authContext,
        bodyText
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
    async close() {
      return undefined;
    }
  };
}

function createPostgresApiRuntime({ env, routes, postgresPoolFactory }) {
  let poolPromise;

  async function getPool() {
    if (!poolPromise) {
      poolPromise = postgresPoolFactory
        ? Promise.resolve(postgresPoolFactory({ env }))
        : import("pg").then(({ Pool }) => new Pool({
            connectionString: env.DATABASE_URL,
            ssl: env.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : undefined
          }));
    }
    return poolPromise;
  }

  return {
    mode: "postgres",
    describe() {
      return {
        mode: "postgres",
        authEnforced: true,
        idempotencyEnforced: true,
        postgresConfigured: Boolean(env.DATABASE_URL),
        sessionsConfigured: null,
        idempotencyRecords: null,
        auditRecords: null,
        queuedJobs: null,
        providerConnectionRecords: null,
        importedEventRecords: null,
        cardOpportunityRecords: null,
        relationshipMemoryRecords: null,
        cardProjectRecords: null,
        renderPacketRecords: null,
        orderRecords: null,
        orderEventRecords: null,
        consentRecords: null,
        dataRequestRecords: null,
        statefulRoutes: routes.filter((route) => route.audience !== "public").length
      };
    },
    validate() {
      const blockers = [];
      if (!env.DATABASE_URL) blockers.push("Postgres API runtime requires DATABASE_URL.");
      return blockers;
    },
    async authorize(route, request) {
      if (route.audience === "public") {
        return { ok: true, role: "public", userId: "public", sessionId: "public" };
      }
      const token = readBearerToken(request);
      if (!token) return authError(401, "auth-required", route);

      const pool = await getPool();
      const sessionHash = hashSessionToken(token);
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
      if (!session) return authError(401, "invalid-session", route);
      const requiredRole = route.audience === "admin" ? "admin" : "customer";
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

      const pool = await getPool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const existing = await client.query(
          `SELECT request_hash, response_body, status
           FROM idempotency_keys
           WHERE user_id = $1 AND route_id = $2 AND idempotency_key = $3
           FOR UPDATE`,
          [authContext.userId, route.id, prepared.idempotencyKey]
        );
        if (existing.rows[0]) {
          await client.query("COMMIT");
          return replayOrConflict(
            {
              requestHash: existing.rows[0].request_hash,
              responseBody: normalizeJson(existing.rows[0].response_body),
              statusCode: 202
            },
            prepared.requestHash
          );
        }

        const idempotencyId = stableRuntimeId("idem", authContext.userId, route.id, prepared.idempotencyKey);
        const routePersistence = await persistPostgresRouteMutation({
          client,
          route,
          authContext,
          bodyText
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
        const inserted = await client.query(
          `INSERT INTO idempotency_keys
             (id, user_id, route_id, idempotency_key, request_hash, response_body, status, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'completed', NOW() + INTERVAL '24 hours')
           ON CONFLICT DO NOTHING`,
          [idempotencyId, authContext.userId, route.id, prepared.idempotencyKey, prepared.requestHash, JSON.stringify(responseBody)]
        );
        if (inserted.rowCount === 0) {
          const raced = await client.query(
            `SELECT request_hash, response_body, status
             FROM idempotency_keys
             WHERE user_id = $1 AND route_id = $2 AND idempotency_key = $3
             FOR UPDATE`,
            [authContext.userId, route.id, prepared.idempotencyKey]
          );
          await client.query("COMMIT");
          return replayOrConflict(
            {
              requestHash: raced.rows[0]?.request_hash ?? "",
              responseBody: normalizeJson(raced.rows[0]?.response_body ?? {}),
              statusCode: 202
            },
            prepared.requestHash
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
        await client.query("COMMIT");
        return { ok: true, statusCode: 202, payload: responseBody };
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      if (!poolPromise) return;
      const pool = await poolPromise;
      if (typeof pool.end === "function") await pool.end();
    }
  };
}

function addSession(sessions, token, role, userId) {
  if (!token) return;
  sessions.set(hashSessionToken(token), {
    id: stableRuntimeId("session", role, userId),
    role,
    userId
  });
}

function authorizeFromSessions(route, request, sessions) {
  if (route.audience === "public") {
    return { ok: true, role: "public", userId: "public", sessionId: "public" };
  }
  const token = readBearerToken(request);
  if (!token) return authError(401, "auth-required", route);
  const session = sessions.get(hashSessionToken(token));
  if (!session) return authError(401, "invalid-session", route);
  const requiredRole = route.audience === "admin" ? "admin" : "customer";
  if (session.role !== requiredRole) return authError(403, "wrong-role", route);
  return { ok: true, ...session };
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
    requiredFields: [
      "sourceKind",
      "metadataOnlyPayload.title",
      "metadataOnlyPayload.recipientName",
      "metadataOnlyPayload.startsAt"
    ],
    detail:
      "Import preview requires explicit metadata-only event fields or server-parsed raw invite/ICS text before event/opportunity persistence.",
    missingFields(body) {
      return resolveImportPreviewMetadata(body).missingFields;
    }
  },
  "calendar-connection-start": {
    requiredFields: ["calendarChoiceId"],
    detail:
      "Calendar connection start requires an explicit provider choice so the server can return the safe start packet without client-owned provider logic.",
    missingFields(body) {
      const calendarChoiceId = String(body.calendarChoiceId ?? body.choiceId ?? body.providerId ?? "").trim();
      return ["manual-invite-or-ics", "google-calendar-events", "icloud-ics-fallback"].includes(calendarChoiceId)
        ? []
        : ["calendarChoiceId"];
    }
  },
  "retail-printer-operation-start": {
    requiredFields: ["vendorId", "operation"],
    detail:
      "Retail printer operation start requires an explicit vendor and operation so the server can return the safe packet without client-owned provider logic.",
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
    requiredFields: ["evidenceArtifact"],
    detail:
      "Retail printer coupon portal evidence requires a server-validated evidence artifact captured from the same provider portal cart; clients may not choose coupon sources or compute coupon pricing.",
    missingFields(body) {
      return missingRetailPrinterCouponPortalEvidenceFields(body);
    }
  },
  "render-packets": {
    requiredFields: ["projectId"],
    detail: "Render packet creation requires an explicit card project before artifact records can be prepared.",
    missingFields(body) {
      return hasRequiredText(body.projectId) ? [] : ["projectId"];
    }
  },
  "card-projects": {
    requiredFields: ["opportunityId", "recipientName"],
    detail: "Card project creation requires an explicit opportunity and recipient before project records can be prepared.",
    missingFields(body) {
      const missingFields = [];
      if (!hasRequiredText(body.opportunityId)) missingFields.push("opportunityId");
      if (!hasRequiredText(body.recipientName)) missingFields.push("recipientName");
      return missingFields;
    }
  },
  "relationship-memories": {
    requiredFields: ["recipientName", "text", "decision"],
    detail: "Relationship memory review requires explicit recipient, reviewed memory text, and approve/forget decision.",
    missingFields(body) {
      const missingFields = [];
      if (!hasRequiredText(body.recipientName ?? body.recipient)) missingFields.push("recipientName");
      if (!hasRequiredText(body.text ?? body.note)) missingFields.push("text");
      if (!hasExplicitMemoryDecision(body)) missingFields.push("decision");
      return missingFields;
    }
  },
  "manual-vendor-handoff": {
    requiredFields: ["projectId", "renderPacketId", "storeId", "externalShareApproval"],
    detail: "Manual vendor handoff requires explicit project, render packet, selected store, and external-share approval state.",
    missingFields(body) {
      const missingFields = [];
      if (!hasRequiredText(body.projectId ?? body.cardProjectId)) missingFields.push("projectId");
      if (!hasRequiredText(body.renderPacketId)) missingFields.push("renderPacketId");
      if (!hasRequiredText(body.storeId ?? body.vendorId ?? body.selectedVendorId)) missingFields.push("storeId");
      if (!hasExplicitBoolean(body.externalShareApproval ?? body.externalShareApproved ?? body.consentGranted)) {
        missingFields.push("externalShareApproval");
      }
      return missingFields;
    }
  },
  "data-requests": {
    requiredFields: ["requestType", "region", "consentGranted"],
    detail: "Data request intake requires explicit request type, region, and customer confirmation before privacy records can be prepared.",
    missingFields(body) {
      const missingFields = [];
      if (!hasValidDataRequestType(body.requestType ?? body.type)) missingFields.push("requestType");
      if (!hasRequiredText(body.region)) missingFields.push("region");
      if (!hasExplicitBoolean(body.consentGranted ?? body.requestConfirmed)) missingFields.push("consentGranted");
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

function persistMemoryRouteMutation({ repositories, route, authContext, bodyText }) {
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
    repositories.renderPackets.set(record.id, record);
    return {
      persisted: true,
      payload: buildRenderPacketRepositoryPayload(record, "memory")
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

  return undefined;
}

async function persistPostgresRouteMutation({ client, route, authContext, bodyText }) {
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

  if (route.id === "render-packets") {
    const record = buildRenderPacketRecord({ authContext, bodyText });
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
        record.id,
        record.projectId,
        record.kind,
        record.width,
        record.height,
        record.dpi,
        record.locale,
        record.direction,
        record.safeZonePassed,
        record.textOverflow,
        record.checksum,
        record.artifactUri,
        record.storageProvider,
        record.artifactCount,
        JSON.stringify(record.artifactManifest),
        record.signedUrlExpiresAt,
        record.externalShareApprovalRequired
      ]
    );
    return {
      persisted: true,
      payload: buildRenderPacketRepositoryPayload(record, "postgres")
    };
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
    locale,
    requiresRtlLayout: Boolean(body.requiresRtlLayout) || /^(ar|he|fa|ur)(-|$)/i.test(locale),
    approvedMemoryIds
  };
}

function buildCardProjectRepositoryPayload(record, runtimeMode) {
  return {
    projectId: record.projectId,
    opportunityId: record.opportunityId,
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

function buildRenderPacketRepositoryPayload(record, runtimeMode) {
  return {
    renderPacketId: record.id,
    checksum: record.checksum,
    artifactManifest: record.artifactManifest,
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
  if (route.id === "relationship-memories") return ["auth_sessions", "idempotency_keys", "relationship_memories", "audit_log"];
  if (route.id === "render-packets") return ["auth_sessions", "idempotency_keys", "card_projects", "render_packets", "api_jobs", "audit_log"];
  if (route.id === "manual-vendor-handoff") {
    return ["auth_sessions", "idempotency_keys", "render_packets", "orders", "order_events", "consent_records", "api_jobs", "audit_log"];
  }
  if (route.id === "card-projects") return ["auth_sessions", "idempotency_keys", "card_opportunities", "relationship_memories", "card_projects", "audit_log"];
  if (route.id === "import-preview") return ["auth_sessions", "idempotency_keys", "provider_connections", "imported_events", "card_opportunities", "audit_log"];
  if (route.id === "retail-printer-operation-start") return ["auth_sessions", "idempotency_keys", "audit_log"];
  if (route.id === "retail-printer-coupon-portal-evidence") return ["auth_sessions", "idempotency_keys", "audit_log"];
  if (route.id === "admin-demo-reset") {
    return [
      "auth_sessions",
      "idempotency_keys",
      "users",
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
    ];
  }
  if (route.id === "data-requests") return ["auth_sessions", "idempotency_keys", "data_requests", "consent_records", "audit_log"];
  return ["auth_sessions", "idempotency_keys", "audit_log"];
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
