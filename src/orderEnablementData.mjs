const handoffDisabledReasons = [
  "Final price, pickup time, payment, and order submission happen outside CustomCard.",
  "CustomCard does not collect card details.",
  "Physical print certification has not been completed."
];

const sharedRequiredGates = [
  "vendor-certification",
  "real-order-kill-switch",
  "customer-approval",
  "print-certification"
];

const sharedRetailLegalReview = ["Retail printer terms of service", "Customer data handling agreement", "Print error and refund policy"];

const sharedRetailBlockedReasons = [
  "No certified live retail printer transport is attached.",
  "No real-order kill-switch infrastructure is proven.",
  "No physical print certification Proof is attached.",
  "No customer final approval flow is certified."
];

export const retailOrderEnablementVendorIds = ["walgreens", "cvs", "fedex", "walmart"];

export const orderEnablementPolicies = {
  walgreens: {
    vendorId: "walgreens",
    realOrdersEnabled: false,
    directOrderEnabled: false,
    canPlaceRealOrder: false,
    requiresManualConfirmation: true,
    liveQuoteEnabled: false,
    imageUploadEnabled: false,
    orderPlacementEnabled: false,
    handoffMode: "manual-upload",
    costControl: "free-app-no-paid-api",
    requiredEvidence: [
      "Walgreens Photo sandbox order reference",
      "Walgreens image upload acceptance Proof",
      "Same-cart coupon portal Proof",
      "Customer approval record",
      "Kill-switch halt Proof"
    ],
    requiredGates: [...sharedRequiredGates, "payment-processor"],
    requiredLegalReview: sharedRetailLegalReview,
    disabledReasons: handoffDisabledReasons,
    blockedReasons: [
      "No Walgreens sandbox or certified browser-session Proof is attached.",
      "Walgreens image upload acceptance is unverified.",
      ...sharedRetailBlockedReasons.slice(1)
    ]
  },
  cvs: {
    vendorId: "cvs",
    realOrdersEnabled: false,
    directOrderEnabled: false,
    canPlaceRealOrder: false,
    requiresManualConfirmation: true,
    liveQuoteEnabled: false,
    imageUploadEnabled: false,
    orderPlacementEnabled: false,
    handoffMode: "manual-upload",
    costControl: "free-app-no-paid-api",
    requiredEvidence: ["CVS Photo sandbox order Proof", "CVS image upload acceptance Proof", "Customer approval record"],
    requiredGates: sharedRequiredGates,
    requiredLegalReview: ["CVS API terms of service", "Print error and refund policy"],
    disabledReasons: handoffDisabledReasons,
    blockedReasons: ["No CVS sandbox or certified browser-session Proof is attached.", ...sharedRetailBlockedReasons.slice(1)]
  },
  fedex: {
    vendorId: "fedex",
    realOrdersEnabled: false,
    directOrderEnabled: false,
    canPlaceRealOrder: false,
    requiresManualConfirmation: true,
    liveQuoteEnabled: false,
    imageUploadEnabled: false,
    orderPlacementEnabled: false,
    handoffMode: "manual-upload",
    costControl: "free-app-no-paid-api",
    requiredEvidence: [
      "FedEx Office sandbox order Proof",
      "FedEx print file acceptance Proof",
      "Shipping or pickup rate Proof",
      "Customer approval record"
    ],
    requiredGates: sharedRequiredGates,
    requiredLegalReview: ["FedEx API terms of service", "Shipping and print error policy"],
    disabledReasons: handoffDisabledReasons,
    blockedReasons: ["No FedEx sandbox or certified browser-session Proof is attached.", ...sharedRetailBlockedReasons.slice(1)]
  },
  walmart: {
    vendorId: "walmart",
    realOrdersEnabled: false,
    directOrderEnabled: false,
    canPlaceRealOrder: false,
    requiresManualConfirmation: true,
    liveQuoteEnabled: false,
    imageUploadEnabled: false,
    orderPlacementEnabled: false,
    handoffMode: "manual-upload",
    costControl: "free-app-no-paid-api",
    requiredEvidence: ["Walmart Photo sandbox order Proof", "Walmart image upload acceptance Proof", "Customer approval record"],
    requiredGates: sharedRequiredGates,
    requiredLegalReview: ["Walmart API terms of service", "Print error and refund policy"],
    disabledReasons: handoffDisabledReasons,
    blockedReasons: ["No Walmart sandbox or certified browser-session Proof is attached.", ...sharedRetailBlockedReasons.slice(1)]
  },
  staples: {
    vendorId: "staples",
    realOrdersEnabled: false,
    directOrderEnabled: false,
    canPlaceRealOrder: false,
    requiresManualConfirmation: true,
    liveQuoteEnabled: false,
    imageUploadEnabled: false,
    orderPlacementEnabled: false,
    handoffMode: "manual-upload",
    costControl: "free-app-no-paid-api",
    requiredEvidence: ["Staples manual upload Proof", "Customer approval record", "Print preview Proof"],
    requiredGates: ["customer-approval", "print-certification"],
    requiredLegalReview: ["Staples print terms review"],
    disabledReasons: handoffDisabledReasons,
    blockedReasons: ["Staples remains manual handoff only."]
  },
  "office-depot": {
    vendorId: "office-depot",
    realOrdersEnabled: false,
    directOrderEnabled: false,
    canPlaceRealOrder: false,
    requiresManualConfirmation: true,
    liveQuoteEnabled: false,
    imageUploadEnabled: false,
    orderPlacementEnabled: false,
    handoffMode: "manual-upload",
    costControl: "free-app-no-paid-api",
    requiredEvidence: ["Office Depot manual upload Proof", "Customer approval record", "Print preview Proof"],
    requiredGates: ["customer-approval", "print-certification"],
    requiredLegalReview: ["Office Depot print terms review"],
    disabledReasons: handoffDisabledReasons,
    blockedReasons: ["Office Depot remains manual handoff only."]
  },
  "local-print-shop": {
    vendorId: "local-print-shop",
    realOrdersEnabled: false,
    directOrderEnabled: false,
    canPlaceRealOrder: false,
    requiresManualConfirmation: true,
    liveQuoteEnabled: false,
    imageUploadEnabled: false,
    orderPlacementEnabled: false,
    handoffMode: "manual-upload",
    costControl: "free-app-no-paid-api",
    requiredEvidence: ["Local printer manual handoff Proof", "Customer approval record", "Print preview Proof"],
    requiredGates: ["customer-approval", "print-certification"],
    requiredLegalReview: ["Local printer terms review"],
    disabledReasons: handoffDisabledReasons,
    blockedReasons: ["Local print shop fulfillment remains manual handoff only."]
  }
};

