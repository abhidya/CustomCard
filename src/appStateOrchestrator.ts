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
  type LanguageChoice,
  type LocalWorkspace,
  type MemoryItem,
  type OpportunityDecision,
  type Tone,
  type VendorHandoff,
  type VendorId,
  type VisualStyle
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
// --- Bootstrap constants (canonical home; reviewerBootstrap.ts re-exports these) ---

export interface ReviewerAuthForm {
  name: string;
  email: string;
}

export const reviewerWorkspaceKey = "customcard-free-workspace-v1";
// Deterministic clock for tests and reviewer fixtures only; the live app uses the real current date.
export const reviewerReferenceDate = new Date("2026-06-03T12:00:00.000Z");
export const reviewerInitialAuthForm: ReviewerAuthForm = { name: "", email: "" };
export const reviewerInitialScanStatus = "Invite required";
export const reviewerInitialExportStatus = "Ready to export";
export const reviewerEmptyMemories: MemoryItem[] = [];

export const reviewerDraftOptions: {
  tones: Tone[];
  styles: VisualStyle[];
  languages: LanguageChoice[];
  vendors: VendorId[];
} = {
  tones: ["warm", "playful", "elegant", "reverent"],
  styles: ["botanical", "bold-type", "photo-note", "minimal"],
  languages: ["English", "Spanish", "Urdu", "Arabic"],
  vendors: ["walgreens", "cvs", "fedex", "walmart", "staples", "office-depot", "local-print-shop"]
};

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
      const stored = raw ? (JSON.parse(raw) as LocalWorkspace) : undefined;
      // Workspaces created by the old prefilled reviewer identity are demo
      // artifacts, not customer data — clear them once on load.
      if (stored && stored.name === "Abdul" && stored.email === "abdul@customcard.local") {
        localStorage.removeItem(reviewerWorkspaceKey);
        return undefined;
      }
      return stored;
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

  const [referenceNow] = useState(() => new Date());
  const memories = workspace?.memories ?? reviewerEmptyMemories;
  const signal = useMemo(() => parseFreeImport(inviteText), [inviteText]);
  const opportunity = useMemo(() => buildOpportunity(signal, memories, referenceNow), [signal, memories, referenceNow]);
  const [draftInput, setDraftInput] = useState<CardDraftInput>(() =>
    getDefaultDraftInput(undefined, buildOpportunity(parseFreeImport(""), [], new Date()))
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
  // Chat starts empty: the conversation belongs to the customer, not a scripted transcript.
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
        customerChatMessages ?? []
      ),
    [approvedMemoryNotes, customerChatMessages, fulfillmentContext, opportunity.recipient, selectedLocale.locale]
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
    customerChatSession
  };
}
