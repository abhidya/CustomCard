import { describe, expect, it } from "vitest";
import type { CardPanel } from "./cardDraft";
import { buildPanelSvg } from "./renderPacket";

describe("buildPanelSvg", () => {
  it("inlines deterministic SVG artwork layers instead of nesting a broken SVG image", () => {
    const artwork = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2100" viewBox="0 0 1500 2100" data-customcard-theme="botanical">',
      '<rect width="1500" height="2100" fill="#dfead8"/>',
      '<circle cx="200" cy="240" r="80" fill="#33685a"/>',
      "</svg>"
    ].join("");
    const svg = buildPanelSvg({
      ...panel,
      imageUrl: `data:image/svg+xml;base64,${Buffer.from(artwork, "utf8").toString("base64")}`
    });

    expect(svg).toContain('<svg x="120" y="120" width="1260" height="1860"');
    expect(svg).toContain('fill="#dfead8"');
    expect(svg).not.toContain('<image href="data:image/svg+xml');
  });

  it("keeps non-local artwork URLs as image layers", () => {
    const svg = buildPanelSvg({
      ...panel,
      imageUrl: "data:image/png;base64,iVBORw0KGgo="
    });

    expect(svg).toContain('<image href="data:image/png;base64,iVBORw0KGgo="');
  });

  it("never renders art direction as recipient-visible text", () => {
    const svg = buildPanelSvg({ ...panel, artDirection: "SECRET-DESIGN-NOTE" });
    expect(svg).not.toContain("SECRET-DESIGN-NOTE");
  });

  it("renders each visual style with distinct structural markers", () => {
    const botanical = buildPanelSvg({ ...panel, styleId: "botanical" });
    const boldType = buildPanelSvg({ ...panel, styleId: "bold-type" });
    const photoNote = buildPanelSvg({ ...panel, styleId: "photo-note" });
    const minimal = buildPanelSvg({ ...panel, styleId: "minimal" });

    expect(botanical).toContain('data-customcard-style="botanical"');
    expect(botanical).toContain('data-style-marker="botanical-florals"');
    expect(boldType).toContain('data-style-marker="bold-type-block"');
    expect(photoNote).toContain('data-style-marker="photo-note-slot"');
    expect(minimal).toContain('data-style-marker="minimal-rule"');
    // No two styles share the same decoration structure.
    expect(new Set([botanical, boldType, photoNote, minimal]).size).toBe(4);
    expect(boldType).not.toContain("botanical-florals");
    expect(minimal).not.toContain("photo-note-slot");
  });

  it("defaults legacy panels without a style to the botanical layout", () => {
    expect(buildPanelSvg(panel)).toContain('data-customcard-style="botanical"');
  });

  it("uses safe text layout presets when AI copy provides them", () => {
    const svg = buildPanelSvg({
      ...panel,
      textLayout: {
        headlineZone: "upper",
        bodyZone: "lower",
        alignment: "right",
        fontPairing: "bold-editorial",
        colorMode: "accent-ink",
        scale: "large"
      }
    });

    expect(svg).toContain('text-anchor="end"');
    expect(svg).toContain('x="1240"');
    expect(svg).toContain('font-family="Helvetica, Arial, sans-serif"');
    expect(svg).toContain('y="1320"');
  });
});

const panel: CardPanel = {
  id: "front",
  label: "Front",
  headline: "With Care",
  body: "A quiet note.",
  artDirection: "Soft botanical artwork.",
  width: 1500,
  height: 2100,
  dpi: 300,
  rtl: false,
  overflowRisk: false
};
