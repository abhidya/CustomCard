import { ArrowRight, Download } from "lucide-react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/react";
import { useEffect, useRef, useState } from "react";
import {
  addMemory,
  createLocalWorkspace,
  removeMemory,
  type CardDraftInput,
  type CardPanel,
  type LocalWorkspace,
  type VendorId
} from "../src/freeMvp";
import { buildPanelSvgExportFile, type PrintExportFile } from "../src/printExport";
import {
  initialViewFromLocation,
  reviewerReferenceDate,
  reviewerWorkspaceKey,
  useAppState,
  type ViewId
} from "../src/appStateOrchestrator";
import { themes, useTheme } from "./theme";
import { Toast } from "./ui";
import { EventsView } from "./views/EventsView";
import { HomeView } from "./views/HomeView";
import { NotesView } from "./views/NotesView";
import { PrintView } from "./views/PrintView";
import { StudioView } from "./views/StudioView";

const navItems: Array<{ id: ViewId; label: string }> = [
  { id: "customer", label: "Create" },
  { id: "opportunities", label: "Occasions" },
  { id: "memory", label: "Notes" },
  { id: "handoff", label: "Print" }
];

function updateViewRoute(view: ViewId) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("view", view);
  url.hash = "";
  window.history.pushState({ customCardView: view }, "", url);
}

