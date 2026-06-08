import { buildRetailPrinterOperationStartPackets } from "./retailPrinterOperationStartData.mjs";

export const retailPrinterCouponPortalEvidenceRoute = "/api/retail-printers/coupon-portal-evidence";
export const retailPrinterCouponPortalEvidenceRouteId = "retail-printer-coupon-portal-evidence";

export function buildSampleRetailPrinterCouponPortalEvidencePayload() {
  return {
    evidenceArtifact: {
      service: "customcard-printer-coupon-portal-evidence",
      generatedAtIso: "2026-06-07T12:15:00.000Z",
      operatorAction:
        "Opened Walgreens Photo provider portal, selected the same 5x7 folded-card product and quantity, applied CRISPCARD, recorded subtotal evidence, and stopped before upload, payment, or order placement.",
      blockedFields: ["payment submission", "live order placement", "card upload", "tax finalization", "pickup slot reservation"],
      records: [
        {
          offerId: "walgreens-crispcard-cards-2026-06-13",
          code: "CRISPCARD",
          evidence: {
            observedAtIso: "2026-06-07T12:15:00.000Z",
            portalUrl: "https://photo.walgreens.com/store/cart",
            providerPortal: true,
            sourcePriceObservationId: "walgreens-5x7-folded-card",
            subtotalBeforeCouponCents: 349,
            discountCents: 209,
            subtotalAfterCouponCents: 140,
            cartTerms: {
              vendorId: "walgreens",
              productKind: "folded-card",
              size: "5x7",
              pricedQuantity: 1,
              fulfillmentMode: "pickup",
              accountState: "logged-in"
            },
            sameCartTermsProven: true,
            noOrderPlaced: true,
            blockedFields: ["payment submission", "live order placement", "tax", "pickup window"]
          }
        }
      ]
    }
  };
}

export function missingRetailPrinterCouponPortalEvidenceFields(body = {}) {
  return isObject(body.evidenceArtifact) || isObject(body.portalEvidenceArtifact) ? [] : ["evidenceArtifact"];
}

export function buildRetailPrinterCouponPortalEvidenceResponse(body = {}) {
  const artifact = body.evidenceArtifact ?? body.portalEvidenceArtifact;
  const records = Array.isArray(artifact?.records) ? artifact.records : [];
  const artifactErrors = validateRetailPrinterCouponPortalEvidenceArtifact(artifact);
  const acceptedEvidence = [];
  const rejectedEvidence = artifactErrors.length > 0 ? [{ reasons: artifactErrors }] : [];
  const packetIndex = buildPortalPacketIndex();
  const reviewedAt = validDate(artifact?.generatedAtIso) ? new Date(artifact.generatedAtIso) : new Date("2026-06-07T12:15:00.000Z");

  if (artifactErrors.length === 0) {
    for (const record of records) {
      const outcome = validateRetailPrinterCouponPortalEvidenceRecord(record, packetIndex, reviewedAt);
      if (outcome.acceptedEvidence) acceptedEvidence.push(outcome.acceptedEvidence);
      if (outcome.rejection) rejectedEvidence.push(outcome.rejection);
    }
  }

  const rankedPricingImpacts = acceptedEvidence
    .map((evidence) => ({
      portalApplicationPacketId: evidence.portalApplicationPacketId,
      sourcePriceObservationId: evidence.sourcePriceObservationId,
      vendorId: evidence.vendorId,
      couponCode: evidence.code,
      subtotalBeforeCouponCents: evidence.subtotalBeforeCouponCents,
      discountCents: evidence.discountCents,
      subtotalAfterCouponCents: evidence.subtotalAfterCouponCents,
      subtotalIncludesCoupon: true,
      liveQuote: false,
      manualConfirmationRequired: true,
      canAffectBestPrice: true
    }))
    .sort((first, second) => first.subtotalAfterCouponCents - second.subtotalAfterCouponCents);

  const status = acceptedEvidence.length > 0 ? "accepted" : "rejected";

  return {
    service: "customcard-api",
    status,
    route: retailPrinterCouponPortalEvidenceRouteId,
    serverOwned: true,
    clientMayPrepareProviderRequest: false,
    providerRequestPrepared: false,
    networkRequestPrepared: false,
    requestPrepared: false,
    networkAttempted: false,
    externalNetworkCalls: false,
    realOrdersEnabled: false,
    liveQuoteEnabled: false,
    imageUploadEnabled: false,
    orderPlacementEnabled: false,
    rawContentStored: false,
    providerPayloadPrepared: false,
    providerPortalEvidenceImport: {
      status,
      generatedAtIso: typeof artifact?.generatedAtIso === "string" ? artifact.generatedAtIso : undefined,
      totalEvidenceRecords: records.length,
      acceptedEvidenceCount: acceptedEvidence.length,
      rejectedEvidenceCount: rejectedEvidence.length,
      providerPortalApplicationProof: acceptedEvidence.length > 0,
      bestPriceDiscountingAllowed: acceptedEvidence.length > 0,
      blockedFields: Array.isArray(artifact?.blockedFields) ? artifact.blockedFields : []
    },
    acceptedEvidence,
    rejectedEvidence,
    pricingImpact: rankedPricingImpacts[0] ?? null,
    rankedPricingImpacts,
    bestPriceDiscountingAllowed: acceptedEvidence.length > 0,
    blockedFields: ["payment submission", "live order placement", "provider upload", "tax finalization", "pickup slot reservation"],
    repository: {
      tables: ["auth_sessions", "idempotency_keys", "audit_log"],
      runtimeMode: "contract",
      persisted: false,
      providerPayloadPrepared: false,
      realOrdersEnabled: false
    }
  };
}

