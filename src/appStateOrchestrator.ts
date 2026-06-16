import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  buildOpportunity,
  getDefaultDraftInput,
  parseFreeImport,
  type CardDraft,
  type CardDraftInput,
  type CardOpportunity,
  type CardPanel,
  type CardTextLayout,
  type CardValidation,
  type LanguageChoice,
  type LocalWorkspace,
  type MemoryItem,
  type OpportunityDecision,
  type TonePreset,
  type VendorHandoff,
  type VendorId,
  type VisualStylePreset,
  type CustomerChatSession
} from "./customerWorkflow";
import { getSupportedLocale, summarizeLocalizationReadiness, type LocalizationReadinessSummary, type SupportedLocale, type SupportedLocaleCode } from "./localization";
import { buildCalendarConnectionStartPackets, type CalendarConnectionStartPacket } from "./onboardingCalendar";
import { buildCardDraftSession, type CardDraftSession } from "./cardDraftSession";
import {
  buildBrowserAiFlowSummary,
  loadBrowserAiFlowAdminConfigs,
  normalizeAiFlowAdminConfigs,
  saveBrowserAiFlowAdminConfigs,
  type AiFlowAdminConfig,
  type AiFlowConfigSummary
} from "./aiFlowConfig";
import {
  buildAiGenerationJobEvidence,
  prependAiGenerationJob,
  type AiGenerationApiImage,
  type AiGenerationApiPanel,
  type AiGenerationApiResult,
  type AiGenerationJobEvidence
} from "./aiGenerationJobs";
import {
  clearPanelOverride,
  emptyPanelOverrides,
  setPanelOverride,
  type PanelOverride,
  type PanelOverrides
} from "./panelEdits";
import { buildBrowserIdempotencyKey, buildBrowserRequestHeaders, fetchBrowser } from "./browserRequestAdapter";
import { resolveCardGenerationEndpoint } from "./browserGatePolicy";
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
  tones: TonePreset[];
  styles: VisualStylePreset[];
  languages: LanguageChoice[];
  vendors: VendorId[];
} = {
  tones: ["warm", "funny", "elegant", "simple", "reverent", "sentimental"],
  styles: ["botanical", "bold-type", "photo-note", "minimal"],
  languages: ["English", "Spanish", "Urdu", "Arabic"],
  vendors: ["walgreens", "cvs", "fedex", "walmart", "staples", "office-depot", "local-print-shop"]
};

export type ViewId = "customer" | "mobile" | "opportunities" | "studio" | "memory" | "people" | "handoff" | "settings" | "business" | "legal" | "admin";

const cardGenerationEndpoint = resolveCardGenerationEndpoint(import.meta.env);

export type CustomerApiTokenProvider = () => Promise<string | null | undefined>;
export type AiPanelGenerationStatus = "queued" | "copy-ready" | "artwork-loading" | "artwork-ready" | "artwork-missing";
export type AiPanelGenerationProgress = Partial<Record<CardPanel["id"], AiPanelGenerationStatus>>;
export type AiGenerationJobPollResult =
  | { status: "ready"; result: AiGenerationApiResult }
  | {
      status: "pending";
      jobId: string;
      queueStatus: string;
      retryAfterSeconds: number;
      statusText: string;
    };

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
  aiStale: boolean;
  keepAiArtwork: () => void;
  aiCardGenLoading: boolean;
  aiCardGenStatus: string;
  aiPanelGenerationProgress: AiPanelGenerationProgress;
  aiGenerationJobs: AiGenerationJobEvidence[];
  triggerAiCardGen: (targetPanelId?: CardPanel["id"] | CardPanel["id"][]) => void;
  cardGenAvailable: boolean;
  aiFlowConfigs: AiFlowAdminConfig[];
  setAiFlowConfigs: (configs: AiFlowAdminConfig[]) => void;
  aiFlowSummary: AiFlowConfigSummary;

  memories: LocalWorkspace["memories"];
  signal: ReturnType<typeof parseFreeImport>;
  cardDraftSession: CardDraftSession;
  pricingComparison: CardDraftSession["pricingComparison"];
  opportunity: CardOpportunity;
  /** Deterministic template draft — the base the AI request and "revert" use. */
  draft: CardDraftSession["draft"];
  templateDraft: CardDraft;
  /**
   * The one draft every downstream artifact is built from: AI draft when
   * present, template otherwise, with the customer's exact panel edits applied.
   */
  activeDraft: CardDraft;
  activePanels: CardPanel[];
  panelOverrides: PanelOverrides;
  updatePanelOverride: (panelId: CardPanel["id"], patch: PanelOverride) => void;
  revertPanelOverride: (panelId: CardPanel["id"]) => void;
  /** Validation/handoff/print package are built from activeDraft — what you see is what exports. */
  validation: CardValidation;
  handoff: VendorHandoff;
  fulfillmentRecommendationSet: CardDraftSession["fulfillmentRecommendationSet"];
  printPackage: CardDraftSession["printPackage"];
  localizationSummary: LocalizationReadinessSummary;
  selectedLocale: SupportedLocale;
  approvedMemoryNotes: string[];
  fulfillmentContext: string;
  calendarConnectionStartPackets: CalendarConnectionStartPacket[];
  customerChatSession: CustomerChatSession;
}

