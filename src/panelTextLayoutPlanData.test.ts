import { describe, expect, it } from "vitest";
import {
  buildLocalComfyTypographyPlan,
  buildPanelTextLayoutPlan,
  normalizePanelTextLayout,
  panelTextLayoutDefaults
} from "./panelTextLayoutPlanData.mjs";

describe("panel text layout plan", () => {
  it("keeps source-specific layout repair behind one interface", () => {
    const layout = normalizePanelTextLayout(panelTextLayoutDefaults["inside-left"], {
      panelId: "inside-left",
      sourceText: "medical graduation for a new doctor with stethoscope details"
    });

    expect(layout).toMatchObject({
      headline_zone: "upper",
      body_zone: "center",
      alignment: "left",
      font_pairing: "soft-serif",
      color_mode: "dark-ink"
    });
  });

  it("keeps normal birthday interiors on light stationery instead of black panels", () => {
    const layout = normalizePanelTextLayout(
      {
        ...panelTextLayoutDefaults["inside-left"],
        color_mode: "light-ink"
      },
      {
        panelId: "inside-left",
        sourceText: "sentimental botanical birthday for papa with flowers, trails, coffee, and horses"
      }
    );

    expect(layout.color_mode).toBe("dark-ink");
  });

  it("projects normalized layout into render text coordinates", () => {
    const plan = buildPanelTextLayoutPlan({
      panelId: "front",
      textLayout: {
        headline_zone: "center",
        body_zone: "lower",
        alignment: "right",
        font_pairing: "bold-editorial",
        color_mode: "high-contrast",
        scale: "large"
      },
      styleId: "bold-type",
      hasArtwork: true,
      legacyLayout: {
        textFill: "#111111",
        bodyFill: "#222222"
      }
    });

    expect(plan).toMatchObject({
      x: 1240,
      anchor: "end",
      headlineY: 860,
      bodyY: 1320,
      headlineFill: "#ffffff",
      bodyFill: "#ffffff",
      headlineMaxLines: 2
    });
    expect(plan.headlineSize).toBeGreaterThan(plan.bodySize);
  });

  it("projects the same layout into local Comfy typography variables", () => {
    const variables = buildLocalComfyTypographyPlan({
      panelId: "front",
      width: 960,
      height: 1344,
      panelCopy: {
        headline: " A  Bright   Start ",
        body: "A steady note.",
        text_layout: {
          headline_zone: "center",
          body_zone: "lower",
          font_pairing: "bold-editorial",
          color_mode: "light-ink",
          scale: "large"
        }
      }
    });

    expect(variables.headlineText).toBe("A Bright Start");
    expect(variables.headlineFont).toBe("arialbd.ttf");
    expect(variables.artworkGuardStyle).toBe("panel");
    expect(variables.artworkGuardOpacity).toBe(0.74);
    expect(variables.artworkGuardX).toBeGreaterThan(0);
    expect(variables.artworkGuardY).toBeGreaterThan(0);
    expect(variables.artworkGuardWidth).toBeLessThan(960);
    expect(variables.artworkGuardHeight).toBeLessThan(1344);
    expect(variables.headlineBoxY).toBe(376);
  });

  it("uses a stronger center guard on the back panel to hide model fake text", () => {
    const variables = buildLocalComfyTypographyPlan({
      panelId: "back",
      width: 960,
      height: 1344,
      panelCopy: {
        headline: "With Love",
        body: "Mann",
        text_layout: {
          headline_zone: "lower",
          body_zone: "bottom",
          color_mode: "dark-ink",
          font_pairing: "minimal-sans"
        }
      }
    });

    expect(variables.artworkGuardStyle).toBe("box");
    expect(variables.artworkGuardOpacity).toBe(0.74);
    expect(variables.artworkGuardY).toBeGreaterThan(700);
    expect(variables.artworkGuardHeight).toBeLessThan(520);
    expect(variables.artworkGuardWidth).toBeLessThan(960);
  });
});
