import { providerCatalog, type ProviderAdapter } from "./providerCatalog";

export type AccountRole = "customer" | "admin";
export type AccountAuthTableName = "account_identities" | "account_recovery_challenges";

export interface AccountAuthTableContract {
  name: AccountAuthTableName;
  requiredColumns: string[];
  indexes: string[];
  rawProfileStored: false;
  rawSecretStored: false;
  expiryRequired: boolean;
}

export interface AccountAuthReadinessSummary {
  service: "customcard-account-auth";
  status: "ready" | "blocked";
  providers: {
    totalAuthAdapters: number;
    hostedIdentityAdapters: number;
    credentialGated: number;
    contractOnly: number;
    requiredEnv: string[];
  };
  storage: {
    identityTable: boolean;
    recoveryTable: boolean;
    hashedRecoveryChallenges: boolean;
    rawProfilesStored: false;
    rawSecretsStored: false;
  };
  sessionPolicy: {
    sessionHashAlgorithm: "sha256";
    cookiePolicy: "HttpOnly; Secure; SameSite=Lax";
    defaultTtlHours: 24;
    recoveryChallengeTtlMinutes: 30;
  };
  blockers: string[];
}

export const requiredHostedAuthAdapterIds = [
  "auth0-oidc-auth",
  "clerk-session-auth",
  "supabase-auth",
  "firebase-auth",
  "cognito-hosted-ui-auth"
] as const;

export const accountAuthTableContracts: AccountAuthTableContract[] = [
  {
    name: "account_identities",
    requiredColumns: [
      "id",
      "user_id",
      "provider",
      "provider_subject",
      "email",
      "role",
      "raw_profile_stored",
      "claims_schema",
      "verified_at",
      "last_login_at"
    ],
    indexes: ["idx_account_identities_user", "idx_account_identities_provider_subject"],
    rawProfileStored: false,
    rawSecretStored: false,
    expiryRequired: false
  },
  {
    name: "account_recovery_challenges",
    requiredColumns: ["id", "user_id", "channel", "challenge_hash", "expires_at", "used_at"],
    indexes: ["idx_account_recovery_user", "idx_account_recovery_challenge_hash"],
    rawProfileStored: false,
    rawSecretStored: false,
    expiryRequired: true
  }
];

export function buildAccountAuthReadiness(
  adapters: ProviderAdapter[] = providerCatalog,
  tables: AccountAuthTableContract[] = accountAuthTableContracts
): AccountAuthReadinessSummary {
  const blockers = validateAccountAuthContracts(adapters, tables);
  const authAdapters = adapters.filter((adapter) => adapter.capability === "auth");
  const hostedAdapters = requiredHostedAuthAdapterIds
    .map((adapterId) => adapters.find((adapter) => adapter.id === adapterId))
    .filter((adapter): adapter is ProviderAdapter => Boolean(adapter));

  return {
    service: "customcard-account-auth",
    status: blockers.length === 0 ? "ready" : "blocked",
    providers: {
      totalAuthAdapters: authAdapters.length,
      hostedIdentityAdapters: hostedAdapters.length,
      credentialGated: hostedAdapters.filter((adapter) => adapter.status === "credential-gated").length,
      contractOnly: authAdapters.filter((adapter) => adapter.status === "contract-only").length,
      requiredEnv: uniqueSorted(hostedAdapters.flatMap((adapter) => adapter.credentials))
    },
    storage: {
      identityTable: tables.some((table) => table.name === "account_identities"),
      recoveryTable: tables.some((table) => table.name === "account_recovery_challenges"),
      hashedRecoveryChallenges: Boolean(
        tables.find((table) => table.name === "account_recovery_challenges")?.requiredColumns.includes("challenge_hash")
      ),
      rawProfilesStored: false,
      rawSecretsStored: false
    },
    sessionPolicy: {
      sessionHashAlgorithm: "sha256",
      cookiePolicy: "HttpOnly; Secure; SameSite=Lax",
      defaultTtlHours: 24,
      recoveryChallengeTtlMinutes: 30
    },
    blockers
  };
}

export function validateAccountAuthContracts(
  adapters: ProviderAdapter[] = providerCatalog,
  tables: AccountAuthTableContract[] = accountAuthTableContracts
): string[] {
  const issues: string[] = [];
  const tableByName = new Map(tables.map((table) => [table.name, table]));

  for (const adapterId of requiredHostedAuthAdapterIds) {
    const adapter = adapters.find((candidate) => candidate.id === adapterId);
    if (!adapter) {
      issues.push(`Missing hosted auth adapter: ${adapterId}`);
      continue;
    }
    if (adapter.status !== "credential-gated") issues.push(`Hosted auth adapter ${adapterId} must stay credential-gated.`);
    if (!adapter.credentials.includes("AUTH_SESSION_SECRET")) issues.push(`Hosted auth adapter ${adapterId} must require AUTH_SESSION_SECRET.`);
    if (!adapter.docsUrl?.startsWith("https://")) issues.push(`Hosted auth adapter ${adapterId} must link official docs.`);
    if (!adapter.safetyGates.some((gate) => /revocation/i.test(gate))) {
      issues.push(`Hosted auth adapter ${adapterId} must include revocation handling.`);
    }
  }

  const identityTable = tableByName.get("account_identities");
  if (!identityTable) {
    issues.push("Missing account identity table contract.");
  } else {
    for (const column of ["user_id", "provider", "provider_subject", "role", "raw_profile_stored", "claims_schema"]) {
      if (!identityTable.requiredColumns.includes(column)) issues.push("account_identities must include provider identity columns.");
    }
    if (!identityTable.indexes.includes("idx_account_identities_provider_subject")) {
      issues.push("account_identities must enforce provider subject uniqueness.");
    }
    if (identityTable.rawProfileStored || identityTable.rawSecretStored) {
      issues.push("account_identities must not store raw provider profiles or secrets.");
    }
  }

  const recoveryTable = tableByName.get("account_recovery_challenges");
  if (!recoveryTable) {
    issues.push("Missing account recovery challenge table contract.");
  } else {
    for (const column of ["user_id", "channel", "challenge_hash", "expires_at", "used_at"]) {
      if (!recoveryTable.requiredColumns.includes(column)) issues.push("account_recovery_challenges must include hashed recovery columns.");
    }
    if (!recoveryTable.expiryRequired) issues.push("account_recovery_challenges must expire.");
    if (recoveryTable.rawProfileStored || recoveryTable.rawSecretStored) {
      issues.push("account_recovery_challenges must not store raw recovery secrets.");
    }
  }

  return issues;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}
