import { describe, expect, it } from "vitest";
import {
  createAiRouteActivationContext,
  resolveAiRouteActivation,
  resolveAiRouteActivations
} from "./aiRouteActivation.mjs";
import { normalizeAiFlowAdminConfigs } from "./aiFlowConfigData.mjs";

describe("AI route activation", () => {
  it("keeps the card-copy env model override ahead of admin config defaults", () => {
    const activation = resolveAiRouteActivation("card-copy", {
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "token_text",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: "@cf/meta/llama-3.1-8b-instruct-fast",
        CUSTOMCARD_AI_CARD_COPY_MODEL: "@cf/qwen/qwen3-30b-a3b-fp8"
      },
      serviceAiFlowAdminConfig: [
        {
          flowId: "card-copy",
          primaryAdapterId: "cloudflare-workers-ai-chat",
          fallbackAdapterId: "huggingface-chat",
          model: "@cf/meta/llama-3.1-8b-instruct-fast",
          liveProviderCallsEnabled: true
        }
      ]
    });

    expect(activation.selectedAdapterId).toBe("cloudflare-workers-ai-chat");
    expect(activation.model).toBe("@cf/qwen/qwen3-30b-a3b-fp8");
    expect(activation.flow.readyForLiveCalls).toBe(true);
    expect(activation.configuredEnvKeys).toEqual(
      expect.arrayContaining(["CUSTOMCARD_AI_CARD_COPY_MODEL", "CLOUDFLARE_WORKERS_AI_TEXT_MODEL"])
    );
  });

  it("ignores request-scoped flow config unless request trust is enabled", () => {
    const activation = resolveAiRouteActivation("card-copy", {
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "token_text",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: "@cf/qwen/qwen3-30b-a3b-fp8"
      },
      body: {
        aiFlowConfig: [
          {
            flowId: "card-copy",
            primaryAdapterId: "huggingface-chat",
            liveProviderCallsEnabled: false
          }
        ]
      },
      requestContext: {
        trustRequestAiFlowConfig: false
      }
    });

    expect(activation.selectedAdapterId).toBe("cloudflare-workers-ai-chat");
    expect(activation.flow.liveProviderCallsEnabled).toBe(true);
  });

  it("merges trusted request-scoped flow config after earlier config sources", () => {
    const activation = resolveAiRouteActivation("card-copy", {
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "token_text",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: "@cf/qwen/qwen3-30b-a3b-fp8"
      },
      serviceAiFlowAdminConfig: [
        {
          flowId: "card-copy",
          primaryAdapterId: "cloudflare-workers-ai-chat",
          liveProviderCallsEnabled: true
        }
      ],
      loadedAiFlowAdminConfig: {
        configs: [{ flowId: "card-copy", liveProviderCallsEnabled: false }]
      },
      requestContext: {
        aiFlowAdminConfig: [{ flowId: "card-copy", liveProviderCallsEnabled: false }],
        trustRequestAiFlowConfig: true
      },
      body: {
        aiFlowConfig: [{ flowId: "card-copy", liveProviderCallsEnabled: true }]
      }
    });

    expect(activation.flow.liveProviderCallsEnabled).toBe(true);
    expect(activation.readyForLiveCalls).toBe(true);
  });

  it("keeps sparse card-copy overrides aligned with generator env semantics under non-default providers", () => {
    const env = {
      HUGGINGFACE_API_TOKEN: "hf-token"
    };
    const expected = normalizeAiFlowAdminConfigs(
      [{ flowId: "card-copy", model: "Qwen/Qwen3-32B-Instruct" }],
      env
    ).find((config) => config.flowId === "card-copy");
    const activation = resolveAiRouteActivation("card-copy", {
      env,
      loadedAiFlowAdminConfig: {
        configs: [{ flowId: "card-copy", model: "Qwen/Qwen3-32B-Instruct" }]
      }
    });

    expect(expected).toMatchObject({
      primaryAdapterId: "huggingface-chat",
      model: "Qwen/Qwen3-32B-Instruct"
    });
    expect(activation.selectedAdapterId).toBe(expected?.primaryAdapterId);
    expect(activation.model).toBe(expected?.model);
  });

  it("preserves unrelated flows when later sparse sources override only one flow", () => {
    const activations = resolveAiRouteActivations({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "token_text",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: "@cf/qwen/qwen3-30b-a3b-fp8",
        DEEPAI_API_KEY: "deepai-token"
      },
      serviceAiFlowAdminConfig: [
        {
          flowId: "card-copy",
          primaryAdapterId: "huggingface-chat",
          liveProviderCallsEnabled: true
        },
        {
          flowId: "card-image",
          primaryAdapterId: "deepai-text2img-image",
          liveProviderCallsEnabled: true
        }
      ],
      loadedAiFlowAdminConfig: {
        ai_flow_configs: [{ flowId: "card-copy", liveProviderCallsEnabled: false }]
      }
    });

    expect(activations.find((activation) => activation.flowId === "card-copy")).toMatchObject({
      selectedAdapterId: "cloudflare-workers-ai-chat",
      readyForLiveCalls: false
    });
    expect(activations.find((activation) => activation.flowId === "card-image")).toMatchObject({
      selectedAdapterId: "deepai-text2img-image",
      readyForLiveCalls: true
    });
  });

  it("parses server-scoped env JSON once when resolving multiple route activations", () => {
    let flowConfigReads = 0;
    const env = {
      CLOUDFLARE_ACCOUNT_ID: "acct_123",
      CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "token_text",
      CLOUDFLARE_WORKERS_AI_TEXT_MODEL: "@cf/qwen/qwen3-30b-a3b-fp8",
      DEEPAI_API_KEY: "deepai-token"
    };
    Object.defineProperty(env, "CUSTOMCARD_AI_FLOW_CONFIG_JSON", {
      enumerable: true,
      get() {
        flowConfigReads += 1;
        return JSON.stringify([
          { flowId: "card-copy", liveProviderCallsEnabled: true },
          { flowId: "card-image", primaryAdapterId: "deepai-text2img-image", liveProviderCallsEnabled: true }
        ]);
      }
    });

    const context = createAiRouteActivationContext({ env });
    const activations = resolveAiRouteActivations(context);

    expect(flowConfigReads).toBe(1);
    expect(activations).toHaveLength(3);
    expect(activations.find((activation) => activation.flowId === "card-image")?.selectedAdapterId).toBe(
      "deepai-text2img-image"
    );
  });

  it("attaches control-plane route policy ids for card-copy and card-image", () => {
    const activations = resolveAiRouteActivations({
      env: {
        CLOUDFLARE_ACCOUNT_ID: "acct_123",
        CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: "token_text",
        CLOUDFLARE_WORKERS_AI_TEXT_MODEL: "@cf/qwen/qwen3-30b-a3b-fp8",
        DEEPAI_API_KEY: "deepai-token"
      }
    });

    expect(activations.find((activation) => activation.flowId === "card-copy")).toMatchObject({
      controlPlaneRoutePolicyId: "card-copy-route-v1"
    });
    expect(activations.find((activation) => activation.flowId === "card-image")).toMatchObject({
      controlPlaneRoutePolicyId: "card-image-route-v1"
    });
  });
});
