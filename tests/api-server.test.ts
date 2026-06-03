import { execFileSync, spawn, spawnSync, type ChildProcess } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("api server wrapper", () => {
  it("passes its doctor contract", () => {
    const output = execFileSync("node", ["scripts/api-server.mjs", "--doctor"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(output) as {
      service: string;
      status: string;
      readiness: {
        providers: { total: number };
        routes: { total: number; mutations: number; idempotentMutations: number };
        persistence: { tables: number; authSessionTable: boolean; idempotencyTable: boolean };
        runtime: { mode: string; authEnforced: boolean; idempotencyEnforced: boolean };
      };
      blockers: string[];
    };

    expect(report.service).toBe("customcard-api-doctor");
    expect(report.status).toBe("ready");
    expect(report.blockers).toEqual([]);
    expect(report.readiness.providers.total).toBeGreaterThanOrEqual(43);
    expect(report.readiness.routes.total).toBe(12);
    expect(report.readiness.routes.mutations).toBe(report.readiness.routes.idempotentMutations);
    expect(report.readiness.persistence).toMatchObject({
      tables: 16,
      authSessionTable: true,
      idempotencyTable: true
    });
    expect(report.readiness.runtime).toMatchObject({
      mode: "contract",
      authEnforced: false,
      idempotencyEnforced: false
    });
  });

  it("blocks unsupported API runtime modes in doctor output", () => {
    const result = spawnSync("node", ["scripts/api-server.mjs", "--doctor"], {
      encoding: "utf8",
      env: { ...process.env, CUSTOMCARD_API_RUNTIME: "surprise-runtime" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    const report = JSON.parse(result.stdout) as {
      status: string;
      readiness: { runtime: { mode: string; requestedMode: string } };
      blockers: string[];
    };

    expect(result.status).toBe(1);
    expect(report.status).toBe("blocked");
    expect(report.readiness.runtime).toMatchObject({
      mode: "invalid",
      requestedMode: "surprise-runtime"
    });
    expect(report.blockers).toContain("Unsupported CUSTOMCARD_API_RUNTIME: surprise-runtime. Expected contract, memory, or postgres.");
  });

  it("serves API readiness, bootstrap, and contract-only mutation responses", async () => {
    const port = 6100 + Math.floor(Math.random() * 1000);
    const server = spawn("node", ["scripts/api-server.mjs"], {
      env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"]
    });

    try {
      await waitForApi(port, server);

      const health = await getJson(port, "/api/health");
      expect(health).toMatchObject({ service: "customcard-api", status: "ready", realOrdersEnabled: false });

      const readiness = await getJson(port, "/api/admin/readiness");
      expect(readiness.routes).toMatchObject({ total: 12, admin: 3, idempotentMutations: 5 });
      expect(readiness.providers).toMatchObject({ total: 43, readyLocal: 11, credentialGated: 21, blocked: 3 });
      expect(readiness.safety).toMatchObject({
        externalNetworkCalls: false,
        liveVendorOrders: false,
        rawContentStored: false
      });

      const persistence = await getJson(port, "/api/admin/persistence-readiness");
      expect(persistence.persistence).toMatchObject({
        tables: 16,
        schemaBackedRoutes: 10,
        authSessionTable: true,
        idempotencyTable: true
      });
      expect(persistence.blockers).toEqual([]);

      const mobile = await getJson(port, "/api/mobile/bootstrap");
      expect(mobile.sections).toEqual(expect.arrayContaining(["card-queue", "text-chat", "handoff"]));
      expect(mobile.realOrdersEnabled).toBe(false);

      const mutation = await fetch(`http://127.0.0.1:${port}/api/render-packets`, { method: "POST" });
      expect(mutation.status).toBe(202);
      expect(await mutation.json()).toMatchObject({
        status: "accepted-contract-only",
        idempotencyRequired: true,
        runtimeMode: "contract",
        idempotencyPersisted: false,
        externalNetworkCalls: false,
        realOrdersEnabled: false
      });

      const wrongMethod = await fetch(`http://127.0.0.1:${port}/api/health`, { method: "POST" });
      expect(wrongMethod.status).toBe(405);

      const missing = await fetch(`http://127.0.0.1:${port}/api/unknown`);
      expect(missing.status).toBe(404);
    } finally {
      server.kill();
      await waitForExit(server);
    }
  });

  it("enforces memory-runtime auth sessions and idempotent mutation replay", async () => {
    const port = 7100 + Math.floor(Math.random() * 1000);
    const customerToken = "customer-session-token-for-api-test";
    const adminToken = "admin-session-token-for-api-test";
    const server = spawn("node", ["scripts/api-server.mjs"], {
      env: {
        ...process.env,
        CUSTOMCARD_API_RUNTIME: "memory",
        CUSTOMCARD_CUSTOMER_SESSION_TOKEN: customerToken,
        CUSTOMCARD_ADMIN_SESSION_TOKEN: adminToken,
        HOST: "127.0.0.1",
        PORT: String(port)
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    try {
      await waitForApi(port, server);

      const unauthenticatedAdmin = await fetch(`http://127.0.0.1:${port}/api/admin/readiness`);
      expect(unauthenticatedAdmin.status).toBe(401);
      expect(await unauthenticatedAdmin.json()).toMatchObject({ status: "auth-required", requiredAuth: "admin-session" });

      const wrongRole = await getJson(port, "/api/admin/readiness", bearer(customerToken), 403);
      expect(wrongRole).toMatchObject({ status: "wrong-role", requiredAuth: "admin-session" });

      const initialReadiness = await getJson(port, "/api/admin/readiness", bearer(adminToken));
      expect(initialReadiness.runtime).toMatchObject({
        mode: "memory",
        authEnforced: true,
        idempotencyEnforced: true,
        sessionsConfigured: 2,
        idempotencyRecords: 0,
        auditRecords: 0,
        queuedJobs: 0
      });

      const customerBootstrap = await getJson(port, "/api/customer/bootstrap", bearer(customerToken));
      expect(customerBootstrap.runtime).toMatchObject({ mode: "memory", authEnforced: true });

      const missingAuth = await fetch(`http://127.0.0.1:${port}/api/render-packets`, { method: "POST" });
      expect(missingAuth.status).toBe(401);

      const missingIdempotency = await postJson(port, "/api/render-packets", { projectId: "project-demo" }, bearer(customerToken));
      expect(missingIdempotency.status).toBe(400);
      expect(await missingIdempotency.json()).toMatchObject({ status: "idempotency-key-required" });

      const headers = {
        ...bearer(customerToken),
        "X-Idempotency-Key": "render-packets-0001"
      };
      const first = await postJson(port, "/api/render-packets", { projectId: "project-demo" }, headers);
      expect(first.status).toBe(202);
      expect(await first.json()).toMatchObject({
        runtimeMode: "memory",
        authenticatedUserId: "user-demo",
        idempotencyPersisted: true,
        idempotencyReplayed: false,
        persistedTables: expect.arrayContaining(["auth_sessions", "idempotency_keys", "api_jobs", "audit_log"])
      });

      const replay = await postJson(port, "/api/render-packets", { projectId: "project-demo" }, headers);
      expect(replay.status).toBe(202);
      expect(await replay.json()).toMatchObject({
        runtimeMode: "memory",
        idempotencyPersisted: true,
        idempotencyReplayed: true
      });

      const conflict = await postJson(port, "/api/render-packets", { projectId: "changed-project" }, headers);
      expect(conflict.status).toBe(409);
      expect(await conflict.json()).toMatchObject({ status: "idempotency-conflict" });

      const finalReadiness = await getJson(port, "/api/admin/readiness", bearer(adminToken));
      expect(finalReadiness.runtime).toMatchObject({
        mode: "memory",
        idempotencyRecords: 1,
        auditRecords: 1,
        queuedJobs: 1
      });
    } finally {
      server.kill();
      await waitForExit(server);
    }
  });
});

async function getJson(port: number, path: string, headers: Record<string, string> = {}, expectedStatus = 200): Promise<any> {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, { headers });
  expect(response.status).toBe(expectedStatus);
  return response.json();
}

function postJson(port: number, path: string, body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}

function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function waitForApi(port: number, server: ChildProcess): Promise<void> {
  let stderr = "";
  server.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });

  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`API server exited early: ${stderr}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`API server did not start: ${stderr}`);
}

async function waitForExit(server: ChildProcess): Promise<void> {
  if (server.exitCode !== null) return;
  await new Promise<void>((resolve) => {
    server.once("exit", () => resolve());
    setTimeout(() => resolve(), 1000);
  });
}
