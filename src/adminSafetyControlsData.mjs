export const adminSafetyControlsRoute = "/api/admin/safety-controls";

export const safetyControlVendorIds = Object.freeze([
  "walgreens",
  "cvs",
  "fedex",
  "walmart",
  "staples",
  "office-depot"
]);

export const safetyControlVendorModes = Object.freeze([
  "disabled_until_certified",
  "sandbox",
  "production"
]);

const vendorLabels = Object.freeze({
  walgreens: "Walgreens",
  cvs: "CVS",
  fedex: "FedEx",
  walmart: "Walmart",
  staples: "Staples",
  "office-depot": "Office Depot"
});

export function createAdminSafetyControlStore({ initialControls, now = () => new Date() } = {}) {
  let controls = normalizeAdminSafetyControls(initialControls);

  return {
    read() {
      return controls;
    },
    update(patch, context = {}) {
      controls = normalizeAdminSafetyControls({
        ...controls,
        ...(isRecord(patch) ? patch : {}),
        vendorModes: {
          ...controls.vendorModes,
          ...(isRecord(patch?.vendorModes) ? patch.vendorModes : {})
        },
        vendorCertification: {
          ...controls.vendorCertification,
          ...(isRecord(patch?.vendorCertification) ? patch.vendorCertification : {})
        },
        updatedAtIso: now().toISOString(),
        updatedBy: safeActor(context.authContext?.userId ?? context.userId ?? controls.updatedBy)
      });
      return controls;
    }
  };
}

export function normalizeAdminSafetyControls(input = {}) {
  const source = isRecord(input) ? input : {};
  const vendorModes = normalizeVendorModes(source.vendorModes);
  const vendorCertification = normalizeVendorCertification(source.vendorCertification);
  const realOrdersEnabled = source.realOrdersEnabled === true;
  const productionMutationAcknowledged = source.productionMutationAcknowledged === true;
  const liveWriteAcknowledged = source.liveWriteAcknowledged === true;
  const updatedAtIso = safeIso(source.updatedAtIso);
  const updatedBy = safeActor(source.updatedBy);
  const walgreensProductionBlockers = buildWalgreensCheckoutSafetyBlockers({
    realOrdersEnabled,
    vendorModes,
    vendorCertification,
    productionMutationAcknowledged,
    liveWriteAcknowledged
  });
  const controls = {
    service: "customcard-admin-safety-controls",
    status: "fail-closed",
    realOrdersEnabled,
    vendorModes,
    vendorCertification,
    productionMutationAcknowledged,
    liveWriteAcknowledged,
    externalNetworkCalls: walgreensProductionBlockers.length === 0 && vendorModes.walgreens !== "disabled_until_certified",
    liveVendorOrders:
      realOrdersEnabled &&
      vendorModes.walgreens === "production" &&
      vendorCertification.walgreens &&
      productionMutationAcknowledged &&
      liveWriteAcknowledged,
    updatedAtIso,
    updatedBy,
    allowedVendorModes: safetyControlVendorModes,
    vendorIds: safetyControlVendorIds,
    blockers: []
  };
  controls.blockers = summarizeAdminSafetyControlBlockers(controls);
  controls.status = controls.blockers.length === 0 ? "ready" : "fail-closed";
  return controls;
}

export function walgreensCheckoutModeFromSafetyControls(controls) {
  const normalized = normalizeAdminSafetyControls(controls);
  return normalized.vendorModes.walgreens;
}

export function walgreensCheckoutSafetyBlockers(controls) {
  const normalized = isNormalizedControls(controls) ? controls : normalizeAdminSafetyControls(controls);
  return buildWalgreensCheckoutSafetyBlockers(normalized);
}

function buildWalgreensCheckoutSafetyBlockers(normalized) {
  const mode = normalized.vendorModes.walgreens;
  if (mode !== "production") return [];

  const blockers = [];
  if (!normalized.realOrdersEnabled) blockers.push("Admin safety controls have not enabled real orders.");
  if (!normalized.vendorCertification.walgreens) blockers.push("Walgreens vendor certification is not recorded.");
  if (!normalized.productionMutationAcknowledged) blockers.push("Production mutation acknowledgement is not recorded.");
  if (!normalized.liveWriteAcknowledged) blockers.push("Explicit live-write acknowledgement is not recorded.");
  return blockers;
}

export function summarizeAdminSafetyControlBlockers(controls) {
  const normalized = isNormalizedControls(controls) ? controls : normalizeAdminSafetyControls(controls);
  const blockers = [];
  if (!normalized.realOrdersEnabled) blockers.push("Real order enablement is off.");
  for (const vendorId of safetyControlVendorIds) {
    if (normalized.vendorModes[vendorId] === "production" && !normalized.vendorCertification[vendorId]) {
      blockers.push(`${vendorLabels[vendorId]} production mode needs vendor certification.`);
    }
  }
  if (Object.values(normalized.vendorModes).includes("production") && !normalized.productionMutationAcknowledged) {
    blockers.push("Production mutation acknowledgement is required for production vendor mode.");
  }
  if (Object.values(normalized.vendorModes).includes("production") && !normalized.liveWriteAcknowledged) {
    blockers.push("Explicit live-write acknowledgement is required for production vendor mode.");
  }
  return blockers;
}

function normalizeVendorModes(value) {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(
    safetyControlVendorIds.map((vendorId) => [
      vendorId,
      safetyControlVendorModes.includes(source[vendorId]) ? source[vendorId] : "disabled_until_certified"
    ])
  );
}

function normalizeVendorCertification(value) {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(safetyControlVendorIds.map((vendorId) => [vendorId, source[vendorId] === true]));
}

function isNormalizedControls(value) {
  return Boolean(
    isRecord(value) &&
      value.service === "customcard-admin-safety-controls" &&
      isRecord(value.vendorModes) &&
      isRecord(value.vendorCertification)
  );
}

function isRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function safeActor(value) {
  const text = String(value ?? "").trim();
  return text.replace(/[^a-zA-Z0-9@._:-]/g, "").slice(0, 120) || null;
}

function safeIso(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
