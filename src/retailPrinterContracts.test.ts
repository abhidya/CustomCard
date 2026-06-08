import { describe, expect, it } from "vitest";
import {
  buildRetailPrinterAdapterContract,
  validateRetailPrinterOperationBlueprint,
  validateRetailPrinterOperationPolicy,
  validateRetailPrinterProductUrl,
  validateRetailPrinterProviderEntrypoints,
  validateRetailPrinterProviderOperationEvidence,
  type RetailPrinterAdapterContract,
  type RetailPrinterProviderOperationEvidence
} from "./retailPrinterContracts";
import {
  getRetailPrinterProductLink,
  retailPrinterAdapters,
  validateRetailPrinterAdapters
} from "./retailPrinterAdapters";

// These validators are the guards that keep live retail operations hard-gated.
// validateRetailPrinterAdapters() only ever runs them against the real, valid
// adapter set (happy path), so these tests deep-clone a real adapter, inject one
// violation, and prove the matching guard actually rejects it.

const baseAdapter = retailPrinterAdapters[0]; // walmart

function clone(): RetailPrinterAdapterContract {
  return structuredClone(baseAdapter);
}

describe("validateRetailPrinterProductUrl", () => {
  it("accepts a real adapter", () => {
    expect(validateRetailPrinterProductUrl(clone())).toEqual([]);
  });

  it("rejects a placeholder product URL", () => {
    const adapter = clone();
    adapter.productUrl = "https://example.com/demo";
    expect(validateRetailPrinterProductUrl(adapter).join(" ")).toContain("placeholder");
  });

  it("rejects a product URL that drifts from the registered link", () => {
    const adapter = clone();
    adapter.productUrl = "https://photos3.walmart.com/category/other";
    expect(validateRetailPrinterProductUrl(adapter).some((issue) => issue.includes("exact supplied"))).toBe(true);
  });

  it("rejects a mismatched provider adapter id", () => {
    const adapter = clone();
    adapter.providerAdapterId = "wrong-provider";
    expect(validateRetailPrinterProductUrl(adapter).some((issue) => issue.includes("provider adapter id"))).toBe(true);
  });
});

describe("validateRetailPrinterOperationPolicy", () => {
  it("accepts a real adapter", () => {
    expect(validateRetailPrinterOperationPolicy(clone())).toEqual([]);
  });

  it("rejects a policy whose vendor id does not match the adapter", () => {
    const adapter = clone();
    adapter.operationPolicy.vendorId = "cvs";
    expect(validateRetailPrinterOperationPolicy(adapter).some((i) => i.includes("vendor id must match"))).toBe(true);
  });

  it("rejects a price policy that drops same-cart coupon proof", () => {
    const adapter = clone();
    (adapter.operationPolicy.price.couponProof as string) = "none";
    expect(
      validateRetailPrinterOperationPolicy(adapter).some((i) => i.includes("same-cart provider portal coupon proof"))
    ).toBe(true);
  });

  it("rejects a price policy missing a required evidence field", () => {
    const adapter = clone();
    adapter.operationPolicy.price.requiredEvidenceFields = ["subtotal"];
    expect(validateRetailPrinterOperationPolicy(adapter).some((i) => i.includes("taxStatus evidence"))).toBe(true);
  });
});

describe("validateRetailPrinterProviderEntrypoints", () => {
  it("accepts a real adapter", () => {
    // Uses the real adapter (not a clone): the validator asserts each entrypoint
    // references the exact registered public-evidence object, which a deep clone
    // would break by identity.
    expect(validateRetailPrinterProviderEntrypoints(baseAdapter)).toEqual([]);
  });

  it("rejects an entrypoint with the wrong evidence mode", () => {
    const adapter = clone();
    const priceEntrypoint = adapter.providerEntrypoints.find((e) => e.operation === "fetch-price")!;
    (priceEntrypoint.evidenceMode as string) = "provider-cart-final-review";
    expect(validateRetailPrinterProviderEntrypoints(adapter).some((i) => i.includes("evidence mode"))).toBe(true);
  });

  it("rejects an entrypoint that unblocks order submission", () => {
    const adapter = clone();
    const entrypoint = adapter.providerEntrypoints[0];
    (entrypoint.orderSubmissionBlocked as boolean) = false;
    expect(
      validateRetailPrinterProviderEntrypoints(adapter).some((i) => i.includes("keep order submission blocked"))
    ).toBe(true);
  });
});

describe("validateRetailPrinterOperationBlueprint", () => {
  it("rejects an operation missing a required certification gate", () => {
    const adapter = clone();
    const operation = adapter.operations.find((o) => o.kind === "place-order")!;
    operation.certificationGateIds = operation.certificationGateIds.filter((id) => id !== "payment-certification");
    expect(
      validateRetailPrinterOperationBlueprint(adapter.vendorId, operation).some((i) => i.includes("payment-certification"))
    ).toBe(true);
  });

  it("rejects an operation that forgets a forbidden field", () => {
    const adapter = clone();
    const operation = adapter.operations[0];
    operation.requestBlueprint.forbiddenFields = operation.requestBlueprint.forbiddenFields.filter(
      (field) => field !== "raw payment card data"
    );
    expect(
      validateRetailPrinterOperationBlueprint(adapter.vendorId, operation).some((i) => i.includes("raw payment card data"))
    ).toBe(true);
  });
});

describe("validateRetailPrinterProviderOperationEvidence", () => {
  const validEvidence = baseAdapter.providerEntrypoints[0].publicEvidence;

  it("rejects missing evidence outright", () => {
    expect(validateRetailPrinterProviderOperationEvidence("walmart", "fetch-price", undefined)).toEqual([
      "walmart fetch-price entrypoint must include public page evidence."
    ]);
  });

  it("rejects fewer than three page signals", () => {
    const evidence: RetailPrinterProviderOperationEvidence = { ...validEvidence, pageSignals: ["only one"] };
    expect(
      validateRetailPrinterProviderOperationEvidence("walmart", "fetch-price", evidence).some((i) =>
        i.includes("at least three page signals")
      )
    ).toBe(true);
  });

  it("rejects placeholder-like page signals", () => {
    const evidence: RetailPrinterProviderOperationEvidence = {
      ...validEvidence,
      pageSignals: ["dummy", "placeholder", "todo"]
    };
    expect(
      validateRetailPrinterProviderOperationEvidence("walmart", "fetch-price", evidence).some((i) =>
        i.includes("placeholder-like page signals")
      )
    ).toBe(true);
  });
});

describe("buildRetailPrinterAdapterContract", () => {
  it("builds a contract that passes every per-adapter validator", () => {
    const productLink = getRetailPrinterProductLink("walgreens");
    const built = buildRetailPrinterAdapterContract(productLink, "Combined PDF proof plus SVG panel set");
    expect(built.realOrdersEnabled).toBe(false);
    expect(built.orderPlacementEnabled).toBe(false);
    expect(validateRetailPrinterProductUrl(built)).toEqual([]);
    expect(validateRetailPrinterOperationPolicy(built)).toEqual([]);
    expect(validateRetailPrinterProviderEntrypoints(built)).toEqual([]);
    // And the full set still validates with the built adapter swapped in.
    const fullSet = retailPrinterAdapters.map((adapter) => (adapter.vendorId === "walgreens" ? built : adapter));
    expect(validateRetailPrinterAdapters(fullSet)).toEqual([]);
  });
});
