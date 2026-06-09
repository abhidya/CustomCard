/**
 * OAuth 2.0 flow contracts for calendar and email provider integrations.
 *
 * Gates: liveOAuthEnabled and storesProviderCredentials are hardcoded false here.
 * Flipping them requires: OAuth app registration, scope review, token storage
 * design review, and credential boundary sign-off (see D003, D008).
 *
 * Supported providers:
 *   google-calendar  — read-only calendar event metadata
 *   google-gmail     — read-only message metadata (no bodies)
 *   microsoft-outlook — read-only calendar event metadata
 */

export type OAuthProvider = "google-calendar" | "google-gmail" | "microsoft-outlook";
export type OAuthGrantType = "authorization_code" | "refresh_token";
export type OAuthRevocationTokenHint = "access_token" | "refresh_token";

/** Scopes approved for metadata-only import (D003). Raw content scopes are forbidden. */
export interface OAuthScopePolicy {
  provider: OAuthProvider;
  metadataScopes: string[];
  forbiddenScopes: string[];
  officialScopeDocUrl: string;
}

export const oauthScopePolicies: OAuthScopePolicy[] = [
  {
    provider: "google-calendar",
    metadataScopes: [
      "https://www.googleapis.com/auth/calendar.events.readonly",
      "https://www.googleapis.com/auth/calendar.readonly"
    ],
    forbiddenScopes: [
      "https://mail.google.com/",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/drive"
    ],
    officialScopeDocUrl: "https://developers.google.com/calendar/api/auth"
  },
  {
    provider: "google-gmail",
    metadataScopes: ["https://www.googleapis.com/auth/gmail.metadata"],
    forbiddenScopes: [
      "https://mail.google.com/",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify"
    ],
    officialScopeDocUrl: "https://developers.google.com/gmail/api/auth/scopes"
  },
  {
    provider: "microsoft-outlook",
    metadataScopes: ["Calendars.Read"],
    forbiddenScopes: ["Mail.Read", "Mail.ReadWrite", "Files.Read", "Files.ReadWrite"],
    officialScopeDocUrl: "https://learn.microsoft.com/en-us/graph/permissions-reference"
  }
];

/** Parameters used to construct the provider authorization URL. */
export interface OAuthAuthorizationParams {
  provider: OAuthProvider;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  accessType: "offline";
}

/**
 * The constructed authorization URL sent to the browser.
 * liveOAuthEnabled is false — must be flipped by operator config at runtime.
 */
export interface OAuthAuthorizationUrl {
  provider: OAuthProvider;
  url: string;
  state: string;
  scopes: string[];
  liveOAuthEnabled: false;
}

/** Parameters received on the OAuth callback redirect. */
export interface OAuthCallbackParams {
  code: string;
  state: string;
  scope?: string;
  error?: string;
  errorDescription?: string;
}

/** Token exchange request (code → access + refresh). */
export interface OAuthTokenRequest {
  provider: OAuthProvider;
  grantType: OAuthGrantType;
  code?: string;
  refreshToken?: string;
  redirectUri: string;
  clientId: string;
  codeVerifier: string;
}

/** Raw token response from the provider. */
export interface OAuthTokenResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  refreshToken?: string;
  scope: string;
}

/**
 * What CustomCard stores after a successful OAuth exchange.
 * storesProviderCredentials is false — no persistence until user-consent
 * flow and storage design are reviewed (D003).
 */
export interface OAuthCredentialRecord {
  provider: OAuthProvider;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  grantedScopes: string[];
  rawContentAllowed: false;
  storesProviderCredentials: false;
}

/** Token revocation request. */
export interface OAuthRevocationRequest {
  provider: OAuthProvider;
  token: string;
  tokenTypeHint: OAuthRevocationTokenHint;
}

/** Result of a revocation attempt. */
export interface OAuthRevocationResult {
  provider: OAuthProvider;
  revoked: boolean;
  error?: string;
}

/** Full contract for one provider's OAuth integration. */
export interface OAuthProviderContract {
  provider: OAuthProvider;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint: string;
  scopePolicy: OAuthScopePolicy;
  requiresPkce: true;
  supportsRefreshToken: boolean;
  liveOAuthEnabled: false;
  storesProviderCredentials: false;
  rawContentAllowed: false;
  requiredEnvVars: string[];
  blockedReasons: string[];
}

