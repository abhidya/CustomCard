import {
  getRetailPrinterOperationPolicy,
  retailPrinterAdapters,
  retailPrinterOperationKinds,
  retailPrinterProductLinks,
  type RetailPrinterAdapterContract,
  type RetailPrinterOperationKind,
  type RetailPrinterOperationPolicy,
  type RetailPrinterProviderOperationEntrypoint,
  type RetailPrinterSourceLink,
  type RetailPrinterVendorId
} from "./retailPrinterAdapters";
import { buildPrinterCouponCollectionPlan, type PrinterCouponCollectionPlan } from "./printerPricing";

export const retailPrinterOperationStartRoute = "/api/retail-printers/operations/start" as const;

export interface RetailPrinterOperationStartPacket {
  id: string;
  vendorId: RetailPrinterVendorId;
  providerAdapterId: string;
  vendorName: string;
  productName: string;
  productSku: string;
  operation: RetailPrinterOperationKind;
  label: string;
  status: "blocked";
  apiRoute: typeof retailPrinterOperationStartRoute;
  serverOwned: true;
  customerVisible: true;
  productUrl: string;
  manualReviewUrl: string;
  providerPortalUrl: string;
  providerRequestUrl: null;
  clientMayPrepareProviderRequest: false;
  providerRequestPrepared: false;
  networkRequestPrepared: false;
  requestPrepared: false;
  networkAttempted: false;
  noNetwork: true;
  externalNetworkCalls: false;
  realOrdersEnabled: false;
  liveQuoteEnabled: false;
  imageUploadEnabled: false;
  orderPlacementEnabled: false;
  sourceLink: RetailPrinterSourceLink;
  providerEntrypoint: RetailPrinterProviderOperationEntrypoint;
  operationPolicy: RetailPrinterOperationPolicy;
  couponCollectionPlan: PrinterCouponCollectionPlan;
  couponPortalApplicationRequired: true;
  bestPriceRequiresProviderPortalEvidence: true;
  canAffectBestPriceBeforePortalEvidence: false;
  expectedInputFields: string[];
  requiredInputFields: string[];
  optionalInputFields: string[];
  sourceBackedFields: string[];
  requiredEvidence: string[];
  requiredGateIds: string[];
  blockers: string[];
  forbiddenFields: string[];
  operatorSteps: string[];
  safetyChecks: string[];
  blockedReason: string;
}

export interface RetailPrinterOperationStartResponse {
  service: "customcard-retail-printer-operation-start";
  status: "blocked";
  requestedVendorId: RetailPrinterVendorId;
  requestedOperation: RetailPrinterOperationKind;
  startPacket: RetailPrinterOperationStartPacket;
  serverOwned: true;
  clientMayPrepareProviderRequest: false;
  providerPortalUrl: string;
  providerRequestUrl: null;
  providerRequestPrepared: false;
  networkRequestPrepared: false;
  requestPrepared: false;
  networkAttempted: false;
  externalNetworkCalls: false;
  realOrdersEnabled: false;
  liveQuoteEnabled: false;
  imageUploadEnabled: false;
  orderPlacementEnabled: false;
  blockers: string[];
}

export interface RetailPrinterOperationStartRequest {
  vendorId?: string;
  operation?: string;
}

export function buildRetailPrinterOperationStartPackets(
  adapters: RetailPrinterAdapterContract[] = retailPrinterAdapters
): RetailPrinterOperationStartPacket[] {
  return adapters.flatMap((adapter) =>
    retailPrinterOperationKinds.map((operation) => buildRetailPrinterOperationStartPacket(adapter, operation))
  );
}

export function buildRetailPrinterOperationStartResponse(
  request: RetailPrinterOperationStartRequest
): RetailPrinterOperationStartResponse {
  const requestedVendorId = parseRetailPrinterVendorId(request.vendorId) ?? "walgreens";
  const requestedOperation = parseRetailPrinterOperationKind(request.operation) ?? "fetch-price";
  const startPacket = buildRetailPrinterOperationStartPackets().find(
    (packet) => packet.vendorId === requestedVendorId && packet.operation === requestedOperation
  );

  if (!startPacket) throw new Error(`Missing retail printer operation start packet: ${requestedVendorId} ${requestedOperation}`);

  return {
    service: "customcard-retail-printer-operation-start",
    status: "blocked",
    requestedVendorId,
    requestedOperation,
    startPacket,
    serverOwned: true,
    clientMayPrepareProviderRequest: false,
    providerPortalUrl: startPacket.providerPortalUrl,
    providerRequestUrl: null,
    providerRequestPrepared: false,
    networkRequestPrepared: false,
    requestPrepared: false,
    networkAttempted: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveQuoteEnabled: false,
    imageUploadEnabled: false,
    orderPlacementEnabled: false,
    blockers: startPacket.blockers
  };
}

