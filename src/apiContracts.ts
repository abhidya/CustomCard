import { mobileExperience, summarizeMobileExperience, validateMobileExperience } from "../apps/mobile/src/customerExperience.ts";
import {
  buildAdminPanelModel,
  buildCustomerChatTranscript,
  buildCustomerPanelModel,
  providerCatalog,
  summarizeProviderCoverage,
  type ProviderCoverageSummary
} from "./providerCatalog.ts";
import { summarizeProviderGovernance, type ProviderGovernanceSummary } from "./providerGovernance.ts";
import { buildProviderAdapterRuntime, type RuntimeReadiness } from "./providerRuntime.ts";
import { buildPrinterPricingComparison } from "./printerPricing.ts";

export type ApiMethod = "GET" | "POST";
export type ApiAudience = "public" | "customer" | "admin";
export type ApiAuth = "none" | "customer-session" | "admin-session";
export type ApiRuntimeMode = "local-demo" | "durable-api" | "queue-backed";

export interface ApiRouteContract {
  id: string;
  method: ApiMethod;
  path: string;
  audience: ApiAudience;
  auth: ApiAuth;
  runtimeMode: ApiRuntimeMode;
  requestSchema: string[];
  responseSchema: string[];
  idempotencyKeyRequired: boolean;
  externalNetworkCalls: false;
  realOrdersEnabled: false;
  piiPolicy: string;
  backedBy: string[];
}

export interface ApiReadinessSummary {
  service: "customcard-api";
  status: "ready" | "blocked";
  routes: {
    total: number;
    public: number;
    customer: number;
    admin: number;
    mutations: number;
    idempotentMutations: number;
  };
  providers: ProviderCoverageSummary;
  governance: ProviderGovernanceSummary;
  runtime: {
    localReady: number;
    requestReady: number;
    blocked: number;
    missingCredentials: number;
  };
  mobile: ReturnType<typeof summarizeMobileExperience>;
  blockers: string[];
}

export interface ApiBootstrapPayload {
  customer: ReturnType<typeof buildCustomerPanelModel>;
  admin: ReturnType<typeof buildAdminPanelModel>;
  mobile: typeof mobileExperience;
  chatTranscript: ReturnType<typeof buildCustomerChatTranscript>;
  printerPricing: ReturnType<typeof buildPrinterPricingComparison>;
}

