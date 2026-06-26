export type ApiMethodData = "GET" | "POST";
export type ApiAudienceData = "public" | "customer" | "admin" | "provider";
export type ApiAuthData = "none" | "customer-session" | "admin-session" | "provider-token";
export type ApiRuntimeModeData = "local-contract" | "durable-api" | "queue-backed";

export interface ApiRouteContractData {
  id: string;
  method: ApiMethodData;
  path: string;
  audience: ApiAudienceData;
  auth: ApiAuthData;
  runtimeMode: ApiRuntimeModeData;
  requestSchema: string[];
  responseSchema: string[];
  idempotencyKeyRequired: boolean;
  externalNetworkCalls: boolean;
  realOrdersEnabled: false;
  piiPolicy: string;
  backedBy: string[];
}

export interface MutationBodyContractSpec {
  requiredFields: string[];
  detail: string;
}

export const retailPrinterOperationStartRoute: "/api/retail-printers/operations/start";
export const retailPrinterCouponPortalEvidenceRoute: "/api/retail-printers/coupon-portal-evidence";
export const apiRouteContracts: ApiRouteContractData[];
export const gatedProviderNetworkRouteIds: Set<string>;
export const hostedCheckoutExemptRouteIds: Set<string>;
export const requiredApiRouteIds: string[];
export const requiredApiRoutePaths: string[];
export const repositoryBackedCustomerRouteIds: string[];
export const apiRoutePathById: Record<string, string>;
export const apiRouteIdByPath: Record<string, string>;
export const mutationBodyContractSpecs: Record<string, MutationBodyContractSpec>;
export const persistedTablesByRouteId: Record<string, string[]>;
export function persistedTablesForRouteId(routeId: string): string[];
export function getApiRouteById(routeId: string): ApiRouteContractData | undefined;
