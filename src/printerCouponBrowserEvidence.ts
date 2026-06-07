import type { PrinterCouponCollectionTarget } from "./printerPricing";
import { couponSignalTextIncludes } from "./printerCouponSignals";

export const printerCouponBrowserEvidenceServiceName = "customcard-printer-coupon-browser-evidence";

export type PrinterCouponRenderedEvidenceStatus =
  | "not-required"
  | "operator-browser-proof-attached"
  | "operator-browser-proof-invalid"
  | "operator-browser-verification-signals-missing"
  | "operator-browser-html-signal-attached-visible-proof-still-required"
  | "static-html-signal-only-browser-proof-required"
  | "operator-browser-or-provider-portal-proof-required";

export interface PrinterCouponBrowserEvidenceTarget {
  targetId?: string;
  id?: string;
  observedAtIso?: string;
  url?: string;
  finalUrl?: string;
  renderedTitle?: string;
  title?: string;
  expectedOfferCodes?: string[];
  visibleTextSignals?: string[];
  visibleSignals?: string[];
  pageHtmlSignals?: string[];
  htmlSignals?: string[];
  noCheckoutAction?: boolean;
  noUploadAction?: boolean;
  noOrderPlaced?: boolean;
  error?: string;
}

export interface PrinterCouponBrowserEvidenceArtifact {
  service: string;
  generatedAtIso: string;
  runtime: string;
  operatorAction?: string;
  targets: PrinterCouponBrowserEvidenceTarget[];
}

export interface PrinterCouponBrowserEvidenceSummary {
  attached: true;
  observedAtIso?: string;
  targetId?: string;
  url?: string;
  renderedTitle?: string;
  visibleTextExpectedCodeVisible: boolean;
  pageHtmlExpectedCodeVisible: boolean;
  matchedVisibleExpectedCodes: string[];
  matchedHtmlExpectedCodes: string[];
  matchedVerificationSignals: string[];
  missingVerificationSignals: string[];
  allVerificationSignalsMatched: boolean;
  noCheckoutAction: boolean;
  validForRenderedProof: boolean;
  validationErrors: string[];
}

export function combinePrinterCouponBrowserEvidence(
  ...evidenceSources: Array<PrinterCouponBrowserEvidenceArtifact | null | undefined>
): PrinterCouponBrowserEvidenceArtifact | null {
  const targets = evidenceSources
    .flatMap((evidence) => (Array.isArray(evidence?.targets) ? evidence.targets : []))
    .filter((target): target is PrinterCouponBrowserEvidenceTarget => Boolean(target && typeof target === "object"));

  if (targets.length === 0) return null;

  return {
    service: printerCouponBrowserEvidenceServiceName,
    generatedAtIso: new Date().toISOString(),
    runtime: "combined-operator-browser-evidence",
    targets
  };
}

export function findPrinterCouponBrowserEvidenceTarget(
  evidence: PrinterCouponBrowserEvidenceArtifact | null | undefined,
  target: PrinterCouponCollectionTarget
): PrinterCouponBrowserEvidenceTarget | undefined {
  const targets = Array.isArray(evidence?.targets) ? evidence.targets : [];
  return targets.find((candidate) => {
    const targetId = candidate.targetId ?? candidate.id;
    return targetId === target.id && (!candidate.url || candidate.url === target.url);
  });
}

export function summarizePrinterCouponBrowserEvidence(
  evidence: PrinterCouponBrowserEvidenceTarget | null | undefined,
  target: PrinterCouponCollectionTarget
): PrinterCouponBrowserEvidenceSummary | null {
  if (!evidence) return null;

  const visibleTextSignals = normalizePrinterCouponSignalList(evidence.visibleTextSignals ?? evidence.visibleSignals);
  const pageHtmlSignals = normalizePrinterCouponSignalList(evidence.pageHtmlSignals ?? evidence.htmlSignals);
  const allSignals = [...visibleTextSignals, ...pageHtmlSignals];
  const matchedVisibleExpectedCodes = target.expectedOfferCodes.filter((code) => signalListIncludes(visibleTextSignals, code));
  const matchedHtmlExpectedCodes = target.expectedOfferCodes.filter((code) => signalListIncludes(pageHtmlSignals, code));
  const matchedVerificationSignals = target.verificationSignals.filter((signal) => signalListIncludes(allSignals, signal));
  const missingVerificationSignals = target.verificationSignals.filter(
    (signal) => !matchedVerificationSignals.some((matchedSignal) => matchedSignal === signal)
  );
  const allVerificationSignalsMatched = missingVerificationSignals.length === 0;
  const visibleTextExpectedCodeVisible =
    target.expectedOfferCodes.length > 0 && target.expectedOfferCodes.every((code) => matchedVisibleExpectedCodes.includes(code));
  const pageHtmlExpectedCodeVisible =
    target.expectedOfferCodes.length > 0 && target.expectedOfferCodes.every((code) => matchedHtmlExpectedCodes.includes(code));
  const validationErrors = validatePrinterCouponBrowserEvidenceTarget(evidence, target);
  const noCheckoutAction = evidence.noCheckoutAction === true && evidence.noUploadAction === true && evidence.noOrderPlaced === true;

  return {
    attached: true,
    observedAtIso: evidence.observedAtIso,
    targetId: evidence.targetId ?? evidence.id,
    url: evidence.url,
    renderedTitle: evidence.renderedTitle ?? evidence.title,
    visibleTextExpectedCodeVisible,
    pageHtmlExpectedCodeVisible,
    matchedVisibleExpectedCodes,
    matchedHtmlExpectedCodes,
    matchedVerificationSignals,
    missingVerificationSignals,
    allVerificationSignalsMatched,
    noCheckoutAction,
    validForRenderedProof:
      validationErrors.length === 0 && visibleTextExpectedCodeVisible && allVerificationSignalsMatched && noCheckoutAction,
    validationErrors
  };
}

