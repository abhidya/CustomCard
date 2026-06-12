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
