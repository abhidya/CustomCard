import { ArrowRight, Download, LockKeyhole, Settings, ShieldCheck } from "lucide-react";
import { Show, SignInButton, SignUpButton, UserButton, useAuth, useUser } from "@clerk/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AdminPanelView, AdaptersView } from "../src/App";
import {
  addApprovedRelationshipMemory,
  removeApprovedRelationshipMemory,
  type CardDraftInput,
  type CardPanel,
  type LocalWorkspace,
  type VendorId
} from "../src/customerWorkflow";
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

const adminNavItems: Array<{ id: ViewId; label: string }> = [
  { id: "admin", label: "Admin" },
  { id: "adapters", label: "Adapters" }
];

const configuredAdminEmails = new Set(
  [
    import.meta.env.VITE_CUSTOMCARD_ADMIN_EMAILS as string | undefined,
    import.meta.env.VITE_CUSTOMCARD_ADMIN_EMAIL as string | undefined
  ]
    .filter(Boolean)
    .flatMap((value) => value!.split(","))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
);

function updateViewRoute(view: ViewId) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("view", view);
  url.hash = "";
  window.history.pushState({ customCardView: view }, "", url);
}

export default function App() {
  const [theme, setTheme] = useTheme();
  const adminAccess = useAdminAccess();
  const { getToken } = useAuth();
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
    printPackage,
    adminPanelModel,
    localizationSummary,
    providerGovernance,
    productionReadiness,
    readiness,
    runtimeReadiness
  } = state;

  const isAdminView = activeView === "admin" || activeView === "adapters";
  const visibleCustomerView = isAdminView || activeView === "mobile" ? "customer" : activeView;
  const displayPanels: CardPanel[] = aiDraft?.panels ?? draft.panels;
  const displayDraft = aiDraft ?? draft;
  const customerEmail = workspace?.email || authForm.email;

  const getCustomerApiToken = useCallback(async () => {
    try {
      return (await getToken()) ?? undefined;
    } catch {
      return undefined;
    }
  }, [getToken]);

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
    saveWorkspace(
      addApprovedRelationshipMemory(
        workspace,
        { name: authForm.name, email: authForm.email },
        memoryForm,
        reviewerReferenceDate
      )
    );
    setMemoryForm({ recipient: memoryForm.recipient, note: "" });
    setExportStatus("Note saved");
  }

  function deleteNote(memoryId: string) {
    if (!workspace) return;
    saveWorkspace(removeApprovedRelationshipMemory(workspace, memoryId));
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
  const designing = visibleCustomerView === "studio";
  const printing = visibleCustomerView === "handoff";

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
    <div className="shell" data-admin-view={isAdminView ? "true" : undefined}>
      <a className="skipLink" href="#main-content">
        Skip to main content
      </a>
      <header className="topbar">
        <button className="wordmark" onClick={() => openView("customer")} type="button">
          <span className="wordmark-glyph">C</span>
          <span className="wordmark-name">CustomCard</span>
        </button>
        <nav className="mainnav" aria-label="CustomCard navigation">
          {navItems.map((item) => (
            <button
              className="navlink"
              data-active={item.id === visibleCustomerView}
              key={item.id}
              onClick={() => openView(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
          {adminAccess.isAdmin ? (
            <>
              <span className="navdivider" aria-hidden="true" />
              {adminNavItems.map((item) => (
                <button
                  className="navlink navlink-admin"
                  data-active={item.id === activeView}
                  key={item.id}
                  onClick={() => openView(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </>
          ) : null}
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

      <main id="main-content">
        {isAdminView ? (
          <AdminRoute
            access={adminAccess}
            activeView={activeView}
            adminPanel={
              <AdminPanelView
                localizationSummary={localizationSummary}
                model={adminPanelModel}
                productionReadiness={productionReadiness}
                providerGovernance={providerGovernance}
                readiness={readiness}
                runtimeReadiness={runtimeReadiness}
              />
            }
            adaptersPanel={<AdaptersView runtimeReadiness={runtimeReadiness} />}
          />
        ) : null}

        {!isAdminView && visibleCustomerView === "customer" ? (
          <HomeView
            draft={displayDraft}
            hasProgress={hasProgress}
            onImport={() => openView("opportunities")}
            onOccasion={startOccasion}
            onResume={() => openView("studio")}
          />
        ) : null}

        {!isAdminView && visibleCustomerView === "opportunities" ? (
          <EventsView
            calendarConnectionStartPackets={state.calendarConnectionStartPackets}
            getCustomerApiToken={getCustomerApiToken}
            inviteText={inviteText}
            onAccept={acceptOpportunity}
            onDismiss={dismissOpportunity}
            onInviteText={setInviteText}
            opportunity={opportunity}
            signal={signal}
          />
        ) : null}

        {!isAdminView && visibleCustomerView === "studio" ? (
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

        {!isAdminView && visibleCustomerView === "memory" ? (
          <NotesView
            form={memoryForm}
            memories={memories}
            onAdd={addNote}
            onDelete={deleteNote}
            onForm={setMemoryForm}
          />
        ) : null}

        {!isAdminView && visibleCustomerView === "handoff" ? (
          <PrintView
            handoff={handoff}
            checkoutCustomerDefaults={{ name: draftInput.sender, email: customerEmail }}
            getCustomerApiToken={getCustomerApiToken}
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

      {!isAdminView ? <div className="ctadock">
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
      </div> : null}

      {toast ? <Toast message={toast} /> : null}
    </div>
  );
}

interface AdminAccess {
  isLoaded: boolean;
  isSignedIn: boolean;
  isAdmin: boolean;
  hasConfiguredEmails: boolean;
}

function useAdminAccess(): AdminAccess {
  const { isLoaded, isSignedIn, user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  const metadata = user?.publicMetadata as Record<string, unknown> | undefined;
  const role = typeof metadata?.role === "string" ? metadata.role.toLowerCase() : "";
  const roles = Array.isArray(metadata?.roles)
    ? metadata.roles.map((value) => String(value).toLowerCase())
    : [];
  const emailAllowed = email ? configuredAdminEmails.has(email) : false;
  const roleAllowed = role === "admin" || roles.includes("admin");

  return {
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    isAdmin: Boolean(isSignedIn && (emailAllowed || roleAllowed)),
    hasConfiguredEmails: configuredAdminEmails.size > 0
  };
}

function AdminRoute({
  access,
  activeView,
  adminPanel,
  adaptersPanel
}: {
  access: AdminAccess;
  activeView: ViewId;
  adminPanel: ReactNode;
  adaptersPanel: ReactNode;
}) {
  if (!access.isAdmin) {
    return <AdminGate access={access} target={activeView === "adapters" ? "Adapters" : "Admin panel"} />;
  }

  return (
    <section className="adminSurface reveal">
      <div className="adminSurfaceHead">
        <span className="adminBadge">
          {activeView === "adapters" ? <Settings size={16} /> : <ShieldCheck size={16} />}
          Admin
        </span>
        <div>
          <h1>{activeView === "adapters" ? "Adapter readiness" : "Admin panel"}</h1>
          <p>Operational views are visible only to signed-in admin users.</p>
        </div>
      </div>
      <div className="adminLegacySurface">
        {activeView === "adapters" ? adaptersPanel : adminPanel}
      </div>
    </section>
  );
}

function AdminGate({ access, target }: { access: AdminAccess; target: string }) {
  const status = !access.isLoaded
    ? "Checking account access"
    : access.isSignedIn
      ? "Admin access required"
      : "Sign in required";

  return (
    <section className="adminGate panelcard reveal" aria-label={`${target} access gate`}>
      <span className="adminGateIcon">
        <LockKeyhole size={24} />
      </span>
      <div>
        <p className="eyebrow">Private operations</p>
        <h1>{target}</h1>
        <p>
          {access.isSignedIn
            ? "This account is signed in, but it is not marked as a CustomCard admin."
            : "Sign in with a CustomCard admin account to view operational readiness and adapter controls."}
        </p>
        {!access.hasConfiguredEmails ? (
          <small>
            Admin access can be granted with Clerk public metadata role <code>admin</code> or a
            comma-separated <code>VITE_CUSTOMCARD_ADMIN_EMAILS</code> allowlist.
          </small>
        ) : null}
      </div>
      <div className="adminGateActions">
        <span>{status}</span>
        {access.isSignedIn ? (
          <UserButton />
        ) : (
          <SignInButton>
            <button className="btn btn-ink" type="button">
              Sign in
            </button>
          </SignInButton>
        )}
      </div>
    </section>
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
