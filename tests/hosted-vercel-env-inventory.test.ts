import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  productionCardCopyModel,
  productionCardCopyModelOverrideEnvKey
} from "../src/aiProviderSetupProfile.mjs";
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

const repoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

describe("hosted Vercel env inventory", () => {
  it("documents redacted hosted setup reports and keeps local Comfy free of Cloudflare image-key requirements", () => {
    const vercelDoc = readFileSync(resolve(repoRoot, "docs/vercel-env-structure.md"), "utf8");
    const cloudflareDoc = readFileSync(resolve(repoRoot, "docs/cloudflare-workers-ai-setup.md"), "utf8");

    expect(vercelDoc).toContain("The report must not include env");
    expect(vercelDoc).toContain("values, only key names and target scopes.");
    expect(vercelDoc).toContain("Treat these inventory artifacts as");
    expect(vercelDoc).toContain("setup proof, not a place to copy or store secrets.");
    expect(vercelDoc).toContain("does not require Cloudflare image keys");
    expect(cloudflareDoc).toContain("hosted Cloudflare image keys are not");
  });

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
          { key: "CLOUDFLARE_ACCOUNT_ID", target: ["production"], value: "account-secret" },
          { key: "CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN", target: ["production"], value: "cloudflare-text-secret" },
          { key: productionCardCopyModelOverrideEnvKey, target: ["production"], value: productionCardCopyModel },
          { key: "CUSTOMCARD_CLOUDFLARE_TEXT_MODEL", target: ["production"], value: productionCardCopyModel },
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
        aiCardCopySetupConfigured: true,
        aiCardCopyProductionModelPinned: true,
        environmentSynced: true
      },
      passed: 4,
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
    expect(report.aiCardCopySetup).toMatchObject({
      providerId: "cloudflare-workers-ai-chat",
      defaultModel: productionCardCopyModel,
      productionModelOverridePresent: true,
      localProductionTextComfyRequiresHostedImageKeys: false,
      productionModelOverrideEnvKey: {
        name: productionCardCopyModelOverrideEnvKey,
        present: true
      }
    });
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(secretDatabaseUrl);
    expect(serialized).not.toContain(secretJwtKey);
    expect(serialized).not.toContain("super-secret");
    expect(serialized).not.toContain("secret-CUSTOMCARD_API_RUNTIME");
    expect(serialized).not.toContain("cloudflare-text-secret");
  });

  it("blocks env sync proof when required scoped keys are missing", async () => {
    const commandRunner = vi.fn(async () => ({
      exitCode: 0,
      stdout: JSON.stringify({
        envs: requiredKeys
          .filter((key) => key !== "CLERK_AUDIENCE")
          .map((key) => ({ key, target: ["production"], value: "redacted-by-script" }))
          .concat([
            { key: "CLOUDFLARE_ACCOUNT_ID", target: ["production"], value: "account-secret" },
            { key: "CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN", target: ["production"], value: "cloudflare-text-secret" }
          ])
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
      expect.arrayContaining([
        "CLERK_AUDIENCE is missing from the Vercel production env inventory."
      ])
    );
    expect(report.envSync).toMatchObject({
      requiredKeysPresent: false,
      clerkJwtVerifierConfigured: false,
      aiCardCopySetupConfigured: true,
      aiCardCopyProductionModelPinned: false,
      environmentSynced: false
    });
  });

  it("reports an unpinned card-copy override without blocking hosted setup by itself", async () => {
    const commandRunner = vi.fn(async () => ({
      exitCode: 0,
      stdout: JSON.stringify({
        envs: requiredKeys.map((key) => ({ key, target: ["production"], value: `secret-${key}` })).concat([
          { key: "CLOUDFLARE_ACCOUNT_ID", target: ["production"], value: "account-secret" },
          { key: "CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN", target: ["production"], value: "cloudflare-text-secret" }
        ])
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

    expect(report).toMatchObject({
      status: "ready",
      aiCardCopySetup: {
        baseConfigured: true,
        modelConfigured: false,
        productionModelOverridePresent: false,
        ready: true
      },
      envSync: {
        aiCardCopySetupConfigured: true,
        aiCardCopyProductionModelPinned: false,
        environmentSynced: true
      },
      blockers: []
    });
    expect(report.checks.find((check) => check.id === "ai-card-copy-setup")).toMatchObject({
      passed: true
    });
    expect(report.checks.find((check) => check.id === "ai-card-copy-setup")?.detail).toContain(
      `${productionCardCopyModelOverrideEnvKey} is not set`
    );
    expect(report.aiCardCopySetup.blockers).toEqual([]);
    expect(report.aiCardCopySetup.expectedRequiredSetupKeys).toEqual([
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN",
      "CLOUDFLARE_API_TOKEN"
    ]);
  });
});
