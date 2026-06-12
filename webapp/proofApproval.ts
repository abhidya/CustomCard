import type { CardDraft, CardPanel } from "../src/customerWorkflow";

/**
 * Proof approval policy: the customer must explicitly confirm every panel of
 * the 2D print proof before the Walgreens checkout unlocks. The proof view is
 * the source of truth for what prints; this checklist is the human gate.
 */

export interface ProofChecklistItem {
  id: ProofChecklistItemId;
  label: string;
}

export type ProofChecklistItemId =
  | "panel-front"
  | "panel-inside-left"
  | "panel-inside-right"
  | "panel-back"
  | "names"
  | "crop"
  | "approve";

export const proofChecklistItems: ProofChecklistItem[] = [
  { id: "panel-front", label: "Front reviewed" },
  { id: "panel-inside-left", label: "Inside left reviewed" },
  { id: "panel-inside-right", label: "Inside right reviewed" },
  { id: "panel-back", label: "Back reviewed" },
  { id: "names", label: "Names, spelling, and tone are approved" },
  { id: "crop", label: "Crop and safe area reviewed" },
  { id: "approve", label: "I approve this proof for printing" }
];

export type ProofChecklistState = Partial<Record<ProofChecklistItemId, boolean>>;

export const emptyProofChecklistState: ProofChecklistState = {};

export function toggleProofChecklistItem(
  state: ProofChecklistState,
  id: ProofChecklistItemId
): ProofChecklistState {
  return { ...state, [id]: !state[id] };
}

export function isProofApproved(state: ProofChecklistState): boolean {
  return proofChecklistItems.every((item) => state[item.id] === true);
}

export function proofApprovalProgressLabel(state: ProofChecklistState): string {
  const checked = proofChecklistItems.filter((item) => state[item.id] === true).length;
  if (checked === proofChecklistItems.length) return "Proof approved";
  return `${checked} of ${proofChecklistItems.length} checks done`;
}

/**
 * Approval is tied to exactly what would print. Any change to panel text, art
 * direction, artwork, layout/style, direction, fit, order, or how the draft
 * was generated produces a new signature and resets the checklist.
 */
export function buildProofSignature(draft: Pick<CardDraft, "generatedBy" | "panels"> & { input?: { style?: string } }): string {
  const panelSignature = draft.panels
    .map((panel) => buildPanelProofSignature(panel))
    .join("~");
  return [draft.generatedBy, draft.input?.style ?? "", panelSignature].join("::");
}

function buildPanelProofSignature(panel: CardPanel): string {
  return [
    panel.id,
    panel.headline,
    panel.body,
    panel.artDirection,
    panel.imageUrl ?? "",
    panel.styleId ?? "",
    panel.rtl ? "rtl" : "ltr",
    panel.overflowRisk ? "overflow" : "fits"
  ].join("|");
}
