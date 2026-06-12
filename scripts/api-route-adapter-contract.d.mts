import type { ApiRouteContractData } from "../src/apiRouteContractsData.mjs";

export const googleCalendarOAuthCallbackRoute: "/oauth/callback";
export const googleCalendarApiOAuthCallbackRoute: "/api/oauth/callback";

export interface ApiRouteAdapterAlias {
  id: string;
  path: string;
  targetPath: string;
  owner: string;
}

export const apiRouteAdapterAliases: readonly ApiRouteAdapterAlias[];
export const apiRouteAdapterPaths: readonly string[];
export function isApiRouteAdapterPath(path: string): boolean;
export function validateApiRouteAdapterContract(options?: {
  routes?: ApiRouteContractData[];
  aliases?: readonly ApiRouteAdapterAlias[];
}): string[];