export function getOrderEnablementPolicy(vendorId) {
  return orderEnablementPolicies[vendorId] ?? orderEnablementPolicies["local-print-shop"];
}

export function getRetailOrderEnablementPolicies() {
  return retailOrderEnablementVendorIds.map((vendorId) => getOrderEnablementPolicy(vendorId));
}

export function orderEnablementRuntimeFlags(vendorIdOrPolicy) {
  const policy = typeof vendorIdOrPolicy === "string" ? getOrderEnablementPolicy(vendorIdOrPolicy) : vendorIdOrPolicy;
  return {
    realOrdersEnabled: policy.realOrdersEnabled,
    directOrderEnabled: policy.directOrderEnabled,
    canPlaceRealOrder: policy.canPlaceRealOrder,
    requiresManualConfirmation: policy.requiresManualConfirmation,
    liveQuoteEnabled: policy.liveQuoteEnabled,
    imageUploadEnabled: policy.imageUploadEnabled,
    orderPlacementEnabled: policy.orderPlacementEnabled
  };
}

export function validateOrderEnablementPolicies(policies = Object.values(orderEnablementPolicies)) {
  const issues = [];
  const vendorIds = new Set();

  for (const policy of policies) {
    if (vendorIds.has(policy.vendorId)) issues.push(`Duplicate Order enablement policy: ${policy.vendorId}.`);
    vendorIds.add(policy.vendorId);
    if (policy.realOrdersEnabled !== false) issues.push(`${policy.vendorId} Order enablement must keep realOrdersEnabled=false.`);
    if (policy.directOrderEnabled !== false) issues.push(`${policy.vendorId} Order enablement must keep directOrderEnabled=false.`);
    if (policy.canPlaceRealOrder !== false) issues.push(`${policy.vendorId} Order enablement must keep canPlaceRealOrder=false.`);
    if (policy.requiresManualConfirmation !== true) {
      issues.push(`${policy.vendorId} Order enablement must require manual confirmation.`);
    }
    if (policy.liveQuoteEnabled || policy.imageUploadEnabled || policy.orderPlacementEnabled) {
      issues.push(`${policy.vendorId} Order enablement must keep live retail operation flags false.`);
    }
    if (policy.handoffMode !== "manual-upload") issues.push(`${policy.vendorId} Handoff must stay manual-upload.`);
    if (policy.costControl !== "free-app-no-paid-api") issues.push(`${policy.vendorId} Handoff must stay free-app-no-paid-api.`);
    if (!Array.isArray(policy.requiredEvidence) || policy.requiredEvidence.length === 0) {
      issues.push(`${policy.vendorId} Order enablement must list required Evidence.`);
    }
    if (!policy.requiredGates.includes("customer-approval")) {
      issues.push(`${policy.vendorId} Order enablement must require customer-approval.`);
    }
    if (retailOrderEnablementVendorIds.includes(policy.vendorId) && !policy.requiredGates.includes("real-order-kill-switch")) {
      issues.push(`${policy.vendorId} Order enablement must require real-order-kill-switch.`);
    }
    if (!Array.isArray(policy.requiredLegalReview) || policy.requiredLegalReview.length === 0) {
      issues.push(`${policy.vendorId} Order enablement must list legal review.`);
    }
    if (!Array.isArray(policy.disabledReasons) || policy.disabledReasons.length === 0) {
      issues.push(`${policy.vendorId} Order enablement must provide Handoff disabled reasons.`);
    }
    if (!Array.isArray(policy.blockedReasons) || policy.blockedReasons.length === 0) {
      issues.push(`${policy.vendorId} Order enablement must provide blocked reasons.`);
    }
  }

  for (const vendorId of retailOrderEnablementVendorIds) {
    if (!vendorIds.has(vendorId)) issues.push(`Missing retail Order enablement policy: ${vendorId}.`);
  }

  return issues;
}
