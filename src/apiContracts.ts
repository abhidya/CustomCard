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
  buildRetailPrinterOperationStartPackets,
  buildRetailPrinterOperationStartResponse,
  retailPrinterOperationStartRoute,
  validateRetailPrinterOperationStartPackets,
  type RetailPrinterOperationStartPacket
} from "./retailPrinterOperationStart";
import {
  buildRetailPrinterCouponPortalEvidenceResponse,
  buildSampleRetailPrinterCouponPortalEvidencePayload,
  retailPrinterCouponPortalEvidenceRoute
} from "./retailPrinterCouponPortalEvidenceData.mjs";
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
import { getProviderRuntimeReadiness, type RuntimeReadiness } from "./providerRuntime.ts";
import {
  productionLaunchGates,
  summarizeProductionReadiness,
  type ProductionReadinessSummary
} from "./productionReadiness.ts";
import { buildPrinterPricingComparison } from "./printerPricing.ts";
import { buildFulfillmentRecommendations } from "./fulfillmentRecommendation.ts";
import {
  apiRouteContracts as apiRouteContractData,
  hostedCheckoutExemptRouteIds,
  requiredApiRouteIds
} from "./apiRouteContractsData.mjs";

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
  /** Only the Walgreens hosted-checkout proxy routes may set this to true. */
  externalNetworkCalls: boolean;
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
  retailOperations: {
    startRoute: typeof retailPrinterOperationStartRoute;
    startPackets: RetailPrinterOperationStartPacket[];
    blockers: string[];
  };
}

export const apiRouteContracts: ApiRouteContract[] = apiRouteContractData;

export function buildApiReadinessSummary(routes: ApiRouteContract[] = apiRouteContracts): ApiReadinessSummary {
  const runtimeReadiness = providerCatalog.map((adapter) => getProviderRuntimeReadiness(adapter.id));
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
  const calendarStartPackets = buildCalendarConnectionStartPackets();
  const retailOperationStartPackets = buildRetailPrinterOperationStartPackets();

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
      startPackets: calendarStartPackets,
      blockers: validateCalendarConnectionStartPackets(calendarStartPackets)
    },
    retailOperations: {
      startRoute: retailPrinterOperationStartRoute,
      startPackets: retailOperationStartPackets,
      blockers: validateRetailPrinterOperationStartPackets(retailOperationStartPackets)
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
  if (path === retailPrinterOperationStartRoute) {
    return buildRetailPrinterOperationStartResponse({ vendorId: "walgreens", operation: "fetch-price" });
  }
  if (path === retailPrinterCouponPortalEvidenceRoute) {
    return buildRetailPrinterCouponPortalEvidenceResponse(buildSampleRetailPrinterCouponPortalEvidencePayload());
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

    const hostedCheckoutExempt = hostedCheckoutExemptRouteIds.has(route.id);
    if (!route.path.startsWith("/api/")) issues.push(`Route ${route.id} must stay under /api.`);
    if (route.audience === "admin" && route.auth !== "admin-session") {
      issues.push(`Admin route ${route.id} must require admin-session auth.`);
    }
    if (route.audience === "customer" && route.auth !== "customer-session" && !hostedCheckoutExempt) {
      issues.push(`Customer route ${route.id} must require customer-session auth.`);
    }
    if (route.method === "POST" && !route.idempotencyKeyRequired && !hostedCheckoutExempt) {
      issues.push(`Mutation route ${route.id} must require an idempotency key.`);
    }
    if (route.method === "POST" && !route.requestSchema.includes("X-Idempotency-Key") && !hostedCheckoutExempt) {
      issues.push(`Mutation route ${route.id} must name X-Idempotency-Key in the request schema.`);
    }
    if (route.externalNetworkCalls && !hostedCheckoutExempt) {
      issues.push(`Route ${route.id} must not make live external calls.`);
    }
    if (route.externalNetworkCalls && route.id === "walgreens-checkout-callback") {
      issues.push("The Walgreens checkout callback page must stay network-free.");
    }
    if (route.realOrdersEnabled) issues.push(`Route ${route.id} must keep real orders disabled.`);
    if (/\braw content (allowed|stored|returned)\b/i.test(route.piiPolicy)) {
      issues.push(`Route ${route.id} must not allow raw content policy language.`);
    }
  }

  for (const requiredRoute of requiredApiRouteIds) {
    if (!ids.has(requiredRoute)) issues.push(`Missing API route contract: ${requiredRoute}`);
  }

  if (validateMobileExperience().length > 0) {
    issues.push("Mobile API bootstrap model failed validation.");
  }
  for (const calendarConnectionIssue of validateCalendarConnectionStartPackets()) {
    issues.push(calendarConnectionIssue);
  }
  for (const retailOperationIssue of validateRetailPrinterOperationStartPackets()) {
    issues.push(retailOperationIssue);
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
