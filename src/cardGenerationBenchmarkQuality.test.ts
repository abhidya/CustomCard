import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  cardGenerationBenchmarkFixtures,
  evaluateBenchmarkQuality
} from "../scripts/card-generation-benchmark.mjs";

const medicalFixture = cardGenerationBenchmarkFixtures["medical-graduation"];
const smallBusinessFixture = cardGenerationBenchmarkFixtures["small-business-thank-you"];
const tempDirs: string[] = [];

function panelPrompts(prompt: string) {
  return ["front", "inside-left", "inside-right", "back"].map((panelId) => ({
    panelId,
    prompt,
    providerFile: `provider-${panelId}.png`,
    previewFile: `preview-${panelId}.png`
  }));
}

function writeSvgPanelFiles({
  theme,
  hero,
  backgrounds,
  extraByPanel = {}
}: {
  theme: string;
  hero: string;
  backgrounds: Record<string, string>;
  extraByPanel?: Record<string, string>;
}) {
  const tempDir = join(".tmp", `card-generation-quality-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tempDir, { recursive: true });
  tempDirs.push(tempDir);
  return ["front", "inside-left", "inside-right", "back"].map((panelId) => {
    const providerFile = join(tempDir, `provider-${panelId}.svg`);
    writeFileSync(
      providerFile,
      `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="2100" data-customcard-theme="${theme}"><rect width="1500" height="2100" fill="${backgrounds[panelId] || backgrounds.default}"/><g data-customcard-hero="${hero}"></g>${extraByPanel[panelId] || ""}</svg>`
    );
    return {
      panelId,
      prompt:
        "Warm small-business thank-you stationery with controlled citrus-and-leaf corner arrangement, editorial negative space, not busy repeated fruit, no text box, clean text-safe area.",
      providerFile,
      previewFile: `preview-${panelId}.png`
    };
  });
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("card generation benchmark quality targets", () => {
  it("fails medical cards that regress into generic or third-person milestone copy", () => {
    const quality = evaluateBenchmarkQuality({
      fixture: medicalFixture,
      payload: {
        card_copy: {
          panels: [
            {
              id: "front",
              headline: "From Dream to Doctor",
              body: "For every late night, long shift, and quiet sacrifice that brought you here."
            },
            {
              id: "inside-left",
              headline: "Congratulations, Doctor!",
              body: "You kept going through exams, late nights, long shifts, and sacrifices."
            },
            {
              id: "inside-right",
              headline: "A Journey of Discipline and Heart",
              body: "He pushed through years of exams, late nights, long shifts, and sacrifices. His dedication made us proud."
            },
            {
              id: "back",
              headline: "From Dream to Doctor",
              body: "With pride, love, and deep respect for the doctor you worked so hard to become."
            }
          ]
        }
      },
      panelFiles: panelPrompts(
        "Elegant medical-school graduation artwork: deep navy and soft gold, one white coat plus graduation cap and stethoscope hero composition; interiors use ivory note-sheet field; never dense repeated medical icons; clean text-safe area."
      )
    });

    expect(quality.status).toBe("needs-improvement");
    expect(quality.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "copy.forbidden.congratulations-doctor",
          passed: false
        }),
        expect.objectContaining({
          evidence: "He pushed",
          passed: false
        })
      ])
    );
  });

  it("passes a medical target hit with direct copy and reference-style prompt anchors", () => {
    const quality = evaluateBenchmarkQuality({
      fixture: medicalFixture,
      payload: {
        card_copy: {
          panels: [
            {
              id: "front",
              headline: "From Dream to Doctor",
              body: "For every late night, long shift, and quiet sacrifice that brought you here."
            },
            {
              id: "inside-left",
              headline: "Years In The Making",
              body: "You kept going through exams, late nights, long shifts, and the sacrifices most people never saw."
            },
            {
              id: "inside-right",
              headline: "With So Much Pride",
              body: "We are proud of the patience, heart, and dedication that brought you here."
            },
            {
              id: "back",
              headline: "From Dream to Doctor",
              body: "With pride, love, and deep respect for the doctor you worked so hard to become."
            }
          ]
        }
      },
      panelFiles: panelPrompts(
        "Elegant medical-school graduation artwork: deep navy and soft gold, one white coat plus graduation cap and stethoscope hero composition; interiors use ivory note-sheet field, thin gold border, lower ECG, one stethoscope corner; never dense repeated medical icons; no caption plaque; clean text-safe area."
      )
    });

    expect(quality.status).toBe("pass");
    expect(quality.score).toBeGreaterThanOrEqual(medicalFixture.qualityTarget.passScore);
  });

  it("fails small-business cards with dark interiors or template plaque SVG geometry", () => {
    const quality = evaluateBenchmarkQuality({
      fixture: smallBusinessFixture,
      payload: {
        card_copy: {
          panels: [
            {
              id: "front",
              headline: "Thank you for choosing local",
              body: "Your support keeps independent work personal, human, and close to home."
            },
            {
              id: "inside-left",
              headline: "Because You Chose Us",
              body: "You chose an independent small business when there were bigger options. That choice matters."
            },
            {
              id: "inside-right",
              headline: "With Real Gratitude",
              body: "Thank you for being part of the community around this little business. Every bit of trust helps make the work feel possible."
            },
            {
              id: "back",
              headline: "With Thanks",
              body: "Made with gratitude for customers who choose small."
            }
          ]
        }
      },
      panelFiles: writeSvgPanelFiles({
        theme: "citrus",
        hero: "citrus",
        backgrounds: {
          default: "#0f3d3f",
          "inside-left": "#0f3d3f",
          "inside-right": "#fffaf0"
        },
        extraByPanel: {
          "inside-left": '<rect x="240" y="430" width="1020" height="1240" rx="34" fill="#fffdf7" opacity="0.16"/>'
        }
      })
    });

    expect(quality.status).toBe("needs-improvement");
    expect(quality.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "svg.inside-left.background",
          passed: false
        }),
        expect.objectContaining({
          id: expect.stringContaining("svg.inside-left.forbidden"),
          passed: false
        })
      ])
    );
  });
});