export function initialViewFromLocation(): ViewId {
  if (typeof window === "undefined") return "customer";
  const requestedView = new URLSearchParams(window.location.search).get("view");
  const viewIds = new Set<ViewId>(["customer", "mobile", "opportunities", "studio", "memory", "people", "handoff", "settings", "business", "legal", "admin"]);
  if (requestedView && viewIds.has(requestedView as ViewId)) return requestedView as ViewId;
  if (window.location.pathname.replace(/\/+$/, "") === "/business") return "business";
  const hashView = window.location.hash.replace(/^#\/?/, "");
  if (hashView && viewIds.has(hashView as ViewId)) return hashView as ViewId;
  return "customer";
}

export function useAppState(getCustomerApiToken?: CustomerApiTokenProvider): AppState {
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
  const syncedOpportunityId = useRef(opportunity.id);
  const [aiDraft, setAiDraft] = useState<CardDraft | null>(null);
  const [panelOverrides, setPanelOverrides] = useState<PanelOverrides>(emptyPanelOverrides);
  const [aiStale, setAiStale] = useState(false);
  const aiDraftPresent = useRef(false);
  aiDraftPresent.current = aiDraft !== null;
  const [aiCardGenLoading, setAiCardGenLoading] = useState(false);
  const [aiCardGenStatus, setAiCardGenStatus] = useState("");
  const [aiPanelGenerationProgress, setAiPanelGenerationProgress] = useState<AiPanelGenerationProgress>({});
  const [aiGenerationJobs, setAiGenerationJobs] = useState<AiGenerationJobEvidence[]>([]);
  const [aiFlowConfigs, setAiFlowConfigsState] = useState<AiFlowAdminConfig[]>(() => loadBrowserAiFlowAdminConfigs());

  useEffect(() => {
    const opportunityChanged = syncedOpportunityId.current !== opportunity.id;
    syncedOpportunityId.current = opportunity.id;
    setDraftInput((current) =>
      syncDraftInputWithOpportunity(current, {
        workspace,
        opportunity,
        opportunityChanged
      })
    );
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

  // Editing after generation never silently regenerates: the AI draft is kept
  // and marked stale so the customer can choose to keep or refresh the artwork.
  useEffect(() => {
    if (aiDraftPresent.current) setAiStale(true);
    else {
      setAiCardGenStatus((current) => (current ? "" : current));
      setAiPanelGenerationProgress((current) => (Object.keys(current).length > 0 ? {} : current));
    }
  }, [draftInput]);

  const updatePanelOverride = useCallback((panelId: CardPanel["id"], patch: PanelOverride) => {
    setPanelOverrides((current) => setPanelOverride(current, panelId, patch));
  }, []);
  const revertPanelOverride = useCallback((panelId: CardPanel["id"]) => {
    setPanelOverrides((current) => clearPanelOverride(current, panelId));
  }, []);
  const localizationSummary = useMemo(() => summarizeLocalizationReadiness(), []);
  const selectedLocale = useMemo(() => getSupportedLocale(localeCode), [localeCode]);
  const cardDraftSession = useMemo(
    () =>
      buildCardDraftSession({
        aiDraft,
        customerChatMessages,
        draftInput,
        memories,
        opportunity,
        panelOverrides,
        selectedLocale,
        vendorId
      }),
    [aiDraft, customerChatMessages, draftInput, memories, opportunity, panelOverrides, selectedLocale, vendorId]
  );
  const {
    activeDraft,
    approvedMemoryNotes,
    customerChatSession,
    draft,
    fulfillmentContext,
    fulfillmentRecommendationSet,
    handoff,
    pricingComparison,
    printPackage,
    validation
  } = cardDraftSession;
  const calendarConnectionStartPackets = useMemo(() => buildCalendarConnectionStartPackets(), []);
  const aiFlowSummary = useMemo(() => buildBrowserAiFlowSummary(aiFlowConfigs), [aiFlowConfigs]);
  const setAiFlowConfigs = useCallback((configs: AiFlowAdminConfig[]) => {
    const normalized = normalizeAiFlowAdminConfigs(configs);
    setAiFlowConfigsState(normalized);
    saveBrowserAiFlowAdminConfigs(normalized);
  }, []);

  const triggerAiCardGen = useCallback((targetPanelId?: CardPanel["id"] | CardPanel["id"][]) => {
    if (aiCardGenLoading) return;
    const targetPanelIds = Array.isArray(targetPanelId) ? targetPanelId : targetPanelId ? [targetPanelId] : [];
    const selectedPanels = targetPanelIds.length > 0
      ? activeDraft.panels.filter((panel) => targetPanelIds.includes(panel.id))
      : [];
    const selectedPanelSet = new Set(selectedPanels.map((panel) => panel.id));
    const hasSelectedPanels = selectedPanels.length > 0;
    const requestDraft = hasSelectedPanels ? activeDraft : draft;
    const requestPanels = hasSelectedPanels ? selectedPanels : requestDraft.panels;
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
    setAiCardGenLoading(true);
    setAiStale(false);
    setAiPanelGenerationProgress(progressForPanels(requestPanels, "queued"));
    setAiCardGenStatus(
      hasSelectedPanels
        ? selectedPanels.length === 1
          ? `Regenerating ${selectedPanels[0].label}. The other panels will stay unchanged.`
          : `Regenerating ${selectedPanels.length} selected panels. The other panels will stay unchanged.`
        : "Starting your AI card. Panels will appear as each one is ready."
    );
    buildAiCardGenerationHeaders(getCustomerApiToken)
      .then((headers) =>
        fetchBrowser(cardGenerationEndpoint.requestUrl, {
          method: "POST",
          headers,
          body: baseBody
        })
      )
      .then(readAiGenerationResponse)
      .then(async (initialResult: AiGenerationApiResult) => {
        let result = initialResult;
        if (result.status === "queued" || result.queue_status === "queued") {
          setAiDraft(requestDraft);
          setAiCardGenStatus("Template is ready while AI drafts the card in the background.");
          setAiPanelGenerationProgress(progressForPanels(requestPanels, "queued"));
          result = await pollQueuedAiGenerationJob({
            getCustomerApiToken,
            jobId: result.job_id,
            statusUrl: result.job_status_url,
            onStatus: (status) => {
              setAiCardGenStatus(status.statusText);
              setAiPanelGenerationProgress(progressForPanels(requestPanels, "queued"));
            }
          });
        }

        const imageByPanel = new Map<string, AiGenerationApiImage>(
          (result.images ?? [])
            .filter((image): image is AiGenerationApiImage & { panel_id: string; image_url: string } =>
              typeof image.panel_id === "string" && typeof image.image_url === "string" && image.image_url.length > 0
            )
            .map((image) => [image.panel_id, image])
        );
        const copyByPanel = new Map<string, AiGenerationApiPanel>(
          (result.card_copy?.panels ?? [])
            .filter((copy): copy is AiGenerationApiPanel & { id: string } => typeof copy.id === "string" && copy.id.length > 0)
            .map((copy) => [copy.id, copy])
        );
        const basePanels = hasSelectedPanels ? requestDraft.panels : requestPanels;
        const aiPanels = basePanels.map((panel) => {
          if (hasSelectedPanels && !selectedPanelSet.has(panel.id)) return panel;
          const copy = copyByPanel.get(panel.id);
          if (!copy) return panel;
          return {
            ...panel,
            headline: copy.headline || panel.headline,
            body: copy.body || panel.body,
            artDirection: copy.art_direction || panel.artDirection,
            textLayout: readAiTextLayout(copy) ?? panel.textLayout,
            imageUrl: undefined
          };
        });
        const panelCount = requestPanels.length;
        const hasImages = imageByPanel.size > 0;
        const artworkFailure = readArtworkFailure(result);
        const generatedBy = result.generated_by === "user-content-only"
          ? "user-content-only"
          : hasImages
            ? "ai-text-and-image"
            : "ai-text-only";
        setAiDraft({ ...requestDraft, panels: aiPanels, generatedBy });
        // A fresh whole-card draft replaces exact edits; selected generation replaces only those face edits.
        setPanelOverrides((current) =>
          hasSelectedPanels
            ? selectedPanels.reduce((next, panel) => clearPanelOverride(next, panel.id), current)
            : emptyPanelOverrides
        );
        setAiStale(false);
        setAiPanelGenerationProgress(buildAiPanelGenerationProgress(requestPanels, copyByPanel, imageByPanel));
        setAiGenerationJobs((current) =>
          prependAiGenerationJob(current, buildAiGenerationJobEvidence({ result, draft: requestDraft }), 10)
        );
        if (!hasImages) {
          setAiCardGenStatus(
            artworkFailure
              ? artworkFailure === imageGenerationDisabledFailure
                ? "Copy is ready. Artwork is using the printable template because image generation is not enabled."
                : `Copy is ready. Artwork is blocked by settings: ${artworkFailure}`
              : hasSelectedPanels && selectedPanels.length === 1
                ? `${selectedPanels[0].label} copy is ready. No artwork was returned, so template artwork stays editable.`
                : hasSelectedPanels
                  ? `${selectedPanels.length} selected panels have copy ready. No artwork was returned, so template artwork stays editable.`
                : "Copy is ready. No artwork was returned, so template panels stay editable."
          );
          return;
        }

        setAiCardGenStatus(
          hasSelectedPanels && selectedPanels.length === 1
            ? `${selectedPanels[0].label} copy is ready. Loading artwork for this panel.`
            : hasSelectedPanels
              ? `${selectedPanels.length} selected panels have copy ready. Loading artwork for those panels.`
            : `Copy is ready. Loading ${imageByPanel.size}/${panelCount} artwork panels as they finish.`
        );
        let loadedPanelCount = 0;
        await Promise.allSettled(
          requestPanels.map(async (panel) => {
            const image = imageByPanel.get(panel.id);
            const imageUrl = image?.image_url;
            if (!imageUrl) return;
            try {
              await preloadGeneratedPanelImage(imageUrl);
              loadedPanelCount += 1;
              setAiDraft((current) => {
                if (!current) return current;
                return {
                  ...current,
                  generatedBy: "ai-text-and-image",
                  panels: current.panels.map((candidate) =>
                    candidate.id === panel.id ? { ...candidate, imageUrl: imageUrl } : candidate
                  )
                };
              });
              setAiPanelGenerationProgress((current) => ({ ...current, [panel.id]: "artwork-ready" }));
              setAiCardGenStatus(`Loaded ${loadedPanelCount}/${panelCount} artwork panels. Ready panels are available to review.`);
            } catch {
              setAiPanelGenerationProgress((current) => ({ ...current, [panel.id]: "artwork-missing" }));
            }
          })
        );
        setAiCardGenStatus(
          hasSelectedPanels && selectedPanels.length === 1 && loadedPanelCount === panelCount
            ? `${selectedPanels[0].label} regenerated. Review this panel before printing.`
            : hasSelectedPanels && loadedPanelCount === panelCount
              ? `${selectedPanels.length} selected panels regenerated. Review them before printing.`
            : loadedPanelCount === panelCount
            ? "AI draft ready. Review each panel before printing."
            : `AI draft ready with ${loadedPanelCount}/${panelCount} artwork panels. Review the copy before printing.`
        );
      })
      .catch((err: unknown) => {
        console.error("AI card gen failed:", err);
        setAiCardGenStatus(err instanceof Error ? err.message : "AI card generation failed. Try again in a moment.");
        setAiPanelGenerationProgress(progressForPanels(requestPanels, "artwork-missing"));
      })
      .finally(() => { setAiCardGenLoading(false); });
  }, [activeDraft, aiCardGenLoading, approvedMemoryNotes, draft, draftInput, getCustomerApiToken]);

  // Keep the generated artwork but apply the customer's latest words to the panels.
  const keepAiArtwork = useCallback(() => {
    setAiDraft((current) => {
      if (!current) return current;
      const imageByPanel = new Map(current.panels.map((panel) => [panel.id, panel.imageUrl]));
      return {
        ...draft,
        panels: draft.panels.map((panel) => ({ ...panel, imageUrl: imageByPanel.get(panel.id) })),
        generatedBy: current.generatedBy
      };
    });
    setAiStale(false);
  }, [draft]);

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
    aiStale,
    keepAiArtwork,
    aiCardGenLoading,
    aiCardGenStatus,
    aiPanelGenerationProgress,
    aiGenerationJobs,
    triggerAiCardGen,
    cardGenAvailable: true,
    aiFlowConfigs,
    setAiFlowConfigs,
    aiFlowSummary,
    memories,
    signal,
    cardDraftSession,
    pricingComparison,
    opportunity,
    draft,
    templateDraft: cardDraftSession.templateDraft,
    activeDraft,
    activePanels: cardDraftSession.activePanels,
    panelOverrides,
    updatePanelOverride,
    revertPanelOverride,
    validation,
    handoff,
    fulfillmentRecommendationSet,
    printPackage,
    localizationSummary,
    selectedLocale,
    approvedMemoryNotes,
    fulfillmentContext,
    calendarConnectionStartPackets,
    customerChatSession
  };
}

export function syncDraftInputWithOpportunity(
  current: CardDraftInput,
  {
    workspace,
    opportunity,
    opportunityChanged
  }: {
    workspace: LocalWorkspace | undefined;
    opportunity: CardOpportunity;
    opportunityChanged: boolean;
  }
): CardDraftInput {
  const base = opportunityChanged ? getDefaultDraftInput(workspace, opportunity) : current;
  return {
    ...base,
    sender: current.sender === "Local User" ? (workspace?.name ?? current.sender) : current.sender,
    useMemory: opportunity.memoryIds.length > 0 ? true : current.useMemory,
    tone: current.tone,
    style: current.style,
    language: current.language
  };
}

function readAiTextLayout(copy: AiGenerationApiPanel): CardTextLayout | undefined {
  const raw = copy.text_layout ?? copy.textLayout;
  if (!raw || typeof raw !== "object") return undefined;
  const record = raw as Record<string, unknown>;
  const headlineZone = safeLayoutEnum(record.headline_zone ?? record.headlineZone, ["top", "upper", "center", "lower"]);
  const bodyZone = safeLayoutEnum(record.body_zone ?? record.bodyZone, ["upper", "center", "lower", "bottom"]);
  const alignment = safeLayoutEnum(record.alignment, ["left", "center", "right"]);
  const fontPairing = safeLayoutEnum(record.font_pairing ?? record.fontPairing, ["serif-sans", "bold-editorial", "minimal-sans", "soft-serif"]);
  const colorMode = safeLayoutEnum(record.color_mode ?? record.colorMode, ["dark-ink", "light-ink", "accent-ink", "high-contrast"]);
  const scale = safeLayoutEnum(record.scale, ["compact", "standard", "large"]);
  if (!headlineZone || !bodyZone || !alignment || !fontPairing || !colorMode || !scale) return undefined;
  return { headlineZone, bodyZone, alignment, fontPairing, colorMode, scale };
}

function safeLayoutEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  const normalized = String(value ?? "").trim().toLowerCase();
  return (allowed as readonly string[]).includes(normalized) ? (normalized as T) : undefined;
}

export async function buildAiCardGenerationHeaders(
  getCustomerApiToken?: CustomerApiTokenProvider
): Promise<Headers> {
  try {
    return await buildBrowserRequestHeaders({
      contentType: "application/json",
      getToken: getCustomerApiToken,
      idempotencyKey: buildBrowserIdempotencyKey("card-gen"),
      requireToken: true
    });
  } catch {
    throw new Error("AI card generation needs an active signed-in session.");
  }
}

export async function readAiGenerationResponse(response: Response): Promise<AiGenerationApiResult> {
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json() as Record<string, unknown>
    : undefined;

  if (!response.ok) {
    throw new Error(formatAiGenerationHttpError(response.status, payload));
  }
  if (payload?.status === "queued" || payload?.queue_status === "queued") {
    if (typeof payload.job_id === "string" && payload.job_id.trim()) return payload as AiGenerationApiResult;
    throw new Error("AI card generation queued without a job id.");
  }
  if (!payload || !Array.isArray((payload.card_copy as { panels?: unknown } | undefined)?.panels)) {
    throw new Error("AI card generation returned an unexpected response.");
  }
  return payload as AiGenerationApiResult;
}

export async function readAiGenerationJobStatusResponse(response: Response): Promise<AiGenerationJobPollResult> {
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json() as Record<string, unknown>
    : undefined;

  if (!response.ok) {
    throw new Error(formatAiGenerationHttpError(response.status, payload));
  }
  if (!payload) throw new Error("AI card job status returned an unexpected response.");

  const jobId = readOptionalString(payload.job_id ?? payload.jobId);
  const queueStatus = readOptionalString(payload.queue_status ?? payload.queueStatus);
  if (queueStatus === "dead_lettered") {
    const detail = readOptionalString(payload.last_error ?? payload.error ?? payload.status);
    throw new Error(detail ? `AI card generation failed after retries: ${detail}` : "AI card generation failed after retries.");
  }

  if (payload.result_available === true || payload.resultAvailable === true) {
    const result = readCompletedAiGenerationPayload(payload);
    if (!result) throw new Error("AI card job completed without a usable card result.");
    return { status: "ready", result };
  }

  return {
    status: "pending",
    jobId,
    queueStatus: queueStatus || "queued",
    retryAfterSeconds: coerceRetryAfterSeconds(payload.retry_after_seconds ?? payload.retryAfterSeconds, response.headers.get("retry-after")),
    statusText: formatQueuedAiGenerationStatus(queueStatus || "queued")
  };
}

async function pollQueuedAiGenerationJob({
  getCustomerApiToken,
  jobId,
  statusUrl,
  onStatus,
  maxAttempts = 60
}: {
  getCustomerApiToken?: CustomerApiTokenProvider;
  jobId?: string;
  statusUrl?: string;
  onStatus?: (status: Extract<AiGenerationJobPollResult, { status: "pending" }>) => void;
  maxAttempts?: number;
}): Promise<AiGenerationApiResult> {
  const path = normalizeAiJobStatusUrl(statusUrl, jobId);
  let retryAfterSeconds = 2;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) await wait(Math.min(10, Math.max(1, retryAfterSeconds)) * 1000);
    const headers = await buildCustomerAuthorizationHeaders(getCustomerApiToken);
    const response = await fetchBrowser(path, { cache: "no-store", headers });
    const status = await readAiGenerationJobStatusResponse(response);
    if (status.status === "ready") return status.result;

    retryAfterSeconds = status.retryAfterSeconds;
    onStatus?.(status);
  }

  throw new Error("AI card generation is still queued. You can keep editing the template and try again in a moment.");
}

