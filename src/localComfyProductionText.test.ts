import { describe, expect, it } from "vitest";
import {
  interpolateLocalComfyTemplate,
  localComfyTypographyVariables,
  localComfyWorkflowInputSummary,
  localComfyWorkflowInputsForMetadata
} from "../scripts/local-comfy-production-text.mjs";

describe("local Comfy production text contract", () => {
  it("builds deterministic typography and artwork guard variables", () => {
    const variables = localComfyTypographyVariables({
      panelId: "front",
      width: 960,
      height: 1344,
      panelCopy: {
        headline: " For Moments   That Matter ",
        body: "Wishing you strength\nand peace.",
        text_layout: {
          headline_zone: "center",
          body_zone: "lower",
          color_mode: "light-ink",
          font_pairing: "bold-editorial",
          scale: "large"
        }
      }
    });

    expect(variables.headlineText).toBe("For Moments That Matter");
    expect(variables.bodyText).toBe("Wishing you strength and peace.");
    expect(variables.headlineFont).toBe("arialbd.ttf");
    expect(variables.bodyFont).toBe("arial.ttf");
    expect(variables.artworkGuardStyle).toBe("panel");
    expect(variables.artworkGuardOpacity).toBe(1);
    expect(variables.artworkGuardX).toBe(0);
    expect(variables.artworkGuardY).toBe(0);
    expect(variables.artworkGuardWidth).toBe(960);
    expect(variables.artworkGuardHeight).toBe(1344);
    expect(variables.headlineBoxBackgroundStyle).toBe("text-hug");
    expect(variables.headlineBoxBackgroundOpacity).toBe(0.96);
  });

  it("summarizes and merges workflow metadata from one source of truth", () => {
    const variables = {
      cfg: 1.5,
      checkpoint: "sd_xl_turbo_1.0_fp16.safetensors",
      height: 1344,
      negativePrompt: "fake text",
      panelId: "inside-right",
      prompt: "quiet stationery",
      sampler: "euler_ancestral",
      scheduler: "sgm_uniform",
      seed: 20260626,
      steps: 2,
      width: 960,
      workflowId: "customcard-production-text-overlay",
      ...localComfyTypographyVariables({
        panelId: "inside-right",
        width: 960,
        height: 1344,
        panelCopy: {
          headline: "With Respect and Warmth",
          body: "For the moments that ask for courage.",
          text_layout: { color_mode: "dark-ink", font_pairing: "soft-serif" }
        }
      })
    };
    const summary = localComfyWorkflowInputSummary(variables);
    const merged = localComfyWorkflowInputsForMetadata(
      {
        CUSTOMCARD_COMFYUI_WORKFLOW_INPUTS_JSON:
          '{"panel_id":"{{panel_id}}","width":"{{width}}","body_text":"{{body_text}}","custom_marker":"{{workflow_id}}"}'
      },
      variables
    );

    expect(summary.workflow_id).toBe("customcard-production-text-overlay");
    expect(summary.artwork_guard_style).toBe("panel");
    expect(summary.artwork_guard_opacity).toBe(1);
    expect(summary.headline_box_background_style).toBe("text-hug");
    expect(merged.panel_id).toBe("inside-right");
    expect(merged.width).toBe(960);
    expect(merged.body_text).toBe("For the moments that ask for courage.");
    expect(merged.custom_marker).toBe("customcard-production-text-overlay");
  });

  it("interpolates nested workflow templates while preserving exact placeholder types", () => {
    const rendered = interpolateLocalComfyTemplate(
      {
        text: "{{headline_text}}",
        width: "{{width}}",
        nested: ["prefix {{panel_id}}", "{{artwork_guard_opacity}}"]
      },
      {
        headlineText: "A Quiet Honor",
        width: 960,
        panelId: "inside-left",
        artworkGuardOpacity: 0.74
      }
    );

    expect(rendered).toEqual({
      text: "A Quiet Honor",
      width: 960,
      nested: ["prefix inside-left", 0.74]
    });
  });
});
