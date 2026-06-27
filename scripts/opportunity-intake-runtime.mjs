import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { resolveImportPreviewMetadata } from "../src/importPreviewMetadata.mjs";

const googleCalendarOAuthScopeUri = "https://www.googleapis.com/auth/calendar.events.readonly";
const googleCalendarOAuthRequiredEnv = [
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI",
  "GOOGLE_OAUTH_STATE_SECRET",
  "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY"
];
const clerkGoogleOAuthProvider = "oauth_google";

export function buildImportPreviewContractPayload({ basePayload, requestBody }) {
  const resolvedImport = resolveImportPreviewMetadata(requestBody);
  const payload = resolvedImport.metadataOnlyPayload ?? {};
  const sourceKind = safeId(resolvedImport.sourceKind, "");
  const title = safeText(payload.title, "");
  const recipientName = safeText(payload.recipientName ?? payload.recipient_hint ?? payload.recipientHint, "");
  const startsAt = safeTimestamp(payload.startsAt ?? payload.starts_at, "");
  const eventId = safeId(requestBody.eventId, `event-${stableHash(`${sourceKind}:${title}:${startsAt}`).slice(0, 8)}`);
  const opportunityId = safeId(requestBody.opportunityId, `opportunity-${stableHash(`${eventId}:${recipientName}`).slice(0, 8)}`);
  return {
    ...basePayload,
    rawContentStored: false,
    warnings: resolvedImport.warnings,
    importParser: {
      parsedFromRawText: resolvedImport.parsedFromRawText,
      rawTextField: resolvedImport.rawTextField,
      rawContentStored: false,
      evidenceSummary: resolvedImport.evidenceSummary
    },
    opportunities: [
      {
        opportunityId,
        eventId,
        recipientName,
        title,
        startsAt,
        timezone: safeText(payload.timezone ?? requestBody.timezone, "UTC"),
        confidence: safeConfidence(payload.confidence ?? requestBody.confidence, 0.92),
        decision: safeDecision(payload.decision ?? requestBody.decision)
      }
    ],
    repository: {
      tables: ["provider_connections", "imported_events", "card_opportunities"],
      runtimeMode: "contract",
      persisted: false,
      rawContentStored: false
    }
  };
}

export function buildCalendarConnectionStartPayload({
  basePayload,
  requestBody,
  authContext = { role: "customer", userId: "contract-customer", sessionId: "contract-session" },
  env = process.env,
  requestUrl
}) {
  const requestedChoiceId = safeCalendarChoiceId(requestBody.calendarChoiceId ?? requestBody.choiceId ?? requestBody.providerId);
  const startPacket = buildCalendarConnectionStartPacket(requestedChoiceId);
  const googleStart =
    requestedChoiceId === "google-calendar-events"
      ? buildGoogleCalendarConnectionStart(startPacket, {
          authContext,
          env,
          requestBody,
          requestUrl
        })
      : null;
  const effectiveStartPacket = googleStart?.startPacket ?? startPacket;
  return {
    ...basePayload,
    status: googleStart?.status ?? (effectiveStartPacket.canStartNow ? "ready-local" : "blocked"),
    requestedChoiceId,
    startPacket: effectiveStartPacket,
    serverOwned: true,
    clientMayPrepareProviderRequest: false,
    providerRequestUrl: googleStart?.providerRequestUrl ?? null,
    networkRequestPrepared: googleStart?.networkRequestPrepared ?? false,
    credentialStorageEnabled: false,
    externalNetworkCalls: googleStart?.externalNetworkCalls ?? false,
    realOrdersEnabled: false,
    rawContentStored: false,
    nextApiRoute: effectiveStartPacket.nextApiRoute,
    blockers: googleStart?.blockers ?? effectiveStartPacket.missingRepoEvidenceIds,
    missingEnv: googleStart?.missingEnv ?? [],
    oauth: googleStart?.oauth,
    repository: {
      tables: ["auth_sessions", "idempotency_keys", "audit_log"],
      runtimeMode: "contract",
      persisted: false,
      rawContentStored: false,
      providerCredentialsStored: false
    }
  };
}

