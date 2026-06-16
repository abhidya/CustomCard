import { describe, expect, it } from "vitest";
import {
  createAdminSafetyControlStore,
  normalizeAdminSafetyControls,
  walgreensCheckoutSafetyBlockers
} from "./adminSafetyControlsData.mjs";

describe("admin safety controls", () => {
  it("defaults all live order and vendor controls to fail closed", () => {
    const controls = normalizeAdminSafetyControls();

    expect(controls).toMatchObject({
      status: "fail-closed",
      realOrdersEnabled: false,
      productionMutationAcknowledged: false,
      liveWriteAcknowledged: false,
      externalNetworkCalls: false,
      liveVendorOrders: false
    });
    expect(controls.vendorModes.walgreens).toBe("disabled_until_certified");
    expect(controls.vendorCertification.walgreens).toBe(false);
    expect(controls.blockers).toContain("Real order enablement is off.");
  });

  it("lets admins select sandbox without production mutation gates", () => {
    const controls = normalizeAdminSafetyControls({
      vendorModes: { walgreens: "sandbox" }
    });

    expect(controls.vendorModes.walgreens).toBe("sandbox");
    expect(controls.externalNetworkCalls).toBe(true);
    expect(walgreensCheckoutSafetyBlockers(controls)).toEqual([]);
  });

  it("requires every explicit live gate before Walgreens production can open", () => {
    const blocked = normalizeAdminSafetyControls({
      vendorModes: { walgreens: "production" }
    });

    expect(walgreensCheckoutSafetyBlockers(blocked)).toEqual([
      "Admin safety controls have not enabled real orders.",
      "Walgreens vendor certification is not recorded.",
      "Production mutation acknowledgement is not recorded.",
      "Explicit live-write acknowledgement is not recorded."
    ]);

    const open = normalizeAdminSafetyControls({
      realOrdersEnabled: true,
      vendorModes: { walgreens: "production" },
      vendorCertification: { walgreens: true },
      productionMutationAcknowledged: true,
      liveWriteAcknowledged: true
    });

    expect(walgreensCheckoutSafetyBlockers(open)).toEqual([]);
    expect(open.status).toBe("ready");
    expect(open.liveVendorOrders).toBe(true);
  });

  it("records admin updates without accepting truthy strings as safety acknowledgements", () => {
    const store = createAdminSafetyControlStore({
      now: () => new Date("2026-06-16T12:00:00.000Z")
    });

    const saved = store.update(
      {
        realOrdersEnabled: "true" as unknown as boolean,
        vendorModes: { walgreens: "sandbox" },
        vendorCertification: { walgreens: true }
      },
      { authContext: { userId: "admin@example.com" } }
    );

    expect(saved.realOrdersEnabled).toBe(false);
    expect(saved.vendorModes.walgreens).toBe("sandbox");
    expect(saved.vendorCertification.walgreens).toBe(true);
    expect(saved.updatedAtIso).toBe("2026-06-16T12:00:00.000Z");
    expect(saved.updatedBy).toBe("admin@example.com");
  });
});
