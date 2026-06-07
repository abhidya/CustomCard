import {
  Calendar,
  Check,
  CircleCheck,
  ClipboardCheck,
  Cloud,
  Download,
  FileDown,
  Globe2,
  Heart,
  Image,
  KeyRound,
  Lock,
  CreditCard,
  MessageCircle,
  PackageCheck,
  PanelTop,
  Plus,
  Printer,
  RefreshCw,
  Settings,
  ShieldCheck,
  Smartphone,
  Store,
  Search,
  Trash2,
  Upload,
  UserRound,
  WandSparkles,
  XCircle,
  type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  aiProviderReadinessItems,
  summarizeAiProviderReadiness,
  type AiProviderReadinessItem,
  type AiProviderReadinessSummary
} from "./aiProviderReadiness";
import {
  capacityProfiles,
  summarizeCapacityPlan,
  type CapacityPlanSummary,
  type CapacityProfile
} from "./capacityPlan";
import {
  externalAuditReadinessItems,
  summarizeExternalAuditReadiness,
  type ExternalAuditReadinessItem,
  type ExternalAuditReadinessSummary
} from "./externalAuditReadiness";
import {
  e2eCoverageItems,
  summarizeE2eCoverage,
  type E2eCoverageItem,
  type E2eCoverageSummary
} from "./e2eCoverage";
import {
  addMemory,
  buildOpportunity,
  buildVendorHandoff,
  createLocalWorkspace,
  defaultMemories,
  freeAdapterLabels,
  generateCardDraft,
  getDefaultDraftInput,
  parseFreeImport,
  removeMemory,
  sampleInviteText,
  validateCardDraft,
  type CardDraftInput,
  type CardOpportunity,
  type CardPanel,
  type CardValidation,
  type LanguageChoice,
  type LocalWorkspace,
  type MemoryItem,
  type Tone,
  type VendorHandoff,
  type VendorId,
  type VisualStyle
} from "./freeMvp";
import {
  buildAdminPanelModel,
  capabilityLabels,
  providerCatalog,
  providerStatusLabel,
  type AdminPanelModel,
  type ProviderAdapter,
  type ProviderCapability,
  type ProviderStatus
} from "./providerCatalog";
import { buildCustomerChatSession, type CustomerChatSession } from "./customerChat";
import {
  getSupportedLocale,
  supportedLocales,
  summarizeLocalizationReadiness,
  type LocalizationReadinessSummary,
  type SupportedLocale,
  type SupportedLocaleCode
} from "./localization";
import {
  observabilityReadinessItems,
  summarizeObservabilityReadiness,
  type ObservabilityReadinessItem,
  type ObservabilityReadinessSummary
} from "./observabilityReadiness";
import {
  retailFulfillmentReadinessItems,
  summarizeRetailFulfillmentReadiness,
  type RetailFulfillmentReadinessItem,
  type RetailFulfillmentReadinessSummary
} from "./retailFulfillmentReadiness";
import {
  paymentReadinessItems,
  summarizePaymentReadiness,
  type PaymentReadinessItem,
  type PaymentReadinessSummary
} from "./paymentReadiness";
import {
  mobileRenderReadinessItems,
  summarizeMobileRenderReadiness,
  type MobileRenderReadinessItem,
  type MobileRenderReadinessSummary
} from "./mobileRenderReadiness";
import {
  hostedApiReadinessItems,
  summarizeHostedApiReadiness,
  type HostedApiReadinessItem,
  type HostedApiReadinessSummary
} from "./hostedApiReadiness";
import {
  reviewerDbSeedReadinessItems,
  summarizeReviewerDbSeedReadiness,
  type ReviewerDbSeedReadinessItem,
  type ReviewerDbSeedReadinessSummary
} from "./reviewerDbSeedReadiness";
import {
  cloudArtifactProofReadinessItems,
  summarizeCloudArtifactProofReadiness,
  type CloudArtifactProofReadinessItem,
  type CloudArtifactProofReadinessSummary
} from "./cloudArtifactProofReadiness";
import {
  businessEngagementReadinessItems,
  summarizeBusinessEngagementReadiness,
  type BusinessEngagementReadinessItem,
  type BusinessEngagementReadinessSummary
} from "./businessEngagementReadiness";
import { summarizeProviderGovernance, type ProviderGovernanceSummary } from "./providerGovernance";
import { buildProviderAdapterRuntime, type RuntimeReadiness } from "./providerRuntime";
import {
  productionLaunchGates,
  summarizeProductionReadiness,
  type ProductionLaunchGate,
  type ProductionReadinessSummary
} from "./productionReadiness";
import {
  buildPrinterPricingComparison,
  type PrinterPricingComparison
} from "./printerPricing";
import {
  buildFulfillmentRecommendations,
  type FulfillmentRecommendation,
  type FulfillmentRecommendationSet
} from "./fulfillmentRecommendation";
import { buildPanelSvgExportFile, buildPrintExportPackage, type PrintExportFile, type PrintExportPackage } from "./printExport";

type ViewId = "customer" | "opportunities" | "studio" | "memory" | "handoff" | "admin" | "adapters";
type OpportunityDecision = "pending" | "accepted" | "snoozed" | "dismissed";
type AdapterStatusFilter = ProviderStatus | "all";
type AdapterCapabilityFilter = ProviderCapability | "all";

interface NavItem {
  id: ViewId;
  label: string;
  icon: LucideIcon;
}

const workspaceKey = "customcard-free-workspace-v1";
const fixedReviewDate = new Date("2026-06-03T12:00:00.000Z");

const navItems: NavItem[] = [
  { id: "customer", label: "Customer panel", icon: UserRound },
  { id: "opportunities", label: "Opportunities", icon: Calendar },
  { id: "studio", label: "Card studio", icon: WandSparkles },
  { id: "memory", label: "Memory", icon: Heart },
  { id: "handoff", label: "Handoff", icon: Printer },
  { id: "admin", label: "Admin panel", icon: ShieldCheck },
  { id: "adapters", label: "Adapters", icon: Settings }
];

const tones: Tone[] = ["warm", "playful", "elegant", "reverent"];
const styles: VisualStyle[] = ["botanical", "bold-type", "photo-note", "minimal"];
const languages: LanguageChoice[] = ["English", "Spanish", "Urdu", "Arabic"];
const vendors: VendorId[] = ["walgreens", "cvs", "fedex", "walmart", "staples", "office-depot", "local-print-shop"];