export async function resolveCalendarConnectionLifecycle({
  authContext,
  bodyText,
  apiRuntime,
  env = process.env,
  fetchImpl = globalThis.fetch
}) {
  const body = parseJsonBody(bodyText);
  const requestedChoiceId = safeCalendarChoiceId(body.calendarChoiceId ?? body.choiceId ?? body.providerId);
  if (requestedChoiceId !== "google-calendar-events") return { handled: false };
  const mode = String(body.mode ?? "").trim().toLowerCase();
  const forceReconnect = body.forceReconnect === true || mode === "reconnect";
  if (clerkGoogleCalendarTokenSourceEnabled(env)) {
    return importGoogleCalendarWithClerkToken({
      authContext,
      apiRuntime,
      env,
      fetchImpl
    });
  }
  if (forceReconnect) return { handled: false };

  let connection;
  try {
    connection = await apiRuntime.readProviderConnection?.({ authContext, provider: "google_calendar" });
  } catch {
    connection = undefined;
  }
  if (!connection || connection.status !== "connected") return { handled: false };

  const credentialStorageEnabled = Boolean(connection.encryptedRefreshToken);

  if (mode === "scan") {
    if (!credentialStorageEnabled) {
      return {
        handled: true,
        statusCode: 200,
        payload: {
          service: "customcard-api",
          status: "google-calendar-needs-reconnect",
          needsReconnect: true,
          reconnectReason: "missing-refresh-token",
          providerRequestUrl: null,
          redirected: false,
          rawContentStored: false
        }
      };
    }
    try {
      const refreshToken = decryptTokenSecret(connection.encryptedRefreshToken, env);
      const token = await refreshGoogleAccessToken(refreshToken, env, fetchImpl);
      const eventsPayload = await fetchGoogleCalendarEvents(token.accessToken, env, fetchImpl);
      const record = buildGoogleCalendarImportRecord({
        authContext,
        encryptedRefreshToken: connection.encryptedRefreshToken,
        eventsPayload,
        grantedScopes: connection.scopes ?? []
      });
      const persistence = await apiRuntime.persistGoogleCalendarImport({ authContext, record });
      return {
        handled: true,
        statusCode: 200,
        payload: {
          service: "customcard-api",
          status: "google-calendar-scan-complete",
          scanned: true,
          importedEventCount: record.importedEvents.length,
          opportunityCount: record.cardOpportunities.length,
          providerRequestUrl: null,
          redirected: false,
          credentialStorageEnabled: true,
          rawContentStored: false,
          ...persistence.payload
        }
      };
    } catch (error) {
      return {
        handled: true,
        statusCode: 200,
        payload: {
          service: "customcard-api",
          status: "google-calendar-needs-reconnect",
          needsReconnect: true,
          reconnectReason: "refresh-token-rejected",
          detail: error instanceof Error ? error.message : "Google Calendar scan failed.",
          providerRequestUrl: null,
          redirected: false,
          rawContentStored: false
        }
      };
    }
  }

  return {
    handled: true,
    statusCode: 200,
    payload: {
      service: "customcard-api",
      status: "google-calendar-already-connected",
      alreadyConnected: true,
      providerRequestUrl: null,
      redirected: false,
      credentialStorageEnabled,
      canScanAgain: credentialStorageEnabled,
      nextApiRoute: "/api/customer/connections",
      rawContentStored: false
    }
  };
}

async function importGoogleCalendarWithClerkToken({ authContext, apiRuntime, env, fetchImpl }) {
  try {
    const token = await fetchClerkGoogleOAuthAccessToken({ authContext, env, fetchImpl });
    const eventsPayload = await fetchGoogleCalendarEvents(token.accessToken, env, fetchImpl);
    const record = buildGoogleCalendarImportRecord({
      authContext,
      credentialSource: "clerk",
      encryptedRefreshToken: "",
      eventsPayload,
      grantedScopes: token.scopes.length > 0 ? token.scopes : [googleCalendarOAuthScopeUri]
    });
    const persistence = await apiRuntime.persistGoogleCalendarImport({ authContext, record });
    return {
      handled: true,
      statusCode: 200,
      payload: {
        service: "customcard-api",
        status: "google-calendar-connected",
        tokenSource: "clerk",
        importedEventCount: record.importedEvents.length,
        opportunityCount: record.cardOpportunities.length,
        providerRequestUrl: null,
        redirected: false,
        credentialStorageEnabled: false,
        rawContentStored: false,
        ...persistence.payload
      }
    };
  } catch (error) {
    return {
      handled: true,
      statusCode: 409,
      payload: {
        service: "customcard-api",
        status: "clerk-google-calendar-token-unavailable",
        detail: error instanceof Error ? error.message : "Clerk Google Calendar token is unavailable.",
        tokenSource: "clerk",
        providerRequestUrl: null,
        redirected: false,
        credentialStorageEnabled: false,
        rawContentStored: false
      }
    };
  }
}

