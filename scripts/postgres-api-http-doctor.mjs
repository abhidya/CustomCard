import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import pg from "pg";
import { hashSessionToken } from "./api-runtime.mjs";

const requiredGate = "enabled";
const guardValue = process.env.CUSTOMCARD_POSTGRES_API_HTTP_DOCTOR;
const databaseUrl = process.env.DATABASE_URL;

if (guardValue !== requiredGate) {
  console.error("Set CUSTOMCARD_POSTGRES_API_HTTP_DOCTOR=enabled to run the Postgres API HTTP doctor.");
  process.exit(1);
}

if (!databaseUrl) {
  console.error("DATABASE_URL is required for the Postgres API HTTP doctor.");
  process.exit(1);
}

const host = "127.0.0.1";
const customerToken = "live-postgres-http-customer-session-token";
const adminToken = "live-postgres-http-admin-session-token";
const repositoryBackedCustomerRouteIds = [
  "import-preview",
  "relationship-memories",
  "card-projects",
  "render-packets",
  "manual-vendor-handoff",
  "data-requests"
];
const routePaths = {
  "import-preview": "/api/import-preview",
  "relationship-memories": "/api/memories/review",
  "card-projects": "/api/card-projects",
  "render-packets": "/api/render-packets",
  "manual-vendor-handoff": "/api/vendor-handoff/manual",
  "data-requests": "/api/data-requests"
};
const mutationCases = [
  {
    id: "import-preview",
    checkId: "persists Postgres HTTP import-preview mutation",
    idempotencyKey: "http-import-preview-live-postgres-0001",
    body: {
      sourceKind: "manual-ics",
      connectionId: "connection-live-postgres-http",
      eventId: "event-live-postgres-http",
      opportunityId: "opportunity-live-postgres-http",
      metadataOnlyPayload: {
        title: "Anniversary dinner",
        recipientName: "Sara",
        startsAt: "2030-06-03T18:00:00.000Z",
        timezone: "America/New_York",
        confidence: 0.96,
        leadTimeHours: 240
      }
    },
    expected: {
      rawContentStored: false,
      opportunities: [
        {
          opportunityId: "opportunity-live-postgres-http",
          eventId: "event-live-postgres-http",
          recipientName: "Sara",
          title: "Anniversary dinner",
          decision: "generate"
        }
      ],
      repository: {
        tables: ["provider_connections", "imported_events", "card_opportunities"],
        runtimeMode: "postgres",
        persisted: true,
        rawContentStored: false
      }
    }
  },
  {
    id: "relationship-memories",
    checkId: "persists Postgres HTTP relationship-memories mutation",
    idempotencyKey: "http-relationship-memory-live-pg-0001",
    body: {
      memoryId: "memory-live-postgres-http",
      recipientName: "Sara",
      text: "Sara prefers quiet dinners.",
      sensitivity: "normal",
      locale: "en-US",
      decision: "approve"
    },
    expected: {
      memoryId: "memory-live-postgres-http",
      recipientName: "Sara",
      approved: true,
      forgottenAt: null,
      memoryUseAllowed: true,
      repository: {
        table: "relationship_memories",
        runtimeMode: "postgres",
        persisted: true,
        rawContentStored: false
      }
    }
  },
  {
    id: "card-projects",
    checkId: "persists Postgres HTTP card-projects mutation",
    idempotencyKey: "http-card-projects-live-postgres-0001",
    body: {
      projectId: "project-live-postgres-http",
      opportunityId: "opportunity-live-postgres-http",
      recipientName: "Sara",
      locale: "ar-AE",
      approvedMemoryIds: ["memory-live-postgres-http"]
    },
    expected: {
      projectId: "project-live-postgres-http",
      opportunityId: "opportunity-live-postgres-http",
      renderStatus: "ready-for-render",
      requiresRtlLayout: true,
      approvedMemoryIds: ["memory-live-postgres-http"],
      repository: {
        table: "card_projects",
        runtimeMode: "postgres",
        persisted: true
      }
    }
  },
  {
    id: "render-packets",
    checkId: "persists Postgres HTTP render-packets mutation",
    idempotencyKey: "http-render-packets-live-postgres-0001",
    body: {
      projectId: "project-live-postgres-http",
      renderPacketId: "render-packet-live-postgres-http",
      locale: "ar-AE",
      storageProvider: "filesystem"
    },
    expected: {
      renderPacketId: "render-packet-live-postgres-http",
      repository: {
        table: "render_packets",
        runtimeMode: "postgres",
        persisted: true,
        signedArtifactUrls: true,
        realOrdersEnabled: false
      },
      artifactManifest: {
        artifactCount: 6,
        externalShareApprovalRequired: true,
        realOrdersEnabled: false,
        direction: "rtl"
      }
    }
  },
  {
    id: "manual-vendor-handoff",
    checkId: "persists Postgres HTTP manual-vendor-handoff mutation",
    idempotencyKey: "http-vendor-handoff-live-pg-0001",
    body: {
      projectId: "project-live-postgres-http",
      renderPacketId: "render-packet-live-postgres-http",
      storeId: "walgreens-store-042",
      region: "US",
      externalShareApproval: true
    },
    expected: {
      projectId: "project-live-postgres-http",
      renderPacketId: "render-packet-live-postgres-http",
      handoffStatus: "vendor_handoff_ready",
      externalShareApproval: true,
      repository: {
        tables: ["orders", "order_events", "consent_records"],
        runtimeMode: "postgres",
        persisted: true,
        liveQuote: false,
        realOrdersEnabled: false
      }
    }
  },
  {
    id: "data-requests",
    checkId: "persists Postgres HTTP data-requests mutation",
    idempotencyKey: "http-data-requests-live-postgres-0001",
    body: {
      requestId: "data-request-live-postgres-http",
      requestType: "delete",
      region: "US",
      dueAt: "2030-01-31T00:00:00.000Z",
      requestConfirmed: true
    },
    expected: {
      dataRequestId: "data-request-live-postgres-http",
      requestType: "delete",
      requestStatus: "pending_verification",
      consentGranted: true,
      privacyControls: {
        region: "US",
        rawContentStored: false,
        verificationRequired: true,
        deletionRequiresRetentionReview: true
      },
      repository: {
        tables: ["data_requests", "consent_records"],
        runtimeMode: "postgres",
        persisted: true,
        rawContentStored: false
      }
    }
  }
];