export default function App() {
  const [theme, setTheme] = useTheme();
  const state = useAppState();
  const {
    activeView,
    setActiveView,
    workspace,
    setWorkspace,
    authForm,
    inviteText,
    setInviteText,
    setOpportunityDecision,
    vendorId,
    setVendorId,
    memoryForm,
    setMemoryForm,
    exportStatus,
    setExportStatus,
    draftInput,
    setDraftInput,
    aiDraft,
    aiCardGenLoading,
    triggerAiCardGen,
    cardGenAvailable,
    memories,
    signal,
    pricingComparison,
    opportunity,
    draft,
    validation,
    handoff,
    printPackage
  } = state;

  const displayPanels: CardPanel[] = aiDraft?.panels ?? draft.panels;
  const displayDraft = aiDraft ?? draft;

  /* ---------- navigation ---------- */
  function openView(view: ViewId) {
    setActiveView(view);
    if (initialViewFromLocation() !== view) updateViewRoute(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- workspace + notes ---------- */
  function saveWorkspace(next: LocalWorkspace | undefined) {
    setWorkspace(next);
    if (!next) {
      localStorage.removeItem(reviewerWorkspaceKey);
      return;
    }
    localStorage.setItem(reviewerWorkspaceKey, JSON.stringify(next));
  }

  function addNote() {
    const base = workspace ?? createLocalWorkspace(authForm.name, authForm.email, reviewerReferenceDate);
    saveWorkspace(addMemory(base, memoryForm.recipient, memoryForm.note, reviewerReferenceDate));
    setMemoryForm({ recipient: memoryForm.recipient, note: "" });
    setExportStatus("Note saved");
  }

  function deleteNote(memoryId: string) {
    if (!workspace) return;
    saveWorkspace(removeMemory(workspace, memoryId));
    setExportStatus("Note removed");
  }

  /* ---------- card draft ---------- */
  function updateDraft<K extends keyof CardDraftInput>(field: K, value: CardDraftInput[K]) {
    setDraftInput((current) => ({ ...current, [field]: value }));
  }

  function startOccasion(occasion: string) {
    setDraftInput((current) => ({ ...current, occasion }));
    openView("studio");
  }

  function acceptOpportunity() {
    setOpportunityDecision("accepted");
    openView("studio");
  }

  function dismissOpportunity() {
    setOpportunityDecision("dismissed");
    setInviteText("");
  }

  /* ---------- downloads ---------- */
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

  function downloadPrintPackage() {
    printPackage.files.forEach((file, index) => {
      window.setTimeout(() => downloadExportFile(file), index * 80);
    });
    setExportStatus("Print package downloading");
  }

  function downloadPanels() {
    displayPanels.forEach((panel, index) => {
      window.setTimeout(() => downloadExportFile(buildPanelSvgExportFile(panel, displayDraft.id)), index * 80);
    });
    setExportStatus("Card panels downloading");
  }

  async function copyChecklist() {
    const text = [
      `${handoff.vendorName} print checklist`,
      ...handoff.checklist.map((item, index) => `${index + 1}. ${item}`)
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setExportStatus("Checklist copied");
    } catch {
      setExportStatus("Couldn't reach the clipboard");
    }
  }

  /* ---------- toast ---------- */
  const [toast, setToast] = useState<string | null>(null);
  const firstStatus = useRef(true);
  useEffect(() => {
    if (firstStatus.current) {
      firstStatus.current = false;
      return;
    }
    setToast(exportStatus);
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [exportStatus]);

  /* ---------- live CTA ---------- */
  const estimate = pricingComparison.selectedVendorOptions[0];
  const priceLabel = estimate?.effectiveSubtotalLabel;
  const designing = activeView === "studio";
  const printing = activeView === "handoff";

  const cta = printing
    ? {
        label: "Download print package",
        icon: <Download size={16} />,
        disabled: !printPackage.manifest.passed,
        meta: priceLabel ? `est. ${priceLabel} at ${handoff.vendorName}` : `Quote at ${handoff.vendorName}`,
        metaTitle: validation.passed ? "Your card is print-ready" : "Almost ready",
        onClick: downloadPrintPackage
      }
    : designing
      ? {
          label: "Continue to print",
          icon: <ArrowRight size={16} />,
          disabled: false,
          meta: priceLabel ? `est. ${priceLabel} at ${handoff.vendorName} · same-day pickup` : "Compare print shops",
          metaTitle: `Card for ${draftInput.recipient === "Someone important" ? "someone special" : draftInput.recipient}`,
          onClick: () => openView("handoff")
        }
      : {
          label: "Design your card",
          icon: <ArrowRight size={16} />,
          disabled: false,
          meta: `${draftInput.occasion === "card" ? "Any occasion" : draftInput.occasion} · to ${
            draftInput.recipient === "Someone important" ? "someone special" : draftInput.recipient
          }`,
          metaTitle: "Card in progress",
          onClick: () => openView("studio")
        };

  const hasProgress =
    draftInput.recipient !== "Someone important" ||
    draftInput.personalNote !== "Mention their shared patience, humor, and the little rituals that made the year feel full." ||
    inviteText.trim().length > 0;

  return (
    <div className="shell">
      <header className="topbar">
        <button className="wordmark" onClick={() => openView("customer")} type="button">
          <span className="wordmark-glyph">C</span>
          <span className="wordmark-name">CustomCard</span>
        </button>
        <nav className="mainnav">
          {navItems.map((item) => (
            <button
              className="navlink"
              data-active={
                item.id === activeView || (item.id === "customer" && activeView === "studio" && false)
              }
              key={item.id}
              onClick={() => openView(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="topbar-side">
          <ClerkAuthControls />
          <div className="themeswitch" role="group" aria-label="Theme">
            {themes.map((candidate) => (
              <button
                aria-label={candidate.label}
                className={`themedot themedot-${candidate.id}`}
                data-on={candidate.id === theme}
                key={candidate.id}
                onClick={() => setTheme(candidate.id)}
                title={candidate.label}
                type="button"
              />
            ))}
          </div>
        </div>
      </header>

      <main>
        {activeView === "customer" ? (
          <HomeView
            draft={displayDraft}
            hasProgress={hasProgress}
            onImport={() => openView("opportunities")}
            onOccasion={startOccasion}
            onResume={() => openView("studio")}
          />
        ) : null}

        {activeView === "opportunities" ? (
          <EventsView
            inviteText={inviteText}
            onAccept={acceptOpportunity}
            onDismiss={dismissOpportunity}
            onInviteText={setInviteText}
            opportunity={opportunity}
            signal={signal}
          />
        ) : null}

        {activeView === "studio" ? (
          <StudioView
            aiActive={aiDraft !== null}
            aiAvailable={cardGenAvailable}
            aiLoading={aiCardGenLoading}
            draft={displayDraft}
            draftInput={draftInput}
            memories={memories}
            onField={updateDraft}
            onGenerateAi={triggerAiCardGen}
          />
        ) : null}

        {activeView === "memory" ? (
          <NotesView
            form={memoryForm}
            memories={memories}
            onAdd={addNote}
            onDelete={deleteNote}
            onForm={setMemoryForm}
          />
        ) : null}

        {activeView === "handoff" ? (
          <PrintView
            handoff={handoff}
            onCopyChecklist={copyChecklist}
            onDownloadPackage={downloadPrintPackage}
            onDownloadPanels={downloadPanels}
            onVendor={(value: VendorId) => setVendorId(value)}
            panels={displayPanels}
            pricingComparison={pricingComparison}
            printPackage={printPackage}
            vendorId={vendorId}
          />
        ) : null}
      </main>

      <div className="ctadock">
        <span className="ctadock-progress" aria-hidden="true">
          <i data-done={true} data-now={!designing && !printing} />
          <i data-done={designing || printing} data-now={designing} />
          <i data-done={printing && printPackage.manifest.passed} data-now={printing} />
        </span>
        <span className="ctadock-meta">
          <strong>{cta.metaTitle}</strong>
          <small>{cta.meta}</small>
        </span>
        <button className="btn btn-primary" disabled={cta.disabled} onClick={cta.onClick} type="button">
          {cta.label}
          {cta.icon}
        </button>
      </div>

      {toast ? <Toast message={toast} /> : null}
    </div>
  );
}

function ClerkAuthControls() {
  return (
    <div className="clerk-auth" aria-label="Account">
      <Show when="signed-out">
        <SignInButton>
          <button className="btn btn-ghost btn-sm" type="button">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton>
          <button className="btn btn-ink btn-sm" type="button">
            Sign up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  );
}
