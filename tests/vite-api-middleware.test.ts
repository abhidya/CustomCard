import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type ViteDevServer } from "vite";
import { walgreensCheckoutUploadRoute } from "../src/walgreensHostedCheckout.mjs";

describe("Vite API middleware", () => {
  let server: ViteDevServer;
  let baseUrl: string;
  let previousApiRuntime: string | undefined;
  let previousGoogleClientId: string | undefined;
  let previousGoogleClientSecret: string | undefined;
  let previousGoogleRedirectUri: string | undefined;
  let previousWalgreensMode: string | undefined;

  beforeAll(async () => {
    previousApiRuntime = process.env.CUSTOMCARD_API_RUNTIME;
    previousGoogleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    previousGoogleClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    previousGoogleRedirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    previousWalgreensMode = process.env.WALGREENS_VENDOR_MODE;
    process.env.CUSTOMCARD_API_RUNTIME = "contract";
    process.env.GOOGLE_OAUTH_CLIENT_ID = "test-google-calendar-client.apps.googleusercontent.com";
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = "test-google-calendar-secret";
    process.env.GOOGLE_OAUTH_REDIRECT_URI = "http://127.0.0.1:5173/oauth/callback";
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
    restoreEnv("GOOGLE_OAUTH_CLIENT_ID", previousGoogleClientId);
    restoreEnv("GOOGLE_OAUTH_CLIENT_SECRET", previousGoogleClientSecret);
    restoreEnv("GOOGLE_OAUTH_REDIRECT_URI", previousGoogleRedirectUri);
    restoreEnv("WALGREENS_VENDOR_MODE", previousWalgreensMode);
  });

  it("serves Google Calendar connection start through the JSON API handler", async () => {
    const response = await fetch(`${baseUrl}/api/calendar/connections/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Idempotency-Key": "calendar-vite-middleware" },
      body: JSON.stringify({ calendarChoiceId: "google-calendar-events", returnTo: `${baseUrl}/?view=events` })
    });

    expect(response.status).toBe(202);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({
      service: "customcard-api",
      status: "oauth-ready",
      providerRequestUrl: expect.stringContaining("https://accounts.google.com/o/oauth2/v2/auth")
    });
  });

  it("serves the deployed OAuth callback alias through the JSON API handler", async () => {
    const response = await fetch(`${baseUrl}/api/oauth/callback`);

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({
      service: "customcard-api",
      status: "invalid-oauth-state"
    });
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
