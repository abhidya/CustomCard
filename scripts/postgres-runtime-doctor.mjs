import { createApiRuntime, hashSessionToken } from "./api-runtime.mjs";
import { apiRouteContracts as routes } from "../src/apiRouteContractsData.mjs";

const customerToken = "postgres-customer-session-token";
const adminToken = "postgres-admin-session-token";
const fakeDb = createFakePostgresState({ customerToken, adminToken });
const runtime = createApiRuntime({
  env: {
    CUSTOMCARD_API_RUNTIME: "postgres",
    DATABASE_URL: "postgres://contract-only/customcard"
  },
  routes,
  postgresPoolFactory: () => fakeDb.pool
});

const blockers = [];
const checks = [];

await runCheck("runtime validates postgres configuration", async () => {
  expect(runtime.mode === "postgres", "runtime mode should be postgres");
  expect(runtime.validate().length === 0, "postgres runtime should have no validation blockers");
  expect(runtime.describe().postgresConfigured, "postgres runtime should report DATABASE_URL configured");
});

const customerAuth = await runCheck("authorizes customer sessions from auth_sessions", async () => {
  const auth = await runtime.authorize(route("render-packets"), request({ token: customerToken }));
  expect(auth.ok, "customer auth should pass");
  expect(auth.userId === "user-demo", "customer auth should return the user id from auth_sessions");
  return auth;
});

await runCheck("blocks wrong-role sessions before admin routes", async () => {
  const auth = await runtime.authorize(route("admin-readiness"), request({ token: customerToken }));
  expect(!auth.ok, "customer token must not authorize admin route");
  expect(auth.statusCode === 403, "wrong role should return 403");
});

await runCheck("persists idempotent queue-backed mutations", async () => {
  const result = await runtime.persistMutation({
    route: route("render-packets"),
    request: request({ token: customerToken, idempotencyKey: "render-packets-postgres-0001" }),
    authContext: customerAuth,
    bodyText: JSON.stringify({
      projectId: "project-postgres-contract",
      renderPacketId: "render-packet-postgres-contract",
      locale: "ar-AE"
    }),
    responsePayload: {
      service: "customcard-api",
      status: "accepted-contract-only",
      route: "render-packets",
      realOrdersEnabled: false,
      externalNetworkCalls: false
    }
  });

  expect(result.statusCode === 202, "first mutation should be accepted");
  expect(result.payload.runtimeMode === "postgres", "mutation should report postgres runtime");
  expect(result.payload.idempotencyPersisted, "mutation should persist idempotency");
  expect(result.payload.repositoryPersisted, "render-packet mutation should persist through repository path");
  expect(result.payload.renderPacketId === "render-packet-postgres-contract", "render-packet response should include persisted id");
  expect(result.payload.artifactManifest.direction === "rtl", "Arabic render packet should be RTL");
  expect(result.payload.persistedTables.includes("api_jobs"), "queue-backed route should include api_jobs");
  expect(result.payload.persistedTables.includes("provider_call_events"), "render route should include provider_call_events");
  expect(fakeDb.idempotencyRecords.size === 1, "idempotency record should be inserted");
  expect(fakeDb.auditRecords.length === 1, "audit record should be inserted");
  expect(fakeDb.jobs.length === 1, "queue-backed route should insert an api job");
  expect(fakeDb.renderPackets.length === 1, "render_packets row should be inserted");
  expect(fakeDb.providerCallEvents.length === 1, "provider_call_events row should be inserted");
  expect(fakeDb.providerCallEvents[0].liveNetworkCall === false, "provider call ledger must keep live network calls disabled");
});