export function validateRetailPrinterCouponPortalEvidenceArtifact(artifact) {
  const errors = [];
  if (!isObject(artifact)) {
    return ["Retail printer coupon portal evidence requires an evidenceArtifact object."];
  }
  if (artifact.service !== "customcard-printer-coupon-portal-evidence") {
    errors.push("Retail printer coupon portal evidence artifact must use the customcard-printer-coupon-portal-evidence service name.");
  }
  if (typeof artifact.generatedAtIso !== "string" || !validDate(artifact.generatedAtIso)) {
    errors.push("Retail printer coupon portal evidence artifact must include a valid generatedAtIso timestamp.");
  }
  if (typeof artifact.operatorAction !== "string" || artifact.operatorAction.trim().length === 0) {
    errors.push("Retail printer coupon portal evidence artifact must describe the operator action.");
  }
  if (!Array.isArray(artifact.records) || artifact.records.length === 0) {
    errors.push("Retail printer coupon portal evidence artifact must include at least one evidence record.");
  }
  for (const field of ["payment submission", "live order placement"]) {
    if (!Array.isArray(artifact.blockedFields) || !artifact.blockedFields.includes(field)) {
      errors.push(`Retail printer coupon portal evidence artifact must block ${field}.`);
    }
  }
  return errors;
}

function validateRetailPrinterCouponPortalEvidenceRecord(record, packetIndex, reviewedAt) {
  if (!isRetailPrinterCouponPortalEvidenceRecord(record)) {
    return {
      rejection: {
        reasons: ["Retail printer coupon portal evidence record must include offerId, code, and structured provider portal evidence."]
      }
    };
  }

  const reasons = [];
  const packet = packetIndex.byOfferId.get(record.offerId);
  const evidence = record.evidence;
  const observedAt = new Date(evidence.observedAtIso);

  if (!packet) reasons.push(`Unknown provider portal application offer id: ${record.offerId}`);
  if (packet && packet.code !== record.code) reasons.push(`Coupon code ${record.code} does not match registered packet code ${packet.code}.`);
  if (packet && !packet.applicationTargets.some((target) => target.sourcePriceObservationId === evidence.sourcePriceObservationId)) {
    reasons.push(`Unknown source price observation id for registered packet: ${evidence.sourcePriceObservationId}`);
  }
  if (!validDate(evidence.observedAtIso)) {
    reasons.push(`Coupon ${record.code} portal evidence must include a valid observedAtIso timestamp.`);
  } else if (observedAt > reviewedAt) {
    reasons.push(`Coupon ${record.code} portal evidence timestamp must not be after the review time.`);
  }
  if (!evidence.portalUrl.startsWith("https://")) reasons.push(`Coupon ${record.code} portal evidence must cite an HTTPS provider portal URL.`);
  if (packet && !packet.providerPortalUrls.some((url) => sameHost(url, evidence.portalUrl))) {
    reasons.push(`Coupon ${record.code} portal evidence URL must match a registered provider portal host.`);
  }
  if (evidence.providerPortal !== true) reasons.push(`Coupon ${record.code} evidence must come from a provider portal.`);
  if (evidence.sameCartTermsProven !== true) reasons.push(`Coupon ${record.code} evidence must prove same-cart terms.`);
  if (evidence.noOrderPlaced !== true) reasons.push(`Coupon ${record.code} evidence must preserve no-live-order safety.`);
  for (const blockedField of ["payment submission", "live order placement"]) {
    if (!evidence.blockedFields.includes(blockedField)) {
      reasons.push(`Coupon ${record.code} evidence must block ${blockedField}.`);
    }
  }
  if (evidence.subtotalBeforeCouponCents <= 0) reasons.push(`Coupon ${record.code} evidence must include a positive pre-coupon subtotal.`);
  if (evidence.discountCents <= 0) reasons.push(`Coupon ${record.code} evidence must include a positive discount.`);
  if (evidence.subtotalAfterCouponCents < 0) reasons.push(`Coupon ${record.code} evidence must not include a negative post-coupon subtotal.`);
  if (evidence.subtotalBeforeCouponCents - evidence.discountCents !== evidence.subtotalAfterCouponCents) {
    reasons.push(`Coupon ${record.code} evidence subtotal math must match the applied discount.`);
  }

  const target = packet?.applicationTargets.find((candidate) => candidate.sourcePriceObservationId === evidence.sourcePriceObservationId);
  if (target) {
    reasons.push(...matchingTargetErrors(record.code, evidence, target));
  }

  if (reasons.length > 0) {
    return {
      rejection: {
        offerId: record.offerId,
        code: record.code,
        sourcePriceObservationId: evidence.sourcePriceObservationId,
        reasons
      }
    };
  }

  return {
    acceptedEvidence: {
      portalApplicationPacketId: packet.id,
      offerId: record.offerId,
      code: record.code,
      vendorId: packet.vendorId,
      sourcePriceObservationId: evidence.sourcePriceObservationId,
      subtotalBeforeCouponCents: evidence.subtotalBeforeCouponCents,
      discountCents: evidence.discountCents,
      subtotalAfterCouponCents: evidence.subtotalAfterCouponCents,
      observedAtIso: evidence.observedAtIso,
      providerPortalHost: new URL(evidence.portalUrl).host,
      sameCartTermsProven: true,
      noOrderPlaced: true
    }
  };
}

