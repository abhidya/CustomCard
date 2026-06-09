import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { buildCustomerChatSession, type CustomerChatSession } from "./customerChat";
import { buildFulfillmentRecommendations, type FulfillmentRecommendationSet } from "./fulfillmentRecommendation";
import {
  buildOpportunity,
  buildVendorHandoff,
  generateCardDraft,
  getDefaultDraftInput,
  parseFreeImport,
  validateCardDraft,
  type CardDraft,
  type CardDraftInput,
  type CardOpportunity,
  type CardValidation,
  type LocalWorkspace,
  type OpportunityDecision,
  type VendorHandoff,
  type VendorId
} from "./freeMvp";
import { getSupportedLocale, summarizeLocalizationReadiness, type LocalizationReadinessSummary, type SupportedLocale, type SupportedLocaleCode } from "./localization";
import { buildCalendarConnectionStartPackets, type CalendarConnectionStartPacket } from "./onboardingCalendar";
import { buildAdminPanelModel, providerCatalog, type AdminPanelModel } from "./providerCatalog";
import { summarizeProviderGovernance, type ProviderGovernanceSummary } from "./providerGovernance";
import { summarizeProductionReadiness, type ProductionReadinessSummary } from "./productionReadiness";
import { buildPrinterPricingComparison } from "./printerPricing";
import { buildPrintExportPackage, type PrintExportPackage } from "./printExport";
import { getProviderRuntimeReadiness, type RuntimeReadiness } from "./providerRuntime";
import { buildReadinessSummary, type ReadinessSummary } from "./readinessSummary";
import {
  reviewerEmptyMemories,
  reviewerInitialAuthForm,
  reviewerInitialExportStatus,
  reviewerInitialScanStatus,
  reviewerReferenceDate,
  reviewerWorkspaceKey,
  type ReviewerAuthForm
} from "./reviewerBootstrap";

export type ViewId = "customer" | "mobile" | "opportunities" | "studio" | "memory" | "handoff" | "admin" | "adapters";

const cardGenApiUrl: string = (import.meta.env.VITE_CARD_GEN_URL as string | undefined) ?? "";

export interface AppState {
  activeView: ViewId;
  setActiveView: (view: ViewId) => void;
  workspace: LocalWorkspace | undefined;
  setWorkspace: (workspace: LocalWorkspace | undefined) => void;
  authForm: ReviewerAuthForm;
  setAuthForm: Dispatch<SetStateAction<ReviewerAuthForm>>;
  inviteText: string;
  setInviteText: (text: string) => void;
  scanStatus: string;
  setScanStatus: (status: string) => void;
  opportunityDecision: OpportunityDecision;
  setOpportunityDecision: (decision: OpportunityDecision) => void;
  vendorId: VendorId;
  setVendorId: (vendorId: VendorId) => void;
  localeCode: SupportedLocaleCode;
  setLocaleCode: (code: SupportedLocaleCode) => void;
  memoryForm: { recipient: string; note: string };
  setMemoryForm: (form: { recipient: string; note: string }) => void;
  exportStatus: string;
  setExportStatus: (status: string) => void;
  customerChatInput: string;
  setCustomerChatInput: (input: string) => void;
  customerChatMessages: CustomerChatSession["messages"] | undefined;
  setCustomerChatMessages: (messages: CustomerChatSession["messages"] | undefined) => void;
  draftInput: CardDraftInput;
  setDraftInput: (updater: ((current: CardDraftInput) => CardDraftInput) | CardDraftInput) => void;

  aiDraft: CardDraft | null;
  aiCardGenLoading: boolean;
  triggerAiCardGen: () => void;
  cardGenAvailable: boolean;

  memories: LocalWorkspace["memories"];
  signal: ReturnType<typeof parseFreeImport>;
  pricingComparison: ReturnType<typeof buildPrinterPricingComparison>;
  opportunity: CardOpportunity;
  draft: ReturnType<typeof generateCardDraft>;
  validation: CardValidation;
  handoff: VendorHandoff;
  fulfillmentRecommendationSet: FulfillmentRecommendationSet;
  printPackage: PrintExportPackage;
  adminPanelModel: AdminPanelModel;
  localizationSummary: LocalizationReadinessSummary;
  selectedLocale: SupportedLocale;
  approvedMemoryNotes: string[];
  fulfillmentContext: string;
  providerGovernance: ProviderGovernanceSummary;
  productionReadiness: ProductionReadinessSummary;
  readiness: ReadinessSummary;
  calendarConnectionStartPackets: CalendarConnectionStartPacket[];
  runtimeReadiness: Map<string, RuntimeReadiness>;
  seededCustomerChat: CustomerChatSession;
  customerChatSession: CustomerChatSession;
}

