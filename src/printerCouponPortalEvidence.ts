import {
  hasMatchingProviderPortalCouponEvidence,
  isPrinterCouponActive,
  validatePrinterCouponPortalApplicationEvidence
} from "./printerCouponCartTerms";
import {
  printerCouponOffers,
  printerPriceCatalog,
  type PrinterCouponOffer,
  type PrinterCouponPortalApplicationEvidence,
  type PrinterPriceObservation
} from "./printerPricing";

export interface PrinterCouponPortalEvidenceRecord {
  offerId: string;
  code: string;
  evidence: PrinterCouponPortalApplicationEvidence;
}

export interface PrinterCouponPortalEvidenceArtifact {
  service: string;
  generatedAtIso: string;
  operatorAction: string;
  records: PrinterCouponPortalEvidenceRecord[];
  blockedFields: string[];
}

export interface AcceptedPrinterCouponPortalEvidence {
  offerId: string;
  code: string;
  sourcePriceObservationId: string;
  vendorId: PrinterCouponOffer["vendorId"];
  discountCents: number;
  subtotalAfterCouponCents: number;
}

export interface RejectedPrinterCouponPortalEvidence {
  offerId?: string;
  code?: string;
  sourcePriceObservationId?: string;
  reasons: string[];
}

export interface PrinterCouponPortalEvidenceImportResult {
  status: "not-provided" | "accepted" | "rejected";
  generatedAtIso?: string;
  totalEvidenceRecords: number;
  acceptedEvidenceCount: number;
  rejectedEvidenceCount: number;
  acceptedEvidence: AcceptedPrinterCouponPortalEvidence[];
  rejectedEvidence: RejectedPrinterCouponPortalEvidence[];
  offers: PrinterCouponOffer[];
  providerPortalApplicationProof: boolean;
  bestPriceDiscountingAllowed: boolean;
  blockedFields: string[];
}

export function importPrinterCouponPortalEvidenceArtifact(
  artifact: PrinterCouponPortalEvidenceArtifact | null | undefined,
  options: {
    offers?: PrinterCouponOffer[];
    catalog?: PrinterPriceObservation[];
    now?: Date;
  } = {}
): PrinterCouponPortalEvidenceImportResult {
  const offers = options.offers ?? printerCouponOffers;
  const catalog = options.catalog ?? printerPriceCatalog;

  if (!artifact) {
    return {
      status: "not-provided",
      totalEvidenceRecords: 0,
      acceptedEvidenceCount: 0,
      rejectedEvidenceCount: 0,
      acceptedEvidence: [],
      rejectedEvidence: [],
      offers,
      providerPortalApplicationProof: false,
      bestPriceDiscountingAllowed: false,
      blockedFields: ["payment submission", "live order placement"]
    };
  }

  const artifactErrors = validatePrinterCouponPortalEvidenceArtifact(artifact);
  const records = Array.isArray(artifact.records) ? artifact.records : [];
  const blockedFields = Array.isArray(artifact.blockedFields) ? artifact.blockedFields : [];
  const acceptedEvidence: AcceptedPrinterCouponPortalEvidence[] = [];
  const rejectedEvidence: RejectedPrinterCouponPortalEvidence[] = artifactErrors.length > 0
    ? [{ reasons: artifactErrors }]
    : [];
  const reviewedAt = options.now ?? new Date(artifact.generatedAtIso);
  const offerById = new Map(offers.map((offer) => [offer.id, offer]));
  const observationById = new Map(catalog.map((observation) => [observation.id, observation]));
  const acceptedOfferById = new Map<string, PrinterCouponOffer>();

  if (artifactErrors.length === 0) {
    for (const record of records) {
      if (!isPrinterCouponPortalEvidenceRecord(record)) {
        rejectedEvidence.push({
          reasons: ["Printer coupon portal evidence record must include offerId, code, and structured provider portal evidence."]
        });
        continue;
      }
      const outcome = buildAcceptedPortalEvidenceOffer(record, offerById, observationById, reviewedAt);
      if (outcome.rejection) {
        rejectedEvidence.push(outcome.rejection);
        continue;
      }
      if (outcome.offer && outcome.acceptedEvidence) {
        acceptedOfferById.set(outcome.offer.id, outcome.offer);
        acceptedEvidence.push(outcome.acceptedEvidence);
      }
    }
  }

  const importedOffers = offers.map((offer) => acceptedOfferById.get(offer.id) ?? offer);

  return {
    status: acceptedEvidence.length > 0 ? "accepted" : "rejected",
    generatedAtIso: typeof artifact.generatedAtIso === "string" ? artifact.generatedAtIso : undefined,
    totalEvidenceRecords: records.length,
    acceptedEvidenceCount: acceptedEvidence.length,
    rejectedEvidenceCount: rejectedEvidence.length,
    acceptedEvidence,
    rejectedEvidence,
    offers: importedOffers,
    providerPortalApplicationProof: acceptedEvidence.length > 0,
    bestPriceDiscountingAllowed: acceptedEvidence.length > 0,
    blockedFields
  };
}

