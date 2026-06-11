import { describe, expect, it } from "vitest";
import { evaluateCardCopy } from "../scripts/card-copy-benchmark.mjs";

const request = {
  sender: "Manny",
  recipient: "Sara",
  relationship: "friend",
  occasion: "birthday",
  tone: "warm, grateful, relaxed",
  style: "botanical watercolor, morning light, cream paper, deep green accents",
  language: "English",
  personal_note: "She loves morning hikes, coffee, and the fern by her kitchen window.",
  memory_notes: [
    "She keeps a fern by the kitchen window.",
    "She loves morning hikes and tiny trail flowers."
  ]
};

const negativePrompt =
  "readable text, fake text, letters, people, face, portrait, hands, folded card mockup, physical card mockup, tabletop scene, product photo";

function richPanel(id: string, body: string) {
  return {
    id,
    headline: id === "front" ? "For Sara" : id === "back" ? "CustomCard" : id === "inside-left" ? "Morning light" : "With love",
    body,
    art_direction:
      id === "front" || id === "back"
        ? "Coordinated botanical layout with safe margin, cream palette, delicate border ornament, app typography area, and matching front/back visual rhythm."
        : "Coordinated inside spread layout with safe margin, deep green palette, corner ornament, centered app typography space, and matching inside panel rhythm.",
    image_prompt:
      `Premium 5x7 vertical flat 2D full-bleed print panel artwork for the ${id} panel, botanical watercolor fern motifs, cream paper texture, deep green accents, morning-light palette, elegant border spacing, clean text-safe center for app overlay, coordinated with the matching panel, no readable text, no words, no letters, no logos, no watermark, no people, no hands, no mockup.`,
    image_negative_prompt: negativePrompt
  };
}

describe("card-copy benchmark evaluation", () => {
  it("passes rich theme, layout, and content output", () => {
    const cardCopy = {
      panels: [
        richPanel("front", "A botanical birthday note made with morning light."),
        richPanel(
          "inside-left",
          "I hope today feels unhurried and bright, like the first quiet steps of a favorite trail. May the little things you notice, from coffee steam to tiny flowers, make the whole day feel gently yours."
        ),
        richPanel(
          "inside-right",
          "Your way of finding beauty in small living things always stays with me. I thought of the fern by your kitchen window and all the morning hikes that make ordinary days feel open again. Wishing you a year with more tiny wonders, good coffee, and easy laughter. With love, Manny."
        ),
        richPanel("back", "Made for Sara with CustomCard.")
      ],
      memory_citations: ["She keeps a fern by the kitchen window."]
    };

    const evaluation = evaluateCardCopy({ cardCopy, request });

    expect(evaluation.passed).toBe(true);
    expect(evaluation.score).toBeGreaterThanOrEqual(82);
    expect(evaluation.blockers).toEqual([]);
  });

  it("fails terse inside copy", () => {
    const cardCopy = {
      panels: [
        richPanel("front", "Happy birthday."),
        richPanel("inside-left", "Hope today is nice."),
        richPanel("inside-right", "Wishing you a good year."),
        richPanel("back", "CustomCard.")
      ],
      memory_citations: ["She keeps a fern by the kitchen window."]
    };

    const evaluation = evaluateCardCopy({ cardCopy, request });

    expect(evaluation.passed).toBe(false);
    expect(evaluation.blockers.join(" ")).toContain("terse");
  });
});
