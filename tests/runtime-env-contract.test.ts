import { describe, expect, it } from "vitest";
import {
  validateDurableRuntimeEnv,
  validateMobileRuntimeEnv,
  validateWorkerRuntimeEnv
} from "../scripts/runtime-env-contract.mjs";

const durableEnv = {
  CUSTOMCARD_ENV: "production",
  CUSTOMCARD_API_RUNTIME: "postgres",
  DATABASE_URL: "postgres://customcard.local/customcard",
  QUEUE_URL: "redis://customcard.local",
  OBJECT_STORE_URL: "https://objects.customcard.test",
  OBJECT_STORE_SIGNING_SECRET: "test-object-store-signing-secret-32",
  AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
  REAL_ORDER_KILL_SWITCH: "disabled"
};

describe("runtime env contract", () => {
  it("accepts a durable production runtime env", () => {
    expect(validateDurableRuntimeEnv(durableEnv)).toMatchObject({
      missing: [],
      placeholders: [],
      blockers: [],
      runtimeMode: "postgres"
    });
  });

  it("reports missing and placeholder durable runtime env separately", () => {
    expect(
      validateDurableRuntimeEnv({
        ...durableEnv,
        DATABASE_URL: "replace-me",
        QUEUE_URL: ""
      })
    ).toMatchObject({
      missing: ["QUEUE_URL"],
      placeholders: ["DATABASE_URL"]
    });
  });

  it("blocks non-postgres production runtime and unsafe launch switches", () => {
    expect(
      validateDurableRuntimeEnv({
        ...durableEnv,
        CUSTOMCARD_API_RUNTIME: "memory",
        REAL_ORDER_KILL_SWITCH: "enabled",
        AUTH_SESSION_SECRET: "short"
      }).blockers
    ).toEqual(
      expect.arrayContaining([
        "CustomCard production runtime requires CUSTOMCARD_API_RUNTIME=postgres.",
        "CustomCard runtime requires REAL_ORDER_KILL_SWITCH=disabled until certification is recorded.",
        "CustomCard runtime requires AUTH_SESSION_SECRET to be at least 32 characters."
      ])
    );
  });

  it("reuses the contract for worker and mobile env validation", () => {
    expect(validateWorkerRuntimeEnv({ ...durableEnv, CUSTOMCARD_API_RUNTIME: "contract" }, { requirePostgres: true })).toContain(
      "CustomCard worker execution requires CUSTOMCARD_API_RUNTIME=postgres."
    );
    expect(validateWorkerRuntimeEnv({ ...durableEnv, CUSTOMCARD_API_RUNTIME: "surprise" })).toEqual(
      expect.arrayContaining(["CustomCard worker requires CUSTOMCARD_API_RUNTIME to be one of: contract, memory, postgres."])
    );
    expect(validateWorkerRuntimeEnv({ ...durableEnv, REAL_ORDER_KILL_SWITCH: "enabled" })).toEqual(
      expect.arrayContaining(["CustomCard worker requires REAL_ORDER_KILL_SWITCH=disabled until certification is recorded."])
    );
    expect(validateMobileRuntimeEnv({})).toEqual(["Mobile shell missing env: CUSTOMCARD_API_BASE_URL"]);
    expect(validateMobileRuntimeEnv({ CUSTOMCARD_API_BASE_URL: "replace-me" })).toEqual([
      "Mobile shell has placeholder env: CUSTOMCARD_API_BASE_URL"
    ]);
    expect(validateMobileRuntimeEnv({ CUSTOMCARD_API_BASE_URL: "http://127.0.0.1:5173" })).toEqual([]);
  });
});
