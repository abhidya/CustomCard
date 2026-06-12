export const browserAdminEmailEnvNames = Object.freeze([
  "VITE_CUSTOMCARD_ADMIN_EMAILS",
  "VITE_CUSTOMCARD_ADMIN_EMAIL"
] as const);

export const cardGenerationUrlEnvName = "VITE_CARD_GEN_URL";
export const sameOriginCardGenerationPath = "/api/ai/card/generate";

export type BrowserGateEnv = Record<string, unknown> | undefined;

export interface BrowserAdminUserProfile {
  primaryEmailAddress?: {
    emailAddress?: string | null;
  } | null;
  publicMetadata?: unknown;
}

export type BrowserAdminAccessReason =
  | "loading"
  | "signed-out"
  | "configured-email"
  | "metadata-role"
  | "metadata-roles"
  | "not-authorized";

export interface BrowserAdminAccessPolicy {
  isLoaded: boolean;
  isSignedIn: boolean;
  isAdmin: boolean;
  hasConfiguredEmails: boolean;
  email: string;
  role: string;
  roles: string[];
  reason: BrowserAdminAccessReason;
}

export interface BrowserAdminAccessInput {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  user: BrowserAdminUserProfile | null | undefined;
  configuredAdminEmails: ReadonlySet<string>;
}

export interface CardGenerationEndpoint {
  legacyBaseUrl: string;
  requestUrl: string;
  sameOriginPath: string;
}

export function configuredAdminEmailsFromEnv(env: BrowserGateEnv): ReadonlySet<string> {
  return new Set(
    browserAdminEmailEnvNames
      .flatMap((name) => stringEnvValue(env, name).split(","))
      .map(normalizeText)
      .filter(Boolean)
  );
}

export function resolveBrowserAdminAccess({
  isLoaded,
  isSignedIn,
  user,
  configuredAdminEmails
}: BrowserAdminAccessInput): BrowserAdminAccessPolicy {
  const metadata = recordValue(user?.publicMetadata);
  const role = normalizeText(typeof metadata?.role === "string" ? metadata.role : "");
  const roles = Array.isArray(metadata?.roles)
    ? metadata.roles.map((value) => normalizeText(String(value))).filter(Boolean)
    : [];
  const email = normalizeText(user?.primaryEmailAddress?.emailAddress ?? "");
  const signedIn = Boolean(isSignedIn);
  const emailAllowed = email ? configuredAdminEmails.has(email) : false;
  const singleRoleAllowed = role === "admin";
  const multiRoleAllowed = roles.includes("admin");
  const isAdmin = Boolean(signedIn && (emailAllowed || singleRoleAllowed || multiRoleAllowed));

  return {
    isLoaded,
    isSignedIn: signedIn,
    isAdmin,
    hasConfiguredEmails: configuredAdminEmails.size > 0,
    email,
    role,
    roles,
    reason: resolveAdminAccessReason({ isLoaded, signedIn, emailAllowed, singleRoleAllowed, multiRoleAllowed })
  };
}

export function resolveCardGenerationEndpoint(
  env: BrowserGateEnv,
  sameOriginPath = sameOriginCardGenerationPath
): CardGenerationEndpoint {
  const legacyBaseUrl = stringEnvValue(env, cardGenerationUrlEnvName).trim();

  return {
    legacyBaseUrl,
    requestUrl: legacyBaseUrl ? `${legacyBaseUrl}/generate` : sameOriginPath,
    sameOriginPath
  };
}

function resolveAdminAccessReason({
  isLoaded,
  signedIn,
  emailAllowed,
  singleRoleAllowed,
  multiRoleAllowed
}: {
  isLoaded: boolean;
  signedIn: boolean;
  emailAllowed: boolean;
  singleRoleAllowed: boolean;
  multiRoleAllowed: boolean;
}): BrowserAdminAccessReason {
  if (!isLoaded) return "loading";
  if (!signedIn) return "signed-out";
  if (singleRoleAllowed) return "metadata-role";
  if (multiRoleAllowed) return "metadata-roles";
  if (emailAllowed) return "configured-email";
  return "not-authorized";
}

function stringEnvValue(env: BrowserGateEnv, name: string): string {
  const value = env?.[name];
  return typeof value === "string" ? value : "";
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
