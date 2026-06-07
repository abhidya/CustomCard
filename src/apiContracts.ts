import { mobileExperience, summarizeMobileExperience, validateMobileExperience } from "../apps/mobile/src/customerExperience.ts";
import {
  aiProviderReadinessItems,
  summarizeAiProviderReadiness,
  validateAiProviderReadiness,
  type AiProviderReadinessItem,
  type AiProviderReadinessSummary
} from "./aiProviderReadiness";
import {
  capacityProfiles,
  summarizeCapacityPlan,
  validateCapacityProfiles,
  type CapacityPlanSummary,
  type CapacityProfile
} from "./capacityPlan";
import {
  externalAuditReadinessItems,
  summarizeExternalAuditReadiness,
  validateExternalAuditReadiness,
  type ExternalAuditReadinessItem,
  type ExternalAuditReadinessSummary
} from "./externalAuditReadiness";
import {
  e2eCoverageItems,
  summarizeE2eCoverage,
  validateE2eCoverage,
  type E2eCoverageItem,
  type E2eCoverageSummary
} from "./e2eCoverage";
import {
  summarizeLocalizationReadiness,
  supportedLocales,
  type LocalizationReadinessSummary
} from "./localization.ts";
import {
  observabilityReadinessItems,
  summarizeObservabilityReadiness,
  validateObservabilityReadiness,
  type ObservabilityReadinessItem,
  type ObservabilityReadinessSummary
} from "./observabilityReadiness";
import {
  retailFulfillmentReadinessItems,
  summarizeRetailFulfillmentReadiness,
  validateRetailFulfillmentReadiness,
  type RetailFulfillmentReadinessItem,
  type RetailFulfillmentReadinessSummary
} from "./retailFulfillmentReadiness";
import {
  paymentReadinessItems,
  summarizePaymentReadiness,
  validatePaymentReadiness,
  type PaymentReadinessItem,
  type PaymentReadinessSummary
} from "./paymentReadiness";
import {
  mobileRenderReadinessItems,
  summarizeMobileRenderReadiness,
  validateMobileRenderReadiness,
  type MobileRenderReadinessItem,
  type MobileRenderReadinessSummary
} from "./mobileRenderReadiness";
import {
  hostedApiReadinessItems,
  summarizeHostedApiReadiness,
  validateHostedApiReadiness,
  type HostedApiReadinessItem,
  type HostedApiReadinessSummary
} from "./hostedApiReadiness";
import {
  reviewerDbSeedReadinessItems,
  summarizeReviewerDbSeedReadiness,
  validateReviewerDbSeedReadiness,
  type ReviewerDbSeedReadinessItem,
  type ReviewerDbSeedReadinessSummary
} from "./reviewerDbSeedReadiness";
import {
  cloudArtifactProofReadinessItems,
  summarizeCloudArtifactProofReadiness,
  validateCloudArtifactProofReadiness,
  type CloudArtifactProofReadinessItem,
  type CloudArtifactProofReadinessSummary
} from "./cloudArtifactProofReadiness";
import {
  businessEngagementReadinessItems,
  summarizeBusinessEngagementReadiness,
  validateBusinessEngagementReadiness,
  type BusinessEngagementReadinessItem,
  type BusinessEngagementReadinessSummary
} from "./businessEngagementReadiness";
import {
  buildCalendarConnectionStartPackets,
  buildCalendarConnectionStartResponse,
  validateCalendarConnectionStartPackets,
  type CalendarConnectionStartPacket
} from "./onboardingCalendar";
import {
  buildAdminPanelModel,
  buildCustomerChatTranscript,
  buildCustomerPanelModel,
  providerCatalog,
  summarizeProviderCoverage,
  type ProviderCoverageSummary
} from "./providerCatalog.ts";
import { buildCustomerChatSession } from "./customerChat.ts";
import { summarizeProviderGovernance, type ProviderGovernanceSummary } from "./providerGovernance.ts";
import { buildProviderAdapterRuntime, type RuntimeReadiness } from "./providerRuntime.ts";
import {
  productionLaunchGates,
  summarizeProductionReadiness,
  type ProductionReadinessSummary
} from "./productionReadiness.ts";
import { buildPrinterPricingComparison } from "./printerPricing.ts";
import { buildFulfillmentRecommendations } from "./fulfillmentRecommendation.ts";

