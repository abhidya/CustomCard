import { describe, expect, it, vi } from "vitest";
import {
  productionCardCopyModel,
  productionCardCopyModelOverrideEnvKey
} from "../src/aiProviderSetupProfile.mjs";
import { runHostedVercelEnvRepair } from "../scripts/hosted-vercel-env-repair.mjs";

const missingInventory = {
  targetEnvironment: "production",
  vercelTarget: "production",
  baseUrl: "https://customcard-three.vercel.app",
  command: { stdoutParsed: true },
  requiredKeys: [
    { name: "CUSTOMCARD_API_RUNTIME", present: true },
    { name: "DATABASE_URL", present: true },
    { name: "AUTH_SESSION_SECRET", present: true },
    { name: "CLERK_JWT_KEY", present: true },
    { name: "CLERK_AUTHORIZED_PARTIES", present: true },
    { name: "CLERK_ISSUER", present: false },
    { name: "CLERK_AUDIENCE", present: false },
    { name: "IDEMPOTENCY_KEY_TTL_HOURS", present: false }
  ],
  aiCardCopySetup: {
    providerId: "cloudflare-workers-ai-chat",
    defaultModel: productionCardCopyModel,
    productionModelOverrideEnvKey: {
      name: productionCardCopyModelOverrideEnvKey,
      present: false
    },
    productionModelOverridePresent: false,
    baseConfigured: true,
    localProductionTextComfyRequiresHostedImageKeys: false,
    blockers: [],
    ready: true
  },
  envSync: {
    environmentSynced: false,
    aiCardCopySetupConfigured: true,
    aiCardCopyProductionModelPinned: false
  }
};

const repairValues = {
  CLERK_ISSUER: "https://clerk.customcard.app",
  CLERK_AUDIENCE: "customcard-api",
  IDEMPOTENCY_KEY_TTL_HOURS: "24"
};