await runCheck("persists repository-backed import preview mutations", async () => {
  const result = await runtime.persistMutation({
    route: route("import-preview"),
    request: request({ token: customerToken, idempotencyKey: "import-preview-postgres-0001" }),
    authContext: customerAuth,
    bodyText: JSON.stringify({
      sourceKind: "manual-ics",
      connectionId: "connection-postgres-contract",
      eventId: "event-postgres-contract",
      opportunityId: "opportunity-postgres-contract",
      rawImportText: [
        "BEGIN:VCALENDAR",
        "BEGIN:VEVENT",
        "SUMMARY:Anniversary dinner",
        "DTSTART;TZID=America/New_York:20300603T180000",
        "ATTENDEE;CN=Sara:mailto:sara@example.invalid",
        "DESCRIPTION:Private dinner note that must not be returned",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\n")
    }),
    responsePayload: {
      service: "customcard-api",
      status: "accepted-contract-only",
      route: "import-preview",
      realOrdersEnabled: false,
      externalNetworkCalls: false
    }
  });

  expect(result.statusCode === 202, "import-preview mutation should be accepted");
  expect(result.payload.runtimeMode === "postgres", "import-preview mutation should report postgres runtime");
  expect(result.payload.repositoryPersisted, "import-preview mutation should persist through repository path");
  expect(result.payload.rawContentStored === false, "import-preview must keep raw content storage disabled");
  expect(result.payload.importParser.parsedFromRawText, "import-preview should accept server-parsed raw ICS text");
  expect(result.payload.importParser.rawContentStored === false, "raw import parser must not store raw content");
  expect(
    result.payload.importParser.evidenceSummary.includes("DTSTART field present"),
    "raw import parser should expose metadata-only parse evidence"
  );
  expect(result.payload.opportunities[0].opportunityId === "opportunity-postgres-contract", "import-preview should return the persisted opportunity id");
  expect(result.payload.opportunities[0].startsAt === "2030-06-03T18:00:00.000Z", "raw ICS DTSTART should map to start timestamp");
  expect(!JSON.stringify(result.payload).includes("Private dinner note"), "import-preview response must not return raw private DESCRIPTION text");
  expect(fakeDb.providerConnections.length === 1, "provider_connections row should be inserted");
  expect(fakeDb.importedEvents.length === 1, "imported_events row should be inserted");
  expect(fakeDb.cardOpportunities.length === 1, "card_opportunities row should be inserted");
});

await runCheck("blocks import preview mutations with missing metadata", async () => {
  const countsBefore = runtimePersistenceCounts(fakeDb);
  const result = await runtime.persistMutation({
    route: route("import-preview"),
    request: request({ token: customerToken, idempotencyKey: "import-preview-postgres-missing-metadata" }),
    authContext: customerAuth,
    bodyText: JSON.stringify({ sourceKind: "manual-ics" }),
    responsePayload: {
      service: "customcard-api",
      status: "accepted-contract-only",
      route: "import-preview",
      realOrdersEnabled: false,
      externalNetworkCalls: false
    }
  });

  expect(result.statusCode === 400, "missing import-preview metadata should be rejected");
  expect(result.payload.status === "invalid-import-preview-payload", "import-preview rejection status should be explicit");
  expect(result.payload.requiredFields.includes("metadataOnlyPayload.title"), "rejection should list required metadata fields");
  expectRuntimeCountsUnchanged(countsBefore, runtimePersistenceCounts(fakeDb), "rejected import-preview");
});

await runCheck("blocks non-import mutations with missing required fields", async () => {
  const countsBefore = runtimePersistenceCounts(fakeDb);
  const cases = [
    {
      routeId: "customer-draft-state-save",
      idempotencyKey: "draft-state-postgres-missing-fields",
      body: { status: "in-progress" },
      expectedStatus: "invalid-customer-draft-state-save-payload"
    },
    {
      routeId: "render-packets",
      idempotencyKey: "render-packets-postgres-missing-project",
      body: {},
      expectedStatus: "invalid-render-packets-payload"
    },
    {
      routeId: "card-projects",
      idempotencyKey: "card-projects-postgres-missing-recipient",
      body: { opportunityId: "opportunity-postgres-contract" },
      expectedStatus: "invalid-card-projects-payload"
    },
    {
      routeId: "relationship-memories",
      idempotencyKey: "relationship-memories-postgres-missing-fields",
      body: { recipientName: "Sara" },
      expectedStatus: "invalid-relationship-memories-payload"
    },
    {
      routeId: "manual-vendor-handoff",
      idempotencyKey: "manual-vendor-handoff-postgres-missing-fields",
      body: { projectId: "project-postgres-contract" },
      expectedStatus: "invalid-manual-vendor-handoff-payload"
    },
    {
      routeId: "data-requests",
      idempotencyKey: "data-requests-postgres-missing-fields",
      body: { requestType: "delete" },
      expectedStatus: "invalid-data-requests-payload"
    }
  ];

  for (const testCase of cases) {
    const result = await runtime.persistMutation({
      route: route(testCase.routeId),
      request: request({ token: customerToken, idempotencyKey: testCase.idempotencyKey }),
      authContext: customerAuth,
      bodyText: JSON.stringify(testCase.body),
      responsePayload: {
        service: "customcard-api",
        status: "accepted-contract-only",
        route: testCase.routeId,
        realOrdersEnabled: false,
        externalNetworkCalls: false
      }
    });

    expect(result.statusCode === 400, `${testCase.routeId} missing-field mutation should be rejected`);
    expect(result.payload.status === testCase.expectedStatus, `${testCase.routeId} rejection status should be explicit`);
    expect(Array.isArray(result.payload.requiredFields), `${testCase.routeId} rejection should list required fields`);
  }

  expectRuntimeCountsUnchanged(countsBefore, runtimePersistenceCounts(fakeDb), "rejected non-import mutations");
});

await runCheck("persists repository-backed draft state mutations", async () => {
  const result = await runtime.persistMutation({
    route: route("customer-draft-state-save"),
    request: request({ token: customerToken, idempotencyKey: "draft-state-postgres-0001" }),
    authContext: customerAuth,
    bodyText: JSON.stringify({
      draftStateId: "draft-state-postgres-contract",
      status: "in-progress",
      opportunityId: "opportunity-postgres-contract",
      opportunityDecision: "accepted",
      vendorId: "walgreens",
      localeCode: "en-US",
      draftInput: {
        sender: "Maya",
        recipient: "Sara",
        relationship: "Friend",
        occasion: "birthday",
        tone: "warm",
        style: "botanical",
        language: "English",
        personalNote: "Keep it gentle and specific.",
        useMemory: false
      }
    }),
    responsePayload: {
      service: "customcard-api",
      status: "accepted-contract-only",
      route: "customer-draft-state-save",
      realOrdersEnabled: false,
      externalNetworkCalls: false
    }
  });

  expect(result.statusCode === 202, "draft-state mutation should be accepted");
  expect(result.payload.runtimeMode === "postgres", "draft-state mutation should report postgres runtime");
  expect(result.payload.repositoryPersisted, "draft-state mutation should persist through repository path");
  expect(result.payload.draftStateId === "draft-state-postgres-contract", "draft-state response should include persisted id");
  expect(result.payload.repository.browserLocalState === false, "draft-state repository must not use browser storage");
  expect(fakeDb.draftStates.length === 1, "draft_states row should be inserted");

  const read = await runtime.readDraftState({ authContext: customerAuth });
  expect(read.draftState?.draftStateId === "draft-state-postgres-contract", "draft-state read should return latest saved state");
});

await runCheck("persists repository-backed card project mutations", async () => {
  const result = await runtime.persistMutation({
    route: route("card-projects"),
    request: request({ token: customerToken, idempotencyKey: "card-projects-postgres-0001" }),
    authContext: customerAuth,
    bodyText: JSON.stringify({
      projectId: "project-postgres-contract",
      opportunityId: "opportunity-postgres-contract",
      recipientName: "Sara",
      locale: "ar-AE",
      approvedMemoryIds: ["memory-postgres-contract"]
    }),
    responsePayload: {
      service: "customcard-api",
      status: "accepted-contract-only",
      route: "card-projects",
      realOrdersEnabled: false,
      externalNetworkCalls: false
    }
  });

  expect(result.statusCode === 202, "card-project mutation should be accepted");
  expect(result.payload.runtimeMode === "postgres", "card-project mutation should report postgres runtime");
  expect(result.payload.repositoryPersisted, "card-project mutation should persist through repository path");
  expect(result.payload.projectId === "project-postgres-contract", "card-project response should include the persisted project id");
  expect(result.payload.requiresRtlLayout, "Arabic locale should require RTL layout");
  expect(fakeDb.cardProjects.length === 1, "card_projects row should be inserted");
});

await runCheck("persists repository-backed relationship memory mutations", async () => {
  const result = await runtime.persistMutation({
    route: route("relationship-memories"),
    request: request({ token: customerToken, idempotencyKey: "relationship-memories-postgres-0001" }),
    authContext: customerAuth,
    bodyText: JSON.stringify({
      memoryId: "memory-postgres-contract",
      recipientName: "Sara",
      text: "Sara keeps every handwritten note.",
      sensitivity: "normal",
      locale: "en-US",
      decision: "approve"
    }),
    responsePayload: {
      service: "customcard-api",
      status: "accepted-contract-only",
      route: "relationship-memories",
      realOrdersEnabled: false,
      externalNetworkCalls: false
    }
  });

  expect(result.statusCode === 202, "relationship memory mutation should be accepted");
  expect(result.payload.runtimeMode === "postgres", "relationship memory mutation should report postgres runtime");
  expect(result.payload.repositoryPersisted, "relationship memory should persist through repository path");
  expect(result.payload.memoryId === "memory-postgres-contract", "relationship memory response should include persisted id");
  expect(result.payload.memoryUseAllowed, "approved memory should be eligible for reuse");
  expect(fakeDb.relationshipMemories.length === 1, "relationship_memories row should be inserted");
});

await runCheck("persists repository-backed manual vendor handoff mutations", async () => {
  const result = await runtime.persistMutation({
    route: route("manual-vendor-handoff"),
    request: request({ token: customerToken, idempotencyKey: "vendor-handoff-postgres-0001" }),
    authContext: customerAuth,
    bodyText: JSON.stringify({
      projectId: "project-postgres-contract",
      renderPacketId: "render-packet-postgres-contract",
      storeId: "walgreens-store-042",
      region: "US",
      externalShareApproval: true
    }),
    responsePayload: {
      service: "customcard-api",
      status: "accepted-contract-only",
      route: "manual-vendor-handoff",
      realOrdersEnabled: false,
      externalNetworkCalls: false
    }
  });

  expect(result.statusCode === 202, "manual vendor handoff mutation should be accepted");
  expect(result.payload.runtimeMode === "postgres", "manual vendor handoff mutation should report postgres runtime");
  expect(result.payload.repositoryPersisted, "manual vendor handoff should persist through repository path");
  expect(result.payload.handoffStatus === "vendor_handoff_ready", "approved handoff should be marked ready for manual upload");
  expect(result.payload.repository.tables.includes("orders"), "manual handoff repository payload should include orders");
  expect(fakeDb.orders.length === 1, "orders row should be inserted");
  expect(fakeDb.orderEvents.length === 1, "order_events row should be inserted");
  expect(fakeDb.consentRecords.length === 1, "consent_records row should be inserted");
});

await runCheck("persists repository-backed data request mutations", async () => {
  const result = await runtime.persistMutation({
    route: route("data-requests"),
    request: request({ token: customerToken, idempotencyKey: "data-requests-postgres-0001" }),
    authContext: customerAuth,
    bodyText: JSON.stringify({
      requestId: "data-request-postgres-contract",
      requestType: "delete",
      region: "US",
      dueAt: "2030-01-31T00:00:00.000Z",
      requestConfirmed: true
    }),
    responsePayload: {
      service: "customcard-api",
      status: "accepted-contract-only",
      route: "data-requests",
      realOrdersEnabled: false,
      externalNetworkCalls: false
    }
  });

  expect(result.statusCode === 202, "data-request mutation should be accepted");
  expect(result.payload.runtimeMode === "postgres", "data-request mutation should report postgres runtime");
  expect(result.payload.repositoryPersisted, "data-request should persist through repository path");
  expect(result.payload.requestType === "delete", "data-request response should include request type");
  expect(result.payload.privacyControls.deletionRequiresRetentionReview, "delete requests should require retention review");
  expect(fakeDb.dataRequests.length === 1, "data_requests row should be inserted");
  expect(fakeDb.consentRecords.length === 2, "data-request consent row should be inserted");
});

await runCheck("replays matching idempotent mutations", async () => {
  const result = await runtime.persistMutation({
    route: route("render-packets"),
    request: request({ token: customerToken, idempotencyKey: "render-packets-postgres-0001" }),
    authContext: customerAuth,
    bodyText: JSON.stringify({
      projectId: "project-postgres-contract",
      renderPacketId: "render-packet-postgres-contract",
      locale: "ar-AE"
    }),
    responsePayload: { service: "customcard-api", status: "accepted-contract-only", route: "render-packets" }
  });

  expect(result.statusCode === 202, "replay should return accepted status");
  expect(result.payload.idempotencyReplayed, "replay should mark idempotencyReplayed");
  expect(fakeDb.idempotencyRecords.size === 7, "replay must not insert another idempotency record");
  expect(fakeDb.providerCallEvents.length === 1, "replay must not duplicate provider call events");
});

await runCheck("rejects idempotency conflicts", async () => {
  const result = await runtime.persistMutation({
    route: route("render-packets"),
    request: request({ token: customerToken, idempotencyKey: "render-packets-postgres-0001" }),
    authContext: customerAuth,
    bodyText: JSON.stringify({ projectId: "changed-project" }),
    responsePayload: { service: "customcard-api", status: "accepted-contract-only", route: "render-packets" }
  });

  expect(result.statusCode === 409, "changed body with same idempotency key should conflict");
  expect(result.payload.status === "idempotency-conflict", "conflict payload should be explicit");
});

const report = {
  service: "customcard-postgres-runtime-doctor",
  status: blockers.length === 0 ? "ready" : "blocked",
  runtime: runtime.describe(),
  persistence: {
    authSessionQueries: fakeDb.authSessionQueries,
    idempotencyRecords: fakeDb.idempotencyRecords.size,
    auditRecords: fakeDb.auditRecords.length,
    queuedJobs: fakeDb.jobs.length,
    providerConnections: fakeDb.providerConnections.length,
    importedEvents: fakeDb.importedEvents.length,
    cardOpportunities: fakeDb.cardOpportunities.length,
    draftStates: fakeDb.draftStates.length,
    relationshipMemories: fakeDb.relationshipMemories.length,
    cardProjects: fakeDb.cardProjects.length,
    renderPackets: fakeDb.renderPackets.length,
    providerCallEvents: fakeDb.providerCallEvents.length,
    orders: fakeDb.orders.length,
    orderEvents: fakeDb.orderEvents.length,
    consentRecords: fakeDb.consentRecords.length,
    dataRequests: fakeDb.dataRequests.length
  },
  checks,
  blockers
};

console.log(JSON.stringify(report, null, 2));
if (blockers.length > 0) process.exit(1);

async function runCheck(id, fn) {
  try {
    const value = await fn();
    checks.push({ id, passed: true });
    return value;
  } catch (error) {
    blockers.push({
      id,
      detail: error instanceof Error ? error.message : String(error)
    });
    checks.push({ id, passed: false });
    return undefined;
  }
}

function route(id) {
  const found = routes.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Missing route in postgres runtime doctor: ${id}`);
  return found;
}

function request({ token, idempotencyKey }) {
  return {
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {})
    }
  };
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function runtimePersistenceCounts(state) {
  return {
    idempotencyRecords: state.idempotencyRecords.size,
    auditRecords: state.auditRecords.length,
    queuedJobs: state.jobs.length,
    providerConnections: state.providerConnections.length,
    importedEvents: state.importedEvents.length,
    cardOpportunities: state.cardOpportunities.length,
    draftStates: state.draftStates.length,
    relationshipMemories: state.relationshipMemories.length,
    cardProjects: state.cardProjects.length,
    renderPackets: state.renderPackets.length,
    providerCallEvents: state.providerCallEvents.length,
    orders: state.orders.length,
    orderEvents: state.orderEvents.length,
    consentRecords: state.consentRecords.length,
    dataRequests: state.dataRequests.length
  };
}

function expectRuntimeCountsUnchanged(before, after, label) {
  for (const [key, beforeValue] of Object.entries(before)) {
    expect(after[key] === beforeValue, `${label} must not change ${key}`);
  }
}

function createFakePostgresState({ customerToken, adminToken }) {
  const sessions = new Map([
    [
      hashSessionToken(customerToken),
      {
        session_id: "session-user-demo",
        user_id: "user-demo",
        role: "customer",
        email: "customer@example.test"
      }
    ],
    [
      hashSessionToken(adminToken),
      {
        session_id: "session-admin-demo",
        user_id: "admin-demo",
        role: "admin",
        email: "admin@example.test"
      }
    ]
  ]);
  const state = {
    sessions,
    idempotencyRecords: new Map(),
    auditRecords: [],
    jobs: [],
    providerConnections: [],
    importedEvents: [],
    cardOpportunities: [],
    draftStates: [],
    relationshipMemories: [],
    cardProjects: [],
    renderPackets: [],
    providerCallEvents: [],
    orders: [],
    orderEvents: [],
    consentRecords: [],
    dataRequests: [],
    authSessionQueries: 0,
    pool: undefined
  };

  state.pool = {
    async query(sql, params) {
      if (sql.includes("FROM auth_sessions")) {
        state.authSessionQueries += 1;
        return { rows: state.sessions.has(params[0]) ? [state.sessions.get(params[0])] : [] };
      }
      if (sql.includes("FROM draft_states")) {
        const userDrafts = state.draftStates.filter((draft) => draft.userId === params[0]);
        const latest = userDrafts[userDrafts.length - 1];
        return {
          rows: latest
            ? [{
                id: latest.id,
                status: latest.status,
                draft_input: latest.draftInput,
                opportunity_id: latest.opportunityId,
                opportunity_decision: latest.opportunityDecision,
                vendor_id: latest.vendorId,
                locale: latest.locale,
                updated_at: latest.updatedAtIso
              }]
            : []
        };
      }
      throw new Error(`Unexpected pool query: ${compactSql(sql)}`);
    },
    async connect() {
      return createFakeClient(state);
    }
  };

  return state;
}

function createFakeClient(state) {
  return {
    async query(sql, params = []) {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return { rows: [], rowCount: 0 };

      if (sql.includes("FROM idempotency_keys")) {
        const record = state.idempotencyRecords.get(idempotencyRecordKey(params[0], params[1], params[2]));
        return {
          rows: record ? [{ request_hash: record.requestHash, response_body: record.responseBody, status: record.status }] : [],
          rowCount: record ? 1 : 0
        };
      }

      if (sql.includes("INSERT INTO idempotency_keys")) {
        const key = idempotencyRecordKey(params[1], params[2], params[3]);
        if (state.idempotencyRecords.has(key)) return { rows: [], rowCount: 0 };
        state.idempotencyRecords.set(key, {
          id: params[0],
          userId: params[1],
          routeId: params[2],
          idempotencyKey: params[3],
          requestHash: params[4],
          responseBody: JSON.parse(params[5]),
          status: "completed"
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO audit_log")) {
        state.auditRecords.push({ routeId: params[0], actorId: params[1], metadata: JSON.parse(params[2]) });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO provider_connections")) {
        state.providerConnections.push({
          id: params[0],
          userId: params[1],
          provider: params[2],
          scopes: params[3],
          adapterVersion: params[4],
          metadataSchema: JSON.parse(params[5])
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO imported_events")) {
        state.importedEvents.push({
          id: params[0],
          connectionId: params[1],
          title: params[2],
          startsAt: params[3],
          timezone: params[4],
          sourceEvidence: params[5],
          recipientHint: params[6]
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO card_opportunities")) {
        state.cardOpportunities.push({
          id: params[0],
          eventId: params[1],
          recipientName: params[2],
          leadTimeHours: params[3],
          confidence: params[4],
          decision: params[5],
          evidence: JSON.parse(params[6])
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO draft_states")) {
        state.draftStates.push({
          id: params[0],
          userId: params[1],
          status: params[2],
          draftInput: JSON.parse(params[3]),
          opportunityId: params[4],
          opportunityDecision: params[5],
          vendorId: params[6],
          locale: params[7],
          updatedAtIso: params[8]
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO card_projects")) {
        state.cardProjects.push({
          id: params[0],
          opportunityId: params[1],
          recipientName: params[2],
          locale: params[3],
          requiresRtlLayout: params[4],
          approvedMemoryIds: params[5]
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO relationship_memories")) {
        state.relationshipMemories.push({
          id: params[0],
          userId: params[1],
          recipientName: params[2],
          approved: params[3],
          sensitivity: params[4],
          locale: params[5],
          source: params[6],
          text: params[7],
          forgottenAt: params[8]
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO render_packets")) {
        state.renderPackets.push({
          id: params[0],
          projectId: params[1],
          kind: params[2],
          width: params[3],
          height: params[4],
          dpi: params[5],
          locale: params[6],
          direction: params[7],
          safeZonePassed: params[8],
          textOverflow: params[9],
          checksum: params[10],
          artifactUri: params[11],
          storageProvider: params[12],
          artifactCount: params[13],
          artifactManifest: JSON.parse(params[14]),
          signedUrlExpiresAt: params[15],
          externalShareApprovalRequired: params[16]
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO provider_call_events")) {
        state.providerCallEvents.push({
          id: params[0],
          tenantId: params[1],
          userId: params[2],
          routeId: params[3],
          idempotencyId: params[4],
          adapterId: params[5],
          provider: params[6],
          capability: params[7],
          metadata: JSON.parse(params[8]),
          liveNetworkCall: false
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO orders")) {
        state.orders.push({
          id: params[0],
          projectId: params[1],
          status: params[2],
          storeId: params[3],
          quoteCents: params[4],
          pickupWindowMinutes: params[5],
          recoveryActions: JSON.parse(params[6])
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO order_events")) {
        state.orderEvents.push({
          orderId: params[0],
          eventType: params[1],
          payload: JSON.parse(params[2])
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO data_requests")) {
        state.dataRequests.push({
          id: params[0],
          userId: params[1],
          requestType: params[2],
          status: params[3],
          dueAt: params[4]
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO consent_records")) {
        state.consentRecords.push({
          id: params[0],
          userId: params[1],
          action: params[2],
          region: params[3],
          granted: params[4],
          controls: JSON.parse(params[5])
        });
        return { rows: [], rowCount: 1 };
      }

      if (sql.includes("INSERT INTO api_jobs")) {
        state.jobs.push({
          id: params[0],
          userId: params[1],
          routeId: params[2],
          idempotencyId: params[3],
          payload: JSON.parse(params[4])
        });
        return { rows: [], rowCount: 1 };
      }

      throw new Error(`Unexpected client query: ${compactSql(sql)}`);
    },
    release() {
      return undefined;
    }
  };
}

function idempotencyRecordKey(userId, routeId, idempotencyKey) {
  return `${userId}:${routeId}:${idempotencyKey}`;
}

function compactSql(sql) {
  return sql.replace(/\s+/g, " ").trim();
}
