import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  assertSafeGeneratedImageDownloadUrl,
  createAiCardGenerationService,
  describeAiCardGenerationAdapters,
  isPrivateGeneratedImageAddress
} from "../scripts/ai-card-generator.mjs";
import { buildDefaultAiFlowAdminConfigs } from "./aiFlowConfig";

const cardRequest = {
  sender: "Manny",
  recipient: "Sara",
  relationship: "friend",
  occasion: "birthday",
  tone: "warm",
  style: "botanical",
  language: "English",
  personal_note: "She loves morning hikes.",
  memory_notes: ["She keeps a fern by the kitchen window."],
  aiFlowConfig: buildDefaultAiFlowAdminConfigs()
};

const cloudflareTextModel = "@cf/meta/llama-3.1-8b-instruct-fast";
const runComfyImageModel = "blackforestlabs/flux-2/dev/text-to-image";

function runComfyAiFlowConfig() {
  return buildDefaultAiFlowAdminConfigs().map((config) => {
    if (config.flowId === "card-copy") {
      return {
        ...config,
        primaryAdapterId: "cloudflare-workers-ai-chat",
        fallbackAdapterId: "cloudflare-workers-ai-chat",
        model: cloudflareTextModel,
        liveProviderCallsEnabled: true
      };
    }
    if (config.flowId === "card-image") {
      return {
        ...config,
        primaryAdapterId: "runcomfy-model-api-image",
        fallbackAdapterId: "runcomfy-model-api-image",
        model: runComfyImageModel,
        liveProviderCallsEnabled: true
      };
    }
    return config;
  });
}

function localAiFlowConfig() {
  return buildDefaultAiFlowAdminConfigs().map((config) => {
    if (config.flowId === "card-copy") {
      return {
        ...config,
        primaryAdapterId: "local-openai-compatible-chat",
        fallbackAdapterId: "local-openai-compatible-chat",
        model: "local-qwen-card-copy",
        liveProviderCallsEnabled: true
      };
    }
    if (config.flowId === "card-image") {
      return {
        ...config,
        primaryAdapterId: "local-comfyui-api-image",
        fallbackAdapterId: "local-comfyui-api-image",
        model: "DreamShaper_8_pruned.safetensors",
        renderingMode: "",
        workflowId: "",
        workflowPath: "",
        workflowJson: "",
        workflowInputsJson: "",
        liveProviderCallsEnabled: true
      };
    }
    return config;
  });
}

function aiFlowConfigFor(overrides: Array<Record<string, unknown>>) {
  return buildDefaultAiFlowAdminConfigs().map((config) => ({
    ...config,
    ...(overrides.find((override) => override.flowId === config.flowId) ?? {})
  }));
}

function cloudflareTextAiFlowConfig(overrides: Record<string, unknown> = {}) {
  return aiFlowConfigFor([
    {
      flowId: "card-copy",
      primaryAdapterId: "cloudflare-workers-ai-chat",
      fallbackAdapterId: "cloudflare-workers-ai-chat",
      model: cloudflareTextModel,
      liveProviderCallsEnabled: true,
      ...overrides
    }
  ]);
}

function cloudflareImageAiFlowConfig(overrides: Record<string, unknown> = {}) {
  return aiFlowConfigFor([
    {
      flowId: "card-copy",
      primaryAdapterId: "cloudflare-workers-ai-chat",
      fallbackAdapterId: "cloudflare-workers-ai-chat",
      model: cloudflareTextModel,
      liveProviderCallsEnabled: true
    },
    {
      flowId: "card-image",
      primaryAdapterId: "cloudflare-workers-ai-image",
      fallbackAdapterId: "cloudflare-workers-ai-image",
      model: "@cf/bytedance/stable-diffusion-xl-lightning",
      renderingMode: "",
      workflowId: "",
      workflowPath: "",
      workflowJson: "",
      workflowInputsJson: "",
      liveProviderCallsEnabled: true,
      ...overrides
    }
  ]);
}

function imageProviderAiFlowConfig(
  adapterId: string,
  model: string,
  overrides: Record<string, unknown> = {}
) {
  return aiFlowConfigFor([
    {
      flowId: "card-copy",
      primaryAdapterId: "cloudflare-workers-ai-chat",
      fallbackAdapterId: "cloudflare-workers-ai-chat",
      model: cloudflareTextModel,
      liveProviderCallsEnabled: true
    },
    {
      flowId: "card-image",
      primaryAdapterId: adapterId,
      fallbackAdapterId: adapterId,
      model,
      renderingMode: "",
      workflowId: "",
      workflowPath: "",
      workflowJson: "",
      workflowInputsJson: "",
      liveProviderCallsEnabled: true,
      ...overrides
    }
  ]);
}

const cardCopyResponse = {
  panels: [
    {
      id: "front",
      headline: "Happy Birthday Sara",
      body: "Wishing you a day full of green trails and good coffee.",
      art_direction: "Botanical watercolor cover.",
      image_prompt:
        "A premium 5x7 vertical greeting card front design for a warm botanical birthday. Soft fern fronds, morning sunlight, tiny trail wildflowers, warm cream paper texture, deep green accents, elegant open space for app-added typography, refined print-ready stationery composition, no readable text, no logos, no watermark.",
      image_negative_prompt:
        "readable text, misspelled text, logo, watermark, folded card mockup, tabletop scene, people, face, portrait"
    },
    {
      id: "inside-left",
      headline: "A little sunshine",
      body: "May the morning feel bright and unhurried.",
      art_direction: "Soft fern border.",
      image_prompt:
        "A soft 5x7 vertical greeting card inside-left panel with a delicate fern border, pale cream background, subtle watercolor texture, wide blank center area for app-added note text, calm refined stationery design, no readable text, no logos, no watermark.",
      image_negative_prompt:
        "readable text, misspelled text, logo, watermark, folded card mockup, tabletop scene, people, face, portrait"
    },
    {
      id: "inside-right",
      headline: "From Manny",
      body: "I hope this year brings more hikes, more laughs, and more tiny wonders.",
      art_direction: "Readable message panel.",
      image_prompt:
        "A clean 5x7 vertical greeting card inside-right message panel with warm ivory background, tiny fern sprigs in the corners, subtle trail-line ornament near the bottom, generous blank writing area for app-added message text, no readable text, no logos, no watermark.",
      image_negative_prompt:
        "readable text, misspelled text, logo, watermark, folded card mockup, tabletop scene, people, face, portrait"
    },
    {
      id: "back",
      headline: "CustomCard",
      body: "Made with CustomCard. Printed locally.",
      art_direction: "Minimal back cover.",
      image_prompt:
        "A minimal 5x7 vertical greeting card back cover design with a warm cream background, small fern sprig near the lower edge, mostly negative space, refined coordinating stationery style, no readable text, no logos, no watermark.",
      image_negative_prompt:
        "readable text, misspelled text, logo, watermark, folded card mockup, tabletop scene, people, face, portrait"
    }
  ],
  memory_citations: ["She keeps a fern by the kitchen window."]
};

const aquariumLooseResponse = {
  theme_guide:
    "Aquatic ritual quietness: refined birthday stationery for a freshwater aquarium keeper, focused on plant care, tiny fish movement, and calm tank light.",
  front: {
    headline: "Happy Birthday, Nina",
    body: "For a year with clear water, small wonders, and the quiet joy of tending life in motion.",
    visual_cue:
      "Single Java fern leaf floating in soft aquarium light, cool green-gray palette, clean lower text-safe area.",
    image_prompt:
      "Premium 5x7 vertical flat print panel, close-up Java fern leaf floating in still freshwater aquarium light, faint tiny fish silhouettes, cool green gray palette, clean lower text-safe area, no readable text, no people, no hands, no logos."
  },
  "inside-left": {
    headline: "The calm you notice",
    body: "You have a way of seeing the little changes that make a whole aquarium feel alive.",
    visual_cue:
      "Light interior panel with tiny neon tetras near the lower edge and a quiet center text-safe area.",
    image_prompt:
      "Premium 5x7 vertical inside-left panel, tiny neon tetras along lower edge, aquatic plant corner, quiet center text-safe area, no readable text."
  },
  "inside-right": {
    headline: "Wishing you small wonders",
    body: "I hope this birthday brings more peaceful rituals, healthy plants, and bright little moments that feel completely yours.",
    visual_cue:
      "Matching light aquarium interior with Anubias leaves in one corner and generous open message space.",
    image_prompt:
      "Premium 5x7 vertical inside-right panel, Anubias leaves in upper corner, soft aquarium glow, generous open text-safe area, no readable text."
  },
  back: {
    headline: "For the little wonders",
    body: "A quiet birthday note for Nina.",
    visual_cue: "Mostly negative space with one small water-droplet and aquatic leaf mark near the bottom.",
    image_prompt:
      "Premium 5x7 vertical back panel, mostly negative space, tiny aquatic leaf and water droplet mark, no readable text."
  },
  image_negative_prompt:
    "readable text, fake text, letters, people, face, portrait, hands, folded card mockup, physical card mockup, tabletop scene, product photo"
};