describe("hosted Vercel env repair", () => {
  it("fails closed before inspecting or applying without the explicit guard", async () => {
    const inventoryRunner = vi.fn();
    const commandRunner = vi.fn();

    const report = await runHostedVercelEnvRepair({
      env: {},
      inventoryRunner,
      commandRunner
    });

    expect(report).toMatchObject({
      service: "customcard-hosted-vercel-env-repair",
      status: "blocked",
      scope: "live-hosted-env-repair",
      applyEnabled: false,
      valuesRedacted: true,
      envSync: {
        environmentSynced: false
      }
    });
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "--confirm-hosted-env-repair is required before hosted Vercel env repair can inspect or apply missing keys."
      ])
    );
    expect(inventoryRunner).not.toHaveBeenCalled();
    expect(commandRunner).not.toHaveBeenCalled();
  });

  it("builds a redacted plan for missing production keys without mutating Vercel", async () => {
    const commandRunner = vi.fn();

    const report = await runHostedVercelEnvRepair({
      env: {
        ...repairValues
      },
      inventoryRunner: vi.fn(async () => missingInventory),
      commandRunner,
      now: new Date("2026-06-15T16:00:00.000Z"),
      enabled: true
    });

    expect(report).toMatchObject({
      status: "ready",
      targetEnvironment: "production",
      vercelTarget: "production",
      checkedAt: "2026-06-15T16:00:00.000Z",
      applyEnabled: false,
      valuesRedacted: true,
      missingRepairKeys: ["CLERK_ISSUER", "CLERK_AUDIENCE", "IDEMPOTENCY_KEY_TTL_HOURS"],
      aiCardCopySetup: {
        productionModelOverridePresent: false,
        localProductionTextComfyRequiresHostedImageKeys: false
      },
      envSync: {
        repairKeysMissing: 3,
        repairApplied: false,
        aiCardCopySetupConfigured: true,
        aiCardCopyProductionModelPinned: false,
        environmentSynced: false
      },
      blockers: []
    });
    expect(report.repairPlan).toEqual([
      { key: "CLERK_ISSUER", target: "production", valueSupplied: true, action: "plan-only" },
      { key: "CLERK_AUDIENCE", target: "production", valueSupplied: true, action: "plan-only" },
      { key: "IDEMPOTENCY_KEY_TTL_HOURS", target: "production", valueSupplied: true, action: "plan-only" }
    ]);
    expect(commandRunner).not.toHaveBeenCalled();
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(repairValues.CLERK_ISSUER);
    expect(serialized).not.toContain(repairValues.CLERK_AUDIENCE);
    expect(serialized).not.toContain(repairValues.IDEMPOTENCY_KEY_TTL_HOURS);
  });

  it("blocks apply when production acknowledgment or values are missing", async () => {
    const commandRunner = vi.fn();

    const report = await runHostedVercelEnvRepair({
      env: {
        CLERK_ISSUER: "https://clerk.customcard.app",
        CLERK_AUDIENCE: "customcard-api"
      },
      inventoryRunner: vi.fn(async () => missingInventory),
      commandRunner,
      enabled: true,
      apply: true
    });

    expect(report.status).toBe("blocked");
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "IDEMPOTENCY_KEY_TTL_HOURS must be supplied in the process env before repair can apply it.",
        "--acknowledge-production is required before production env keys are added."
      ])
    );
    expect(commandRunner).not.toHaveBeenCalled();
  });

  it("applies missing keys only after explicit apply and production acknowledgment", async () => {
    const commandRunner = vi.fn(async ({ key, target }) => ({ key, target, exitCode: 0 }));

    const report = await runHostedVercelEnvRepair({
      env: {
        ...repairValues
      },
      inventoryRunner: vi.fn(async () => missingInventory),
      commandRunner,
      enabled: true,
      apply: true,
      acknowledgeProduction: true
    });

    expect(report).toMatchObject({
      status: "ready",
      applyEnabled: true,
      valuesRedacted: true,
      envSync: {
        repairKeysMissing: 3,
        repairApplied: true,
        aiCardCopySetupConfigured: true,
        aiCardCopyProductionModelPinned: false,
        environmentSynced: false
      },
      blockers: []
    });
    expect(commandRunner).toHaveBeenCalledTimes(3);
    expect(report.applyResults).toEqual([
      { key: "CLERK_ISSUER", target: "production", exitCode: 0 },
      { key: "CLERK_AUDIENCE", target: "production", exitCode: 0 },
      { key: "IDEMPOTENCY_KEY_TTL_HOURS", target: "production", exitCode: 0 }
    ]);
    expect(JSON.stringify(report)).not.toContain(repairValues.CLERK_ISSUER);
  });

  it("can partially apply the non-secret TTL while remaining blocked on missing Clerk values", async () => {
    const commandRunner = vi.fn(async ({ key, target }) => ({ key, target, exitCode: 0 }));

    const report = await runHostedVercelEnvRepair({
      env: {
        IDEMPOTENCY_KEY_TTL_HOURS: "24"
      },
      inventoryRunner: vi.fn(async () => missingInventory),
      commandRunner,
      enabled: true,
      apply: true,
      allowPartialApply: true,
      acknowledgeProduction: true
    });

    expect(report).toMatchObject({
      status: "blocked",
      applyEnabled: true,
      partialApplyEnabled: true,
      valuesRedacted: true,
      appliedRepairKeys: ["IDEMPOTENCY_KEY_TTL_HOURS"],
      remainingUnappliedRepairKeys: ["CLERK_ISSUER", "CLERK_AUDIENCE"],
      envSync: {
        repairKeysMissing: 3,
        repairApplied: false,
        partialRepairApplied: true,
        aiCardCopySetupConfigured: true,
        aiCardCopyProductionModelPinned: false,
        environmentSynced: false
      }
    });
    expect(report.repairPlan).toEqual([
      { key: "CLERK_ISSUER", target: "production", valueSupplied: false, action: "blocked-missing-value" },
      { key: "CLERK_AUDIENCE", target: "production", valueSupplied: false, action: "blocked-missing-value" },
      { key: "IDEMPOTENCY_KEY_TTL_HOURS", target: "production", valueSupplied: true, action: "vercel-env-add" }
    ]);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "CLERK_ISSUER must be supplied in the process env before repair can apply it.",
        "CLERK_AUDIENCE must be supplied in the process env before repair can apply it."
      ])
    );
    expect(report.blockers).not.toContain(
      "IDEMPOTENCY_KEY_TTL_HOURS must be supplied in the process env before repair can apply it."
    );
    expect(commandRunner).toHaveBeenCalledTimes(1);
    expect(commandRunner).toHaveBeenCalledWith(
      expect.objectContaining({ key: "IDEMPOTENCY_KEY_TTL_HOURS", value: "24", target: "production" })
    );
    expect(JSON.stringify(report)).not.toContain(`"IDEMPOTENCY_KEY_TTL_HOURS":"${repairValues.IDEMPOTENCY_KEY_TTL_HOURS}"`);
  });
});
