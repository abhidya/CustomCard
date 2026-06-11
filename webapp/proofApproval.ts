/**
 * Proof approval policy: the customer must explicitly confirm every detail of
 * the 2D print proof before the Walgreens checkout unlocks. The proof view is
 * the source of truth for what prints; this checklist is the human gate.
 */

export interface ProofChecklistItem {
  id: ProofChecklistItemId;
  label: string;
}

export type ProofChecklistItemId =
  | "names"
  | "occasion"
  | "spelling"
  | "tone"
  | "approve";

export const proofChecklistItems: ProofChecklistItem[] = [
  { id: "names", label: "The recipient and sender names are correct" },
  { id: "occasion", label: "The occasion and any dates or details are right" },
  { id: "spelling", label: "I read every panel for spelling and wording" },
  { id: "tone", label: "The tone feels right for this person" },
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