describe("AI card generator service", () => {
  it("keeps Provider Adapter transports behind explicit generation adapters", () => {
    expect(describeAiCardGenerationAdapters()).toEqual({
      text: [
        "anthropic-messages-chat",
        "cloudflare-workers-ai-chat",
        "deepseek-chat",
        "fireworks-chat",
        "google-gemini-chat",
        "groq-chat",
        "huggingface-chat",
        "local-openai-compatible-chat",
        "mistral-chat",
        "openai-responses-chat",
        "perplexity-sonar-chat",
        "self-hosted-openai-compatible-chat",
        "together-chat",
        "xai-chat"
      ],
      image: [
        "cloudflare-workers-ai-image",
        "deepai-text2img-image",
        "google-gemini-image",
        "huggingface-image",
        "local-comfyui-api-image",
        "openai-images",
        "runcomfy-model-api-image"
      ]
    });
  });

  it("only honors request aiFlowConfig overrides when the request context is trusted", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token"
      },
      fetchImpl,
      aiFlowAdminConfig: cloudflareTextAiFlowConfig()
    });
    const body = {
      ...cardRequest,
      aiFlowConfig: [
        {
          flowId: "card-copy",
          primaryAdapterId: "huggingface-chat",
          liveProviderCallsEnabled: false
        }
      ]
    };

    const untrustedResult = await service.generateCard(body, {
      rateKey: "test-untrusted-ai-flow-config",
      trustRequestAiFlowConfig: false
    });
    const trustedResult = await service.generateCard(body, {
      rateKey: "test-trusted-ai-flow-config",
      trustRequestAiFlowConfig: true
    });

    expect(untrustedResult.statusCode).toBe(200);
    expect(untrustedResult.payload).toMatchObject({
      ai_flow: {
        card_copy: expect.objectContaining({
          adapter_id: "cloudflare-workers-ai-chat"
        })
      }
    });
    expect(trustedResult.statusCode).toBe(503);
    expect(trustedResult.payload).toMatchObject({
      ai_flow: {
        card_copy: expect.objectContaining({
          adapter_id: "",
          provider_failure: expect.stringContaining("disabled")
        })
      }
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("can generate a full card through localhost-only LLM and ComfyUI adapters", async () => {
    let imageIndex = 0;
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = String(url);
      if (requestUrl === "http://127.0.0.1:1234/v1/chat/completions") {
        const body = JSON.parse(String(init?.body));
        expect(body.model).toBe("local-qwen-card-copy");
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl === "http://127.0.0.1:8188/prompt") {
        imageIndex += 1;
        const body = JSON.parse(String(init?.body));
        expect(body.prompt["1"].inputs.ckpt_name).toBe("DreamShaper_8_pruned.safetensors");
        expect(body.prompt["5"].inputs.steps).toBe(4);
        return new Response(JSON.stringify({ prompt_id: `local-comfy-${imageIndex}` }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl.includes("http://127.0.0.1:8188/history/local-comfy-")) {
        const panelNumber = requestUrl.match(/local-comfy-(\d+)/)?.[1] ?? "0";
        return new Response(
          JSON.stringify({
            [`local-comfy-${panelNumber}`]: {
              status: { completed: true },
              outputs: {
                "7": { images: [{ filename: `panel-${panelNumber}.png`, subfolder: "", type: "output" }] }
              }
            }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (requestUrl.startsWith("http://127.0.0.1:8188/view?")) {
        return new Response(new Uint8Array([9, 8, 7, imageIndex]), {
          status: 200,
          headers: { "content-type": "image/png" }
        });
      }
      throw new Error(`Unexpected fetch ${requestUrl}`);
    });
    const service = createAiCardGenerationService({
      env: {
        CUSTOMCARD_LOCAL_LLM_BASE_URL: "http://127.0.0.1:1234/v1",
        CUSTOMCARD_COMFYUI_URL: "http://127.0.0.1:8188"
      },
      fetchImpl,
      aiFlowAdminConfig: localAiFlowConfig().map((config) =>
        config.flowId === "card-image"
          ? {
              ...config,
              workflowInputsJson: JSON.stringify({
                steps: 4,
                timeout_ms: 10000
              })
            }
          : config
      )
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-local-ai-card" });
    const payload = result.payload as {
      images: Array<{ image_url: string; width: number; height: number }>;
      ai_flow: {
        card_copy: { adapter_id: string; model: string };
        card_image: { adapter_id: string; model: string };
      };
    };

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(13);
    expect(payload.ai_flow.card_copy).toMatchObject({
      adapter_id: "local-openai-compatible-chat",
      model: "local-qwen-card-copy"
    });
    expect(payload.ai_flow.card_image).toMatchObject({
      adapter_id: "local-comfyui-api-image",
      model: "DreamShaper_8_pruned.safetensors"
    });
    expect(payload.images).toHaveLength(4);
    expect(payload.images.every((image) => image.image_url.startsWith("data:image/png;base64,"))).toBe(true);
    expect(payload.images.every((image) => image.width === 960 && image.height === 1344)).toBe(true);
  });

  it("uses the service-owned local LLM request timeout for OpenAI-compatible planner calls", async () => {
    const localProviderFetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit, timeoutOptions?: { timeoutLabel?: string; timeoutMs?: number }) => {
      const body = JSON.parse(String(init?.body));
      const userPrompt = JSON.parse(body.messages[1].content);

      expect(timeoutOptions).toMatchObject({
        timeoutLabel: "Local LLM chat completion request",
        timeoutMs: 1200000
      });
      expect(body.max_tokens).toBe(4096);
      expect(body.response_format).toBeUndefined();
      expect(userPrompt.task).toContain("The LLM owns the creative concept");
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });
    const fetchImpl = Object.assign(
      vi.fn(async () => {
        throw new Error("Unexpected generic fetch for local planner");
      }),
      { localProviderFetch }
    );
    const service = createAiCardGenerationService({
      env: {
        CUSTOMCARD_LOCAL_LLM_BASE_URL: "http://127.0.0.1:1234/v1",
        CUSTOMCARD_LOCAL_LLM_REQUEST_TIMEOUT_MS: "123456"
      },
      fetchImpl,
      aiFlowAdminConfig: buildDefaultAiFlowAdminConfigs().map((config) => {
        if (config.flowId === "card-copy") {
          return {
            ...config,
            primaryAdapterId: "local-openai-compatible-chat",
            fallbackAdapterId: "",
            model: "koboldcpp/gemma-4-31B-it-Q4_K_M",
            liveProviderCallsEnabled: true,
            maxTokens: 4096
          };
        }
        if (config.flowId === "card-image") return { ...config, liveProviderCallsEnabled: false };
        return config;
      })
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-local-planner-timeout" });

    expect(result.statusCode, JSON.stringify(result.payload)).toBe(200);
    expect(localProviderFetch).toHaveBeenCalledTimes(1);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result.payload)).toContain("Happy Birthday Sara");
  });

  it("ignores legacy local planner env feature flags", async () => {
    const localProviderFetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = String(url);
      if (requestUrl === "http://127.0.0.1:5013/v1/chat/completions") {
        const body = JSON.parse(String(init?.body));
        expect(body.model).toBe("koboldcpp/gemma-4-31B-it-Q4_K_M");
        expect(body.response_format).toBeUndefined();
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      throw new Error(`Unexpected local provider request: ${requestUrl}`);
    });
    const fetchImpl = Object.assign(
      vi.fn(async () => {
        throw new Error("Unexpected generic fetch for local planner");
      }),
      { localProviderFetch }
    );
    const service = createAiCardGenerationService({
      env: {
        CUSTOMCARD_LOCAL_LLM_BASE_URL: "http://127.0.0.1:5013/v1",
        CUSTOMCARD_LOCAL_LLM_REQUIRE_MODEL_MATCH: "true",
        CUSTOMCARD_LOCAL_LLM_STRICT_RESPONSE_FORMAT: "true"
      },
      fetchImpl,
      aiFlowAdminConfig: buildDefaultAiFlowAdminConfigs().map((config) => {
        if (config.flowId === "card-copy") {
          return {
            ...config,
            primaryAdapterId: "local-openai-compatible-chat",
            fallbackAdapterId: "",
            model: "koboldcpp/gemma-4-31B-it-Q4_K_M",
            liveProviderCallsEnabled: true
          };
        }
        if (config.flowId === "card-image") return { ...config, liveProviderCallsEnabled: false };
        return config;
      })
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-local-planner-env-flags" });

    expect(result.statusCode, JSON.stringify(result.payload)).toBe(200);
    expect(localProviderFetch).toHaveBeenCalledTimes(1);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result.payload)).toContain("Happy Birthday Sara");
  });

  it("blocks small local planners before production-text Comfy generation", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("Production planner gate should run before provider calls");
    });
    const service = createAiCardGenerationService({
      env: {
        CUSTOMCARD_LOCAL_LLM_BASE_URL: "http://127.0.0.1:1234/v1",
        CUSTOMCARD_COMFYUI_URL: "http://127.0.0.1:8188"
      },
      fetchImpl,
      aiFlowAdminConfig: localAiFlowConfig().map((config) => {
        if (config.flowId === "card-copy") {
          return { ...config, contextWindowTokens: 8192, maxTokens: 4096 };
        }
        if (config.flowId === "card-image") {
          return {
            ...config,
            renderingMode: "final-text-composited",
            workflowId: "customcard-production-text-overlay"
          };
        }
        return config;
      })
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-small-production-planner-blocked" });

    expect(result.statusCode).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.payload).toMatchObject({
      status: "provider-unavailable",
      production_text_service: expect.objectContaining({
        classification: "smoke-only",
        runAllowed: false,
        creativeContract: "full-production-card-copy-json"
      })
    });
    expect(JSON.stringify(result.payload)).toContain("production-suitable planner");
    expect(JSON.stringify(result.payload)).toContain("local-qwen-card-copy");
  });

  it("passes trusted local Comfy workflow templates, ids, and input metadata from worker env", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "customcard-comfy-workflow-"));
    const workflowPath = join(tempDir, "workflow.json");
    writeFileSync(
      workflowPath,
      JSON.stringify({
        "10": {
          class_type: "CustomCardWorkflowInput",
          inputs: {
            workflow_id: "{{workflow_id}}",
            prompt: "{{prompt}}",
            negative: "{{negative_prompt}}",
            panel_id: "{{panel_id}}",
            seed: "{{seed}}",
            width: "{{width}}",
            height: "{{height}}",
            headline_text: "{{headline_text}}",
            body_text: "{{body_text}}",
            headline_font_size: "{{headline_font_size}}",
            body_font_size: "{{body_font_size}}",
            text_alignment: "{{text_alignment}}",
            headline_box_x: "{{headline_box_x}}",
            headline_box_y: "{{headline_box_y}}",
            headline_box_width: "{{headline_box_width}}",
            headline_box_height: "{{headline_box_height}}",
            body_box_x: "{{body_box_x}}",
            body_box_y: "{{body_box_y}}",
            body_box_width: "{{body_box_width}}",
            body_box_height: "{{body_box_height}}",
            min_font_size: "{{min_font_size}}"
          }
        },
        "20": {
          class_type: "SaveImage",
          inputs: {
            images: ["10", 0],
            filename_prefix: "customcard-{{panel_id}}"
          }
        }
      })
    );

    try {
      let imageIndex = 0;
      const comfyPromptBodies: Array<Record<string, any>> = [];
      const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
        const requestUrl = String(url);
        if (requestUrl === "http://127.0.0.1:1234/v1/chat/completions") {
          return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }
        if (requestUrl === "http://127.0.0.1:8188/prompt") {
          imageIndex += 1;
          const body = JSON.parse(String(init?.body));
          comfyPromptBodies.push(body);
          expect(body.prompt["10"].inputs.workflow_id).toBe("customcard-production-text-overlay");
          expect(body.prompt["10"].inputs.panel_id).toMatch(/front|inside-left|inside-right|back/);
          expect(typeof body.prompt["10"].inputs.seed).toBe("number");
          expect(body.prompt["10"].inputs.width).toBe(640);
          expect(body.prompt["10"].inputs.height).toBe(896);
          expect(body.prompt["20"].inputs.filename_prefix).toMatch(/^customcard-/);
          expect(body.extra_data.customcard).toMatchObject({
            workflow_id: "customcard-production-text-overlay",
            inputs: {
              workflow_id: "customcard-production-text-overlay"
            }
          });
          return new Response(JSON.stringify({ prompt_id: `custom-workflow-${imageIndex}` }), {
            status: 200,
            headers: { "content-type": "application/json" }
          });
        }
        if (requestUrl.includes("http://127.0.0.1:8188/history/custom-workflow-")) {
          const panelNumber = requestUrl.match(/custom-workflow-(\d+)/)?.[1] ?? "0";
          return new Response(
            JSON.stringify({
              [`custom-workflow-${panelNumber}`]: {
                status: { completed: true },
                outputs: {
                  "20": { images: [{ filename: `custom-panel-${panelNumber}.png`, subfolder: "", type: "output" }] }
                }
              }
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }
        if (requestUrl.startsWith("http://127.0.0.1:8188/view?")) {
          return new Response(new Uint8Array([9, 8, 7, imageIndex]), {
            status: 200,
            headers: { "content-type": "image/png" }
          });
        }
        throw new Error(`Unexpected fetch ${requestUrl}`);
      });
      const service = createAiCardGenerationService({
        env: {
          CUSTOMCARD_LOCAL_LLM_BASE_URL: "http://127.0.0.1:1234/v1",
          CUSTOMCARD_COMFYUI_URL: "http://127.0.0.1:8188"
        },
        fetchImpl,
        aiFlowAdminConfig: localAiFlowConfig().map((config) => {
          if (config.flowId === "card-copy") {
            return {
              ...config,
              model: "koboldcpp/gemma-4-31B-it-Q4_K_M",
              contextWindowTokens: 8192,
              maxTokens: 4096
            };
          }
          if (config.flowId === "card-image") {
            return {
              ...config,
              renderingMode: "final-text-composited",
              workflowId: "customcard-production-text-overlay",
              workflowPath,
              workflowInputsJson: JSON.stringify({
                width: 640,
                height: 896,
                timeout_ms: 10000,
                workflow_id: "{{workflow_id}}",
                panel_id: "{{panel_id}}",
                seed: "{{seed}}"
              })
            };
          }
          return config;
        })
      });

      const result = await service.generateCard(cardRequest, { rateKey: "test-local-comfy-workflow" });

      expect(result.statusCode).toBe(200);
      expect(fetchImpl).toHaveBeenCalledWith("http://127.0.0.1:8188/prompt", expect.any(Object));
      const payload = result.payload as {
        card_copy: { panels: Array<{ id: string; headline: string; body: string }> };
        images: Array<{ rendering_mode?: string }>;
        service_evidence: {
          production_text: { active: boolean; rendering_mode: string; planner: { classification: string } };
          image_prompt_quality: { passed: boolean };
          production_recommendation: string;
        };
      };
      expect(comfyPromptBodies).toHaveLength(4);
      for (const body of comfyPromptBodies) {
        const panelId = body.prompt["10"].inputs.panel_id;
        const panelCopy = payload.card_copy.panels.find((panel) => panel.id === panelId);
        const expectedHeadline = panelId === "back" ? "" : panelCopy?.headline;
        const expectedBody = panelId === "back" ? "" : panelCopy?.body;
        expect(body.prompt["10"].inputs.headline_text).toBe(expectedHeadline);
        expect(body.prompt["10"].inputs.body_text).toBe(expectedBody);
        expect(typeof body.prompt["10"].inputs.headline_font_size).toBe("number");
        expect(typeof body.prompt["10"].inputs.body_font_size).toBe("number");
        expect(["left", "center", "right"]).toContain(body.prompt["10"].inputs.text_alignment);
        expect(body.prompt["10"].inputs.headline_box_width).toBeGreaterThan(0);
        expect(body.prompt["10"].inputs.headline_box_height).toBeGreaterThan(0);
        expect(body.prompt["10"].inputs.body_box_width).toBeGreaterThan(0);
        expect(body.prompt["10"].inputs.body_box_height).toBeGreaterThan(0);
        expect(body.prompt["10"].inputs.min_font_size).toBeGreaterThan(0);
        expect(body.extra_data.customcard.inputs).toMatchObject({
          headline_text: expectedHeadline,
          body_text: expectedBody,
          headline_box: {
            width: expect.any(Number),
            height: expect.any(Number)
          },
          body_box: {
            width: expect.any(Number),
            height: expect.any(Number)
          }
        });
      }
      expect(result.payload).toMatchObject({
        ai_flow: {
          card_image: {
            adapter_id: "local-comfyui-api-image"
          }
        }
      });
      expect(payload.images.every((image) => image.rendering_mode === "final-text-composited")).toBe(true);
      expect(payload.service_evidence.production_text).toMatchObject({
        active: true,
        rendering_mode: "final-text-composited",
        planner: {
          classification: "production-suitable"
        }
      });
      expect(payload.service_evidence.image_prompt_quality.passed).toBe(true);
      expect(payload.service_evidence.production_recommendation).toBe("requires-review-before-promotion");
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("uses Cloudflare JSON Mode for card copy without returning secrets", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          result: { response: cardCopyResponse }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
      },
      fetchImpl,
      aiFlowAdminConfig: cloudflareTextAiFlowConfig()
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-card" });
    const firstCall = fetchImpl.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit?];
    const requestBody = JSON.parse(String(firstCall[1]?.body));
    const userPrompt = JSON.parse(requestBody.messages[1].content);

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(firstCall[0])).toContain("/ai/v1/chat/completions");
    expect(requestBody.model).toBe(cloudflareTextModel);
    expect(requestBody.max_tokens).toBe(4096);
    expect(requestBody.messages[0].content).toContain("theme, layout, and copy plan");
    expect(userPrompt.task).toContain("The LLM owns the creative concept");
    expect(userPrompt.section_order).toEqual(
      expect.arrayContaining([
        "Choose one cohesive theme_guide from the occasion, personal_note, style, and approved memory_notes before writing panels; do not copy a fixture, request label, or generic subject category as the final theme.",
        "Name a specific creative concept that could only belong to this request, then make each panel a distinct expression of that concept."
      ])
    );
    expect(userPrompt.layout_requirements).toContain(
      "The theme_guide must be LLM-decided from the user's request. For interests such as aquarium lover, koi fish lover, or dog lover, create a more specific visual genre than the literal noun alone."
    );
    expect(userPrompt.copy_requirements).toEqual(
      expect.arrayContaining([
        "Preserve exact concrete facts from personal_note and memory_notes in final copy: names, relationships, dates, places, product names, CTA nouns, and practical support items. Do not replace literal requested items such as meals, rides, calls, silence, QR, dates, names, or business terms with generic summaries.",
        "inside-right body should be 180-420 characters and carry the main personal message plus a natural sign-off when appropriate.",
        "Write final card copy only. Never write meta-copy about the requested tone, style, design language, prompt, theme instructions, CustomCard requirements, or what the card should feel like."
      ])
    );
    expect(userPrompt.story_playbooks).toEqual(
      expect.arrayContaining([
        "High-memory get-well or recovery cards: weave only approved inside jokes into tender support, avoid medical advice, diagnosis, miracle-cure language, pity, or clownish meme overload.",
        "B2B lifecycle or warranty cards: preserve exact customer, business, date, product, and CTA facts; make the CTA clear but calm; never invent discounts, legal terms, shipment status, or order/payment claims.",
        "Wedding or distant-family cards: be respectful and warm without overclaiming closeness; use a short non-denominational blessing unless a religion is explicitly specified, and reserve handwriting space when requested."
      ])
    );
    expect(userPrompt.layout_requirements).toEqual(
      expect.arrayContaining([
        "front and back should visually match each other; the front carries the strongest hero idea and the back repeats a small quiet echo.",
        "inside-left and inside-right should visually match each other and feel like the opened interior spread."
      ])
    );
    expect(userPrompt.layout_requirements).toEqual(
      expect.arrayContaining([
        "Prefer one of these composition archetypes per panel: cinematic single-object cover, expressive line-art cover, edge-led gallery illustration, lower-corner object cluster, or open back cover with a visible coordinated mark and border echo.",
        "Do not use all-over repeating motif patterns unless the user explicitly requests wallpaper, wrapping paper, or dense pattern.",
        "Artwork should read as flat editorial stationery: clean print surfaces, integrated negative space, and restrained edge/corner ornament rather than ornate central decoration.",
        "Keep the text-safe field simple, low-detail, and integrated into the artwork; do not surround it with a central medallion, halo, ornate frame, or decorative ring.",
        "visual_cue is binding for the image prompt: make front, inside-left, inside-right, and back visually distinct while still coordinated.",
        "text_layout controls app-rendered typography only. Choose zones that match the clean text-safe area in visual_cue; never ask the image model to draw the text."
      ])
    );
    expect(userPrompt.image_prompt_requirements).toEqual(
      expect.arrayContaining([
        "Text-safe areas must stay plain and low-detail: no central medallion, no halo, no ornate frame around copy, no rays behind copy, and no decorative ring under typography.",
        "For B2B CTA cards, reserve a clean app-overlay area for any QR code or account-manager CTA; do not ask the image model to draw QR codes, labels, or interface elements.",
        "For cards requesting handwriting space, reserve an open note area but do not ask the image model to create handwriting, signatures, script, or fake personal notes."
      ])
    );
    expect(userPrompt.safety_requirements).toContain(
      "Do not include fake glyph-like marks, pseudo-calligraphy, decorative micro-lettering, or signature-like strokes as ornament."
    );
    expect(requestBody.response_format).toMatchObject({
      type: "json_schema",
      json_schema: {
            required: ["theme_guide", "panels", "memory_citations"],
            properties: {
              theme_guide: {
                required: ["theme_title", "palette", "motifs", "border_style", "front_back_pairing", "interior_pairing"]
              },
              panels: {
                minItems: 4,
                maxItems: 4,
                items: {
                  required: ["id", "headline", "body", "art_direction", "visual_cue", "text_layout", "image_prompt", "image_negative_prompt"]
                }
              }
            }
          }
    });
    expect(JSON.stringify(result.payload)).toContain("text_layout");
    expect(JSON.stringify(result.payload)).toContain("visual_cue");
    expect(JSON.stringify(result.payload)).toContain("Happy Birthday Sara");
    expect(JSON.stringify(result.payload)).not.toContain("test_text_token");
  });

  it("preserves loose LLM-decided recipient-interest output instead of replacing it with generic fallbacks", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ result: { response: aquariumLooseResponse } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token"
      },
      fetchImpl,
      aiFlowAdminConfig: buildDefaultAiFlowAdminConfigs().map((config) =>
        config.flowId === "card-copy"
          ? {
              ...config,
              fallbackAdapterId: "cloudflare-workers-ai-chat",
              fallbackQueueEnabled: false,
              liveProviderCallsEnabled: true,
              model: cloudflareTextModel
            }
          : config.flowId === "card-image"
            ? { ...config, liveProviderCallsEnabled: false }
            : config
      )
    });

    const result = await service.generateCard(
      {
        ...cardRequest,
        sender: "Riley",
        recipient: "Nina",
        occasion: "birthday",
        style: "premium folded greeting card for an aquarium lover",
        personal_note: "Make a birthday card for Nina, who relaxes by tending her freshwater aquarium.",
        memory_notes: ["Nina loves freshwater aquariums, aquatic plants, tiny fish, and calm tank care."],
        must_include: ["Nina", "birthday", "aquarium"]
      },
      { rateKey: "test-loose-aquarium-output" }
    );
    const payload = result.payload as {
      card_copy: { theme_guide: { theme_title: string }; panels: Array<{ id: string; headline: string; image_prompt: string }> };
    };

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(payload.card_copy.theme_guide.theme_title).toContain("Aquatic ritual quietness");
    expect(payload.card_copy.panels[0].headline).toBe("Happy Birthday, Nina");
    expect(payload.card_copy.panels[0].image_prompt).toContain("soft aquarium light");
    expect(JSON.stringify(payload.card_copy)).not.toContain("Morning Garden");
  });

  it("repairs ornate medallion and glyph-like image prompts before image work", async () => {
    const ornateResponse = {
      ...cardCopyResponse,
      panels: cardCopyResponse.panels.map((panel) =>
        panel.id === "front"
          ? {
              ...panel,
              visual_cue:
                "A single fern silhouette near the lower edge with a quiet central text-safe field and warm cream negative space.",
              image_prompt:
                "Premium 5x7 vertical front panel with a gold central medallion around copy, an ornate frame around typography, rays behind the message field, and fake glyph-like marks in the center."
            }
          : panel
      )
    };
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ result: { response: ornateResponse } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token"
      },
      fetchImpl,
      aiFlowAdminConfig: buildDefaultAiFlowAdminConfigs().map((config) =>
        config.flowId === "card-copy"
          ? {
              ...config,
              fallbackAdapterId: "cloudflare-workers-ai-chat",
              fallbackQueueEnabled: false,
              liveProviderCallsEnabled: true,
              model: cloudflareTextModel
            }
          : config.flowId === "card-image"
            ? { ...config, liveProviderCallsEnabled: false }
            : config
      )
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-ornate-medallion-repair" });
    const payload = result.payload as {
      card_copy: { panels: Array<{ id: string; image_prompt: string; image_negative_prompt: string }> };
    };
    const front = payload.card_copy.panels.find((panel) => panel.id === "front");

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(front?.image_prompt).toMatch(/flat editorial stationery/i);
    expect(front?.image_prompt).toMatch(/no central medallion/i);
    expect(front?.image_prompt).toMatch(/no ornate frame around copy/i);
    expect(front?.image_prompt).not.toContain("gold central medallion around copy");
    expect(front?.image_prompt).not.toContain("fake glyph-like marks in the center");
    expect(front?.image_negative_prompt).toContain("central medallion");
    expect(front?.image_negative_prompt).toContain("ornate frame around copy");
    expect(front?.image_negative_prompt).toContain("glyph-like marks");
    expect(front?.image_negative_prompt).toContain("notebook");
    expect(front?.image_negative_prompt).toContain("manuscript");
    expect(front?.image_negative_prompt).toContain("religious calligraphy");
    expect(front?.image_negative_prompt).toContain("ink scribbles");
  });

  it("retries aquarium benchmark copy before image work when required request facts are missing", async () => {
    const weakAquariumResponse = {
      theme_guide: {
        theme_title: "Aquatic ritual quietness",
        palette: ["soft aquarium blue", "freshwater green", "warm paper"],
        motifs: ["aquarium glass", "tiny fish", "aquatic plants"],
        border_style: "thin ripple border",
        front_back_pairing: "front and back share one tiny fish mark",
        interior_pairing: "interiors share quiet aquarium light"
      },
      panels: cardCopyResponse.panels.map((panel) => ({
        ...panel,
        body: "A small birthday note.",
        image_prompt:
          "Premium 5x7 vertical aquarium birthday stationery for Nina with soft aquarium light, tiny fish detail, freshwater plant motif, quiet text-safe space, no readable text."
      })),
      memory_citations: ["Nina loves freshwater aquariums."]
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: { response: weakAquariumResponse } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: { response: aquariumLooseResponse } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token"
      },
      fetchImpl,
      aiFlowAdminConfig: buildDefaultAiFlowAdminConfigs().map((config) =>
        config.flowId === "card-image" ? { ...config, liveProviderCallsEnabled: false } : config
      )
    });

    const result = await service.generateCard(
      {
        ...cardRequest,
        sender: "Riley",
        recipient: "Nina",
        occasion: "birthday",
        style: "premium folded greeting card for an aquarium lover",
        personal_note: "Make a birthday card for Nina, who relaxes by tending her freshwater aquarium.",
        memory_notes: ["Nina loves freshwater aquariums, aquatic plants, tiny fish, and calm tank care."],
        must_include: ["Nina", "birthday", "aquarium"],
        must_avoid: ["green trails", "good coffee", "generic balloons"]
      },
      { rateKey: "test-aquarium-repair-facts" }
    );
    const copyText = JSON.stringify((result.payload as { card_copy: unknown }).card_copy);
    const requestBodies = fetchImpl.mock.calls.map((call) => JSON.parse(String((call as unknown as [RequestInfo | URL, RequestInit?])[1]?.body)));
    const retryPrompt = JSON.parse(requestBodies[1].messages[1].content);

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(retryPrompt.input.planner_retry.issues).toContain("Missing required term: Nina");
    expect(copyText).toContain("aquarium");
    expect(copyText).toContain("birthday");
    expect(copyText).not.toContain("green trails");
    expect(copyText).not.toContain("good coffee");
  });

  it("retries dog-lover thank-you copy instead of spending images on plant-watering drift", async () => {
    const weakDogResponse = {
      theme_guide: {
        theme_title: "Dog-neighbor harmony",
        palette: ["warm sidewalk gray", "leash blue", "soft cream"],
        motifs: ["single leash curve", "dog tag mark", "neighborly doorstep"],
        border_style: "quiet fine-rule border",
        front_back_pairing: "front and back share the dog tag mark",
        interior_pairing: "interiors share the leash curve"
      },
      panels: cardCopyResponse.panels.map((panel) => ({
        ...panel,
        body: "Thanks for helping with the plant watering.",
        image_prompt:
          "Premium 5x7 vertical dog-lover thank-you plant stationery for Morgan with one abstract leash curve, neighborly doorstep detail, quiet text-safe space, no readable text."
      })),
      memory_citations: ["Morgan loves dogs and helped while Avery was away."]
    };
    const cleanDogResponse = {
      theme_guide: "Dog-neighbor harmony: a thank-you card for Morgan built around dog-trust and neighborly care.",
      copy: {
        front_headline: "Thanks, Morgan",
        inside_left_body: "Thank you, Morgan, for helping while Avery was away in exactly the steady way a good dog-loving neighbor would.",
        inside_right_body:
          "I am grateful for the care, the noticing, and the kind of trust that makes a neighbor feel like someone a dog would choose too. With thanks, Avery.",
        back_body: "A quiet thank-you for Morgan, from Avery."
      },
      image_prompt: {
        front:
          "Premium 5x7 vertical flat print panel with an abstract dog leash curve beside a neighborly doorstep, clean lower text-safe area, no readable text.",
        inside_left:
          "Premium 5x7 vertical inside-left panel with a tiny dog-shaped shadow near the lower edge and generous center text-safe area.",
        inside_right:
          "Premium 5x7 vertical inside-right panel with a quiet sidewalk path and dog-trust motif, clean text-safe center.",
        back: "Premium 5x7 vertical back panel, mostly negative space with one small dog-tag-shaped abstract mark, no readable text."
      },
      image_negative_prompt: "readable text, fake text, letters, people, face, portrait, hands, folded card mockup"
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: { response: weakDogResponse } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: { response: cleanDogResponse } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token"
      },
      fetchImpl,
      aiFlowAdminConfig: buildDefaultAiFlowAdminConfigs().map((config) =>
        config.flowId === "card-image" ? { ...config, liveProviderCallsEnabled: false } : config
      )
    });

    const result = await service.generateCard(
      {
        ...cardRequest,
        sender: "Avery",
        recipient: "Morgan",
        occasion: "thank-you card",
        style: "premium folded greeting card for a dog lover",
        personal_note: "Thank Morgan for helping while Avery was away and for being a dog-loving neighbor.",
        memory_notes: ["Morgan loves dogs and often mentions how a good neighbor is the kind of person a dog trusts."],
        must_include: ["Morgan", "thank", "dog"],
        must_avoid: ["plant", "watering"]
      },
      { rateKey: "test-dog-repair-facts" }
    );
    const copyText = JSON.stringify((result.payload as { card_copy: unknown }).card_copy);
    const requestBodies = fetchImpl.mock.calls.map((call) => JSON.parse(String((call as unknown as [RequestInfo | URL, RequestInit?])[1]?.body)));
    const retryPrompt = JSON.parse(requestBodies[1].messages[1].content);

    expect(result.statusCode, JSON.stringify(result.payload)).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(retryPrompt.input.planner_retry.issues).toEqual(
      expect.arrayContaining(["Missing required term: Morgan", "Forbidden term present: plant"])
    );
    expect(copyText).toContain("dog");
    expect(copyText).toContain("Morgan");
    expect(copyText).not.toContain("watering the plants");
    expect(copyText).not.toContain("plants and I");
  });

  it("retries card-copy planning when required customer terms are missing before image generation", async () => {
    const weakResponse = {
      theme_guide: {
        theme_title: "Plain Thanks",
        palette: ["clean white", "warm ivory", "leaf green"],
        motifs: ["small plant mark", "fine rule", "single water drop"],
        border_style: "minimal fine-rule border",
        front_back_pairing: "front and back share one plant mark",
        interior_pairing: "inside panels share quiet borders"
      },
      panels: cardCopyResponse.panels.map((panel) => ({
        ...panel,
        headline: panel.id === "front" ? "With Thanks" : panel.headline,
        body: "Thank you for helping while I was away.",
        image_prompt: "Minimal plant thank-you stationery with clean white space, no readable text."
      })),
      memory_citations: ["Morgan loves dogs, but this citation alone must not satisfy validation."]
    };
    const dogRetryResponse = {
      theme_guide: "Dog-neighbor harmony: a thank-you card for Morgan built around dog-trust and neighborly care.",
      copy: {
        front_headline: "Thanks, Morgan",
        inside_left_body: "You helped while I was away in exactly the steady way a good dog-loving neighbor would.",
        inside_right_body:
          "I am grateful for the care, the noticing, and the kind of trust that makes a neighbor feel like someone a dog would choose too. With thanks, Avery.",
        back_body: "A quiet thank-you for Morgan, from Avery."
      },
      image_prompt: {
        front:
          "Premium 5x7 vertical flat print panel with an abstract dog leash curve beside a neighborly doorstep, clean lower text-safe area, no readable text.",
        inside_left:
          "Premium 5x7 vertical inside-left panel with a tiny dog-shaped shadow near the lower edge and generous center text-safe area.",
        inside_right:
          "Premium 5x7 vertical inside-right panel with a quiet sidewalk path and dog-trust motif, clean text-safe center.",
        back: "Premium 5x7 vertical back panel, mostly negative space with one small dog-tag-shaped abstract mark, no readable text."
      },
      image_negative_prompt: "readable text, fake text, letters, people, face, portrait, hands, folded card mockup"
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: { response: weakResponse } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: { response: dogRetryResponse } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token"
      },
      fetchImpl,
      aiFlowAdminConfig: buildDefaultAiFlowAdminConfigs().map((config) =>
        config.flowId === "card-image" ? { ...config, liveProviderCallsEnabled: false } : config
      )
    });

    const result = await service.generateCard(
      {
        ...cardRequest,
        sender: "Avery",
        recipient: "Morgan",
        occasion: "thank-you card",
        style: "premium folded greeting card for a dog lover",
        personal_note: "Thank Morgan for helping while Avery was away.",
        memory_notes: ["Morgan loves dogs and helped while Avery was away."],
        must_include: ["Morgan", "thank", "dog"]
      },
      { rateKey: "test-must-include-retry" }
    );
    const requestBodies = fetchImpl.mock.calls.map((call) => JSON.parse(String((call as unknown as [RequestInfo | URL, RequestInit?])[1]?.body)));
    const retryPrompt = JSON.parse(requestBodies[1].messages[1].content);

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(retryPrompt.input.planner_retry.issues).toEqual(
      expect.arrayContaining(["Missing required term: Morgan"])
    );
    expect(JSON.stringify(result.payload)).toContain("Dog-neighbor harmony");
    expect(JSON.stringify(result.payload)).toContain("Morgan");
  });

  it("repairs a required recipient name into visible copy when the planner leaves it only in citations", async () => {
    const response = {
      theme_guide: {
        theme_title: "Trusted neighbor thanks",
        palette: ["warm gray", "soft cream", "terracotta"],
        motifs: ["dog tag", "neighborly doorstep", "quiet leash curve"],
        border_style: "thin quiet border",
        front_back_pairing: "front and back share a dog tag mark",
        interior_pairing: "interiors share a quiet leash curve"
      },
      panels: cardCopyResponse.panels.map((panel) => ({
        ...panel,
        headline: panel.id === "front" ? "Thank You for the Quiet Watch" : panel.headline,
        body: panel.id === "front" ? "A good neighbor is the kind of person a dog trusts." : panel.body,
        image_prompt:
          "Premium 5x7 vertical dog-lover thank-you stationery with one abstract leash curve, quiet text-safe space, no readable text."
      })),
      memory_citations: ["Morgan loves dogs and helped while Avery was away."]
    };
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ result: { response } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token"
      },
      fetchImpl,
      aiFlowAdminConfig: buildDefaultAiFlowAdminConfigs().map((config) =>
        config.flowId === "card-image" ? { ...config, liveProviderCallsEnabled: false } : config
      )
    });

    const result = await service.generateCard(
      {
        ...cardRequest,
        sender: "Avery",
        recipient: "Morgan",
        occasion: "thank-you card",
        style: "premium folded greeting card for a dog lover",
        personal_note: "Thank Morgan for helping while Avery was away.",
        memory_notes: ["Morgan loves dogs and helped while Avery was away."],
        must_include: ["Morgan", "thank", "dog"]
      },
      { rateKey: "test-recipient-visible-copy-repair" }
    );

    expect(result.statusCode, JSON.stringify(result.payload)).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const payload = result.payload as { card_copy: { panels: Array<{ id: string; body: string }> } };
    const front = payload.card_copy.panels.find((panel) => panel.id === "front");
    expect(front?.body).toContain("Morgan");
  });

  it("reports length-truncated planner output as a runtime/model failure", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: "length",
              message: { content: "{\"theme_guide\":{\"theme_title\":\"unfinished koi" }
            }
          ]
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token"
      },
      fetchImpl,
      aiFlowAdminConfig: buildDefaultAiFlowAdminConfigs().map((config) =>
        config.flowId === "card-copy"
          ? {
              ...config,
              fallbackAdapterId: "cloudflare-workers-ai-chat",
              fallbackQueueEnabled: false,
              liveProviderCallsEnabled: true,
              model: cloudflareTextModel
            }
          : config.flowId === "card-image"
            ? { ...config, liveProviderCallsEnabled: false }
            : config
      )
    });

    const result = await service.generateCard(
      {
        ...cardRequest,
        sender: "Mara",
        recipient: "Uncle Ken",
        occasion: "encouragement card",
        style: "premium folded greeting card for a koi fish lover",
        personal_note: "Create an encouragement card for Uncle Ken, who loves his backyard koi pond.",
        must_include: ["Uncle Ken", "koi", "encouragement"]
      },
      { rateKey: "test-length-finish-runtime-failure" }
    );

    expect(result.statusCode).toBe(502);
    expect(JSON.stringify(result.payload)).toContain("finish_reason=length");
    expect(JSON.stringify(result.payload)).toContain("production-suitable planner");
    expect(JSON.stringify(result.payload)).toContain("8192+ context");
  });

  it("returns an explicit provider failure when card-copy provider credentials are missing", async () => {
    const fetchImpl = vi.fn();
    const service = createAiCardGenerationService({ env: {}, fetchImpl });

    const result = await service.generateCard(cardRequest, { rateKey: "test-fallback" });
    const payload = result.payload as {
      user_content_only: boolean;
      ai_flow: { card_copy: { adapter_id: string; fallback_adapter_id: string; provider_failure?: string } };
    };

    expect(result.statusCode).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      status: "provider-unavailable",
      user_content_only: false,
      fallback_queued: false,
      ai_flow: {
        card_copy: expect.objectContaining({
          adapter_id: "",
          fallback_adapter_id: "huggingface-chat",
          provider_failure: expect.stringContaining("missing")
        })
      }
    });
    expect(payload).not.toHaveProperty("card_copy");
    expect(JSON.stringify(payload)).not.toMatch(/Sara|morning hikes|She keeps a fern|Can you make it warmer/i);
  });

  it("falls back from a failed card-copy provider to the configured text fallback", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const requestUrl = String(url);
      if (requestUrl.includes("router.huggingface.co/v1/chat/completions")) {
        return new Response(JSON.stringify({ error: "credits depleted" }), {
          status: 402,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl.includes("/ai/v1/chat/completions")) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      throw new Error(`Unexpected fetch ${requestUrl}`);
    });
    const service = createAiCardGenerationService({
      env: {
        HUGGINGFACE_API_TOKEN: "test_hf_token",
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
      },
      fetchImpl,
      aiFlowAdminConfig: buildDefaultAiFlowAdminConfigs().map((config) => {
        if (config.flowId === "card-copy") {
          return {
            ...config,
            primaryAdapterId: "huggingface-chat",
            fallbackAdapterId: "cloudflare-workers-ai-chat",
            fallbackQueueEnabled: true,
            liveProviderCallsEnabled: true
          };
        }
        return config.flowId === "card-image" ? { ...config, liveProviderCallsEnabled: false } : config;
      })
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-card-copy-fallback" });
    const payload = result.payload as {
      fallback_queued: boolean;
      ai_flow: { card_copy: { adapter_id: string; primary_adapter_id: string; fallback_adapter_id: string } };
      provider_call_events: Array<{ adapter_id: string; status: string; fallback_from_adapter_id?: string; metadata?: Record<string, unknown> }>;
      card_copy: unknown;
    };

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(payload.fallback_queued).toBe(true);
    expect(payload.ai_flow.card_copy).toMatchObject({
      adapter_id: "cloudflare-workers-ai-chat",
      primary_adapter_id: "huggingface-chat",
      fallback_adapter_id: "cloudflare-workers-ai-chat"
    });
    expect(payload.provider_call_events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ adapter_id: "huggingface-chat", status: "failed" }),
        expect.objectContaining({
          adapter_id: "cloudflare-workers-ai-chat",
          status: "succeeded",
          fallback_from_adapter_id: "huggingface-chat"
        })
      ])
    );
    expect(JSON.stringify(payload.card_copy)).toContain("Happy Birthday Sara");
    expect(JSON.stringify(result.payload)).not.toMatch(/test_hf_token|test_text_token/);
  });

  it("enforces monthly text spend caps before making another provider call", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          result: { response: cardCopyResponse }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token"
      },
      fetchImpl,
      aiFlowAdminConfig: buildDefaultAiFlowAdminConfigs().map((config) =>
        config.flowId === "card-copy"
          ? {
              ...config,
              fallbackAdapterId: "cloudflare-workers-ai-chat",
              fallbackQueueEnabled: false,
              liveProviderCallsEnabled: true,
              model: cloudflareTextModel,
              monthlyBudgetCents: 12,
              perRequestBudgetCents: 12
            }
          : config
      )
    });

    const first = await service.generateCard(cardRequest, { rateKey: "test-monthly-budget", idempotencyKey: "idem-1" });
    const second = await service.generateCard(cardRequest, { rateKey: "test-monthly-budget", idempotencyKey: "idem-2" });
    const secondPayload = second.payload as {
      ai_flow: { card_copy: { provider_failure?: string } };
      ai_cost_gate: { blocked_reasons: string[]; reserved_or_spent_cents: number };
      provider_call_events: Array<{ status: string; fallback_reason?: string }>;
    };

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(503);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect((second.payload as { user_content_only: boolean }).user_content_only).toBe(false);
    expect(second.payload).not.toHaveProperty("card_copy");
    expect(secondPayload.ai_flow.card_copy.provider_failure).toContain("projected monthly spend");
    expect(secondPayload.ai_cost_gate.blocked_reasons).toContain("monthly-budget-exceeded");
    expect(secondPayload.provider_call_events).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: "blocked", fallback_reason: "monthly-budget-exceeded" })])
    );
  });

  it("counts all four image panels against rate limits before image provider calls", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/ai/v1/chat/completions")) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: { "content-type": "image/png" }
      });
    });
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "test_image_token",
      },
      fetchImpl,
      aiFlowAdminConfig: cloudflareImageAiFlowConfig({ rateLimitPerMinute: 3 })
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-image-rate-units" });
    const payload = result.payload as {
      card_copy: unknown;
      images: unknown[];
      ai_flow: { card_image: { provider_failure?: string } };
      provider_call_events: Array<{ flow_id: string; status: string; fallback_reason?: string; request_units: number }>;
    };

    expect(result.statusCode).toBe(429);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(payload.images).toEqual([]);
    expect(JSON.stringify(payload.card_copy)).toContain("Happy Birthday Sara");
    expect(JSON.stringify(payload.card_copy)).toContain("Happy Birthday Sara");
    expect(payload.ai_flow.card_image.provider_failure).toContain("rate limit 3/minute");
    expect(payload.provider_call_events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          flow_id: "card-image",
          status: "blocked",
          fallback_reason: "rate-limit-exceeded",
          request_units: 4
        })
      ])
    );
  });

  it("repairs meta provider copy into human card language before returning the payload", async () => {
    const metaCopyResponse = {
      theme_guide: {
        theme_title: "From Dream to Doctor",
        palette: ["deep navy", "white", "soft gold"],
        motifs: ["white coat", "stethoscope", "ECG line"],
        border_style: "thin gold medical stationery border",
        front_back_pairing: "front and back share the stethoscope motif",
        interior_pairing: "inside panels share quiet borders"
      },
      panels: [
        {
          id: "front",
          headline: "For my brother",
          body: "medical school graduation with a proud, emotional, premium, warm family pride, not cheesy feeling.",
          art_direction: "Medical graduation cover.",
          image_prompt: "A simple border style reserved for the recipient's name.",
          image_negative_prompt: "readable text"
        },
        {
          id: "inside-left",
          headline: "For this moment",
          body: "He is graduating med school. Design a theme called From Dream to Doctor for the card front. It should carry this approved detail: He pushed through years of exams, late nights, long shifts, and sacrifices.",
          art_direction: "Medical interior.",
          image_prompt: "A simple border style reserved for the main message.",
          image_negative_prompt: "readable text"
        },
        {
          id: "inside-right",
          headline: "From Manny",
          body: "I wanted this card to feel like proud, emotional, premium, warm family pride, not cheesy, with a design language of deep navy, white, soft gold. The heart of it is simple: The family is proud of his discipline, patience, heart, and dedication. With care, Manny.",
          art_direction: "Medical message panel.",
          image_prompt: "A quiet, polished design with a simple border style.",
          image_negative_prompt: "readable text"
        },
        {
          id: "back",
          headline: "CustomCard",
          body: "Made for my brother with CustomCard.",
          art_direction: "Medical back panel.",
          image_prompt: "A simple border style.",
          image_negative_prompt: "readable text"
        }
      ],
      memory_citations: [
        "He pushed through years of exams, late nights, long shifts, and sacrifices.",
        "The family is proud of his discipline, patience, heart, and dedication."
      ]
    };
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ result: { response: metaCopyResponse } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
      },
      fetchImpl,
      aiFlowAdminConfig: cloudflareTextAiFlowConfig()
    });

    const result = await service.generateCard(
      {
        ...cardRequest,
        recipient: "my brother",
        relationship: "brother",
        occasion: "medical school graduation",
        tone: "proud, emotional, premium, warm family pride, not cheesy",
        style: "deep navy, white, soft gold, elegant medical graduation stationery",
        personal_note: "He is graduating med school. Design a theme called From Dream to Doctor.",
        memory_notes: [
          "He pushed through years of exams, late nights, long shifts, and sacrifices.",
          "The family is proud of his discipline, patience, heart, and dedication."
        ]
      },
      { rateKey: "test-meta-copy-repair" }
    );
    const payload = result.payload as {
      card_copy: { panels: Array<{ id: string; headline: string; body: string; visual_cue?: string; text_layout?: Record<string, string>; image_prompt?: string }> };
    };
    const serializedCopy = JSON.stringify(payload.card_copy);

    expect(result.statusCode).toBe(200);
    expect(payload.card_copy.panels[0]).toMatchObject({
      headline: "From Dream to Doctor",
      body: "For every late night, long shift, and quiet sacrifice that brought you here."
    });
    expect(payload.card_copy.panels[1]).toMatchObject({
      headline: "Years In The Making"
    });
    expect(payload.card_copy.panels[2].body).toContain("patience, heart, and dedication");
    expect(payload.card_copy.panels[3]).toMatchObject({
      headline: "From Dream to Doctor"
    });
    expect(serializedCopy).not.toMatch(
      /with a .* feeling|I wanted this card to feel|design language|The heart of it is simple|approved detail|Made for .* with CustomCard|A card made with care/i
    );
    expect(JSON.stringify(result.payload)).not.toContain("test_text_token");
  });

  it("repairs third-person medical milestone copy before returning the payload", async () => {
    const medicalRegressionResponse = {
      theme_guide: {
        theme_title: "From Dream to Doctor",
        palette: ["deep navy", "white", "soft gold"],
        motifs: ["white coat", "stethoscope", "ECG line"],
        border_style: "thin gold medical stationery border",
        front_back_pairing: "front and back share the medical line motif",
        interior_pairing: "inside panels share quiet borders"
      },
      panels: [
        {
          id: "front",
          headline: "From Dream to Doctor",
          body: "For every late night, long shift, and quiet sacrifice that brought you here.",
          art_direction: "Medical cover.",
          image_prompt: "A deep navy medical graduation cover with a stethoscope and cap.",
          image_negative_prompt: "readable text"
        },
        {
          id: "inside-left",
          headline: "Congratulations, Doctor!",
          body: "He pushed through years of exams, late nights, long shifts, and sacrifices. His dedication paid off.",
          art_direction: "Medical interior.",
          image_prompt: "A border-first inside-left medical stationery panel.",
          image_negative_prompt: "readable text"
        },
        {
          id: "inside-right",
          headline: "A Journey of Discipline and Heart",
          body: "He pushed through years of exams, late nights, long shifts, and sacrifices. His dedication, patience, heart, and discipline led him here.",
          art_direction: "Medical interior.",
          image_prompt: "A border-first inside-right medical stationery panel.",
          image_negative_prompt: "readable text"
        },
        {
          id: "back",
          headline: "Congratulations, Doctor!",
          body: "With pride, love, and deep respect for the doctor you worked so hard to become.",
          art_direction: "Medical back.",
          image_prompt: "A minimal medical back panel.",
          image_negative_prompt: "readable text"
        }
      ],
      memory_citations: ["He pushed through years of exams, late nights, long shifts, and sacrifices."]
    };
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ result: { response: medicalRegressionResponse } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
      },
      fetchImpl,
      aiFlowAdminConfig: cloudflareTextAiFlowConfig()
    });

    const result = await service.generateCard(
      {
        ...cardRequest,
        recipient: "my brother",
        relationship: "brother",
        occasion: "medical school graduation",
        style: "deep navy, white, soft gold medical graduation stationery",
        memory_notes: [
          "He pushed through years of exams, late nights, long shifts, and sacrifices.",
          "The family is proud of his discipline, patience, heart, and dedication."
        ]
      },
      { rateKey: "test-medical-third-person-repair" }
    );
    const payload = result.payload as {
      card_copy: {
        panels: Array<{
          id: string;
          headline: string;
          body: string;
          visual_cue?: string;
          text_layout?: Record<string, string>;
          image_prompt?: string;
        }>;
      };
    };

    expect(payload.card_copy.panels[1]).toMatchObject({
      headline: "Years In The Making",
      body: "You kept going through exams, late nights, long shifts, and the sacrifices most people never saw. Today honors the discipline behind the white coat as much as the degree itself."
    });
    expect(payload.card_copy.panels[2].body).toContain("We are proud not only of the doctor you are becoming");
    expect(payload.card_copy.panels[3].headline).toBe("From Dream to Doctor");
    expect(payload.card_copy.panels[0].visual_cue).toContain("White doctor's coat");
    expect(payload.card_copy.panels[1].visual_cue).toContain("Quiet desk after a long hospital shift");
    expect(payload.card_copy.panels[2].visual_cue).toContain("Golden sunrise through a hospital window");
    expect(payload.card_copy.panels[3].visual_cue).toContain("stethoscope forming a subtle heart");
    expect(payload.card_copy.panels[0].text_layout).toMatchObject({ headline_zone: "upper", body_zone: "lower" });
    expect(payload.card_copy.panels[1].text_layout).toMatchObject({ alignment: "left", font_pairing: "soft-serif" });
    expect(payload.card_copy.panels[1].image_prompt).toContain("Quiet desk after a long hospital shift");
    expect(payload.card_copy.panels[2].image_prompt).toContain("Golden sunrise through a hospital window");
  });

  it("does not let a doctor memory turn a birthday card into a medical graduation card", async () => {
    const medicalBirthdayResponse = {
      theme_guide: {
        theme_title: "From Dream to Doctor",
        palette: ["deep navy", "white", "soft gold"],
        motifs: ["white coat", "stethoscope", "ECG line"],
        border_style: "thin gold medical stationery border",
        front_back_pairing: "front and back share the stethoscope motif",
        interior_pairing: "inside panels share hospital-shift cues"
      },
      panels: [
        {
          id: "front",
          headline: "Happy Birthday, Papa",
          body: "Wishing you a day as vibrant as your spirit.",
          art_direction: "Medical birthday cover.",
          visual_cue:
            "White doctor's coat hanging beside a graduation stole in soft hospital hallway sunrise light.",
          image_prompt:
            "White doctor's coat hanging beside a graduation stole in a hospital hallway with stethoscope and no readable writing.",
          image_negative_prompt: "readable text"
        },
        {
          id: "inside-left",
          headline: "Years In The Making",
          body:
            "You kept going through exams, late nights, long shifts, and the sacrifices most people never saw. Today honors the discipline behind the white coat as much as the degree itself.",
          art_direction: "Medical interior.",
          visual_cue: "Quiet desk after a long hospital shift with stethoscope and graduation cap.",
          image_prompt: "Quiet desk after a long hospital shift with stethoscope and graduation cap.",
          image_negative_prompt: "readable text"
        },
        {
          id: "inside-right",
          headline: "With So Much Pride",
          body:
            "We are proud not only of the doctor you are becoming, but of the patience, heart, and dedication that brought you here. With love, Mann.",
          art_direction: "Medical message panel.",
          visual_cue: "Golden sunrise through a hospital window and white coat draped over a chair.",
          image_prompt: "Golden sunrise through a hospital window and white coat draped over a chair.",
          image_negative_prompt: "readable text"
        },
        {
          id: "back",
          headline: "From Dream to Doctor",
          body: "With pride for the doctor you worked so hard to become.",
          art_direction: "Medical back.",
          visual_cue: "Small stethoscope and graduation cap mark.",
          image_prompt: "Small stethoscope and graduation cap mark.",
          image_negative_prompt: "readable text"
        }
      ],
      memory_citations: ["doctor"]
    };
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ result: { response: medicalBirthdayResponse } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
      },
      fetchImpl,
      aiFlowAdminConfig: cloudflareTextAiFlowConfig()
    });

    const result = await service.generateCard(
      {
        ...cardRequest,
        sender: "Mann",
        recipient: "Papa",
        relationship: "Son",
        occasion: "birthday",
        tone: "Sentimental",
        style: "Botanical",
        personal_note: "Warm birthday card for Papa.",
        memory_notes: ["fishes", "horses", "kids", "doctor", "love", "traveling"]
      },
      { rateKey: "test-doctor-memory-birthday-not-medical" }
    );
    const serialized = JSON.stringify(result.payload);
    const payload = result.payload as {
      card_copy: { panels: Array<{ id: string; headline: string; body: string }> };
    };

    expect(result.statusCode, JSON.stringify(result.payload)).toBe(200);
    expect(payload.card_copy.panels[0].headline).toMatch(/^Happy Birthday,? Papa$/);
    expect(payload.card_copy.panels[1].headline).toBe("A Little Sunshine");
    expect(payload.card_copy.panels[2].body).toContain("Wishing you a year");
    expect(serialized).toContain("Botanical birthday");
    expect(serialized).not.toMatch(/white coat|stethoscope|hospital|graduation cap|doctor you are becoming|degree itself|long shifts/i);
  });

  it("repairs benchmark copy misses for dad and small-business cards", async () => {
    const weakDadResponse = {
      ...cardCopyResponse,
      panels: cardCopyResponse.panels.map((panel) => ({
        ...panel,
        headline:
          panel.id === "front"
            ? "Fixing Everything with Love"
            : panel.id === "inside-left"
              ? "A Handy Dad's Love"
              : panel.id === "inside-right"
                ? "Love from the Heart"
                : "To an Amazing Dad",
        body:
          panel.id === "front"
            ? "Happy Father's Day to the best handyman in the world!"
            : panel.id === "inside-left"
              ? "You're the one who keeps our home running smoothly, Dad. Your steady presence and practical love mean the world to me."
              : panel.id === "inside-right"
                ? "This Father's Day, I wanted you to know those quiet repairs never went unnoticed. They added up to something bigger: steadiness, care, and a home that always felt looked after. With love, Manny."
                : "For the dad who fixes the small things and makes them mean everything."
      }))
    };
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ result: { response: weakDadResponse } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
      },
      fetchImpl
    });

    const dadResult = await service.generateCard(
      {
        ...cardRequest,
        recipient: "Dad",
        occasion: "Father's Day",
        style: "workshop blueprint tools",
        memory_notes: [
          "Dad shows love by fixing the small things before anyone asks.",
          "Use tools as symbols, not a cluttered hardware-store scene."
        ]
      },
      { rateKey: "test-dad-benchmark-copy-repair" }
    );
    const dadPayload = dadResult.payload as {
      card_copy: { panels: Array<{ id: string; headline: string; body: string }> };
    };

    expect(dadPayload.card_copy.panels[0].body).toContain("every quiet fix");
    expect(dadPayload.card_copy.panels[1].body).toContain("tightened screw");
    expect(dadPayload.card_copy.panels[3].headline).toBe("Built With Love");
    expect(JSON.stringify(dadPayload.card_copy)).not.toMatch(/best handyman|Amazing Dad|mean the world to me/i);
  });

  it("repairs salesy small-business copy into specific gratitude", async () => {
    const weakSmallBusinessResponse = {
      ...cardCopyResponse,
      panels: cardCopyResponse.panels.map((panel) => ({
        ...panel,
        headline:
          panel.id === "front"
            ? "You're the best!"
            : panel.id === "inside-left"
              ? "A Big Thank You"
              : panel.id === "inside-right"
                ? "Thanks again!"
                : "The CustomCard Team",
        body:
          panel.id === "front"
            ? "Thank you for supporting our small business!"
            : panel.id === "inside-left"
              ? "Thanks for being a valued customer. We look forward to serving you again."
              : panel.id === "inside-right"
                ? "Thank you for being a valued customer and for helping to keep our community vibrant and unique."
                : "Wishing you continued success and happiness in all your endeavors."
      }))
    };
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ result: { response: weakSmallBusinessResponse } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
      },
      fetchImpl
    });

    const result = await service.generateCard(
      {
        ...cardRequest,
        occasion: "thank-you for supporting a small business",
        style: "warm citrus, soft gold, deep teal, local shop texture",
        memory_notes: [
          "The customer chose an independent small business instead of a large marketplace.",
          "The owner wants the message to feel handmade, specific, and grateful rather than promotional."
        ]
      },
      { rateKey: "test-small-business-benchmark-copy-repair" }
    );
    const payload = result.payload as {
      card_copy: { panels: Array<{ id: string; headline: string; body: string }> };
    };

    expect(payload.card_copy.panels[0]).toMatchObject({
      headline: "Thank you for choosing local"
    });
    expect(payload.card_copy.panels[1].body).toContain("independent small business");
    expect(payload.card_copy.panels[2].body).toContain("trust");
    expect(payload.card_copy.panels[3]).toMatchObject({
      headline: "With Thanks",
      body: "Made with gratitude for customers who choose small."
    });
    expect(JSON.stringify(payload.card_copy)).not.toMatch(/You're the best|Thanks again|The CustomCard Team|valued customer|continued success|all your endeavors|look forward to serving/i);
  });

  it("repairs core benchmark risks for recovery, warranty CTA, and distant wedding cards", async () => {
    const weakResponse = (headlineFor: (panelId: string) => string, bodyFor: (panelId: string) => string) => ({
      ...cardCopyResponse,
      panels: cardCopyResponse.panels.map((panel) => ({
        ...panel,
        headline: headlineFor(panel.id),
        body: bodyFor(panel.id),
        art_direction: "Simple card layout.",
        image_prompt: "A simple border style reserved for the message.",
        image_negative_prompt: "readable text"
      }))
    });
    const generateWithResponse = async (
      response: unknown,
      request: Record<string, unknown>,
      rateKey: string
    ): Promise<{ card_copy: { panels: Array<{ id: string; headline: string; body: string }> } }> => {
      const fetchImpl = vi.fn(async () =>
        new Response(JSON.stringify({ result: { response } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
      const service = createAiCardGenerationService({
        env: {
          CLOUDFLARE_ACCOUNT_ID: "acct_123",
          CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        },
        fetchImpl
      });
      const result = await service.generateCard(request, { rateKey });
      expect(result.statusCode).toBe(200);
      return result.payload as { card_copy: { panels: Array<{ id: string; headline: string; body: string }> } };
    };

    const getWellPayload = await generateWithResponse(
      weakResponse(
        () => "Get Well Soon",
        () => "Wishing you a speedy recovery and hoping you feel better soon."
      ),
      {
        ...cardRequest,
        sender: "Jordan",
        recipient: "Sam",
        relationship: "close friend",
        occasion: "get well after surgery",
        style: "calm recovery stationery with basil green and soup-warm ivory",
        personal_note: "Sam is recovering from surgery.",
        memory_notes: [
          "Inside joke: the soup rating spreadsheet.",
          "Inside joke: terrible hospital socks.",
          "Sam has a garden that only grows basil.",
          "Sam is jokingly the mayor of taking tiny walks."
        ]
      },
      "test-get-well-benchmark-risk-repair"
    );
    const getWellCopy = JSON.stringify(getWellPayload.card_copy);
    expect(getWellCopy).toMatch(/tiny walks|tiny-walk/);
    expect(getWellCopy).toMatch(/soup/);
    expect(getWellCopy).toMatch(/basil/);
    expect(getWellCopy).not.toMatch(/speedy recovery|feel better soon|miracle cure/i);

    const b2bPayload = await generateWithResponse(
      weakResponse(
        () => "Valued Customer",
        () => "Act now for a limited time exclusive discount. Terms and conditions apply."
      ),
      {
        ...cardRequest,
        sender: "Northstar Dental Supply",
        recipient: "Avery at BrightSmile Clinic",
        relationship: "customer success team to clinic operations contact",
        occasion: "one-year purchase anniversary and extended warranty renewal reminder",
        style: "premium dental supply customer-success stationery",
        personal_note:
          "Thank Avery at BrightSmile Clinic for one year since purchase of their sterilizer system and gently remind them their extended warranty renewal window closes July 31. CTA: Scan the enclosed QR code or contact their account manager.",
        memory_notes: [
          "BrightSmile Clinic purchased a sterilizer system one year ago.",
          "The extended warranty renewal window closes July 31.",
          "Leave a clean area for an app-rendered QR code and account-manager CTA."
        ]
      },
      "test-b2b-warranty-benchmark-risk-repair"
    );
    const b2bCopy = JSON.stringify(b2bPayload.card_copy);
    expect(b2bCopy).toContain("BrightSmile Clinic");
    expect(b2bCopy).toContain("July 31");
    expect(b2bCopy).toContain("QR code");
    expect(b2bCopy).toContain("account manager");
    expect(b2bCopy).not.toMatch(/exclusive discount|limited time|terms and conditions|valued customer/i);

    const weddingPayload = await generateWithResponse(
      weakResponse(
        () => "Congratulations",
        () => "As your close family, I have watched your love story become perfect. God bless your soulmate journey forever."
      ),
      {
        ...cardRequest,
        sender: "Jordan",
        recipient: "Lina and Omar",
        relationship: "distant cousin",
        occasion: "wedding",
        style: "elegant wedding stationery with soft ivory, sage, restrained gold, generous handwriting space",
        personal_note:
          "Make a wedding card for distant cousin Lina and her fiance Omar. It should feel respectful and warm even though we are not close. Include a short blessing and leave room for a handwritten note.",
        memory_notes: [
          "Lina and Omar are getting married.",
          "The sender is not close to them and wants restraint.",
          "The inside should leave space for a handwritten note."
        ]
      },
      "test-wedding-benchmark-risk-repair"
    );
    const weddingCopy = JSON.stringify(weddingPayload.card_copy);
    expect(weddingCopy).toContain("Lina and Omar");
    expect(weddingCopy).toMatch(/blessing/i);
    expect(weddingCopy).toMatch(/handwritten|handwriting/i);
    expect(weddingCopy).not.toMatch(/God bless|close family|soulmate|perfect/i);
  });

  it("repairs quiet sympathy copy into literal practical support and readable layout", async () => {
    const weakSympathyResponse = {
      theme_guide: {
        theme_title: "Quiet Sympathy",
        palette: ["soft gray", "warm ivory", "palette"],
        motifs: ["line-art branch", "sparse lower-edge motifs", "palette", "style"],
        border_style: "thin refined frame",
        front_back_pairing: "restrained stationery",
        interior_pairing: "border-first stationery"
      },
      panels: cardCopyResponse.panels.map((panel) => ({
        ...panel,
        headline:
          panel.id === "front"
            ? "Eli, I'm here for you."
            : panel.id === "inside-left"
                ? "A friend's support"
                : panel.id === "inside-right"
                  ? "A friend's support"
                  : "Gratitude for Eli",
        body:
          panel.id === "front"
            ? "A quiet note for the days that ask for steadiness, space, and care."
            : panel.id === "inside-left"
              ? "I am so sorry for the loss your family is carrying. I will not try to explain it away or fill the silence with easy words; I just want you to know you are not alone."
              : panel.id === "inside-right"
                ? "I am here for the practical things, the quiet check-ins, and the days when talking is too much. May you have room to grieve at your own pace, with steady care around you. With sympathy and friendship, Jordan."
                : "A quiet support note, made with room for what words cannot hold.",
        text_layout: {
          headline_zone: "center",
          body_zone: "lower",
          alignment: "right",
          font_pairing: "minimal-sans",
          color_mode: "light-ink",
          scale: "standard"
        },
        art_direction: "Simple sympathy stationery.",
        image_prompt: "A simple border-first stationery design with a quiet center.",
        image_negative_prompt: "readable text"
      })),
      memory_citations: [
        "Eli lost his father.",
        "Jordan wants to offer practical support: meals, rides, calls, and silence."
      ]
    };
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ result: { response: weakSympathyResponse } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
      },
      fetchImpl
    });

    const result = await service.generateCard(
      {
        ...cardRequest,
        sender: "Jordan",
        recipient: "Eli",
        relationship: "friend",
        occasion: "sympathy after losing a parent",
        tone: "quiet, grounded, deeply respectful, practical, not cliched",
        style: "restrained sympathy stationery, soft gray, warm ivory, one small line-art branch, generous whitespace",
        personal_note:
          "A quiet card for Eli after losing his father. Mention that I am here for the practical stuff too: meals, rides, calls, silence. No cliches.",
        memory_notes: [
          "Eli lost his father.",
          "Jordan wants to offer practical support: meals, rides, calls, and silence.",
          "The card should avoid platitudes and religious claims unless requested."
        ]
      },
      { rateKey: "test-sympathy-literal-support-repair" }
    );
    const payload = result.payload as {
      card_copy: {
        theme_guide: { palette: string[]; motifs: string[] };
        panels: Array<{ id: string; headline: string; body: string; image_prompt?: string; text_layout?: Record<string, string> }>;
      };
    };
    const copy = JSON.stringify(payload.card_copy);
    const front = payload.card_copy.panels.find((panel) => panel.id === "front");
    const insideLeft = payload.card_copy.panels.find((panel) => panel.id === "inside-left");
    const insideRight = payload.card_copy.panels.find((panel) => panel.id === "inside-right");
    const back = payload.card_copy.panels.find((panel) => panel.id === "back");

    expect(copy).toContain("Eli");
    expect(copy).toContain("father");
    expect(copy).toContain("meals");
    expect(copy).toContain("rides");
    expect(copy).toContain("calls");
    expect(copy).toContain("silence");
    expect(copy).not.toMatch(/everything happens for a reason|thoughts and prayers|better place/i);
    expect(front?.headline).toBe("For Eli");
    expect(insideLeft?.headline).toBe("With You In This");
    expect(insideRight?.headline).toBe("From Jordan");
    expect(back?.headline).toBe("With Steady Care");
    expect(back?.body).toContain("practical help");
    expect(back?.body).toContain("quiet support");
    expect(back?.body).not.toMatch(/thank you for being a part of our lives|in memory/i);
    expect(payload.card_copy.theme_guide.palette).not.toContain("palette");
    expect(payload.card_copy.theme_guide.motifs).not.toContain("style");
    expect(payload.card_copy.panels.map((panel) => panel.image_prompt).join("\n")).not.toMatch(/recipient.?s? name|card copy|headline|body/i);
    const imagePrompts = payload.card_copy.panels.map((panel) => panel.image_prompt).join("\n");
    expect(imagePrompts).toMatch(/flat 2D gallery artwork|warm ivory open field|branch silhouette/i);
    expect(imagePrompts).not.toMatch(/photo-note|note-sheet|border-first|stationery design|paper field|thin refined frame/i);
    expect(front?.text_layout).toMatchObject({ color_mode: "light-ink", headline_zone: "upper", body_zone: "upper", scale: "large" });
    expect(insideLeft?.text_layout).toMatchObject({ color_mode: "dark-ink", font_pairing: "soft-serif", scale: "large" });
    expect(insideRight?.text_layout).toMatchObject({ color_mode: "dark-ink", font_pairing: "soft-serif", scale: "large" });
    expect(back?.text_layout).toMatchObject({ color_mode: "light-ink", headline_zone: "upper", body_zone: "center", scale: "large" });
  });

  it("honors a trusted admin live-provider off toggle even when credentials exist", async () => {
    const fetchImpl = vi.fn();
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
      },
      fetchImpl
    });
    const aiFlowConfig = buildDefaultAiFlowAdminConfigs().map((config) =>
      config.flowId === "card-copy" ? { ...config, liveProviderCallsEnabled: false } : config
    );

    const result = await service.generateCard(
      { ...cardRequest, aiFlowConfig },
      { rateKey: "test-admin-off", trustRequestAiFlowConfig: true }
    );

    expect(result.statusCode).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.payload).toMatchObject({
      status: "provider-unavailable",
      user_content_only: false
    });
    expect(result.payload).not.toHaveProperty("card_copy");
    expect(JSON.stringify(result.payload)).toContain("Live provider calls disabled");
  });

  it("honors server-owned AI flow profile without accepting customer-controlled profile changes", async () => {
    const fetchImpl = vi.fn();
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
      },
      fetchImpl,
      aiFlowAdminConfig: buildDefaultAiFlowAdminConfigs().map((config) =>
        config.flowId === "card-copy" ? { ...config, liveProviderCallsEnabled: false } : config
      )
    });

    const result = await service.generateCard(
      {
        ...cardRequest,
        aiFlowConfig: buildDefaultAiFlowAdminConfigs().map((config) =>
          config.flowId === "card-copy" ? { ...config, liveProviderCallsEnabled: true } : config
        )
      },
      { rateKey: "test-server-profile" }
    );

    expect(result.statusCode).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.payload).toMatchObject({
      status: "provider-unavailable",
      user_content_only: false
    });
    expect(result.payload).not.toHaveProperty("card_copy");
    expect(JSON.stringify(result.payload)).toContain("Live provider calls disabled");
  });

  it("honors loaded durable admin AI flow policy over bootstrap config", async () => {
    const fetchImpl = vi.fn();
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
      },
      fetchImpl,
      aiFlowAdminConfig: buildDefaultAiFlowAdminConfigs().map((config) =>
        config.flowId === "card-copy" ? { ...config, liveProviderCallsEnabled: true } : config
      ),
      loadAiFlowAdminConfig: async () =>
        buildDefaultAiFlowAdminConfigs().map((config) =>
          config.flowId === "card-copy" ? { ...config, liveProviderCallsEnabled: false } : config
        )
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-loaded-admin-policy" });

    expect(result.statusCode).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(JSON.stringify(result.payload)).toContain("Live provider calls disabled");
  });

  it("ignores request-scoped provider toggles unless explicitly enabled", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ panels: [] }) } }]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token"
      },
      fetchImpl,
      aiFlowAdminConfig: cloudflareTextAiFlowConfig()
    });
    const aiFlowConfig = buildDefaultAiFlowAdminConfigs().map((config) =>
      config.flowId === "card-copy" ? { ...config, liveProviderCallsEnabled: false } : config
    );

    const result = await service.generateCard({ ...cardRequest, aiFlowConfig }, { rateKey: "test-request-config-ignored" });

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    for (const field of removedAiPayloadFields()) expect(result.payload).not.toHaveProperty(field);
    expect(result.payload).toMatchObject({
      provider_call_events: expect.arrayContaining([expect.objectContaining({ status: "succeeded" })])
    });
  });

  it("ignores request-scoped provider toggles from untrusted customer contexts", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ panels: [] }) } }]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
      },
      fetchImpl,
      aiFlowAdminConfig: cloudflareTextAiFlowConfig()
    });
    const aiFlowConfig = buildDefaultAiFlowAdminConfigs().map((config) =>
      config.flowId === "card-copy" ? { ...config, liveProviderCallsEnabled: false } : config
    );

    const result = await service.generateCard({ ...cardRequest, aiFlowConfig }, { rateKey: "test-untrusted-config" });

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    for (const field of removedAiPayloadFields()) expect(result.payload).not.toHaveProperty(field);
    expect(result.payload).toMatchObject({
      provider_call_events: expect.arrayContaining([expect.objectContaining({ live_network_call: true, status: "succeeded" })])
    });
    expect(JSON.stringify(result.payload)).not.toContain("test_text_token");
  });

  it("generates one live image request for each 5x7 card panel", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/ai/v1/chat/completions")) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: { "content-type": "image/png" }
      });
    });
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "test_image_token",
      },
      fetchImpl,
      aiFlowAdminConfig: cloudflareImageAiFlowConfig()
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-card-images" });
    const imageCalls = fetchImpl.mock.calls.slice(1) as unknown as [RequestInfo | URL, RequestInit?][];
    const imageBodies = imageCalls.map((call) => JSON.parse(String(call[1]?.body)));
    const payload = result.payload as {
      generated_by: string;
      images: Array<{ panel_id: string; revised_prompt: string; width: number; height: number }>;
    };

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(payload.generated_by).toBe("ai-text-and-image");
    expect(payload.images.map((image) => image.panel_id)).toEqual(["front", "inside-left", "inside-right", "back"]);
    expect(imageBodies.map((body) => body.metadata.customcard.panel_id)).toEqual(["front", "inside-left", "inside-right", "back"]);
    expect(imageBodies.every((body) => body.width === 1464 && body.height === 2048)).toBe(true);
    expect(imageBodies.every((body) => Number.isInteger(body.seed))).toBe(true);
    expect(new Set(imageBodies.map((body) => body.seed)).size).toBe(4);
    expect(imageBodies.every((body) => body.metadata.customcard.generation_strategy === "one-provider-request-per-panel")).toBe(true);
    expect(imageBodies[0].prompt).toContain("Full-bleed flat 2D artwork layer");
    expect(imageBodies[1].prompt).toContain("inside-left print panel");
    expect(imageBodies[2].prompt).toContain("inside-right print panel");
    expect(imageBodies[3].prompt).toContain("back print panel");
    expect(imageBodies.every((body) => body.prompt.includes("no readable text"))).toBe(true);
    expect(imageBodies.every((body) => body.prompt.includes("no words"))).toBe(true);
    expect(imageBodies.every((body) => body.prompt.includes("no logos"))).toBe(true);
    expect(imageBodies.every((body) => body.prompt.includes("no watermark"))).toBe(true);
    expect(imageBodies.every((body) => body.prompt.includes("No people"))).toBe(true);
    expect(imageBodies.every((body) => body.prompt.includes("No hands"))).toBe(true);
    expect(imageBodies.every((body) => /not a physical .*card/i.test(body.prompt))).toBe(true);
    expect(imageBodies.every((body) => body.negative_prompt.includes("folded card mockup"))).toBe(true);
    expect(imageBodies.every((body) => body.negative_prompt.includes("tabletop scene"))).toBe(true);
    expect(imageBodies.every((body) => body.negative_prompt.includes("people"))).toBe(true);
    expect(imageBodies.every((body) => body.negative_prompt.includes("hands"))).toBe(true);
    expect(imageBodies.every((body) => body.negative_prompt.includes("readable text"))).toBe(true);
    expect(imageBodies.every((body) => body.negative_prompt.includes("fake text"))).toBe(true);
    expect(imageBodies.every((body) => body.negative_prompt.includes("product photo"))).toBe(true);
    expect(imageBodies.map((body) => body.prompt).join(" ")).not.toMatch(
      /Recipient:|Relationship:|Panel headline|Panel body|Language context|Art direction:/
    );
    expect(JSON.stringify(result.payload)).not.toContain("test_image_token");
  });

  it("uses the Flux image request shape and unwraps JSON base64 images", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/ai/v1/chat/completions")) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ result: { image: "/9j/AAAA" } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "test_image_token",
      },
      fetchImpl,
      aiFlowAdminConfig: cloudflareImageAiFlowConfig({ model: "@cf/black-forest-labs/flux-1-schnell" })
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-card-flux-images" });
    const imageBodies = (fetchImpl.mock.calls.slice(1) as unknown as [RequestInfo | URL, RequestInit?][])
      .map((call) => JSON.parse(String(call[1]?.body)));
    const payload = result.payload as {
      images: Array<{ image_url: string; revised_prompt: string }>;
    };

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(imageBodies.every((body) => body.steps === 8)).toBe(true);
    expect(imageBodies.every((body) => Number.isInteger(body.seed))).toBe(true);
    expect(new Set(imageBodies.map((body) => body.seed)).size).toBe(4);
    expect(imageBodies.every((body) => typeof body.prompt === "string" && body.prompt.length > 0)).toBe(true);
    expect(imageBodies.every((body) => !("negative_prompt" in body))).toBe(true);
    expect(imageBodies.every((body) => !("width" in body) && !("height" in body))).toBe(true);
    expect(payload.images).toHaveLength(4);
    expect(payload.images.every((image) => image.image_url.startsWith("data:image/jpeg;base64,"))).toBe(true);
    expect(JSON.stringify(result.payload)).not.toContain("test_image_token");
  });

  it("backs off and retries transient Cloudflare Flux image failures", async () => {
    let imageCallCount = 0;
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/ai/v1/chat/completions")) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      imageCallCount += 1;
      if (imageCallCount === 1) {
        return new Response(JSON.stringify({ errors: [{ message: "busy" }] }), {
          status: 429,
          headers: { "content-type": "application/json", "retry-after": "0" }
        });
      }
      return new Response(JSON.stringify({ result: { image: "/9j/AAAA" } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "test_image_token",
      },
      fetchImpl,
      aiFlowAdminConfig: cloudflareImageAiFlowConfig({ model: "@cf/black-forest-labs/flux-1-schnell" })
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-card-flux-backoff" });
    const payload = result.payload as { images: Array<{ image_url: string }> };

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(6);
    expect(imageCallCount).toBe(5);
    expect(payload.images).toHaveLength(4);
    expect(payload.images.every((image) => image.image_url.startsWith("data:image/jpeg;base64,"))).toBe(true);
  });

  it("uses DeepAI text2img generation with documented request fields when configured", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/ai/v1/chat/completions")) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ output_url: "data:image/png;base64,iVBORw0KGgo=" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        DEEPAI_API_KEY: "test_deepai_token",
      },
      fetchImpl,
      aiFlowAdminConfig: imageProviderAiFlowConfig("deepai-text2img-image", "text2img")
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-deepai-text2img-images" });
    const imageCalls = fetchImpl.mock.calls.slice(1) as unknown as [RequestInfo | URL, RequestInit?][];
    const imageBodies = imageCalls.map((call) => call[1]?.body as FormData);
    const payload = result.payload as {
      images: Array<{ image_url: string; revised_prompt: string }>;
    };

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(imageCalls.every((call) => String(call[0]) === "https://api.deepai.org/api/text2img")).toBe(true);
    expect(imageCalls.every((call) => (call[1]?.headers as Record<string, string>)["api-key"] === "test_deepai_token")).toBe(true);
    expect(imageBodies.every((body) => Array.from(body.keys()).join(",") === "text,negative_prompt,width,height,image_generator_version")).toBe(true);
    expect(imageBodies.every((body) => String(body.get("text") ?? "").includes("Full-bleed flat 2D artwork layer"))).toBe(true);
    expect(imageBodies.every((body) => !String(body.get("text") ?? "").includes("Avoid:"))).toBe(true);
    expect(imageBodies.every((body) => String(body.get("negative_prompt") ?? "").includes("folded card mockup"))).toBe(true);
    expect(imageBodies.every((body) => String(body.get("negative_prompt") ?? "").includes("readable text"))).toBe(true);
    expect(imageBodies.every((body) => body.get("width") === "768" && body.get("height") === "1024")).toBe(true);
    expect(imageBodies.every((body) => body.get("image_generator_version") === "standard")).toBe(true);
    expect(payload.images.every((image) => image.image_url.startsWith("data:image/png;base64,"))).toBe(true);
    expect(JSON.stringify(result.payload)).not.toContain("test_deepai_token");
  });

  it("falls back from DeepAI image generation to Cloudflare image generation for all panels", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const requestUrl = String(url);
      if (requestUrl.includes("/ai/v1/chat/completions")) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl === "https://api.deepai.org/api/text2img") {
        return new Response(JSON.stringify({ err: "DeepAI busy" }), {
          status: 503,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl.includes("/ai/run/@cf/black-forest-labs/flux-1-schnell")) {
        return new Response(JSON.stringify({ result: { image: "/9j/AAAA" } }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      throw new Error(`Unexpected fetch ${requestUrl}`);
    });
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "test_image_token",
        DEEPAI_API_KEY: "test_deepai_token",
      },
      fetchImpl,
      aiFlowAdminConfig: imageProviderAiFlowConfig("deepai-text2img-image", "text2img", {
        fallbackAdapterId: "cloudflare-workers-ai-image",
        fallbackQueueEnabled: true,
        rateLimitPerMinute: 8,
        maxRetries: 0
      })
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-card-image-fallback" });
    const payload = result.payload as {
      fallback_queued: boolean;
      images: Array<{ image_url: string }>;
      ai_flow: { card_image: { adapter_id: string; primary_adapter_id: string; fallback_adapter_id: string } };
      provider_call_events: Array<{ adapter_id: string; status: string; request_units: number; fallback_from_adapter_id?: string }>;
    };
    const deepAiCalls = fetchImpl.mock.calls.filter(([url]) => String(url) === "https://api.deepai.org/api/text2img");
    const cloudflareImageCalls = fetchImpl.mock.calls.filter(([url]) =>
      String(url).includes("/ai/run/@cf/black-forest-labs/flux-1-schnell")
    );

    expect(result.statusCode).toBe(200);
    expect(deepAiCalls).toHaveLength(1);
    expect(cloudflareImageCalls).toHaveLength(4);
    expect(payload.fallback_queued).toBe(true);
    expect(payload.images).toHaveLength(4);
    expect(payload.images.every((image) => image.image_url.startsWith("data:image/jpeg;base64,"))).toBe(true);
    expect(payload.ai_flow.card_image).toMatchObject({
      adapter_id: "cloudflare-workers-ai-image",
      primary_adapter_id: "deepai-text2img-image",
      fallback_adapter_id: "cloudflare-workers-ai-image"
    });
    expect(payload.provider_call_events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ adapter_id: "deepai-text2img-image", status: "failed", request_units: 4 }),
        expect.objectContaining({
          adapter_id: "cloudflare-workers-ai-image",
          status: "succeeded",
          request_units: 4,
          fallback_from_adapter_id: "deepai-text2img-image"
        })
      ])
    );
    expect(JSON.stringify(result.payload)).not.toMatch(/test_deepai_token|test_image_token|test_text_token/);
  });

  it("uses Hugging Face routed image generation and materializes provider image URLs", async () => {
    let imageIndex = 0;
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, _init?: RequestInit) => {
      const requestUrl = String(url);
      if (requestUrl.includes("/ai/v1/chat/completions")) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl.includes("router.huggingface.co/fal-ai/fal-ai/qwen-image")) {
        imageIndex += 1;
        return new Response(JSON.stringify({ images: [{ url: `https://8.8.8.8/panel-${imageIndex}.png` }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl.startsWith("https://8.8.8.8/")) {
        return new Response(new Uint8Array([1, 2, 3, imageIndex]), {
          status: 200,
          headers: { "content-type": "image/png" }
        });
      }
      throw new Error(`Unexpected fetch ${requestUrl}`);
    });
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        HUGGINGFACE_API_TOKEN: "test_hf_token",
      },
      fetchImpl,
      aiFlowAdminConfig: imageProviderAiFlowConfig("huggingface-image", "Qwen/Qwen-Image")
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-huggingface-images" });
    const hfProviderCalls = fetchImpl.mock.calls.filter(([url]) => String(url).includes("router.huggingface.co/fal-ai/"));
    const hfBodies = hfProviderCalls.map((call) => JSON.parse(String((call[1] as RequestInit | undefined)?.body)));
    const hostedFetches = fetchImpl.mock.calls.filter(([url]) => String(url).startsWith("https://8.8.8.8/"));
    const payload = result.payload as { images: Array<{ image_url: string; revised_prompt: string }> };

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(9);
    expect(hfProviderCalls).toHaveLength(4);
    expect(hostedFetches).toHaveLength(4);
    expect(
      hfProviderCalls.every(
        ([url, init]) =>
          String(url) === "https://router.huggingface.co/fal-ai/fal-ai/qwen-image" &&
          (init?.headers as Record<string, string>).authorization === "Bearer test_hf_token"
      )
    ).toBe(true);
    expect(hfBodies.every((body) => body.prompt.includes("Full-bleed flat 2D artwork layer"))).toBe(true);
    expect(hfBodies.every((body) => body.image_size.width === 1024 && body.image_size.height === 1536)).toBe(true);
    expect(hfBodies.every((body) => Number.isInteger(body.seed))).toBe(true);
    expect(payload.images.every((image) => image.image_url.startsWith("data:image/png;base64,"))).toBe(true);
    expect(JSON.stringify(result.payload)).not.toContain("test_hf_token");
  });

  it("uses RunComfy Model API async image generation and materializes hosted results", async () => {
    let imageIndex = 0;
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = String(url);
      if (requestUrl.includes("/ai/v1/chat/completions")) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl === "https://model-api.runcomfy.net/v1/models/blackforestlabs/flux-2/dev/text-to-image") {
        imageIndex += 1;
        return new Response(JSON.stringify({ request_id: `runcomfy-${imageIndex}` }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl.includes("/status")) {
        return new Response(JSON.stringify({ status: "completed" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl.includes("/result")) {
        const panelNumber = requestUrl.match(/runcomfy-(\d+)/)?.[1] ?? "0";
        return new Response(
          JSON.stringify({ status: "succeeded", output: { image: `https://8.8.4.4/panel-${panelNumber}.png` } }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (requestUrl.startsWith("https://8.8.4.4/")) {
        return new Response(new Uint8Array([4, 3, 2, imageIndex]), {
          status: 200,
          headers: { "content-type": "image/png" }
        });
      }
      throw new Error(`Unexpected fetch ${requestUrl}`);
    });
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        RUNCOMFY_API_TOKEN: "test_runcomfy_token"
      },
      fetchImpl,
      aiFlowAdminConfig: runComfyAiFlowConfig()
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-runcomfy-images" });
    const submitCalls = fetchImpl.mock.calls.filter(([url]) => String(url).includes("/v1/models/"));
    const submitBodies = submitCalls.map((call) => JSON.parse(String((call[1] as RequestInit | undefined)?.body)));
    const hostedFetches = fetchImpl.mock.calls.filter(([url]) => String(url).startsWith("https://8.8.4.4/"));
    const payload = result.payload as {
      images: Array<{ image_url: string; revised_prompt: string }>;
      ai_flow: { card_image: { adapter_id: string; model: string } };
    };

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(17);
    expect(submitCalls).toHaveLength(4);
    expect(hostedFetches).toHaveLength(4);
    expect(
      submitCalls.every(
        ([, init]) => (init?.headers as Record<string, string>).authorization === "Bearer test_runcomfy_token"
      )
    ).toBe(true);
    expect(submitBodies.every((body) => body.prompt.includes("Full-bleed flat 2D artwork layer"))).toBe(true);
    expect(submitBodies.every((body) => body.image_size === "portrait_4_3")).toBe(true);
    expect(submitBodies.every((body) => body.aspect_ratio === undefined && body.seed === undefined)).toBe(true);
    expect(payload.ai_flow.card_image).toMatchObject({
      adapter_id: "runcomfy-model-api-image",
      model: runComfyImageModel
    });
    expect(payload.images.every((image) => image.image_url.startsWith("data:image/png;base64,"))).toBe(true);
    expect(JSON.stringify(result.payload)).not.toContain("test_runcomfy_token");
  });

  it("surfaces RunComfy result failure details without leaking the token", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const requestUrl = String(url);
      if (requestUrl.includes("/ai/v1/chat/completions")) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl === "https://model-api.runcomfy.net/v1/models/blackforestlabs/flux-2/dev/text-to-image") {
        return new Response(
          JSON.stringify({
            request_id: "runcomfy-failed-1",
            status_url: "https://model-api.runcomfy.net/v1/requests/runcomfy-failed-1/status?from=submit",
            result_url: "https://model-api.runcomfy.net/v1/requests/runcomfy-failed-1/result?from=submit"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (requestUrl === "https://model-api.runcomfy.net/v1/requests/runcomfy-failed-1/status?from=submit") {
        return new Response(JSON.stringify({ status: "completed" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl === "https://model-api.runcomfy.net/v1/requests/runcomfy-failed-1/result?from=submit") {
        return new Response(
          JSON.stringify({
            status: "failed",
            error: JSON.stringify({
              errors: [{ message: "AiError: Internal server error", code: 3043 }],
              success: false
            })
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      throw new Error(`Unexpected fetch ${requestUrl}`);
    });
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        RUNCOMFY_API_TOKEN: "test_runcomfy_token"
      },
      fetchImpl,
      aiFlowAdminConfig: runComfyAiFlowConfig()
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-runcomfy-failure-details" });
    const payload = result.payload as { detail?: string; error?: string };

    expect(result.statusCode).toBe(502);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(fetchImpl.mock.calls.map(([url]) => String(url))).toContain(
      "https://model-api.runcomfy.net/v1/requests/runcomfy-failed-1/status?from=submit"
    );
    expect(fetchImpl.mock.calls.map(([url]) => String(url))).toContain(
      "https://model-api.runcomfy.net/v1/requests/runcomfy-failed-1/result?from=submit"
    );
    expect(payload.detail).toContain("Internal server error");
    expect(payload.detail).toContain("code 3043");
    expect(payload.error).toBe(payload.detail);
    expect(JSON.stringify(result.payload)).not.toContain("test_runcomfy_token");
  });

  it("uses OpenAI Responses structured output and OpenAI image generation when configured", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/v1/responses")) {
        return new Response(JSON.stringify({ output_text: JSON.stringify(cardCopyResponse) }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ data: [{ b64_json: "iVBORw0KGgo=" }] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });
    const service = createAiCardGenerationService({
      env: {
        OPENAI_API_KEY: "test_openai_token",
      },
      fetchImpl,
      aiFlowAdminConfig: aiFlowConfigFor([
        {
          flowId: "card-copy",
          primaryAdapterId: "openai-responses-chat",
          fallbackAdapterId: "openai-responses-chat",
          model: "gpt-4o-mini",
          liveProviderCallsEnabled: true
        },
        {
          flowId: "card-image",
          primaryAdapterId: "openai-images",
          fallbackAdapterId: "openai-images",
          model: "gpt-image-2",
          liveProviderCallsEnabled: true
        }
      ])
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-openai-images" });
    const textCall = fetchImpl.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit?];
    const textBody = JSON.parse(String(textCall[1]?.body));
    const imageCalls = fetchImpl.mock.calls.slice(1) as unknown as [RequestInfo | URL, RequestInit?][];
    const imageBodies = imageCalls.map((call) => JSON.parse(String(call[1]?.body)));
    const payload = result.payload as {
      images: Array<{ image_url: string; revised_prompt: string }>;
    };

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(String(textCall[0])).toBe("https://api.openai.com/v1/responses");
    expect(textBody.text.format).toMatchObject({
      type: "json_schema",
      name: "customcard_card_copy",
      strict: true
    });
    expect(textBody.text.format.schema.required).toEqual(expect.arrayContaining(["theme_guide", "panels", "memory_citations"]));
    expect(imageCalls.every((call) => String(call[0]) === "https://api.openai.com/v1/images/generations")).toBe(true);
    expect(imageBodies.every((body) => body.model === "gpt-image-2")).toBe(true);
    expect(imageBodies.every((body) => body.size === "1024x1536" && body.n === 1)).toBe(true);
    expect(payload.images.every((image) => image.image_url.startsWith("data:image/png;base64,"))).toBe(true);
    expect(JSON.stringify(result.payload)).not.toContain("test_openai_token");
  });

  it("materializes provider-hosted image URLs into embeddable data URLs", async () => {
    let imageIndex = 0;
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const requestUrl = String(url);
      if (requestUrl.includes("/v1/responses")) {
        return new Response(JSON.stringify({ output_text: JSON.stringify(cardCopyResponse) }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl.includes("/v1/images/generations")) {
        imageIndex += 1;
        return new Response(JSON.stringify({ data: [{ url: `https://1.1.1.1/panel-${imageIndex}.png` }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      if (requestUrl.startsWith("https://1.1.1.1/")) {
        return new Response(new Uint8Array([1, 2, 3, imageIndex]), {
          status: 200,
          headers: { "content-type": "image/png" }
        });
      }
      throw new Error(`Unexpected fetch ${requestUrl}`);
    });
    const service = createAiCardGenerationService({
      env: {
        OPENAI_API_KEY: "test_openai_token",
      },
      fetchImpl,
      aiFlowAdminConfig: aiFlowConfigFor([
        {
          flowId: "card-copy",
          primaryAdapterId: "openai-responses-chat",
          fallbackAdapterId: "openai-responses-chat",
          model: "gpt-4o-mini",
          liveProviderCallsEnabled: true
        },
        {
          flowId: "card-image",
          primaryAdapterId: "openai-images",
          fallbackAdapterId: "openai-images",
          model: "gpt-image-2",
          liveProviderCallsEnabled: true
        }
      ])
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-openai-hosted-images" });
    const payload = result.payload as { images: Array<{ image_url: string }> };
    const hostedFetches = fetchImpl.mock.calls.filter(([url]) => String(url).startsWith("https://1.1.1.1/"));

    expect(result.statusCode).toBe(200);
    expect(hostedFetches).toHaveLength(4);
    expect(payload.images).toHaveLength(4);
    expect(payload.images.every((image) => image.image_url.startsWith("data:image/png;base64,"))).toBe(true);
    expect(payload.images.some((image) => image.image_url.includes("https://1.1.1.1/"))).toBe(false);
  });

  it("uses Gemini structured text output and Gemini inline image responses when configured", async () => {
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/v1beta/models/")) {
        return new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: JSON.stringify(cardCopyResponse) }] } }]
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: "iVBORw0KGgo=" } }] } }]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    const service = createAiCardGenerationService({
      env: {
        GOOGLE_GENERATIVE_AI_API_KEY: "test_google_token",
      },
      fetchImpl,
      aiFlowAdminConfig: aiFlowConfigFor([
        {
          flowId: "card-copy",
          primaryAdapterId: "google-gemini-chat",
          fallbackAdapterId: "google-gemini-chat",
          model: "gemini-1.5-flash",
          liveProviderCallsEnabled: true
        },
        {
          flowId: "card-image",
          primaryAdapterId: "google-gemini-image",
          fallbackAdapterId: "google-gemini-image",
          model: "gemini-3.1-flash-image",
          liveProviderCallsEnabled: true
        }
      ])
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-gemini-images" });
    const textCall = fetchImpl.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit?];
    const textBody = JSON.parse(String(textCall[1]?.body));
    const imageCalls = fetchImpl.mock.calls.slice(1) as unknown as [RequestInfo | URL, RequestInit?][];
    const imageBodies = imageCalls.map((call) => JSON.parse(String(call[1]?.body)));
    const payload = result.payload as {
      images: Array<{ image_url: string; revised_prompt: string }>;
    };

    expect(result.statusCode).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(String(textCall[0])).toContain("/v1beta/models/gemini-1.5-flash:generateContent");
    expect(textBody.generationConfig.responseFormat.text).toMatchObject({
      mimeType: "application/json",
      schema: expect.objectContaining({ required: ["theme_guide", "panels", "memory_citations"] })
    });
    expect(imageCalls.every((call) => String(call[0]).includes("/v1/models/gemini-3.1-flash-image:generateContent"))).toBe(true);
    expect(imageBodies.every((body) => body.generationConfig.responseModalities[0] === "Image")).toBe(true);
    expect(imageBodies.every((body) => body.generationConfig.responseFormat.image.aspectRatio === "3:4")).toBe(true);
    expect(imageBodies.every((body) => body.generationConfig.responseFormat.image.imageSize === "2K")).toBe(true);
    expect(payload.images.every((image) => image.image_url.startsWith("data:image/png;base64,"))).toBe(true);
    expect(JSON.stringify(result.payload)).not.toContain("test_google_token");
  });

  it("repairs unsafe LLM image prompts before sending them to the image provider", async () => {
    const unsafeCopyResponse = {
      ...cardCopyResponse,
      panels: cardCopyResponse.panels.map((panel) =>
        panel.id === "front"
          ? {
              ...panel,
              image_prompt:
                "A small business owner holding a 'Thank you' sign with hands visible, surrounded by happy customers, with the shop's logo in the top left and a worn creased paper card.",
              image_negative_prompt: "readable text, people, hands"
            }
          : panel
      )
    };
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/ai/v1/chat/completions")) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(unsafeCopyResponse) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: { "content-type": "image/png" }
      });
    });
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "test_image_token",
      },
      fetchImpl,
      aiFlowAdminConfig: cloudflareImageAiFlowConfig()
    });

    await service.generateCard(
      {
        ...cardRequest,
        occasion: "thank-you for supporting a small business",
        style: "warm citrus, soft gold, deep teal, local shop texture"
      },
      { rateKey: "test-card-image-repair" }
    );
    const frontImageCall = fetchImpl.mock.calls[1] as unknown as [RequestInfo | URL, RequestInit?];
    const frontBody = JSON.parse(String(frontImageCall[1]?.body));

    expect(frontBody.prompt).toContain("small-business thank-you stationery");
    expect(frontBody.prompt).toContain("controlled citrus-and-leaf corner arrangement");
    expect(frontBody.prompt).toContain("boutique awning silhouette");
    expect(frontBody.prompt).not.toMatch(/owner|customers|holding|['"]?thank you['"]?\s+sign|signage|shop['’]?s logo|creased|worn/i);
    expect(frontBody.prompt).toMatch(/no readable text/i);
    expect(frontBody.prompt).toMatch(/no people/i);
    expect(frontBody.prompt).toMatch(/no hands/i);
  });

  it("rebuilds vague or copy-leaking LLM image prompts into concrete visual briefs", async () => {
    const vagueCopyResponse = {
      ...cardCopyResponse,
      panels: cardCopyResponse.panels.map((panel) => ({
        ...panel,
        art_direction:
          panel.id === "front" ? "Elegant medical graduation cover with navy, gold, stethoscope, and cap motifs." : panel.art_direction,
        image_prompt:
          panel.id === "front"
            ? "Deep navy background, white (10%) text, soft gold accents, centered white graduation cap with soft gold tassel."
            : panel.id === "back"
              ? "A simple border style reserved for the main message."
              : "A quiet, polished design with a simple border style reserved for the recipient's name.",
        image_negative_prompt: "readable text, fake text, mockup"
      }))
    };
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("/ai/v1/chat/completions")) {
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(vagueCopyResponse) } }] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: { "content-type": "image/png" }
      });
    });
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
        CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "test_image_token",
      },
      fetchImpl,
      aiFlowAdminConfig: cloudflareImageAiFlowConfig()
    });

    await service.generateCard(
      {
        ...cardRequest,
        occasion: "medical school graduation",
        style: "deep navy and soft gold medical milestone",
        personal_note: "Sara is becoming a doctor."
      },
      { rateKey: "test-card-image-specificity-repair" }
    );
    const imageBodies = (fetchImpl.mock.calls.slice(1) as unknown as [RequestInfo | URL, RequestInit?][])
      .map((call) => JSON.parse(String(call[1]?.body)));

    expect(imageBodies[0].prompt).toContain("medical-school graduation artwork");
    expect(imageBodies[0].prompt).toContain("graduation cap");
    expect(imageBodies[0].prompt).toContain("stethoscope hero composition");
    expect(imageBodies[0].prompt).toContain("never dense repeated medical icons");
    expect(imageBodies[1].prompt).toContain("inside-left print panel");
    expect(imageBodies[2].prompt).toContain("inside-right print panel");
    expect(imageBodies[3].prompt).toContain("back print panel");
    expect(imageBodies.map((body) => body.prompt).join(" ")).not.toMatch(
      /recipient['’]?s?\s+name|main message|headline|card copy|exact text|personal message|scene-setting message|white\s*\(\d+%\)\s*text/i
    );
  });

  it("normalizes browser SVG as a card-image provider override", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(cardCopyResponse) } }] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
      },
      fetchImpl,
      aiFlowAdminConfig: aiFlowConfigFor([
        {
          flowId: "card-copy",
          primaryAdapterId: "cloudflare-workers-ai-chat",
          fallbackAdapterId: "cloudflare-workers-ai-chat",
          model: cloudflareTextModel,
          liveProviderCallsEnabled: true
        },
        {
          flowId: "card-image",
          primaryAdapterId: "browser-svg-renderer",
          liveProviderCallsEnabled: true
        }
      ])
    });

    const result = await service.generateCard(cardRequest, { rateKey: "test-browser-svg-images" });
    const payload = result.payload as {
      generated_by: string;
      images: Array<{ panel_id: string; image_url: string; revised_prompt: string }>;
      ai_flow: { card_image: { primary_adapter_id: string; adapter_id: string; provider_failure?: string } };
    };

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(payload.generated_by).toBe("ai-text-only");
    expect(payload.ai_flow.card_image.primary_adapter_id).toBe("local-comfyui-api-image");
    expect(payload.ai_flow.card_image.adapter_id).toBe("");
    expect(payload.ai_flow.card_image.provider_failure).toContain("CUSTOMCARD_COMFYUI_URL or COMFYUI_URL");
    expect(payload.images).toEqual([]);
    expect(JSON.stringify(result.payload)).not.toContain("test_text_token");
  });

  it("does not synthesize local SVG artwork for tool prompts", async () => {
    const toolCopyResponse = {
      ...cardCopyResponse,
      panels: cardCopyResponse.panels.map((panel) => ({
        ...panel,
        image_prompt:
          panel.id === "inside-right"
            ? "A stylized illustration of a glue stick, surrounded by a few tools and blueprint accents."
            : "A flat Father's Day pattern with tools, blueprints, wrenches, and fix-it workshop details.",
        image_negative_prompt: "readable text, fake text, mockup, people, hands"
      }))
    };
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(toolCopyResponse) } }] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
      },
      fetchImpl,
      aiFlowAdminConfig: aiFlowConfigFor([
        {
          flowId: "card-copy",
          primaryAdapterId: "cloudflare-workers-ai-chat",
          fallbackAdapterId: "cloudflare-workers-ai-chat",
          model: cloudflareTextModel,
          liveProviderCallsEnabled: true
        },
        {
          flowId: "card-image",
          primaryAdapterId: "browser-svg-renderer",
          liveProviderCallsEnabled: true
        }
      ])
    });

    const result = await service.generateCard(
      {
        ...cardRequest,
        recipient: "Dad",
        occasion: "Father's Day",
        style: "workshop blueprint tools"
      },
      { rateKey: "test-browser-svg-tools" }
    );
    const payload = result.payload as {
      generated_by: string;
      images: Array<{ image_url: string }>;
      ai_flow: { card_image: { provider_failure?: string } };
    };

    expect(payload.generated_by).toBe("ai-text-only");
    expect(payload.images).toEqual([]);
    expect(payload.ai_flow.card_image.provider_failure).toContain("CUSTOMCARD_COMFYUI_URL or COMFYUI_URL");
  });

  it("uses the customer-chat flow for chat replies", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "I can help shape this into a warm birthday card." } }]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const service = createAiCardGenerationService({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "test_text_token",
      },
      fetchImpl
    });

    const result = await service.respondChat(
      {
        customer_message: "Can you make it warmer?",
        recipient_name: "Sara",
        approved_memory_notes: [],
        locale: "en-US",
        fulfillment_context: "Walgreens pickup is review-only.",
        aiFlowConfig: buildDefaultAiFlowAdminConfigs()
      },
      { rateKey: "test-chat" }
    );

    expect(result.statusCode).toBe(200);
    expect(JSON.stringify(result.payload)).toContain("warm birthday card");
    expect(JSON.stringify(result.payload)).not.toContain("test_text_token");
  });

  it("returns no generated chat text when the customer-chat provider is disabled", async () => {
    const fetchImpl = vi.fn();
    const service = createAiCardGenerationService({
      env: {},
      fetchImpl
    });

    const result = await service.respondChat(
      {
        customer_message: "Can you make it warmer?",
        recipient_name: "Sara",
        approved_memory_notes: ["She loves morning hikes."],
        locale: "en-US",
        fulfillment_context: "Walgreens pickup is review-only."
      },
      { rateKey: "test-chat-disabled" }
    );

    expect(result.statusCode).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.payload).toMatchObject({
      status: "provider-unavailable",
      user_content_only: false,
      ai_flow: {
        customer_chat: expect.objectContaining({
          adapter_id: "",
          provider_failure: expect.stringContaining("missing")
        })
      }
    });
    expect(result.payload).not.toHaveProperty("assistant_message");
    expect(JSON.stringify(result.payload)).not.toMatch(/Sara|morning hikes|Can you make it warmer/i);
  });

  it("blocks unsafe provider image download URLs before materializing them", async () => {
    await expect(assertSafeGeneratedImageDownloadUrl("http://example.com/image.png", {})).rejects.toThrow(
      "must use https"
    );
    await expect(assertSafeGeneratedImageDownloadUrl("https://127.0.0.1/image.png", {})).rejects.toThrow(
      "private network"
    );
    await expect(
      assertSafeGeneratedImageDownloadUrl("https://cdn.example.com/image.png", {
        CUSTOMCARD_AI_IMAGE_DOWNLOAD_ALLOWED_HOSTS: "images.example.net"
      })
    ).rejects.toThrow("allowlist");

    expect(isPrivateGeneratedImageAddress("10.0.0.5")).toBe(true);
    expect(isPrivateGeneratedImageAddress("172.20.0.5")).toBe(true);
    expect(isPrivateGeneratedImageAddress("192.168.1.5")).toBe(true);
    expect(isPrivateGeneratedImageAddress("169.254.169.254")).toBe(true);
    expect(isPrivateGeneratedImageAddress("::1")).toBe(true);
    expect(isPrivateGeneratedImageAddress("8.8.8.8")).toBe(false);
  });
});

function removedAiPayloadFields() {
  return [
    ["live", "provider", "calls", "enabled"].join("_"),
    ["external", "network", "calls"].join("_")
  ];
}