const doctorDatabase = `customcard_api_http_${process.pid}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, "_");
const adminUrl = databaseUrl;
const doctorUrl = buildDatabaseUrl(databaseUrl, doctorDatabase);
const adminPool = new pg.Pool(poolConfig(adminUrl));
const checks = [];
const blockers = [];
const cleanupWarnings = [];
const verifiedCustomerRouteIds = new Set();
const verifiedAdminRouteIds = new Set();
let wrongRoleBlocked = false;
let missingAuthBlocked = false;
let missingIdempotencyBlocked = false;
let finalRuntime = { mode: "postgres", authEnforced: true, idempotencyEnforced: true, postgresConfigured: Boolean(databaseUrl) };
let finalServer = { host, port: null, routeCount: 0, runtimeMode: "postgres" };
let finalPersistence = emptyPersistenceCounts();
let exitCode = 0;
let doctorPool;
let server;
let serverStdout = "";
let serverStderr = "";

try {
  await runCheck("connects to configured Postgres database", async () => {
    await waitForPostgres(adminPool);
  });

  await runCheck("creates isolated API HTTP doctor database", async () => {
    await retryOperation(() => adminPool.query(`CREATE DATABASE ${quoteIdentifier(doctorDatabase)}`));
  });

  doctorPool = new pg.Pool(poolConfig(doctorUrl));

  await runCheck("connects to isolated API HTTP doctor database", async () => {
    await waitForPostgres(doctorPool);
  });

  await runCheck("applies initial migration to API HTTP doctor database", async () => {
    const migrationSql = await readFile("infra/migrations/001_initial_schema.sql", "utf8");
    await doctorPool.query(migrationSql);
    const tables = await doctorPool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    );
    const tableNames = new Set(tables.rows.map((row) => row.table_name));
    for (const requiredTable of ["users", "auth_sessions", "provider_connections", "imported_events", "card_opportunities", "relationship_memories", "card_projects", "render_packets", "orders", "order_events", "consent_records", "data_requests", "idempotency_keys", "api_jobs", "audit_log"]) {
      expect(tableNames.has(requiredTable), `Migration did not create ${requiredTable}.`);
    }
  });

  await runCheck("seeds customer and admin HTTP auth sessions", async () => {
    await doctorPool.query(
      `INSERT INTO users (id, email, locale, region, platform)
       VALUES
         ('user-demo', 'customer@example.test', 'en-US', 'US', 'web'),
         ('admin-demo', 'admin@example.test', 'en-US', 'US', 'web')`
    );
    await doctorPool.query(
      `INSERT INTO auth_sessions (id, user_id, session_hash, role, expires_at)
       VALUES
         ('session-user-demo', 'user-demo', $1, 'customer', NOW() + INTERVAL '1 hour'),
         ('session-admin-demo', 'admin-demo', $2, 'admin', NOW() + INTERVAL '1 hour')`,
      [hashSessionToken(customerToken), hashSessionToken(adminToken)]
    );
  });

  finalServer = {
    ...finalServer,
    port: await findOpenPort()
  };
  server = spawn("node", ["scripts/api-server.mjs"], {
    env: {
      ...process.env,
      CUSTOMCARD_API_RUNTIME: "postgres",
      DATABASE_URL: doctorUrl,
      HOST: host,
      PORT: String(finalServer.port)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  server.stdout.on("data", (chunk) => {
    serverStdout = trimOutput(`${serverStdout}${chunk}`);
  });
  server.stderr.on("data", (chunk) => {
    serverStderr = trimOutput(`${serverStderr}${chunk}`);
  });

  await runCheck("starts Postgres API HTTP server", async () => {
    await waitForApi();
  });

  await runCheck("serves public Postgres health and route catalog over HTTP", async () => {
    const health = await fetchJson("/api/health");
    expect(health.payload.status === "ready", "Health status should be ready.");
    expect(health.payload.runtime.mode === "postgres", "Health should report postgres runtime.");
    expect(health.payload.runtime.authEnforced === true, "Health should report enforced auth.");

    const catalog = await fetchJson("/api/routes");
    expect(Array.isArray(catalog.payload), "Route catalog should be an array.");
    expect(catalog.payload.length === 14, "Route catalog should expose 14 routes.");
    finalServer = {
      ...finalServer,
      routeCount: catalog.payload.length,
      runtimeMode: health.payload.runtime.mode
    };
    finalRuntime = health.payload.runtime;
  });

  await runCheck("enforces Postgres HTTP auth on admin and customer routes", async () => {
    const unauthenticatedAdmin = await fetchJson("/api/admin/readiness", { expectedStatus: 401 });
    expect(unauthenticatedAdmin.payload.status === "auth-required", "Missing admin auth should be explicit.");
    missingAuthBlocked = true;

    const wrongRole = await fetchJson("/api/admin/readiness", {
      headers: bearer(customerToken),
      expectedStatus: 403
    });
    expect(wrongRole.payload.status === "wrong-role", "Customer token should be wrong role for admin readiness.");
    wrongRoleBlocked = true;

    const adminReadiness = await fetchJson("/api/admin/readiness", { headers: bearer(adminToken) });
    expect(adminReadiness.payload.runtime.mode === "postgres", "Admin readiness should use postgres runtime.");
    expect(adminReadiness.payload.runtime.authEnforced === true, "Admin readiness should enforce auth.");
    verifiedAdminRouteIds.add("admin-readiness");
    finalRuntime = adminReadiness.payload.runtime;

    const unauthenticatedCustomer = await fetchJson("/api/customer/bootstrap", { expectedStatus: 401 });
    expect(unauthenticatedCustomer.payload.status === "auth-required", "Missing customer auth should be explicit.");

    const customerBootstrap = await fetchJson("/api/customer/bootstrap", { headers: bearer(customerToken) });
    expect(customerBootstrap.payload.runtime.mode === "postgres", "Customer bootstrap should use postgres runtime.");
    expect(customerBootstrap.payload.printerPricing.liveQuote === false, "Customer pricing bootstrap must remain review-only.");
  });

  await runCheck("blocks missing HTTP idempotency key before repository mutation", async () => {
    const missingIdempotency = await postJson("/api/render-packets", { projectId: "project-live-postgres-http" }, {
      headers: bearer(customerToken),
      expectedStatus: 400
    });
    expect(missingIdempotency.payload.status === "idempotency-key-required", "Missing idempotency should be explicit.");
    missingIdempotencyBlocked = true;
  });

  for (const mutationCase of mutationCases) {
    await runCheck(mutationCase.checkId, async () => {
      const result = await postJson(routePaths[mutationCase.id], mutationCase.body, {
        headers: {
          ...bearer(customerToken),
          "X-Idempotency-Key": mutationCase.idempotencyKey
        }
      });
      expect(result.payload.runtimeMode === "postgres", `${mutationCase.id} should use postgres runtime.`);
      expect(result.payload.authenticatedUserId === "user-demo", `${mutationCase.id} should use the seeded customer session.`);
      expect(result.payload.idempotencyPersisted === true, `${mutationCase.id} should persist idempotency.`);
      expect(result.payload.idempotencyReplayed === false, `${mutationCase.id} should not be a replay on first request.`);
      expect(result.payload.repositoryPersisted === true, `${mutationCase.id} should persist through a repository path.`);
      expect(result.payload.realOrdersEnabled === false, `${mutationCase.id} must keep real orders disabled.`);
      expect(result.payload.externalNetworkCalls === false, `${mutationCase.id} must keep external calls disabled.`);
      expectMatches(result.payload, mutationCase.expected, mutationCase.id);
      verifiedCustomerRouteIds.add(mutationCase.id);
    });
  }

  await runCheck("replays and conflicts Postgres HTTP idempotency", async () => {
    const renderCase = mutationCases.find((candidate) => candidate.id === "render-packets");
    const replay = await postJson(routePaths["render-packets"], renderCase.body, {
      headers: {
        ...bearer(customerToken),
        "X-Idempotency-Key": renderCase.idempotencyKey
      }
    });
    expect(replay.payload.idempotencyReplayed === true, "HTTP replay should be marked.");
    expect(replay.payload.runtimeMode === "postgres", "HTTP replay should return stored postgres response.");

    const conflict = await postJson(routePaths["render-packets"], { projectId: "changed-live-postgres-http" }, {
      headers: {
        ...bearer(customerToken),
        "X-Idempotency-Key": renderCase.idempotencyKey
      },
      expectedStatus: 409
    });
    expect(conflict.payload.status === "idempotency-conflict", "Changed HTTP body should conflict.");
  });

  finalPersistence = await readPersistenceCounts(doctorPool);
  await runCheck("records Postgres HTTP audit, idempotency, queue, and repository rows", async () => {
    expect(finalPersistence.idempotencyRecords === 6, "Expected six idempotency records.");
    expect(finalPersistence.auditRecords === 6, "Expected six audit records.");
    expect(finalPersistence.queuedJobs === 2, "Expected two queued jobs.");
    expect(finalPersistence.providerConnections === 1, "Expected one provider connection.");
    expect(finalPersistence.importedEvents === 1, "Expected one imported event.");
    expect(finalPersistence.cardOpportunities === 1, "Expected one card opportunity.");
    expect(finalPersistence.relationshipMemories === 1, "Expected one relationship memory.");
    expect(finalPersistence.cardProjects === 1, "Expected one card project.");
    expect(finalPersistence.renderPackets === 1, "Expected one render packet.");
    expect(finalPersistence.orders === 1, "Expected one manual handoff order.");
    expect(finalPersistence.orderEvents === 1, "Expected one manual handoff order event.");
    expect(finalPersistence.consentRecords === 2, "Expected two consent records.");
    expect(finalPersistence.dataRequests === 1, "Expected one data request.");
  });
} catch (error) {
  exitCode = 1;
  blockers.push({ id: "postgres-api-http-doctor", detail: error instanceof Error ? error.message : String(error) });
} finally {
  if (server) await stopServer(server).catch((error) => {
    exitCode = 1;
    blockers.push({ id: "stop-api-http-server", detail: error instanceof Error ? error.message : String(error) });
  });
  if (doctorPool) await doctorPool.end().catch(() => undefined);
  await dropDoctorDatabase(adminPool, doctorDatabase).catch((error) => {
    cleanupWarnings.push({ id: "drop-api-http-database", detail: error instanceof Error ? error.message : String(error) });
  });
  await adminPool.end().catch(() => undefined);
  printReport(exitCode === 0 ? "ready" : "blocked");
  if (exitCode !== 0) process.exit(exitCode);
}

async function fetchJson(path, { method = "GET", headers = {}, body, expectedStatus = 200 } = {}) {
  const response = await fetch(`http://${host}:${finalServer.port}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => undefined);
  expect(response.status === expectedStatus, `${method} ${path} expected ${expectedStatus} but got ${response.status}: ${JSON.stringify(payload)}`);
  return { status: response.status, payload };
}

