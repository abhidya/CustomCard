import { describe, expect, it } from "vitest";
import {
  accountAuthTableContracts,
  buildAccountAuthReadiness,
  requiredHostedAuthAdapterIds,
  validateAccountAuthContracts,
  type AccountAuthTableContract
} from "./accountAuth";
import { providerCatalog, type ProviderAdapter } from "./providerCatalog";

describe("account auth contracts", () => {
  it("keeps hosted identity adapters credential-gated with session hardening requirements", () => {
    const readiness = buildAccountAuthReadiness();

    expect(readiness.status).toBe("ready");
    expect(readiness.providers.hostedIdentityAdapters).toBe(requiredHostedAuthAdapterIds.length);
    expect(readiness.providers.credentialGated).toBe(requiredHostedAuthAdapterIds.length);
    expect(readiness.providers.contractOnly).toBeGreaterThanOrEqual(1);
    expect(readiness.providers.requiredEnv).toEqual(
      expect.arrayContaining([
        "AUTH0_DOMAIN",
        "AUTH_SESSION_SECRET",
        "CLERK_SECRET_KEY",
        "COGNITO_USER_POOL_ID",
        "FIREBASE_SERVICE_ACCOUNT_JSON",
        "SUPABASE_SERVICE_ROLE_KEY"
      ])
    );
    expect(readiness.sessionPolicy).toEqual({
      sessionHashAlgorithm: "sha256",
      cookiePolicy: "HttpOnly; Secure; SameSite=Lax",
      defaultTtlHours: 24,
      recoveryChallengeTtlMinutes: 30
    });
    expect(readiness.blockers).toEqual([]);
  });

  it("models durable account identity and recovery storage without raw profiles or secrets", () => {
    expect(accountAuthTableContracts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "account_identities",
          requiredColumns: expect.arrayContaining(["provider_subject", "raw_profile_stored", "claims_schema"]),
          indexes: expect.arrayContaining(["idx_account_identities_provider_subject"]),
          rawProfileStored: false,
          rawSecretStored: false
        }),
        expect.objectContaining({
          name: "account_recovery_challenges",
          requiredColumns: expect.arrayContaining(["challenge_hash", "expires_at", "used_at"]),
          indexes: expect.arrayContaining(["idx_account_recovery_challenge_hash"]),
          expiryRequired: true,
          rawSecretStored: false
        })
      ])
    );
    expect(buildAccountAuthReadiness().storage).toEqual({
      identityTable: true,
      recoveryTable: true,
      hashedRecoveryChallenges: true,
      rawProfilesStored: false,
      rawSecretsStored: false
    });
  });

  it("flags missing hosted providers and unsafe account storage contracts", () => {
    const adaptersWithoutAuth0: ProviderAdapter[] = providerCatalog.filter((adapter) => adapter.id !== "auth0-oidc-auth");
    const unsafeTables: AccountAuthTableContract[] = accountAuthTableContracts.map((table) =>
      table.name === "account_recovery_challenges"
        ? { ...table, requiredColumns: table.requiredColumns.filter((column) => column !== "challenge_hash"), expiryRequired: false }
        : table
    );

    expect(validateAccountAuthContracts(adaptersWithoutAuth0, unsafeTables)).toEqual(
      expect.arrayContaining([
        "Missing hosted auth adapter: auth0-oidc-auth",
        "account_recovery_challenges must include hashed recovery columns.",
        "account_recovery_challenges must expire."
      ])
    );
  });
});
