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
  | "metadata-role"
  | "metadata-roles"
  | "local-preview"
  | "not-authorized";

export interface BrowserAdminAccessPolicy {
  isLoaded: boolean;
  isSignedIn: boolean;
  isAdmin: boolean;
  email: string;
  role: string;
  roles: string[];
  reason: BrowserAdminAccessReason;
}

export interface BrowserAdminAccessInput {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  user: BrowserAdminUserProfile | null | undefined;
  localAdminPreview?: boolean;
}

export interface CardGenerationEndpoint {
  legacyBaseUrl: string;
  requestUrl: string;
  sameOriginPath: string;
}

export function resolveBrowserAdminAccess({
  isLoaded,
  isSignedIn,
  user,
  localAdminPreview = false
}: BrowserAdminAccessInput): BrowserAdminAccessPolicy {
  const metadata = recordValue(user?.publicMetadata);
  const role = normalizeText(typeof metadata?.role === "string" ? metadata.role : "");
  const roles = Array.isArray(metadata?.roles)
    ? metadata.roles.map((value) => normalizeText(String(value))).filter(Boolean)
    : [];
  const email = normalizeText(user?.primaryEmailAddress?.emailAddress ?? "");
  const signedIn = Boolean(isSignedIn);
  const singleRoleAllowed = role === "admin";
  const multiRoleAllowed = roles.includes("admin");
  const isAdmin = Boolean(localAdminPreview || (signedIn && (singleRoleAllowed || multiRoleAllowed)));

  return {
    isLoaded,
    isSignedIn: signedIn,
    isAdmin,
    email,
    role,
    roles,
    reason: resolveAdminAccessReason({
      isLoaded,
      signedIn,
      singleRoleAllowed,
      multiRoleAllowed,
      localAdminPreview
    })
  };
}

export function resolveLocalAdminPreview(env: BrowserGateEnv, href: string): boolean {
  const enabledInDev = env?.DEV === true;
  if (!enabledInDev) return false;
  try {
    const url = new URL(href, "http://localhost");
    const value = normalizeText(url.searchParams.get("adminPreview") ?? "");
    return value === "1" || value === "true";
  } catch {
    return false;
  }
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
  singleRoleAllowed,
  multiRoleAllowed,
  localAdminPreview
}: {
  isLoaded: boolean;
  signedIn: boolean;
  singleRoleAllowed: boolean;
  multiRoleAllowed: boolean;
  localAdminPreview: boolean;
}): BrowserAdminAccessReason {
  if (!isLoaded) return "loading";
  if (localAdminPreview) return "local-preview";
  if (!signedIn) return "signed-out";
  if (singleRoleAllowed) return "metadata-role";
  if (multiRoleAllowed) return "metadata-roles";
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
