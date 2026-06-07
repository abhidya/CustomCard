import { matchPrinterCouponSignals } from "./printerCouponSignals";
import {
  retailPrinterProductLinks,
  type RetailPrinterProductLinkContract,
  type RetailPrinterVendorId
} from "./retailPrinterContracts";

export const retailPrinterEntrypointEvidenceServiceName = "customcard-retail-printer-entrypoint-evidence";

export type RetailPrinterEntrypointEvidenceStatus =
  | "operator-public-page-read-attached"
  | "operator-public-page-url-only-signals-missing"
  | "operator-public-page-proof-invalid"
  | "operator-public-page-read-required";

export interface RetailPrinterEntrypointEvidenceTarget {
  targetId?: string;
  id?: string;
  vendorId?: RetailPrinterVendorId;
  observedAtIso?: string;
  url?: string;
  finalUrl?: string;
  expectedUrlTokens?: string[];
  expectedPageSignals?: string[];
  matchedUrlTokens?: string[];
  matchedPageSignals?: string[];
  status?: number;
  ok?: boolean;
  bytes?: number;
  noCheckoutAction?: boolean;
  noUploadAction?: boolean;
  noOrderPlaced?: boolean;
  error?: string;
}

export interface RetailPrinterEntrypointEvidenceArtifact {
  service: string;
  generatedAtIso: string;
  runtime: string;
  operatorAction?: string;
  targets: RetailPrinterEntrypointEvidenceTarget[];
}

export interface RetailPrinterEntrypointEvidenceSummary {
  attached: true;
  targetId?: string;
  vendorId?: RetailPrinterVendorId;
  observedAtIso?: string;
  url?: string;
  exactUrlMatched: boolean;
  matchedUrlTokens: string[];
  missingUrlTokens: string[];
  matchedPageSignals: string[];
  missingPageSignals: string[];
  allUrlTokensMatched: boolean;
  allPageSignalsMatched: boolean;
  noProviderAction: boolean;
  status: RetailPrinterEntrypointEvidenceStatus;
  validationErrors: string[];
}

export interface RetailPrinterEntrypointEvidenceTargetDefinition {
  targetId: string;
  vendorId: RetailPrinterVendorId;
  url: string;
  expectedUrlTokens: string[];
  expectedPageSignals: string[];
}

export function buildRetailPrinterEntrypointEvidenceTargetDefinitions(
  links: Record<RetailPrinterVendorId, RetailPrinterProductLinkContract> = retailPrinterProductLinks
): RetailPrinterEntrypointEvidenceTargetDefinition[] {
  return Object.values(links).map((productLink) => ({
    targetId: retailPrinterEntrypointTargetId(productLink.vendorId),
    vendorId: productLink.vendorId,
    url: productLink.productUrl,
    expectedUrlTokens: productLink.requiredUrlTokens,
    expectedPageSignals: collectExpectedPageSignals(productLink)
  }));
}

export function findRetailPrinterEntrypointEvidenceTarget(
  artifact: RetailPrinterEntrypointEvidenceArtifact | null | undefined,
  vendorId: RetailPrinterVendorId
): RetailPrinterEntrypointEvidenceTarget | undefined {
  const expectedId = retailPrinterEntrypointTargetId(vendorId);
  return artifact?.targets.find((target) => (target.targetId ?? target.id) === expectedId || target.vendorId === vendorId);
}