function postJson(path, body, options = {}) {
  return fetchJson(path, { expectedStatus: 202, ...options, method: "POST", body });
}

async function waitForApi() {
  let lastError;
  for (let attempt = 1; attempt <= 90; attempt += 1) {
    if (server.exitCode !== null || server.signalCode !== null) {
      throw new Error(`API server exited before readiness with code ${server.exitCode ?? server.signalCode}. stdout: ${serverStdout} stderr: ${serverStderr}`);
    }
    try {
      const response = await fetch(`http://${host}:${finalServer.port}/api/health`, {
        signal: AbortSignal.timeout(500)
      });
      if (response.status === 200) return;
      lastError = new Error(`Health returned ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await delay(200);
  }
  throw new Error(`API server did not become ready. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}. stdout: ${serverStdout} stderr: ${serverStderr}`);
}

async function readPersistenceCounts(pool) {
  const [idempotency, audit, jobs, providerConnections, importedEvents, cardOpportunities, relationshipMemories, cardProjects, renderPackets, orders, orderEvents, consentRecords, dataRequests] = await Promise.all([
    pool.query("SELECT COUNT(*)::int AS count FROM idempotency_keys"),
    pool.query("SELECT COUNT(*)::int AS count FROM audit_log"),
    pool.query("SELECT COUNT(*)::int AS count FROM api_jobs"),
    pool.query("SELECT COUNT(*)::int AS count FROM provider_connections"),
    pool.query("SELECT COUNT(*)::int AS count FROM imported_events"),
    pool.query("SELECT COUNT(*)::int AS count FROM card_opportunities"),
    pool.query("SELECT COUNT(*)::int AS count FROM relationship_memories"),
    pool.query("SELECT COUNT(*)::int AS count FROM card_projects"),
    pool.query("SELECT COUNT(*)::int AS count FROM render_packets"),
    pool.query("SELECT COUNT(*)::int AS count FROM orders"),
    pool.query("SELECT COUNT(*)::int AS count FROM order_events"),
    pool.query("SELECT COUNT(*)::int AS count FROM consent_records"),
    pool.query("SELECT COUNT(*)::int AS count FROM data_requests")
  ]);
  return {
    idempotencyRecords: idempotency.rows[0].count,
    auditRecords: audit.rows[0].count,
    queuedJobs: jobs.rows[0].count,
    providerConnections: providerConnections.rows[0].count,
    importedEvents: importedEvents.rows[0].count,
    cardOpportunities: cardOpportunities.rows[0].count,
    relationshipMemories: relationshipMemories.rows[0].count,
    cardProjects: cardProjects.rows[0].count,
    renderPackets: renderPackets.rows[0].count,
    orders: orders.rows[0].count,
    orderEvents: orderEvents.rows[0].count,
    consentRecords: consentRecords.rows[0].count,
    dataRequests: dataRequests.rows[0].count
  };
}

async function dropDoctorDatabase(pool, databaseName) {
  await pool.query(
    `SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
     WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [databaseName]
  );
  await pool.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`);
}

async function retryOperation(operation) {
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      await delay(Math.min(1000, attempt * 150));
    }
  }
  throw lastError;
}

async function waitForPostgres(pool) {
  let lastError;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      lastError = error;
      await delay(Math.min(1000, attempt * 100));
    }
  }
  throw lastError;
}

function findOpenPort() {
  return new Promise((resolve, reject) => {
    const listener = createServer();
    listener.once("error", reject);
    listener.listen(0, host, () => {
      const address = listener.address();
      const port = typeof address === "object" && address ? address.port : 0;
      listener.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

function stopServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  child.kill("SIGTERM");
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 5000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printReport(status) {
  console.log(
    JSON.stringify(
      {
        service: "customcard-postgres-api-http-doctor",
        status: blockers.length === 0 ? status : "blocked",
        database: {
          isolatedDatabase: doctorDatabase,
          migrationApplied: checks.some((check) => check.id === "applies initial migration to API HTTP doctor database" && check.passed)
        },
        server: finalServer,
        runtime: finalRuntime,
        authVerification: buildAuthVerificationReport(),
        persistence: finalPersistence,
        checks,
        blockers,
        cleanupWarnings
      },
      null,
      2
    )
  );
}

async function runCheck(id, fn) {
  try {
    const value = await fn();
    checks.push({ id, passed: true });
    return value;
  } catch (error) {
    blockers.push({ id, detail: error instanceof Error ? error.message : String(error) });
    checks.push({ id, passed: false });
    throw error;
  }
}

function buildAuthVerificationReport() {
  const customerRouteIds = [...verifiedCustomerRouteIds].sort();
  const adminRouteIds = [...verifiedAdminRouteIds].sort();
  return {
    authSessionTable: true,
    customerHttpRoutes: customerRouteIds.length,
    expectedCustomerHttpRoutes: repositoryBackedCustomerRouteIds.length,
    customerHttpRouteIds: customerRouteIds,
    adminRoutes: adminRouteIds.length,
    adminRouteIds,
    wrongRoleBlocked,
    missingAuthBlocked,
    missingIdempotencyBlocked
  };
}

function expectMatches(actual, expected, path) {
  for (const [key, value] of Object.entries(expected)) {
    const nextPath = `${path}.${key}`;
    if (Array.isArray(value)) {
      expect(Array.isArray(actual[key]), `${nextPath} should be an array.`);
      expect(actual[key].length === value.length, `${nextPath} length mismatch.`);
      for (let index = 0; index < value.length; index += 1) {
        expectMatches(actual[key][index], value[index], `${nextPath}[${index}]`);
      }
      continue;
    }
    if (value && typeof value === "object") {
      expect(actual[key] && typeof actual[key] === "object", `${nextPath} should be an object.`);
      expectMatches(actual[key], value, nextPath);
      continue;
    }
    expect(actual[key] === value, `${nextPath} expected ${JSON.stringify(value)} but got ${JSON.stringify(actual[key])}.`);
  }
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function emptyPersistenceCounts() {
  return {
    idempotencyRecords: 0,
    auditRecords: 0,
    queuedJobs: 0,
    providerConnections: 0,
    importedEvents: 0,
    cardOpportunities: 0,
    relationshipMemories: 0,
    cardProjects: 0,
    renderPackets: 0,
    orders: 0,
    orderEvents: 0,
    consentRecords: 0,
    dataRequests: 0
  };
}

function trimOutput(output) {
  return output.slice(-4000);
}

function poolConfig(connectionString) {
  return {
    connectionString,
    ssl: process.env.DATABASE_SSL === "require" ? { rejectUnauthorized: true } : undefined
  };
}

function buildDatabaseUrl(connectionString, databaseName) {
  const url = new URL(connectionString);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}
