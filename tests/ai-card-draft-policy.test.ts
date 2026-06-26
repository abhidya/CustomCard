import { describe, expect, it } from "vitest";
import {
  buildCardCopyPrompt,
  buildCardCopyResponseFormat,
  panelDefaults,
  requiredPanelIds
} from "../scripts/ai-card-draft-policy.mjs";

describe("AI card draft policy", () => {
  it("owns the four-panel copy prompt and structured response schema", () => {
    const input = {
      sender: "Manny",
      recipient: "Sara",
      relationship: "friend",
      occasion: "sympathy",
      tone: "quiet support",
      style: "minimal",
      language: "English",
      personal_note: "Meals, rides, calls, and silence all count.",
      memory_notes: []
    };
    const prompt = JSON.parse(buildCardCopyPrompt(input));
    const responseFormat = buildCardCopyResponseFormat({ primaryAdapterId: "openai-responses-chat" });

    expect(requiredPanelIds).toEqual(["front", "inside-left", "inside-right", "back"]);
    expect(prompt.required_schema.panels.map((panel: { id: string }) => panel.id)).toEqual(requiredPanelIds);
    expect(prompt.copy_requirements.join(" ")).toContain("Preserve exact concrete facts");
    expect(prompt.image_prompt_requirements.join(" ")).toContain("Do not ask the image model to render the headline or body");
    expect(responseFormat).toMatchObject({
      type: "json_schema",
      json_schema: {
        required: ["theme_guide", "panels", "memory_citations"],
        properties: {
          panels: {
            items: {
              properties: {
                id: { enum: requiredPanelIds }
              }
            }
          }
        }
      }
    });
    expect(panelDefaults.front.image_prompt).toContain("Full-bleed flat 2D artwork layer");
  });
});
