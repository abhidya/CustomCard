import { describe, expect, it } from "vitest";
import {
  buildOAuthCredentialRecord,
  oauthProviderContracts,
  oauthScopePolicies,
  validateOAuthAuthorizationParams,
  validateOAuthCallback,
  validateOAuthCredentialRecord,
  validateOAuthTokenResponse,
  type OAuthAuthorizationParams,
  type OAuthCallbackParams,
  type OAuthTokenResponse
} from "./oauthFlowContract";

const validGoogleCalendarParams: OAuthAuthorizationParams = {
  provider: "google-calendar",
  clientId: "123-abc.apps.googleusercontent.com",
  redirectUri: "http://localhost:5173/oauth/callback",
  scopes: ["https://www.googleapis.com/auth/calendar.events.readonly"],
  state: "csrf-random-state-token-16chars",
  codeChallenge: "abc123codeChallenge",
  codeChallengeMethod: "S256",
  accessType: "offline"
};

const validTokenResponse: OAuthTokenResponse = {
  accessToken: "ya29.access-token",
  tokenType: "Bearer",
  expiresIn: 3600,
  refreshToken: "1//refresh-token",
  scope: "https://www.googleapis.com/auth/calendar.events.readonly"
};

describe("OAuth provider contracts", () => {
  it("has contracts for all three providers", () => {
    const providers = oauthProviderContracts.map((c) => c.provider);
    expect(providers).toContain("google-calendar");
    expect(providers).toContain("google-gmail");
    expect(providers).toContain("microsoft-outlook");
  });

  it("keeps liveOAuthEnabled false on every provider contract", () => {
    for (const contract of oauthProviderContracts) {
      expect(contract.liveOAuthEnabled).toBe(false);
    }
  });

  it("keeps storesProviderCredentials false on every provider contract", () => {
    for (const contract of oauthProviderContracts) {
      expect(contract.storesProviderCredentials).toBe(false);
    }
  });

  it("keeps rawContentAllowed false on every provider contract", () => {
    for (const contract of oauthProviderContracts) {
      expect(contract.rawContentAllowed).toBe(false);
    }
  });

  it("requires PKCE on every provider contract", () => {
    for (const contract of oauthProviderContracts) {
      expect(contract.requiresPkce).toBe(true);
    }
  });

  it("lists required env vars for each provider", () => {
    for (const contract of oauthProviderContracts) {
      expect(contract.requiredEnvVars.length).toBeGreaterThan(0);
    }
  });

  it("uses canonical Google OAuth env names for Google providers", () => {
    for (const provider of ["google-calendar", "google-gmail"] as const) {
      expect(oauthProviderContracts.find((contract) => contract.provider === provider)?.requiredEnvVars).toEqual([
        "GOOGLE_OAUTH_CLIENT_ID",
        "GOOGLE_OAUTH_CLIENT_SECRET"
      ]);
    }
  });

  it("lists blocked reasons for each provider", () => {
    for (const contract of oauthProviderContracts) {
      expect(contract.blockedReasons.length).toBeGreaterThan(0);
    }
  });
});

describe("OAuth scope policies", () => {
  it("has scope policies for all three providers", () => {
    const providers = oauthScopePolicies.map((p) => p.provider);
    expect(providers).toContain("google-calendar");
    expect(providers).toContain("google-gmail");
    expect(providers).toContain("microsoft-outlook");
  });

  it("forbids gmail full-access on google-calendar provider", () => {
    const policy = oauthScopePolicies.find((p) => p.provider === "google-calendar")!;
    expect(policy.forbiddenScopes).toContain("https://mail.google.com/");
  });

  it("forbids mail read on google-gmail provider", () => {
    const policy = oauthScopePolicies.find((p) => p.provider === "google-gmail")!;
    expect(policy.forbiddenScopes).toContain("https://www.googleapis.com/auth/gmail.readonly");
  });

  it("permits only Calendars.Read for microsoft-outlook", () => {
    const policy = oauthScopePolicies.find((p) => p.provider === "microsoft-outlook")!;
    expect(policy.metadataScopes).toContain("Calendars.Read");
    expect(policy.forbiddenScopes).toContain("Mail.Read");
  });

  it("links to official scope documentation for every provider", () => {
    for (const policy of oauthScopePolicies) {
      expect(policy.officialScopeDocUrl).toMatch(/^https:\/\//);
    }
  });
});

describe("validateOAuthAuthorizationParams", () => {
  it("passes valid google-calendar params", () => {
    expect(validateOAuthAuthorizationParams(validGoogleCalendarParams)).toEqual([]);
  });

  it("rejects empty clientId", () => {
    const issues = validateOAuthAuthorizationParams({ ...validGoogleCalendarParams, clientId: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("clientId")]));
  });

  it("rejects missing redirectUri", () => {
    const issues = validateOAuthAuthorizationParams({ ...validGoogleCalendarParams, redirectUri: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("redirectUri")]));
  });

  it("rejects short state (CSRF risk)", () => {
    const issues = validateOAuthAuthorizationParams({ ...validGoogleCalendarParams, state: "short" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("16 characters")]));
  });

  it("rejects missing codeChallenge", () => {
    const issues = validateOAuthAuthorizationParams({ ...validGoogleCalendarParams, codeChallenge: "" });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("PKCE")]));
  });

  it("rejects plain code challenge method", () => {
    const issues = validateOAuthAuthorizationParams({
      ...validGoogleCalendarParams,
      codeChallengeMethod: "plain" as "S256"
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("S256")]));
  });

  it("rejects forbidden scope (raw gmail access)", () => {
    const issues = validateOAuthAuthorizationParams({
      ...validGoogleCalendarParams,
      scopes: ["https://mail.google.com/"]
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("Forbidden scope")]));
    expect(issues.join(" ")).toContain("D003");
  });

  it("rejects unapproved scope (drive)", () => {
    const issues = validateOAuthAuthorizationParams({
      ...validGoogleCalendarParams,
      scopes: ["https://www.googleapis.com/auth/drive"]
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("Forbidden scope")]));
  });

  it("rejects empty scopes list", () => {
    const issues = validateOAuthAuthorizationParams({ ...validGoogleCalendarParams, scopes: [] });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("scope")]));
  });

  it("rejects unknown provider", () => {
    const issues = validateOAuthAuthorizationParams({
      ...validGoogleCalendarParams,
      provider: "unknown-provider" as "google-calendar"
    });
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("No OAuth contract")]));
  });
});