export type ApiMethod = "GET" | "POST";
export type ApiAudience = "public" | "customer" | "admin";
export type ApiAuth = "none" | "customer-session" | "admin-session";
export type ApiRuntimeMode = "local-contract" | "durable-api" | "queue-backed";

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
  localization: LocalizationReadinessSummary;
  production: ProductionReadinessSummary;
  externalAudit: ExternalAuditReadinessSummary;
  e2eCoverage: E2eCoverageSummary;
  aiProviderReadiness: AiProviderReadinessSummary;
  capacity: CapacityPlanSummary;
  observability: ObservabilityReadinessSummary;
  retailFulfillment: RetailFulfillmentReadinessSummary;
  paymentReadiness: PaymentReadinessSummary;
  mobileRenderReadiness: MobileRenderReadinessSummary;
  hostedApiReadiness: HostedApiReadinessSummary;
  reviewerDbSeedReadiness: ReviewerDbSeedReadinessSummary;
  cloudArtifactProofReadiness: CloudArtifactProofReadinessSummary;
  businessEngagementReadiness: BusinessEngagementReadinessSummary;
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
  localization: {
    locales: typeof supportedLocales;
    summary: LocalizationReadinessSummary;
  };
  production: {
    gates: typeof productionLaunchGates;
    summary: ProductionReadinessSummary;
  };
  externalAudit: {
    items: ExternalAuditReadinessItem[];
    summary: ExternalAuditReadinessSummary;
  };
  e2eCoverage: {
    items: E2eCoverageItem[];
    summary: E2eCoverageSummary;
  };
  aiProviderReadiness: {
    items: AiProviderReadinessItem[];
    summary: AiProviderReadinessSummary;
  };
  capacity: {
    profiles: CapacityProfile[];
    summary: CapacityPlanSummary;
  };
  observability: {
    items: ObservabilityReadinessItem[];
    summary: ObservabilityReadinessSummary;
  };
  retailFulfillment: {
    items: RetailFulfillmentReadinessItem[];
    summary: RetailFulfillmentReadinessSummary;
  };
  paymentReadiness: {
    items: PaymentReadinessItem[];
    summary: PaymentReadinessSummary;
  };
  mobileRenderReadiness: {
    items: MobileRenderReadinessItem[];
    summary: MobileRenderReadinessSummary;
  };
  hostedApiReadiness: {
    items: HostedApiReadinessItem[];
    summary: HostedApiReadinessSummary;
  };
  reviewerDbSeedReadiness: {
    items: ReviewerDbSeedReadinessItem[];
    summary: ReviewerDbSeedReadinessSummary;
  };
  cloudArtifactProofReadiness: {
    items: CloudArtifactProofReadinessItem[];
    summary: CloudArtifactProofReadinessSummary;
  };
  businessEngagementReadiness: {
    items: BusinessEngagementReadinessItem[];
    summary: BusinessEngagementReadinessSummary;
  };
  chatTranscript: ReturnType<typeof buildCustomerChatTranscript>;
  customerChat: ReturnType<typeof buildCustomerChatSession>;
  printerPricing: ReturnType<typeof buildPrinterPricingComparison>;
  fulfillmentRecommendations: ReturnType<typeof buildFulfillmentRecommendations>;
  calendarConnections: {
    startRoute: "/api/calendar/connections/start";
    startPackets: CalendarConnectionStartPacket[];
    blockers: string[];
  };
}