export function initialViewFromLocation(): ViewId {
  if (typeof window === "undefined") return "customer";
  const requestedView = new URLSearchParams(window.location.search).get("view");
  const viewIds = new Set<ViewId>(["customer", "mobile", "opportunities", "studio", "memory", "handoff", "admin", "adapters"]);
  if (requestedView && viewIds.has(requestedView as ViewId)) return requestedView as ViewId;
  const hashView = window.location.hash.replace(/^#\/?/, "");
  if (hashView && viewIds.has(hashView as ViewId)) return hashView as ViewId;
  return "customer";
}

function buildRuntimeReadinessMap(): Map<string, RuntimeReadiness> {
  return new Map(providerCatalog.map((adapter) => [adapter.id, getProviderRuntimeReadiness(adapter.id)]));
}

export function useAppState(): AppState {
  const [activeView, setActiveView] = useState<ViewId>(() => initialViewFromLocation());
  const [workspace, setWorkspace] = useState<LocalWorkspace | undefined>(() => {
    try {
      const raw = localStorage.getItem(reviewerWorkspaceKey);
      return raw ? (JSON.parse(raw) as LocalWorkspace) : undefined;
    } catch {
      return undefined;
    }
  });
  const [authForm, setAuthForm] = useState(reviewerInitialAuthForm);
  const [inviteText, setInviteText] = useState("");
  const [scanStatus, setScanStatus] = useState(reviewerInitialScanStatus);
  const [opportunityDecision, setOpportunityDecision] = useState<OpportunityDecision>("pending");
  const [vendorId, setVendorId] = useState<VendorId>("walgreens");
  const [localeCode, setLocaleCode] = useState<SupportedLocaleCode>("en-US");
  const [memoryForm, setMemoryForm] = useState({ recipient: "", note: "" });
  const [exportStatus, setExportStatus] = useState(reviewerInitialExportStatus);
  const [customerChatInput, setCustomerChatInput] = useState("");
  const [customerChatMessages, setCustomerChatMessages] = useState<CustomerChatSession["messages"] | undefined>();

  const memories = workspace?.memories ?? reviewerEmptyMemories;
  const signal = useMemo(() => parseFreeImport(inviteText), [inviteText]);
  const opportunity = useMemo(() => buildOpportunity(signal, memories, reviewerReferenceDate), [signal, memories]);
  const [draftInput, setDraftInput] = useState<CardDraftInput>(() =>
    getDefaultDraftInput(undefined, buildOpportunity(parseFreeImport(""), [], reviewerReferenceDate))
  );
  const [aiDraft, setAiDraft] = useState<CardDraft | null>(null);
  const [aiCardGenLoading, setAiCardGenLoading] = useState(false);

  useEffect(() => {
    setDraftInput((current) => ({
      ...getDefaultDraftInput(workspace, opportunity),
      tone: current.tone,
      style: current.style,
      language: current.language
    }));
  }, [workspace, opportunity]);

  useEffect(() => {
    setCustomerChatMessages(undefined);
  }, [localeCode, opportunity.id]);

  useEffect(() => {
    const syncView = () => setActiveView(initialViewFromLocation());
    window.addEventListener("popstate", syncView);
    window.addEventListener("hashchange", syncView);
    return () => {
      window.removeEventListener("popstate", syncView);
      window.removeEventListener("hashchange", syncView);
    };
  }, []);

  useEffect(() => { setAiDraft(null); }, [draftInput]);

  const draft = useMemo(() => generateCardDraft(draftInput, memories), [draftInput, memories]);
  const validation = useMemo(() => validateCardDraft(draft), [draft]);
  const handoff = useMemo(() => buildVendorHandoff(vendorId, validation), [vendorId, validation]);
  const pricingComparison = useMemo(() => buildPrinterPricingComparison(vendorId), [vendorId]);
  const fulfillmentRecommendationSet = useMemo(() => buildFulfillmentRecommendations(pricingComparison), [pricingComparison]);
  const printPackage = useMemo(() => buildPrintExportPackage(draft, validation, handoff), [draft, validation, handoff]);
  const adminPanelModel = useMemo(() => buildAdminPanelModel(), []);
  const localizationSummary = useMemo(() => summarizeLocalizationReadiness(), []);
  const selectedLocale = useMemo(() => getSupportedLocale(localeCode), [localeCode]);
  const approvedMemoryNotes = useMemo(
    () => memories.filter((m) => m.approved).map((m) => m.note),
    [memories]
  );
  const fulfillmentContext = useMemo(
    () =>
      fulfillmentRecommendationSet.recommendations
        .map((r) => `${r.label}: ${r.subtotalLabel} at ${r.vendorName}`)
        .join("; "),
    [fulfillmentRecommendationSet]
  );
  const providerGovernance = useMemo(() => summarizeProviderGovernance(), []);
  const productionReadiness = useMemo(() => summarizeProductionReadiness(), []);
  const readiness = useMemo(() => buildReadinessSummary(), []);
  const calendarConnectionStartPackets = useMemo(() => buildCalendarConnectionStartPackets(), []);
  const runtimeReadiness = useMemo(() => buildRuntimeReadinessMap(), []);
  const seededCustomerChat = useMemo(
    () =>
      buildCustomerChatSession({
        recipientName: opportunity.recipient,
        customerMessage: "",
        approvedMemoryNotes,
        locale: selectedLocale.locale,
        fulfillmentContext
      }),
    [approvedMemoryNotes, fulfillmentContext, opportunity.recipient, selectedLocale.locale]
  );
  const customerChatSession = useMemo(
    () =>
      buildCustomerChatSession(
        {
          recipientName: opportunity.recipient,
          customerMessage: "",
          approvedMemoryNotes,
          locale: selectedLocale.locale,
          fulfillmentContext
        },
        customerChatMessages ?? seededCustomerChat.messages
      ),
    [approvedMemoryNotes, customerChatMessages, fulfillmentContext, opportunity.recipient, seededCustomerChat.messages, selectedLocale.locale]
  );

  const triggerAiCardGen = useCallback(() => {
    if (!cardGenApiUrl || aiCardGenLoading) return;
    const body = JSON.stringify({
      sender: draftInput.sender,
      recipient: draftInput.recipient,
      relationship: draftInput.relationship,
      occasion: draftInput.occasion,
      tone: draftInput.tone,
      style: draftInput.style,
      language: draftInput.language,
      personal_note: draftInput.personalNote,
      memory_notes: approvedMemoryNotes
    });
    setAiCardGenLoading(true);
    fetch(`${cardGenApiUrl}/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body })
      .then((res) => {
        if (!res.ok) throw new Error(`Card gen service returned ${res.status}`);
        return res.json();
      })
      .then((result) => {
        const imageByPanel = new Map<string, string>(
          (result.images as Array<{ panel_id: string; image_url: string }> | undefined ?? []).map((img) => [img.panel_id, img.image_url])
        );
        const basePanels = draft.panels;
        const aiPanels = basePanels.map((panel) => {
          const copy = (result.card_copy?.panels as Array<{ id: string; headline: string; body: string; art_direction: string }> | undefined ?? [])
            .find((p) => p.id === panel.id);
          if (!copy) return panel;
          return {
            ...panel,
            headline: copy.headline,
            body: copy.body,
            artDirection: copy.art_direction,
            imageUrl: imageByPanel.get(panel.id)
          };
        });
        const hasImages = imageByPanel.size > 0;
        setAiDraft({ ...draft, panels: aiPanels, generatedBy: hasImages ? "ai-text-and-image" : "ai-text-only" });
      })
      .catch((err: unknown) => { console.error("AI card gen failed:", err); })
      .finally(() => { setAiCardGenLoading(false); });
  }, [aiCardGenLoading, approvedMemoryNotes, draft, draftInput]);

  return {
    activeView, setActiveView,
    workspace, setWorkspace,
    authForm, setAuthForm,
    inviteText, setInviteText,
    scanStatus, setScanStatus,
    opportunityDecision, setOpportunityDecision,
    vendorId, setVendorId,
    localeCode, setLocaleCode,
    memoryForm, setMemoryForm,
    exportStatus, setExportStatus,
    customerChatInput, setCustomerChatInput,
    customerChatMessages, setCustomerChatMessages,
    draftInput, setDraftInput,
    aiDraft,
    aiCardGenLoading,
    triggerAiCardGen,
    cardGenAvailable: Boolean(cardGenApiUrl),
    memories,
    signal,
    pricingComparison,
    opportunity,
    draft,
    validation,
    handoff,
    fulfillmentRecommendationSet,
    printPackage,
    adminPanelModel,
    localizationSummary,
    selectedLocale,
    approvedMemoryNotes,
    fulfillmentContext,
    providerGovernance,
    productionReadiness,
    readiness,
    calendarConnectionStartPackets,
    runtimeReadiness,
    seededCustomerChat,
    customerChatSession
  };
}
