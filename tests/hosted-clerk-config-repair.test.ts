import { Buffer } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import { runHostedClerkConfigRepair } from "../scripts/hosted-clerk-config-repair.mjs";

function publishableKey(kind: "live" | "test", host: string) {
  return `pk_${kind}_${Buffer.from(`${host}$`, "utf8").toString("base64url")}`;
}

const livePublishableKey = publishableKey("live", "clerk.customcard.app");
const testPublishableKey = publishableKey("test", "model-bluejay-21.clerk.accounts.dev");

const inventory = {
  targetEnvironment: "production",
  vercelTarget: "production",
  baseUrl: "https://customcard-three.vercel.app",
  command: { stdoutParsed: true },
  envSync: {
    clerkJwtVerifierConfigured: false
  },
  requiredKeys: [
    { name: "CUSTOMCARD_API_RUNTIME", present: true },
    { name: "DATABASE_URL", present: true },
    { name: "AUTH_SESSION_SECRET", present: true },
    { name: "CLERK_JWT_KEY", present: true },
    { name: "CLERK_AUTHORIZED_PARTIES", present: true },
    { name: "CLERK_ISSUER", present: false },
    { name: "CLERK_AUDIENCE", present: false },
    { name: "IDEMPOTENCY_KEY_TTL_HOURS", present: true }
  ]
};

const publicConfig = {
  targetEnvironment: "production",
  baseUrl: "https://customcard-three.vercel.app",
  status: "blocked",
  keyKinds: ["test"],
  issuerCandidates: ["https://model-bluejay-21.clerk.accounts.dev"],
  publicConfig: {
    productionPublicClerkReady: false,
    testKeyDetected: true,
    liveKeyDetected: false
  },
  blockers: [
    "Production hosted public app bundle must not ship a Clerk pk_test publishable key.",
    "Production hosted public app bundle must ship a Clerk pk_live publishable key."
  ]
};