function App() {
  const [activeView, setActiveView] = useState<ViewId>("customer");
  const [workspace, setWorkspace] = useState<LocalWorkspace | undefined>(() => loadWorkspace());
  const [authForm, setAuthForm] = useState({ name: "Abdul Demo", email: "demo@customcard.local" });
  const [inviteText, setInviteText] = useState(sampleInviteText);
  const [scanStatus, setScanStatus] = useState("Sample invite loaded");
  const [opportunityDecision, setOpportunityDecision] = useState<OpportunityDecision>("pending");
  const [vendorId, setVendorId] = useState<VendorId>("walgreens");
  const [localeCode, setLocaleCode] = useState<SupportedLocaleCode>("en-US");
  const [memoryForm, setMemoryForm] = useState({ recipient: "Sara and Ahmed", note: "" });
  const [exportStatus, setExportStatus] = useState("Ready to export");
  const [customerChatInput, setCustomerChatInput] = useState("Can you keep this personal and find the cheapest pickup?");
  const [customerChatMessages, setCustomerChatMessages] = useState<CustomerChatSession["messages"] | undefined>();

  const memories = workspace?.memories ?? defaultMemories;
  const signal = useMemo(() => parseFreeImport(inviteText), [inviteText]);
  const opportunity = useMemo(() => buildOpportunity(signal, memories, fixedReviewDate), [signal, memories]);
  const [draftInput, setDraftInput] = useState<CardDraftInput>(() =>
    getDefaultDraftInput(undefined, buildOpportunity(parseFreeImport(sampleInviteText), defaultMemories, fixedReviewDate))
  );

  useEffect(() => {
    setDraftInput((current) => ({
      ...getDefaultDraftInput(workspace, opportunity),
      tone: current.tone,
      style: current.style,
      language: current.language
    }));
  }, [workspace, opportunity]);

  const draft = useMemo(() => generateCardDraft(draftInput, memories), [draftInput, memories]);
  const validation = useMemo(() => validateCardDraft(draft), [draft]);
  const handoff = useMemo(() => buildVendorHandoff(vendorId, validation), [vendorId, validation]);
  const pricingComparison = useMemo(() => buildPrinterPricingComparison(vendorId), [vendorId]);
  const fulfillmentRecommendationSet = useMemo(
    () => buildFulfillmentRecommendations(pricingComparison),
    [pricingComparison]
  );
  const printPackage = useMemo(() => buildPrintExportPackage(draft, validation, handoff), [draft, validation, handoff]);
  const adminPanelModel = useMemo(() => buildAdminPanelModel(), []);
  const localizationSummary = useMemo(() => summarizeLocalizationReadiness(), []);
  const selectedLocale = useMemo(() => getSupportedLocale(localeCode), [localeCode]);
  const approvedMemoryNotes = useMemo(() => memories.filter((memory) => memory.approved).map((memory) => memory.note), [memories]);
  const fulfillmentContext = useMemo(
    () =>
      fulfillmentRecommendationSet.recommendations
        .map((recommendation) => `${recommendation.label}: ${recommendation.subtotalLabel} at ${recommendation.vendorName}`)
        .join("; "),
    [fulfillmentRecommendationSet]
  );
  const providerGovernance = useMemo(() => summarizeProviderGovernance(), []);
  const productionReadiness = useMemo(() => summarizeProductionReadiness(), []);
  const externalAuditSummary = useMemo(() => summarizeExternalAuditReadiness(), []);
  const e2eCoverageSummary = useMemo(() => summarizeE2eCoverage(), []);
  const aiProviderReadinessSummary = useMemo(() => summarizeAiProviderReadiness(), []);
  const capacitySummary = useMemo(() => summarizeCapacityPlan(), []);
  const observabilitySummary = useMemo(() => summarizeObservabilityReadiness(), []);
  const retailFulfillmentSummary = useMemo(() => summarizeRetailFulfillmentReadiness(), []);
  const paymentReadinessSummary = useMemo(() => summarizePaymentReadiness(), []);
  const mobileRenderReadinessSummary = useMemo(() => summarizeMobileRenderReadiness(), []);
  const hostedApiReadinessSummary = useMemo(() => summarizeHostedApiReadiness(), []);
  const reviewerDbSeedReadinessSummary = useMemo(() => summarizeReviewerDbSeedReadiness(), []);
  const cloudArtifactProofReadinessSummary = useMemo(() => summarizeCloudArtifactProofReadiness(), []);
  const businessEngagementReadinessSummary = useMemo(() => summarizeBusinessEngagementReadiness(), []);
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
    [
      approvedMemoryNotes,
      customerChatMessages,
      fulfillmentContext,
      opportunity.recipient,
      seededCustomerChat.messages,
      selectedLocale.locale
    ]
  );
  const opsView = activeView === "admin" || activeView === "adapters";

  useEffect(() => {
    setCustomerChatMessages(undefined);
  }, [localeCode, opportunity.id]);

  function saveWorkspace(nextWorkspace: LocalWorkspace | undefined) {
    setWorkspace(nextWorkspace);
    if (!nextWorkspace) {
      localStorage.removeItem(workspaceKey);
      return;
    }
    localStorage.setItem(workspaceKey, JSON.stringify(nextWorkspace));
  }

  function startWorkspace() {
    const nextWorkspace = createLocalWorkspace(authForm.name, authForm.email, fixedReviewDate);
    saveWorkspace(nextWorkspace);
    setScanStatus("Local workspace ready");
  }

  function addApprovedMemory() {
    if (!workspace) {
      const nextWorkspace = createLocalWorkspace(authForm.name, authForm.email, fixedReviewDate);
      const withMemory = addMemory(nextWorkspace, memoryForm.recipient, memoryForm.note, fixedReviewDate);
      saveWorkspace(withMemory);
    } else {
      saveWorkspace(addMemory(workspace, memoryForm.recipient, memoryForm.note, fixedReviewDate));
    }
    setMemoryForm({ recipient: memoryForm.recipient, note: "" });
  }

  function deleteMemory(memoryId: string) {
    if (!workspace) return;
    saveWorkspace(removeMemory(workspace, memoryId));
  }

  function scanImport() {
    setScanStatus(`${signal.source} scanned`);
    setOpportunityDecision("pending");
  }

  function updateDraft<K extends keyof CardDraftInput>(field: K, value: CardDraftInput[K]) {
    setDraftInput((current) => ({ ...current, [field]: value }));
  }

  function chooseLocale(nextLocaleCode: SupportedLocaleCode) {
    const nextLocale = getSupportedLocale(nextLocaleCode);
    setLocaleCode(nextLocale.locale);
    setDraftInput((current) => ({ ...current, language: nextLocale.cardLanguage }));
  }

  function downloadPanel(panel: CardPanel) {
    downloadExportFile(buildPanelSvgExportFile(panel, draft.id));
    setExportStatus(`${panel.label} SVG downloaded`);
  }

  function downloadExportFile(file: PrintExportFile) {
    const blob = new Blob([file.text], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadAllPanels() {
    draft.panels.forEach((panel, index) => {
      window.setTimeout(() => downloadPanel(panel), index * 80);
    });
    setExportStatus("SVG panel downloads queued");
  }

  function downloadPrintPackage() {
    printPackage.files.forEach((file, index) => {
      window.setTimeout(() => downloadExportFile(file), index * 80);
    });
    setExportStatus(`Print package queued: ${printPackage.files.length} files`);
  }

  async function copyChecklist() {
    const text = [
      `${handoff.vendorName} manual handoff`,
      ...handoff.checklist.map((item, index) => `${index + 1}. ${item}`),
      "Real orders disabled: no live quote, payment, or order API is connected."
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setExportStatus("Checklist copied");
    } catch {
      setExportStatus("Clipboard unavailable; checklist remains visible");
    }
  }

  function sendCustomerChat() {
    const nextSession = buildCustomerChatSession(
      {
        recipientName: opportunity.recipient,
        customerMessage: customerChatInput,
        approvedMemoryNotes,
        locale: selectedLocale.locale,
        fulfillmentContext
      },
      customerChatSession.messages
    );

    setCustomerChatMessages(nextSession.messages);
    setCustomerChatInput("");
  }

  return (
    <div className="appShell">
      <a className="skipLink" href="#main-content">
        Skip to main content
      </a>
      <aside className="appRail" aria-label="CustomCard navigation">
        <div className="brandBlock">
          <span className="brandSigil">CC</span>
          <div>
            <strong>CustomCard</strong>
            <small>Free local MVP</small>
          </div>
        </div>

        <nav className="navList">
          {navItems.map((item) => (
            <button
              className={activeView === item.id ? "navButton active" : "navButton"}
              key={item.id}
              onClick={() => setActiveView(item.id)}
              type="button"
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="railStatus">
          <Lock size={18} />
          <div>
            <strong>Checkout confirmation</strong>
            <span>No automatic charge</span>
          </div>
        </div>
      </aside>

      <main className="appMain" id="main-content">
        <header className="topBar">
          <div>
            <p className="eyebrow">Runnable product workflow</p>
            <h1>CustomCard</h1>
          </div>
          <div className="topStatus" aria-label="MVP safety status">
            {opsView ? (
              <>
                <StatusChip icon={ShieldCheck} label="Local auth" tone="green" />
                <StatusChip icon={FileDown} label="SVG export" tone="blue" />
                <StatusChip icon={XCircle} label="Live orders off" tone="red" />
              </>
            ) : (
              <>
                <StatusChip icon={ShieldCheck} label="Private review" tone="green" />
                <StatusChip icon={Calendar} label="Event scan" tone="blue" />
                <StatusChip icon={Store} label="Best option" tone="blue" />
              </>
            )}
          </div>
        </header>

        {activeView === "customer" && (
          <CustomerPanelView
            chatInput={customerChatInput}
            chatSession={customerChatSession}
            handoff={handoff}
            localizationSummary={localizationSummary}
            onChatInput={setCustomerChatInput}
            onChatSend={sendCustomerChat}
            onLocale={chooseLocale}
            onNavigate={setActiveView}
            onGenerateCard={() => {
              setOpportunityDecision("accepted");
              setActiveView("studio");
            }}
            onStartWorkspace={startWorkspace}
            opportunity={opportunity}
            opportunityDecision={opportunityDecision}
            panelCount={draft.panels.length}
            fulfillmentRecommendationSet={fulfillmentRecommendationSet}
            productionReadiness={productionReadiness}
            selectedLocale={selectedLocale}
            workspace={workspace}
          />
        )}

        {activeView !== "customer" && (
          <section className="workspaceBand" aria-label="Workspace">
            <div className="workspaceIdentity">
              <div className="iconBadge">
                <UserRound size={22} />
              </div>
              <div>
                <span>{workspace ? "Signed in locally" : "Demo auth"}</span>
                <strong>{workspace?.name ?? "Create a local workspace"}</strong>
                <small>{workspace?.email ?? "No external provider required"}</small>
              </div>
            </div>

            {workspace ? (
              <div className="workspaceActions">
                <button className="quietButton" type="button" onClick={() => setActiveView("memory")}>
                  <Heart size={16} />
                  {workspace.memories.length} memories
                </button>
                <button className="dangerButton" type="button" onClick={() => saveWorkspace(undefined)}>
                  <Trash2 size={16} />
                  Clear
                </button>
              </div>
            ) : (
              <div className="authInline">
                <label>
                  <span>Name</span>
                  <input
                    value={authForm.name}
                    onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    value={authForm.email}
                    onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>
                <button className="primaryButton" type="button" onClick={startWorkspace}>
                  <KeyRound size={16} />
                  Start local workspace
                </button>
              </div>
            )}
          </section>
        )}

        {opsView && (
          <section className="adapterStrip" aria-label="Free MVP adapters">
            {freeAdapterLabels.map((label) => (
              <span key={label}>
                <Check size={14} />
                {label}
              </span>
            ))}
          </section>
        )}

        {activeView === "opportunities" && (
          <OpportunitiesView
            inviteText={inviteText}
            onDecision={setOpportunityDecision}
            onInviteText={setInviteText}
            onScan={scanImport}
            onStartCard={() => {
              setOpportunityDecision("accepted");
              setActiveView("studio");
            }}
            opportunity={opportunity}
            decision={opportunityDecision}
            scanStatus={scanStatus}
            warnings={signal.warnings}
          />
        )}

        {activeView === "studio" && (
          <StudioView
            draftInput={draftInput}
            memories={memories}
            onExport={() => setActiveView("handoff")}
            onUpdate={updateDraft}
            opportunity={opportunity}
            panels={draft.panels}
            validation={validation}
          />
        )}

        {activeView === "memory" && (
          <MemoryView
            canDelete={Boolean(workspace)}
            memories={memories}
            memoryForm={memoryForm}
            onAdd={addApprovedMemory}
            onDelete={deleteMemory}
            onFormChange={setMemoryForm}
          />
        )}

        {activeView === "handoff" && (
          <HandoffView
            exportStatus={exportStatus}
            handoff={handoff}
            onCopyChecklist={copyChecklist}
            onDownloadAll={downloadAllPanels}
            onDownloadPanel={downloadPanel}
            onDownloadPackage={downloadPrintPackage}
            onVendor={setVendorId}
            panels={draft.panels}
            pricingComparison={pricingComparison}
            printPackage={printPackage}
            validation={validation}
            vendorId={vendorId}
          />
        )}

        {activeView === "admin" && (
          <AdminPanelView
            capacityProfiles={capacityProfiles}
            capacitySummary={capacitySummary}
            aiProviderReadinessItems={aiProviderReadinessItems}
            aiProviderReadinessSummary={aiProviderReadinessSummary}
            e2eCoverageItems={e2eCoverageItems}
            e2eCoverageSummary={e2eCoverageSummary}
            externalAuditItems={externalAuditReadinessItems}
            externalAuditSummary={externalAuditSummary}
            localizationSummary={localizationSummary}
            model={adminPanelModel}
            observabilityItems={observabilityReadinessItems}
            observabilitySummary={observabilitySummary}
            providerGovernance={providerGovernance}
            productionReadiness={productionReadiness}
            retailFulfillmentItems={retailFulfillmentReadinessItems}
            retailFulfillmentSummary={retailFulfillmentSummary}
            paymentReadinessItems={paymentReadinessItems}
            paymentReadinessSummary={paymentReadinessSummary}
            mobileRenderReadinessItems={mobileRenderReadinessItems}
            mobileRenderReadinessSummary={mobileRenderReadinessSummary}
            hostedApiReadinessItems={hostedApiReadinessItems}
            hostedApiReadinessSummary={hostedApiReadinessSummary}
            reviewerDbSeedReadinessItems={reviewerDbSeedReadinessItems}
            reviewerDbSeedReadinessSummary={reviewerDbSeedReadinessSummary}
            cloudArtifactProofReadinessItems={cloudArtifactProofReadinessItems}
            cloudArtifactProofReadinessSummary={cloudArtifactProofReadinessSummary}
            businessEngagementReadinessItems={businessEngagementReadinessItems}
            businessEngagementReadinessSummary={businessEngagementReadinessSummary}
            runtimeReadiness={runtimeReadiness}
          />
        )}

        {activeView === "adapters" && <AdaptersView runtimeReadiness={runtimeReadiness} />}
      </main>
    </div>
  );
}

function CustomerPanelView({
  chatInput,
  chatSession,
  handoff,
  localizationSummary,
  onChatInput,
  onChatSend,
  onLocale,
  onGenerateCard,
  onNavigate,
  onStartWorkspace,
  opportunity,
  opportunityDecision,
  panelCount,
  fulfillmentRecommendationSet,
  productionReadiness,
  selectedLocale,
  workspace
}: {
  chatInput: string;
  chatSession: CustomerChatSession;
  handoff: VendorHandoff;
  localizationSummary: LocalizationReadinessSummary;
  onChatInput: (value: string) => void;
  onChatSend: () => void;
  onLocale: (locale: SupportedLocaleCode) => void;
  onGenerateCard: () => void;
  onNavigate: (view: ViewId) => void;
  onStartWorkspace: () => void;
  opportunity: CardOpportunity;
  opportunityDecision: OpportunityDecision;
  panelCount: number;
  fulfillmentRecommendationSet: FulfillmentRecommendationSet;
  productionReadiness: ProductionReadinessSummary;
  selectedLocale: SupportedLocale;
  workspace: LocalWorkspace | undefined;
}) {
  const recommendationByKind = new Map(
    fulfillmentRecommendationSet.recommendations.map((recommendation) => [recommendation.kind, recommendation])
  );
  const cheapestOption = recommendationByKind.get("cheapest-known-price");
  const fastestPickup = recommendationByKind.get("fastest-pickup");
  const cheapestShipped = recommendationByKind.get("cheapest-shipped");
  const hasWorkspace = Boolean(workspace);
  const cardReviewStarted = opportunityDecision === "accepted";
  const customerActions: Array<{
    label: string;
    detail: string;
    icon: LucideIcon;
    onClick: () => void;
    primary?: boolean;
  }> = !hasWorkspace
    ? [
        {
          label: "Create local workspace",
          detail: "Private browser storage for memories and draft state",
          icon: KeyRound,
          onClick: onStartWorkspace,
          primary: true
        },
        {
          label: "Paste invite only",
          detail: "Continue without connecting an account",
          icon: ClipboardCheck,
          onClick: () => onNavigate("opportunities")
        }
      ]
    : cardReviewStarted
      ? [
          {
            label: "Continue proof review",
            detail: "Card copy, language, and artwork checks",
            icon: WandSparkles,
            onClick: () => onNavigate("studio"),
            primary: true
          },
          {
            label: "Choose fulfillment",
            detail: "Compare pickup and shipped options",
            icon: Store,
            onClick: () => onNavigate("handoff")
          },
          {
            label: "Add memory",
            detail: "Approved details only",
            icon: Heart,
            onClick: () => onNavigate("memory")
          }
        ]
      : [
          {
            label: "Review imported event",
            detail: "Confirm recipient, date, and source evidence",
            icon: Calendar,
            onClick: () => onNavigate("opportunities"),
            primary: true
          },
          {
            label: "Make card",
            detail: "Start the local deterministic draft",
            icon: WandSparkles,
            onClick: onGenerateCard
          },
          {
            label: "Add memory",
            detail: "Attach only details you approve",
            icon: Heart,
            onClick: () => onNavigate("memory")
          }
  ];

  return (
    <section className="customerPanel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Customer workspace</p>
          <h2>Customer panel</h2>
        </div>
        <StatusChip icon={MessageCircle} label="Local assistant ready" tone="green" />
      </div>

      <div className="customerGrid">
        <article className="customerStartCard wide">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">{hasWorkspace ? "Workspace" : "Start"}</p>
              <h3>{hasWorkspace ? "Signed in locally" : "Create private workspace"}</h3>
            </div>
            <StatusChip icon={ShieldCheck} label={hasWorkspace ? "Local storage active" : "No account required"} tone="green" />
          </div>

          {hasWorkspace ? (
            <div className="workspaceSummary" aria-label="Local customer workspace">
              <div>
                <span>Customer</span>
                <strong>{workspace?.name}</strong>
                <small>{workspace?.email}</small>
              </div>
              <div>
                <span>Next source</span>
                <strong>{opportunity.title}</strong>
                <small>{opportunity.evidence.length} local evidence items ready for review</small>
              </div>
            </div>
          ) : (
            <div className="authProviderGrid" aria-label="Customer local workspace options">
              <button className="customerAuthButton primaryLocal" type="button" onClick={onStartWorkspace}>
                <KeyRound size={18} />
                <span>Create local workspace</span>
                <small>Stores memories and drafts in this browser only</small>
              </button>
              <button className="customerAuthButton" type="button" onClick={() => onNavigate("opportunities")}>
                <ClipboardCheck size={18} />
                <span>Paste invite only</span>
                <small>Use the no-account local import path</small>
              </button>
            </div>
          )}

          {hasWorkspace && (
            <div className="importActionGrid" aria-label="Customer import actions">
              <button className="importAction" type="button" onClick={() => onNavigate("opportunities")}>
                <Calendar size={18} />
                <span>Review event import</span>
                <small>Calendar text, invite paste, or manual note</small>
              </button>
              <button className="importAction" type="button" onClick={() => onNavigate("memory")}>
                <Heart size={18} />
                <span>Review memories</span>
                <small>Approved personal details only</small>
              </button>
              <button className="importAction" type="button" onClick={cardReviewStarted ? () => onNavigate("handoff") : onGenerateCard}>
                {cardReviewStarted ? <Store size={18} /> : <WandSparkles size={18} />}
                <span>{cardReviewStarted ? "Compare fulfillment" : "Start card draft"}</span>
                <small>{cardReviewStarted ? "Manual handoff after proof review" : "Local template generation"}</small>
              </button>
            </div>
          )}
        </article>

        <article className="eventQueueCard">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Events</p>
              <h3>Card opportunities</h3>
            </div>
            <span className={opportunity.status === "ready" ? "statePill ready" : "statePill hold"}>
              {opportunity.status === "ready" ? "Ready" : "Needs detail"}
            </span>
          </div>

          <div className="eventRow">
            <div>
              <strong>{opportunity.title}</strong>
              <span>{opportunity.dateLabel}</span>
              <small>{opportunity.recommendedPath}</small>
            </div>
            {hasWorkspace ? (
              <button className="primaryButton" type="button" onClick={cardReviewStarted ? () => onNavigate("studio") : onGenerateCard}>
                <WandSparkles size={16} />
                {cardReviewStarted ? "Continue review" : "Review and make card"}
              </button>
            ) : (
              <button className="quietButton" type="button" onClick={() => onNavigate("opportunities")}>
                <ClipboardCheck size={16} />
                Review import
              </button>
            )}
          </div>

          <div className="metricStrip">
            <Metric label="Confidence" value={`${opportunity.confidence}%`} />
            <Metric label="Panels" value={`${panelCount}`} />
            <Metric label="Memory" value={opportunity.memoryIds.length > 0 ? "Matched" : "None"} />
            <Metric label="Checkout" value={handoff.canPlaceRealOrder ? "Ready" : "Confirm"} />
          </div>
        </article>

        <article className="fulfillmentRecommendation">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Fulfillment</p>
              <h3>{cardReviewStarted ? "Best available options" : "Fulfillment after proof"}</h3>
            </div>
            <StatusChip icon={Store} label={cardReviewStarted ? "Customer view" : "Queued"} tone="blue" />
          </div>

          {cardReviewStarted ? (
            <div className="fulfillmentOptionGrid" aria-label="Customer fulfillment recommendation">
              <FulfillmentOption
                recommendation={cheapestOption}
                icon={CreditCard}
                label="Cheapest known price"
                tag="Cost"
              />
              <FulfillmentOption
                recommendation={fastestPickup}
                icon={Store}
                label="Fastest pickup candidate"
                tag="Pickup"
              />
              <FulfillmentOption
                recommendation={cheapestShipped}
                icon={PackageCheck}
                label="Cheapest shipped option"
                tag="Ship"
              />
            </div>
          ) : (
            <div className="fulfillmentHold" aria-label="Fulfillment hold">
              <Printer size={18} />
              <div>
                <strong>Manual print options unlock after the card proof exists.</strong>
                <span>Prices remain review-only public pricing; no live quote or order API is connected.</span>
              </div>
            </div>
          )}

          <div className="confirmationNotice">
            <XCircle size={16} />
            <span>{fulfillmentRecommendationSet.disclaimer}</span>
          </div>
        </article>

        <article className="surfaceCard">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Next action</p>
              <h3>{cardReviewStarted ? "Proof and fulfillment" : hasWorkspace ? "Event to card" : "Local setup"}</h3>
            </div>
            <Check size={18} />
          </div>
          <div className="journeyActionGrid">
            {customerActions.map((action) => (
              <button
                className={action.primary ? "journeyAction primary" : "journeyAction"}
                key={action.label}
                onClick={action.onClick}
                type="button"
              >
                <action.icon size={18} />
                <span>{action.label}</span>
                <small>{action.detail}</small>
              </button>
            ))}
          </div>
          <p className="panelNote">
            {cardReviewStarted
              ? "Manual export and vendor handoff are available after the proof is reviewed."
              : hasWorkspace
                ? "Fulfillment and export stay out of the primary path until the card draft exists."
                : "Provider sign-in and live import adapters remain gated; this path is local and free."}
          </p>
        </article>

        <article className="chatConsole">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Customer chat</p>
              <h3>Text interface</h3>
            </div>
            <StatusChip icon={Lock} label="Local reply" tone="blue" />
          </div>
          <div className="chatRuntimeLine" aria-label="Customer chat safety">
            <span>No live model call</span>
            <span>{chatSession.providerSummary.credentialGated} provider adapters gated</span>
          </div>
          <div className="chatLog">
            {chatSession.messages.map((message, index) => (
              <div className={`chatBubble ${message.role}`} key={`${message.role}-${index}`}>
                <strong>{message.role === "customer" ? "Customer" : "Assistant"}</strong>
                <span>{message.text}</span>
              </div>
            ))}
          </div>
          <form
            className="chatComposer"
            onSubmit={(event) => {
              event.preventDefault();
              if (chatInput.trim()) onChatSend();
            }}
          >
            <textarea
              aria-label="Customer chat message"
              value={chatInput}
              onChange={(event) => onChatInput(event.target.value)}
              placeholder="Ask about copy, memories, artwork, pickup, or shipping"
            />
            <button className="primaryButton" type="submit" disabled={!chatInput.trim()}>
              <MessageCircle size={16} />
              Send
            </button>
          </form>
        </article>

        <article className="surfaceCard">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Artwork</p>
              <h3>Card proof path</h3>
            </div>
            <Image size={18} />
          </div>
          <div className="runtimeGrid compactMetrics" aria-label="Customer artwork proof path">
            <Metric label="Artwork" value="Template" />
            <Metric label="AI images" value="Off" />
            <Metric label="Print size" value="5x7" />
            <Metric label="Approval" value="User" />
          </div>
        </article>

        <article className="surfaceCard">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Privacy</p>
              <h3>Data controls</h3>
            </div>
            <Check size={18} />
          </div>
          <div className="runtimeGrid compactMetrics" aria-label="Customer privacy controls">
            <Metric label="Memory" value="Approved" />
            <Metric label="Import" value="Review" />
            <Metric label="Checkout" value="Confirm" />
            <Metric label="Payments" value="Off" />
          </div>
        </article>

        <article className="surfaceCard">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Locale</p>
              <h3>Language readiness</h3>
            </div>
            <Globe2 size={18} />
          </div>
          <SegmentedControl
            label="Locale"
            options={supportedLocales.map((locale) => locale.locale)}
            value={selectedLocale.locale}
            onValue={(value) => onLocale(value as SupportedLocaleCode)}
          />
          <div className="runtimeGrid compactMetrics" aria-label="Customer localization readiness">
            <Metric label="Locales" value={`${localizationSummary.supportedLocales}`} />
            <Metric label="RTL" value={selectedLocale.requiresRtlLayout ? "Review" : "No"} />
            <Metric label="Copy" value={selectedLocale.reviewState === "ready" ? "Ready" : "Review"} />
            <Metric label="Card language" value={selectedLocale.cardLanguage} />
          </div>
        </article>

        <article className="surfaceCard">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Launch state</p>
              <h3>Production safety</h3>
            </div>
            <ShieldCheck size={18} />
          </div>
          <div className="runtimeGrid compactMetrics" aria-label="Customer production safety">
            <Metric label="Live orders" value="Off" />
            <Metric label="Live charges" value="Off" />
            <Metric label="Gates" value={`${productionReadiness.total}`} />
            <Metric label="Evidence gaps" value={`${productionReadiness.evidenceMissing}`} />
          </div>
        </article>
      </div>
    </section>
  );
}

function FulfillmentOption({
  recommendation,
  icon: Icon,
  label,
  tag
}: {
  recommendation: FulfillmentRecommendation | undefined;
  icon: LucideIcon;
  label: string;
  tag: string;
}) {
  return (
    <div className="fulfillmentOption">
      <div className="fulfillmentOptionHeader">
        <Icon size={18} />
        <span>{tag}</span>
      </div>
      <strong>{label}</strong>
      {recommendation ? (
        <>
          <span>
            {recommendation.subtotalLabel} at {recommendation.vendorName}
          </span>
          <small>
            {recommendation.etaLabel} / {recommendation.pricedQuantity} card
            {recommendation.pricedQuantity === 1 ? "" : "s"} priced
          </small>
          <em>{recommendation.confirmationCopy}</em>
        </>
      ) : (
        <>
          <span>Manual quote required</span>
          <small>No public price observation is ready for this path.</small>
        </>
      )}
    </div>
  );
}

function OpportunitiesView({
  inviteText,
  onDecision,
  onInviteText,
  onScan,
  onStartCard,
  opportunity,
  decision,
  scanStatus,
  warnings
}: {
  inviteText: string;
  onDecision: (decision: OpportunityDecision) => void;
  onInviteText: (value: string) => void;
  onScan: () => void;
  onStartCard: () => void;
  opportunity: CardOpportunity;
  decision: OpportunityDecision;
  scanStatus: string;
  warnings: string[];
}) {
  return (
    <section className="viewGrid">
      <div className="toolPanel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Intake</p>
            <h2>Opportunity scan</h2>
          </div>
          <button className="iconTextButton" type="button" onClick={onScan}>
            <RefreshCw size={16} />
            Scan free import
          </button>
        </div>

        <label className="fieldStack">
          <span>Invite or ICS text</span>
          <textarea
            className="importBox"
            value={inviteText}
            onChange={(event) => onInviteText(event.target.value)}
          />
        </label>

        <div className="signalGrid">
          <Metric label="Status" value={scanStatus} />
          <Metric label="Confidence" value={`${opportunity.confidence}%`} />
          <Metric label="Date" value={opportunity.dateLabel} />
          <Metric label="Path" value={opportunity.recommendedPath} />
        </div>

        {warnings.length > 0 && (
          <div className="warningList">
            {warnings.map((warning) => (
              <span key={warning}>
                <XCircle size={15} />
                {warning}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="opportunityCard">
        <div className="cardHeaderLine">
          <span className={opportunity.status === "ready" ? "statePill ready" : "statePill hold"}>
            {opportunity.status === "ready" ? "Ready" : "Needs detail"}
          </span>
          <span className="urgency">{opportunity.urgency}</span>
        </div>
        <h2>{opportunity.title}</h2>
        <p>{opportunity.recommendedPath}</p>

        <div className="evidenceList">
          {opportunity.evidence.slice(0, 5).map((item) => (
            <span key={item}>
              <CircleCheck size={15} />
              {item}
            </span>
          ))}
        </div>

        <div className="decisionRow">
          <button className="primaryButton" type="button" onClick={onStartCard}>
            <WandSparkles size={16} />
            Generate card
          </button>
          <button className="quietButton" type="button" onClick={() => onDecision("snoozed")}>
            <Calendar size={16} />
            Snooze
          </button>
          <button className="quietButton" type="button" onClick={() => onDecision("dismissed")}>
            <XCircle size={16} />
            Dismiss
          </button>
        </div>

        <div className={`decisionBanner ${decision}`}>
          <ClipboardCheck size={16} />
          <span>{decisionLabel(decision)}</span>
        </div>
      </div>
    </section>
  );
}

function StudioView({
  draftInput,
  memories,
  onExport,
  onUpdate,
  opportunity,
  panels,
  validation
}: {
  draftInput: CardDraftInput;
  memories: MemoryItem[];
  onExport: () => void;
  onUpdate: <K extends keyof CardDraftInput>(field: K, value: CardDraftInput[K]) => void;
  opportunity: CardOpportunity;
  panels: CardPanel[];
  validation: CardValidation;
}) {
  return (
    <section className="studioLayout">
      <div className="toolPanel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Studio</p>
            <h2>Card draft</h2>
          </div>
          <StatusChip
            icon={validation.passed ? CircleCheck : XCircle}
            label={validation.passed ? "Print safe" : "Needs fix"}
            tone={validation.passed ? "green" : "red"}
          />
        </div>

        <div className="formGrid">
          <label className="fieldStack">
            <span>Sender</span>
            <input value={draftInput.sender} onChange={(event) => onUpdate("sender", event.target.value)} />
          </label>
          <label className="fieldStack">
            <span>Recipient</span>
            <input value={draftInput.recipient} onChange={(event) => onUpdate("recipient", event.target.value)} />
          </label>
          <label className="fieldStack">
            <span>Relationship</span>
            <input
              value={draftInput.relationship}
              onChange={(event) => onUpdate("relationship", event.target.value)}
            />
          </label>
          <label className="fieldStack">
            <span>Language</span>
            <select
              value={draftInput.language}
              onChange={(event) => onUpdate("language", event.target.value as LanguageChoice)}
            >
              {languages.map((language) => (
                <option key={language}>{language}</option>
              ))}
            </select>
          </label>
        </div>

        <SegmentedControl
          label="Tone"
          options={tones}
          value={draftInput.tone}
          onValue={(value) => onUpdate("tone", value as Tone)}
        />
        <SegmentedControl
          label="Style"
          options={styles}
          value={draftInput.style}
          onValue={(value) => onUpdate("style", value as VisualStyle)}
        />

        <label className="fieldStack">
          <span>Personal note</span>
          <textarea
            className="noteBox"
            value={draftInput.personalNote}
            onChange={(event) => onUpdate("personalNote", event.target.value)}
          />
        </label>

        <label className="toggleLine">
          <input
            checked={draftInput.useMemory}
            onChange={(event) => onUpdate("useMemory", event.target.checked)}
            type="checkbox"
          />
          Use approved memory for {opportunity.recipient}
        </label>

        <button className="primaryButton wide" type="button" onClick={onExport}>
          <Upload size={16} />
          Prepare handoff
        </button>
      </div>

      <div className="previewColumn">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Preview</p>
            <h2>5x7 panels</h2>
          </div>
          <span className="smallStat">{memories.filter((memory) => memory.approved).length} approved memories</span>
        </div>
        <div className="panelGrid">
          {panels.map((panel) => (
            <PanelPreview key={panel.id} panel={panel} />
          ))}
        </div>

        <div className="validationPanel">
          {validation.checks.map((check) => (
            <span key={check.label}>
              {check.passed ? <CircleCheck size={16} /> : <XCircle size={16} />}
              <strong>{check.label}</strong>
              {check.detail}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function MemoryView({
  canDelete,
  memories,
  memoryForm,
  onAdd,
  onDelete,
  onFormChange
}: {
  canDelete: boolean;
  memories: MemoryItem[];
  memoryForm: { recipient: string; note: string };
  onAdd: () => void;
  onDelete: (memoryId: string) => void;
  onFormChange: (form: { recipient: string; note: string }) => void;
}) {
  return (
    <section className="memoryLayout">
      <div className="toolPanel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Review</p>
            <h2>Relationship memory</h2>
          </div>
          <StatusChip icon={Lock} label="User approved" tone="green" />
        </div>

        <div className="formGrid single">
          <label className="fieldStack">
            <span>Recipient</span>
            <input
              value={memoryForm.recipient}
              onChange={(event) => onFormChange({ ...memoryForm, recipient: event.target.value })}
            />
          </label>
          <label className="fieldStack">
            <span>Memory</span>
            <textarea
              className="noteBox"
              value={memoryForm.note}
              onChange={(event) => onFormChange({ ...memoryForm, note: event.target.value })}
              placeholder="A detail the user explicitly approves for reuse."
            />
          </label>
          <button className="primaryButton" disabled={!memoryForm.note.trim()} onClick={onAdd} type="button">
            <Plus size={16} />
            Add approved memory
          </button>
        </div>
      </div>

      <div className="memoryList">
        {memories.map((memory) => (
          <article className="memoryItem" key={memory.id}>
            <div>
              <span className={memory.sensitivity === "review" ? "statePill hold" : "statePill ready"}>
                {memory.sensitivity}
              </span>
              <h3>{memory.recipient}</h3>
              <p>{memory.note}</p>
              <div className="tagRow">
                {memory.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
            <button
              aria-label={`Delete ${memory.recipient} memory`}
              className="iconOnlyButton"
              disabled={!canDelete}
              onClick={() => onDelete(memory.id)}
              title={canDelete ? "Delete memory" : "Start a workspace to edit memories"}
              type="button"
            >
              <Trash2 size={17} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function HandoffView({
  exportStatus,
  handoff,
  onCopyChecklist,
  onDownloadAll,
  onDownloadPanel,
  onDownloadPackage,
  onVendor,
  panels,
  pricingComparison,
  printPackage,
  validation,
  vendorId
}: {
  exportStatus: string;
  handoff: VendorHandoff;
  onCopyChecklist: () => void;
  onDownloadAll: () => void;
  onDownloadPanel: (panel: CardPanel) => void;
  onDownloadPackage: () => void;
  onVendor: (vendorId: VendorId) => void;
  panels: CardPanel[];
  pricingComparison: PrinterPricingComparison;
  printPackage: PrintExportPackage;
  validation: CardValidation;
  vendorId: VendorId;
}) {
  const primaryPricing = pricingComparison.selectedVendorOptions[0];
  const rankedOptions = pricingComparison.rankedKnownPrices.slice(0, 4);
  const refreshReport = pricingComparison.refreshReport;
  const pdfFile = printPackage.files.find((file) => file.kind === "combined-pdf");
  const manifestFile = printPackage.files.find((file) => file.kind === "manifest-json");

  return (
    <section className="handoffLayout">
      <div className="toolPanel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Export</p>
            <h2>Manual handoff</h2>
          </div>
          <StatusChip icon={PackageCheck} label={exportStatus} tone="blue" />
        </div>

        <SegmentedControl
          label="Vendor"
          options={vendors}
          value={vendorId}
          onValue={(value) => onVendor(value as VendorId)}
        />

        <div className="downloadGrid">
          {panels.map((panel) => (
            <button className="downloadTile" key={panel.id} onClick={() => onDownloadPanel(panel)} type="button">
              <Download size={18} />
              <strong>{panel.label}</strong>
              <span>1500 x 2100 SVG</span>
            </button>
          ))}
        </div>

        <div className="decisionRow">
          <button className="primaryButton" disabled={!validation.passed} onClick={onDownloadAll} type="button">
            <FileDown size={16} />
            Download SVG set
          </button>
          <button className="quietButton" disabled={!printPackage.manifest.passed} onClick={onDownloadPackage} type="button">
            <PackageCheck size={16} />
            Download print package
          </button>
          <button className="quietButton" type="button" onClick={onCopyChecklist}>
            <ClipboardCheck size={16} />
            Copy checklist
          </button>
        </div>

        <div className="printPackageBox">
          <div className="handoffTitle compact">
            <FileDown size={19} />
            <div>
              <span>local print package</span>
              <h3>{printPackage.manifest.passed ? "Preflight passed" : "Needs fixes"}</h3>
            </div>
          </div>
          <div className="packageMetricGrid">
            <Metric label="Files" value={`${printPackage.files.length}`} />
            <Metric label="PDF" value={pdfFile ? `${Math.ceil(pdfFile.byteLength / 1024)} KB` : "Missing"} />
            <Metric label="Manifest" value={manifestFile ? "Ready" : "Missing"} />
          </div>
          <small>
            Includes four source SVG panels, a combined 5x7 PDF proof, and a checksum manifest. No object storage upload or
            live order is performed.
          </small>
        </div>
      </div>

      <div className="handoffPanel">
        <div className="handoffTitle">
          <Store size={21} />
          <div>
            <span>{handoff.mode}</span>
            <h2>{handoff.vendorName}</h2>
          </div>
        </div>

        <ol className="checklist">
          {handoff.checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>

        <div className="blockedBox">
          <XCircle size={18} />
          <div>
            <strong>Real orders disabled</strong>
            {handoff.disabledReasons.map((reason) => (
              <span key={reason}>{reason}</span>
            ))}
          </div>
        </div>

        <div className="pricingResearchBox">
          <div className="handoffTitle compact">
            <Printer size={19} />
            <div>
              <span>review-only public pricing</span>
              <h3>{primaryPricing ? primaryPricing.subtotalLabel : "Manual quote required"}</h3>
            </div>
          </div>
          {primaryPricing ? (
            <p>
              {primaryPricing.observation.vendorName} {primaryPricing.observation.productName} starts at{" "}
              {formatCents(primaryPricing.observation.unitPriceCents)} each
              {primaryPricing.pricedQuantity > primaryPricing.quantity
                ? ` with a ${primaryPricing.observation.minimumQuantity}-card minimum`
                : ""}.
            </p>
          ) : (
            <p>Local print shops still need a manual quote before upload.</p>
          )}
          <div className="pricingFreshnessGrid">
            <Metric label="Prices" value={`${refreshReport.totalObservations}`} />
            <Metric label="Sources" value={`${refreshReport.freshSources}/${refreshReport.sourceCount}`} />
            <Metric label="Max age" value={`${refreshReport.maxAgeDays} days`} />
            <Metric label="State" value={refreshReport.canShowComparison ? "Fresh" : "Refresh"} />
          </div>
          <div className="pricingOptionList">
            {rankedOptions.map((estimate) => (
              <div className="pricingOption" key={estimate.observation.id}>
                <strong>{estimate.observation.vendorName}</strong>
                <span>{estimate.subtotalLabel}</span>
                <small>
                  {estimate.observation.speed.replace(/-/g, " ")} / {estimate.observation.confidence.replace(/-/g, " ")} /
                  confirm in checkout
                </small>
              </div>
            ))}
          </div>
          <small>{pricingComparison.disclaimer}</small>
        </div>
      </div>
    </section>
  );
}

function AdminPanelView({
  aiProviderReadinessItems,
  aiProviderReadinessSummary,
  capacityProfiles,
  capacitySummary,
  e2eCoverageItems,
  e2eCoverageSummary,
  externalAuditItems,
  externalAuditSummary,
  localizationSummary,
  model,
  observabilityItems,
  observabilitySummary,
  providerGovernance,
  productionReadiness,
  retailFulfillmentItems,
  retailFulfillmentSummary,
  paymentReadinessItems,
  paymentReadinessSummary,
  mobileRenderReadinessItems,
  mobileRenderReadinessSummary,
  hostedApiReadinessItems,
  hostedApiReadinessSummary,
  reviewerDbSeedReadinessItems,
  reviewerDbSeedReadinessSummary,
  cloudArtifactProofReadinessItems,
  cloudArtifactProofReadinessSummary,
  businessEngagementReadinessItems,
  businessEngagementReadinessSummary,
  runtimeReadiness
}: {
  aiProviderReadinessItems: AiProviderReadinessItem[];
  aiProviderReadinessSummary: AiProviderReadinessSummary;
  capacityProfiles: CapacityProfile[];
  capacitySummary: CapacityPlanSummary;
  e2eCoverageItems: E2eCoverageItem[];
  e2eCoverageSummary: E2eCoverageSummary;
  externalAuditItems: ExternalAuditReadinessItem[];
  externalAuditSummary: ExternalAuditReadinessSummary;
  localizationSummary: LocalizationReadinessSummary;
  model: AdminPanelModel;
  observabilityItems: ObservabilityReadinessItem[];
  observabilitySummary: ObservabilityReadinessSummary;
  providerGovernance: ProviderGovernanceSummary;
  productionReadiness: ProductionReadinessSummary;
  retailFulfillmentItems: RetailFulfillmentReadinessItem[];
  retailFulfillmentSummary: RetailFulfillmentReadinessSummary;
  paymentReadinessItems: PaymentReadinessItem[];
  paymentReadinessSummary: PaymentReadinessSummary;
  mobileRenderReadinessItems: MobileRenderReadinessItem[];
  mobileRenderReadinessSummary: MobileRenderReadinessSummary;
  hostedApiReadinessItems: HostedApiReadinessItem[];
  hostedApiReadinessSummary: HostedApiReadinessSummary;
  reviewerDbSeedReadinessItems: ReviewerDbSeedReadinessItem[];
  reviewerDbSeedReadinessSummary: ReviewerDbSeedReadinessSummary;
  cloudArtifactProofReadinessItems: CloudArtifactProofReadinessItem[];
  cloudArtifactProofReadinessSummary: CloudArtifactProofReadinessSummary;
  businessEngagementReadinessItems: BusinessEngagementReadinessItem[];
  businessEngagementReadinessSummary: BusinessEngagementReadinessSummary;
  runtimeReadiness: Map<string, RuntimeReadiness>;
}) {
  const runtimeSummary = summarizeRuntimeReadiness(runtimeReadiness);
  const visibleEnv = prioritizeAdminEnv(model.coverage.requiredEnv).slice(0, 24);
  const hiddenEnvCount = Math.max(model.coverage.requiredEnv.length - visibleEnv.length, 0);

  return (
    <section className="adminPanel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Operations</p>
          <h2>Admin panel</h2>
        </div>
        <StatusChip icon={ShieldCheck} label="Credential gates visible" tone="blue" />
      </div>

      <div className="adminSummaryGrid">
        <Metric label="Adapters" value={`${model.coverage.total}`} />
        <Metric label="Capabilities" value={`${model.coverage.capabilityCount}`} />
        <Metric label="Ready local" value={`${model.coverage.readyLocal}`} />
        <Metric label="Credential gated" value={`${model.coverage.credentialGated}`} />
        <Metric label="Contract only" value={`${model.coverage.contractOnly}`} />
        <Metric label="Blocked live" value={`${model.coverage.blocked}`} />
        <Metric label="Budget cap" value={formatCents(providerGovernance.monthlyBudgetCents)} />
        <Metric label="Locales" value={`${localizationSummary.supportedLocales}`} />
        <Metric label="Launch gates" value={`${productionReadiness.total}`} />
        <Metric label="External gaps" value={`${externalAuditSummary.productionBlocked}`} />
        <Metric label="E2E coverage" value={`${e2eCoverageSummary.repoLocalCoveragePercent}%`} />
        <Metric label="Capacity profiles" value={`${capacitySummary.total}`} />
        <Metric label="Public claims" value={`${externalAuditSummary.publicClaimsAllowed}`} />
        <Metric label="Max daily cards" value={`${capacitySummary.maxDailyCards}`} />
        <Metric label="AI contracts" value={`${aiProviderReadinessSummary.textProviderContracts + aiProviderReadinessSummary.imageProviderContracts}`} />
        <Metric label="Live AI" value={`${aiProviderReadinessSummary.liveProviderCallsEnabled}`} />
        <Metric label="Alert routes" value={`${observabilitySummary.alertRoutesRequired}`} />
        <Metric label="Live telemetry" value={`${observabilitySummary.liveIngestionEnabled}`} />
        <Metric label="Retail contracts" value={`${retailFulfillmentSummary.liveVendorAdapterContracts}`} />
        <Metric label="Direct orders" value={`${retailFulfillmentSummary.directOrderEnabled}`} />
        <Metric label="Payment contracts" value={`${paymentReadinessSummary.paymentProviderContracts}`} />
        <Metric label="Live charges" value={`${paymentReadinessSummary.liveChargesEnabled}`} />
        <Metric label="Mobile screens" value={`${mobileRenderReadinessSummary.screenSections}`} />
        <Metric label="Native proofs" value={`${mobileRenderReadinessSummary.emulatorRenderProofs}`} />
        <Metric label="Hosted routes" value={`${hostedApiReadinessSummary.routeContracts}`} />
        <Metric label="Public DB proof" value={`${hostedApiReadinessSummary.publicRouteProofs}`} />
        <Metric label="Seed tables" value={`${reviewerDbSeedReadinessSummary.tableContracts}`} />
        <Metric label="Hosted seed" value={`${reviewerDbSeedReadinessSummary.hostedSeedProofs}`} />
        <Metric label="Cloud proof" value={`${cloudArtifactProofReadinessSummary.appliedBucketArnProofs}`} />
        <Metric label="Cloud IAM" value={`${cloudArtifactProofReadinessSummary.iamPolicyOutputProofs}`} />
        <Metric label="Business CRM" value={`${businessEngagementReadinessSummary.crmAdapterContracts}`} />
        <Metric label="Live sends" value={`${businessEngagementReadinessSummary.liveMessagesEnabled}`} />
      </div>

      <div className="adminGrid">
        <article className="toolPanel">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Dry-run runtime</p>
              <h3>No-network readiness</h3>
            </div>
            <StatusChip icon={ShieldCheck} label="No fetch" tone="green" />
          </div>
          <div className="runtimeGrid" aria-label="Provider runtime dry-run readiness">
            <Metric label="Local-ready" value={`${runtimeSummary.localResult}`} />
            <Metric label="Request-ready" value={`${runtimeSummary.preparedRequest}`} />
            <Metric label="Blocked" value={`${runtimeSummary.blocked}`} />
            <Metric label="Credential gaps" value={`${runtimeSummary.missingCredentials}`} />
          </div>
          <p className="panelNote">
            Credential-gated providers stay blocked here until env values and safety gates are explicitly present.
          </p>
        </article>

        <article className="toolPanel">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Coverage</p>
              <h3>Capability matrix</h3>
            </div>
            <Cloud size={18} />
          </div>
          <div className="coverageList">
            {model.coverage.capabilities.map((capability) => (
              <div className="coverageLine" key={capability.capability}>
                <div>
                  <strong>{capability.label}</strong>
                  <span>
                    {capability.readyLocal} ready / {capability.total} total
                  </span>
                </div>
                <meter
                  aria-label={`${capability.label} ready-local adapter coverage`}
                  max={Math.max(capability.total, 1)}
                  min={0}
                  title={`${capability.readyLocal} of ${capability.total} adapters ready locally`}
                  value={capability.readyLocal}
                />
              </div>
            ))}
          </div>
        </article>

        <article className="toolPanel">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Secrets</p>
              <h3>Required env</h3>
            </div>
            <KeyRound size={18} />
          </div>
          <div className="envChipGrid">
            {visibleEnv.map((envVar) => (
              <span key={envVar}>{envVar}</span>
            ))}
            {hiddenEnvCount > 0 && <span>{`+${hiddenEnvCount} more`}</span>}
          </div>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Cost controls</p>
              <h3>Provider governance</h3>
            </div>
            <StatusChip icon={ShieldCheck} label="Budget capped" tone="green" />
          </div>
          <div className="runtimeGrid" aria-label="Provider cost and rate governance">
            <Metric label="Zero spend" value={`${providerGovernance.zeroPlatformSpend}`} />
            <Metric label="Budget capped" value={`${providerGovernance.budgetCapped}`} />
            <Metric label="Blocked zero spend" value={`${providerGovernance.blockedZeroSpend}`} />
            <Metric label="Rate limited" value={`${providerGovernance.rateLimited}`} />
            <Metric label="Queued" value={`${providerGovernance.queueRequired}`} />
            <Metric label="Max request" value={formatCents(providerGovernance.maxPerRequestBudgetCents)} />
          </div>
          <p className="panelNote">
            Every paid or gated adapter maps to a ready local fallback before live network calls can be enabled.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Localization</p>
              <h3>Locale readiness</h3>
            </div>
            <StatusChip icon={Globe2} label="Copy gated" tone="blue" />
          </div>
          <div className="runtimeGrid" aria-label="Admin localization readiness">
            <Metric label="Supported" value={`${localizationSummary.supportedLocales}`} />
            <Metric label="Customer visible" value={`${localizationSummary.customerVisible}`} />
            <Metric label="RTL review" value={`${localizationSummary.rtlLocales}`} />
            <Metric label="Copy review" value={`${localizationSummary.copyReviewRequired}`} />
            <Metric label="Bundles" value={`${localizationSummary.completeBundles}`} />
            <Metric label="Live translate" value={localizationSummary.liveTranslationProvider ? "On" : "Off"} />
          </div>
          <p className="panelNote">
            Non-English and RTL card copy stays behind human review before any live translation provider is connected.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Production</p>
              <h3>Launch gates</h3>
            </div>
            <StatusChip icon={Lock} label="Evidence required" tone="red" />
          </div>
          <div className="runtimeGrid" aria-label="Production launch gate readiness">
            <Metric label="Tracked" value={`${productionReadiness.total}`} />
            <Metric label="Evidence missing" value={`${productionReadiness.evidenceMissing}`} />
            <Metric label="Blocked" value={`${productionReadiness.blocked}`} />
            <Metric label="Live enabled" value={`${productionReadiness.liveEnabled}`} />
          </div>
          <ProductionGateList gates={productionLaunchGates} />
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Verification</p>
              <h3>End-to-end coverage</h3>
            </div>
            <StatusChip icon={ClipboardCheck} label="Repo-local 100%" tone="green" />
          </div>
          <div className="runtimeGrid" aria-label="End-to-end coverage readiness">
            <Metric label="Journeys" value={`${e2eCoverageSummary.total}`} />
            <Metric label="Covered" value={`${e2eCoverageSummary.covered}`} />
            <Metric label="Browser smoke" value={`${e2eCoverageSummary.browserSmokeCovered}`} />
            <Metric label="API/contracts" value={`${e2eCoverageSummary.contractTestCovered}`} />
            <Metric label="Doctors" value={`${e2eCoverageSummary.doctorCovered}`} />
            <Metric label="Live proofs" value={`${e2eCoverageSummary.liveProductionProofs}`} />
          </div>
          <E2eCoverageList items={e2eCoverageItems} />
          <p className="panelNote">
            The 100% figure is limited to repo-local reviewer workflows and CI-gated doctors; live production auth, real payments, direct printer orders, signed native artifacts, and external audits remain outside this proof.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Mobile</p>
              <h3>Mobile render readiness</h3>
            </div>
            <StatusChip icon={Smartphone} label="Emulator proof missing" tone="red" />
          </div>
          <div className="runtimeGrid" aria-label="Mobile native render readiness">
            <Metric label="Items" value={`${mobileRenderReadinessSummary.total}`} />
            <Metric label="Screens" value={`${mobileRenderReadinessSummary.screenSections}`} />
            <Metric label="Viewports" value={`${mobileRenderReadinessSummary.viewportProfiles}`} />
            <Metric label="Profiles" value={`${mobileRenderReadinessSummary.nativeBuildProfiles}`} />
            <Metric label="Emulator req." value={`${mobileRenderReadinessSummary.emulatorRequired}`} />
            <Metric label="Emulator proof" value={`${mobileRenderReadinessSummary.emulatorRenderProofs}`} />
            <Metric label="Signed artifacts" value={`${mobileRenderReadinessSummary.signedArtifacts}`} />
            <Metric label="Live calls" value={`${mobileRenderReadinessSummary.liveProviderCalls}`} />
          </div>
          <MobileRenderReadinessList items={mobileRenderReadinessItems} />
          <p className="panelNote">
            These are source-render, viewport, customer-flow, RTL, preview-profile, emulator, and signed-artifact
            readiness contracts; not an emulator render proof or signed native build.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Hosted API</p>
              <h3>Hosted API proof readiness</h3>
            </div>
            <StatusChip icon={Cloud} label="Public DB proof missing" tone="red" />
          </div>
          <div className="runtimeGrid" aria-label="Hosted API Vercel and database proof readiness">
            <Metric label="Items" value={`${hostedApiReadinessSummary.total}`} />
            <Metric label="Routes" value={`${hostedApiReadinessSummary.routeContracts}`} />
            <Metric label="Env vars" value={`${hostedApiReadinessSummary.requiredEnvVars}`} />
            <Metric label="Hosted DB req." value={`${hostedApiReadinessSummary.hostedDbRequired}`} />
            <Metric label="Public proof req." value={`${hostedApiReadinessSummary.publicRouteProofRequired}`} />
            <Metric label="Env proof" value={`${hostedApiReadinessSummary.envSyncProofs}`} />
            <Metric label="DB proof" value={`${hostedApiReadinessSummary.hostedDbProofs}`} />
            <Metric label="Token proof" value={`${hostedApiReadinessSummary.hostedTokenVerificationProofs}`} />
          </div>
          <HostedApiReadinessList items={hostedApiReadinessItems} />
          <p className="panelNote">
            These are Vercel deployment, serverless route, environment, hosted Postgres, token verification, and backup
            readiness contracts; not public DB-backed Vercel proof or hosted account-token verification.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Reviewer database</p>
              <h3>Reviewer DB seed readiness</h3>
            </div>
            <StatusChip icon={KeyRound} label="Hosted seed proof missing" tone="red" />
          </div>
          <div className="runtimeGrid" aria-label="Reviewer database seed and account-token proof readiness">
            <Metric label="Items" value={`${reviewerDbSeedReadinessSummary.total}`} />
            <Metric label="Tables" value={`${reviewerDbSeedReadinessSummary.tableContracts}`} />
            <Metric label="Routes" value={`${reviewerDbSeedReadinessSummary.routeContracts}`} />
            <Metric label="Env vars" value={`${reviewerDbSeedReadinessSummary.requiredEnvVars}`} />
            <Metric label="Seed req." value={`${reviewerDbSeedReadinessSummary.hostedSeedExecutionRequired}`} />
            <Metric label="Token req." value={`${reviewerDbSeedReadinessSummary.hostedTokenProbeRequired}`} />
            <Metric label="Seed proof" value={`${reviewerDbSeedReadinessSummary.hostedSeedProofs}`} />
            <Metric label="Token proof" value={`${reviewerDbSeedReadinessSummary.hostedTokenProbeProofs}`} />
          </div>
          <ReviewerDbSeedReadinessList items={reviewerDbSeedReadinessItems} />
          <p className="panelNote">
            These are reviewer seed-plan, SQL-preview, Vercel env, hosted migration, token-probe, and rollback
            contracts; not hosted reviewer DB mutation or hosted account-token proof.
          </p>
        </article>

        <article className="toolPanel adminWide cloudProofCard">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Cloud artifacts</p>
              <h3>Cloud artifact proof readiness</h3>
            </div>
            <StatusChip icon={Cloud} label="Applied proof missing" tone="red" />
          </div>
          <div className="cloudProofOverview" aria-label="Cloud artifact bucket IAM and signed URL proof readiness">
            <div>
              <span>Repo-local ready</span>
              <strong>{cloudArtifactProofReadinessSummary.repoLocalReady}</strong>
            </div>
            <div>
              <span>Applied req.</span>
              <strong>{cloudArtifactProofReadinessSummary.appliedCloudRequired}</strong>
            </div>
            <div>
              <span>TF files</span>
              <strong>{cloudArtifactProofReadinessSummary.terraformFileContracts}</strong>
            </div>
            <div>
              <span>Env outputs</span>
              <strong>{cloudArtifactProofReadinessSummary.envOutputContracts}</strong>
            </div>
            <div>
              <span>Bucket proof</span>
              <strong>{cloudArtifactProofReadinessSummary.appliedBucketArnProofs}</strong>
            </div>
            <div>
              <span>IAM proof</span>
              <strong>{cloudArtifactProofReadinessSummary.iamPolicyOutputProofs}</strong>
            </div>
            <div>
              <span>URL proof</span>
              <strong>{cloudArtifactProofReadinessSummary.signedUrlProbeProofs}</strong>
            </div>
            <div>
              <span>Restore proof</span>
              <strong>{cloudArtifactProofReadinessSummary.restoreDrillProofs}</strong>
            </div>
          </div>
          <CloudArtifactProofReadinessList items={cloudArtifactProofReadinessItems} />
          <p className="panelNote">
            These are Terraform source, plan review, applied bucket, IAM output, signed URL, access log, secret-sync, and
            restore-drill contracts; not live-applied cloud bucket/IAM proof.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Business engagement</p>
              <h3>Business engagement readiness</h3>
            </div>
            <StatusChip icon={RefreshCw} label="Live sends off" tone="blue" />
          </div>
          <div className="runtimeGrid" aria-label="Business CRM lifecycle engagement readiness">
            <Metric label="Items" value={`${businessEngagementReadinessSummary.total}`} />
            <Metric label="CRM adapters" value={`${businessEngagementReadinessSummary.crmAdapterContracts}`} />
            <Metric label="Workflows" value={`${businessEngagementReadinessSummary.workflowAdapterContracts}`} />
            <Metric label="Channels" value={`${businessEngagementReadinessSummary.notificationAdapterContracts}`} />
            <Metric label="Triggers" value={`${businessEngagementReadinessSummary.lifecycleTriggerKinds}`} />
            <Metric label="Opt-in gates" value={`${businessEngagementReadinessSummary.optInRequired}`} />
            <Metric label="OAuth req." value={`${businessEngagementReadinessSummary.liveOAuthRequired}`} />
            <Metric label="Live sends" value={`${businessEngagementReadinessSummary.liveMessagesEnabled}`} />
          </div>
          <BusinessEngagementReadinessList items={businessEngagementReadinessItems} />
          <p className="panelNote">
            These are CRM lifecycle source, trigger, approval, workflow, message-channel, consent, and feedback-loop
            contracts; not live CRM OAuth, customer messaging, CRM writeback, or production campaign analytics proof.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">AI operations</p>
              <h3>AI provider readiness</h3>
            </div>
            <StatusChip icon={WandSparkles} label="Live AI off" tone="blue" />
          </div>
          <div className="runtimeGrid" aria-label="AI text and image provider readiness">
            <Metric label="Items" value={`${aiProviderReadinessSummary.total}`} />
            <Metric label="Text providers" value={`${aiProviderReadinessSummary.textProviderContracts}`} />
            <Metric label="Image providers" value={`${aiProviderReadinessSummary.imageProviderContracts}`} />
            <Metric label="Local fallbacks" value={`${aiProviderReadinessSummary.localFallbacks}`} />
            <Metric label="Prompt audits" value={`${aiProviderReadinessSummary.promptAuditRequired}`} />
            <Metric label="Human review" value={`${aiProviderReadinessSummary.humanReviewRequired}`} />
            <Metric label="Evidence gaps" value={`${aiProviderReadinessSummary.evidenceMissing}`} />
            <Metric label="Live calls" value={`${aiProviderReadinessSummary.liveProviderCallsEnabled}`} />
          </div>
          <AiProviderReadinessList items={aiProviderReadinessItems} />
          <p className="panelNote">
            These are text/image adapter, model allowlist, prompt audit, privacy, print QA, spend, evaluation, and rollout contracts; no live AI generation or model traffic is claimed.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Operations</p>
              <h3>Observability readiness</h3>
            </div>
            <StatusChip icon={Cloud} label="Live ingestion off" tone="blue" />
          </div>
          <div className="runtimeGrid" aria-label="Observability telemetry and alerting readiness">
            <Metric label="Items" value={`${observabilitySummary.total}`} />
            <Metric label="Repo-local" value={`${observabilitySummary.repoLocalReady}`} />
            <Metric label="Evidence gaps" value={`${observabilitySummary.evidenceMissing}`} />
            <Metric label="Providers" value={`${observabilitySummary.providerContracts}`} />
            <Metric label="Alert routes" value={`${observabilitySummary.alertRoutesRequired}`} />
            <Metric label="PII redacted" value={`${observabilitySummary.piiRedacted}`} />
            <Metric label="Max retention" value={`${observabilitySummary.maxRetentionDays}d`} />
            <Metric label="Live ingestion" value={`${observabilitySummary.liveIngestionEnabled}`} />
          </div>
          <ObservabilityReadinessList items={observabilityItems} />
          <p className="panelNote">
            These are schema, redaction, sampling, retention, provider, and alert-route contracts; no live telemetry
            ingestion or production alert delivery is claimed.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Fulfillment</p>
              <h3>Retail fulfillment readiness</h3>
            </div>
            <StatusChip icon={Store} label="Direct orders off" tone="blue" />
          </div>
          <div className="runtimeGrid" aria-label="Retail quote order and print fulfillment readiness">
            <Metric label="Items" value={`${retailFulfillmentSummary.total}`} />
            <Metric label="Retail adapters" value={`${retailFulfillmentSummary.liveVendorAdapterContracts}`} />
            <Metric label="Manual fallbacks" value={`${retailFulfillmentSummary.manualFallbacks}`} />
            <Metric label="Recovery events" value={`${retailFulfillmentSummary.recoveryDrillEvents}`} />
            <Metric label="Live quotes" value={`${retailFulfillmentSummary.liveQuoteEnabled}`} />
            <Metric label="Direct orders" value={`${retailFulfillmentSummary.directOrderEnabled}`} />
            <Metric label="Real payments" value={`${retailFulfillmentSummary.realPaymentsEnabled}`} />
            <Metric label="Print certs" value={`${retailFulfillmentSummary.physicalCertificationAttached}`} />
          </div>
          <RetailFulfillmentReadinessList items={retailFulfillmentItems} />
          <p className="panelNote">
            These are manual handoff, public pricing, quote, certification, kill-switch, recovery, payment, and
            physical-QA contracts; not live retail ordering or physical print certification.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Commerce</p>
              <h3>Payment readiness</h3>
            </div>
            <StatusChip icon={CreditCard} label="Live charges off" tone="blue" />
          </div>
          <div className="runtimeGrid" aria-label="Payment charge refund and reconciliation readiness">
            <Metric label="Items" value={`${paymentReadinessSummary.total}`} />
            <Metric label="Providers" value={`${paymentReadinessSummary.paymentProviderContracts}`} />
            <Metric label="Fallbacks" value={`${paymentReadinessSummary.localFallbacks}`} />
            <Metric label="Ledger events" value={`${paymentReadinessSummary.ledgerEvents}`} />
            <Metric label="Webhooks" value={`${paymentReadinessSummary.webhookSignatureRequired}`} />
            <Metric label="Live charges" value={`${paymentReadinessSummary.liveChargesEnabled}`} />
            <Metric label="Live refunds" value={`${paymentReadinessSummary.liveRefundsEnabled}`} />
            <Metric label="PCI claims" value={`${paymentReadinessSummary.pciScopeApproved}`} />
          </div>
          <PaymentReadinessList items={paymentReadinessItems} />
          <p className="panelNote">
            These are no-payment fallback, sandbox payment, idempotency, card-storage, webhook, charge/capture,
            refund/dispute, and reconciliation contracts; not live payment processing.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Review evidence</p>
              <h3>External audit readiness</h3>
            </div>
            <StatusChip icon={ClipboardCheck} label="External proof missing" tone="red" />
          </div>
          <div className="runtimeGrid" aria-label="External audit readiness">
            <Metric label="Items" value={`${externalAuditSummary.total}`} />
            <Metric label="Internal baseline" value={`${externalAuditSummary.internalBaselineReady}`} />
            <Metric label="Evidence missing" value={`${externalAuditSummary.externalEvidenceMissing}`} />
            <Metric label="Cert blocked" value={`${externalAuditSummary.certificationBlocked}`} />
            <Metric label="Public claims" value={`${externalAuditSummary.publicClaimsAllowed}`} />
            <Metric label="Attached proof" value={`${externalAuditSummary.externalArtifactsAttached}`} />
          </div>
          <ExternalAuditList items={externalAuditItems} />
          <p className="panelNote">
            Internal doctors are readiness inputs only; external audit reports, signed native artifacts, public hosted DB proof, retail certification, and physical print certification are not attached.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Provider queue</p>
              <h3>Gated adapters</h3>
            </div>
            <StatusChip icon={Lock} label={`${model.gatedProviders.length} gated`} tone="red" />
          </div>
          <AdapterMiniList adapters={model.gatedProviders.slice(0, 12)} />
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Business systems</p>
              <h3>CRM and workflow integrations</h3>
            </div>
            <StatusChip icon={RefreshCw} label={`${model.integrationAdapters.length} integrations`} tone="blue" />
          </div>
          <AdapterMiniList adapters={model.integrationAdapters.slice(0, 14)} />
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Deployment</p>
              <h3>Cloud readiness</h3>
            </div>
            <StatusChip icon={Cloud} label="IaC present" tone="green" />
          </div>
          <AdapterMiniList adapters={model.deploymentAdapters} />
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Scaling</p>
              <h3>Capacity profiles</h3>
            </div>
            <StatusChip icon={PackageCheck} label="Cheap to scale" tone="green" />
          </div>
          <div className="runtimeGrid" aria-label="Capacity profile readiness">
            <Metric label="Profiles" value={`${capacitySummary.total}`} />
            <Metric label="Max daily cards" value={`${capacitySummary.maxDailyCards}`} />
            <Metric label="Image budget" value={`${capacitySummary.maxDailyImageGenerations}`} />
            <Metric label="Queue-backed profiles" value={`${capacitySummary.queueBackedProfiles}`} />
            <Metric label="Live calls" value={`${capacitySummary.liveProviderCalls}`} />
            <Metric label="Real orders" value={`${capacitySummary.realOrdersEnabled}`} />
          </div>
          <div className="capacityProfileList">
            {capacityProfiles.map((profile) => (
              <div className="capacityProfile" key={profile.id}>
                <div>
                  <strong>{profile.label}</strong>
                  <span>{profile.runtimeShape}</span>
                </div>
                <small>
                  {profile.dailyCardCapacity} cards/day / {profile.dailyImageGenerationBudget} image generations/day
                </small>
              </div>
            ))}
          </div>
          <p className="panelNote">
            These are planning contracts, not measured production benchmarks; live traffic remains blocked until evidence gates pass.
          </p>
        </article>

        <article className="toolPanel adminWide">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Order safety</p>
              <h3>Blocked live vendors</h3>
            </div>
            <StatusChip icon={XCircle} label="Real orders off" tone="red" />
          </div>
          <AdapterMiniList adapters={model.blockedProviders} />
        </article>
      </div>
    </section>
  );
}

function AdaptersView({ runtimeReadiness }: { runtimeReadiness: Map<string, RuntimeReadiness> }) {
  const [statusFilter, setStatusFilter] = useState<AdapterStatusFilter>("all");
  const [capabilityFilter, setCapabilityFilter] = useState<AdapterCapabilityFilter>("all");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const sortedAdapters = useMemo(
    () =>
      providerCatalog
        .filter((adapter) => statusFilter === "all" || adapter.status === statusFilter)
        .filter((adapter) => capabilityFilter === "all" || adapter.capability === capabilityFilter)
        .filter((adapter) => {
          if (!normalizedQuery) return true;
          return [adapter.label, adapter.provider, adapter.detail, adapter.lane, capabilityLabels[adapter.capability]]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        })
        .sort((first, second) => first.priority - second.priority || first.label.localeCompare(second.label)),
    [capabilityFilter, normalizedQuery, statusFilter]
  );

  return (
    <section className="adaptersView">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Coverage</p>
          <h2>Adapter readiness</h2>
        </div>
        <StatusChip icon={ShieldCheck} label={`${providerCatalog.length} adapters`} tone="green" />
      </div>

      <div className="adapterToolbar" aria-label="Adapter filters">
        <label className="searchField">
          <Search size={16} />
          <span>Search adapters</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Provider, capability, lane"
          />
        </label>
        <label>
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AdapterStatusFilter)}>
            <option value="all">All statuses</option>
            <option value="ready-local">Ready local</option>
            <option value="credential-gated">Credential gated</option>
            <option value="contract-only">Contract only</option>
            <option value="blocked">Blocked</option>
          </select>
        </label>
        <label>
          <span>Capability</span>
          <select
            value={capabilityFilter}
            onChange={(event) => setCapabilityFilter(event.target.value as AdapterCapabilityFilter)}
          >
            <option value="all">All capabilities</option>
            {(Object.keys(capabilityLabels) as ProviderCapability[]).map((capability) => (
              <option key={capability} value={capability}>
                {capabilityLabels[capability]}
              </option>
            ))}
          </select>
        </label>
        <div className="adapterToolbarCount">
          <strong>{sortedAdapters.length}</strong>
          <span>shown</span>
        </div>
      </div>

      <div className="adapterMatrix">
        {sortedAdapters.map((adapter) => {
          const readiness = runtimeReadiness.get(adapter.id);

          return (
            <article
              className={`adapterRow ${adapter.status}`}
              key={adapter.id}
            >
              {adapterIcon(adapter)}
              <div>
                <strong>{adapter.label}</strong>
                <span>
                  {capabilityLabels[adapter.capability]} - {adapter.detail}
                </span>
                <small>{adapter.provider}</small>
                {readiness && (
                  <small className="runtimeHint">
                    Dry run: {runtimeModeLabel(readiness.mode)}
                    {readiness.missingCredentials.length > 0
                      ? ` - missing ${readiness.missingCredentials.slice(0, 2).join(", ")}`
                      : ""}
                  </small>
                )}
              </div>
              <em>{providerStatusLabel(adapter.status)}</em>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AdapterMiniList({ adapters }: { adapters: ProviderAdapter[] }) {
  return (
    <div className="adapterMiniList">
      {adapters.map((adapter) => (
        <div className={`adapterMini ${adapter.status}`} key={adapter.id}>
          <span>{capabilityLabels[adapter.capability]}</span>
          <strong>{adapter.label}</strong>
          <small>{providerStatusLabel(adapter.status)}</small>
        </div>
      ))}
    </div>
  );
}

function ProductionGateList({ gates }: { gates: ProductionLaunchGate[] }) {
  return (
    <div className="adapterMiniList">
      {gates.map((gate) => (
        <div className={`adapterMini ${gate.status === "blocked" ? "blocked" : "credential-gated"}`} key={gate.id}>
          <span>{gate.category}</span>
          <strong>{gate.label}</strong>
          <small>{gate.status === "blocked" ? "Blocked" : "Evidence missing"}</small>
        </div>
      ))}
    </div>
  );
}

function ExternalAuditList({ items }: { items: ExternalAuditReadinessItem[] }) {
  return (
    <div className="adapterMiniList">
      {items.map((item) => (
        <div className={`adapterMini ${item.status === "certification-blocked" ? "blocked" : "credential-gated"}`} key={item.id}>
          <span>{item.category}</span>
          <strong>{item.label}</strong>
          <small>{externalAuditStatusLabel(item.status)}</small>
        </div>
      ))}
    </div>
  );
}

function E2eCoverageList({ items }: { items: E2eCoverageItem[] }) {
  return (
    <div className="adapterMiniList">
      {items.map((item) => (
        <div className="adapterMini ready-local" key={item.id}>
          <span>{item.surface}</span>
          <strong>{item.label}</strong>
          <small>{e2eAutomationLabel(item.automationType)}</small>
        </div>
      ))}
    </div>
  );
}

function ObservabilityReadinessList({ items }: { items: ObservabilityReadinessItem[] }) {
  return (
    <div className="adapterMiniList">
      {items.map((item) => (
        <div className={`adapterMini ${item.status === "repo-local-ready" ? "ready-local" : "credential-gated"}`} key={item.id}>
          <span>{item.lane}</span>
          <strong>{item.label}</strong>
          <small>{item.liveIngestionEnabled ? "Live ingestion" : "Live ingestion off"}</small>
        </div>
      ))}
    </div>
  );
}

function AiProviderReadinessList({ items }: { items: AiProviderReadinessItem[] }) {
  return (
    <div className="adapterMiniList">
      {items.map((item) => (
        <div className={`adapterMini ${item.status === "repo-local-ready" ? "ready-local" : "credential-gated"}`} key={item.id}>
          <span>{item.lane}</span>
          <strong>{item.label}</strong>
          <small>{item.liveProviderCallsEnabled ? "Live AI" : "Live AI off"}</small>
        </div>
      ))}
    </div>
  );
}

function RetailFulfillmentReadinessList({ items }: { items: RetailFulfillmentReadinessItem[] }) {
  return (
    <div className="adapterMiniList">
      {items.map((item) => (
        <div className={`adapterMini ${retailFulfillmentStatusClass(item.status)}`} key={item.id}>
          <span>{item.lane}</span>
          <strong>{item.label}</strong>
          <small>{item.directOrderEnabled ? "Direct orders" : "Orders off"}</small>
        </div>
      ))}
    </div>
  );
}

function PaymentReadinessList({ items }: { items: PaymentReadinessItem[] }) {
  return (
    <div className="adapterMiniList">
      {items.map((item) => (
        <div className={`adapterMini ${paymentReadinessStatusClass(item.status)}`} key={item.id}>
          <span>{item.lane}</span>
          <strong>{item.label}</strong>
          <small>{item.liveChargesEnabled ? "Live charge" : "Charges off"}</small>
        </div>
      ))}
    </div>
  );
}

function MobileRenderReadinessList({ items }: { items: MobileRenderReadinessItem[] }) {
  return (
    <div className="adapterMiniList">
      {items.map((item) => (
        <div className={`adapterMini ${mobileRenderReadinessStatusClass(item.status)}`} key={item.id}>
          <span>{item.lane}</span>
          <strong>{item.label}</strong>
          <small>{item.emulatorRenderProofAttached || item.nativeArtifactSigned ? "Proof attached" : "Proof missing"}</small>
        </div>
      ))}
    </div>
  );
}

function HostedApiReadinessList({ items }: { items: HostedApiReadinessItem[] }) {
  return (
    <div className="adapterMiniList">
      {items.map((item) => (
        <div className={`adapterMini ${hostedApiReadinessStatusClass(item.status)}`} key={item.id}>
          <span>{item.lane}</span>
          <strong>{item.label}</strong>
          <small>
            {item.publicRouteProofAttached || item.hostedDbConnected || item.hostedTokenVerificationAttached
              ? "Proof attached"
              : "Proof missing"}
          </small>
        </div>
      ))}
    </div>
  );
}

function ReviewerDbSeedReadinessList({ items }: { items: ReviewerDbSeedReadinessItem[] }) {
  return (
    <div className="adapterMiniList">
      {items.map((item) => (
        <div className={`adapterMini ${reviewerDbSeedReadinessStatusClass(item.status)}`} key={item.id}>
          <span>{item.lane}</span>
          <strong>{item.label}</strong>
          <small>{item.hostedSeedExecuted || item.hostedTokenProbeAttached ? "Proof attached" : "Proof missing"}</small>
        </div>
      ))}
    </div>
  );
}

function CloudArtifactProofReadinessList({ items }: { items: CloudArtifactProofReadinessItem[] }) {
  const repoLocalItems = items.filter((item) => item.status === "repo-local-ready");
  const evidenceItems = items.filter((item) => item.status !== "repo-local-ready");

  return (
    <div className="cloudProofColumns">
      <div>
        <p className="eyebrow">Source contracts</p>
        <div className="cloudProofList">
          {repoLocalItems.map((item) => (
            <CloudArtifactProofRow item={item} key={item.id} />
          ))}
        </div>
      </div>
      <div>
        <p className="eyebrow">Evidence required</p>
        <div className="cloudProofList">
          {evidenceItems.map((item) => (
            <CloudArtifactProofRow item={item} key={item.id} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CloudArtifactProofRow({ item }: { item: CloudArtifactProofReadinessItem }) {
  const stateLabel = item.status === "repo-local-ready" ? "Repo-local ready" : "Proof missing";

  return (
    <div className={`cloudProofRow ${cloudArtifactProofReadinessStatusClass(item.status)}`}>
      <div>
        <span>{item.lane}</span>
        <strong>{item.label}</strong>
      </div>
      <small>{stateLabel}</small>
    </div>
  );
}

function BusinessEngagementReadinessList({ items }: { items: BusinessEngagementReadinessItem[] }) {
  return (
    <div className="adapterMiniList">
      {items.map((item) => (
        <div className={`adapterMini ${businessEngagementReadinessStatusClass(item.status)}`} key={item.id}>
          <span>{item.lane}</span>
          <strong>{item.label}</strong>
          <small>{item.liveMessagesEnabled || item.crmWritesEnabled ? "Live enabled" : "Live off"}</small>
        </div>
      ))}
    </div>
  );
}

function businessEngagementReadinessStatusClass(status: BusinessEngagementReadinessItem["status"]): ProviderStatus {
  if (status === "repo-local-ready") return "ready-local";
  if (status === "approval-blocked") return "blocked";
  return "credential-gated";
}

function hostedApiReadinessStatusClass(status: HostedApiReadinessItem["status"]): ProviderStatus {
  if (status === "repo-local-ready") return "ready-local";
  if (status === "protection-blocked") return "blocked";
  return "credential-gated";
}

function reviewerDbSeedReadinessStatusClass(status: ReviewerDbSeedReadinessItem["status"]): ProviderStatus {
  if (status === "repo-local-ready") return "ready-local";
  return "credential-gated";
}

function cloudArtifactProofReadinessStatusClass(status: CloudArtifactProofReadinessItem["status"]): ProviderStatus {
  if (status === "repo-local-ready") return "ready-local";
  return "credential-gated";
}

function mobileRenderReadinessStatusClass(status: MobileRenderReadinessItem["status"]): ProviderStatus {
  if (status === "repo-local-ready") return "ready-local";
  if (status === "artifact-blocked") return "blocked";
  return "credential-gated";
}

function paymentReadinessStatusClass(status: PaymentReadinessItem["status"]): ProviderStatus {
  if (status === "repo-local-ready") return "ready-local";
  if (status === "certification-blocked") return "blocked";
  return "credential-gated";
}

function retailFulfillmentStatusClass(status: RetailFulfillmentReadinessItem["status"]): ProviderStatus {
  if (status === "repo-local-ready") return "ready-local";
  if (status === "certification-blocked") return "blocked";
  return "credential-gated";
}

function e2eAutomationLabel(type: E2eCoverageItem["automationType"]): string {
  if (type === "browser-smoke") return "Browser smoke";
  if (type === "contract-test") return "Contract test";
  if (type === "ci-workflow") return "CI workflow";
  return "Doctor";
}

function externalAuditStatusLabel(status: ExternalAuditReadinessItem["status"]): string {
  if (status === "internal-baseline-ready") return "Internal baseline only";
  if (status === "certification-blocked") return "Certification blocked";
  return "Evidence missing";
}

function adapterIcon(adapter: ProviderAdapter) {
  if (adapter.status === "ready-local") return <CircleCheck size={19} />;
  if (adapter.status === "blocked") return <XCircle size={19} />;
  return <Lock size={19} />;
}

function PanelPreview({ panel }: { panel: CardPanel }) {
  return (
    <article className={`panelPreview ${panel.id}`}>
      <div className="panelChrome">
        <span>{panel.label}</span>
        <PanelTop size={16} />
      </div>
      <div className="panelBody" dir={panel.rtl ? "rtl" : "ltr"}>
        <h3>{panel.headline}</h3>
        <p>{panel.body}</p>
      </div>
      <small>{panel.artDirection}</small>
    </article>
  );
}

function SegmentedControl({
  label,
  options,
  value,
  onValue
}: {
  label: string;
  options: string[];
  value: string;
  onValue: (value: string) => void;
}) {
  return (
    <div className="segmentBlock">
      <span>{label}</span>
      <div className="segmentRow">
        {options.map((option) => (
          <button
            className={value === option ? "segment active" : "segment"}
            key={option}
            onClick={() => onValue(option)}
            type="button"
          >
            {formatOption(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusChip({ icon: Icon, label, tone }: { icon: LucideIcon; label: string; tone: "green" | "blue" | "red" }) {
  return (
    <span className={`statusChip ${tone}`}>
      <Icon size={15} />
      {label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function iconForCapability(capability: ProviderCapability) {
  const props = { size: 18 };
  if (capability === "event-import") return <Calendar {...props} />;
  if (capability === "text-chat") return <MessageCircle {...props} />;
  if (capability === "image-generation") return <Image {...props} />;
  if (capability === "render-export") return <FileDown {...props} />;
  if (capability === "vendor-handoff") return <Printer {...props} />;
  if (capability === "cloud-runtime") return <Cloud {...props} />;
  if (capability === "memory") return <Heart {...props} />;
  return <Settings {...props} />;
}

function decisionLabel(decision: OpportunityDecision): string {
  const labels: Record<OpportunityDecision, string> = {
    pending: "Awaiting user decision",
    accepted: "Approved for card generation",
    snoozed: "Snoozed locally",
    dismissed: "Dismissed locally"
  };
  return labels[decision];
}

function buildRuntimeReadinessMap(): Map<string, RuntimeReadiness> {
  return new Map(
    providerCatalog.map((adapter) => {
      const runtime = buildProviderAdapterRuntime(adapter.id);
      return [adapter.id, runtime.readiness];
    })
  );
}

function summarizeRuntimeReadiness(readinessMap: Map<string, RuntimeReadiness>) {
  const readiness = Array.from(readinessMap.values());

  return {
    blocked: readiness.filter((item) => item.mode === "blocked").length,
    localResult: readiness.filter((item) => item.mode === "local-result").length,
    missingCredentials: readiness.reduce((total, item) => total + item.missingCredentials.length, 0),
    preparedRequest: readiness.filter((item) => item.mode === "prepared-request").length
  };
}

function prioritizeAdminEnv(requiredEnv: string[]): string[] {
  const priority = [
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "MISTRAL_API_KEY",
    "COHERE_API_KEY",
    "PERPLEXITY_API_KEY",
    "XAI_API_KEY",
    "TOGETHER_API_KEY",
    "HUGGINGFACE_API_TOKEN",
    "STABILITY_API_KEY",
    "REPLICATE_API_TOKEN",
    "IDEOGRAM_API_KEY",
    "LEONARDO_API_KEY",
    "GOOGLE_OAUTH_CLIENT_ID",
    "GOOGLE_OAUTH_CLIENT_SECRET",
    "MICROSOFT_CLIENT_ID",
    "MICROSOFT_CLIENT_SECRET",
    "MICROSOFT_TENANT_ID",
    "SALESFORCE_INSTANCE_URL",
    "HUBSPOT_PRIVATE_APP_TOKEN",
    "SHOPIFY_SHOP_DOMAIN",
    "ZAPIER_WEBHOOK_URL",
    "MAKE_WEBHOOK_URL",
    "SLACK_BOT_TOKEN",
    "NOTION_API_KEY",
    "AIRTABLE_API_KEY",
    "GOOGLE_SHEETS_SPREADSHEET_ID"
  ];
  const envSet = new Set(requiredEnv);
  const prioritized = priority.filter((envVar) => envSet.has(envVar));
  const remaining = requiredEnv
    .filter((envVar) => !priority.includes(envVar))
    .slice()
    .sort((first, second) => first.localeCompare(second));

  return [...prioritized, ...remaining];
}

function runtimeModeLabel(mode: RuntimeReadiness["mode"]): string {
  const labels: Record<RuntimeReadiness["mode"], string> = {
    blocked: "blocked by gates",
    "local-result": "local fallback ready",
    "prepared-request": "request contract ready"
  };
  return labels[mode];
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatOption(value: string): string {
  return value
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function loadWorkspace(): LocalWorkspace | undefined {
  try {
    const raw = localStorage.getItem(workspaceKey);
    if (!raw) return undefined;
    return JSON.parse(raw) as LocalWorkspace;
  } catch {
    return undefined;
  }
}

export default App;