export const apiRouteContracts: ApiRouteContract[] = [
  {
    id: "health",
    method: "GET",
    path: "/api/health",
    audience: "public",
    auth: "none",
    runtimeMode: "local-demo",
    requestSchema: [],
    responseSchema: ["service", "status", "realOrdersEnabled"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "No customer data returned.",
    backedBy: ["runtime doctor", "kill switch"]
  },
  {
    id: "route-catalog",
    method: "GET",
    path: "/api/routes",
    audience: "public",
    auth: "none",
    runtimeMode: "local-demo",
    requestSchema: [],
    responseSchema: ["routes"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Public route metadata only; no customer data returned.",
    backedBy: ["apiRouteContracts"]
  },
  {
    id: "customer-bootstrap",
    method: "GET",
    path: "/api/customer/bootstrap",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: ["session"],
    responseSchema: ["primaryActions", "readyFallbacks", "chatTranscript", "printerPricing"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Approved memories only; public printer pricing observations contain no customer data.",
    backedBy: ["buildCustomerPanelModel", "buildCustomerChatTranscript", "buildPrinterPricingComparison"]
  },
  {
    id: "mobile-bootstrap",
    method: "GET",
    path: "/api/mobile/bootstrap",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: ["session", "platform"],
    responseSchema: ["sections", "chatTranscript", "renderChoices", "handoffSteps", "safetyBanner"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Static customer experience state; no raw provider content.",
    backedBy: ["mobileExperience", "validateMobileExperience"]
  },
  {
    id: "admin-readiness",
    method: "GET",
    path: "/api/admin/readiness",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["adminSession"],
    responseSchema: ["coverage", "governance", "runtime", "blockedProviders", "requiredEnv"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Operational metadata only; no customer content.",
    backedBy: ["buildAdminPanelModel", "buildProviderAdapterRuntime"]
  },
  {
    id: "admin-provider-catalog",
    method: "GET",
    path: "/api/admin/provider-catalog",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["adminSession"],
    responseSchema: ["adapters", "coverage"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Adapter metadata only.",
    backedBy: ["providerCatalog", "summarizeProviderCoverage"]
  },
  {
    id: "admin-provider-governance",
    method: "GET",
    path: "/api/admin/provider-governance",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["adminSession"],
    responseSchema: ["policies", "budgetCapped", "rateLimited", "fallbackCovered", "blockers"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Adapter governance metadata only; no customer content.",
    backedBy: ["summarizeProviderGovernance", "validateProviderGovernance"]
  },
  {
    id: "admin-persistence-readiness",
    method: "GET",
    path: "/api/admin/persistence-readiness",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["adminSession"],
    responseSchema: ["tables", "auth", "idempotency", "blockers"],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Persistence metadata only; no customer content.",
    backedBy: ["persistence contracts", "migration doctor"]
  },
  {
    id: "admin-demo-reset",
    method: "POST",
    path: "/api/admin/demo-reset",
    audience: "admin",
    auth: "admin-session",
    runtimeMode: "durable-api",
    requestSchema: ["X-Idempotency-Key", "resetKey", "confirmDemoOnly"],
    responseSchema: ["seedSummary", "tables", "rows", "signedArtifactUrls", "realOrdersEnabled"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Demo fixture reset only; no raw provider content or production credentials.",
    backedBy: ["buildDemoSeedPlan", "scripts/demo-reset.mjs"]
  },
  {
    id: "import-preview",
    method: "POST",
    path: "/api/import-preview",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: ["X-Idempotency-Key", "sourceKind", "metadataOnlyPayload"],
    responseSchema: ["opportunities", "warnings", "rawContentStored"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Metadata-only import preview; raw content storage forbidden.",
    backedBy: ["parseFreeImport", "serviceKernel.importEvents"]
  },
  {
    id: "card-projects",
    method: "POST",
    path: "/api/card-projects",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: ["X-Idempotency-Key", "opportunityId", "approvedMemoryIds", "locale"],
    responseSchema: ["projectId", "renderStatus", "requiresRtlLayout"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Uses approved memory ids only.",
    backedBy: ["createCardProject", "renderPrintPacket"]
  },
  {
    id: "relationship-memories",
    method: "POST",
    path: "/api/memories/review",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: ["X-Idempotency-Key", "recipientName", "text", "decision"],
    responseSchema: ["memoryId", "recipientName", "approved", "forgottenAt", "memoryUseAllowed"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Stores customer-approved relationship memory only; forget decision tombstones reuse.",
    backedBy: ["approveRelationshipMemory", "forgetRelationshipMemory", "relationship_memories"]
  },
  {
    id: "render-packets",
    method: "POST",
    path: "/api/render-packets",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "queue-backed",
    requestSchema: ["X-Idempotency-Key", "projectId", "panels"],
    responseSchema: ["renderPacketId", "checksum", "artifactManifest", "signedArtifactUrls", "status"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Stores validated panel artifacts only; signed URLs expire and require external-share approval.",
    backedBy: ["renderPrintPacket", "object-store render packets", "buildArtifactHandoffContract"]
  },
  {
    id: "manual-vendor-handoff",
    method: "POST",
    path: "/api/vendor-handoff/manual",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "queue-backed",
    requestSchema: ["X-Idempotency-Key", "renderPacketId", "vendorId", "externalShareApproval"],
    responseSchema: ["handoffChecklist", "signedArtifactUrls", "realOrdersEnabled", "disabledReasons"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Manual checklist only; no live vendor order payload.",
    backedBy: ["buildVendorHandoff", "blocked live vendor adapters"]
  },
  {
    id: "data-requests",
    method: "POST",
    path: "/api/data-requests",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: ["X-Idempotency-Key", "action", "region"],
    responseSchema: ["allowed", "requiredControls", "auditRequired"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Audited regional data-rights control.",
    backedBy: ["evaluateRegulatoryDecision", "audit_log"]
  }
];

export function buildApiReadinessSummary(routes: ApiRouteContract[] = apiRouteContracts): ApiReadinessSummary {
  const runtimeReadiness = providerCatalog.map((adapter) => buildProviderAdapterRuntime(adapter.id).readiness);
  const blockers = validateApiContracts(routes);

  return {
    service: "customcard-api",
    status: blockers.length === 0 ? "ready" : "blocked",
    routes: {
      total: routes.length,
      public: routes.filter((route) => route.audience === "public").length,
      customer: routes.filter((route) => route.audience === "customer").length,
      admin: routes.filter((route) => route.audience === "admin").length,
      mutations: routes.filter((route) => route.method === "POST").length,
      idempotentMutations: routes.filter((route) => route.method === "POST" && route.idempotencyKeyRequired).length
    },
    providers: summarizeProviderCoverage(),
    governance: summarizeProviderGovernance(),
    runtime: summarizeApiRuntime(runtimeReadiness),
    mobile: summarizeMobileExperience(),
    blockers
  };
}

export function buildApiBootstrapPayload(): ApiBootstrapPayload {
  return {
    customer: buildCustomerPanelModel(),
    admin: buildAdminPanelModel(),
    mobile: mobileExperience,
    chatTranscript: buildCustomerChatTranscript("Sara and Ahmed"),
    printerPricing: buildPrinterPricingComparison("walgreens")
  };
}

export function resolveApiContractResponse(path: string) {
  if (path === "/api/health") {
    return {
      service: "customcard-api",
      status: "ready",
      realOrdersEnabled: false
    };
  }
  if (path === "/api/routes") {
    return apiRouteContracts;
  }
  if (path === "/api/admin/readiness") {
    return buildApiReadinessSummary();
  }
  if (path === "/api/customer/bootstrap" || path === "/api/mobile/bootstrap") {
    return buildApiBootstrapPayload();
  }
  if (path === "/api/admin/provider-catalog") {
    return {
      adapters: providerCatalog,
      coverage: summarizeProviderCoverage()
    };
  }
  if (path === "/api/admin/provider-governance") {
    return summarizeProviderGovernance();
  }

  return undefined;
}

export function validateApiContracts(routes: ApiRouteContract[] = apiRouteContracts): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  const paths = new Set<string>();

  for (const route of routes) {
    if (ids.has(route.id)) issues.push(`Duplicate API route id: ${route.id}`);
    ids.add(route.id);
    const pathKey = `${route.method} ${route.path}`;
    if (paths.has(pathKey)) issues.push(`Duplicate API route path: ${pathKey}`);
    paths.add(pathKey);

    if (!route.path.startsWith("/api/")) issues.push(`Route ${route.id} must stay under /api.`);
    if (route.audience === "admin" && route.auth !== "admin-session") {
      issues.push(`Admin route ${route.id} must require admin-session auth.`);
    }
    if (route.audience === "customer" && route.auth !== "customer-session") {
      issues.push(`Customer route ${route.id} must require customer-session auth.`);
    }
    if (route.method === "POST" && !route.idempotencyKeyRequired) {
      issues.push(`Mutation route ${route.id} must require an idempotency key.`);
    }
    if (route.method === "POST" && !route.requestSchema.includes("X-Idempotency-Key")) {
      issues.push(`Mutation route ${route.id} must name X-Idempotency-Key in the request schema.`);
    }
    if (route.externalNetworkCalls) issues.push(`Route ${route.id} must not make live external calls.`);
    if (route.realOrdersEnabled) issues.push(`Route ${route.id} must keep real orders disabled.`);
    if (/\braw content (allowed|stored|returned)\b/i.test(route.piiPolicy)) {
      issues.push(`Route ${route.id} must not allow raw content policy language.`);
    }
  }

  for (const requiredRoute of [
    "health",
    "route-catalog",
    "customer-bootstrap",
    "mobile-bootstrap",
    "admin-readiness",
    "admin-provider-catalog",
    "admin-provider-governance",
    "admin-persistence-readiness",
    "admin-demo-reset",
    "import-preview",
    "card-projects",
    "relationship-memories",
    "render-packets",
    "manual-vendor-handoff",
    "data-requests"
  ]) {
    if (!ids.has(requiredRoute)) issues.push(`Missing API route contract: ${requiredRoute}`);
  }

  if (validateMobileExperience().length > 0) {
    issues.push("Mobile API bootstrap model failed validation.");
  }

  return issues;
}

function summarizeApiRuntime(readiness: RuntimeReadiness[]): ApiReadinessSummary["runtime"] {
  return {
    localReady: readiness.filter((item) => item.mode === "local-result").length,
    requestReady: readiness.filter((item) => item.mode === "prepared-request").length,
    blocked: readiness.filter((item) => item.mode === "blocked").length,
    missingCredentials: readiness.reduce((total, item) => total + item.missingCredentials.length, 0)
  };
}