export function getPrinterCouponRenderedEvidenceStatus(
  target: PrinterCouponCollectionTarget,
  staticHtmlExpectedCodeVisible: boolean,
  browserEvidence: PrinterCouponBrowserEvidenceSummary | null
): PrinterCouponRenderedEvidenceStatus {
  if (!target.browserRenderProofRequired) return "not-required";
  if (browserEvidence?.validForRenderedProof) return "operator-browser-proof-attached";
  if (browserEvidence && browserEvidence.validationErrors.length > 0) return "operator-browser-proof-invalid";
  if (browserEvidence?.visibleTextExpectedCodeVisible && !browserEvidence.allVerificationSignalsMatched) {
    return "operator-browser-verification-signals-missing";
  }
  if (browserEvidence?.pageHtmlExpectedCodeVisible && browserEvidence.noCheckoutAction) {
    return "operator-browser-html-signal-attached-visible-proof-still-required";
  }
  if (staticHtmlExpectedCodeVisible) return "static-html-signal-only-browser-proof-required";
  return "operator-browser-or-provider-portal-proof-required";
}

export function validatePrinterCouponBrowserEvidenceArtifact(
  artifact: PrinterCouponBrowserEvidenceArtifact | null | undefined,
  targets: PrinterCouponCollectionTarget[] = []
): string[] {
  const errors: string[] = [];

  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
    return ["Printer coupon browser evidence artifact must be a structured object."];
  }
  if (artifact.service !== printerCouponBrowserEvidenceServiceName) {
    errors.push("Printer coupon browser evidence artifact must use the customcard-printer-coupon-browser-evidence service name.");
  }
  if (typeof artifact.generatedAtIso !== "string" || Number.isNaN(new Date(artifact.generatedAtIso).getTime())) {
    errors.push("Printer coupon browser evidence artifact must include a valid generatedAtIso timestamp.");
  }
  if (typeof artifact.runtime !== "string" || !artifact.runtime.trim()) {
    errors.push("Printer coupon browser evidence artifact must include a runtime.");
  }
  if (!Array.isArray(artifact.targets) || artifact.targets.length === 0) {
    errors.push("Printer coupon browser evidence artifact must include at least one rendered target.");
  }

  const targetById = new Map(targets.map((target) => [target.id, target]));
  for (const targetEvidence of Array.isArray(artifact.targets) ? artifact.targets : []) {
    if (!targetEvidence || typeof targetEvidence !== "object" || Array.isArray(targetEvidence)) {
      errors.push("Printer coupon browser evidence target must be a structured object.");
      continue;
    }
    const targetId = targetEvidence.targetId ?? targetEvidence.id;
    errors.push(...validatePrinterCouponBrowserEvidenceTarget(targetEvidence, typeof targetId === "string" ? targetById.get(targetId) : undefined));
  }

  return errors;
}

export function validatePrinterCouponBrowserEvidenceTarget(
  evidence: PrinterCouponBrowserEvidenceTarget,
  target?: PrinterCouponCollectionTarget
): string[] {
  const errors: string[] = [];
  const targetId = evidence.targetId ?? evidence.id;
  const label = typeof targetId === "string" && targetId.trim() ? targetId : "unknown";

  if (typeof targetId !== "string" || !targetId.trim()) {
    errors.push("Printer coupon browser evidence target must include targetId.");
  }
  if (typeof evidence.observedAtIso !== "string" || Number.isNaN(new Date(evidence.observedAtIso).getTime())) {
    errors.push(`Printer coupon browser evidence target ${label} must include a valid observedAtIso timestamp.`);
  }
  if (typeof evidence.url !== "string" || !evidence.url.startsWith("https://")) {
    errors.push(`Printer coupon browser evidence target ${label} must cite an HTTPS URL.`);
  }
  if (typeof evidence.finalUrl === "string" && !evidence.finalUrl.startsWith("https://")) {
    errors.push(`Printer coupon browser evidence target ${label} finalUrl must be HTTPS when present.`);
  }
  if (!Array.isArray(evidence.visibleTextSignals)) {
    errors.push(`Printer coupon browser evidence target ${label} must include visibleTextSignals.`);
  }
  if (!Array.isArray(evidence.pageHtmlSignals)) {
    errors.push(`Printer coupon browser evidence target ${label} must include pageHtmlSignals.`);
  }
  if (evidence.noCheckoutAction !== true) {
    errors.push(`Printer coupon browser evidence target ${label} must prove no checkout action.`);
  }
  if (evidence.noUploadAction !== true) {
    errors.push(`Printer coupon browser evidence target ${label} must prove no upload action.`);
  }
  if (evidence.noOrderPlaced !== true) {
    errors.push(`Printer coupon browser evidence target ${label} must prove no order was placed.`);
  }
  if (target) {
    if (evidence.url !== target.url) {
      errors.push(`Printer coupon browser evidence target ${label} must match the registered print entrypoint URL.`);
    }
    if (target.role !== "print-entrypoint") {
      errors.push(`Printer coupon browser evidence target ${label} must attach only to print-entrypoint targets.`);
    }
  }

  return errors;
}

export function normalizePrinterCouponSignalList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((signal) => `${signal ?? ""}`.trim()).filter(Boolean);
}

function signalListIncludes(signals: string[], expected: string): boolean {
  return signals.some((signal) => couponSignalTextIncludes(signal, expected));
}
