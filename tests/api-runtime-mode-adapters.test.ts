import { describe, expect, it } from "vitest";
import {
  authSessionSecretMessage,
  describeApiRuntimeModeAdapters,
  productionRuntimeModeMessage,
  resolveApiRuntimeModeAdapter
} from "../scripts/api-runtime-mode-adapters.mjs";

const factories = {
  contract: () => ({ mode: "contract" }),
  memory: () => ({ mode: "memory" }),
  postgres: () => ({ mode: "postgres" })
};

describe("api runtime mode adapters", () => {
  it("names the runtime mode adapters in contract order", () => {
    expect(describeApiRuntimeModeAdapters()).toEqual(["contract", "memory", "postgres"]);
  });

  it("defaults local runtime to contract adapter", () => {
    const adapter = resolveApiRuntimeModeAdapter({ env: {}, factories });

    expect(adapter).toMatchObject({
      mode: "contract",
      requestedMode: "contract"
    });
    expect(adapter.create?.({})).toEqual({ mode: "contract" });
  });

  it("fails closed for invalid modes and non-postgres production runtime", () => {
    expect(resolveApiRuntimeModeAdapter({ env: { CUSTOMCARD_API_RUNTIME: "surprise" }, factories })).toMatchObject({
      mode: "invalid",
      requestedMode: "surprise",
      blockers: ["Unsupported CUSTOMCARD_API_RUNTIME: surprise. Expected contract, memory, or postgres."]
    });

    expect(resolveApiRuntimeModeAdapter({ env: { NODE_ENV: "production" }, factories })).toMatchObject({
      mode: "invalid",
      requestedMode: "(missing)",
      blockers: [productionRuntimeModeMessage]
    });
  });

  it("gates postgres adapter on durable production env and strong session secret", () => {
    expect(
      resolveApiRuntimeModeAdapter({
        env: {
          CUSTOMCARD_API_RUNTIME: "postgres",
          DATABASE_URL: "postgres://example/customcard",
          AUTH_SESSION_SECRET: "short"
        },
        factories
      })
    ).toMatchObject({
      mode: "invalid",
      requestedMode: "postgres",
      blockers: [authSessionSecretMessage]
    });

    expect(
      resolveApiRuntimeModeAdapter({
        env: {
          CUSTOMCARD_ENV: "production",
          CUSTOMCARD_API_RUNTIME: "postgres",
          DATABASE_URL: "postgres://customcard.local/customcard",
          AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
          OBJECT_STORE_SIGNING_SECRET: "test-object-store-signing-secret-32",
          OBJECT_STORE_URL: "https://objects.customcard.test",
          QUEUE_URL: "redis://example",
          REAL_ORDER_KILL_SWITCH: "disabled"
        },
        factories
      }).mode
    ).toBe("postgres");
  });
});
