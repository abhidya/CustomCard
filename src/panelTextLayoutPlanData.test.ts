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
    expect(variables.artworkGuardOpacity).toBe(0.96);
    expect(variables.headlineBoxY).toBe(376);
  });
});