export async function resolveGoogleCalendarOAuthCallback({
  method,
  requestUrl,
  env = process.env,
  apiRuntime,
  fetchImpl = globalThis.fetch
}) {
  if (method !== "GET") {
    return {
      statusCode: 405,
      payload: { service: "customcard-api", status: "method-not-allowed", path: "/oauth/callback" }
    };
  }

  const stateResult = verifyOAuthState(requestUrl.searchParams.get("state"), env);
  if (!stateResult.ok) {
    return {
      statusCode: 400,
      payload: {
        service: "customcard-api",
        status: "invalid-oauth-state",
        detail: stateResult.detail,
        rawContentStored: false
      }
    };
  }

  const returnTo = stateResult.payload.returnTo;
  const providerError = requestUrl.searchParams.get("error");
  if (providerError) {
    return {
      returnTo,
      statusCode: 400,
      payload: {
        service: "customcard-api",
        status: "google-calendar-oauth-error",
        detail: safeText(providerError, "Google OAuth returned an error."),
        rawContentStored: false
      }
    };
  }

  const code = String(requestUrl.searchParams.get("code") ?? "").trim();
  if (!code) {
    return {
      returnTo,
      statusCode: 400,
      payload: {
        service: "customcard-api",
        status: "missing-oauth-code",
        detail: "Google OAuth callback did not include an authorization code.",
        rawContentStored: false
      }
    };
  }

  try {
    const token = await exchangeGoogleOAuthCode(code, env, {
      codeVerifier: oauthCodeVerifier(stateResult.payload, env),
      fetchImpl
    });
    const eventsPayload = await fetchGoogleCalendarEvents(token.accessToken, env, fetchImpl);
    const authContext = {
      role: "customer",
      userId: stateResult.payload.userId,
      sessionId: stateResult.payload.sessionId
    };
    const record = buildGoogleCalendarImportRecord({
      authContext,
      encryptedRefreshToken: token.refreshToken ? encryptTokenSecret(token.refreshToken, env) : "",
      eventsPayload,
      grantedScopes: token.scope.split(/[ ,]+/).filter(Boolean)
    });
    const persistence = await apiRuntime.persistGoogleCalendarImport({ authContext, record });
    return {
      returnTo,
      statusCode: 200,
      payload: {
        service: "customcard-api",
        status: "google-calendar-connected",
        importedEventCount: record.importedEvents.length,
        opportunityCount: record.cardOpportunities.length,
        credentialStorageEnabled: Boolean(record.providerConnection.encryptedRefreshToken),
        rawContentStored: false,
        ...persistence.payload
      }
    };
  } catch (error) {
    return {
      returnTo,
      statusCode: 502,
      payload: {
        service: "customcard-api",
        status: "google-calendar-import-failed",
        detail: error instanceof Error ? error.message : "Google Calendar import failed.",
        rawContentStored: false
      }
    };
  }
}

export function calendarConnectionStartPackets() {
  return [
    buildCalendarConnectionStartPacket("manual-invite-or-ics"),
    buildCalendarConnectionStartPacket("google-calendar-events"),
    buildCalendarConnectionStartPacket("icloud-ics-fallback")
  ];
}

