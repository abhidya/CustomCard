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
  CLERK_JWT_KEY: "-----BEGIN PUBLIC KEY-----\\ntest-clerk-jwt-key\\n-----END PUBLIC KEY-----",
  CLERK_AUTHORIZED_PARTIES: "https://customcard.test",
  CLERK_ISSUER: "https://clerk.customcard.test",
  CLERK_AUDIENCE: "customcard-api",
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
        OBJECT_STORE_URL: "",
        CLERK_JWT_KEY: "",
        CLERK_AUTHORIZED_PARTIES: "replace-me"
      })
    ).toMatchObject({
      missing: ["OBJECT_STORE_URL", "CLERK_JWT_KEY"],
      placeholders: ["DATABASE_URL", "CLERK_AUTHORIZED_PARTIES"]
    });
  });

  it("does not require worker-only queue env for the serverless API runtime", () => {
    expect(validateDurableRuntimeEnv({ ...durableEnv, QUEUE_URL: "" })).toMatchObject({
      missing: [],
      placeholders: [],
      blockers: []
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
    expect(validateWorkerRuntimeEnv({ ...durableEnv, QUEUE_URL: "" })).not.toContain(
      "CustomCard worker missing env: QUEUE_URL"
    );
    expect(validateMobileRuntimeEnv({})).toEqual([
      "Mobile shell missing env: CUSTOMCARD_APP_ENV",
      "Mobile shell missing env: CUSTOMCARD_OAUTH_REDIRECT_URL",
      "Mobile shell missing env: EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
      "Mobile shell missing env: CUSTOMCARD_API_BASE_URL"
    ]);
    expect(
      validateMobileRuntimeEnv({
        CUSTOMCARD_API_BASE_URL: "replace-me",
        CUSTOMCARD_APP_ENV: "qa",
        CUSTOMCARD_OAUTH_REDIRECT_URL: "customcard://sso-callback",
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_customcard"
      })
    ).toEqual([
      "Mobile shell has placeholder env: CUSTOMCARD_API_BASE_URL",
      "Mobile shell CUSTOMCARD_QA_API_BASE_URL or CUSTOMCARD_API_BASE_URL must be an https:// URL."
    ]);
    expect(
      validateMobileRuntimeEnv({
        CUSTOMCARD_API_BASE_URL: "http://127.0.0.1:5173",
        CUSTOMCARD_APP_ENV: "qa",
        CUSTOMCARD_OAUTH_REDIRECT_URL: "customcard://sso-callback",
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_customcard"
      })
    ).toEqual([
      "Mobile shell CUSTOMCARD_QA_API_BASE_URL or CUSTOMCARD_API_BASE_URL must be an https:// URL."
    ]);
    expect(
      validateMobileRuntimeEnv({
        CUSTOMCARD_API_BASE_URL: "https://api.customcard.test",
        CUSTOMCARD_APP_ENV: "qa",
        CUSTOMCARD_OAUTH_REDIRECT_URL: "https://customcard.test/sso-callback",
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_customcard"
      })
    ).toEqual(["Mobile shell CUSTOMCARD_OAUTH_REDIRECT_URL must be customcard://sso-callback."]);
    expect(
      validateMobileRuntimeEnv({
        CUSTOMCARD_QA_API_BASE_URL: "https://api.qa.customcard.test",
        CUSTOMCARD_APP_ENV: "qa",
        CUSTOMCARD_OAUTH_REDIRECT_URL: "customcard://sso-callback",
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_customcard"
      })
    ).toEqual([]);
    expect(
      validateMobileRuntimeEnv({
        CUSTOMCARD_API_BASE_URL: "https://api.customcard.test",
        CUSTOMCARD_PRODUCTION_API_BASE_URL: "https://api.customcard.test",
        CUSTOMCARD_APP_ENV: "production",
        CUSTOMCARD_OAUTH_REDIRECT_URL: "customcard://sso-callback",
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_customcard"
      })
    ).toEqual([]);
    expect(
      validateMobileRuntimeEnv({
        CUSTOMCARD_API_BASE_URL: "https://api.wrong.customcard.test",
        CUSTOMCARD_QA_API_BASE_URL: "https://api.qa.customcard.test",
        CUSTOMCARD_APP_ENV: "qa",
        CUSTOMCARD_OAUTH_REDIRECT_URL: "customcard://sso-callback",
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_customcard"
      })
    ).toEqual([
      "Mobile shell CUSTOMCARD_QA_API_BASE_URL or CUSTOMCARD_API_BASE_URL must not conflict with CUSTOMCARD_API_BASE_URL.",
      "Mobile QA shell requires a Clerk test publishable key."
    ]);
  });
});
