import { describe, expect, it } from "vitest";
import {
  buildOpportunity,
  generateCardDraft,
  getDefaultDraftInput,
  parseFreeImport,
  sampleInviteText,
  validateCardDraft
} from "./freeMvp";
import {
  applyPanelOverrides,
  clearPanelOverride,
  emptyPanelOverrides,
  hasPanelOverride,
  setPanelOverride,
  transformPanelBody
} from "./panelEdits";

function buildDraft() {
  const opportunity = buildOpportunity(parseFreeImport(sampleInviteText), [], new Date("2026-06-03T12:00:00.000Z"));
  return generateCardDraft({ ...getDefaultDraftInput(undefined, opportunity), recipient: "Sara", sender: "Maya" }, []);
}

describe("panel overrides", () => {
  it("applies exact panel text edits to the active draft only where edited", () => {
    const draft = buildDraft();
    const overrides = setPanelOverride(emptyPanelOverrides, "inside-right", {
      headline: "Happy anniversary, Sara",
      body: "Ten years of burnt pancakes and you still laugh."
    });

    const active = applyPanelOverrides(draft, overrides);
    const edited = active.panels.find((panel) => panel.id === "inside-right");
    const untouched = active.panels.find((panel) => panel.id === "front");

    expect(edited?.headline).toBe("Happy anniversary, Sara");
    expect(edited?.body).toBe("Ten years of burnt pancakes and you still laugh.");
    expect(untouched).toEqual(draft.panels.find((panel) => panel.id === "front"));
  });

  it("returns the same draft instance when no overrides exist", () => {
    const draft = buildDraft();
    expect(applyPanelOverrides(draft, emptyPanelOverrides)).toBe(draft);
  });

  it("recomputes overflow risk and downstream validation after a panel edit", () => {
    const draft = buildDraft();
    const longBody = "A very long sentence. ".repeat(30);
    const active = applyPanelOverrides(draft, setPanelOverride(emptyPanelOverrides, "inside-right", { body: longBody }));

    expect(active.panels.find((panel) => panel.id === "inside-right")?.overflowRisk).toBe(true);
    expect(validateCardDraft(active).passed).toBe(false);
  });

  it("applies template artwork, placement, and rich text overrides", () => {
    const draft = buildDraft();
    const active = applyPanelOverrides(
      draft,
      setPanelOverride(emptyPanelOverrides, "front", {
        imagePlacement: { frame: "photo-window", focus: "top" },
        imageUrl: "data:image/png;base64,iVBORw0KGgo=",
        textFormat: { headline: { bold: true, accent: true }, body: { italic: true } },
        textLayout: {
          headlineZone: "lower",
          bodyZone: "bottom",
          alignment: "center",
          fontPairing: "serif-sans",
          colorMode: "dark-ink",
          scale: "standard"
        }
      })
    );
    const edited = active.panels.find((panel) => panel.id === "front");

    expect(edited?.imagePlacement).toEqual({ frame: "photo-window", focus: "top" });
    expect(edited?.imageUrl).toBe("data:image/png;base64,iVBORw0KGgo=");
    expect(edited?.textFormat).toMatchObject({ headline: { bold: true, accent: true }, body: { italic: true } });
    expect(edited?.textLayout?.alignment).toBe("center");
  });

  it("clears a panel override so the panel reverts to the active draft copy", () => {
    let overrides = setPanelOverride(emptyPanelOverrides, "front", { headline: "Edited" });
    expect(hasPanelOverride(overrides, "front")).toBe(true);
    overrides = clearPanelOverride(overrides, "front");
    expect(hasPanelOverride(overrides, "front")).toBe(false);
  });
});

describe("deterministic panel text transforms", () => {
  it("shortens long copy to fit a panel", () => {
    const long = "First sentence stays put. Second one also fits fine. ".repeat(8);
    const short = transformPanelBody("shorten", long);
    expect(short.length).toBeLessThanOrEqual(240);
    expect(short).toContain("First sentence stays put.");
  });

  it("warms copy without duplicating warmth that is already there", () => {
    expect(transformPanelBody("warmer", "Congratulations on the new role.")).toContain("glad you're in my life");
    const alreadyWarm = "I'm so grateful for you.";
    expect(transformPanelBody("warmer", alreadyWarm)).toBe(alreadyWarm);
  });

  it("removes template filler when making copy less generic", () => {
    const body = "You did the hard part. Keep it simple, specific, and sincere.";
    expect(transformPanelBody("less-generic", body)).toBe("You did the hard part.");
  });
});