export function buildCalendarConnectionStartPacket(choiceId) {
  const packets = {
    "manual-invite-or-ics": {
      id: "manual-invite-or-ics",
      provider: "Manual invite or ICS paste",
      label: "Paste invite or ICS",
      status: "ready-local",
      startMode: "metadata-import",
      nextApiRoute: "/api/import-preview",
      canStartNow: true,
      sourceMode: "local-paste",
      officialDocs: [],
      requiredEnv: [],
      requiredScopes: [],
      officialScopeUris: [],
      dataBoundary: "Customer-provided invite text or ICS event metadata only.",
      credentialBoundary: "No provider account, OAuth token, Apple credential, or background sync.",
      safetyChecks: [
        "Treat pasted invite and ICS text as untrusted input.",
        "Extract event metadata only.",
        "Require opportunity approval before card creation."
      ],
      requiredEvidenceIds: ["manual-import-preview-visible", "manual-input-parser-untrusted"],
      blockingEvidenceIds: [],
      missingRepoEvidenceIds: [],
      customerSteps: [
        {
          actor: "customer",
          title: "Paste event details",
          detail: "Paste an invite, selected event fields, or ICS text into the local import path.",
          evidenceRequired: ["Customer-provided event text exists."]
        }
      ],
      operatorSteps: [
        {
          actor: "system",
          title: "Validate untrusted input",
          detail: "Run the manual import parser and reject raw body persistence before showing opportunity review.",
          evidenceRequired: ["Manual import parser tests pass.", "Raw content storage checks pass."]
        }
      ]
    },
    "google-calendar-events": {
      id: "google-calendar-events",
      provider: "Google Calendar API",
      label: "Google Calendar connection",
      status: "credential-gated",
      startMode: "oauth-evidence-required",
      nextApiRoute: null,
      canStartNow: false,
      sourceMode: "oauth-readiness",
      officialDocs: ["https://developers.google.com/workspace/calendar/api/auth"],
      requiredEnv: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI"],
      requiredScopes: ["calendar.events.readonly"],
      officialScopeUris: [googleCalendarOAuthScopeUri],
      dataBoundary: "Event metadata only after explicit consent; raw descriptions stay out of storage.",
      credentialBoundary: "Needs OAuth client, consent screen, redirect URI, token storage, and revocation handling.",
      safetyChecks: [
        "OAuth consent required",
        "Calendar scope consent",
        "Metadata schema validation",
        "Revocation handling",
        "No raw content storage"
      ],
      requiredEvidenceIds: [
        "google-scope-review",
        "google-oauth-env-and-redirect",
        "google-revocation-proof",
        "google-metadata-schema-fixture",
        "google-manual-fallback-visible"
      ],
      blockingEvidenceIds: [
        "google-scope-review",
        "google-oauth-env-and-redirect",
        "google-revocation-proof",
        "google-metadata-schema-fixture"
      ],
      missingRepoEvidenceIds: [
        "google-scope-review",
        "google-oauth-env-and-redirect",
        "google-revocation-proof",
        "google-metadata-schema-fixture"
      ],
      customerSteps: [
        {
          actor: "customer",
          title: "Review Google access",
          detail: "Review the metadata-only scope and use manual paste while OAuth is not enabled.",
          evidenceRequired: ["Scope URI is visible.", "Manual fallback remains available."]
        }
      ],
      operatorSteps: [
        {
          actor: "operator",
          title: "Register OAuth app",
          detail: "Configure the OAuth client, redirect URI, consent screen, and required environment variables.",
          evidenceRequired: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI"]
        },
        {
          actor: "operator",
          title: "Prove revocation and token boundary",
          detail: "Implement token storage, disconnect, and revocation handling before any provider request is prepared.",
          evidenceRequired: ["Revocation test evidence.", "Token storage boundary review.", "Metadata schema fixture tests."]
        }
      ],
      fallbackChoiceId: "manual-invite-or-ics",
      blockedReason: "No live OAuth consent flow is implemented in this repository state."
    },
    "icloud-ics-fallback": {
      id: "icloud-ics-fallback",
      provider: "iCloud Calendar export",
      label: "Apple Calendar ICS export",
      status: "manual-export",
      startMode: "manual-export-guide",
      nextApiRoute: "/api/import-preview",
      canStartNow: true,
      sourceMode: "manual-export",
      officialDocs: [
        "https://support.apple.com/guide/calendar/import-or-export-calendars-icl1023/mac",
        "https://support.apple.com/en-gb/108306"
      ],
      requiredEnv: [],
      requiredScopes: [],
      officialScopeUris: [],
      dataBoundary: "Customer exports an .ics file or downloads a temporary iCloud.com ICS copy, then pastes selected event data.",
      credentialBoundary: "No Apple ID, app-specific password, CalDAV session, or native Apple Calendar sync.",
      safetyChecks: ["Manual export only", "No Apple account credentials stored", "Metadata schema validation"],
      requiredEvidenceIds: [
        "icloud-export-instructions-visible",
        "icloud-no-credential-collection",
        "icloud-metadata-import-preview"
      ],
      blockingEvidenceIds: [],
      missingRepoEvidenceIds: [],
      customerSteps: [
        {
          actor: "customer",
          title: "Export or download ICS",
          detail: "Export an event from Calendar on Mac or download a temporary iCloud.com calendar copy, then stop sharing when finished.",
          evidenceRequired: ["Customer-controlled ICS export exists."]
        }
      ],
      operatorSteps: [
        {
          actor: "operator",
          title: "Keep Apple credentials out",
          detail: "Do not collect Apple ID, app-specific password, CalDAV session, or native Apple Calendar credentials.",
          evidenceRequired: ["Credential collection is absent.", "Manual ICS parser tests pass."]
        }
      ],
      fallbackChoiceId: "manual-invite-or-ics",
      blockedReason: "Live iCloud CalDAV/native sync is intentionally not implemented."
    }
  };
  const packet = packets[choiceId] ?? packets["manual-invite-or-ics"];

  return {
    ...packet,
    apiRoute: "/api/calendar/connections/start",
    serverOwned: true,
    clientMayPrepareProviderRequest: false,
    customerVisible: true,
    liveOAuthEnabled: false,
    networkRequestPrepared: false,
    credentialStorageEnabled: false,
    providerRequestUrl: null,
    rawContentStored: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false
  };
}