describe("hosted Clerk config repair", () => {
  it("fails closed before inspecting or applying without the explicit guard", async () => {
    const inventoryRunner = vi.fn();
    const publicConfigRunner = vi.fn();
    const commandRunner = vi.fn();

    const report = await runHostedClerkConfigRepair({
      env: {},
      inventoryRunner,
      publicConfigRunner,
      commandRunner
    });

    expect(report).toMatchObject({
      service: "customcard-hosted-clerk-config-repair",
      status: "blocked",
      applyEnabled: false,
      valuesRedacted: true,
      clerkConfig: {
        productionReadyClaimed: false
      }
    });
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "--confirm-hosted-clerk-config-repair is required before hosted Clerk config repair can inspect or apply changes."
      ])
    );
    expect(inventoryRunner).not.toHaveBeenCalled();
    expect(publicConfigRunner).not.toHaveBeenCalled();
    expect(commandRunner).not.toHaveBeenCalled();
  });

  it("builds a redacted production repair plan from a pk_live publishable key", async () => {
    const commandRunner = vi.fn();

    const report = await runHostedClerkConfigRepair({
      env: {
        VITE_CLERK_PUBLISHABLE_KEY: livePublishableKey,
        CLERK_AUDIENCE: "customcard-api"
      },
      inventoryRunner: vi.fn(async () => inventory),
      publicConfigRunner: vi.fn(async () => publicConfig),
      commandRunner,
      now: new Date("2026-06-15T17:00:00.000Z"),
      enabled: true
    });

    expect(report).toMatchObject({
      status: "ready",
      checkedAt: "2026-06-15T17:00:00.000Z",
      targetEnvironment: "production",
      vercelTarget: "production",
      applyEnabled: false,
      valuesRedacted: true,
      desiredConfig: {
        publishableKeySupplied: true,
        publishableKeyKind: "live",
        issuerSupplied: true,
        explicitIssuerSupplied: false,
        derivedIssuerCandidate: "https://clerk.customcard.app",
        audienceSupplied: true
      },
      publicConfigBefore: {
        productionPublicClerkReady: false,
        testKeyDetected: true,
        liveKeyDetected: false
      },
      serverVerifierBefore: {
        clerkJwtVerifierConfigured: false,
        missingServerVerifierKeys: ["CLERK_ISSUER", "CLERK_AUDIENCE"]
      },
      clerkConfig: {
        repairReady: true,
        repairApplied: false,
        redeployRequired: true,
        publicConfigReprobeRequired: true,
        productionReadyClaimed: false
      },
      blockers: []
    });
    expect(report.repairPlan).toEqual([
      {
        key: "VITE_CLERK_PUBLISHABLE_KEY",
        target: "production",
        valueSupplied: true,
        action: "plan-replace-after-redeploy",
        reason: "Hosted public bundle must be rebuilt with the supplied Clerk publishable key."
      },
      {
        key: "CLERK_ISSUER",
        target: "production",
        valueSupplied: true,
        action: "plan-add",
        reason: "CLERK_ISSUER is missing from the redacted Vercel env inventory."
      },
      {
        key: "CLERK_AUDIENCE",
        target: "production",
        valueSupplied: true,
        action: "plan-add",
        reason: "CLERK_AUDIENCE is missing from the redacted Vercel env inventory."
      }
    ]);
    expect(commandRunner).not.toHaveBeenCalled();
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(livePublishableKey);
    expect(serialized).not.toContain("customcard-api");
  });

  it("blocks production repair with a test key, missing audience, or issuer mismatch", async () => {
    const report = await runHostedClerkConfigRepair({
      env: {
        VITE_CLERK_PUBLISHABLE_KEY: testPublishableKey,
        CLERK_ISSUER: "https://different.clerk.accounts.dev"
      },
      inventoryRunner: vi.fn(async () => inventory),
      publicConfigRunner: vi.fn(async () => publicConfig),
      commandRunner: vi.fn(),
      enabled: true
    });

    expect(report.status).toBe("blocked");
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "Production Clerk config repair requires a pk_live publishable key.",
        "CLERK_ISSUER must match the issuer derived from the supplied Clerk publishable key.",
        "CLERK_AUDIENCE must be supplied in the process env before Clerk config repair can apply it."
      ])
    );
  });

  it("applies replacement and missing server keys only after explicit production acknowledgments", async () => {
    const commandRunner = vi.fn(async ({ key, target, action }) => ({ key, target, action, exitCode: 0 }));

    const report = await runHostedClerkConfigRepair({
      env: {
        VITE_CLERK_PUBLISHABLE_KEY: livePublishableKey,
        CLERK_AUDIENCE: "customcard-api"
      },
      inventoryRunner: vi.fn(async () => inventory),
      publicConfigRunner: vi.fn(async () => publicConfig),
      commandRunner,
      enabled: true,
      apply: true,
      acknowledgeProduction: true,
      acknowledgePublicKeyReplace: true
    });

    expect(report).toMatchObject({
      status: "ready",
      applyEnabled: true,
      publicKeyReplaceAcknowledged: true,
      appliedKeys: ["VITE_CLERK_PUBLISHABLE_KEY", "CLERK_ISSUER", "CLERK_AUDIENCE"],
      pendingKeys: [],
      clerkConfig: {
        repairReady: true,
        repairApplied: true,
        redeployRequired: true,
        publicConfigReprobeRequired: true,
        productionReadyClaimed: false
      },
      blockers: []
    });
    expect(commandRunner).toHaveBeenCalledTimes(3);
    expect(commandRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "VITE_CLERK_PUBLISHABLE_KEY",
        value: livePublishableKey,
        target: "production",
        action: "vercel-env-replace"
      })
    );
    expect(commandRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "CLERK_ISSUER",
        value: "https://clerk.customcard.app",
        target: "production",
        action: "vercel-env-add"
      })
    );
  });
});
