import { describe, expect, it } from "vitest";
import {
  cardGenerationUrlEnvName,
  resolveLocalAdminPreview,
  resolveBrowserAdminAccess,
  resolveCardGenerationEndpoint,
  sameOriginCardGenerationPath
} from "./browserGatePolicy";

describe("browser gate policy", () => {
  it("grants admin access from Clerk publicMetadata.role", () => {
    const access = resolveBrowserAdminAccess({
      isLoaded: true,
      isSignedIn: true,
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
      user: {
        publicMetadata: { roles: ["support", "ADMIN"] },
        primaryEmailAddress: { emailAddress: "person@example.com" }
      }
    });

    expect(access.isAdmin).toBe(true);
    expect(access.reason).toBe("metadata-roles");
    expect(access.roles).toEqual(["support", "admin"]);
  });

  it("does not grant browser admin access from email alone", () => {
    const access = resolveBrowserAdminAccess({
      isLoaded: true,
      isSignedIn: true,
      user: {
        publicMetadata: {},
        primaryEmailAddress: { emailAddress: " OWNER@example.com " }
      }
    });

    expect(access).toMatchObject({
      isAdmin: false,
      reason: "not-authorized",
      email: "owner@example.com"
    });
  });

  it("keeps signed-out users outside admin surfaces even when metadata is present", () => {
    const access = resolveBrowserAdminAccess({
      isLoaded: true,
      isSignedIn: false,
      user: {
        publicMetadata: { role: "admin" },
        primaryEmailAddress: { emailAddress: "owner@example.com" }
      }
    });

    expect(access.isAdmin).toBe(false);
    expect(access.reason).toBe("signed-out");
  });

  it("allows explicit local admin preview only in dev", () => {
    expect(resolveLocalAdminPreview({ DEV: true }, "http://localhost/?view=admin&adminPreview=1")).toBe(true);
    expect(resolveLocalAdminPreview({ DEV: false }, "http://localhost/?view=admin&adminPreview=1")).toBe(false);

    const access = resolveBrowserAdminAccess({
      isLoaded: true,
      isSignedIn: false,
      localAdminPreview: true,
      user: null
    });
    expect(access).toMatchObject({ isAdmin: true, reason: "local-preview" });
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