export function summarizeRetailPrinterEntrypointEvidence(
  evidence: RetailPrinterEntrypointEvidenceTarget | null | undefined,
  productLink: RetailPrinterProductLinkContract
): RetailPrinterEntrypointEvidenceSummary | null {
  if (!evidence) return null;

  const expectedPageSignals = evidence.expectedPageSignals ?? collectExpectedPageSignals(productLink);
  const matchedUrlTokens = productLink.requiredUrlTokens.filter((token) => evidence.matchedUrlTokens?.includes(token) ?? evidence.url?.includes(token));
  const matchedPageSignals = expectedPageSignals.filter((signal) =>
    evidence.matchedPageSignals?.some((matchedSignal) => matchPrinterCouponSignals(matchedSignal, [signal]).length > 0)
  );
  const missingUrlTokens = productLink.requiredUrlTokens.filter((token) => !matchedUrlTokens.includes(token));
  const missingPageSignals = expectedPageSignals.filter((signal) => !matchedPageSignals.includes(signal));
  const validationErrors = validateRetailPrinterEntrypointEvidenceTarget(evidence, productLink);
  const noProviderAction = evidence.noCheckoutAction === true && evidence.noUploadAction === true && evidence.noOrderPlaced === true;
  const allUrlTokensMatched = missingUrlTokens.length === 0;
  const allPageSignalsMatched = missingPageSignals.length === 0;

  return {
    attached: true,
    targetId: evidence.targetId ?? evidence.id,
    vendorId: evidence.vendorId,
    observedAtIso: evidence.observedAtIso,
    url: evidence.url,
    exactUrlMatched: evidence.url === productLink.productUrl,
    matchedUrlTokens,
    missingUrlTokens,
    matchedPageSignals,
    missingPageSignals,
    allUrlTokensMatched,
    allPageSignalsMatched,
    noProviderAction,
    status: getRetailPrinterEntrypointEvidenceStatus({
      validationErrors,
      allUrlTokensMatched,
      allPageSignalsMatched,
      noProviderAction
    }),
    validationErrors
  };
}

export function getRetailPrinterEntrypointEvidenceStatus(input: {
  validationErrors?: string[];
  allUrlTokensMatched?: boolean;
  allPageSignalsMatched?: boolean;
  noProviderAction?: boolean;
}): RetailPrinterEntrypointEvidenceStatus {
  if ((input.validationErrors ?? []).length > 0 || input.noProviderAction === false) return "operator-public-page-proof-invalid";
  if (input.allUrlTokensMatched && input.allPageSignalsMatched && input.noProviderAction) return "operator-public-page-read-attached";
  if (input.allUrlTokensMatched && input.noProviderAction) return "operator-public-page-url-only-signals-missing";
  return "operator-public-page-read-required";
}

export function validateRetailPrinterEntrypointEvidenceArtifact(
  artifact: RetailPrinterEntrypointEvidenceArtifact | null | undefined,
  links: Record<RetailPrinterVendorId, RetailPrinterProductLinkContract> = retailPrinterProductLinks
): string[] {
  const errors: string[] = [];

  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
    return ["Retail printer entrypoint evidence artifact must be a structured object."];
  }
  if (artifact.service !== retailPrinterEntrypointEvidenceServiceName) {
    errors.push("Retail printer entrypoint evidence artifact must use the customcard-retail-printer-entrypoint-evidence service name.");
  }
  if (typeof artifact.generatedAtIso !== "string" || Number.isNaN(new Date(artifact.generatedAtIso).getTime())) {
    errors.push("Retail printer entrypoint evidence artifact must include a valid generatedAtIso timestamp.");
  }
  if (typeof artifact.runtime !== "string" || !artifact.runtime.trim()) {
    errors.push("Retail printer entrypoint evidence artifact must include a runtime.");
  }
  if (!Array.isArray(artifact.targets) || artifact.targets.length === 0) {
    errors.push("Retail printer entrypoint evidence artifact must include rendered or fetched targets.");
  }

  const seenVendorIds = new Set<RetailPrinterVendorId>();
  for (const target of Array.isArray(artifact.targets) ? artifact.targets : []) {
    const productLink = target.vendorId ? links[target.vendorId] : undefined;
    if (target.vendorId) seenVendorIds.add(target.vendorId);
    errors.push(...validateRetailPrinterEntrypointEvidenceTarget(target, productLink));
  }

  for (const vendorId of Object.keys(links) as RetailPrinterVendorId[]) {
    if (!seenVendorIds.has(vendorId)) {
      errors.push(`Retail printer entrypoint evidence artifact must include target for ${vendorId}.`);
    }
  }

  return errors;
}