function buildGoogleCalendarConnectionStart(
  basePacket,
  { authContext = { role: "customer", userId: "contract-customer", sessionId: "contract-session" }, env = process.env, requestBody = {}, requestUrl } = {}
) {
  const requestOrigin = requestUrl instanceof URL ? requestUrl.origin : "http://localhost:5173";
  const redirectUri = usableEnvValue(env.GOOGLE_OAUTH_REDIRECT_URI) || usableEnvValue(env.GOOGLE_CALENDAR_REDIRECT_URI) || "";
  const config = {
    clientId: usableEnvValue(env.GOOGLE_OAUTH_CLIENT_ID),
    clientSecret: usableEnvValue(env.GOOGLE_OAUTH_CLIENT_SECRET),
    redirectUri,
    stateSecret: strongSecretValue(env.GOOGLE_OAUTH_STATE_SECRET),
    tokenEncryptionKey: strongSecretValue(env.GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY)
  };
  const missingEnv = googleCalendarOAuthRequiredEnv.filter((name) => {
    if (name === "GOOGLE_OAUTH_CLIENT_ID") return !config.clientId;
    if (name === "GOOGLE_OAUTH_CLIENT_SECRET") return !config.clientSecret;
    if (name === "GOOGLE_OAUTH_REDIRECT_URI") return !config.redirectUri;
    if (name === "GOOGLE_OAUTH_STATE_SECRET") return !config.stateSecret;
    if (name === "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY") return !config.tokenEncryptionKey;
    return true;
  });

  if (missingEnv.length > 0) {
    const blockers = [
      ...missingEnv.map((name) => `missing-env:${name}`),
      ...basePacket.missingRepoEvidenceIds
    ];
    return {
      status: "blocked",
      providerRequestUrl: null,
      networkRequestPrepared: false,
      externalNetworkCalls: false,
      missingEnv,
      blockers,
      startPacket: {
        ...basePacket,
        requiredEnv: googleCalendarOAuthRequiredEnv,
        missingRepoEvidenceIds: blockers,
        blockedReason: `Missing Google OAuth env: ${missingEnv.join(", ")}.`
      }
    };
  }

  const returnTo = safeReturnToUrl(requestBody.returnTo, requestOrigin);
  const statePayload = buildOAuthStatePayload("google-calendar-events", returnTo, {
    authContext
  });
  const state = encodeOAuthState(statePayload, env);
  const codeVerifier = oauthCodeVerifier(statePayload, env);
  const codeChallenge = oauthCodeChallenge(codeVerifier);
  const providerRequestUrl = buildGoogleCalendarAuthorizationUrl({
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    state,
    codeChallenge
  });

  return {
    status: "oauth-ready",
    providerRequestUrl,
    networkRequestPrepared: true,
    externalNetworkCalls: true,
    missingEnv: [],
    blockers: [],
    oauth: {
      provider: "google-calendar",
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      redirectUri: config.redirectUri,
      returnTo,
      state,
      scopes: [googleCalendarOAuthScopeUri],
      tokenExchangeRequired: true,
      pkce: {
        codeChallengeMethod: "S256"
      },
      credentialStorageEnabled: false,
      rawContentStored: false
    },
    startPacket: {
      ...basePacket,
      startMode: "oauth-provider-redirect",
      canStartNow: true,
      liveOAuthEnabled: true,
      networkRequestPrepared: true,
      externalNetworkCalls: true,
      providerRequestUrl,
      nextApiRoute: null,
      requiredEnv: googleCalendarOAuthRequiredEnv,
      blockingEvidenceIds: [],
      missingRepoEvidenceIds: [],
      blockedReason: undefined
    }
  };
}

function buildGoogleCalendarAuthorizationUrl({ clientId, redirectUri, state, codeChallenge }) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", googleCalendarOAuthScopeUri);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  return url.toString();
}

function buildOAuthStatePayload(choiceId, returnTo, { authContext, nowMs = Date.now() }) {
  return {
    version: 1,
    provider: "google-calendar",
    choiceId,
    userId: authContext.userId,
    sessionId: authContext.sessionId,
    returnTo,
    issuedAtMs: nowMs,
    expiresAtMs: nowMs + 15 * 60_000,
    nonce: randomBytes(18).toString("base64url")
  };
}

