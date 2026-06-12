import { describe, expect, it } from "vitest";
import {
  browserAdminEmailEnvNames,
  cardGenerationUrlEnvName,
  configuredAdminEmailsFromEnv,
  resolveBrowserAdminAccess,
  resolveCardGenerationEndpoint,
  sameOriginCardGenerationPath
} from "./browserGatePolicy";

describe("browser gate policy", () => {
  it("centralizes browser admin email env parsing", () => {
    const emails = configuredAdminEmailsFromEnv({
      [browserAdminEmailEnvNames[0]]: " Owner@Example.com, ops@example.com ",
      [browserAdminEmailEnvNames[1]]: "ADMIN@example.com"
    });

    expect([...emails]).toEqual(["owner@example.com", "ops@example.com", "admin@example.com"]);
  });

  it("grants admin access from Clerk publicMetadata.role", () => {
    const access = resolveBrowserAdminAccess({
      isLoaded: true,
      isSignedIn: true,
      configuredAdminEmails: new Set(),
      user: {
        publicMetadata: { role: "Admin" },
        primaryEmailAddress: { emailAddress: "person@example.com" }
      }
    });

    expect(access).toMatchObject({
      isAdmin: true,
      reason: "metadata-role",
      role: "admin",
      email: "person@example.com"
    });
  });

  it("grants admin access from Clerk publicMetadata.roles", () => {
    const access = resolveBrowserAdminAccess({
      isLoaded: true,
      isSignedIn: true,
      configuredAdminEmails: new Set(),
      user: {
        publicMetadata: { roles: ["support", "ADMIN"] },
        primaryEmailAddress: { emailAddress: "person@example.com" }
      }
    });

    expect(access.isAdmin).toBe(true);
    expect(access.reason).toBe("metadata-roles");
    expect(access.roles).toEqual(["support", "admin"]);
  });

  it("grants admin access from configured browser email allowlist", () => {
    const access = resolveBrowserAdminAccess({
      isLoaded: true,
      isSignedIn: true,
      configuredAdminEmails: new Set(["owner@example.com"]),
      user: {
        publicMetadata: {},
        primaryEmailAddress: { emailAddress: " OWNER@example.com " }
      }
    });

    expect(access).toMatchObject({
      isAdmin: true,
      hasConfiguredEmails: true,
      reason: "configured-email",
      email: "owner@example.com"
    });
  });

  it("keeps signed-out users outside admin surfaces even when metadata is present", () => {
    const access = resolveBrowserAdminAccess({
      isLoaded: true,
      isSignedIn: false,
      configuredAdminEmails: new Set(["owner@example.com"]),
      user: {
        publicMetadata: { role: "admin" },
        primaryEmailAddress: { emailAddress: "owner@example.com" }
      }
    });

    expect(access.isAdmin).toBe(false);
    expect(access.reason).toBe("signed-out");
  });

  it("resolves AI card generation to the same-origin API adapter by default", () => {
    expect(resolveCardGenerationEndpoint({})).toEqual({
      legacyBaseUrl: "",
      requestUrl: sameOriginCardGenerationPath,
      sameOriginPath: sameOriginCardGenerationPath
    });
  });

  it("resolves AI card generation to the legacy sidecar endpoint when configured", () => {
    expect(
      resolveCardGenerationEndpoint({
        [cardGenerationUrlEnvName]: " https://card-gen.example.test "
      })
    ).toEqual({
      legacyBaseUrl: "https://card-gen.example.test",
      requestUrl: "https://card-gen.example.test/generate",
      sameOriginPath: sameOriginCardGenerationPath
    });
  });
});
