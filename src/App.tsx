import {
  Calendar,
  Check,
  CircleCheck,
  ClipboardCheck,
  Cloud,
  Download,
  ExternalLink,
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
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  freeAdapterLabels,
  generateCardDraft,
  getDefaultDraftInput,
  parseFreeImport,
  removeMemory,
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
import { buildCustomerWebExperience, type CustomerWebActionId } from "./customerWebExperience";
import {
  reviewerDraftOptions,
  reviewerEmptyMemories,
  reviewerInitialAuthForm,
  reviewerInitialExportStatus,
  reviewerInitialScanStatus,
  reviewerReferenceDate,
  reviewerWorkspaceKey
} from "./reviewerBootstrap";
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
import {
  mobileRenderSnapshot,
  summarizeMobileRenderSnapshot,
  type MobileRenderRow,
  type MobileRenderSection
} from "../apps/mobile/src/customerExperience";
import { buildCalendarOnboardingChoices, type CalendarOnboardingChoice } from "./onboardingCalendar";
import { summarizeProviderGovernance, type ProviderGovernanceSummary } from "./providerGovernance";
import { buildProviderAdapterRuntime, type RuntimeReadiness } from "./providerRuntime";
import { buildAdminOperationsWorkflow, type AdminOperationsWorkflow, type AdminOperationTask } from "./adminOperations";
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
import { getRetailPrinterProductLink, type RetailPrinterVendorId } from "./retailPrinterAdapters";
import {
  buildFulfillmentRecommendations,
  type FulfillmentRecommendation,
  type FulfillmentRecommendationSet
} from "./fulfillmentRecommendation";
import { buildPanelSvgExportFile, buildPrintExportPackage, type PrintExportFile, type PrintExportPackage } from "./printExport";

type ViewId = "customer" | "mobile" | "opportunities" | "studio" | "memory" | "handoff" | "admin" | "adapters";
type OpportunityDecision = "pending" | "accepted" | "snoozed" | "dismissed";
type AdapterStatusFilter = ProviderStatus | "all";
type AdapterCapabilityFilter = ProviderCapability | "all";

interface NavItem {
  id: ViewId;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { id: "customer", label: "Your cards", icon: UserRound },
  { id: "mobile", label: "Mobile app", icon: Smartphone },
  { id: "opportunities", label: "Opportunities", icon: Calendar },
  { id: "studio", label: "Card studio", icon: WandSparkles },
  { id: "memory", label: "Memory", icon: Heart },
  { id: "handoff", label: "Print options", icon: Printer },
  { id: "admin", label: "Operations", icon: ShieldCheck },
  { id: "adapters", label: "Connections", icon: Settings }
];

const viewIds = new Set<ViewId>(navItems.map((item) => item.id));

function isViewId(value: string | null | undefined): value is ViewId {
  return Boolean(value && viewIds.has(value as ViewId));
}

function initialViewFromLocation(): ViewId {
  if (typeof window === "undefined") return "customer";
  const requestedView = new URLSearchParams(window.location.search).get("view");
  if (isViewId(requestedView)) return requestedView;
  const hashView = window.location.hash.replace(/^#\/?/, "");
  if (isViewId(hashView)) return hashView;
  return "customer";
}

function updateViewRoute(view: ViewId) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("view", view);
  url.hash = "";
  window.history.pushState({ customCardView: view }, "", url);
}

function App() {
  const [activeView, setActiveView] = useState<ViewId>(() => initialViewFromLocation());
  const [workspace, setWorkspace] = useState<LocalWorkspace | undefined>(() => loadWorkspace());
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
  const calendarOnboardingChoices = useMemo(() => buildCalendarOnboardingChoices(), []);
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

  function openView(view: ViewId) {
    setActiveView(view);
    if (initialViewFromLocation() !== view) {
      updateViewRoute(view);
    }
  }

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

  function saveWorkspace(nextWorkspace: LocalWorkspace | undefined) {
    setWorkspace(nextWorkspace);
    if (!nextWorkspace) {
      localStorage.removeItem(reviewerWorkspaceKey);
      return;
    }
    localStorage.setItem(reviewerWorkspaceKey, JSON.stringify(nextWorkspace));
  }

  function startWorkspace() {
    const nextWorkspace = createLocalWorkspace(authForm.name, authForm.email, reviewerReferenceDate);
    saveWorkspace(nextWorkspace);
    setScanStatus("Local workspace ready");
  }

  function addApprovedMemory() {
    if (!workspace) {
      const nextWorkspace = createLocalWorkspace(authForm.name, authForm.email, reviewerReferenceDate);
      const withMemory = addMemory(nextWorkspace, memoryForm.recipient, memoryForm.note, reviewerReferenceDate);
      saveWorkspace(withMemory);
    } else {
      saveWorkspace(addMemory(workspace, memoryForm.recipient, memoryForm.note, reviewerReferenceDate));
    }
    setMemoryForm({ recipient: memoryForm.recipient, note: "" });
  }

  function deleteMemory(memoryId: string) {
    if (!workspace) return;
    saveWorkspace(removeMemory(workspace, memoryId));
  }

  function scanImport() {
    setScanStatus(`${signal.source} reviewed`);
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
      `${handoff.vendorName} print checklist`,
      ...handoff.checklist.map((item, index) => `${index + 1}. ${item}`),
      "Checkout happens outside CustomCard until certified ordering is ready."
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
            <small>Private card workspace</small>
          </div>
        </div>

        <nav className="navList">
          {navItems.map((item) => (
            <button
              className={activeView === item.id ? "navButton active" : "navButton"}
              aria-current={activeView === item.id ? "page" : undefined}
              key={item.id}
              onClick={() => openView(item.id)}
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
            <p className="eyebrow">Personal card workflow</p>
            <h1>CustomCard</h1>
          </div>
          <div className="topStatus" aria-label="Checkout status">
            {opsView ? (
              <>
                <StatusChip icon={ShieldCheck} label="Local auth" tone="green" />
                <StatusChip icon={FileDown} label="SVG export" tone="blue" />
                <StatusChip icon={XCircle} label="Orders need confirmation" tone="red" />
              </>
            ) : (
              <>
                <StatusChip icon={ShieldCheck} label="Private review" tone="green" />
                <StatusChip icon={Calendar} label="Manual import" tone="blue" />
                <StatusChip icon={Store} label="Best option" tone="blue" />
              </>
            )}
          </div>
        </header>

        {activeView === "customer" && (
          <CustomerPanelView
            chatInput={customerChatInput}
            chatSession={customerChatSession}
            calendarChoices={calendarOnboardingChoices}
            handoff={handoff}
            localizationSummary={localizationSummary}
            onChatInput={setCustomerChatInput}
            onChatSend={sendCustomerChat}
            onLocale={chooseLocale}
            onNavigate={openView}
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

        {activeView === "mobile" && <MobileAppPreviewView />}

        {activeView !== "customer" && (
          <section className="workspaceBand" aria-label="Workspace">
            <div className="workspaceIdentity">
              <div className="iconBadge">
                <UserRound size={22} />
              </div>
              <div>
                <span>{workspace ? "Signed in locally" : "Local workspace auth"}</span>
                <strong>{workspace?.name ?? "Create a local workspace"}</strong>
                <small>{workspace?.email ?? "No connected account"}</small>
              </div>
            </div>

            {workspace ? (
              <div className="workspaceActions">
                <button className="quietButton" type="button" onClick={() => openView("memory")}>
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
          <section className="adapterStrip" aria-label="Available local features">
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
              openView("studio");
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
            onExport={() => openView("handoff")}
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

function MobileAppPreviewView() {
  const snapshot = mobileRenderSnapshot;
  const summary = summarizeMobileRenderSnapshot(snapshot);
  const highlightedSections = snapshot.sections.filter((section) =>
    ["sign-in-import", "card-queue", "best-available-options", "checkout-confirmation", "offline-sync"].includes(section.id)
  );

  return (
    <section className="mobilePreviewView" aria-label="Mobile app preview">
      <div className="mobilePreviewIntro">
        <div>
          <p className="eyebrow">Native customer app</p>
          <h2>Mobile app</h2>
          <p>Same customer screen model used by the iOS and Android shell.</p>
        </div>
        <div className="mobilePreviewMetrics">
          <Metric label="Sections" value={`${summary.sectionCount}`} />
          <Metric label="Rows" value={`${summary.rowCount}`} />
          <Metric label="Approval slots" value={`${summary.primaryActionCount}`} />
          <Metric label="Orders" value="Confirm" />
        </div>
      </div>

      <div className="mobilePreviewLayout">
        <article className="mobileDevice" aria-label="CustomCard native customer shell">
          <div className="mobileStatusBar">
            <span>9:41</span>
            <span>{snapshot.screenTitle}</span>
          </div>
          <div className="mobileScreen">
            <header className="mobileHero">
              <div>
                <p>{snapshot.hero.eyebrow}</p>
                <h3>{snapshot.hero.title}</h3>
                <span>{snapshot.hero.subtitle}</span>
              </div>
              <ShieldCheck size={22} />
            </header>

            <section className="mobilePrimaryAction" data-action-priority="primary">
              <div>
                <strong>{snapshot.hero.primaryAction.label}</strong>
                <span>{snapshot.hero.primaryAction.detail}</span>
              </div>
              <em>{snapshot.hero.primaryAction.modeLabel}</em>
            </section>

            <section className="mobileSummaryBand">
              <strong>{snapshot.safetyBand.label}</strong>
              <span>{snapshot.safetyBand.detail}</span>
              <div className="mobileMiniStats">
                {snapshot.safetyBand.metrics.map((metric) => (
                  <MobileMiniStat key={metric.label} label={metric.label} value={metric.value} />
                ))}
              </div>
            </section>

            {snapshot.sections.map((section) =>
              section.id === "next-action" ? (
                <MobileNextActionSection key={section.id} section={section} />
              ) : (
                <MobileSnapshotSection key={section.id} section={section} />
              )
            )}

            <section className="mobileFooterSafety" aria-label="Mobile checkout safeguards">
              {snapshot.footerSafetyMessages.map((message) => (
                <span key={message}>{message}</span>
              ))}
            </section>
          </div>
        </article>

        <aside className="mobileCustomerPanel" aria-label="Mobile customer summary">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Customer flow</p>
              <h3>What the mobile app shows first</h3>
            </div>
            <Smartphone size={18} />
          </div>
          <div className="mobileCustomerSummaryRows">
            {highlightedSections.map((section) => (
              <div className="mobileCustomerSummaryRow" key={section.id}>
                <strong>{section.title}</strong>
                <span>{section.rows[0]?.detail ?? section.rows[0]?.title}</span>
              </div>
            ))}
          </div>
          <div className="mobileProofBoundary">
            <Lock size={18} />
            <div>
              <strong>{snapshot.safetyBand.label}</strong>
              <span>{snapshot.safetyBand.detail}</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function MobileSnapshotSection({ section }: { section: MobileRenderSection }) {
  return (
    <section className="mobileSection">
      <h4>{section.title}</h4>
      <div className={section.id === "card-assistant" ? "mobileChatStack" : "mobileSnapshotRows"}>
        {section.rows.map((row, index) => (
          <MobileSnapshotRow key={`${section.id}-${index}-${row.title}-${row.modeLabel}`} row={row} chat={section.id === "card-assistant"} />
        ))}
      </div>
    </section>
  );
}

function MobileNextActionSection({ section }: { section: MobileRenderSection }) {
  const row = section.rows[0];
  return (
    <section className="mobileTodayCard">
      <div>
        <p>{section.title}</p>
        <strong>{row.title}</strong>
        <span>{row.detail}</span>
      </div>
      <em>{row.modeLabel}</em>
    </section>
  );
}

function MobileSnapshotRow({ row, chat }: { row: MobileRenderRow; chat?: boolean }) {
  if (chat) {
    return (
      <div className={row.modeLabel === "Customer" ? "mobileChatBubble customer" : "mobileChatBubble assistant"}>
        <strong>{row.title}</strong>
        <span>{row.detail}</span>
      </div>
    );
  }

  return (
    <div className="mobileListRow">
      <div>
        <strong>{row.title}</strong>
        <span>{row.detail}</span>
      </div>
      <em>{row.modeLabel}</em>
    </div>
  );
}

function MobileMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function CustomerPanelView({
  calendarChoices,
  chatInput,
  chatSession,
  handoff,
  localizationSummary,
  onChatInput,
  onChatSend,
  onLocale,
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
  calendarChoices: CalendarOnboardingChoice[];
  chatInput: string;
  chatSession: CustomerChatSession;
  handoff: VendorHandoff;
  localizationSummary: LocalizationReadinessSummary;
  onChatInput: (value: string) => void;
  onChatSend: () => void;
  onLocale: (locale: SupportedLocaleCode) => void;
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
  const customerExperience = buildCustomerWebExperience({
    hasWorkspace,
    cardReviewStarted,
    opportunityTitle: opportunity.title,
    opportunityDateLabel: opportunity.dateLabel,
    opportunityStatus: opportunity.status,
    opportunityRecommendedPath: opportunity.recommendedPath,
    opportunityConfidence: opportunity.confidence,
    evidenceCount: opportunity.evidence.length,
    memoryMatched: opportunity.memoryIds.length > 0,
    panelCount,
    checkoutMode: handoff.canPlaceRealOrder ? "ready" : "manual",
    supportedLocaleCount: localizationSummary.supportedLocales,
    selectedLocaleLabel: selectedLocale.label,
    selectedLocaleRequiresRtl: selectedLocale.requiresRtlLayout,
    selectedLocaleReviewState: selectedLocale.reviewState,
    cardLanguage: selectedLocale.cardLanguage,
    productionGateCount: productionReadiness.total,
    productionEvidenceMissing: productionReadiness.evidenceMissing
  });
  const customerActionIcons: Record<CustomerWebActionId, LucideIcon> = {
    "create-workspace": KeyRound,
    "paste-invite": ClipboardCheck,
    "review-event": Calendar,
    "continue-proof": WandSparkles,
    "choose-fulfillment": Store,
    "add-memory": Heart
  };
  const customerActionHandlers: Record<CustomerWebActionId, () => void> = {
    "create-workspace": onStartWorkspace,
    "paste-invite": () => onNavigate("opportunities"),
    "review-event": () => onNavigate("opportunities"),
    "continue-proof": () => onNavigate("studio"),
    "choose-fulfillment": () => onNavigate("handoff"),
    "add-memory": () => onNavigate("memory")
  };

  return (
    <section className="customerPanel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Your workspace</p>
          <h2>Your cards</h2>
        </div>
        <StatusChip icon={MessageCircle} label={customerExperience.statusLabel} tone="green" />
      </div>

      <div className="customerGrid">
        <article className="customerStartCard wide">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">{customerExperience.eyebrow}</p>
              <h3>{customerExperience.workspaceTitle}</h3>
            </div>
            <StatusChip icon={ShieldCheck} label={customerExperience.workspaceStatusLabel} tone="green" />
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
                <small>{customerExperience.workspaceHelp}</small>
              </div>
            </div>
          ) : (
            <div className="customerSetupCopy" aria-label="Customer local workspace options">
              <ShieldCheck size={20} />
              <div>
                <strong>Start locally, then review every imported detail.</strong>
                <span>{customerExperience.workspaceHelp}</span>
              </div>
            </div>
          )}

          <div className="calendarOnboardingBox" aria-label="Calendar onboarding choices">
            {calendarChoices.map((choice) => (
              <div className={`calendarChoice ${choice.status}`} key={choice.id}>
                <div>
                  <strong>{choice.label}</strong>
                  <span>{choice.dataBoundary}</span>
                </div>
                <em>{calendarChoiceStatusLabel(choice)}</em>
              </div>
            ))}
          </div>

          <div className="customerFlowSteps" aria-label="Customer journey steps">
            {customerExperience.flowSteps.map((step) => (
              <div className={`customerFlowStep ${step.state}`} key={step.label}>
                <strong>{step.label}</strong>
                <span>{step.detail}</span>
              </div>
            ))}
          </div>

          <div className="journeyActionGrid" aria-label="Customer next action">
            {(() => {
              const action = customerExperience.primaryAction;
              const ActionIcon = customerActionIcons[action.id];
              return (
                <button
                  className="journeyAction primary"
                  data-action-priority={action.priority}
                  onClick={customerActionHandlers[action.id]}
                  type="button"
                >
                  <ActionIcon size={18} />
                  <span>{action.label}</span>
                  <small>{action.detail}</small>
                </button>
              );
            })()}
          </div>

          {customerExperience.supportingActions.length > 0 && (
            <div className="supportingActionList" aria-label="Other customer tasks">
              {customerExperience.supportingActions.map((action) => {
                const ActionIcon = customerActionIcons[action.id];
                return (
                  <button className="supportingAction" key={action.id} onClick={customerActionHandlers[action.id]} type="button">
                    <ActionIcon size={15} />
                    <span>{action.label}</span>
                    <small>{action.detail}</small>
                  </button>
                );
              })}
            </div>
          )}

          <p className="panelNote">{customerExperience.panelNote}</p>
        </article>

        <article className="eventQueueCard">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Events</p>
              <h3>Card opportunities</h3>
            </div>
            <span className={opportunity.status === "ready" ? "statePill ready" : "statePill hold"}>
              {customerExperience.event.statusLabel}
            </span>
          </div>

          <div className="eventRow">
            <div>
              <strong>{customerExperience.event.title}</strong>
              <span>{customerExperience.event.dateLabel}</span>
              <small>{customerExperience.event.recommendedPath}</small>
            </div>
          </div>

          <div className="metricStrip">
            <Metric label="Confidence" value={customerExperience.event.confidenceLabel} />
            <Metric label="Panels" value={customerExperience.event.panelLabel} />
            <Metric label="Memory" value={customerExperience.event.memoryLabel} />
            <Metric label="Checkout" value={customerExperience.event.checkoutLabel} />
          </div>
        </article>

        <article className="fulfillmentRecommendation">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Print</p>
              <h3>{customerExperience.fulfillment.title}</h3>
            </div>
            <StatusChip icon={Store} label={customerExperience.fulfillment.statusLabel} tone="blue" />
          </div>

          {customerExperience.fulfillment.showOptions ? (
            <div className="fulfillmentOptionGrid" aria-label="Customer print recommendation">
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
                <strong>{customerExperience.fulfillment.holdTitle}</strong>
                <span>{customerExperience.fulfillment.holdDescription}</span>
              </div>
            </div>
          )}

          <div className="confirmationNotice">
            <XCircle size={16} />
            <span>{fulfillmentRecommendationSet.disclaimer}</span>
          </div>
        </article>

        <article className="chatConsole">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Customer chat</p>
              <h3>{customerExperience.chatTitle}</h3>
            </div>
            <StatusChip icon={Lock} label={customerExperience.chatStatusLabel} tone="blue" />
          </div>
          <div className="chatRuntimeLine" aria-label="Customer chat safety">
            {customerExperience.chatSafetyBadges.map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
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
            {Object.entries(customerExperience.artworkMetrics).map(([label, value]) => (
              <Metric key={label} label={label} value={value} />
            ))}
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
            {Object.entries(customerExperience.privacyMetrics).map(([label, value]) => (
              <Metric key={label} label={label} value={value} />
            ))}
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
            {Object.entries(customerExperience.localeMetrics).map(([label, value]) => (
              <Metric key={label} label={label} value={value} />
            ))}
          </div>
        </article>

        <article className="surfaceCard">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Ordering</p>
              <h3>Checkout safety</h3>
            </div>
            <ShieldCheck size={18} />
          </div>
          <div className="runtimeGrid compactMetrics" aria-label="Customer checkout safety">
            {Object.entries(customerExperience.safetyMetrics).map(([label, value]) => (
              <Metric key={label} label={label} value={value} />
            ))}
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

function calendarChoiceStatusLabel(choice: CalendarOnboardingChoice): string {
  if (choice.status === "ready-local") return "Ready now";
  if (choice.status === "manual-export") return "Manual export";
  return "Not connected yet";
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
            Parse pasted invite/ICS
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
              {reviewerDraftOptions.languages.map((language) => (
                <option key={language}>{language}</option>
              ))}
            </select>
          </label>
        </div>

        <SegmentedControl
          label="Tone"
          options={reviewerDraftOptions.tones}
          value={draftInput.tone}
          onValue={(value) => onUpdate("tone", value as Tone)}
        />
        <SegmentedControl
          label="Style"
          options={reviewerDraftOptions.styles}
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
          Continue to print options
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
  const retailVendorId = toRetailPrinterVendorId(vendorId);
  const selectedPrintShopUrl = retailVendorId ? getRetailPrinterProductLink(retailVendorId).productUrl : undefined;

  return (
    <section className="handoffLayout">
      <div className="toolPanel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Export</p>
            <h2>Print your card</h2>
          </div>
          <StatusChip icon={PackageCheck} label={exportStatus} tone="blue" />
        </div>

        <SegmentedControl
          label="Print shop"
          options={reviewerDraftOptions.vendors}
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
          <button className="primaryButton" disabled={!printPackage.manifest.passed} onClick={onDownloadPackage} type="button">
            <PackageCheck size={16} />
            Download print package
          </button>
          <button className="quietButton" disabled={!validation.passed} onClick={onDownloadAll} type="button">
            <FileDown size={16} />
            Download SVG set
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
              <span>Print-ready files</span>
              <h3>{printPackage.manifest.passed ? "Ready to download" : "Needs fixes"}</h3>
            </div>
          </div>
          <div className="packageMetricGrid">
            <Metric label="Files" value={`${printPackage.files.length}`} />
            <Metric label="PDF" value={pdfFile ? `${Math.ceil(pdfFile.byteLength / 1024)} KB` : "Missing"} />
            <Metric label="Manifest" value={manifestFile ? "Ready" : "Missing"} />
          </div>
          <small>
            Includes four SVG panels, a combined 5x7 PDF proof, and a checksum manifest. You upload these yourself;
            CustomCard does not charge or order.
          </small>
        </div>
      </div>

      <div className="handoffPanel">
        <div className="handoffTitle">
          <Store size={21} />
          <div>
            <span>Upload yourself</span>
            <h2>{handoff.vendorName}</h2>
          </div>
          {selectedPrintShopUrl && (
            <a className="printShopLink" href={selectedPrintShopUrl} rel="noreferrer" target="_blank">
              <ExternalLink size={15} />
              Open {handoff.vendorName}
            </a>
          )}
        </div>

        <ol className="checklist">
          {handoff.checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>

        <div className="blockedBox">
          <XCircle size={18} />
          <div>
            <strong>Checkout happens outside CustomCard</strong>
            {handoff.disabledReasons.map((reason) => (
              <span key={reason}>{reason}</span>
            ))}
          </div>
        </div>

        <div className="pricingResearchBox">
          <div className="handoffTitle compact">
            <Printer size={19} />
            <div>
              <span>Price estimate</span>
              <h3>{primaryPricing ? primaryPricing.effectiveSubtotalLabel : "Manual quote required"}</h3>
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
            <Metric label="Checked" value={`${refreshReport.freshSources}/${refreshReport.sourceCount}`} />
            <Metric label="Discounts" value={`${refreshReport.activeCouponOfferCount}/${refreshReport.couponOfferCount}`} />
            <Metric
              label="Discount checks"
              value={`${refreshReport.couponPortalApplicationPacketCount}/${refreshReport.couponPortalApplicationTargetCount}`}
            />
            <Metric label="Freshness" value={`${refreshReport.maxAgeDays} days`} />
            <Metric label="State" value={refreshReport.canShowComparison ? "Fresh" : "Refresh"} />
            <Metric
              label="Confirm at"
              value={pricingComparison.couponPolicy.providerPortalApplicationRequired ? "Checkout" : "Source"}
            />
          </div>
          <div className="pricingOptionList">
            {rankedOptions.map((estimate) => (
              <div className="pricingOption" key={estimate.observation.id}>
                <strong>{estimate.observation.vendorName}</strong>
                <span>{estimate.effectiveSubtotalLabel}</span>
                <small>
                  {estimate.observation.speed.replace(/-/g, " ")} / {estimate.observation.confidence.replace(/-/g, " ")} /
                  {customerCouponStatusLabel(estimate.couponApplication.status)}
                </small>
              </div>
            ))}
          </div>
          <small>
            Public prices are not final checkout totals. Confirm final price, available discounts, tax, pickup, and
            shipping before ordering.
          </small>
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
  const adminOperationsWorkflow = buildAdminOperationsWorkflow({
    model,
    productionGates: productionLaunchGates,
    hostedApiReadinessItems,
    retailFulfillmentReadinessItems: retailFulfillmentItems,
    paymentReadinessItems,
    observabilityReadinessItems: observabilityItems,
    externalAuditReadinessItems: externalAuditItems
  });

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
        <AdminOperationsWorkflowView workflow={adminOperationsWorkflow} />

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

function AdminOperationsWorkflowView({ workflow }: { workflow: AdminOperationsWorkflow }) {
  return (
    <article className="toolPanel adminWide adminOperationsCard">
      <div className="sectionHeader compact">
        <div>
          <p className="eyebrow">Integration ownership</p>
          <h3>Integration owner workflow</h3>
        </div>
        <StatusChip icon={ClipboardCheck} label={`${workflow.summary.p0Tasks} P0 actions`} tone="red" />
      </div>

      <div className="adminOpsOverview" aria-label="Admin operations workflow summary">
        <Metric label="Owners" value={`${workflow.summary.ownerCount}`} />
        <Metric label="Tasks" value={`${workflow.summary.taskCount}`} />
        <Metric label="Evidence req." value={`${workflow.summary.evidenceRequired}`} />
        <Metric label="Credential tasks" value={`${workflow.summary.credentialTasks}`} />
        <Metric label="Blocked" value={`${workflow.summary.blocked}`} />
        <Metric label="Live enabled" value={`${workflow.summary.liveEnabled}`} />
      </div>

      <div className="adminOpsLaneGrid" aria-label="Admin operation owner lanes">
        {workflow.ownerLanes.map((lane) => (
          <div className="adminOpsLane" key={lane.id}>
            <div>
              <strong>{lane.label}</strong>
              <span>{lane.description}</span>
            </div>
            <small>
              {lane.p0Tasks} P0 / {lane.evidenceRequired} evidence
            </small>
          </div>
        ))}
      </div>

      <div className="adminOpsTaskList" aria-label="Priority admin operation tasks">
        {workflow.priorityTasks.map((task) => (
          <AdminOperationTaskRow key={task.id} sourceLabel={workflow.sourceLabels[task.source]} task={task} />
        ))}
      </div>

      <p className="panelNote">
        This is an operator queue, not a live launch switch: every row needs attached evidence before credentials,
        provider calls, payment, telemetry, hosted auth, or retail ordering can move past readiness.
      </p>
    </article>
  );
}

function AdminOperationTaskRow({ sourceLabel, task }: { sourceLabel: string; task: AdminOperationTask }) {
  return (
    <div className={`adminOpsTask ${task.status}`}>
      <div className="adminOpsTaskHeader">
        <div>
          <span>{sourceLabel}</span>
          <strong>{task.label}</strong>
        </div>
        <em>{adminOperationStatusLabel(task.status)}</em>
      </div>
      <p>{task.adminAction}</p>
      <div className="adminOpsTaskEvidence">
        <span>{task.requiredEvidence[0]}</span>
        {task.envVarNames.length > 0 && <small>{task.envVarNames.slice(0, 3).join(", ")}</small>}
      </div>
    </div>
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

function adminOperationStatusLabel(status: AdminOperationTask["status"]): string {
  const labels: Record<AdminOperationTask["status"], string> = {
    blocked: "Blocked",
    "certification-blocked": "Certification",
    "evidence-required": "Evidence",
    "protection-blocked": "Protected",
    "repo-local-ready": "Local ready"
  };
  return labels[status];
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

function customerCouponStatusLabel(status: string): string {
  if (status === "applied") return "discount confirmed";
  if (status === "portal-evidence-required") return "confirm offer at checkout";
  if (status === "expired") return "offer expired";
  return "no offer found";
}

function toRetailPrinterVendorId(vendorId: VendorId): RetailPrinterVendorId | undefined {
  if (vendorId === "walmart" || vendorId === "fedex" || vendorId === "cvs" || vendorId === "walgreens") return vendorId;
  return undefined;
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
    const raw = localStorage.getItem(reviewerWorkspaceKey);
    if (!raw) return undefined;
    return JSON.parse(raw) as LocalWorkspace;
  } catch {
    return undefined;
  }
}

export default App;
