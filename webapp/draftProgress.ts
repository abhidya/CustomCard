import type { CardDraftInput } from "../src/customerWorkflow";

export type DraftProgressStatus = "draft" | "in-progress" | "ready-for-review";

export interface DraftProgressState {
  hasMeaningfulProgress: boolean;
  status: DraftProgressStatus;
}

const defaultDraftValues = new Set<string>([
  "Someone important",
  "Local User",
  "card",
  "Mention their shared patience, humor, and the little rituals that made the year feel full."
]);

export function displayDraftValue(value: string): string {
  return defaultDraftValues.has(value) ? "" : value;
}

export function hasMeaningfulDraftProgress(input: CardDraftInput): boolean {
  return (
    input.recipient.trim() !== "Someone important" ||
    input.sender.trim() !== "Local User" ||
    input.relationship.trim() !== "Friends" ||
    input.occasion.trim() !== "card" ||
    input.tone !== "warm" ||
    input.style !== "botanical" ||
    input.personalNote.trim().length > 0
  );
}

export function buildDraftProgressState(input: CardDraftInput, validationPassed: boolean): DraftProgressState {
  const hasMeaningfulProgress = hasMeaningfulDraftProgress(input);
  return {
    hasMeaningfulProgress,
    status: validationPassed ? "ready-for-review" : hasMeaningfulProgress ? "in-progress" : "draft"
  };
}