function readCompletedAiGenerationPayload(payload: Record<string, unknown>): AiGenerationApiResult | undefined {
  const result = payload.result && typeof payload.result === "object" ? payload.result as Record<string, unknown> : undefined;
  const candidate = result?.payload && typeof result.payload === "object"
    ? result.payload as Record<string, unknown>
    : result;
  if (!candidate || !Array.isArray((candidate.card_copy as { panels?: unknown } | undefined)?.panels)) return undefined;
  return {
    ...candidate,
    job_id: readOptionalString(payload.job_id ?? payload.jobId),
    queue_status: readOptionalString(payload.queue_status ?? payload.queueStatus),
    result_available: true
  } as AiGenerationApiResult;
}

async function buildCustomerAuthorizationHeaders(getCustomerApiToken?: CustomerApiTokenProvider): Promise<Headers> {
  try {
    return await buildBrowserRequestHeaders({ getToken: getCustomerApiToken, requireToken: true });
  } catch {
    throw new Error("AI card generation needs an active signed-in session.");
  }
}

function normalizeAiJobStatusUrl(statusUrl: string | undefined, jobId: string | undefined): string {
  const raw = readOptionalString(statusUrl) || (jobId ? `/api/ai/jobs/status?job_id=${encodeURIComponent(jobId)}` : "");
  if (!raw) throw new Error("AI card generation queued without a status URL.");
  if (raw.startsWith("/")) return raw;

  const baseOrigin = typeof window === "undefined" ? "http://customcard.local" : window.location.origin;
  const parsed = new URL(raw, baseOrigin);
  if (parsed.origin !== baseOrigin) throw new Error("AI card generation returned an unsafe status URL.");
  return `${parsed.pathname}${parsed.search}`;
}