export function validateRetailPrinterOperationStartPackets(
  packets: RetailPrinterOperationStartPacket[] = buildRetailPrinterOperationStartPackets()
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const packet of packets) {
    const productLink = retailPrinterProductLinks[packet.vendorId];
    if (ids.has(packet.id)) errors.push(`Duplicate retail printer operation start packet: ${packet.id}`);
    ids.add(packet.id);
    if (packet.apiRoute !== retailPrinterOperationStartRoute) {
      errors.push(`Retail printer operation start packet ${packet.id} must use the operation start API route.`);
    }
    if (!packet.serverOwned || !packet.customerVisible) {
      errors.push(`Retail printer operation start packet ${packet.id} must be server-owned and customer-visible.`);
    }
    if (packet.productUrl !== productLink.productUrl || packet.manualReviewUrl !== productLink.productUrl) {
      errors.push(`Retail printer operation start packet ${packet.id} must use the exact persisted product URL.`);
    }
    if (packet.providerPortalUrl !== productLink.productUrl) {
      errors.push(`Retail printer operation start packet ${packet.id} must expose the persisted provider portal URL.`);
    }
    if (packet.providerRequestUrl !== null || packet.clientMayPrepareProviderRequest || packet.providerRequestPrepared) {
      errors.push(`Retail printer operation start packet ${packet.id} must not expose a client-prepared provider request.`);
    }
    if (
      packet.networkRequestPrepared ||
      packet.requestPrepared ||
      packet.networkAttempted ||
      !packet.noNetwork ||
      packet.externalNetworkCalls ||
      packet.realOrdersEnabled
    ) {
      errors.push(`Retail printer operation start packet ${packet.id} must stay no-network and real-order disabled.`);
    }
    if (packet.liveQuoteEnabled || packet.imageUploadEnabled || packet.orderPlacementEnabled) {
      errors.push(`Retail printer operation start packet ${packet.id} must not enable live quote, upload, or order operations.`);
    }
    if (packet.sourceLink.url !== productLink.productUrl || packet.providerEntrypoint.url !== productLink.productUrl) {
      errors.push(`Retail printer operation start packet ${packet.id} must point source and entrypoint to the persisted URL.`);
    }
    if (packet.sourceLink.purpose !== packet.operation || packet.providerEntrypoint.operation !== packet.operation) {
      errors.push(`Retail printer operation start packet ${packet.id} must align source, entrypoint, and operation.`);
    }
    if (packet.couponCollectionPlan.bestPriceRequiresProviderPortalEvidence !== true) {
      errors.push(`Retail printer operation start packet ${packet.id} must require provider-portal coupon evidence.`);
    }
    if (packet.couponCollectionPlan.canAffectBestPriceBeforePortalEvidence !== false) {
      errors.push(`Retail printer operation start packet ${packet.id} must block coupon ranking before portal evidence.`);
    }
    if (
      !packet.couponPortalApplicationRequired ||
      !packet.bestPriceRequiresProviderPortalEvidence ||
      packet.canAffectBestPriceBeforePortalEvidence
    ) {
      errors.push(`Retail printer operation start packet ${packet.id} must keep coupon pricing portal-gated.`);
    }
    if (packet.requiredEvidence.length < 3 || packet.requiredGateIds.length < 3 || packet.operatorSteps.length < 4) {
      errors.push(`Retail printer operation start packet ${packet.id} must include evidence, gates, and operator steps.`);
    }
    if (packet.blockers.length < packet.requiredGateIds.length) {
      errors.push(`Retail printer operation start packet ${packet.id} must expose all gate blockers.`);
    }
    if (
      packet.operation === "fetch-price" &&
      (!packet.blockers.includes("provider-coupon-portal-proof") ||
        !packet.blockers.includes("retail-price-freshness-proof"))
    ) {
      errors.push(`Retail printer operation start packet ${packet.id} must block price starts on coupon and freshness proof.`);
    }
    if (packet.requiredInputFields.length === 0 || packet.expectedInputFields.length < packet.requiredInputFields.length) {
      errors.push(`Retail printer operation start packet ${packet.id} must expose required operation inputs.`);
    }
  }

  for (const vendorId of Object.keys(retailPrinterProductLinks) as RetailPrinterVendorId[]) {
    for (const operation of retailPrinterOperationKinds) {
      if (!packets.some((packet) => packet.vendorId === vendorId && packet.operation === operation)) {
        errors.push(`Missing retail printer operation start packet: ${vendorId} ${operation}.`);
      }
    }
  }

  return errors;
}

export function parseRetailPrinterVendorId(value: unknown): RetailPrinterVendorId | undefined {
  const candidate = `${value ?? ""}`.trim();
  return (Object.keys(retailPrinterProductLinks) as RetailPrinterVendorId[]).find((vendorId) => vendorId === candidate);
}

export function parseRetailPrinterOperationKind(value: unknown): RetailPrinterOperationKind | undefined {
  const candidate = `${value ?? ""}`.trim();
  return retailPrinterOperationKinds.find((operation) => operation === candidate);
}

