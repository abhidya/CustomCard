import {
  Calendar,
  Check,
  CircleCheck,
  ClipboardCheck,
  Download,
  FileDown,
  Heart,
  KeyRound,
  Lock,
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
  buildPanelSvg,
  buildVendorHandoff,
  createLocalWorkspace,
  defaultMemories,
  exportFileName,
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

type ViewId = "opportunities" | "studio" | "memory" | "handoff" | "adapters";
type OpportunityDecision = "pending" | "accepted" | "snoozed" | "dismissed";

interface NavItem {
  id: ViewId;
  label: string;
  icon: LucideIcon;
}

const workspaceKey = "customcard-free-workspace-v1";
const fixedReviewDate = new Date("2026-06-03T12:00:00.000Z");

const navItems: NavItem[] = [
  { id: "opportunities", label: "Opportunities", icon: Calendar },
  { id: "studio", label: "Card studio", icon: WandSparkles },
  { id: "memory", label: "Memory", icon: Heart },
  { id: "handoff", label: "Handoff", icon: Printer },
  { id: "adapters", label: "Adapters", icon: Settings }
];

const tones: Tone[] = ["warm", "playful", "elegant", "reverent"];
const styles: VisualStyle[] = ["botanical", "bold-type", "photo-note", "minimal"];
const languages: LanguageChoice[] = ["English", "Spanish", "Urdu", "Arabic"];
const vendors: VendorId[] = ["walgreens", "cvs", "fedex", "local-print-shop"];

const adapterRows = [
  { label: "Local demo auth", status: "Ready", detail: "Browser workspace with localStorage only." },
  { label: "ICS / invite paste", status: "Ready", detail: "Manual import path; no mailbox credentials." },
  { label: "Relationship memory", status: "Ready", detail: "User-approved local memories with delete controls." },
  { label: "Card generation", status: "Ready", detail: "Deterministic templates; no paid model call." },
  { label: "SVG export", status: "Ready", detail: "Browser-generated 1500 x 2100 panel files." },
  { label: "Manual vendor handoff", status: "Ready", detail: "Walgreens, CVS, FedEx, or local print shop checklist." },
  { label: "Gmail / Google Calendar OAuth", status: "Blocked", detail: "Production OAuth is not implemented." },
  { label: "Outlook / iCloud OAuth", status: "Blocked", detail: "Provider adapters remain contract-only." },
  { label: "Live quote / payment / order APIs", status: "Blocked", detail: "Real orders stay disabled until certification." }
];

function App() {
  const [activeView, setActiveView] = useState<ViewId>("opportunities");
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
    const blob = new Blob([buildPanelSvg(panel)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFileName(panel, draft.id);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportStatus(`${panel.label} SVG downloaded`);
  }

  function downloadAllPanels() {
    draft.panels.forEach((panel, index) => {
      window.setTimeout(() => downloadPanel(panel), index * 80);
    });
    setExportStatus("SVG panel downloads queued");
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

      <main className="appMain">
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
            onVendor={setVendorId}
            panels={draft.panels}
            validation={validation}
            vendorId={vendorId}
          />
        )}

        {activeView === "adapters" && <AdaptersView />}
      </main>
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
  onVendor,
  panels,
  validation,
  vendorId
}: {
  exportStatus: string;
  handoff: VendorHandoff;
  onCopyChecklist: () => void;
  onDownloadAll: () => void;
  onDownloadPanel: (panel: CardPanel) => void;
  onVendor: (vendorId: VendorId) => void;
  panels: CardPanel[];
  validation: CardValidation;
  vendorId: VendorId;
}) {
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
          <button className="quietButton" type="button" onClick={onCopyChecklist}>
            <ClipboardCheck size={16} />
            Copy checklist
          </button>
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
      </div>
    </section>
  );
}

function AdaptersView() {
  return (
    <section className="adaptersView">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Coverage</p>
          <h2>Adapter readiness</h2>
        </div>
        <StatusChip icon={ShieldCheck} label="Free-only boundary" tone="green" />
      </div>

      <div className="adapterMatrix">
        {adapterRows.map((row) => (
          <article className={row.status === "Ready" ? "adapterRow ready" : "adapterRow blocked"} key={row.label}>
            {row.status === "Ready" ? <CircleCheck size={19} /> : <XCircle size={19} />}
            <div>
              <strong>{row.label}</strong>
              <span>{row.detail}</span>
            </div>
            <em>{row.status}</em>
          </article>
        ))}
      </div>
    </section>
  );
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

function decisionLabel(decision: OpportunityDecision): string {
  const labels: Record<OpportunityDecision, string> = {
    pending: "Awaiting user decision",
    accepted: "Approved for card generation",
    snoozed: "Snoozed locally",
    dismissed: "Dismissed locally"
  };
  return labels[decision];
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