export const apiRouteContracts: ApiRouteContract[] = [
  {
    id: "health",
    method: "GET",
    path: "/api/health",
    audience: "public",
    auth: "none",
    runtimeMode: "local-contract",
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
    runtimeMode: "local-contract",
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
    responseSchema: [
      "primaryActions",
      "readyFallbacks",
      "chatTranscript",
      "customerChat",
      "printerPricing",
      "fulfillmentRecommendations",
      "localization"
    ],
    idempotencyKeyRequired: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Approved memories only; public printer pricing observations contain no customer data.",
    backedBy: ["buildCustomerPanelModel", "buildCustomerChatSession", "buildPrinterPricingComparison"]
  },
  {
    id: "mobile-bootstrap",
    method: "GET",
    path: "/api/mobile/bootstrap",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: ["session", "platform"],
    responseSchema: [
      "sections",
      "accountOptions",
      "importActions",
      "todaySummary",
      "queueItems",
      "approvalActions",
      "chatTranscript",
      "memoryReviewItems",
      "renderChoices",
      "pricingPreviews",
      "fulfillmentRecommendations",
      "printProofChecks",
      "handoffSteps",
      "syncState",
      "safetyBanner",
      "localeOptions",
      "localization"
    ],
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
    responseSchema: [
      "coverage",
      "governance",
      "localization",
      "production",
      "externalAudit",
      "e2eCoverage",
      "aiProviderReadiness",
      "capacity",
      "observability",
      "retailFulfillment",
      "paymentReadiness",
      "mobileRenderReadiness",
      "hostedApiReadiness",
      "cloudArtifactProofReadiness",
      "runtime",
      "blockedProviders",
      "requiredEnv"
    ],
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
    requestSchema: [
      "X-Idempotency-Key",
      "sourceKind",
      "metadataOnlyPayload",
      "rawImportText",
      "rawInviteText",
      "rawIcsText",
      "rawCalendarText"
    ],
    responseSchema: ["opportunities", "warnings", "rawContentStored"],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Metadata-only import preview; raw content storage forbidden.",
    backedBy: ["resolveImportPreviewMetadata", "parseFreeImport", "serviceKernel.importEvents"]
  },
  {
    id: "calendar-connection-start",
    method: "POST",
    path: "/api/calendar/connections/start",
    audience: "customer",
    auth: "customer-session",
    runtimeMode: "durable-api",
    requestSchema: ["X-Idempotency-Key", "calendarChoiceId", "returnTo"],
    responseSchema: [
      "startPacket",
      "serverOwned",
      "clientMayPrepareProviderRequest",
      "providerRequestUrl",
      "networkRequestPrepared",
      "credentialStorageEnabled",
      "externalNetworkCalls",
      "realOrdersEnabled",
      "rawContentStored",
      "nextApiRoute",
      "blockers"
    ],
    idempotencyKeyRequired: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    piiPolicy: "Server-owned connection start policy only; no provider credential, raw calendar content, or live provider request returned.",
    backedBy: ["buildCalendarConnectionStartPackets", "validateCalendarConnectionStartPackets"]
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
    localization: summarizeLocalizationReadiness(),
    production: summarizeProductionReadiness(),
    externalAudit: summarizeExternalAuditReadiness(),
    e2eCoverage: summarizeE2eCoverage(),
    aiProviderReadiness: summarizeAiProviderReadiness(),
    capacity: summarizeCapacityPlan(),
    observability: summarizeObservabilityReadiness(),
    retailFulfillment: summarizeRetailFulfillmentReadiness(),
    paymentReadiness: summarizePaymentReadiness(),
    mobileRenderReadiness: summarizeMobileRenderReadiness(),
    hostedApiReadiness: summarizeHostedApiReadiness(),
    reviewerDbSeedReadiness: summarizeReviewerDbSeedReadiness(),
    cloudArtifactProofReadiness: summarizeCloudArtifactProofReadiness(),
    businessEngagementReadiness: summarizeBusinessEngagementReadiness(),
    runtime: summarizeApiRuntime(runtimeReadiness),
    mobile: summarizeMobileExperience(),
    blockers
  };
}

