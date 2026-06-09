import { describe, expect, it } from "vitest";
import { initialViewFromLocation } from "./appStateOrchestrator";

describe("initialViewFromLocation", () => {
  it("returns a valid ViewId (default is customer in jsdom with no params)", () => {
    const result = initialViewFromLocation();
    const validIds = new Set(["customer", "mobile", "opportunities", "studio", "memory", "handoff", "admin", "adapters"]);
    expect(validIds.has(result)).toBe(true);
  });

  it("falls back to customer in non-browser environment", () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", { value: undefined, configurable: true });
    try {
      expect(initialViewFromLocation()).toBe("customer");
    } finally {
      Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true });
    }
  });
});