function matchingTargetErrors(code, evidence, target) {
  const errors = [];
  const expected = target.cartTerms;
  const actual = evidence.cartTerms;
  if (evidence.subtotalBeforeCouponCents !== target.subtotalBeforeCouponCents) {
    errors.push(`Coupon ${code} evidence must match the registered pre-coupon subtotal.`);
  }
  if (evidence.discountCents !== target.expectedDiscountCents) {
    errors.push(`Coupon ${code} evidence must match the registered expected discount.`);
  }
  if (evidence.subtotalAfterCouponCents !== target.expectedSubtotalAfterCouponCents) {
    errors.push(`Coupon ${code} evidence must match the registered post-coupon subtotal.`);
  }
  for (const field of ["vendorId", "productKind", "size", "pricedQuantity", "fulfillmentMode", "accountState"]) {
    if (actual[field] !== expected[field]) {
      errors.push(`Coupon ${code} evidence cart term ${field} must match the registered provider-portal target.`);
    }
  }
  return errors;
}

function buildPortalPacketIndex() {
  const byOfferId = new Map();
  for (const startPacket of buildRetailPrinterOperationStartPackets()) {
    for (const portalPacket of startPacket.couponCollectionPlan.portalApplicationPackets) {
      if (!byOfferId.has(portalPacket.offerId)) byOfferId.set(portalPacket.offerId, portalPacket);
    }
  }
  return { byOfferId };
}

function isRetailPrinterCouponPortalEvidenceRecord(value) {
  if (!isObject(value)) return false;
  const evidence = value.evidence;
  const cartTerms = evidence?.cartTerms;
  return (
    typeof value.offerId === "string" &&
    typeof value.code === "string" &&
    isObject(evidence) &&
    typeof evidence.observedAtIso === "string" &&
    typeof evidence.portalUrl === "string" &&
    typeof evidence.providerPortal === "boolean" &&
    typeof evidence.sourcePriceObservationId === "string" &&
    typeof evidence.subtotalBeforeCouponCents === "number" &&
    typeof evidence.discountCents === "number" &&
    typeof evidence.subtotalAfterCouponCents === "number" &&
    isObject(cartTerms) &&
    typeof cartTerms.vendorId === "string" &&
    typeof cartTerms.productKind === "string" &&
    typeof cartTerms.size === "string" &&
    typeof cartTerms.pricedQuantity === "number" &&
    typeof cartTerms.fulfillmentMode === "string" &&
    typeof cartTerms.accountState === "string" &&
    typeof evidence.sameCartTermsProven === "boolean" &&
    typeof evidence.noOrderPlaced === "boolean" &&
    Array.isArray(evidence.blockedFields)
  );
}

function sameHost(firstUrl, secondUrl) {
  try {
    return new URL(firstUrl).host === new URL(secondUrl).host;
  } catch {
    return false;
  }
}

function validDate(value) {
  return !Number.isNaN(new Date(value).getTime());
}

function isObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
