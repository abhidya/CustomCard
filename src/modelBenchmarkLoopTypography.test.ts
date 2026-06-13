import { describe, expect, it } from "vitest";
import {
  buildPhaseReadme,
  buildTypographyExperimentPrompt,
  pipelineQualityRuns,
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

    expect(prompt.renderTextDeterministically).toBe(false);
    expect(prompt.panelId).toBe("front");
    expect(prompt.prompt).toContain("FINAL PRINT-READY GREETING CARD PANEL");
    expect(prompt.prompt).toContain(typographyExperimentSpec.headline);
    expect(prompt.prompt).toContain(typographyExperimentSpec.body);
    expect(prompt.prompt).toContain("All text must be spelled exactly as provided.");
    expect(prompt.negativePrompt).not.toContain("readable text");
    expect(insideLeft.renderTextDeterministically).toBe(false);
    expect(insideLeft.prompt).toContain(typographyExperimentSpec.panels["inside-left"].headline);
    expect(insideLeft.prompt).toContain(typographyExperimentSpec.panels["inside-left"].body);
    expect(insideRight.renderTextDeterministically).toBe(false);
    expect(insideRight.prompt).toContain(typographyExperimentSpec.panels["inside-right"].headline);
    expect(insideRight.prompt).toContain(typographyExperimentSpec.panels["inside-right"].body);
  });

  it("keeps exact copy out of artwork-only and hybrid prompts for deterministic text panels", () => {
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
      expect(prompt.renderTextDeterministically).toBe(true);
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
      expect(prompt.renderTextDeterministically).toBe(false);
      expect(prompt.prompt).toContain("No card copy belongs on this panel.");
      for (const panel of Object.values(typographyExperimentSpec.panels).filter((candidate) => candidate.headline)) {
        expect(prompt.prompt).not.toContain(panel.headline);
        expect(prompt.prompt).not.toContain(panel.body);
      }
      expect(prompt.negativePrompt).toContain("readable text");
    }
    expect(prompts[2].prompt).toContain("Palette: deep charcoal main field");
    expect(prompts[2].negativePrompt).toContain("ivory wave");
  });

  it("prompts inside-left and inside-right as text-bearing cohesive spread panels", () => {
    const left = buildTypographyExperimentPrompt("mode-c-hybrid-reserved-layout", typographyExperimentSpec, "inside-left");
    const right = buildTypographyExperimentPrompt("mode-c-hybrid-reserved-layout", typographyExperimentSpec, "inside-right");

    expect(left.renderTextDeterministically).toBe(true);
    expect(right.renderTextDeterministically).toBe(true);
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
      expect(prompt.prompt).toContain("Do not place sunburst rays");
      expect(prompt.prompt).toContain("outer-edge or corner sunburst echoes");
      expect(prompt.prompt).toMatch(/no central radial/i);
      expect(prompt.prompt).not.toContain("Motif: Elegant radial sunburst");
      expect(prompt.negativePrompt).toContain("central starburst behind text");
      expect(prompt.negativePrompt).toContain("dense ornament in text area");
      expect(prompt.negativePrompt).toContain("rays crossing center");
    }
    expect(front.prompt).toContain("broad opaque plain deep-charcoal text-safe field");
    expect(left.prompt).toContain("interior writing panel");
    expect(left.prompt).toContain("Palette: warm ivory main sheet");
    expect(left.negativePrompt).toContain("full-width dark band");
    expect(right.prompt).toContain("matching interior message panel");
    expect(right.prompt).toContain("Palette: warm ivory main sheet");
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
        {
          id: "image-browser-svg-renderer",
          label: "Deterministic browser SVG renderer",
          adapterId: "browser-svg-renderer",
          model: "deterministic-svg",
          configured: true,
          missingEnv: []
        }
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

  it("plans product-quality benchmarks through the full card generation pipeline with deterministic story input", () => {
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
        },
        {
          id: "image-browser-svg-renderer",
          label: "Deterministic browser SVG renderer",
          adapterId: "browser-svg-renderer",
          model: "deterministic-svg",
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

    expect(runs).toHaveLength(6);
    expect(new Set(runs.map((run) => run.text.id))).toEqual(
      new Set(["text-cloudflare-baseline", "text-hf-qwen3-235b-a22b"])
    );
    expect(new Set(runs.map((run) => run.image.id))).toEqual(
      new Set(["image-cloudflare-flux-schnell", "image-deepai-text2img", "image-browser-svg-renderer"])
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
});