function encodeOAuthState(payload, env) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signOAuthState(encoded, env)}`;
}

function verifyOAuthState(value, env, nowMs = Date.now()) {
  const text = String(value ?? "");
  const [encoded, signature] = text.split(".");
  if (!encoded || !signature) return { ok: false, detail: "OAuth state is missing or malformed." };
  let expected;
  try {
    expected = signOAuthState(encoded, env);
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : "OAuth state cannot be verified."
    };
  }
  if (!safeEqualText(signature, expected)) return { ok: false, detail: "OAuth state signature did not match." };
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (payload.provider !== "google-calendar" || payload.choiceId !== "google-calendar-events") {
      return { ok: false, detail: "OAuth state provider did not match Google Calendar." };
    }
    if (!payload.userId || !payload.returnTo || Number(payload.expiresAtMs) < nowMs) {
      return { ok: false, detail: "OAuth state is expired or incomplete." };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, detail: "OAuth state payload could not be decoded." };
  }
}

function signOAuthState(encodedPayload, env) {
  return createHmac("sha256", oauthStateSecret(env)).update(encodedPayload).digest("base64url");
}

function oauthCodeVerifier(payload, env) {
  return createHmac("sha256", oauthStateSecret(env))
    .update(`pkce:${payload.provider}:${payload.choiceId}:${payload.userId}:${payload.sessionId}:${payload.issuedAtMs}:${payload.nonce}`)
    .digest("base64url");
}

function oauthCodeChallenge(codeVerifier) {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}

function safeEqualText(actual, expected) {
  const actualBuffer = Buffer.from(String(actual ?? ""));
  const expectedBuffer = Buffer.from(String(expected ?? ""));
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function oauthStateSecret(env) {
  const secret = strongSecretValue(env.GOOGLE_OAUTH_STATE_SECRET);
  if (!secret) throw new Error("GOOGLE_OAUTH_STATE_SECRET must be at least 32 characters.");
  return secret;
}

async function exchangeGoogleOAuthCode(code, env, { codeVerifier, fetchImpl = globalThis.fetch } = {}) {
  const redirectUri = usableEnvValue(env.GOOGLE_OAUTH_REDIRECT_URI) || usableEnvValue(env.GOOGLE_CALENDAR_REDIRECT_URI);
  const clientId = usableEnvValue(env.GOOGLE_OAUTH_CLIENT_ID);
  const clientSecret = usableEnvValue(env.GOOGLE_OAUTH_CLIENT_SECRET);
  const missingEnv = [];
  if (!clientId) missingEnv.push("GOOGLE_OAUTH_CLIENT_ID");
  if (!clientSecret) missingEnv.push("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!redirectUri) missingEnv.push("GOOGLE_OAUTH_REDIRECT_URI");
  if (missingEnv.length > 0) throw new Error(`Missing Google OAuth env: ${missingEnv.join(", ")}.`);

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  });
  if (codeVerifier) body.set("code_verifier", codeVerifier);
  const response = await fetchImpl(usableEnvValue(env.GOOGLE_OAUTH_TOKEN_ENDPOINT) || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(safeText(payload.error_description ?? payload.error, "Google token exchange failed."));
  }
  const accessToken = String(payload.access_token ?? "").trim();
  if (!accessToken) throw new Error("Google token exchange did not return an access token.");
  const scope = String(payload.scope ?? googleCalendarOAuthScopeUri);
  if (!scope.split(/[ ,]+/).includes(googleCalendarOAuthScopeUri)) {
    throw new Error("Google token response did not grant the Calendar events readonly scope.");
  }
  return {
    accessToken,
    refreshToken: String(payload.refresh_token ?? "").trim(),
    expiresIn: Number(payload.expires_in ?? 0),
    scope
  };
}

async function fetchGoogleCalendarEvents(accessToken, env, fetchImpl = globalThis.fetch) {
  const url = googleCalendarEventsUrl(env);
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(safeText(payload.error?.message ?? payload.error_description ?? payload.error, "Google Calendar events import failed."));
  }
  return payload;
}

async function fetchClerkGoogleOAuthAccessToken({ authContext, env, fetchImpl = globalThis.fetch }) {
  const clerkUserId = safeClerkUserId(authContext);
  if (!clerkUserId) throw new Error("Clerk user id is unavailable for Google Calendar token lookup.");
  const secretKey = usableEnvValue(env.CLERK_SECRET_KEY);
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is required for Clerk Google Calendar token lookup.");
  const endpoint = clerkOAuthAccessTokenEndpoint(env, clerkUserId);
  const response = await fetchImpl(endpoint, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      Accept: "application/json"
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(safeText(payload.errors?.[0]?.message ?? payload.error?.message ?? payload.message, "Clerk Google OAuth token request failed."));
  }
  const tokenPayload = Array.isArray(payload) ? payload[0] : Array.isArray(payload.data) ? payload.data[0] : payload;
  const accessToken = String(tokenPayload?.token ?? tokenPayload?.access_token ?? "").trim();
  if (!accessToken) throw new Error("Clerk did not return a Google OAuth access token.");
  const scopes = normalizeScopeList(tokenPayload?.scopes ?? tokenPayload?.scope);
  if (scopes.length > 0 && !scopes.includes(googleCalendarOAuthScopeUri)) {
    throw new Error("Clerk Google OAuth token is missing the Calendar events readonly scope.");
  }
  return { accessToken, scopes };
}

function clerkOAuthAccessTokenEndpoint(env, clerkUserId) {
  const template = usableEnvValue(env.CLERK_OAUTH_ACCESS_TOKEN_ENDPOINT);
  if (template) return template.replace("{user_id}", encodeURIComponent(clerkUserId)).replace("{provider}", clerkGoogleOAuthProvider);
  const apiUrl = usableEnvValue(env.CLERK_API_URL) || "https://api.clerk.com";
  return `${apiUrl.replace(/\/+$/g, "")}/v1/users/${encodeURIComponent(clerkUserId)}/oauth_access_tokens/${clerkGoogleOAuthProvider}`;
}

function clerkGoogleCalendarTokenSourceEnabled(env) {
  return String(env.CUSTOMCARD_GOOGLE_CALENDAR_TOKEN_SOURCE ?? "").trim().toLowerCase() === "clerk";
}

function safeClerkUserId(authContext) {
  const explicit = safeText(authContext?.clerkUserId ?? authContext?.clerk_user_id, "");
  if (explicit) return explicit;
  const userId = safeText(authContext?.userId, "");
  return /^user_[A-Za-z0-9_-]+$/.test(userId) ? userId : "";
}

function normalizeScopeList(value) {
  if (Array.isArray(value)) return value.map((entry) => safeText(entry, "")).filter(Boolean);
  return String(value ?? "")
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function googleCalendarEventsUrl(env, now = new Date()) {
  const base = usableEnvValue(env.GOOGLE_CALENDAR_EVENTS_ENDPOINT) ||
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(usableEnvValue(env.GOOGLE_CALENDAR_ID) || "primary")}/events`;
  const url = new URL(base);
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000).toISOString();
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("maxResults", String(safeCalendarMaxResults(env.GOOGLE_CALENDAR_IMPORT_MAX_RESULTS)));
  url.searchParams.set("fields", "items(id,iCalUID,summary,start,end(timeZone)),nextPageToken");
  return url.toString();
}

