import { formatCents, formatLongDate, formatShortDate, humanizeStatus } from "../format";

describe("format helpers", () => {
  it("humanizes status slugs", () => {
    expect(humanizeStatus("needs-review")).toBe("Needs review");
    expect(humanizeStatus("vendor_handoff_ready")).toBe("Vendor handoff ready");
    expect(humanizeStatus("ready")).toBe("Ready");
    expect(humanizeStatus("")).toBe("");
  });

  it("formats cents as currency", () => {
    expect(formatCents(219)).toBe("$2.19");
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(125000)).toBe("$1,250.00");
  });

  it("returns the raw value for unparseable dates", () => {
    expect(formatShortDate("not-a-date")).toBe("not-a-date");
    expect(formatLongDate("")).toBe("");
  });

  it("formats valid dates into a non-ISO human string", () => {
    const iso = "2026-07-01T18:00:00.000Z";
    const short = formatShortDate(iso);
    const long = formatLongDate(iso);
    expect(short).not.toBe(iso);
    expect(short.length).toBeGreaterThan(0);
    expect(long).toContain("2026");
  });
});