describe("validateOAuthCallback", () => {
  it("passes valid callback", () => {
    const callback: OAuthCallbackParams = { code: "4/0AbCD", state: "csrf-random-state-token-16chars" };
    expect(validateOAuthCallback(callback, "csrf-random-state-token-16chars")).toEqual([]);
  });

  it("rejects state mismatch", () => {
    const callback: OAuthCallbackParams = { code: "4/0AbCD", state: "wrong-state" };
    const issues = validateOAuthCallback(callback, "csrf-random-state-token-16chars");
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("state mismatch")]));
    expect(issues.join(" ")).toContain("CSRF");
  });

  it("surfaces provider error in issues", () => {
    const callback: OAuthCallbackParams = {
      code: "",
      state: "csrf-random-state-token-16chars",
      error: "access_denied",
      errorDescription: "User denied access"
    };
    const issues = validateOAuthCallback(callback, "csrf-random-state-token-16chars");
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("access_denied")]));
  });

  it("rejects missing code when no error", () => {
    const callback: OAuthCallbackParams = { code: "", state: "csrf-random-state-token-16chars" };
    const issues = validateOAuthCallback(callback, "csrf-random-state-token-16chars");
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("authorization code")]));
  });
});

describe("validateOAuthTokenResponse", () => {
  it("passes valid google-calendar token response", () => {
    expect(validateOAuthTokenResponse(validTokenResponse, "google-calendar")).toEqual([]);
  });

  it("rejects missing access token", () => {
    const issues = validateOAuthTokenResponse({ ...validTokenResponse, accessToken: "" }, "google-calendar");
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("access_token")]));
  });

  it("rejects non-Bearer token type", () => {
    const issues = validateOAuthTokenResponse(
      { ...validTokenResponse, tokenType: "MAC" as "Bearer" },
      "google-calendar"
    );
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("Bearer")]));
  });

  it("rejects zero or negative expiry", () => {
    const issues = validateOAuthTokenResponse({ ...validTokenResponse, expiresIn: 0 }, "google-calendar");
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("expiry")]));
  });

  it("rejects token response that granted forbidden scope", () => {
    const issues = validateOAuthTokenResponse(
      { ...validTokenResponse, scope: "https://mail.google.com/" },
      "google-calendar"
    );
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("forbidden scope")]));
    expect(issues.join(" ")).toContain("revoked");
  });
});

describe("buildOAuthCredentialRecord", () => {
  const nowMs = 1_700_000_000_000;

  it("builds a valid credential record", () => {
    const record = buildOAuthCredentialRecord("google-calendar", validTokenResponse, nowMs);
    expect(record.provider).toBe("google-calendar");
    expect(record.accessToken).toBe("ya29.access-token");
    expect(record.refreshToken).toBe("1//refresh-token");
    expect(record.expiresAt).toBe(nowMs + 3600 * 1000);
    expect(record.rawContentAllowed).toBe(false);
    expect(record.storesProviderCredentials).toBe(false);
    expect(record.grantedScopes).toContain("https://www.googleapis.com/auth/calendar.events.readonly");
  });
});

describe("validateOAuthCredentialRecord", () => {
  const nowMs = 1_700_000_000_000;

  it("passes a fresh valid credential", () => {
    const record = buildOAuthCredentialRecord("google-calendar", validTokenResponse, nowMs);
    expect(validateOAuthCredentialRecord(record, nowMs)).toEqual([]);
  });

  it("rejects expired credential", () => {
    const record = buildOAuthCredentialRecord("google-calendar", validTokenResponse, nowMs - 7200_000);
    const issues = validateOAuthCredentialRecord(record, nowMs);
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("expired")]));
  });

  it("rejects credential claiming raw content allowed", () => {
    const record = buildOAuthCredentialRecord("google-calendar", validTokenResponse, nowMs);
    const issues = validateOAuthCredentialRecord({ ...record, rawContentAllowed: true as false }, nowMs);
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("raw content")]));
  });

  it("rejects credential claiming credential persistence", () => {
    const record = buildOAuthCredentialRecord("google-calendar", validTokenResponse, nowMs);
    const issues = validateOAuthCredentialRecord(
      { ...record, storesProviderCredentials: true as false },
      nowMs
    );
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining("credential persistence")]));
  });
});
