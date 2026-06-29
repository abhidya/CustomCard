import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runProductionTextPlannerThroughputProbe } from "../scripts/production-text-planner-throughput-probe.mjs";

function modelsResponse(model: string) {
  return new Response(JSON.stringify({ data: [{ id: model }] }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function chatResponse(content: unknown, finishReason = "stop") {
  return new Response(JSON.stringify({
    choices: [
      {
        finish_reason: finishReason,
        message: {
          content: typeof content === "string" ? content : JSON.stringify(content)
        }
      }
    ]
  }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function gpuResidencyProbe() {
  return {
    required: true,
    ok: true,
    status: "gpu-backed",
    pids: [1234],
    nvidiaProcessIds: [1234]
  };
}

function fullCardCopy() {
  const panels = [
    {
      id: "front",
      headline: "Happy Birthday Nina",
      body: "A quiet aquarium birthday glow for someone who notices every tiny fish.",
      art_direction: "Elegant front cover with aquarium light and open lower typography space.",
      visual_cue: "Freshwater aquarium plants, tiny fish path, warm paper edge, clean text-safe area.",
      text_layout: { headline_zone: "upper", body_zone: "lower", alignment: "center", font_pairing: "soft-serif", color_mode: "dark-ink", scale: "standard" },
      image_prompt: "Premium 5x7 vertical flat print panel artwork, aquarium birthday stillness, tiny fish, aquatic plants, clean text-safe space.",
      image_negative_prompt: "readable text, fake text, letters, people, face, portrait, hands, folded card mockup, physical card mockup, tabletop scene, product photo"
    },
    {
      id: "inside-left",
      headline: "Little Ripples",
      body: "May the day feel calm, bright, and cared for, the way a healthy tank settles when everything is in balance.",
      art_direction: "Light interior panel with sparse aquarium border and quiet center.",
      visual_cue: "Pale freshwater wash with aquatic plant edge detail and clean text-safe center.",
      text_layout: { headline_zone: "upper", body_zone: "center", alignment: "center", font_pairing: "soft-serif", color_mode: "dark-ink", scale: "standard" },
      image_prompt: "Premium 5x7 vertical flat print panel artwork, pale freshwater interior, aquatic plant border, clean text-safe space.",
      image_negative_prompt: "readable text, fake text, letters, people, face, portrait, hands, folded card mockup, physical card mockup, tabletop scene, product photo"
    },
    {
      id: "inside-right",
      headline: "For A Gentle Year",
      body: "I hope this birthday brings you the same quiet joy you give that little underwater world: patient care, small details, and light that keeps finding its way through.",
      art_direction: "Matching interior with ripple detail and generous message field.",
      visual_cue: "Soft ripple line, tiny fish accent, warm ivory paper, broad clean text-safe space.",
      text_layout: { headline_zone: "upper", body_zone: "center", alignment: "center", font_pairing: "serif-sans", color_mode: "dark-ink", scale: "standard" },
      image_prompt: "Premium 5x7 vertical flat print panel artwork, aquarium ripple interior, tiny fish accent, clean text-safe space.",
      image_negative_prompt: "readable text, fake text, letters, people, face, portrait, hands, folded card mockup, physical card mockup, tabletop scene, product photo"
    },
    {
      id: "back",
      headline: "For Nina",
      body: "A birthday note with one small aquarium shimmer.",
      art_direction: "Minimal back panel with one coordinating fish mark.",
      visual_cue: "Mostly negative space with a tiny ripple mark and warm paper texture.",
      text_layout: { headline_zone: "lower", body_zone: "bottom", alignment: "center", font_pairing: "minimal-sans", color_mode: "dark-ink", scale: "compact" },
      image_prompt: "Premium 5x7 vertical flat print panel artwork, minimal back mark, aquarium ripple, clean text-safe space.",
      image_negative_prompt: "readable text, fake text, letters, people, face, portrait, hands, folded card mockup, physical card mockup, tabletop scene, product photo"
    }
  ];
  return {
    theme_guide: {
      theme_title: "Aquarium Birthday Stillness",
      palette: ["freshwater blue", "plant green", "warm ivory"],
      motifs: ["aquarium shimmer", "tiny fish", "aquatic plant"],
      border_style: "Sparse aquarium border with text-safe space.",
      front_back_pairing: "Front carries aquarium shimmer; back repeats one small ripple.",
      interior_pairing: "Interior panels share pale water and quiet center fields."
    },
    panels,
    memory_citations: ["Nina loves aquariums."]
  };
}

describe("production text planner throughput probe", () => {
  it("passes when a GPU-backed production planner completes the full card-copy prompt", async () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-planner-throughput-ready-"));
    const model = "koboldcpp/Magistral-Small-2509-Q4_K_M";
    const fetchImpl = async (url: string) => String(url).endsWith("/models")
      ? modelsResponse(model)
      : chatResponse(fullCardCopy());

    const report = await runProductionTextPlannerThroughputProbe(
      {
        "base-url": "http://127.0.0.1:5013/v1",
        model,
        "reported-context-tokens": "8192",
        "max-output-tokens": "4096",
        "output-dir": root
      },
      { fetchImpl, gpuResidencyProbe }
    );

    expect(report.status).toBe("throughput-ready");
    expect(report.throughputReady).toBe(true);
    expect(report.localGpuResidency).toMatchObject({ required: true, ok: true });
    expect(report.jsonParseOk).toBe(true);
    expect(report.missingMustInclude).toEqual([]);
    expect(report.mustAvoidFailures).toEqual([]);
    expect(report.nextSteps.join("\n")).toContain("full production-text matrix");
  });

  it("blocks finish_reason length instead of reducing the creative contract", async () => {
    const root = mkdtempSync(join(tmpdir(), "production-text-planner-throughput-length-"));
    const model = "koboldcpp/Magistral-Small-2509-Q4_K_M";
    const fetchImpl = async (url: string) => String(url).endsWith("/models")
      ? modelsResponse(model)
      : chatResponse("{\"theme_guide\":", "length");

    const report = await runProductionTextPlannerThroughputProbe(
      {
        "base-url": "http://127.0.0.1:5013/v1",
        model,
        "reported-context-tokens": "8192",
        "max-output-tokens": "4096",
        "output-dir": root
      },
      { fetchImpl, gpuResidencyProbe }
    );

    expect(report.status).toBe("blocked");
    expect(report.throughputReady).toBe(false);
    expect(report.blockers.join("\n")).toContain("finish_reason=length");
    expect(report.nextSteps.join("\n")).toContain("do not reduce");
  });
});
