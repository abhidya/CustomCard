import type { BenchmarkResultRecord } from "./benchmarkResults";

export const benchmarkResultRecords: BenchmarkResultRecord[] = [
  {
    id: "deepai-fixed-provider-requests-20260614",
    runId: "model-benchmark-20260614-fixed-provider-requests",
    createdAtIso: "2026-06-14T23:42:00.000Z",
    phase: "pipeline-quality",
    storyId: "sympathy-quiet-support",
    status: "succeeded",
    statusCode: 200,
    textCandidateId: "text-cloudflare-baseline",
    textProvider: "cloudflare-workers-ai-chat",
    textModel: "@cf/meta/llama-3.1-8b-instruct-fast",
    imageCandidateId: "image-deepai-text2img",
    imageProvider: "deepai-text2img-image",
    imageModel: "text2img",
    panelCount: 4,
    providerCallCount: 4,
    nativePanelCount: 4,
    productScore: 66,
    contractScore: 94,
    tier: "C+ / rough proof, not customer-ready",
    gradeStatus: "manual",
    aiNotes: [
      "DeepAI native request capture used form-data with negative_prompt, width, height, and image_generator_version.",
      "Provider statuses were 200 for all four panel requests."
    ],
    humanNotes: [
      "Contract quality improved materially after fixing provider request shape.",
      "Visible product remains generic sympathy stationery and should not be customer promoted."
    ],
    blockers: [
      "Generic landscape/card-template feel.",
      "Weak front/back text contrast.",
      "Inside-right tree overlaps the heading area.",
      "Limited practical-care specificity in the artwork."
    ],
    evidence: {
      outputDir: "docs/evidence/generated-card-comparisons/model-benchmark-20260614-fixed-provider-requests",
      summaryPath:
        "docs/evidence/generated-card-comparisons/model-benchmark-20260614-fixed-provider-requests/pipeline-quality-deepai-negative-prompt-summary.json",
      providerHttpPath:
        "docs/evidence/generated-card-comparisons/model-benchmark-20260614-fixed-provider-requests/pipeline-quality-deepai-negative-prompt-provider-http.json",
      runDir:
        "docs/evidence/generated-card-comparisons/model-benchmark-20260614-fixed-provider-requests/pipeline-quality-deepai-negative-prompt/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img",
      manualGradePath:
        "docs/evidence/generated-card-comparisons/model-benchmark-20260614-fixed-provider-requests/pipeline-quality-deepai-negative-prompt/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/manual-grade.md",
      contactSheetPath:
        "docs/evidence/generated-card-comparisons/model-benchmark-20260614-fixed-provider-requests/pipeline-quality-deepai-negative-prompt/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/contact-sheet.png",
      previewPaths: [
        "docs/evidence/generated-card-comparisons/model-benchmark-20260614-fixed-provider-requests/pipeline-quality-deepai-negative-prompt/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/preview-front.png",
        "docs/evidence/generated-card-comparisons/model-benchmark-20260614-fixed-provider-requests/pipeline-quality-deepai-negative-prompt/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/preview-inside-left.png",
        "docs/evidence/generated-card-comparisons/model-benchmark-20260614-fixed-provider-requests/pipeline-quality-deepai-negative-prompt/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/preview-inside-right.png",
        "docs/evidence/generated-card-comparisons/model-benchmark-20260614-fixed-provider-requests/pipeline-quality-deepai-negative-prompt/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/preview-back.png"
      ],
      promptPaths: [
        "docs/evidence/generated-card-comparisons/model-benchmark-20260614-fixed-provider-requests/pipeline-quality-deepai-negative-prompt/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/effective-provider-requests.json"
      ],
      payloadPaths: [
        "docs/evidence/generated-card-comparisons/model-benchmark-20260614-fixed-provider-requests/pipeline-quality-deepai-negative-prompt/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/payload.json",
        "docs/evidence/generated-card-comparisons/model-benchmark-20260614-fixed-provider-requests/pipeline-quality-deepai-negative-prompt/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/run-result.json",
        "docs/evidence/generated-card-comparisons/model-benchmark-20260614-fixed-provider-requests/pipeline-quality-deepai-negative-prompt/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/effective-provider-requests.json"
      ],
      failurePaths: []
    }
  },
  {
    id: "deepai-typography-live-20260614-010736",
    runId: "model-benchmark-20260613-210736-deepai-typography-live",
    createdAtIso: "2026-06-14T01:07:36.597Z",
    phase: "typography",
    storyId: "folded-card-sunburst-typography",
    status: "succeeded",
    statusCode: 200,
    textCandidateId: "text-none-direct-image-test",
    textProvider: "none",
    textModel: "",
    imageCandidateId: "image-deepai-text2img",
    imageProvider: "deepai-text2img-image",
    imageModel: "text2img",
    panelCount: 4,
    providerCallCount: 8,
    nativePanelCount: 4,
    productScore: undefined,
    contractScore: undefined,
    tier: "ungraded",
    gradeStatus: "needs-manual-grade",
    aiNotes: [
      "Auto-checks only prove prompt contract and image materialization.",
      "Typography phase is composition evidence only and must not be product graded."
    ],
    humanNotes: [
      "DeepAI produced native panels, but visible quality is low.",
      "Prompt-contract evidence only; do not promote as customer-ready product quality."
    ],
    blockers: ["Needs manual visual grade.", "Typography phase bypasses full card-copy pipeline."],
    evidence: {
      outputDir: "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210736-deepai-typography-live",
      summaryPath:
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210736-deepai-typography-live/typography-summary.json",
      providerHttpPath:
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210736-deepai-typography-live/typography-provider-http.json",
      runDir:
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210736-deepai-typography-live/typography/folded-card-sunburst-typography__mode-c-hybrid-reserved-layout__image-deepai-text2img",
      contactSheetPath:
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210736-deepai-typography-live/typography/folded-card-sunburst-typography__mode-c-hybrid-reserved-layout__image-deepai-text2img/contact-sheet.png",
      previewPaths: [
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210736-deepai-typography-live/typography/folded-card-sunburst-typography__mode-c-hybrid-reserved-layout__image-deepai-text2img/preview-front.png",
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210736-deepai-typography-live/typography/folded-card-sunburst-typography__mode-c-hybrid-reserved-layout__image-deepai-text2img/preview-inside-left.png",
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210736-deepai-typography-live/typography/folded-card-sunburst-typography__mode-c-hybrid-reserved-layout__image-deepai-text2img/preview-inside-right.png",
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210736-deepai-typography-live/typography/folded-card-sunburst-typography__mode-c-hybrid-reserved-layout__image-deepai-text2img/preview-back.png"
      ],
      promptPaths: [
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210736-deepai-typography-live/typography/folded-card-sunburst-typography__mode-c-hybrid-reserved-layout__image-deepai-text2img/prompt-front.md",
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210736-deepai-typography-live/typography/folded-card-sunburst-typography__mode-c-hybrid-reserved-layout__image-deepai-text2img/prompt-inside-left.md",
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210736-deepai-typography-live/typography/folded-card-sunburst-typography__mode-c-hybrid-reserved-layout__image-deepai-text2img/prompt-inside-right.md",
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210736-deepai-typography-live/typography/folded-card-sunburst-typography__mode-c-hybrid-reserved-layout__image-deepai-text2img/prompt-back.md"
      ],
      payloadPaths: [
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210736-deepai-typography-live/typography-summary.json",
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210736-deepai-typography-live/resolved-flows-before-benchmark.json"
      ],
      failurePaths: []
    }
  },
  {
    id: "deepai-hf-text-live-20260614-010706",
    runId: "model-benchmark-20260613-210706-deepai-hf-text-live",
    createdAtIso: "2026-06-14T01:07:06.521Z",
    phase: "pipeline-quality",
    storyId: "sympathy-quiet-support",
    status: "failed",
    statusCode: 502,
    textCandidateId: "text-hf-qwen3-235b-a22b",
    textProvider: "huggingface-chat",
    textModel: "Qwen/Qwen3-235B-A22B-Instruct-2507",
    imageCandidateId: "image-deepai-text2img",
    imageProvider: "deepai-text2img-image",
    imageModel: "text2img",
    panelCount: 0,
    providerCallCount: 1,
    nativePanelCount: 0,
    tier: "blocked",
    gradeStatus: "failure",
    aiNotes: ["Auto-checks failed because the text provider returned an upstream error before image generation."],
    humanNotes: ["Hugging Face route hit 402 credits depleted; keep as visible route-failure evidence."],
    blockers: ["Hugging Face credits depleted.", "No rendered card exists for this route."],
    evidence: {
      outputDir: "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210706-deepai-hf-text-live",
      summaryPath:
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210706-deepai-hf-text-live/pipeline-quality-summary.json",
      providerHttpPath:
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210706-deepai-hf-text-live/pipeline-quality-provider-http.json",
      runDir:
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210706-deepai-hf-text-live/pipeline-quality/sympathy-quiet-support__text-hf-qwen3-235b-a22b__image-deepai-text2img",
      payloadPaths: [
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210706-deepai-hf-text-live/pipeline-quality/sympathy-quiet-support__text-hf-qwen3-235b-a22b__image-deepai-text2img/payload.json",
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210706-deepai-hf-text-live/pipeline-quality/sympathy-quiet-support__text-hf-qwen3-235b-a22b__image-deepai-text2img/run-result.json"
      ],
      failurePaths: [
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210706-deepai-hf-text-live/pipeline-quality-provider-http.json"
      ],
      previewPaths: [],
      promptPaths: []
    }
  },
  {
    id: "deepai-openai-text-live-20260614-010508",
    runId: "model-benchmark-20260613-210508-deepai-openai-text-live",
    createdAtIso: "2026-06-14T01:05:08.651Z",
    phase: "pipeline-quality",
    storyId: "sympathy-quiet-support",
    status: "failed",
    statusCode: 503,
    textCandidateId: "text-openai-baseline",
    textProvider: "openai-responses-chat",
    textModel: "gpt-4o-mini",
    imageCandidateId: "image-deepai-text2img",
    imageProvider: "deepai-text2img-image",
    imageModel: "text2img",
    panelCount: 0,
    providerCallCount: 0,
    nativePanelCount: 0,
    tier: "blocked",
    gradeStatus: "failure",
    aiNotes: ["Auto-checks failed because the OpenAI route was not configured."],
    humanNotes: ["OpenAI key was placeholder or missing; keep this as auth-blocker evidence."],
    blockers: ["OpenAI API key missing.", "No provider call or rendered card exists."],
    evidence: {
      outputDir: "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210508-deepai-openai-text-live",
      summaryPath:
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210508-deepai-openai-text-live/pipeline-quality-summary.json",
      providerHttpPath:
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210508-deepai-openai-text-live/pipeline-quality-provider-http.json",
      runDir:
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210508-deepai-openai-text-live/pipeline-quality/sympathy-quiet-support__text-openai-baseline__image-deepai-text2img",
      payloadPaths: [
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210508-deepai-openai-text-live/pipeline-quality/sympathy-quiet-support__text-openai-baseline__image-deepai-text2img/payload.json",
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210508-deepai-openai-text-live/pipeline-quality/sympathy-quiet-support__text-openai-baseline__image-deepai-text2img/run-result.json"
      ],
      failurePaths: [
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210508-deepai-openai-text-live/pipeline-quality-summary.json"
      ],
      previewPaths: [],
      promptPaths: []
    }
  },
  {
    id: "deepai-cloudflare-text-failure-20260614-010413",
    runId: "model-benchmark-20260613-210412-deepai-live",
    createdAtIso: "2026-06-14T01:04:13.074Z",
    phase: "pipeline-quality",
    storyId: "sympathy-quiet-support",
    status: "failed",
    statusCode: 502,
    textCandidateId: "text-cloudflare-baseline",
    textProvider: "cloudflare-workers-ai-chat",
    textModel: "@cf/meta/llama-3.1-8b-instruct-fast",
    imageCandidateId: "image-deepai-text2img",
    imageProvider: "deepai-text2img-image",
    imageModel: "text2img",
    panelCount: 0,
    providerCallCount: 1,
    nativePanelCount: 0,
    tier: "blocked",
    gradeStatus: "failure",
    aiNotes: ["Auto-checks show no provider-failure-free card and no required-term coverage."],
    humanNotes: ["Cloudflare text returned 429 before DeepAI image generation; failure remains visible."],
    blockers: ["Cloudflare text quota/rate gate hit 429.", "No rendered card exists for this run."],
    evidence: {
      outputDir: "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210412-deepai-live",
      summaryPath:
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210412-deepai-live/pipeline-quality-summary.json",
      providerHttpPath:
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210412-deepai-live/pipeline-quality-provider-http.json",
      runDir:
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210412-deepai-live/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img",
      payloadPaths: [
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210412-deepai-live/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/payload.json",
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210412-deepai-live/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/run-result.json",
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210412-deepai-live/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/request.json"
      ],
      failurePaths: [
        "docs/evidence/generated-card-comparisons/model-benchmark-20260613-210412-deepai-live/pipeline-quality-provider-http.json"
      ],
      previewPaths: [],
      promptPaths: []
    }
  },
  {
    id: "cloudflare-deepai-prompt-repair-v6-20260613",
    runId: "pipeline-quality-sympathy-cloudflare-improved-v6-2026-06-13",
    createdAtIso: "2026-06-13T21:18:00.000Z",
    phase: "pipeline-quality",
    storyId: "sympathy-quiet-support",
    status: "succeeded",
    statusCode: 200,
    textCandidateId: "text-cloudflare-baseline",
    textProvider: "cloudflare-workers-ai-chat",
    textModel: "@cf/meta/llama-3.1-8b-instruct-fast",
    imageCandidateId: "image-deepai-text2img",
    imageProvider: "deepai-text2img-image",
    imageModel: "text2img",
    panelCount: 4,
    providerCallCount: 8,
    nativePanelCount: 4,
    productScore: 45,
    contractScore: 86,
    tier: "D",
    gradeStatus: "manual",
    aiNotes: ["Auto-checks passed for four panels, required terms, and provider success."],
    humanNotes: [
      "Visible product remains low quality despite contract repair.",
      "Front lacks a commercial visual hook and multiple panels read like placeholder stationery."
    ],
    blockers: [
      "Needs a full visual hierarchy/art redo before customer-facing use.",
      "DeepAI quality remains below the visible product gate."
    ],
    evidence: {
      outputDir: "docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-improved-v6-2026-06-13",
      summaryPath:
        "docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-improved-v6-2026-06-13/pipeline-quality-summary.json",
      providerHttpPath:
        "docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-improved-v6-2026-06-13/pipeline-quality-provider-http.json",
      runDir:
        "docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-improved-v6-2026-06-13/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img",
      manualGradePath:
        "docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-improved-v6-2026-06-13/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/manual-grade.md",
      contactSheetPath:
        "docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-improved-v6-2026-06-13/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/contact-sheet.png",
      previewPaths: [
        "docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-improved-v6-2026-06-13/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/preview-front.png",
        "docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-improved-v6-2026-06-13/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/preview-inside-left.png",
        "docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-improved-v6-2026-06-13/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/preview-inside-right.png",
        "docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-improved-v6-2026-06-13/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/preview-back.png"
      ],
      promptPaths: [
        "docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-improved-v6-2026-06-13/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/run-config.json"
      ],
      payloadPaths: [
        "docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-improved-v6-2026-06-13/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/payload.json",
        "docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-improved-v6-2026-06-13/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/run-result.json",
        "docs/evidence/generated-card-comparisons/pipeline-quality-sympathy-cloudflare-improved-v6-2026-06-13/pipeline-quality/sympathy-quiet-support__text-cloudflare-baseline__image-deepai-text2img/auto-checks.json"
      ],
      failurePaths: []
    }
  }
];
