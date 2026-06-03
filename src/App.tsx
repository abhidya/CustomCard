import {
  Calendar,
  Check,
  CircleCheck,
  ClipboardCheck,
  Cloud,
  Download,
  FileDown,
  Heart,
  Image,
  KeyRound,
  Lock,
  MessageCircle,
  PackageCheck,
  PanelTop,
  Plus,
  Printer,
  RefreshCw,
  Settings,
  ShieldCheck,
  Store,
  Trash2,
  Upload,
  UserRound,
  WandSparkles,
  XCircle,
  type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  buildCustomerChatTranscript,
  buildCustomerPanelModel,
  capabilityLabels,
  providerCatalog,
  providerStatusLabel,
  type AdminPanelModel,
  type CustomerPanelModel,
  type ProviderAdapter,
  type ProviderCapability
} from "./providerCatalog";
import { buildProviderAdapterRuntime, type RuntimeReadiness } from "./providerRuntime";
import { buildPrinterPricingComparison, type PrinterPricingComparison } from "./printerPricing";
import { buildPanelSvgExportFile, buildPrintExportPackage, type PrintExportFile, type PrintExportPackage } from "./printExport";

type ViewId = "customer" | "opportunities" | "studio" | "memory" | "handoff" | "admin" | "adapters";
type OpportunityDecision = "pending" | "accepted" | "snoozed" | "dismissed";

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
  const [memoryForm, setMemoryForm] = useState({ recipient: "Sara and Ahmed", note: "" });
  const [exportStatus, setExportStatus] = useState("Ready to export");

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
  const printPackage = useMemo(() => buildPrintExportPackage(draft, validation, handoff), [draft, validation, handoff]);
  const adminPanelModel = useMemo(() => buildAdminPanelModel(), []);
  const customerPanelModel = useMemo(() => buildCustomerPanelModel(), []);
  const runtimeReadiness = useMemo(() => buildRuntimeReadinessMap(), []);
  const customerTranscript = useMemo(
    () => buildCustomerChatTranscript(opportunity.recipient),
    [opportunity.recipient]
  );

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
            <strong>Real orders disabled</strong>
            <span>No paid APIs</span>
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
            <StatusChip icon={ShieldCheck} label="Local auth" tone="green" />
            <StatusChip icon={FileDown} label="SVG export" tone="blue" />
            <StatusChip icon={XCircle} label="Live orders off" tone="red" />
          </div>
        </header>

        {activeView === "customer" && (
          <CustomerPanelView
            chatTranscript={customerTranscript}
            customerModel={customerPanelModel}
            handoff={handoff}
            onNavigate={setActiveView}
            opportunity={opportunity}
            panelCount={draft.panels.length}
            workspace={workspace}
          />
        )}

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

        <section className="adapterStrip" aria-label="Free MVP adapters">
          {freeAdapterLabels.map((label) => (
            <span key={label}>
              <Check size={14} />
              {label}
            </span>
          ))}
        </section>

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

        {activeView === "admin" && <AdminPanelView model={adminPanelModel} runtimeReadiness={runtimeReadiness} />}

        {activeView === "adapters" && <AdaptersView runtimeReadiness={runtimeReadiness} />}
      </main>
    </div>
  );
}

function CustomerPanelView({
  chatTranscript,
  customerModel,
  handoff,
  onNavigate,
  opportunity,
  panelCount,
  workspace
}: {
  chatTranscript: ReturnType<typeof buildCustomerChatTranscript>;
  customerModel: CustomerPanelModel;
  handoff: VendorHandoff;
  onNavigate: (view: ViewId) => void;
  opportunity: CardOpportunity;
  panelCount: number;
  workspace: LocalWorkspace | undefined;
}) {
  const targetByCapability: Partial<Record<ProviderCapability, ViewId>> = {
    "event-import": "opportunities",
    "text-chat": "customer",
    "image-generation": "studio",
    "render-export": "handoff",
    "vendor-handoff": "handoff",
    memory: "memory"
  };

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
        <article className="surfaceCard wide">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Next card</p>
              <h3>{opportunity.title}</h3>
            </div>
            <span className={opportunity.status === "ready" ? "statePill ready" : "statePill hold"}>
              {opportunity.status === "ready" ? "Ready" : "Needs detail"}
            </span>
          </div>

          <div className="metricStrip">
            <Metric label="Workspace" value={workspace?.name ?? "Demo customer"} />
            <Metric label="Date" value={opportunity.dateLabel} />
            <Metric label="Panels" value={`${panelCount} SVG`} />
            <Metric label="Handoff" value={handoff.vendorName} />
          </div>

          <div className="quickActionGrid">
            {customerModel.primaryActions.map((action) => (
              <button
                className="quickAction"
                key={action.adapterId}
                onClick={() => onNavigate(targetByCapability[action.capability] ?? "customer")}
                type="button"
              >
                {iconForCapability(action.capability)}
                <span>{action.label}</span>
                <small>{providerStatusLabel(action.status)}</small>
              </button>
            ))}
          </div>
        </article>

        <article className="chatConsole">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Customer chat</p>
              <h3>Text interface</h3>
            </div>
            <StatusChip icon={Lock} label="No live model call" tone="blue" />
          </div>
          <div className="chatLog">
            {chatTranscript.map((message) => (
              <div className={`chatBubble ${message.role}`} key={`${message.role}-${message.text}`}>
                <strong>{message.role === "customer" ? "Customer" : "Assistant"}</strong>
                <span>{message.text}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="surfaceCard">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Image path</p>
              <h3>Render choices</h3>
            </div>
            <Image size={18} />
          </div>
          <AdapterMiniList adapters={customerModel.imageProviders.slice(0, 5)} />
        </article>

        <article className="surfaceCard">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Ready paths</p>
              <h3>Free fallbacks</h3>
            </div>
            <Check size={18} />
          </div>
          <AdapterMiniList adapters={customerModel.readyFallbacks.slice(0, 6)} />
        </article>
      </div>
    </section>
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
  model,
  runtimeReadiness
}: {
  model: AdminPanelModel;
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
  const sortedAdapters = providerCatalog
    .slice()
    .sort((first, second) => first.priority - second.priority || first.label.localeCompare(second.label));

  return (
    <section className="adaptersView">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Coverage</p>
          <h2>Adapter readiness</h2>
        </div>
        <StatusChip icon={ShieldCheck} label={`${sortedAdapters.length} adapters`} tone="green" />
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
    "MICROSOFT_TENANT_ID"
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
