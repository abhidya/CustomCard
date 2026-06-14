import {
  addMemory,
  buildOpportunity,
  buildVendorHandoff,
  createLocalWorkspace,
  daysUntilLabel,
  defaultMemories,
  freeAdapterLabels,
  generateCardDraft,
  getDefaultDraftInput,
  occasionStarters,
  parseFreeImport,
  recordCardExport,
  removeMemory,
  saveEventToWorkspace,
  setSavedEventStatus,
  sampleInviteText,
  upcomingSavedEvents,
  updateCardHistoryStatus,
  validateCardDraft,
  type LocalWorkspace,
  type MemoryItem
} from "./freeMvp";
import { buildPanelSvg, exportFileName } from "./renderPacket";

export {
  addMemory,
  buildOpportunity,
  buildPanelSvg,
  buildVendorHandoff,
  createLocalWorkspace,
  daysUntilLabel,
  defaultMemories,
  exportFileName,
  freeAdapterLabels,
  generateCardDraft,
  getDefaultDraftInput,
  occasionStarters,
  parseFreeImport,
  recordCardExport,
  removeMemory,
  saveEventToWorkspace,
  setSavedEventStatus,
  sampleInviteText,
  upcomingSavedEvents,
  updateCardHistoryStatus,
  validateCardDraft
};
export type {
  CardDraft,
  CardDraftInput,
  CardHistoryEntry,
  CardLifecycleStatus,
  CardOpportunity,
  FreeImportSignal,
  CardImageFocus,
  CardImageFrame,
  CardImagePlacement,
  CardPanel,
  CardTextFormat,
  CardTextLayout,
  CardValidation,
  LanguageChoice,
  LegacyTonePreset,
  LocalWorkspace,
  MemoryItem,
  OpportunityDecision,
  SavedEvent,
  TextAlignment,
  Tone,
  TonePreset,
  VendorHandoff,
  VendorId,
  VisualStyle,
  VisualStylePreset
} from "./freeMvp";
export {
  buildCustomerChatSession,
  sendCustomerChatMessage,
  validateCustomerChatSession,
  type CustomerChatFetch,
  type CustomerChatSendInput,
  type CustomerChatSendOptions,
  type CustomerChatSendResult,
  type CustomerChatSession
} from "./customerChat";
export {
  buildCustomerWebExperience,
  buildCustomerWebExperienceFromState,
  collectCustomerWebCopy,
  validateCustomerWebExperience,
  type CustomerWebAction,
  type CustomerWebActionId,
  type CustomerWebExperience,
  type CustomerWebExperienceState
} from "./customerWebExperience";

export interface RelationshipMemoryDraft {
  recipient: string;
  note: string;
}

export interface CustomerIdentityDraft {
  name: string;
  email: string;
}

export function addApprovedRelationshipMemory(
  workspace: LocalWorkspace | undefined,
  identity: CustomerIdentityDraft,
  memory: RelationshipMemoryDraft,
  now = new Date()
): LocalWorkspace {
  const base = workspace ?? createLocalWorkspace(identity.name, identity.email, now);
  return addMemory(base, memory.recipient, memory.note, now);
}

export function removeApprovedRelationshipMemory(workspace: LocalWorkspace, memoryId: string): LocalWorkspace {
  return removeMemory(workspace, memoryId);
}

export function buildCardDraftFromOpportunity(input: {
  workspace: LocalWorkspace | undefined;
  memories: MemoryItem[];
  rawImportText: string;
  now?: Date;
}) {
  const signal = parseFreeImport(input.rawImportText);
  const opportunity = buildOpportunity(signal, input.memories, input.now ?? new Date());
  const draftInput = getDefaultDraftInput(input.workspace, opportunity);
  const draft = generateCardDraft(draftInput, input.memories);
  const validation = validateCardDraft(draft);

  return {
    signal,
    opportunity,
    draftInput,
    draft,
    validation
  };
}
