import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildEffectiveProviderRequests,
  buildPhaseReadme,
  buildTypographyExperimentPrompt,
  localProductionTextRuns,
  localTypographyRuns,
  parseBenchmarkRequestBody,
  pipelineQualityRuns,
  productionTextCompositorFixtureSpec,
  productionTextRequestFixtures,
  productionTextAutoChecks,
  runModelBenchmarkLoopFromArgs,
  sanitizeBenchmarkValue,
  stories as benchmarkStories,
  typographyExperimentRuns,
  typographyExperimentSpec
} from "../scripts/model-benchmark-loop.mjs";

describe("model benchmark typography experiment", () => {
  it("asks the image model to own final typography only in full-AI mode", () => {
    const prompt = buildTypographyExperimentPrompt("mode-b-full-ai-typography");
    const insideLeft = buildTypographyExperimentPrompt("mode-b-full-ai-typography", typographyExperimentSpec, "inside-left");
    const insideRight = buildTypographyExperimentPrompt("mode-b-full-ai-typography", typographyExperimentSpec, "inside-right");

    expect(prompt.renderTextInApp).toBe(false);
    expect(prompt.panelId).toBe("front");
    expect(prompt.prompt).toContain("FINAL PRINT-READY GREETING CARD PANEL");
    expect(prompt.prompt).toContain(typographyExperimentSpec.headline);
    expect(prompt.prompt).toContain(typographyExperimentSpec.body);
    expect(prompt.prompt).toContain("All text must be spelled exactly as provided.");
    expect(prompt.negativePrompt).not.toContain("readable text");
    expect(insideLeft.renderTextInApp).toBe(false);
    expect(insideLeft.prompt).toContain(typographyExperimentSpec.panels["inside-left"].headline);
    expect(insideLeft.prompt).toContain(typographyExperimentSpec.panels["inside-left"].body);
    expect(insideRight.renderTextInApp).toBe(false);
    expect(insideRight.prompt).toContain(typographyExperimentSpec.panels["inside-right"].headline);
    expect(insideRight.prompt).toContain(typographyExperimentSpec.panels["inside-right"].body);
  });

  it("keeps exact copy out of artwork-only and hybrid prompts for fixed text panels", () => {
    const current = [
      buildTypographyExperimentPrompt("mode-a-current-overlay"),
      buildTypographyExperimentPrompt("mode-a-current-overlay", typographyExperimentSpec, "inside-left"),
      buildTypographyExperimentPrompt("mode-a-current-overlay", typographyExperimentSpec, "inside-right")
    ];
    const hybrid = [
      buildTypographyExperimentPrompt("mode-c-hybrid-reserved-layout"),
      buildTypographyExperimentPrompt("mode-c-hybrid-reserved-layout", typographyExperimentSpec, "inside-left"),
      buildTypographyExperimentPrompt("mode-c-hybrid-reserved-layout", typographyExperimentSpec, "inside-right")
    ];

    for (const prompt of [...current, ...hybrid]) {
      const panel = typographyExperimentSpec.panels[prompt.panelId];
      expect(prompt.renderTextInApp).toBe(true);
      expect(prompt.prompt).not.toContain(panel.headline);
      expect(prompt.prompt).not.toContain(panel.body);
      expect(prompt.negativePrompt).toContain("readable text");
    }
    expect(hybrid[0].prompt).toContain(`Headline length: ${typographyExperimentSpec.headlineWordCount} words.`);
    expect(hybrid[0].prompt).toContain(`Body length: ${typographyExperimentSpec.bodySentenceCount} short sentence.`);
    expect(hybrid[1].prompt).toContain("Headline length: 3 words.");
    expect(hybrid[2].prompt).toContain("Headline length: 4 words.");
  });

  it("keeps the back panel text-free in every typography mode", () => {
    const prompts = [
      buildTypographyExperimentPrompt("mode-a-current-overlay", typographyExperimentSpec, "back"),
      buildTypographyExperimentPrompt("mode-b-full-ai-typography", typographyExperimentSpec, "back"),
      buildTypographyExperimentPrompt("mode-c-hybrid-reserved-layout", typographyExperimentSpec, "back")
    ];

    for (const prompt of prompts) {
      expect(prompt.panelId).toBe("back");
      expect(prompt.renderTextInApp).toBe(false);
      expect(prompt.prompt).toContain("No card copy belongs on this panel.");
      for (const panel of Object.values(typographyExperimentSpec.panels).filter((candidate) => candidate.headline)) {
        expect(prompt.prompt).not.toContain(panel.headline);
        expect(prompt.prompt).not.toContain(panel.body);
      }
      expect(prompt.negativePrompt).toContain("readable text");
    }
    expect(prompts[2].prompt).toContain("Palette: solid deep charcoal only");
    expect(prompts[2].negativePrompt).toContain("ivory wave");
  });

  it("plans production text runs from customer requests with Cloudflare text and local Comfy when configured", () => {
    const runs = localProductionTextRuns({
      text: [
        {
          id: "text-cloudflare-baseline",
          label: "Cloudflare Workers AI chat",
          adapterId: "cloudflare-workers-ai-chat",
          model: "@cf/meta/llama-3.1-8b-instruct-fast",
          configured: true
        },
        {
          id: "text-local-openai-compatible",
          label: "Local OpenAI-compatible chat",
          adapterId: "local-openai-compatible-chat",
          model: "koboldcpp/gemma-4-31B-it-Q4_K_M",
          configured: true
        }
      ],
      image: [
        {
          id: "image-local-comfyui",
          label: "Local ComfyUI",
          adapterId: "local-comfyui-api-image",
          model: "sd_xl_turbo_1.0_fp16.safetensors",
          configured: true
        }
      ]
    });
    const storyIds = runs.map((run) => run.storyId);

    expect(productionTextRequestFixtures.map((story) => story.id)).toEqual([
      "aquarium-lover-birthday",
      "koi-fish-lover-encouragement",
      "dog-lover-thank-you"
    ]);
    expect(storyIds).toEqual(productionTextRequestFixtures.map((story) => story.id));
    expect(runs.every((run) => run.productionTextMode === "llm-generated-copy")).toBe(true);
    expect(runs.every((run) => run.text.adapterId === "cloudflare-workers-ai-chat")).toBe(true);
    expect(runs.find((run) => run.storyId === "aquarium-lover-birthday")?.story.request.personal_note).toContain(
      "freshwater aquarium"
    );
    expect(runs.find((run) => run.storyId === "koi-fish-lover-encouragement")?.story.request.style).toContain(
      "LLM must invent"
    );
    expect(runs.find((run) => run.storyId === "dog-lover-thank-you")?.story.request.personal_note).not.toContain(
      "You Showed Up Big"
    );
  });

  it("falls back to local production text planner only when Cloudflare text is unavailable", () => {
    const runs = localProductionTextRuns({
      text: [
        {
          id: "text-local-openai-compatible",
          label: "Local OpenAI-compatible chat",
          adapterId: "local-openai-compatible-chat",
          model: "koboldcpp/gemma-4-31B-it-Q4_K_M",
          configured: true
        }
      ],
      image: [
        {
          id: "image-local-comfyui",
          label: "Local ComfyUI",
          adapterId: "local-comfyui-api-image",
          model: "sd_xl_turbo_1.0_fp16.safetensors",
          configured: true
        }
      ]
    });

    expect(runs).toHaveLength(3);
    expect(runs.every((run) => run.text.adapterId === "local-openai-compatible-chat")).toBe(true);
  });

  it("prefers Cloudflare Qwen3 30B for production text when available", () => {
    const runs = localProductionTextRuns({
      text: [
        {
          id: "text-cloudflare-baseline",
          label: "Cloudflare Workers AI chat",
          adapterId: "cloudflare-workers-ai-chat",
          model: "@cf/meta/llama-3.2-3b-instruct",
          configured: true
        },
        {
          id: "text-cloudflare-qwen3-30b-a3b-fp8",
          label: "Cloudflare Qwen3 30B A3B FP8 card-copy planner",
          adapterId: "cloudflare-workers-ai-chat",
          model: "@cf/qwen/qwen3-30b-a3b-fp8",
          configured: true
        }
      ],
      image: [
        {
          id: "image-local-comfyui",
          label: "Local ComfyUI",
          adapterId: "local-comfyui-api-image",
          model: "sd_xl_turbo_1.0_fp16.safetensors",
          configured: true
        }
      ]
    });

    expect(runs).toHaveLength(3);
    expect(new Set(runs.map((run) => run.text.id))).toEqual(new Set(["text-cloudflare-qwen3-30b-a3b-fp8"]));
    expect(new Set(runs.map((run) => run.text.model))).toEqual(new Set(["@cf/qwen/qwen3-30b-a3b-fp8"]));
  });

  it("keeps production-text image traffic local while allowing Cloudflare text by default", async () => {
    const { benchmarkNetworkGuardForRuns } = (await import("../scripts/model-benchmark-loop.mjs")) as unknown as {
      benchmarkNetworkGuardForRuns: (input: {
        args?: Record<string, unknown>;
        phase?: string;
        plannedRuns?: Array<{
          productionTextMode?: string;
          text?: { adapterId?: string };
        }>;
      }) => { localOnly: boolean; allowedNonLocalOrigins: string[] };
    };
    const runs = localProductionTextRuns({
      text: [
        {
          id: "text-cloudflare-baseline",
          label: "Cloudflare Workers AI chat",
          adapterId: "cloudflare-workers-ai-chat",
          model: "@cf/meta/llama-3.2-3b-instruct",
          configured: true
        }
      ],
      image: [
        {
          id: "image-local-comfyui",
          label: "Local ComfyUI",
          adapterId: "local-comfyui-api-image",
          model: "sd_xl_turbo_1.0_fp16.safetensors",
          configured: true
        }
      ]
    });

    expect(benchmarkNetworkGuardForRuns({ phase: "local-production-text", plannedRuns: runs })).toEqual({
      localOnly: true,
      allowedNonLocalOrigins: ["https://api.cloudflare.com"]
    });
    expect(
      benchmarkNetworkGuardForRuns({
        args: { "local-only": "true" },
        phase: "local-production-text",
        plannedRuns: runs
      })
    ).toEqual({
      localOnly: true,
      allowedNonLocalOrigins: []
    });
  });

  it("writes production planner runtime budget into local-production-text dry-run artifacts", async () => {
    const outputDir = mkdtempSync(join(tmpdir(), "customcard-production-text-dry-run-"));
    const previousEnv = {
      CUSTOMCARD_LOCAL_LLM_BASE_URL: process.env.CUSTOMCARD_LOCAL_LLM_BASE_URL,
      CUSTOMCARD_LOCAL_LLM_MODEL: process.env.CUSTOMCARD_LOCAL_LLM_MODEL,
      CUSTOMCARD_LOCAL_LLM_REQUEST_TIMEOUT_MS: process.env.CUSTOMCARD_LOCAL_LLM_REQUEST_TIMEOUT_MS,
      CUSTOMCARD_PRODUCTION_TEXT_PLANNER_CONTEXT_TOKENS: process.env.CUSTOMCARD_PRODUCTION_TEXT_PLANNER_CONTEXT_TOKENS,
      CUSTOMCARD_PRODUCTION_TEXT_PLANNER_MAX_TOKENS: process.env.CUSTOMCARD_PRODUCTION_TEXT_PLANNER_MAX_TOKENS,
      CUSTOMCARD_ALLOW_SMALL_PRODUCTION_PLANNER: process.env.CUSTOMCARD_ALLOW_SMALL_PRODUCTION_PLANNER,
      CUSTOMCARD_ALLOW_UNKNOWN_PRODUCTION_PLANNER: process.env.CUSTOMCARD_ALLOW_UNKNOWN_PRODUCTION_PLANNER,
      CUSTOMCARD_COMFYUI_URL: process.env.CUSTOMCARD_COMFYUI_URL,
      CUSTOMCARD_COMFYUI_CHECKPOINT: process.env.CUSTOMCARD_COMFYUI_CHECKPOINT,
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: process.env.CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN,
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN
    };
    try {
      process.env.CUSTOMCARD_LOCAL_LLM_BASE_URL = "http://127.0.0.1:5003/v1";
      process.env.CUSTOMCARD_LOCAL_LLM_MODEL = "koboldcpp/gemma-4-31B-it-Q4_K_M";
      process.env.CUSTOMCARD_LOCAL_LLM_REQUEST_TIMEOUT_MS = "1200000";
      process.env.CUSTOMCARD_PRODUCTION_TEXT_PLANNER_CONTEXT_TOKENS = "8192";
      process.env.CUSTOMCARD_PRODUCTION_TEXT_PLANNER_MAX_TOKENS = "3200";
      process.env.CUSTOMCARD_ALLOW_SMALL_PRODUCTION_PLANNER = "false";
      process.env.CUSTOMCARD_ALLOW_UNKNOWN_PRODUCTION_PLANNER = "false";
      process.env.CUSTOMCARD_COMFYUI_URL = "http://127.0.0.1:8188";
      process.env.CUSTOMCARD_COMFYUI_CHECKPOINT = "sd_xl_turbo_1.0_fp16.safetensors";
      process.env.CLOUDFLARE_ACCOUNT_ID = "disabled";
      process.env.CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN = "disabled";
      process.env.CLOUDFLARE_API_TOKEN = "disabled";

      const result = await runModelBenchmarkLoopFromArgs({
        phase: "local-production-text",
        "local-only": "true",
        "phase-dir": "production-text-workflow",
        "output-dir": outputDir
      });
      const dryRun = JSON.parse(readFileSync(join(outputDir, "production-text-workflow-dry-run.json"), "utf8"));

      expect(result.dryRun).toBe(true);
      expect(dryRun.productionTextPlannerRuntime).toMatchObject({
        adapterId: "local-openai-compatible-chat",
        baseUrl: "http://127.0.0.1:5003/v1",
        model: "koboldcpp/gemma-4-31B-it-Q4_K_M",
        contextTokens: 8192,
        maxOutputTokens: 3200,
        requestTimeoutMs: 1200000,
        classification: "production-suitable",
        productionSuitable: true,
        runAllowed: true,
        allowSmallPlanner: false,
        allowUnknownProductionModel: false,
        blockers: [],
        creativeContract: "full-production-card-copy-json"
      });
      expect(dryRun.productionTextPlannerRuntime.policy).toMatchObject({
        minContextTokens: 8192,
        minOutputTokens: 3200
      });
      expect(dryRun.plannedRuns.map((run: { storyId: string }) => run.storyId)).toEqual(
        productionTextRequestFixtures.map((story) => story.id)
      );
    } finally {
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      rmSync(outputDir, { force: true, recursive: true });
    }
  });

  it("refuses live production-text runs before generation when the local planner is reduced quality", async () => {
    const outputDir = mkdtempSync(join(tmpdir(), "customcard-production-text-bad-planner-"));
    const previousEnv = {
      CUSTOMCARD_LOCAL_LLM_BASE_URL: process.env.CUSTOMCARD_LOCAL_LLM_BASE_URL,
      CUSTOMCARD_LOCAL_LLM_MODEL: process.env.CUSTOMCARD_LOCAL_LLM_MODEL,
      CUSTOMCARD_LOCAL_LLM_REQUEST_TIMEOUT_MS: process.env.CUSTOMCARD_LOCAL_LLM_REQUEST_TIMEOUT_MS,
      CUSTOMCARD_PRODUCTION_TEXT_PLANNER_CONTEXT_TOKENS: process.env.CUSTOMCARD_PRODUCTION_TEXT_PLANNER_CONTEXT_TOKENS,
      CUSTOMCARD_PRODUCTION_TEXT_PLANNER_MAX_TOKENS: process.env.CUSTOMCARD_PRODUCTION_TEXT_PLANNER_MAX_TOKENS,
      CUSTOMCARD_ALLOW_SMALL_PRODUCTION_PLANNER: process.env.CUSTOMCARD_ALLOW_SMALL_PRODUCTION_PLANNER,
      CUSTOMCARD_ALLOW_UNKNOWN_PRODUCTION_PLANNER: process.env.CUSTOMCARD_ALLOW_UNKNOWN_PRODUCTION_PLANNER,
      CUSTOMCARD_COMFYUI_URL: process.env.CUSTOMCARD_COMFYUI_URL,
      CUSTOMCARD_COMFYUI_CHECKPOINT: process.env.CUSTOMCARD_COMFYUI_CHECKPOINT,
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: process.env.CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN,
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN
    };
    try {
      process.env.CUSTOMCARD_LOCAL_LLM_BASE_URL = "http://127.0.0.1:5001/v1";
      process.env.CUSTOMCARD_LOCAL_LLM_MODEL = "koboldcpp/Qwen3-8B-Q4_K_M";
      process.env.CUSTOMCARD_LOCAL_LLM_REQUEST_TIMEOUT_MS = "1200000";
      process.env.CUSTOMCARD_PRODUCTION_TEXT_PLANNER_CONTEXT_TOKENS = "4096";
      process.env.CUSTOMCARD_PRODUCTION_TEXT_PLANNER_MAX_TOKENS = "3200";
      process.env.CUSTOMCARD_ALLOW_SMALL_PRODUCTION_PLANNER = "false";
      process.env.CUSTOMCARD_ALLOW_UNKNOWN_PRODUCTION_PLANNER = "false";
      process.env.CUSTOMCARD_COMFYUI_URL = "http://127.0.0.1:8188";
      process.env.CUSTOMCARD_COMFYUI_CHECKPOINT = "sd_xl_turbo_1.0_fp16.safetensors";
      process.env.CLOUDFLARE_ACCOUNT_ID = "disabled";
      process.env.CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN = "disabled";
      process.env.CLOUDFLARE_API_TOKEN = "disabled";

      await expect(
        runModelBenchmarkLoopFromArgs({
          phase: "local-production-text",
          "local-only": "true",
          "phase-dir": "production-text-workflow",
          "output-dir": outputDir,
          live: "true"
        })
      ).rejects.toThrow(/correct production planner/);
    } finally {
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      rmSync(outputDir, { force: true, recursive: true });
    }
  });

  it("refuses live production-text runs before generation when local planner GPU residency is not proven", async () => {
    const outputDir = mkdtempSync(join(tmpdir(), "customcard-production-text-cpu-planner-"));
    const previousEnv = {
      CUSTOMCARD_LOCAL_LLM_BASE_URL: process.env.CUSTOMCARD_LOCAL_LLM_BASE_URL,
      CUSTOMCARD_LOCAL_LLM_MODEL: process.env.CUSTOMCARD_LOCAL_LLM_MODEL,
      CUSTOMCARD_LOCAL_LLM_REQUEST_TIMEOUT_MS: process.env.CUSTOMCARD_LOCAL_LLM_REQUEST_TIMEOUT_MS,
      CUSTOMCARD_PRODUCTION_TEXT_PLANNER_CONTEXT_TOKENS: process.env.CUSTOMCARD_PRODUCTION_TEXT_PLANNER_CONTEXT_TOKENS,
      CUSTOMCARD_PRODUCTION_TEXT_PLANNER_MAX_TOKENS: process.env.CUSTOMCARD_PRODUCTION_TEXT_PLANNER_MAX_TOKENS,
      CUSTOMCARD_ALLOW_SMALL_PRODUCTION_PLANNER: process.env.CUSTOMCARD_ALLOW_SMALL_PRODUCTION_PLANNER,
      CUSTOMCARD_ALLOW_UNKNOWN_PRODUCTION_PLANNER: process.env.CUSTOMCARD_ALLOW_UNKNOWN_PRODUCTION_PLANNER,
      CUSTOMCARD_COMFYUI_URL: process.env.CUSTOMCARD_COMFYUI_URL,
      CUSTOMCARD_COMFYUI_CHECKPOINT: process.env.CUSTOMCARD_COMFYUI_CHECKPOINT,
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
      CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN: process.env.CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN,
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN
    };
    try {
      process.env.CUSTOMCARD_LOCAL_LLM_BASE_URL = "http://127.0.0.1:5013/v1";
      process.env.CUSTOMCARD_LOCAL_LLM_MODEL = "koboldcpp/gemma-4-31B-it-Q4_K_M";
      process.env.CUSTOMCARD_LOCAL_LLM_REQUEST_TIMEOUT_MS = "1200000";
      process.env.CUSTOMCARD_PRODUCTION_TEXT_PLANNER_CONTEXT_TOKENS = "8192";
      process.env.CUSTOMCARD_PRODUCTION_TEXT_PLANNER_MAX_TOKENS = "3200";
      process.env.CUSTOMCARD_ALLOW_SMALL_PRODUCTION_PLANNER = "false";
      process.env.CUSTOMCARD_ALLOW_UNKNOWN_PRODUCTION_PLANNER = "false";
      process.env.CUSTOMCARD_COMFYUI_URL = "http://127.0.0.1:8188";
      process.env.CUSTOMCARD_COMFYUI_CHECKPOINT = "sd_xl_turbo_1.0_fp16.safetensors";
      process.env.CLOUDFLARE_ACCOUNT_ID = "disabled";
      process.env.CLOUDFLARE_WORKERS_AI_TEXT_API_TOKEN = "disabled";
      process.env.CLOUDFLARE_API_TOKEN = "disabled";

      await expect(
        runModelBenchmarkLoopFromArgs(
          {
            phase: "local-production-text",
            "local-only": "true",
            "phase-dir": "production-text-workflow",
            "output-dir": outputDir,
            live: "true"
          },
          {
            gpuResidencyProbe: () => ({
              required: true,
              ok: false,
              status: "blocked",
              blocker: "Local KoboldCPP planner process does not declare GPU offload flags."
            })
          }
        )
      ).rejects.toThrow(/GPU-backed local planner/);
    } finally {
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      rmSync(outputDir, { force: true, recursive: true });
    }
  });

  it("falls back to a single compositor fixture when no local LLM is configured", () => {
    const runs = localProductionTextRuns({
      text: [],
      image: [
        {
          id: "image-local-comfyui",
          label: "Local ComfyUI",
          adapterId: "local-comfyui-api-image",
          model: "sd_xl_turbo_1.0_fp16.safetensors",
          configured: true
        }
      ]
    });

    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      focus: "local-comfy-production-text-compositor-fixture",
      productionTextMode: "compositor-fixture",
      storyId: productionTextCompositorFixtureSpec.id,
      text: {
        adapterId: "fixture"
      }
    });
    expect(runs[0].story.customer_type).toBe("compositor calibration fixture");
  });

  it("prompts inside-left and inside-right as text-bearing cohesive spread panels", () => {
    const left = buildTypographyExperimentPrompt("mode-c-hybrid-reserved-layout", typographyExperimentSpec, "inside-left");
    const right = buildTypographyExperimentPrompt("mode-c-hybrid-reserved-layout", typographyExperimentSpec, "inside-right");

    expect(left.renderTextInApp).toBe(true);
    expect(right.renderTextInApp).toBe(true);
    expect(left.prompt).toContain("paired as a cohesive opened spread");
    expect(right.prompt).toContain("paired as a cohesive opened spread");
    expect(left.prompt).toContain("paired with inside-right");
    expect(right.prompt).toContain("paired with inside-left");
    expect(left.prompt).not.toContain(typographyExperimentSpec.panels["inside-left"].headline);
    expect(right.prompt).not.toContain(typographyExperimentSpec.panels["inside-right"].body);
  });

  it("makes Mode C text-safe zones explicit and rejects busy motif under copy", () => {
    const front = buildTypographyExperimentPrompt("mode-c-hybrid-reserved-layout", typographyExperimentSpec, "front");
    const left = buildTypographyExperimentPrompt("mode-c-hybrid-reserved-layout", typographyExperimentSpec, "inside-left");
    const right = buildTypographyExperimentPrompt("mode-c-hybrid-reserved-layout", typographyExperimentSpec, "inside-right");

    for (const prompt of [front, left, right]) {
      expect(prompt.prompt).toContain("Text-safe field requirement");
      expect(prompt.prompt).toContain("one continuous opaque plain field");
      expect(prompt.prompt).toContain("flat editorial print-design");
      expect(prompt.prompt).toContain("Do not place sunburst rays");
      expect(prompt.prompt).toContain("Use no sunburst motif");
      expect(prompt.prompt).toContain("no central medallion");
      expect(prompt.prompt).toContain("no ornate frame around copy");
      expect(prompt.prompt).toContain("No people, faces, eyes, hair, bodies, hands, portraits, characters");
      expect(prompt.prompt).not.toContain("5x7 portrait");
      expect(prompt.prompt).toMatch(/no central radial/i);
      expect(prompt.prompt).not.toContain("Motif: Elegant radial sunburst");
      expect(prompt.negativePrompt).toContain("central starburst behind text");
      expect(prompt.negativePrompt).toContain("dense ornament in text area");
      expect(prompt.negativePrompt).toContain("ornate frame around copy");
      expect(prompt.negativePrompt).toContain("fake glyph-like marks");
      expect(prompt.negativePrompt).toContain("stationery supplies");
      expect(prompt.negativePrompt).toContain("rays crossing center");
      expect(prompt.negativePrompt).toContain("portrait");
    }
    expect(front.prompt).toContain("solid deep-charcoal flat print field");
    expect(left.prompt).toContain("solid warm-ivory flat print field");
    expect(left.prompt).toContain("Palette: solid warm ivory only");
    expect(left.negativePrompt).toContain("full-width dark band");
    expect(right.prompt).toContain("solid warm-ivory flat print field");
    expect(right.prompt).toContain("Palette: solid warm ivory only");
    expect(right.negativePrompt).toContain("split color-blocked interior");
  });

  it("keeps model benchmark story coverage broad enough for model and prompt comparisons", () => {
    const expectedStoryIds = [
      "first-time-user-birthday",
      "long-time-user-get-well-friend",
      "b2b-crm-warranty-renewal",
      "distant-relative-wedding",
      "medical-school-graduation",
      "small-business-thank-you",
      "dad-fix-anything",
      "botanical-birthday",
      "funny-bold-type-birthday",
      "simple-minimal-thank-you",
      "sympathy-quiet-support",
      "sentimental-botanical-anniversary"
    ];
    const storyIds = Object.keys(benchmarkStories);

    expect(storyIds).toEqual(expect.arrayContaining(expectedStoryIds));
    expect(new Set(storyIds).size).toBe(storyIds.length);
    expect(storyIds.length).toBeGreaterThanOrEqual(12);
    for (const story of Object.values(benchmarkStories)) {
      expect(story.id).toBeTruthy();
      expect(story.request.personal_note).toBeTruthy();
      expect(story.must_include.length).toBeGreaterThanOrEqual(4);
      expect(story.must_avoid.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("plans all three typography modes against the preferred configured image candidate", () => {
    const runs = typographyExperimentRuns({
      image: [
        {
          id: "image-cloudflare-flux-schnell",
          label: "Cloudflare FLUX.1 Schnell",
          adapterId: "cloudflare-workers-ai-image",
          model: "@cf/black-forest-labs/flux-1-schnell",
          configured: true,
          missingEnv: []
        },
        {
          id: "image-deepai-text2img",
          label: "DeepAI text2img",
          adapterId: "deepai-text2img-image",
          model: "text2img",
          configured: true,
          missingEnv: []
        },
      ],
      text: []
    });

    expect(runs.map((run) => run.typographyMode.id)).toEqual([
      "mode-a-current-overlay",
      "mode-b-full-ai-typography",
      "mode-c-hybrid-reserved-layout"
    ]);
    expect(new Set(runs.map((run) => run.image.id))).toEqual(new Set(["image-deepai-text2img"]));
  });

  it("plans local Comfy typography as the hybrid reserved-layout benchmark", () => {
    const runs = localTypographyRuns({
      image: [
        {
          id: "image-local-comfyui",
          label: "Local ComfyUI checkpoint",
          adapterId: "local-comfyui-api-image",
          model: "sd_xl_base_1.0.safetensors",
          configured: true,
          missingEnv: []
        }
      ],
      text: []
    });

    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      phase: "local-typography",
      focus: "local-comfy-hybrid-typography",
      image: { id: "image-local-comfyui", adapterId: "local-comfyui-api-image" },
      text: { id: "text-none-direct-image-test", adapterId: "none" },
      typographyMode: { id: "mode-c-hybrid-reserved-layout" }
    });
  });

  it("plans product-quality benchmarks through the full card generation pipeline with fixed story input", () => {
    const runs = pipelineQualityRuns({
      image: [
        {
          id: "image-cloudflare-flux-schnell",
          label: "Cloudflare FLUX.1 Schnell",
          adapterId: "cloudflare-workers-ai-image",
          model: "@cf/black-forest-labs/flux-1-schnell",
          configured: true,
          missingEnv: []
        },
        {
          id: "image-deepai-text2img",
          label: "DeepAI text2img",
          adapterId: "deepai-text2img-image",
          model: "text2img",
          configured: true,
          missingEnv: []
        }
      ],
      text: [
        {
          id: "text-cloudflare-baseline",
          label: "Current Cloudflare text baseline",
          adapterId: "cloudflare-workers-ai-chat",
          configured: true,
          missingEnv: []
        },
        {
          id: "text-hf-qwen3-235b-a22b",
          label: "Hugging Face Qwen3 235B A22B Instruct 2507",
          adapterId: "huggingface-chat",
          model: "Qwen/Qwen3-235B-A22B-Instruct-2507",
          configured: true,
          missingEnv: []
        }
      ]
    });

    expect(runs).toHaveLength(4);
    expect(new Set(runs.map((run) => run.text.id))).toEqual(
      new Set(["text-cloudflare-baseline", "text-hf-qwen3-235b-a22b"])
    );
    expect(new Set(runs.map((run) => run.image.id))).toEqual(
      new Set(["image-cloudflare-flux-schnell", "image-deepai-text2img"])
    );
    for (const run of runs) {
      expect(run.phase).toBe("pipeline-quality");
      expect(run.focus).toBe("full-card-quality");
      expect(run.storyId).toBe("sympathy-quiet-support");
      expect(run.story.request.personal_note).toContain("Eli");
      expect(run).not.toHaveProperty("typographyMode");
    }
  });

  it("summarizes typography run status and links relative to the evidence root", () => {
    const readme = buildPhaseReadme({
      phase: "typography",
      createdAtIso: "2026-06-12T16:20:46.017Z",
      outputDir: "docs/evidence/generated-card-comparisons/typography-experiment",
      runs: [
        {
          storyId: typographyExperimentSpec.id,
          textCandidateId: "text-none-direct-image-test",
          imageCandidateId: "image-deepai-text2img",
          typographyModeLabel: "Mode C - hybrid reserved layout",
          panelCount: 4,
          contactSheet:
            `docs/evidence/generated-card-comparisons/typography-experiment/typography/${typographyExperimentSpec.id}__mode-c-hybrid-reserved-layout__image-deepai-text2img/contact-sheet.png`
        }
      ]
    });

    expect(readme).toContain(
      `| ${typographyExperimentSpec.id} / Mode C - hybrid reserved layout / image-deepai-text2img | ok | 4 | [open](typography/${typographyExperimentSpec.id}__mode-c-hybrid-reserved-layout__image-deepai-text2img/contact-sheet.png) |`
    );
    expect(readme).not.toContain("status undefined");
  });

  it("redacts only secret-shaped environment values from benchmark artifacts", () => {
    const sanitized = sanitizeBenchmarkValue(
      {
        prompt: "Return a final production-ready front cover design.",
        token: "secret-value-123"
      },
      {
        NODE_ENV: "production",
        DEEPAI_API_KEY: "secret-value-123"
      }
    );

    expect(sanitized.prompt).toBe("Return a final production-ready front cover design.");
    expect(sanitized.token).toBe("[redacted]");
  });

  it("serializes benchmark FormData request bodies without dropping provider fields", () => {
    const body = new FormData();
    body.set("text", "front panel prompt");
    body.set("negative_prompt", "avoid secret-value-123 and fake text");
    body.set("width", "768");
    body.set("height", "1024");

    const parsed = parseBenchmarkRequestBody(body);
    const sanitized = sanitizeBenchmarkValue(parsed, { DEEPAI_API_KEY: "secret-value-123" });

    expect(sanitized).toEqual({
      body_type: "form-data",
      fields: {
        text: "front panel prompt",
        negative_prompt: "avoid [redacted] and fake text",
        width: "768",
        height: "1024"
      }
    });
  });

  it("builds panel-mapped effective provider request artifacts from final provider calls", () => {
    const effective = buildEffectiveProviderRequests({
      run: {
        phase: "pipeline-quality",
        storyId: "sympathy-quiet-support",
        text: { id: "text-cloudflare-baseline" },
        image: { id: "image-deepai-text2img", adapterId: "deepai-text2img-image", model: "text2img" }
      },
      requestPanelIds: ["front", "inside-left"],
      providerCalls: [
        {
          url: "https://api.cloudflare.com/client/v4/accounts/[redacted]/ai/run/@cf/bytedance/stable-diffusion-xl-lightning",
          method: "POST",
          request: {
            body: {
              prompt: "front provider prompt",
              negative_prompt: "no readable text",
              width: 1464,
              height: 2048,
              seed: 123,
              metadata: { customcard: { panel_id: "front" } }
            }
          },
          response: { status: 200, ok: true, contentType: "application/json" }
        },
        {
          url: "https://api.deepai.org/api/text2img",
          method: "POST",
          request: {
            body: {
              body_type: "form-data",
              fields: {
                text: "inside provider prompt",
                negative_prompt: "no fake text",
                width: "768",
                height: "1024"
              }
            }
          },
          response: { status: 200, ok: true, contentType: "application/json" }
        },
        {
          url: "https://api.deepai.org/job-view-file/example/output.png",
          method: "GET",
          request: {},
          response: { status: 200, ok: true, contentType: "image/png" }
        }
      ]
    });

    expect(effective.requestCount).toBe(2);
    expect(effective.requests.map((request) => request.panelId)).toEqual(["front", "inside-left"]);
    expect(effective.requests[0]).toMatchObject({
      providerPrompt: "front provider prompt",
      providerNegativePrompt: "no readable text",
      seed: 123,
      width: 1464,
      height: 2048,
      responseStatus: 200,
      responseOk: true
    });
    expect(effective.requests[1]).toMatchObject({
      providerPrompt: "inside provider prompt",
      providerNegativePrompt: "no fake text",
      width: "768",
      height: "1024"
    });
  });

  it("extracts local ComfyUI prompt metadata for effective provider request artifacts", () => {
    const effective = buildEffectiveProviderRequests({
      run: {
        phase: "local-typography",
        storyId: typographyExperimentSpec.id,
        text: { id: "text-none-direct-image-test" },
        image: {
          id: "image-local-comfyui",
          adapterId: "local-comfyui-api-image",
          model: "sd_xl_base_1.0.safetensors"
        }
      },
      requestPanelIds: ["front"],
      providerCalls: [
        {
          url: "http://127.0.0.1:8188/prompt",
          method: "POST",
          request: {
            body: {
              prompt: {
                "2": { class_type: "CLIPTextEncode", inputs: { text: "workflow prompt text" } }
              },
              extra_data: {
                customcard: {
                  workflow_id: "customcard-hybrid-reserved-layout",
                  panel_id: "inside-right",
                  seed: 42,
                  inputs: {
                    prompt: "inside-right typography-safe artwork prompt",
                    negative_prompt: "readable text",
                    width: 960,
                    height: 1344
                  }
                }
              }
            }
          },
          response: { status: 200, ok: true, contentType: "application/json" }
        },
        {
          url: "http://127.0.0.1:8188/history/example",
          method: "GET",
          request: {},
          response: { status: 200, ok: true, contentType: "application/json" }
        }
      ]
    });

    expect(effective.requestCount).toBe(1);
    expect(effective.requests[0]).toMatchObject({
      panelId: "inside-right",
      providerPrompt: "inside-right typography-safe artwork prompt",
      providerNegativePrompt: "readable text",
      seed: 42,
      width: 960,
      height: 1344,
      responseStatus: 200,
      responseOk: true
    });
  });

  it("recognizes exact copy metadata in production Comfy text requests", () => {
    const frontCopy = {
      headline: "For Moments That Matter",
      body: "Wishing you strength and peace on your day."
    };
    const requestForPanel = (panelId: string) => ({
      url: "http://127.0.0.1:8188/prompt",
      method: "POST",
      request: {
        body: {
          extra_data: {
            customcard: {
              panel_id: panelId,
              inputs: {
                headline_text: panelId === "front" ? frontCopy.headline : "",
                body_text: panelId === "front" ? frontCopy.body : "",
                artwork_guard: { x: 76, y: 268, width: 806, height: 860 },
                artwork_guard_opacity: 0.74,
                artwork_guard_style: panelId === "back" ? "box" : "panel",
                headline_box: { x: 86, y: 376, width: 788, height: 296 },
                headline_box_background_color: panelId === "front" ? "#111715" : "",
                headline_box_background_radius: panelId === "front" ? 34 : 0,
                headline_box_background_opacity: panelId === "front" ? 0.96 : 0,
                headline_box_background_style: panelId === "front" ? "text-hug" : "box",
                body_box: { x: 106, y: 780, width: 748, height: 403 },
                body_box_background_color: panelId === "front" ? "#111715" : "",
                body_box_background_radius: panelId === "front" ? 34 : 0,
                body_box_background_opacity: panelId === "front" ? 0.96 : 0,
                body_box_background_style: panelId === "front" ? "text-hug" : "box"
              }
            }
          }
        }
      },
      response: { status: 200, ok: true, contentType: "application/json" }
    });
    const autoChecks = productionTextAutoChecks({
      promptPlans: [
        { panelId: "front" },
        { panelId: "inside-left" },
        { panelId: "inside-right" },
        { panelId: "back" }
      ],
      panelCopies: { front: frontCopy },
      providerCalls: ["front", "inside-left", "inside-right", "back"].map(requestForPanel),
      decodedFiles: [
        { buffer: Buffer.from("front") },
        { buffer: Buffer.from("inside-left") },
        { buffer: Buffer.from("inside-right") },
        { buffer: Buffer.from("back") }
      ]
    });

    expect(autoChecks.checks.metadataIncludesExactCopy).toBe(true);
    expect(autoChecks.checks.metadataIncludesSafeBoxes).toBe(true);
    expect(autoChecks.checks.metadataIncludesSafeFieldBackgrounds).toBe(true);
    expect(autoChecks.checks.metadataIncludesSoftSafeFields).toBe(true);
    expect(autoChecks.checks.metadataIncludesArtworkGuards).toBe(true);
  });
});
