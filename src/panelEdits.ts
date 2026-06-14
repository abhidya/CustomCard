import { panelOverflowRisk, type CardDraft, type CardPanel } from "./cardDraft";

/**
 * Panel-level edits to the active draft. The customer edits the exact printed
 * text of one panel; overrides layer on top of whichever draft is active
 * (template or AI) and every downstream artifact is rebuilt from the result.
 */

export type PanelOverride = Partial<
  Pick<
    CardPanel,
    "headline" | "body" | "artDirection" | "imageUrl" | "imagePlacement" | "textLayout" | "textFormat" | "styleId"
  >
>;
export type PanelOverrides = Partial<Record<CardPanel["id"], PanelOverride>>;

export const emptyPanelOverrides: PanelOverrides = {};

export function hasPanelOverride(overrides: PanelOverrides, panelId: CardPanel["id"]): boolean {
  const override = overrides[panelId];
  return Boolean(override && Object.keys(override).length > 0);
}

export function setPanelOverride(
  overrides: PanelOverrides,
  panelId: CardPanel["id"],
  patch: PanelOverride
): PanelOverrides {
  return { ...overrides, [panelId]: { ...overrides[panelId], ...patch } };
}

export function clearPanelOverride(overrides: PanelOverrides, panelId: CardPanel["id"]): PanelOverrides {
  if (!(panelId in overrides)) return overrides;
  const next = { ...overrides };
  delete next[panelId];
  return next;
}

/** Apply panel overrides and recompute print-fit risk for the edited panels. */
export function applyPanelOverrides(draft: CardDraft, overrides: PanelOverrides): CardDraft {
  if (!draft.panels.some((panel) => hasPanelOverride(overrides, panel.id))) return draft;
  return {
    ...draft,
    panels: draft.panels.map((panel) => {
      if (!hasPanelOverride(overrides, panel.id)) return panel;
      const merged = { ...panel, ...overrides[panel.id] };
      return { ...merged, overflowRisk: panelOverflowRisk(merged.headline, merged.body) };
    })
  };
}

/**
 * Deterministic local text transforms. The API only supports whole-card
 * generation (POST /api/ai/card/generate), so per-panel "improve" actions are
 * honest local edits, never fake AI calls.
 */
export type PanelTransformId = "improve" | "shorten" | "warmer" | "simpler" | "less-generic";

export const panelTransformLabels: Record<PanelTransformId, string> = {
  improve: "Improve this panel",
  shorten: "Shorten to fit",
  warmer: "Make warmer",
  simpler: "Make simpler",
  "less-generic": "Make less generic"
};

const templateFillerLines = [
  "Keep it simple, specific, and sincere.",
  "The best details are the small ones you both recognize.",
  "A card is a small thing that says a big thing."
];

const plainerWords: Array<[RegExp, string]> = [
  [/\bunmistakably\b/gi, "clearly"],
  [/\bwholeheartedly\b/gi, "truly"],
  [/\bimmensely\b/gi, "so"],
  [/\butterly\b/gi, ""],
  [/\bmyriad\b/gi, "many"]
];

export function transformPanelBody(transform: PanelTransformId, body: string): string {
  switch (transform) {
    case "shorten":
      return shortenToFit(body);
    case "warmer":
      return makeWarmer(body);
    case "simpler":
      return makeSimpler(body);
    case "less-generic":
      return makeLessGeneric(body);
    case "improve":
      return tidy(body);
  }
}

function splitSentences(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** Trim to the strongest leading sentences until the panel passes print fit. */
function shortenToFit(body: string): string {
  const sentences = splitSentences(body);
  let result = "";
  for (const sentence of sentences) {
    const next = result ? `${result} ${sentence}` : sentence;
    if (result && next.length > 220) break;
    result = next;
  }
  return tidy(result || body.slice(0, 220));
}

function makeWarmer(body: string): string {
  const tidied = tidy(body);
  if (/love|grateful|lucky|glad/i.test(tidied)) return tidied;
  return `${tidied} I'm really glad you're in my life.`;
}

function makeSimpler(body: string): string {
  const sentences = splitSentences(body).slice(0, 2);
  let result = sentences.join(" ");
  for (const [pattern, replacement] of plainerWords) {
    result = result.replace(pattern, replacement);
  }
  return tidy(result.replace(/\s{2,}/g, " "));
}

function makeLessGeneric(body: string): string {
  const sentences = splitSentences(body).filter(
    (sentence) => !templateFillerLines.some((filler) => sentence.toLowerCase() === filler.toLowerCase())
  );
  const result = sentences.join(" ");
  return result ? tidy(result) : tidy(body);
}

function tidy(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return trimmed;
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?…]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}