export function validateRetailPrinterEntrypointEvidenceTarget(
  evidence: RetailPrinterEntrypointEvidenceTarget,
  productLink?: RetailPrinterProductLinkContract
): string[] {
  const errors: string[] = [];
  const targetId = evidence.targetId ?? evidence.id;
  const label = typeof targetId === "string" && targetId.trim() ? targetId : "unknown";

  if (typeof targetId !== "string" || !targetId.trim()) {
    errors.push("Retail printer entrypoint evidence target must include targetId.");
  }
  if (!evidence.vendorId) {
    errors.push(`Retail printer entrypoint evidence target ${label} must include vendorId.`);
  }
  if (typeof evidence.observedAtIso !== "string" || Number.isNaN(new Date(evidence.observedAtIso).getTime())) {
    errors.push(`Retail printer entrypoint evidence target ${label} must include a valid observedAtIso timestamp.`);
  }
  if (typeof evidence.url !== "string" || !evidence.url.startsWith("https://")) {
    errors.push(`Retail printer entrypoint evidence target ${label} must cite an HTTPS URL.`);
  }
  if (typeof evidence.finalUrl === "string" && !evidence.finalUrl.startsWith("https://")) {
    errors.push(`Retail printer entrypoint evidence target ${label} finalUrl must be HTTPS when present.`);
  }
  if (!Array.isArray(evidence.expectedUrlTokens)) {
    errors.push(`Retail printer entrypoint evidence target ${label} must include expectedUrlTokens.`);
  }
  if (!Array.isArray(evidence.expectedPageSignals)) {
    errors.push(`Retail printer entrypoint evidence target ${label} must include expectedPageSignals.`);
  }
  if (!Array.isArray(evidence.matchedUrlTokens)) {
    errors.push(`Retail printer entrypoint evidence target ${label} must include matchedUrlTokens.`);
  }
  if (!Array.isArray(evidence.matchedPageSignals)) {
    errors.push(`Retail printer entrypoint evidence target ${label} must include matchedPageSignals.`);
  }
  if (evidence.noCheckoutAction !== true) {
    errors.push(`Retail printer entrypoint evidence target ${label} must prove no checkout action.`);
  }
  if (evidence.noUploadAction !== true) {
    errors.push(`Retail printer entrypoint evidence target ${label} must prove no upload action.`);
  }
  if (evidence.noOrderPlaced !== true) {
    errors.push(`Retail printer entrypoint evidence target ${label} must prove no order was placed.`);
  }
  if (productLink) {
    if (targetId !== retailPrinterEntrypointTargetId(productLink.vendorId)) {
      errors.push(`Retail printer entrypoint evidence target ${label} must use the registered target id for ${productLink.vendorId}.`);
    }
    if (evidence.url !== productLink.productUrl) {
      errors.push(`Retail printer entrypoint evidence target ${label} must match the persisted ${productLink.vendorName} product URL.`);
    }
    for (const token of productLink.requiredUrlTokens) {
      if (!evidence.matchedUrlTokens?.includes(token)) {
        errors.push(`Retail printer entrypoint evidence target ${label} must match URL token: ${token}.`);
      }
    }
  }

  return errors;
}

export function retailPrinterEntrypointTargetId(vendorId: RetailPrinterVendorId): string {
  return `${vendorId}-provider-product-entrypoint`;
}

function collectExpectedPageSignals(productLink: RetailPrinterProductLinkContract): string[] {
  return [
    productLink.productName,
    productLink.productSku,
    ...Object.values(productLink.operationEvidence).flatMap((evidence) => evidence.pageSignals)
  ].filter((signal, index, signals) => signals.indexOf(signal) === index);
}
