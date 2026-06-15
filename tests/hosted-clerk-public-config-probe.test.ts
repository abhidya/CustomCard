import { describe, expect, it, vi } from "vitest";
import { runHostedClerkPublicConfigProbe } from "../scripts/hosted-clerk-public-config-probe.mjs";

const testPublishableKey = makePublishableKey("test", "model-bluejay-21.clerk.accounts.dev");
const livePublishableKey = makePublishableKey("live", "customcard.clerk.accounts.dev");

describe("hosted Clerk public config probe", () => {
  it("fails closed before fetching hosted public assets without the explicit guard", async () => {
    const fetchImpl = vi.fn();

    const report = await runHostedClerkPublicConfigProbe({
      env: {
        CUSTOMCARD_HOSTED_API_ENV: "production",
        CUSTOMCARD_HOSTED_API_BASE_URL: "https://customcard-three.vercel.app"
      },
      fetchImpl
    });

    expect(report).toMatchObject({
      service: "customcard-hosted-clerk-public-config-probe",
      status: "blocked",
      scope: "live-hosted-clerk-public-config",
      targetEnvironment: "production",
      mutationsEnabled: false,
      valuesRedacted: true,
      assets: [],
      publishableKeys: []
    });
    expect(report.blockers).toContain(
      "CUSTOMCARD_HOSTED_CLERK_PUBLIC_CONFIG_PROBE=enabled is required before hosted Clerk public config probes run."
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("blocks production public bundles that still ship Clerk pk_test keys", async () => {
    const fetchImpl = vi.fn(async (input: URL) => {
      const path = new URL(String(input)).pathname;
      if (path === "/") {
        return textResponse(200, '<script type="module" src="/assets/index.js"></script>');
      }
      return textResponse(200, `const clerkKey="${testPublishableKey}";`);
    });

    const report = await runHostedClerkPublicConfigProbe({
      env: {
        CUSTOMCARD_HOSTED_CLERK_PUBLIC_CONFIG_PROBE: "enabled",
        CUSTOMCARD_HOSTED_API_ENV: "production",
        CUSTOMCARD_HOSTED_API_BASE_URL: "https://customcard-three.vercel.app"
      },
      fetchImpl,
      now: new Date("2026-06-15T17:00:00.000Z")
    });

    expect(report).toMatchObject({
      status: "blocked",
      checkedAt: "2026-06-15T17:00:00.000Z",
      keyCount: 1,
      keyKinds: ["test"],
      publicConfig: {
        productionPublicClerkReady: false,
        testKeyDetected: true,
        liveKeyDetected: false
      }
    });
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "Production hosted public app bundle must not ship a Clerk pk_test publishable key.",
        "Production hosted public app bundle must ship a Clerk pk_live publishable key."
      ])
    );
    expect(JSON.stringify(report)).not.toContain(testPublishableKey);
    expect(report.publishableKeys[0]).toMatchObject({
      kind: "test",
      decodedIssuerCandidate: "https://model-bluejay-21.clerk.accounts.dev"
    });
  });

  it("accepts production public bundles that ship only Clerk pk_live keys", async () => {
    const fetchImpl = vi.fn(async (input: URL) => {
      const path = new URL(String(input)).pathname;
      if (path === "/") {
        return textResponse(200, '<script type="module" src="/assets/index.js"></script>');
      }
      return textResponse(200, `window.__clerk="${livePublishableKey}";`);
    });

    const report = await runHostedClerkPublicConfigProbe({
      env: {
        CUSTOMCARD_HOSTED_CLERK_PUBLIC_CONFIG_PROBE: "enabled",
        CUSTOMCARD_HOSTED_API_ENV: "production",
        CUSTOMCARD_HOSTED_API_BASE_URL: "https://customcard-three.vercel.app"
      },
      fetchImpl
    });

    expect(report).toMatchObject({
      status: "ready",
      keyCount: 1,
      keyKinds: ["live"],
      issuerCandidates: ["https://customcard.clerk.accounts.dev"],
      publicConfig: {
        productionPublicClerkReady: true,
        testKeyDetected: false,
        liveKeyDetected: true
      },
      blockers: []
    });
    expect(JSON.stringify(report)).not.toContain(livePublishableKey);
  });
});

function makePublishableKey(kind: "test" | "live", host: string): string {
  return `pk_${kind}_${Buffer.from(`${host}$`).toString("base64url")}`;
}

function textResponse(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain" }
  });
}
