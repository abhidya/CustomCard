import { describe, expect, it } from "vitest";
import { apiRouteContracts } from "../src/apiRouteContractsData.mjs";
import {
  apiRouteAdapterAliases,
  apiRouteAdapterPaths,
  googleCalendarApiOAuthCallbackRoute,
  googleCalendarOAuthCallbackRoute,
  isApiRouteAdapterPath,
  validateApiRouteAdapterContract
} from "../scripts/api-route-adapter-contract.mjs";

describe("api route adapter contract", () => {
  it("derives adapter paths from API route contracts plus explicit aliases", () => {
    const contractPaths = apiRouteContracts.map((route) => route.path);

    expect(apiRouteAdapterPaths).toEqual(Array.from(new Set([...contractPaths, googleCalendarOAuthCallbackRoute, googleCalendarApiOAuthCallbackRoute])).sort());
    expect(apiRouteAdapterPaths).toContain("/api/health");
    expect(apiRouteAdapterPaths).toContain("/api/ai/card/generate");
    expect(apiRouteAdapterPaths).toContain("/api/walgreens/checkout/upload");
    expect(apiRouteAdapterPaths).toContain(googleCalendarOAuthCallbackRoute);
    expect(apiRouteAdapterPaths).toContain(googleCalendarApiOAuthCallbackRoute);
    expect(isApiRouteAdapterPath("/api/customer/bootstrap")).toBe(true);
    expect(isApiRouteAdapterPath("/api/not-a-contract")).toBe(false);
    expect(validateApiRouteAdapterContract()).toEqual([]);
  });

  it("requires aliases to target known API adapter paths", () => {
    expect(
      validateApiRouteAdapterContract({
        aliases: [
          ...apiRouteAdapterAliases,
          {
            id: "broken-alias",
            path: "/broken",
            targetPath: "/api/missing",
            owner: "test"
          }
        ]
      })
    ).toContain("API route adapter alias broken-alias targets an unknown path: /api/missing");
  });
});
