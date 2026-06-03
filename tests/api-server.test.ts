import { execFileSync, spawn, type ChildProcess } from "node:child_process";
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
      };
      blockers: string[];
    };

    expect(report.service).toBe("customcard-api-doctor");
    expect(report.status).toBe("ready");
    expect(report.blockers).toEqual([]);
    expect(report.readiness.providers.total).toBeGreaterThanOrEqual(42);
    expect(report.readiness.routes.total).toBe(12);
    expect(report.readiness.routes.mutations).toBe(report.readiness.routes.idempotentMutations);
    expect(report.readiness.persistence).toMatchObject({
      tables: 16,
      authSessionTable: true,
      idempotencyTable: true
    });
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
      expect(readiness.providers).toMatchObject({ total: 42, credentialGated: 21, blocked: 3 });
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
});

async function getJson(port: number, path: string): Promise<any> {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  expect(response.status).toBe(200);
  return response.json();
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
