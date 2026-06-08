import { describe, expect, it } from "vitest";
import {
  couponSignalTextIncludes,
  matchPrinterCouponSignals,
  normalizePrinterCouponSignalText
} from "./printerCouponSignals";

describe("normalizePrinterCouponSignalText", () => {
  it("lowercases, trims, and collapses runs of whitespace", () => {
    expect(normalizePrinterCouponSignalText("  Save   20%\tOff  ")).toBe("save 20% off");
  });

  it("flattens newlines and surrounding whitespace into single spaces", () => {
    // The horizontal-whitespace pass keeps \r\n, but the following \s+ pass
    // collapses every whitespace run — newlines included — to one space, so
    // signal text is matched on a single normalized line.
    expect(normalizePrinterCouponSignalText("Save  20%\nOff   Now")).toBe("save 20% off now");
  });

  it("decodes &nbsp; to a space and &amp; to an ampersand", () => {
    expect(normalizePrinterCouponSignalText("cards&nbsp;&amp;&nbsp;more")).toBe("cards & more");
  });

  it("strips named trademark, registered, and copyright entities", () => {
    expect(normalizePrinterCouponSignalText("Walgreens&reg; Photo&trade; &copy;2026")).toBe(
      "walgreens photo 2026"
    );
  });

  it("strips numeric trademark, registered, and copyright entities", () => {
    expect(normalizePrinterCouponSignalText("A&#174;B&#8482;C&#169;")).toBe("abc");
  });

  it("strips raw unicode ® ™ ℠ © symbols", () => {
    expect(normalizePrinterCouponSignalText("Brand®™℠© cards")).toBe("brand cards");
  });

  it("returns an empty string for whitespace-only input", () => {
    expect(normalizePrinterCouponSignalText("   \t  ")).toBe("");
  });
});

describe("couponSignalTextIncludes", () => {
  it("matches case-insensitively after normalization", () => {
    expect(couponSignalTextIncludes("SAVE 20% OFF CARDS", "save 20%")).toBe(true);
  });

  it("matches across entity and whitespace differences", () => {
    expect(couponSignalTextIncludes("Cards&nbsp;&amp;&nbsp;Gifts 50%", "cards & gifts")).toBe(true);
  });

  it("does not match when the signal is absent", () => {
    expect(couponSignalTextIncludes("save 20% off", "buy one get one")).toBe(false);
  });

  it("returns false for an empty signal so blank rules never match everything", () => {
    expect(couponSignalTextIncludes("any text at all", "")).toBe(false);
    expect(couponSignalTextIncludes("any text at all", "   ")).toBe(false);
  });
});

describe("matchPrinterCouponSignals", () => {
  it("returns only the matching signals, preserving input order", () => {
    const text = "Use code CRISP for 60% off folded cards, pickup today";
    const result = matchPrinterCouponSignals(text, ["60% off", "buy one get one", "folded cards", "CRISP"]);
    expect(result).toEqual(["60% off", "folded cards", "CRISP"]);
  });

  it("returns an empty array when no signal matches", () => {
    expect(matchPrinterCouponSignals("nothing here", ["free shipping", "20% off"])).toEqual([]);
  });

  it("ignores empty signals", () => {
    expect(matchPrinterCouponSignals("save 20% off", ["", "20% off"])).toEqual(["20% off"]);
  });
});