export function buildApiBootstrapPayload(): ApiBootstrapPayload {
  const printerPricing = buildPrinterPricingComparison("walgreens");
  const startPackets = buildCalendarConnectionStartPackets();

  return {
    customer: buildCustomerPanelModel(),
    admin: buildAdminPanelModel(),
    mobile: mobileExperience,
    localization: {
      locales: supportedLocales,
      summary: summarizeLocalizationReadiness()
    },
    production: {
      gates: productionLaunchGates,
      summary: summarizeProductionReadiness()
    },
    externalAudit: {
      items: externalAuditReadinessItems,
      summary: summarizeExternalAuditReadiness()
    },
    e2eCoverage: {
      items: e2eCoverageItems,
      summary: summarizeE2eCoverage()
    },
    aiProviderReadiness: {
      items: aiProviderReadinessItems,
      summary: summarizeAiProviderReadiness()
    },
    capacity: {
      profiles: capacityProfiles,
      summary: summarizeCapacityPlan()
    },
    observability: {
      items: observabilityReadinessItems,
      summary: summarizeObservabilityReadiness()
    },
    retailFulfillment: {
      items: retailFulfillmentReadinessItems,
      summary: summarizeRetailFulfillmentReadiness()
    },
    paymentReadiness: {
      items: paymentReadinessItems,
      summary: summarizePaymentReadiness()
    },
    mobileRenderReadiness: {
      items: mobileRenderReadinessItems,
      summary: summarizeMobileRenderReadiness()
    },
    hostedApiReadiness: {
      items: hostedApiReadinessItems,
      summary: summarizeHostedApiReadiness()
    },
    reviewerDbSeedReadiness: {
      items: reviewerDbSeedReadinessItems,
      summary: summarizeReviewerDbSeedReadiness()
    },
    cloudArtifactProofReadiness: {
      items: cloudArtifactProofReadinessItems,
      summary: summarizeCloudArtifactProofReadiness()
    },
    businessEngagementReadiness: {
      items: businessEngagementReadinessItems,
      summary: summarizeBusinessEngagementReadiness()
    },
    chatTranscript: buildCustomerChatTranscript("Sara and Ahmed"),
    customerChat: buildCustomerChatSession({
      recipientName: "Sara and Ahmed",
      customerMessage: "",
      approvedMemoryNotes: ["They like botanical cards."],
      locale: "en-US",
      fulfillmentContext: "Cheapest pickup and cheapest shipped recommendations are review-only public prices."
    }),
    printerPricing,
    fulfillmentRecommendations: buildFulfillmentRecommendations(printerPricing),
    calendarConnections: {
      startRoute: "/api/calendar/connections/start",
      startPackets,
      blockers: validateCalendarConnectionStartPackets(startPackets)
    }
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
  if (path === "/api/customer/bootstrap") {
    return buildApiBootstrapPayload();
  }
  if (path === "/api/mobile/bootstrap") {
    return buildApiBootstrapPayload().mobile;
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
  if (path === "/api/calendar/connections/start") {
    return buildCalendarConnectionStartResponse();
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
    "calendar-connection-start",
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
  for (const calendarConnectionIssue of validateCalendarConnectionStartPackets()) {
    issues.push(calendarConnectionIssue);
  }
  for (const capacityIssue of validateCapacityProfiles()) {
    issues.push(capacityIssue);
  }
  for (const externalAuditIssue of validateExternalAuditReadiness()) {
    issues.push(externalAuditIssue);
  }
  for (const e2eCoverageIssue of validateE2eCoverage()) {
    issues.push(e2eCoverageIssue);
  }
  for (const aiProviderReadinessIssue of validateAiProviderReadiness()) {
    issues.push(aiProviderReadinessIssue);
  }
  for (const observabilityIssue of validateObservabilityReadiness()) {
    issues.push(observabilityIssue);
  }
  for (const retailFulfillmentIssue of validateRetailFulfillmentReadiness()) {
    issues.push(retailFulfillmentIssue);
  }
  for (const paymentReadinessIssue of validatePaymentReadiness()) {
    issues.push(paymentReadinessIssue);
  }
  for (const mobileRenderReadinessIssue of validateMobileRenderReadiness()) {
    issues.push(mobileRenderReadinessIssue);
  }
  for (const hostedApiReadinessIssue of validateHostedApiReadiness()) {
    issues.push(hostedApiReadinessIssue);
  }
  for (const reviewerDbSeedReadinessIssue of validateReviewerDbSeedReadiness()) {
    issues.push(reviewerDbSeedReadinessIssue);
  }
  for (const cloudArtifactProofReadinessIssue of validateCloudArtifactProofReadiness()) {
    issues.push(cloudArtifactProofReadinessIssue);
  }
  for (const businessEngagementReadinessIssue of validateBusinessEngagementReadiness()) {
    issues.push(businessEngagementReadinessIssue);
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
