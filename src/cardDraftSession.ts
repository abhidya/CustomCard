import { buildFulfillmentRecommendations, type FulfillmentRecommendationSet } from "./fulfillmentRecommendation";
import {
  buildCustomerChatSession,
  buildVendorHandoff,
  generateCardDraft,
  validateCardDraft,
  type CardDraft,
  type CardDraftInput,
  type CardOpportunity,
  type CardPanel,
  type CardValidation,
  type CustomerChatSession,
  type LocalWorkspace,
  type VendorHandoff,
  type VendorId
} from "./customerWorkflow";
import type { SupportedLocale } from "./localization";
import { buildPrinterPricingComparison, type PrinterPricingComparison } from "./printerPricing";
import { buildPrintExportPackage, type PrintExportPackage } from "./printExport";
import { applyPanelOverrides, type PanelOverrides } from "./panelEdits";

export interface CardDraftSessionInput {
  aiDraft: CardDraft | null;
  customerChatMessages: CustomerChatSession["messages"] | undefined;
  draftInput: CardDraftInput;
  memories: LocalWorkspace["memories"];
  opportunity: CardOpportunity;
  panelOverrides: PanelOverrides;
  selectedLocale: SupportedLocale;
  vendorId: VendorId;
}

export interface CardDraftSession {
  activeDraft: CardDraft;
  activePanels: CardPanel[];
  approvedMemoryNotes: string[];
  customerChatSession: CustomerChatSession;
  draft: CardDraft;
  fulfillmentContext: string;
  fulfillmentRecommendationSet: FulfillmentRecommendationSet;
  handoff: VendorHandoff;
  pricingComparison: PrinterPricingComparison;
  printPackage: PrintExportPackage;
  templateDraft: CardDraft;
  validation: CardValidation;
}

export function buildCardDraftSession({
  aiDraft,
  customerChatMessages,
  draftInput,
  memories,
  opportunity,
  panelOverrides,
  selectedLocale,
  vendorId
}: CardDraftSessionInput): CardDraftSession {
  const draft = generateCardDraft(draftInput, memories);
  const activeDraft = applyPanelOverrides(aiDraft ?? draft, panelOverrides);
  const validation = validateCardDraft(activeDraft);
  const handoff = buildVendorHandoff(vendorId, validation);
  const pricingComparison = buildPrinterPricingComparison(vendorId);
  const fulfillmentRecommendationSet = buildFulfillmentRecommendations(pricingComparison);
  const printPackage = buildPrintExportPackage(activeDraft, validation, handoff);
  const approvedMemoryNotes = memories.filter((m) => m.approved).map((m) => m.note);
  const fulfillmentContext = fulfillmentRecommendationSet.recommendations
    .map((r) => `${r.label}: ${r.subtotalLabel} at ${r.vendorName}`)
    .join("; ");
  const customerChatSession = buildCustomerChatSession(
    {
      recipientName: opportunity.recipient,
      customerMessage: "",
      approvedMemoryNotes,
      locale: selectedLocale.locale,
      fulfillmentContext
    },
    customerChatMessages ?? []
  );

  return {
    activeDraft,
    activePanels: activeDraft.panels,
    approvedMemoryNotes,
    customerChatSession,
    draft,
    fulfillmentContext,
    fulfillmentRecommendationSet,
    handoff,
    pricingComparison,
    printPackage,
    templateDraft: draft,
    validation
  };
}