function isPrinterCouponPortalEvidenceRecord(value: unknown): value is PrinterCouponPortalEvidenceRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Partial<PrinterCouponPortalEvidenceRecord>;
  const evidence = record.evidence as Partial<PrinterCouponPortalApplicationEvidence> | undefined;
  const cartTerms = evidence?.cartTerms as Partial<PrinterCouponPortalApplicationEvidence["cartTerms"]> | undefined;

  return (
    typeof record.offerId === "string" &&
    typeof record.code === "string" &&
    Boolean(evidence && typeof evidence === "object" && !Array.isArray(evidence)) &&
    typeof evidence?.observedAtIso === "string" &&
    typeof evidence?.portalUrl === "string" &&
    typeof evidence?.providerPortal === "boolean" &&
    typeof evidence?.sourcePriceObservationId === "string" &&
    typeof evidence?.subtotalBeforeCouponCents === "number" &&
    typeof evidence?.discountCents === "number" &&
    typeof evidence?.subtotalAfterCouponCents === "number" &&
    Boolean(cartTerms && typeof cartTerms === "object" && !Array.isArray(cartTerms)) &&
    typeof cartTerms?.vendorId === "string" &&
    typeof cartTerms?.productKind === "string" &&
    typeof cartTerms?.size === "string" &&
    typeof cartTerms?.pricedQuantity === "number" &&
    typeof cartTerms?.fulfillmentMode === "string" &&
    typeof cartTerms?.accountState === "string" &&
    typeof evidence?.sameCartTermsProven === "boolean" &&
    typeof evidence?.noOrderPlaced === "boolean" &&
    Array.isArray(evidence?.blockedFields)
  );
}

export function validatePrinterCouponPortalEvidenceArtifact(artifact: PrinterCouponPortalEvidenceArtifact): string[] {
  const errors: string[] = [];

  if (artifact.service !== "customcard-printer-coupon-portal-evidence") {
    errors.push("Printer coupon portal evidence artifact must use the customcard-printer-coupon-portal-evidence service name.");
  }
  if (typeof artifact.generatedAtIso !== "string" || Number.isNaN(new Date(artifact.generatedAtIso).getTime())) {
    errors.push("Printer coupon portal evidence artifact must include a valid generatedAtIso timestamp.");
  }
  if (typeof artifact.operatorAction !== "string" || !artifact.operatorAction.trim()) {
    errors.push("Printer coupon portal evidence artifact must describe the operator action.");
  }
  if (!Array.isArray(artifact.records) || artifact.records.length === 0) {
    errors.push("Printer coupon portal evidence artifact must include at least one evidence record.");
  }
  for (const field of ["payment submission", "live order placement"]) {
    if (!Array.isArray(artifact.blockedFields) || !artifact.blockedFields.includes(field)) {
      errors.push(`Printer coupon portal evidence artifact must block ${field}.`);
    }
  }

  return errors;
}

function buildAcceptedPortalEvidenceOffer(
  record: PrinterCouponPortalEvidenceRecord,
  offerById: Map<string, PrinterCouponOffer>,
  observationById: Map<string, PrinterPriceObservation>,
  reviewedAt: Date
): {
  offer?: PrinterCouponOffer;
  acceptedEvidence?: AcceptedPrinterCouponPortalEvidence;
  rejection?: RejectedPrinterCouponPortalEvidence;
} {
  const reasons: string[] = [];
  const offer = offerById.get(record.offerId);
  const observation = observationById.get(record.evidence.sourcePriceObservationId);

  if (!offer) reasons.push(`Unknown coupon offer id: ${record.offerId}`);
  if (offer && offer.code !== record.code) reasons.push(`Coupon code ${record.code} does not match offer ${offer.code}.`);
  if (!observation) reasons.push(`Unknown source price observation id: ${record.evidence.sourcePriceObservationId}`);

  if (offer && observation) {
    const expectedSubtotalBeforeCouponCents = observation.unitPriceCents * record.evidence.cartTerms.pricedQuantity;
    const observedAt = new Date(record.evidence.observedAtIso);
    const startsAt = new Date(offer.startsAtIso);
    const endsAt = new Date(offer.endsAtIso);
    const appliedOffer: PrinterCouponOffer = {
      ...offer,
      evidenceStatus: "provider-portal-applied",
      portalApplicationEvidence: record.evidence
    };
    if (Number.isNaN(observedAt.getTime())) {
      reasons.push(`Coupon ${appliedOffer.code} portal evidence must include a valid observedAtIso timestamp.`);
    } else {
      if (observedAt < startsAt || observedAt > endsAt) {
        reasons.push(`Coupon ${appliedOffer.code} portal evidence timestamp must be inside the coupon validity window.`);
      }
      if (observedAt > reviewedAt) {
        reasons.push(`Coupon ${appliedOffer.code} portal evidence timestamp must not be after the review time.`);
      }
    }
    if (!isPrinterCouponActive(appliedOffer, reviewedAt)) {
      reasons.push(`Coupon ${appliedOffer.code} is not active at the portal evidence review time.`);
    }
    reasons.push(...validatePrinterCouponPortalApplicationEvidence(appliedOffer));
    if (
      !hasMatchingProviderPortalCouponEvidence(
        appliedOffer,
        observation,
        expectedSubtotalBeforeCouponCents,
        record.evidence.cartTerms.pricedQuantity
      )
    ) {
      reasons.push("Provider portal evidence must match the same product, quantity, fulfillment mode, account state, and subtotal math.");
    }
    if (reasons.length === 0) {
      return {
        offer: appliedOffer,
        acceptedEvidence: {
          offerId: appliedOffer.id,
          code: appliedOffer.code,
          sourcePriceObservationId: record.evidence.sourcePriceObservationId,
          vendorId: appliedOffer.vendorId,
          discountCents: record.evidence.discountCents,
          subtotalAfterCouponCents: record.evidence.subtotalAfterCouponCents
        }
      };
    }
  }

  return {
    rejection: {
      offerId: record.offerId,
      code: record.code,
      sourcePriceObservationId: record.evidence.sourcePriceObservationId,
      reasons
    }
  };
}
