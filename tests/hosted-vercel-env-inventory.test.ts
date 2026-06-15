import { describe, expect, it, vi } from "vitest";
import {
  parseVercelEnvJson,
  resolveVercelEnvTarget,
  runHostedVercelEnvInventory
} from "../scripts/hosted-vercel-env-inventory.mjs";

const requiredKeys = [
  "CUSTOMCARD_API_RUNTIME",
  "DATABASE_URL",
  "AUTH_SESSION_SECRET",
  "CLERK_JWT_KEY",
  "CLERK_AUTHORIZED_PARTIES",
  "CLERK_ISSUER",
  "CLERK_AUDIENCE",
  "IDEMPOTENCY_KEY_TTL_HOURS"
];

describe("hosted Vercel env inventory", () => {
  it("fails closed until the guarded env inventory is explicitly enabled", async () => {
    const commandRunner = vi.fn();

    const report = await runHostedVercelEnvInventory({
      env: {
        CUSTOMCARD_HOSTED_API_ENV: "qa",
        CUSTOMCARD_QA_API_BASE_URL: "https://qa.customcard.test"
      },
      commandRunner,
      now: new Date("2026-06-15T15:00:00.000Z")
    });

    expect(report).toMatchObject({
      service: "customcard-hosted-vercel-env-inventory",
      status: "blocked",
      scope: "live-hosted-env-sync",
      targetEnvironment: "qa",
      vercelTarget: "preview",
      checkedAt: "2026-06-15T15:00:00.000Z",
      checks: [],
      valuesRedacted: true,
      envSync: {
        requiredKeysPresent: false,
        environmentSynced: false
      }
    });
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "CUSTOMCARD_HOSTED_ENV_INVENTORY=enabled is required before hosted Vercel env inventory runs.",
        "Hosted API base URL must not be a placeholder URL."
      ])
    );
    expect(commandRunner).not.toHaveBeenCalled();
  });

  it("selects QA preview and production env targets without crossing scopes", () => {
    expect(
      resolveVercelEnvTarget({
        CUSTOMCARD_HOSTED_API_ENV: "qa",
        CUSTOMCARD_QA_API_BASE_URL: "https://qa.customcard.app"
      })
    ).toMatchObject({
      targetEnvironment: "qa",
      vercelTarget: "preview",
      blockers: []
    });

    expect(
      resolveVercelEnvTarget({
        CUSTOMCARD_HOSTED_API_ENV: "production",
        CUSTOMCARD_PRODUCTION_API_BASE_URL: "https://customcard.app"
      })
    ).toMatchObject({
      targetEnvironment: "production",
      vercelTarget: "production",
      blockers: []
    });

    expect(
      resolveVercelEnvTarget({
        CUSTOMCARD_HOSTED_API_ENV: "production",
        CUSTOMCARD_VERCEL_ENV_TARGET: "preview",
        CUSTOMCARD_PRODUCTION_API_BASE_URL: "https://customcard.app"
      }).blockers
    ).toEqual(expect.arrayContaining(["Production hosted API env inventory must use CUSTOMCARD_VERCEL_ENV_TARGET=production."]));
  });

  it("parses common Vercel env JSON shapes into key names and normalized targets only", () => {
    expect(
      parseVercelEnvJson(
        JSON.stringify({
          envs: [
            { key: "DATABASE_URL", target: ["production"], value: "postgres://secret" },
            { name: "CLERK_JWT_KEY", environment: "preview", value: "jwt-secret" },
            "CUSTOMCARD_API_RUNTIME"
          ]
        })
      )
    ).toEqual([
      { name: "DATABASE_URL", targets: ["production"] },
      { name: "CLERK_JWT_KEY", targets: ["preview"] },
      { name: "CUSTOMCARD_API_RUNTIME", targets: ["unknown"] }
    ]);
  });

  it("verifies required production key coverage without leaking Vercel values", async () => {
    const secretDatabaseUrl = "postgres://customcard:super-secret@prod.neon.tech/customcard";
    const secretJwtKey = "-----BEGIN PUBLIC KEY-----super-secret-----END PUBLIC KEY-----";
    const commandRunner = vi.fn(async () => ({
      exitCode: 0,
      stdout: JSON.stringify({
        envs: [
          ...requiredKeys.map((key) => ({
            key,
            target: ["production"],
            value: key === "DATABASE_URL" ? secretDatabaseUrl : key === "CLERK_JWT_KEY" ? secretJwtKey : `secret-${key}`
          })),
          { key: "CUSTOMCARD_API_RUNTIME", target: ["preview"], value: "postgres" }
        ]
      }),
      stderr: "unused stderr super-secret"
    }));

    const report = await runHostedVercelEnvInventory({
      env: {
        CUSTOMCARD_HOSTED_ENV_INVENTORY: "enabled",
        CUSTOMCARD_HOSTED_API_ENV: "production",
        CUSTOMCARD_HOSTED_API_BASE_URL: "https://customcard-three.vercel.app"
      },
      commandRunner,
      now: new Date("2026-06-15T15:10:00.000Z")
    });

    expect(report).toMatchObject({
      status: "ready",
      targetEnvironment: "production",
      vercelTarget: "production",
      valuesRedacted: true,
      envSync: {
        requiredKeysPresent: true,
        customcardApiRuntimeConfigured: true,
        databaseUrlConfigured: true,
        clerkJwtVerifierConfigured: true,
        idempotencyConfigured: true,
        environmentSynced: true
      },
      passed: 3,
      failed: 0,
      blockers: []
    });
    expect(commandRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        vercelTarget: "production"
      })
    );
    expect(report.requiredKeys).toEqual(
      expect.arrayContaining([
        { name: "DATABASE_URL", present: true, targets: ["production"] },
        { name: "CLERK_JWT_KEY", present: true, targets: ["production"] }
      ])
    );
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(secretDatabaseUrl);
    expect(serialized).not.toContain(secretJwtKey);
    expect(serialized).not.toContain("super-secret");
    expect(serialized).not.toContain("secret-CUSTOMCARD_API_RUNTIME");
  });

  it("blocks env sync proof when required scoped keys are missing", async () => {
    const commandRunner = vi.fn(async () => ({
      exitCode: 0,
      stdout: JSON.stringify({
        envs: requiredKeys
          .filter((key) => key !== "CLERK_AUDIENCE")
          .map((key) => ({ key, target: ["production"], value: "redacted-by-script" }))
      }),
      stderr: ""
    }));

    const report = await runHostedVercelEnvInventory({
      env: {
        CUSTOMCARD_HOSTED_ENV_INVENTORY: "enabled",
        CUSTOMCARD_HOSTED_API_ENV: "production",
        CUSTOMCARD_HOSTED_API_BASE_URL: "https://customcard-three.vercel.app"
      },
      commandRunner
    });

    expect(report.status).toBe("blocked");
    expect(report.blockers).toEqual(
      expect.arrayContaining(["CLERK_AUDIENCE is missing from the Vercel production env inventory."])
    );
    expect(report.envSync).toMatchObject({
      requiredKeysPresent: false,
      clerkJwtVerifierConfigured: false,
      environmentSynced: false
    });
  });
});