function formatQueuedAiGenerationStatus(queueStatus: string): string {
  if (queueStatus === "running") return "AI is writing the card now. The template stays editable while it works.";
  if (queueStatus === "queued") return "AI draft is queued. The template stays editable while the worker starts.";
  return `AI draft is ${queueStatus}. The template stays editable while the worker updates.`;
}

function coerceRetryAfterSeconds(payloadValue: unknown, headerValue: string | null): number {
  const payloadNumber = Number(payloadValue);
  if (Number.isFinite(payloadNumber) && payloadNumber > 0) return Math.min(30, Math.max(1, Math.round(payloadNumber)));
  const headerNumber = Number(headerValue);
  if (Number.isFinite(headerNumber) && headerNumber > 0) return Math.min(30, Math.max(1, Math.round(headerNumber)));
  return 2;
}

function readOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatAiGenerationHttpError(status: number, payload: Record<string, unknown> | undefined): string {
  const detail = readAiGenerationErrorDetail(payload);
  if (status === 404) return "AI drafting is temporarily unavailable. You can keep editing the template card or save a print package.";
  if (status === 401 || status === 403) {
    return detail
      ? `AI card generation could not verify your signed-in session: ${detail}.`
      : "AI card generation needs a signed-in session.";
  }
  return detail ? `AI card generation failed: ${detail}` : `AI card generation returned HTTP ${status}.`;
}

