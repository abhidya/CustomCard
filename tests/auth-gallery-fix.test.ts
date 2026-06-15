import { createSign, generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createApiRuntime } from "../scripts/api-runtime.mjs";
import { clerkVerificationConfigured, looksLikeJwt, verifyClerkSessionToken } from "../scripts/clerk-session.mjs";
import { apiRouteContracts, getApiRouteById } from "../src/apiRouteContractsData.mjs";
import { normalizeCardCategory } from "../src/cardCategoriesData.mjs";
import { resolveCalendarConnectionResult } from "../webapp/calendarConnectionAdapter";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const clerkPem = publicKey.export({ type: "spki", format: "pem" }).toString();

function base64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function signClerkJwt(payload: Record<string, unknown>): string {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${body}`);
  return `${header}.${body}.${signer.sign(privateKey).toString("base64url")}`;
}

function clerkClaims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return {
    sub: "user_2clerk123",
    sid: "sess_2clerk456",
    iss: "https://clerk.customcard.example",
    aud: "customcard-api",
    azp: "https://customcard-three.vercel.app",
    exp: nowSeconds + 300,
    nbf: nowSeconds - 30,
    iat: nowSeconds,
    email: "customer@example.com",
    ...overrides
  };
}

const runtimeEnv = {
  CUSTOMCARD_API_RUNTIME: "memory",
  AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
  CUSTOMCARD_CUSTOMER_SESSION_TOKEN: "seeded-customer-token",
  CUSTOMCARD_ADMIN_SESSION_TOKEN: "seeded-admin-token",
  OBJECT_STORE_URL: "file:///tmp/customcard-auth-gallery-test",
  OBJECT_STORE_SIGNING_SECRET: "test-object-store-signing-secret-32",
  CLERK_JWT_KEY: clerkPem,
  CLERK_AUTHORIZED_PARTIES: "https://customcard-three.vercel.app",
  CLERK_ISSUER: "https://clerk.customcard.example",
  CLERK_AUDIENCE: "customcard-api",
  CUSTOMCARD_ADMIN_EMAILS: "owner@customcard.example"
};

function bearerRequest(token: string, extraHeaders: Record<string, string> = {}) {
  return { headers: { authorization: `Bearer ${token}`, ...extraHeaders } };
}

describe("clerk session verification", () => {
  it("verifies a freshly signed Clerk session JWT offline", () => {
    expect(clerkVerificationConfigured(runtimeEnv)).toBe(true);
    const token = signClerkJwt(clerkClaims());
    expect(looksLikeJwt(token)).toBe(true);
    const verification = verifyClerkSessionToken(token, runtimeEnv);
    expect(verification).toMatchObject({
      ok: true,
      clerkUserId: "user_2clerk123",
      email: "customer@example.com",
      role: "customer"
    });
  });

  it("rejects expired tokens, foreign authorized parties, and tampered signatures", () => {
    const expired = signClerkJwt(clerkClaims({ exp: Math.floor(Date.now() / 1000) - 600 }));
    expect(verifyClerkSessionToken(expired, runtimeEnv)).toMatchObject({ ok: false, status: "expired" });

    const wrongParty = signClerkJwt(clerkClaims({ azp: "https://evil.example" }));
    expect(verifyClerkSessionToken(wrongParty, runtimeEnv)).toMatchObject({ ok: false, status: "unauthorized-party" });

    const missingParty = signClerkJwt(clerkClaims({ azp: undefined }));
    expect(verifyClerkSessionToken(missingParty, runtimeEnv)).toMatchObject({
      ok: false,
      status: "missing-authorized-party"
    });

    const wrongIssuer = signClerkJwt(clerkClaims({ iss: "https://evil-clerk.example" }));
    expect(verifyClerkSessionToken(wrongIssuer, runtimeEnv)).toMatchObject({
      ok: false,
      status: "unauthorized-issuer"
    });

    const wrongAudience = signClerkJwt(clerkClaims({ aud: "other-api" }));
    expect(verifyClerkSessionToken(wrongAudience, runtimeEnv)).toMatchObject({
      ok: false,
      status: "unauthorized-audience"
    });

    const valid = signClerkJwt(clerkClaims());
    const tampered = `${valid.slice(0, valid.lastIndexOf(".") + 1)}${"A".repeat(40)}`;
    expect(verifyClerkSessionToken(tampered, runtimeEnv).ok).toBe(false);
  });

  it("grants admin role from Clerk public metadata and the admin email allowlist", () => {
    const metadataAdmin = verifyClerkSessionToken(
      signClerkJwt(clerkClaims({ publicMetadata: { role: "admin" } })),
      runtimeEnv
    );
    expect(metadataAdmin).toMatchObject({ ok: true, role: "admin" });

    const allowlistAdmin = verifyClerkSessionToken(
      signClerkJwt(clerkClaims({ email: "owner@customcard.example" })),
      runtimeEnv
    );
    expect(allowlistAdmin).toMatchObject({ ok: true, role: "admin" });
  });
});

describe("clerk to api session bridge (memory runtime)", () => {
  it("authorizes a Clerk-signed-in customer for customer-session routes", async () => {
    const runtime = createApiRuntime({ env: runtimeEnv, routes: apiRouteContracts });
    const token = signClerkJwt(clerkClaims());
    const route = getApiRouteById("calendar-connection-start");
    const context = await runtime.authorize(route, bearerRequest(token));
    expect(context).toMatchObject({ ok: true, role: "customer" });

    // Subsequent calls reuse the minted session (fast path).
    const draftRoute = getApiRouteById("customer-draft-state");
    expect(await runtime.authorize(draftRoute, bearerRequest(token))).toMatchObject({ ok: true, role: "customer" });
  });

  it("still rejects unknown opaque tokens and signed-out requests", async () => {
    const runtime = createApiRuntime({ env: runtimeEnv, routes: apiRouteContracts });
    const route = getApiRouteById("customer-draft-state");
    expect(await runtime.authorize(route, bearerRequest("not-a-real-token"))).toMatchObject({
      ok: false,
      statusCode: 401
    });
    expect(await runtime.authorize(route, { headers: {} })).toMatchObject({ ok: false, statusCode: 401 });
  });

  it("keeps Clerk customers out of admin routes", async () => {
    const runtime = createApiRuntime({ env: runtimeEnv, routes: apiRouteContracts });
    const token = signClerkJwt(clerkClaims());
    const adminRoute = getApiRouteById("admin-card-gallery");
    const result = await runtime.authorize(adminRoute, bearerRequest(token));
    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(403);
  });

  it("lets Clerk admins use customer Walgreens checkout routes without opening admin routes to customers", async () => {
    const runtime = createApiRuntime({ env: runtimeEnv, routes: apiRouteContracts });
    const clerkAdminToken = signClerkJwt(
      clerkClaims({
        sub: "user_2clerkAdmin",
        sid: "sess_2clerkAdmin",
        email: "owner@customcard.example",
        publicMetadata: { role: "admin" }
      })
    );
    const walgreensUploadRoute = getApiRouteById("walgreens-checkout-upload");

    await expect(runtime.authorize(walgreensUploadRoute, bearerRequest(clerkAdminToken))).resolves.toMatchObject({
      ok: true,
      role: "customer"
    });

    await expect(runtime.authorize(walgreensUploadRoute, bearerRequest(runtimeEnv.CUSTOMCARD_ADMIN_SESSION_TOKEN))).resolves.toMatchObject({
      ok: false,
      statusCode: 401,
      payload: expect.objectContaining({ status: "invalid-session" })
    });

    const clerkCustomerToken = signClerkJwt(clerkClaims({ sub: "user_2clerkCustomer", sid: "sess_2clerkCustomer" }));
    const adminRoute = getApiRouteById("admin-card-gallery");
    await expect(runtime.authorize(adminRoute, bearerRequest(clerkCustomerToken))).resolves.toMatchObject({
      ok: false,
      statusCode: 403
    });
  });

  it("authorizes signed-in local Clerk customers for AI generation when memory runtime has no Clerk verification key", async () => {
    const { CLERK_JWT_KEY: _clerkJwtKey, ...localMemoryEnv } = runtimeEnv;
    const runtime = createApiRuntime({
      env: { ...localMemoryEnv, CUSTOMCARD_ENABLE_LOCAL_AUTH_FALLBACKS: "enabled" },
      routes: apiRouteContracts
    });
    const token = signClerkJwt(clerkClaims());
    const aiCardRoute = getApiRouteById("ai-card-generate");

    await expect(runtime.authorize(aiCardRoute, bearerRequest(token))).resolves.toMatchObject({
      ok: true,
      role: "customer"
    });

    const adminRoute = getApiRouteById("admin-card-gallery");
    await expect(runtime.authorize(adminRoute, bearerRequest(token))).resolves.toMatchObject({
      ok: false,
      statusCode: 403
    });
  });
});

describe("customer calendar connection state", () => {
  function googleImportRecord({ withRefreshToken = true } = {}) {
    return {
      providerConnection: {
        id: "connection-test-google",
        provider: "google_calendar",
        status: "connected",
        scopes: ["https://www.googleapis.com/auth/calendar.events.readonly"],
        adapterVersion: "google-calendar-events-v1",
        encryptedRefreshToken: withRefreshToken ? "aes-256-gcm:iv:tag:data" : "",
        metadataSchema: { rawContentStored: false, metadataOnly: true }
      },
      importedEvents: [
        {
          id: "event-test-1",
          title: "Maya's birthday dinner",
          startsAt: "2026-07-24T18:00:00.000Z",
          timezone: "America/New_York",
          sourceEvidence: "google-calendar:metadata-only",
          recipientHint: "Maya"
        }
      ],
      cardOpportunities: [
        {
          id: "opportunity-test-1",
          eventId: "event-test-1",
          recipientName: "Maya",
          leadTimeHours: 200,
          confidence: 0.95,
          decision: "pending",
          evidence: { rawContentStored: false, metadataOnly: true }
        }
      ]
    };
  }

  it("reports not_connected before any import and connected with moments afterwards", async () => {
    const runtime = createApiRuntime({ env: runtimeEnv, routes: apiRouteContracts });
    const authContext = { ok: true, role: "customer", userId: "user-demo", sessionId: "session-1" };

    const before = await runtime.readCustomerConnections({ authContext });
    expect(before.connections[0]).toMatchObject({ provider: "google_calendar", status: "not_connected", canScanAgain: false });

    await runtime.persistGoogleCalendarImport({ authContext, record: googleImportRecord() });
    const after = await runtime.readCustomerConnections({ authContext });
    expect(after.connections[0]).toMatchObject({
      status: "connected",
      credentialStorageEnabled: true,
      canScanAgain: true,
      importedEventCount: 1
    });
    expect(after.opportunities).toHaveLength(1);
    expect(after.opportunities[0]).toMatchObject({ recipientName: "Maya", title: "Maya's birthday dinner" });
    expect(after.rawContentStored).toBe(false);
  });

  it("reports needs_reconnect when no refresh credential is stored", async () => {
    const runtime = createApiRuntime({ env: runtimeEnv, routes: apiRouteContracts });
    const authContext = { ok: true, role: "customer", userId: "user-demo", sessionId: "session-1" };
    await runtime.persistGoogleCalendarImport({ authContext, record: googleImportRecord({ withRefreshToken: false }) });
    const payload = await runtime.readCustomerConnections({ authContext });
    expect(payload.connections[0]).toMatchObject({
      status: "needs_reconnect",
      reconnectReason: "missing-refresh-token",
      canScanAgain: false
    });
  });
});

describe("calendar connection UI result mapping", () => {
  it("tells signed-in customers to refresh their session instead of signing in on 401", () => {
    const signedIn = resolveCalendarConnectionResult(false, 401, undefined, { isSignedIn: true });
    expect(signedIn.status.title).toBe("Refresh your account session");
    expect(signedIn.status.detail).not.toContain("Sign in before");

    const signedOut = resolveCalendarConnectionResult(false, 401, undefined, { isSignedIn: false });
    expect(signedOut.status.title).toBe("Sign in required");
  });

  it("maps already-connected, scan-complete, and needs-reconnect server statuses", () => {
    expect(
      resolveCalendarConnectionResult(true, 200, { status: "google-calendar-already-connected" }).alreadyConnected
    ).toBe(true);
    const scanned = resolveCalendarConnectionResult(true, 200, {
      status: "google-calendar-scan-complete",
      importedEventCount: 3
    });
    expect(scanned.scanned).toBe(true);
    expect(scanned.status.detail).toContain("3");
    expect(
      resolveCalendarConnectionResult(true, 200, { status: "google-calendar-needs-reconnect" }).needsReconnect
    ).toBe(true);
  });
});

describe("card categories", () => {
  it("normalizes occasions onto canonical categories with custom fallback", () => {
    expect(normalizeCardCategory("birthday")).toBe("birthday");
    expect(normalizeCardCategory("Sami's Graduation party")).toBe("graduation");
    expect(normalizeCardCategory("thank you")).toBe("thank-you");
    expect(normalizeCardCategory("Get Well Soon")).toBe("get-well");
    expect(normalizeCardCategory("baby shower")).toBe("new-baby");
    expect(normalizeCardCategory("eid mubarak")).toBe("holiday");
    expect(normalizeCardCategory("quarterly business review")).toBe("custom");
    expect(normalizeCardCategory("")).toBe("custom");
  });

  it("tags card projects with a normalized category", async () => {
    const runtime = createApiRuntime({ env: runtimeEnv, routes: apiRouteContracts });
    const route = getApiRouteById("card-projects");
    const authContext = { ok: true, role: "customer", userId: "user-demo", sessionId: "session-1" };
    const result = await runtime.persistMutation({
      route,
      request: bearerRequest("seeded-customer-token", { "x-idempotency-key": "card-project-cat-0001" }),
      authContext,
      bodyText: JSON.stringify({
        opportunityId: "opportunity-test-1",
        recipientName: "Maya",
        occasion: "birthday",
        approvedMemoryIds: [],
        locale: "en-US"
      }),
      responsePayload: {}
    });
    expect(result.ok).toBe(true);
    expect(result.payload.category).toBe("birthday");

    const thankYou = await runtime.persistMutation({
      route,
      request: bearerRequest("seeded-customer-token", { "x-idempotency-key": "card-project-cat-0002" }),
      authContext,
      bodyText: JSON.stringify({
        opportunityId: "opportunity-test-2",
        recipientName: "Coach Reyes",
        occasion: "thank you",
        approvedMemoryIds: [],
        locale: "en-US"
      }),
      responsePayload: {}
    });
    expect(thankYou.payload.category).toBe("thank-you");
  });
});

describe("admin card gallery and public featured cards", () => {
  const adminContext = { ok: true, role: "admin", userId: "admin-demo", sessionId: "session-admin", email: "owner@customcard.example" };
  const galleryRoute = getApiRouteById("admin-card-gallery-save");

  function saveEntry(runtime: ReturnType<typeof createApiRuntime>, key: string, body: Record<string, unknown>) {
    return runtime.persistMutation({
      route: galleryRoute,
      request: bearerRequest("seeded-admin-token", { "x-idempotency-key": `gallery-${key}-000001` }),
      authContext: adminContext,
      bodyText: JSON.stringify(body),
      responsePayload: {}
    });
  }

  it("requires public-safe copy before accepting a gallery entry", async () => {
    const runtime = createApiRuntime({ env: runtimeEnv, routes: apiRouteContracts });
    const rejected = await saveEntry(runtime, "invalid", { featured: true });
    expect(rejected.ok).toBe(false);
    expect(rejected.statusCode).toBe(400);
    expect(rejected.payload.missingFields).toEqual(expect.arrayContaining(["category", "title", "publicCaption"]));
  });

  it("never exposes unapproved or unfeatured entries on the public route", async () => {
    const runtime = createApiRuntime({ env: runtimeEnv, routes: apiRouteContracts });
    await saveEntry(runtime, "private", {
      entryId: "gallery-private-1",
      category: "birthday",
      title: "Private birthday card",
      publicCaption: "Should stay private",
      featured: true,
      publicApproved: false
    });
    await saveEntry(runtime, "unfeatured", {
      entryId: "gallery-unfeatured-1",
      category: "birthday",
      title: "Approved but not featured",
      publicCaption: "Not featured",
      featured: false,
      publicApproved: true
    });
    const payload = await runtime.readFeaturedCards();
    expect(payload.categories).toEqual([]);
    expect(payload.fallbackToBuiltInExamples).toBe(true);
  });

  it("groups featured approved cards by category, ranked, with carousels for 2+ cards", async () => {
    const runtime = createApiRuntime({ env: runtimeEnv, routes: apiRouteContracts });
    await saveEntry(runtime, "b1", {
      entryId: "gallery-birthday-1",
      category: "birthday",
      title: "Maya's birthday",
      publicCaption: "A bold-type birthday card",
      featured: true,
      publicApproved: true,
      featuredRank: 20,
      frontSvg: "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"
    });
    await saveEntry(runtime, "b2", {
      entryId: "gallery-birthday-2",
      category: "birthday",
      title: "Another birthday",
      publicCaption: "A botanical birthday card",
      featured: true,
      publicApproved: true,
      featuredRank: 10
    });
    await saveEntry(runtime, "w1", {
      entryId: "gallery-wedding-1",
      category: "wedding",
      title: "Lena and Tom",
      publicCaption: "An elegant wedding card",
      featured: true,
      publicApproved: true
    });

    const payload = await runtime.readFeaturedCards();
    const byCategory = new Map(payload.categories.map((category: { category: string }) => [category.category, category]));
    const birthday = byCategory.get("birthday") as { cards: Array<{ id: string; featuredRank: number }> };
    expect(birthday.cards).toHaveLength(2); // carousel case
    expect(birthday.cards[0].featuredRank).toBeLessThan(birthday.cards[1].featuredRank);
    const wedding = byCategory.get("wedding") as { cards: unknown[] };
    expect(wedding.cards).toHaveLength(1); // single card case
    expect(payload.fallbackToBuiltInExamples).toBe(false);
  });

  it("persists regenerated card-front copy for the public featured gallery", async () => {
    const runtime = createApiRuntime({ env: runtimeEnv, routes: apiRouteContracts });
    await saveEntry(runtime, "regen-draft", {
      entryId: "gallery-regenerated-1",
      category: "thank-you",
      title: "Draft thank-you",
      publicCaption: "Draft caption",
      featured: false,
      publicApproved: false,
      frontSvg: "<svg xmlns=\"http://www.w3.org/2000/svg\"><text>Old draft copy</text></svg>"
    });
    await saveEntry(runtime, "regen-featured", {
      entryId: "gallery-regenerated-1",
      category: "thank-you",
      title: "Public thank-you example",
      publicCaption: "A reviewed customer thank-you card.",
      featured: true,
      publicApproved: true,
      featuredRank: 4,
      frontSvg: "<svg xmlns=\"http://www.w3.org/2000/svg\"><text>Regenerated front headline</text></svg>"
    });

    const payload = await runtime.readFeaturedCards();
    const thankYou = payload.categories.find((category: { category: string }) => category.category === "thank-you") as {
      cards: Array<{ title: string; caption: string; frontSvg: string; featuredRank: number }>;
    };
    expect(thankYou.cards).toEqual([
      expect.objectContaining({
        title: "Public thank-you example",
        caption: "A reviewed customer thank-you card.",
        frontSvg: expect.stringContaining("Regenerated front headline"),
        featuredRank: 4
      })
    ]);
    expect(payload.rawContentStored).toBe(false);
  });

  it("exposes only browser-safe gallery image URLs", async () => {
    const runtime = createApiRuntime({ env: runtimeEnv, routes: apiRouteContracts });
    await saveEntry(runtime, "safe-image", {
      entryId: "gallery-safe-image",
      category: "birthday",
      title: "Signed image card",
      publicCaption: "A signed artifact image.",
      featured: true,
      publicApproved: true,
      frontImageUrl: "/api/artifacts/projects/p/render-packets/r/front.webp?expires=1770000000&signature=abc"
    });
    await saveEntry(runtime, "raw-uri", {
      entryId: "gallery-raw-uri",
      category: "birthday",
      title: "Raw storage card",
      publicCaption: "A raw storage artifact should not become an image URL.",
      featured: true,
      publicApproved: true,
      frontArtifactUri: "s3://customcard-prod/projects/p/render-packets/r/raw-front.webp"
    });

    const payload = await runtime.readFeaturedCards();
    const birthday = payload.categories.find((category: { category: string }) => category.category === "birthday") as {
      cards: Array<{ id: string; frontImageUrl?: string; thumbnailUrl?: string }>;
    };
    expect(birthday.cards.find((card) => card.id === "gallery-safe-image")).toMatchObject({
      frontImageUrl: "/api/artifacts/projects/p/render-packets/r/front.webp?expires=1770000000&signature=abc"
    });
    const rawStorageCard = birthday.cards.find((card) => card.id === "gallery-raw-uri");
    expect(rawStorageCard?.frontImageUrl).toBeUndefined();
    expect(rawStorageCard?.thumbnailUrl).toBeUndefined();
  });

  it("lets admins update category, unfeature, and remove entries", async () => {
    const runtime = createApiRuntime({ env: runtimeEnv, routes: apiRouteContracts });
    await saveEntry(runtime, "edit1", {
      entryId: "gallery-edit-1",
      category: "custom",
      title: "Recategorize me",
      publicCaption: "Caption",
      featured: true,
      publicApproved: true
    });
    await saveEntry(runtime, "edit2", {
      entryId: "gallery-edit-1",
      category: "anniversary",
      title: "Recategorize me",
      publicCaption: "Caption",
      featured: true,
      publicApproved: true
    });
    let payload = await runtime.readFeaturedCards();
    expect(payload.categories.map((category: { category: string }) => category.category)).toEqual(["anniversary"]);

    await saveEntry(runtime, "edit3", { entryId: "gallery-edit-1", remove: true });
    payload = await runtime.readFeaturedCards();
    expect(payload.categories).toEqual([]);

    const gallery = await runtime.readCardGallery({ authContext: adminContext });
    expect(gallery.entries).toEqual([]);
    expect(gallery.categories).toContain("birthday");
  });

  it("keeps the admin gallery route usable when hosted gallery tables are unavailable", async () => {
    const runtime = createApiRuntime({
      env: {
        CUSTOMCARD_API_RUNTIME: "postgres",
        AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
        DATABASE_URL: "postgres://customcard.example/gallery-test"
      },
      routes: apiRouteContracts,
      postgresPoolFactory: () => ({
        query: async () => {
          throw new Error("relation does not exist");
        },
        end: async () => undefined
      })
    });

    const gallery = await runtime.readCardGallery({ authContext: adminContext });
    expect(gallery).toMatchObject({
      status: "degraded",
      entries: [],
      candidates: [],
      galleryReadStatus: {
        ok: false,
        message: "Gallery repository is not fully available yet.",
        issues: expect.arrayContaining([
          expect.objectContaining({ table: "card_gallery_entries", status: "read-unavailable" }),
          expect.objectContaining({ table: "draft_states", status: "read-unavailable" })
        ])
      },
      repository: {
        runtimeMode: "postgres",
        degraded: true
      }
    });
    expect(gallery.categories).toContain("birthday");
  });
});

describe("customer copy safety", () => {
  const homeView = readFileSync("webapp/views/HomeView.tsx", "utf8");
  const eventsView = readFileSync("webapp/views/EventsView.tsx", "utf8");

  it("does not promise email sync or accountless Walgreens checkout", () => {
    expect(homeView).not.toContain("email or calendar");
    expect(homeView).toContain("Start from invite or calendar");
    expect(homeView).not.toContain("designing and printing work without one");
    expect(homeView).toContain("AI generation, saved history, Google Calendar, and Walgreens checkout require an account.");
  });

  it("keeps admin/runtime jargon out of the customer calendar surface", () => {
    // Only inspect non-import code (rendered copy), not module paths.
    const renderedSource = eventsView
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("import") && !line.includes("from \""))
      .join("\n")
      .toLowerCase();
    for (const jargon of ["adapter", "readiness", "runtime mode", "provider_connections"]) {
      expect(renderedSource).not.toContain(jargon);
    }
    expect(eventsView).toContain("Google Calendar connected");
    expect(eventsView).toContain("Scan again");
    expect(eventsView).toContain("Reconnect Google Calendar");
  });
});
