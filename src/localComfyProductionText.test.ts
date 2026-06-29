import { describe, expect, it } from "vitest";
import {
  defaultProductionTextWorkflowPath,
  productionTextNodeSourceRelativePath,
  productionTextRequiredCompositorInputs,
  productionTextRequiredNodeClass,
  productionTextWorkflowId,
  productionTextWorkflowRelativePath
} from "../scripts/comfy-production-text-setup.mjs";
import { describeLocalComfyWorkerReadiness } from "../scripts/local-comfy-worker.mjs";
import {
  interpolateLocalComfyTemplate,
  localComfySafeArtworkGuard,
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
    expect(variables.artworkGuardOpacity).toBe(0.28);
    expect(variables.artworkGuardX).toBeGreaterThan(0);
    expect(variables.artworkGuardY).toBeGreaterThan(0);
    expect(variables.artworkGuardWidth).toBeLessThan(960);
    expect(variables.artworkGuardHeight).toBeLessThan(1344);
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
      {},
      variables,
      '{"panel_id":"{{panel_id}}","width":"{{width}}","body_text":"{{body_text}}","custom_marker":"{{workflow_id}}"}'
    );

    expect(summary.workflow_id).toBe("customcard-production-text-overlay");
    expect(summary.artwork_guard_style).toBe("panel");
    expect(summary.artwork_guard_opacity).toBe(0.28);
    expect(summary.headline_box_background_style).toBe("text-hug");
    expect(merged.panel_id).toBe("inside-right");
    expect(merged.width).toBe(960);
    expect(merged.body_text).toBe("For the moments that ask for courage.");
    expect(merged.custom_marker).toBe("customcard-production-text-overlay");
  });

  it("recovers stale full-canvas artwork guards before workflow interpolation", () => {
    const staleVariables = {
      width: 960,
      height: 1344,
      artworkGuardX: 0,
      artworkGuardY: 0,
      artworkGuardWidth: 960,
      artworkGuardHeight: 1344,
      artworkGuardOpacity: 1,
      artworkGuardStyle: "panel",
      headlineText: "Happy Birthday",
      headlineBoxX: 86,
      headlineBoxY: 94,
      headlineBoxWidth: 788,
      headlineBoxHeight: 242,
      bodyText: "A birthday tribute",
      bodyBoxX: 106,
      bodyBoxY: 780,
      bodyBoxWidth: 748,
      bodyBoxHeight: 403
    };

    const safeGuard = localComfySafeArtworkGuard(staleVariables);
    const rendered = interpolateLocalComfyTemplate(
      {
        x: "{{artwork_guard_x}}",
        y: "{{artwork_guard_y}}",
        width: "{{artwork_guard_width}}",
        height: "{{artwork_guard_height}}",
        opacity: "{{artwork_guard_opacity}}"
      },
      staleVariables
    );

    expect(safeGuard).toMatchObject({ x: 77, width: 806, opacity: 0.28 });
    expect(safeGuard.height).toBeLessThan(1344);
    expect(rendered).toMatchObject({ x: 77, width: 806, opacity: 0.28 });
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
        artworkGuardOpacity: 1
      }
    );

    expect(rendered).toEqual({
      text: "A Quiet Honor",
      width: 960,
      nested: ["prefix inside-left", 1]
    });
  });

  it("describes resolved production text workflow setup for the local worker when configured", () => {
    const readiness = describeLocalComfyWorkerReadiness({
      env: {
        CUSTOMCARD_ENV: "dev",
        CUSTOMCARD_API_RUNTIME: "contract",
        DATABASE_URL: "postgres://customcard.local/customcard",
        QUEUE_URL: "redis://queue.customcard.local",
        OBJECT_STORE_URL: "file:///tmp/customcard-objects",
        OBJECT_STORE_SIGNING_SECRET: "test-object-store-signing-secret-32",
        AUTH_SESSION_SECRET: "test-auth-session-secret-32-chars",
        CLERK_JWT_KEY: `-----BEGIN PUBLIC KEY-----
test-clerk-jwt-key
-----END PUBLIC KEY-----`,
        CLERK_AUTHORIZED_PARTIES: "https://customcard.test",
        CLERK_ISSUER: "https://clerk.customcard.test",
        CLERK_AUDIENCE: "customcard-api"
      },
      aiFlowAdminConfig: [
        {
          flowId: "card-image",
          primaryAdapterId: "local-comfyui-api-image",
          fallbackAdapterId: "local-comfyui-api-image",
          liveProviderCallsEnabled: true,
          renderingMode: "final-text-composited",
          workflowId: productionTextWorkflowId,
          workflowPath: defaultProductionTextWorkflowPath()
        }
      ]
    });

    expect(readiness.comfyUrl).toBe("http://127.0.0.1:8188");
    expect(readiness.productionTextSetup).toMatchObject({
      comfyUrl: "http://127.0.0.1:8188",
      workflowId: productionTextWorkflowId,
      workflowPathRelative: productionTextWorkflowRelativePath,
      nodeSourceRelative: productionTextNodeSourceRelativePath,
      requiredNodeClass: productionTextRequiredNodeClass,
      requiredComposerInputs: productionTextRequiredCompositorInputs
    });
  });
});
