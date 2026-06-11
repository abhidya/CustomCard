import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { buildFulfillmentRecommendations, type FulfillmentRecommendationSet } from "./fulfillmentRecommendation";
import {
  buildOpportunity,
  buildVendorHandoff,
  buildCustomerChatSession,
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
  type VisualStyle,
  type CustomerChatSession
} from "./customerWorkflow";
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
  buildBrowserAiFlowSummary,
  loadBrowserAiFlowAdminConfigs,
  normalizeAiFlowAdminConfigs,
  type AiFlowAdminConfig,
  type AiFlowConfigSummary
} from "./aiFlowConfig";
import {
  buildAiGenerationJobEvidence,
  prependAiGenerationJob,
  type AiGenerationApiResult,
  type AiGenerationJobEvidence
} from "./aiGenerationJobs";
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

export type ViewId = "customer" | "mobile" | "opportunities" | "studio" | "memory" | "handoff" | "settings" | "business" | "legal" | "admin" | "adapters";

const legacyCardGenApiUrl: string = (import.meta.env.VITE_CARD_GEN_URL as string | undefined) ?? "";
const sameOriginCardGenPath = "/api/ai/card/generate";

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
  aiCardGenStatus: string;
  aiGenerationJobs: AiGenerationJobEvidence[];
  triggerAiCardGen: () => void;
  cardGenAvailable: boolean;
  aiFlowConfigs: AiFlowAdminConfig[];
  setAiFlowConfigs: (configs: AiFlowAdminConfig[]) => void;
  aiFlowSummary: AiFlowConfigSummary;

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
  const viewIds = new Set<ViewId>(["customer", "mobile", "opportunities", "studio", "memory", "handoff", "settings", "business", "legal", "admin", "adapters"]);
  if (requestedView && viewIds.has(requestedView as ViewId)) return requestedView as ViewId;
  if (window.location.pathname.replace(/\/+$/, "") === "/business") return "business";
  const hashView = window.location.hash.replace(/^#\/?/, "");
  if (hashView && viewIds.has(hashView as ViewId)) return hashView as ViewId;
  return "customer";
}

function buildRuntimeReadinessMap(): Map<string, RuntimeReadiness> {
  return new Map(providerCatalog.map((adapter) => [adapter.id, getProviderRuntimeReadiness(adapter.id)]));
}

export function useAppState(): AppState {
  const [activeView, setActiveView] = useState<ViewId>(() => initialViewFromLocation());
  const [workspace, setWorkspace] = useState<LocalWorkspace | undefined>();
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
  const [aiCardGenStatus, setAiCardGenStatus] = useState("");
  const [aiGenerationJobs, setAiGenerationJobs] = useState<AiGenerationJobEvidence[]>([]);
  const [aiFlowConfigs, setAiFlowConfigsState] = useState<AiFlowAdminConfig[]>(() => loadBrowserAiFlowAdminConfigs());

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

  useEffect(() => {
    setAiDraft(null);
    setAiCardGenStatus("");
  }, [draftInput]);

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
  const aiFlowSummary = useMemo(() => buildBrowserAiFlowSummary(aiFlowConfigs), [aiFlowConfigs]);
  const setAiFlowConfigs = useCallback((configs: AiFlowAdminConfig[]) => {
    const normalized = normalizeAiFlowAdminConfigs(configs);
    setAiFlowConfigsState(normalized);
  }, []);
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
    if (aiCardGenLoading) return;
    const baseBody = {
      sender: draftInput.sender,
      recipient: draftInput.recipient,
      relationship: draftInput.relationship,
      occasion: draftInput.occasion,
      tone: draftInput.tone,
      style: draftInput.style,
      language: draftInput.language,
      personal_note: draftInput.personalNote,
      memory_notes: approvedMemoryNotes
    };
    const body = JSON.stringify(baseBody);
    setAiCardGenLoading(true);
    setAiCardGenStatus("Generating copy and artwork...");
    fetch(legacyCardGenApiUrl ? `${legacyCardGenApiUrl}/generate` : sameOriginCardGenPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Idempotency-Key": buildIdempotencyKey("card-gen")
      },
      body
    })
      .then(readAiGenerationResponse)
      .then((result: AiGenerationApiResult) => {
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
        const panelCount = basePanels.length;
        const hasImages = imageByPanel.size > 0;
        const artworkFailure = readArtworkFailure(result);
        setAiDraft({ ...draft, panels: aiPanels, generatedBy: hasImages ? "ai-text-and-image" : "ai-text-only" });
        setAiCardGenStatus(
          hasImages
            ? `AI card applied with ${imageByPanel.size}/${panelCount} artwork panels.`
            : artworkFailure
              ? `AI copy applied; artwork blocked: ${artworkFailure}`
              : "AI copy applied; artwork was not returned."
        );
        setAiGenerationJobs((current) =>
          prependAiGenerationJob(current, buildAiGenerationJobEvidence({ result, draft }), 10)
        );
      })
      .catch((err: unknown) => {
        console.error("AI card gen failed:", err);
        setAiCardGenStatus(err instanceof Error ? err.message : "AI card generation failed. Try again in a moment.");
      })
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
    aiCardGenStatus,
    aiGenerationJobs,
    triggerAiCardGen,
    cardGenAvailable: true,
    aiFlowConfigs,
    setAiFlowConfigs,
    aiFlowSummary,
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

function buildIdempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

async function readAiGenerationResponse(response: Response): Promise<AiGenerationApiResult> {
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json() as Record<string, unknown>
    : undefined;

  if (!response.ok) {
    throw new Error(formatAiGenerationHttpError(response.status, payload));
  }
  if (!payload || !Array.isArray((payload.card_copy as { panels?: unknown } | undefined)?.panels)) {
    throw new Error("AI card generation returned an unexpected response.");
  }
  return payload as AiGenerationApiResult;
}

function formatAiGenerationHttpError(status: number, payload: Record<string, unknown> | undefined): string {
  const detail = readAiGenerationErrorDetail(payload);
  if (status === 404) return "AI card generation route is unavailable. Redeploy the API and try again.";
  if (status === 401 || status === 403) return "AI card generation needs a signed-in session.";
  return detail ? `AI card generation failed: ${detail}` : `AI card generation returned HTTP ${status}.`;
}

function readAiGenerationErrorDetail(payload: Record<string, unknown> | undefined): string {
  for (const key of ["detail", "error", "status", "message"]) {
    const value = payload?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function readArtworkFailure(result: AiGenerationApiResult): string {
  const failure = result.ai_flow?.card_image?.provider_failure;
  if (typeof failure !== "string" || !failure.trim()) return "";
  if (/Live provider calls disabled for card-image/i.test(failure)) {
    return "image generation is disabled in server settings.";
  }
  return failure.trim();
}
