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

  it("does not add an SVG text layer to final text-composited AI panels", () => {
    const svg = buildPanelSvg({
      ...panel,
      imageUrl: "data:image/png;base64,iVBORw0KGgo=",
      imageRendering: "final-text-composited",
      imagePlacement: { frame: "fit", focus: "center" }
    });

    expect(svg).toContain('data-customcard-rendering="final-text-composited"');
    expect(svg).toContain('x="0" y="0" width="1500" height="2100"');
    expect(svg).not.toContain('stroke="#d8d2c6"');
    expect(svg).not.toContain("<text");
    expect(svg).not.toContain("With Care");
    expect(svg).not.toContain("A quiet note.");
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

  it("renders uploaded image placement and rich text formatting into the SVG", () => {
    const svg = buildPanelSvg({
      ...panel,
      imagePlacement: { frame: "photo-window", focus: "top" },
      imageUrl: "data:image/png;base64,iVBORw0KGgo=",
      textFormat: {
        headline: { accent: true, bold: true, italic: true },
        body: { bold: true, italic: true }
      },
      textLayout: {
        headlineZone: "lower",
        bodyZone: "bottom",
        alignment: "center",
        fontPairing: "serif-sans",
        colorMode: "dark-ink",
        scale: "standard"
      }
    });

    expect(svg).toContain('x="180" y="210" width="1140" height="860"');
    expect(svg).toContain('preserveAspectRatio="xMidYMin slice"');
    expect(svg).toContain('font-weight="800" font-style="italic"');
    expect(svg).toContain('font-weight="700" font-style="italic"');
    expect(svg).toContain('fill="#315b7d"');
  });

  it("can fit a whole uploaded image inside the print-safe frame", () => {
    const svg = buildPanelSvg({
      ...panel,
      imagePlacement: { frame: "fit", focus: "center" },
      imageUrl: "data:image/jpeg;base64,/9j/AA=="
    });

    expect(svg).toContain('x="180" y="180" width="1140" height="1740"');
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"');
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
