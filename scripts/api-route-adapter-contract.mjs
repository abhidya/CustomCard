import { apiRouteContracts } from "../src/apiRouteContractsData.mjs";

export const googleCalendarOAuthCallbackRoute = "/oauth/callback";
export const googleCalendarApiOAuthCallbackRoute = "/api/oauth/callback";

export const apiRouteAdapterAliases = Object.freeze([
  {
    id: "google-calendar-oauth-browser-callback",
    path: googleCalendarOAuthCallbackRoute,
    targetPath: googleCalendarApiOAuthCallbackRoute,
    owner: "google-calendar-oauth"
  },
  {
    id: "google-calendar-oauth-api-callback",
    path: googleCalendarApiOAuthCallbackRoute,
    targetPath: googleCalendarApiOAuthCallbackRoute,
    owner: "google-calendar-oauth"
  }
]);

export const apiRouteAdapterPaths = Object.freeze(
  Array.from(new Set([...apiRouteContracts.map((route) => route.path), ...apiRouteAdapterAliases.map((alias) => alias.path)])).sort()
);

const apiRouteAdapterPathSet = new Set(apiRouteAdapterPaths);

export function isApiRouteAdapterPath(path) {
  return apiRouteAdapterPathSet.has(path);
}

export function validateApiRouteAdapterContract({ routes = apiRouteContracts, aliases = apiRouteAdapterAliases } = {}) {
  const blockers = [];
  const routePaths = new Set(routes.map((route) => route.path));
  const adapterPaths = new Set([...routePaths, ...aliases.map((alias) => alias.path)]);

  for (const route of routes) {
    if (!route.path.startsWith("/api/")) blockers.push(`API route adapter path must stay under /api: ${route.path}`);
  }
  for (const alias of aliases) {
    if (!alias.path.startsWith("/")) blockers.push(`API route adapter alias must be absolute: ${alias.id}`);
    if (!alias.targetPath.startsWith("/api/")) blockers.push(`API route adapter alias ${alias.id} must target an /api path.`);
    if (!adapterPaths.has(alias.targetPath)) blockers.push(`API route adapter alias ${alias.id} targets an unknown path: ${alias.targetPath}`);
  }
  for (const path of adapterPaths) {
    if (!isApiRouteAdapterPath(path)) blockers.push(`API route adapter path is not exposed: ${path}`);
  }

  return blockers;
}