function buildRetailPrinterOperationStartPacket(
  adapter: RetailPrinterAdapterContract,
  operationKind: RetailPrinterOperationKind
): RetailPrinterOperationStartPacket {
  const operation = adapter.operations.find((candidate) => candidate.kind === operationKind);
  const sourceLink = adapter.sourceLinks.find((candidate) => candidate.purpose === operationKind);
  const providerEntrypoint = adapter.providerEntrypoints.find((candidate) => candidate.operation === operationKind);
  if (!operation || !sourceLink || !providerEntrypoint) {
    throw new Error(`Retail printer adapter ${adapter.vendorId} is missing operation start contract: ${operationKind}`);
  }
  const operationPolicy = getRetailPrinterOperationPolicy(adapter.vendorId, operationKind);
  const couponCollectionPlan = buildPrinterCouponCollectionPlan(adapter.vendorId, {
    quantity: operationPolicy.kind === "fetch-price" ? operationPolicy.minimumQuantity : 1
  });
  const requiredGateIds = operation.certificationGateIds;

  return {
    id: `${adapter.vendorId}-${operationKind}-operation-start`,
    vendorId: adapter.vendorId,
    providerAdapterId: adapter.providerAdapterId,
    vendorName: adapter.vendorName,
    productName: adapter.productName,
    productSku: adapter.productSku,
    operation: operationKind,
    label: operation.label,
    status: "blocked",
    apiRoute: retailPrinterOperationStartRoute,
    serverOwned: true,
    customerVisible: true,
    productUrl: adapter.productUrl,
    manualReviewUrl: adapter.productUrl,
    providerPortalUrl: adapter.productUrl,
    providerRequestUrl: null,
    clientMayPrepareProviderRequest: false,
    providerRequestPrepared: false,
    networkRequestPrepared: false,
    requestPrepared: false,
    networkAttempted: false,
    noNetwork: true,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveQuoteEnabled: false,
    imageUploadEnabled: false,
    orderPlacementEnabled: false,
    sourceLink,
    providerEntrypoint,
    operationPolicy,
    couponCollectionPlan,
    couponPortalApplicationRequired: true,
    bestPriceRequiresProviderPortalEvidence: true,
    canAffectBestPriceBeforePortalEvidence: false,
    expectedInputFields: operation.requestBlueprint.requestFields.map((field) => field.name),
    requiredInputFields: operation.requestBlueprint.requestFields
      .filter((field) => field.required)
      .map((field) => field.name),
    optionalInputFields: operation.requestBlueprint.requestFields
      .filter((field) => !field.required)
      .map((field) => field.name),
    sourceBackedFields: operation.requestBlueprint.requestFields
      .filter((field) => field.source === "pricing-observation")
      .map((field) => field.name),
    requiredEvidence: operation.requiredEvidence,
    requiredGateIds,
    blockers: buildOperationStartBlockers(operationKind, requiredGateIds),
    forbiddenFields: operation.requestBlueprint.forbiddenFields,
    operatorSteps: buildStartOperatorSteps(adapter, operationKind, sourceLink, couponCollectionPlan),
    safetyChecks: [
      "Do not send a network request from CustomCard.",
      "Do not prepare a provider API payload in client or app runtime.",
      "Do not upload files, submit payment, reserve pickup, or place a live order from this packet.",
      "Use provider-portal evidence only after customer approval and certification gates are attached."
    ],
    blockedReason: operation.blockedReason
  };
}

function buildOperationStartBlockers(
  operation: RetailPrinterOperationKind,
  requiredGateIds: string[]
): string[] {
  if (operation === "fetch-price") {
    return [...requiredGateIds, "provider-coupon-portal-proof", "retail-price-freshness-proof"];
  }
  if (operation === "upload-image") {
    return [...requiredGateIds, "asset-upload-proof", "provider-preview-proof"];
  }
  return requiredGateIds;
}

function buildStartOperatorSteps(
  adapter: RetailPrinterAdapterContract,
  operation: RetailPrinterOperationKind,
  sourceLink: RetailPrinterSourceLink,
  couponCollectionPlan: PrinterCouponCollectionPlan
): string[] {
  if (operation === "fetch-price") {
    return [
      `Open ${sourceLink.label}: ${sourceLink.url}`,
      `Confirm ${adapter.productName} and ${adapter.productSku} before collecting price evidence.`,
      "Collect public subtotal, tax status, pickup or shipping window, and coupon application status in the provider portal.",
      ...couponCollectionPlan.operatorSteps,
      "Stop before upload, payment, pickup reservation, or live order placement."
    ];
  }
  if (operation === "upload-image") {
    return [
      `Open ${sourceLink.label}: ${sourceLink.url}`,
      `Confirm ${adapter.productName} and ${adapter.productSku} before creating a provider preview.`,
      "Use only approved render-packet artifacts and record provider preview/crop/fold evidence.",
      "Preserve the price-collection coupon state; do not submit payment or place an order."
    ];
  }
  return [
    `Open ${sourceLink.label}: ${sourceLink.url}`,
    `Confirm ${adapter.productName}, ${adapter.productSku}, quote evidence, and approved render packet still match.`,
    "Recheck coupon application in the same provider portal cart before any final price claim.",
    "Require customer final approval, tokenized payment authorization, recovery plan, certification, and kill-switch evidence.",
    "Stop unless every live enablement gate is attached and audited."
  ];
}