export const oauthProviderContracts: OAuthProviderContract[] = [
  {
    provider: "google-calendar",
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    revocationEndpoint: "https://oauth2.googleapis.com/revoke",
    scopePolicy: oauthScopePolicies.find((p) => p.provider === "google-calendar")!,
    requiresPkce: true,
    supportsRefreshToken: true,
    liveOAuthEnabled: false,
    storesProviderCredentials: false,
    rawContentAllowed: false,
    requiredEnvVars: ["VITE_GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    blockedReasons: [
      "Google OAuth app not registered — requires Google Cloud Console project.",
      "Scopes not reviewed for production — requires security sign-off.",
      "No token storage design — credential persistence needs user consent flow."
    ]
  },
  {
    provider: "google-gmail",
    authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    revocationEndpoint: "https://oauth2.googleapis.com/revoke",
    scopePolicy: oauthScopePolicies.find((p) => p.provider === "google-gmail")!,
    requiresPkce: true,
    supportsRefreshToken: true,
    liveOAuthEnabled: false,
    storesProviderCredentials: false,
    rawContentAllowed: false,
    requiredEnvVars: ["VITE_GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    blockedReasons: [
      "Gmail metadata scope requires Google OAuth app verification for production.",
      "Metadata-only posture (gmail.metadata scope) must be confirmed before any broader access.",
      "No token storage design — credential persistence needs user consent flow."
    ]
  },
  {
    provider: "microsoft-outlook",
    authorizationEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    revocationEndpoint: "https://graph.microsoft.com/v1.0/me/revokeSignInSessions",
    scopePolicy: oauthScopePolicies.find((p) => p.provider === "microsoft-outlook")!,
    requiresPkce: true,
    supportsRefreshToken: true,
    liveOAuthEnabled: false,
    storesProviderCredentials: false,
    rawContentAllowed: false,
    requiredEnvVars: ["VITE_MICROSOFT_CLIENT_ID", "MICROSOFT_TENANT_ID"],
    blockedReasons: [
      "Microsoft Entra app registration required — Azure portal setup needed.",
      "Calendars.Read scope sign-off required before production.",
      "No token storage design — credential persistence needs user consent flow."
    ]
  }
];

/** Validate an authorization request before constructing the URL. */
export function validateOAuthAuthorizationParams(params: OAuthAuthorizationParams): string[] {
  const issues: string[] = [];
  const contract = oauthProviderContracts.find((c) => c.provider === params.provider);

  if (!contract) {
    issues.push(`No OAuth contract found for provider: ${params.provider}.`);
    return issues;
  }

  if (!params.clientId) issues.push("OAuth authorization requires a clientId.");
  if (!params.redirectUri) issues.push("OAuth authorization requires a redirectUri.");
  if (!params.state || params.state.length < 16) {
    issues.push("OAuth state must be at least 16 characters (CSRF protection).");
  }
  if (!params.codeChallenge) issues.push("OAuth authorization requires PKCE codeChallenge.");
  if (params.codeChallengeMethod !== "S256") {
    issues.push("OAuth PKCE must use S256 code challenge method.");
  }
  if (params.scopes.length === 0) issues.push("OAuth authorization requires at least one scope.");

  for (const scope of params.scopes) {
    if (contract.scopePolicy.forbiddenScopes.includes(scope)) {
      issues.push(`Forbidden scope requested: ${scope} — raw content access not allowed (D003).`);
    }
  }

  const approvedScopeSet = new Set(contract.scopePolicy.metadataScopes);
  for (const scope of params.scopes) {
    if (!approvedScopeSet.has(scope)) {
      issues.push(`Unapproved scope: ${scope} — only metadata scopes are permitted.`);
    }
  }

  return issues;
}

/** Validate an OAuth callback before exchanging the code. */
export function validateOAuthCallback(params: OAuthCallbackParams, expectedState: string): string[] {
  const issues: string[] = [];

  if (params.error) {
    issues.push(`OAuth provider returned error: ${params.error}${params.errorDescription ? ` — ${params.errorDescription}` : ""}.`);
  }
  if (!params.code && !params.error) {
    issues.push("OAuth callback missing authorization code.");
  }
  if (params.state !== expectedState) {
    issues.push("OAuth state mismatch — possible CSRF attempt, callback must be rejected.");
  }

  return issues;
}

/** Validate a token response before storing any credentials. */
export function validateOAuthTokenResponse(response: OAuthTokenResponse, provider: OAuthProvider): string[] {
  const issues: string[] = [];
  const contract = oauthProviderContracts.find((c) => c.provider === provider);

  if (!contract) {
    issues.push(`No contract for provider: ${provider}.`);
    return issues;
  }

  if (!response.accessToken) issues.push("Token response missing access_token.");
  if (response.tokenType !== "Bearer") issues.push("Token type must be Bearer.");
  if (response.expiresIn <= 0) issues.push("Token expiry must be a positive number of seconds.");

  const grantedScopes = response.scope.split(/[ ,]+/).filter(Boolean);
  for (const scope of grantedScopes) {
    if (contract.scopePolicy.forbiddenScopes.includes(scope)) {
      issues.push(`Provider granted forbidden scope: ${scope} — token must be revoked immediately.`);
    }
  }

  return issues;
}

/** Build an OAuthCredentialRecord from a validated token response. */
export function buildOAuthCredentialRecord(
  provider: OAuthProvider,
  response: OAuthTokenResponse,
  nowMs: number
): OAuthCredentialRecord {
  return {
    provider,
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: nowMs + response.expiresIn * 1000,
    grantedScopes: response.scope.split(/[ ,]+/).filter(Boolean),
    rawContentAllowed: false,
    storesProviderCredentials: false
  };
}

/** Validate a stored credential before using it. */
export function validateOAuthCredentialRecord(record: OAuthCredentialRecord, nowMs: number): string[] {
  const issues: string[] = [];

  if (record.rawContentAllowed) {
    issues.push("Credential record must not allow raw content access (D003).");
  }
  if (record.storesProviderCredentials) {
    issues.push("Credential record must not claim credential persistence until storage design is reviewed.");
  }
  if (record.expiresAt <= nowMs) {
    issues.push("Credential has expired — refresh or re-authorize required.");
  }
  if (!record.accessToken) {
    issues.push("Credential record missing access token.");
  }

  return issues;
}