function safeCalendarMaxResults(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 10;
  return Math.max(1, Math.min(25, Math.floor(number)));
}

export function buildGoogleCalendarImportRecord({
  authContext,
  credentialSource = "custom-oauth",
  encryptedRefreshToken,
  eventsPayload,
  grantedScopes
}) {
  const rawEvents = Array.isArray(eventsPayload.items) ? eventsPayload.items.slice(0, 25) : [];
  const connectionId = `connection-${stableHash(`${authContext.userId}:google-calendar-events`).slice(0, 12)}`;
  const importedEvents = [];
  const cardOpportunities = [];

  for (const [index, event] of rawEvents.entries()) {
    const normalized = normalizeGoogleCalendarEvent(event, authContext.userId, index);
    if (!normalized) continue;
    importedEvents.push({
      id: normalized.eventId,
      title: normalized.title,
      startsAt: normalized.startsAt,
      timezone: normalized.timezone,
      sourceEvidence: normalized.sourceEvidence,
      recipientHint: normalized.recipientHint
    });
    cardOpportunities.push({
      id: normalized.opportunityId,
      eventId: normalized.eventId,
      recipientName: normalized.recipientHint,
      leadTimeHours: normalized.leadTimeHours,
      confidence: normalized.confidence,
      decision: "pending",
      evidence: {
        sourceKind: "google-calendar-events",
        sourceEvidence: normalized.sourceEvidence,
        googleEventHash: normalized.googleEventHash,
        rawContentStored: false,
        metadataOnly: true
      }
    });
  }

  return {
    providerConnection: {
      id: connectionId,
      provider: "google_calendar",
      status: "connected",
      scopes: grantedScopes.length > 0 ? grantedScopes : [googleCalendarOAuthScopeUri],
      adapterVersion: credentialSource === "clerk" ? "google-calendar-events-clerk-v1" : "google-calendar-events-v1",
      encryptedRefreshToken,
      metadataSchema: {
        kind: "calendar_event_metadata",
        credentialSource,
        rawContentStored: false,
        metadataOnly: true,
        importedFields: ["id_hash", "summary", "start", "timezone", "location_presence"]
      }
    },
    importedEvents,
    cardOpportunities
  };
}

function normalizeGoogleCalendarEvent(event, userId, index) {
  const title = safeText(event?.summary, "Calendar event");
  const startsAt = googleEventStartIso(event?.start);
  if (!startsAt) return undefined;
  const timezone = safeText(event?.start?.timeZone ?? event?.end?.timeZone, "UTC");
  const googleEventHash = stableHash(`${event?.id ?? event?.iCalUID ?? index}:${startsAt}`);
  const eventId = `event-${stableHash(`${userId}:google-calendar:${googleEventHash}`).slice(0, 12)}`;
  const recipientHint = inferCalendarRecipient(title);
  return {
    eventId,
    opportunityId: `opportunity-${stableHash(`${eventId}:${recipientHint}`).slice(0, 12)}`,
    title,
    startsAt,
    timezone,
    recipientHint,
    sourceEvidence: "Google Calendar metadata: title and start time.",
    googleEventHash,
    leadTimeHours: leadTimeHoursFromNow(startsAt),
    confidence: safeConfidence(title === "Calendar event" ? 0.72 : 0.88, 0.82)
  };
}

