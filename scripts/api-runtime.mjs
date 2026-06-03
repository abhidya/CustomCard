import { createHash } from "node:crypto";

const runtimeModes = new Set(["contract", "memory", "postgres"]);

export function createApiRuntime({ env = process.env, routes = [] } = {}) {
  const requestedMode = env.CUSTOMCARD_API_RUNTIME ?? "contract";
  if (!runtimeModes.has(requestedMode)) return createInvalidApiRuntime({ requestedMode, routes });
  const mode = requestedMode;
  if (mode === "memory") return createMemoryApiRuntime({ env, routes });
  if (mode === "postgres") return createPostgresApiRuntime({ env, routes });
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
    async persistMutation({ route, responsePayload }) {
      return {
        ok: true,
        statusCode: 202,
        payload: {
          ...responsePayload,
          runtimeMode: "contract",
          idempotencyPersisted: false
        }
      };
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

      const payload = decorateMutationPayload({
        route,
        authContext,
        responsePayload,
        runtimeMode: "memory",
        idempotencyKey: prepared.idempotencyKey,
        idempotencyReplayed: false
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
    }
  };
}

function createPostgresApiRuntime({ env, routes }) {
  let poolPromise;

  async function getPool() {
    if (!poolPromise) {
      poolPromise = import("pg").then(({ Pool }) => new Pool({
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
        const responseBody = decorateMutationPayload({
          route,
          authContext,
          responsePayload,
          runtimeMode: "postgres",
          idempotencyKey: prepared.idempotencyKey,
          idempotencyReplayed: false
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

  return {
    ok: true,
    idempotencyKey,
    requestHash: requestHash(route.id, bodyText),
    recordKey: `${authContext.userId}:${route.id}:${idempotencyKey}`
  };
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

function decorateMutationPayload({ route, authContext, responsePayload, runtimeMode, idempotencyKey, idempotencyReplayed }) {
  return {
    ...responsePayload,
    runtimeMode,
    authenticatedUserId: authContext.userId,
    persistedTables: persistedTablesForRoute(route),
    idempotencyKey,
    idempotencyPersisted: true,
    idempotencyReplayed
  };
}

function persistedTablesForRoute(route) {
  if (route.id === "render-packets") return ["auth_sessions", "idempotency_keys", "card_projects", "render_packets", "api_jobs", "audit_log"];
  if (route.id === "manual-vendor-handoff") {
    return ["auth_sessions", "idempotency_keys", "render_packets", "orders", "order_events", "consent_records", "api_jobs", "audit_log"];
  }
  if (route.id === "card-projects") return ["auth_sessions", "idempotency_keys", "card_opportunities", "relationship_memories", "card_projects", "audit_log"];
  if (route.id === "import-preview") return ["auth_sessions", "idempotency_keys", "provider_connections", "imported_events", "card_opportunities", "audit_log"];
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

function normalizeJson(value) {
  return typeof value === "string" ? JSON.parse(value) : value;
}
