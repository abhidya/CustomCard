import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { walgreensCheckoutUploadRoute } from "../src/walgreensHostedCheckout.mjs";

describe("API server local env loading", () => {
  const tempDirs: string[] = [];
  const children: ChildProcess[] = [];

  afterEach(async () => {
    for (const child of children.splice(0)) {
      child.kill();
      await waitForExit(child);
    }
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  });

  it("loads Walgreens hosted-checkout sandbox config from .env.local", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "customcard-api-env-"));
    tempDirs.push(cwd);
    writeFileSync(
      join(cwd, ".env.local"),
      [
        "WALGREENS_VENDOR_MODE=sandbox",
        "WALGREENS_API_KEY=test-api-key",
        "WALGREENS_AFF_ID=test-aff-id",
        "PUBLIC_APP_ORIGIN=http://127.0.0.1:5173",
        ""
      ].join("\n")
    );

    const port = 7600 + Math.floor(Math.random() * 500);
    const env = {
      ...process.env,
      CUSTOMCARD_API_RUNTIME: "contract",
      HOST: "127.0.0.1",
      PORT: String(port)
    };
    delete env.WALGREENS_VENDOR_MODE;
    delete env.WALGREENS_API_KEY;
    delete env.WALGREENS_AFF_ID;
    delete env.WALGREENS_PUBLISHER_ID;
    delete env.PUBLIC_APP_ORIGIN;

    const server = spawn(process.execPath, [fileURLToPath(new URL("../scripts/api-server.mjs", import.meta.url))], {
      cwd,
      env,
      stdio: ["ignore", "ignore", "pipe"]
    });
    children.push(server);

    await waitForApi(port, server);
    const response = await fetch(`http://127.0.0.1:${port}${walgreensCheckoutUploadRoute}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: "" })
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      service: "customcard-api",
      ok: false,
      error: "imageBase64 is required."
    });
  }, 30000);
});

async function waitForApi(port: number, server: ChildProcess): Promise<void> {
  let stderr = "";
  server.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });

  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`API server exited early: ${stderr}`);
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
