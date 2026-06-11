import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type ViteDevServer } from "vite";
import { walgreensCheckoutUploadRoute } from "../src/walgreensHostedCheckout.mjs";

describe("Vite API middleware", () => {
  let server: ViteDevServer;
  let baseUrl: string;
  let previousApiRuntime: string | undefined;
  let previousWalgreensMode: string | undefined;

  beforeAll(async () => {
    previousApiRuntime = process.env.CUSTOMCARD_API_RUNTIME;
    previousWalgreensMode = process.env.WALGREENS_VENDOR_MODE;
    process.env.CUSTOMCARD_API_RUNTIME = "contract";
    process.env.WALGREENS_VENDOR_MODE = "disabled_until_certified";

    server = await createServer({
      root: process.cwd(),
      logLevel: "error",
      server: {
        host: "127.0.0.1",
        port: 5300 + Math.floor(Math.random() * 500),
        strictPort: false
      }
    });
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === "string") throw new Error("Unable to determine Vite server address");
    baseUrl = `http://127.0.0.1:${address.port}`;
  }, 30000);

  afterAll(async () => {
    await server?.close();
    restoreEnv("CUSTOMCARD_API_RUNTIME", previousApiRuntime);
    restoreEnv("WALGREENS_VENDOR_MODE", previousWalgreensMode);
  });

  it("serves Walgreens checkout uploads through the JSON API handler", async () => {
    const response = await fetch(`${baseUrl}${walgreensCheckoutUploadRoute}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: "" })
    });

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({
      service: "customcard-api",
      ok: false,
      error: "Walgreens checkout is not enabled."
    });
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