function googleEventStartIso(start) {
  const value = start?.dateTime ?? start?.date;
  if (!value) return "";
  const isoValue = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00.000Z` : value;
  return safeTimestamp(isoValue, "");
}

function inferCalendarRecipient(title) {
  const cleanTitle = safeText(title, "");
  const possessive = cleanTitle.match(/^(.+?)[']s\s+(birthday|anniversary|wedding|graduation|party|celebration)\b/i);
  const forMatch = cleanTitle.match(/\b(?:birthday|anniversary|wedding|graduation|party|celebration|brunch|lunch|dinner)\s+for\s+(.+?)(?:\s+(?:on|at|in)\b|$)/i);
  const inferred = possessive?.[1] ?? forMatch?.[1] ?? cleanTitle
    .replace(/\b(happy|birthday|anniversary|wedding|graduation|dinner|party|celebration|brunch|lunch)\b/gi, " ");
  const recipient = cleanCalendarRecipient(inferred);
  return safeText(recipient, "Someone important");
}

function cleanCalendarRecipient(value) {
  const recipient = safeText(value, "")
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
    .replace(/[!?.:,;]+$/g, "")
    .replace(/\s+[!?.:,;]+$/g, "")
    .replace(/[']s$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!recipient) return "";
  if (/^(happy|birthday|calendar event|event|party|dinner|brunch|lunch|celebration|meeting|appointment|someone important)$/i.test(recipient)) {
    return "";
  }
  return recipient;
}

function leadTimeHoursFromNow(startsAt) {
  const delta = new Date(startsAt).getTime() - Date.now();
  if (!Number.isFinite(delta)) return 168;
  return Math.max(0, Math.min(8760, Math.round(delta / (60 * 60 * 1000))));
}

export function encryptTokenSecret(value, env) {
  const text = String(value ?? "");
  if (!text) return "";
  const key = createHash("sha256").update(tokenEncryptionKeyMaterial(env)).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `aes-256-gcm:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptTokenSecret(value, env) {
  const [scheme, ivEncoded, tagEncoded, dataEncoded] = String(value ?? "").split(":");
  if (scheme !== "aes-256-gcm" || !ivEncoded || !tagEncoded || !dataEncoded) return "";
  try {
    const key = createHash("sha256").update(tokenEncryptionKeyMaterial(env)).digest();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivEncoded, "base64url"));
    decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(dataEncoded, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

function tokenEncryptionKeyMaterial(env) {
  const secret = strongSecretValue(env.GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY);
  if (!secret) throw new Error("GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY must be at least 32 characters.");
  return secret;
}

function strongSecretValue(value) {
  const text = usableEnvValue(value);
  return text && text.length >= 32 ? text : "";
}

async function refreshGoogleAccessToken(refreshToken, env, fetchImpl = globalThis.fetch) {
  if (!refreshToken) throw new Error("Google Calendar refresh token is unavailable.");
  const clientId = usableEnvValue(env.GOOGLE_OAUTH_CLIENT_ID);
  const clientSecret = usableEnvValue(env.GOOGLE_OAUTH_CLIENT_SECRET);
  if (!clientId || !clientSecret) throw new Error("Missing Google OAuth env for token refresh.");
  const response = await fetchImpl(usableEnvValue(env.GOOGLE_OAUTH_TOKEN_ENDPOINT) || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(safeText(payload.error_description ?? payload.error, "Google token refresh failed."));
  }
  const accessToken = String(payload.access_token ?? "").trim();
  if (!accessToken) throw new Error("Google token refresh did not return an access token.");
  return { accessToken };
}

function safeReturnToUrl(value, fallbackOrigin) {
  try {
    const parsed = new URL(String(value ?? ""), fallbackOrigin);
    const fallback = new URL(fallbackOrigin);
    return parsed.origin === fallback.origin ? parsed.toString() : `${fallback.origin}/`;
  } catch {
    return `${fallbackOrigin}/`;
  }
}

function usableEnvValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^(replace|todo|changeme|example|placeholder|dummy)/i.test(text)) return "";
  return text;
}

function safeCalendarChoiceId(value) {
  const id = safeId(value, "manual-invite-or-ics");
  return ["manual-invite-or-ics", "google-calendar-events", "icloud-ics-fallback"].includes(id)
    ? id
    : "manual-invite-or-ics";
}

function parseJsonBody(bodyText) {
  if (!bodyText) return {};
  try {
    return JSON.parse(bodyText);
  } catch {
    return {};
  }
}

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function safeId(value, fallback) {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || fallback;
}

function safeText(value, fallback) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text.slice(0, 120) || fallback;
}

function safeTimestamp(value, fallback) {
  const date = new Date(value ?? "");
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function safeConfidence(value, fallback) {
  const confidence = Number(value);
  if (!Number.isFinite(confidence)) return fallback;
  return Math.max(0, Math.min(1, confidence));
}

function safeDecision(value) {
  const decision = String(value ?? "pending").trim().toLowerCase();
  return ["pending", "accepted", "snoozed", "dismissed"].includes(decision) ? decision : "pending";
}
