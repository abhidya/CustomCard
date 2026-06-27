import { describe, expect, it } from "vitest";
import { buildAiGenerationJobEvidence, prependAiGenerationJob } from "./aiGenerationJobs";
import { buildOpportunity, generateCardDraft, getDefaultDraftInput, parseFreeImport } from "./customerWorkflow";

const draft = generateCardDraft(
  {
    ...getDefaultDraftInput(
      undefined,
      buildOpportunity(parseFreeImport("Sara thank-you on 2026-06-11"), [], new Date("2026-06-11T12:00:00.000Z"))
    ),
    sender: "Manny",
    recipient: "Sara",
    occasion: "thank-you for supporting a small business",
    personalNote: "Keep it warm and polished."
  },
  []
);

describe("AI generation job evidence", () => {
  it("captures prompts and generated panels without exposing token-shaped text", () => {
    const job = buildAiGenerationJobEvidence({
      draft,
      now: new Date("2026-06-11T13:00:00.000Z"),
      result: {
        draft_id: "draft-small-business",
        generated_by: "ai-text-and-image",
        card_copy: {
          panels: [
            {
              id: "front",
              headline: "Grateful for You",
              body: "Thanks for choosing us.",
              art_direction: "Warm citrus and local-shop texture.",
              visual_cue: "Warm citrus cover with editorial negative space and a clean lower text-safe area.",
              text_layout: {
                headline_zone: "upper",
                body_zone: "lower",
                alignment: "center",
                font_pairing: "serif-sans",
                color_mode: "dark-ink",
                scale: "standard"
              },
              image_prompt:
                "Flat citrus pattern. CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN=test-only-token should not appear.",
              image_negative_prompt: "readable text, logos"
            }
          ]
        },
        images: [
          {
            panel_id: "front",
            image_url: "data:image/png;base64,AAAA",
            revised_prompt: "Flat citrus pattern with authorization: test-only-secret removed.",
            width: 1500,
            height: 2100
          }
        ],
        ai_flow: {
          card_copy: {
            adapter_id: "cloudflare-workers-ai-text",
            model: "@cf/meta/llama-3.1-8b-instruct-fast"
          },
          card_image: {
            adapter_id: "cloudflare-workers-ai-image",
            model: "@cf/bytedance/stable-diffusion-xl-lightning",
            provider_failure: "none"
          }
        }
      }
    });

    const serialized = JSON.stringify(job);

    expect(job.status).toBe("partial");
    expect(job.imageCount).toBe(1);
    expect(job.panels[0]).toMatchObject({
      panelId: "front",
      headline: "Grateful for You",
      status: "generated",
      width: 1500,
      height: 2100
    });
    expect(job.panels[0].imagePrompt).toContain("Flat citrus pattern");
    expect(job.panels[0].visualCue).toContain("Warm citrus cover");
    expect(job.panels[0].textLayout).toMatchObject({ headlineZone: "upper", bodyZone: "lower" });
    expect(job.panels[0].revisedPrompt).toContain("authorization=<redacted>");
    expect(serialized).not.toContain("test-only-token");
    expect(serialized).not.toContain("test-only-secret");
  });

  it("records queued admissions before provider results are ready", () => {
    const job = buildAiGenerationJobEvidence({
      draft,
      now: new Date("2026-06-11T13:05:00.000Z"),
      result: {
        status: "queued",
        job_id: "job-ai-card-1",
        queue_status: "queued",
        job_status_url: "/api/ai/jobs/status?job_id=job-ai-card-1",
        result_available: false
      }
    });

    expect(job).toMatchObject({
      id: "job-ai-card-1",
      draftId: draft.id,
      status: "queued",
      queueStatus: "queued",
      jobStatusUrl: "/api/ai/jobs/status?job_id=job-ai-card-1",
      generatedBy: "queued-worker",
      copyProvider: "pending",
      imageProvider: "pending",
      imageCount: 0,
      panelCount: draft.panels.length
    });
    expect(job.panels.every((panel) => panel.status === "queued")).toBe(true);
  });

  it("replaces the queued admission when the same provider job completes", () => {
    const queuedJob = buildAiGenerationJobEvidence({
      draft,
      now: new Date("2026-06-11T13:05:00.000Z"),
      result: {
        status: "queued",
        job_id: "job-ai-card-1",
        queue_status: "queued",
        job_status_url: "/api/ai/jobs/status?job_id=job-ai-card-1",
        result_available: false
      }
    });
    const completedJob = buildAiGenerationJobEvidence({
      draft,
      now: new Date("2026-06-11T13:06:00.000Z"),
      result: {
        job_id: "job-ai-card-1",
        queue_status: "succeeded",
        draft_id: "draft-small-business",
        generated_by: "ai-text-and-image",
        card_copy: {
          panels: [{ id: "front", headline: "Done", body: "Ready for review." }]
        },
        images: [{ panel_id: "front", image_url: "data:image/png;base64,AAAA" }]
      }
    });

    const next = prependAiGenerationJob([queuedJob], completedJob, 10);

    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({
      id: "job-ai-card-1",
      status: "partial",
      imageCount: 1,
      draftId: "draft-small-business"
    });
  });

  it("keeps only the most recent generation jobs", () => {
    const jobs = Array.from({ length: 4 }, (_, index) =>
      buildAiGenerationJobEvidence({
        draft,
        now: new Date(Date.UTC(2026, 5, 11, 13, index, 0)),
        result: { draft_id: `draft-${index}`, images: [], card_copy: { panels: [] } }
      })
    );

    const next = prependAiGenerationJob(jobs, {
      ...jobs[0],
      id: "latest",
      draftId: "latest"
    }, 3);

    expect(next.map((job) => job.draftId)).toEqual(["latest", "draft-0", "draft-1"]);
  });
});