function readAiGenerationErrorDetail(payload: Record<string, unknown> | undefined): string {
  for (const key of ["detail", "error", "status", "message"]) {
    const value = payload?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

const imageGenerationDisabledFailure = "image generation is disabled in server settings.";

function readArtworkFailure(result: AiGenerationApiResult): string {
  const failure = result.ai_flow?.card_image?.provider_failure;
  if (typeof failure !== "string" || !failure.trim()) return "";
  if (/Live provider calls disabled for card-image/i.test(failure)) {
    return imageGenerationDisabledFailure;
  }
  return failure.trim();
}

export function progressForPanels(
  panels: CardPanel[],
  status: AiPanelGenerationStatus
): AiPanelGenerationProgress {
  return panels.reduce<AiPanelGenerationProgress>((progress, panel) => {
    progress[panel.id] = status;
    return progress;
  }, {});
}

export function buildAiPanelGenerationProgress(
  panels: CardPanel[],
  copyByPanel: ReadonlyMap<string, AiGenerationApiPanel>,
  imageByPanel: ReadonlyMap<string, AiGenerationApiImage>
): AiPanelGenerationProgress {
  return panels.reduce<AiPanelGenerationProgress>((progress, panel) => {
    if (imageByPanel.has(panel.id)) {
      progress[panel.id] = "artwork-loading";
    } else if (copyByPanel.has(panel.id)) {
      progress[panel.id] = "copy-ready";
    } else {
      progress[panel.id] = "artwork-missing";
    }
    return progress;
  }, {});
}

function preloadGeneratedPanelImage(imageUrl: string): Promise<void> {
  if (typeof Image === "undefined") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (typeof image.decode === "function") {
        void image.decode().then(resolve).catch(() => resolve());
        return;
      }
      resolve();
    };
    image.onerror = () => reject(new Error("Generated panel image did not load."));
    image.src = imageUrl;
  });
}
