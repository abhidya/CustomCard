import { ArrowRight, Download, LockKeyhole, Settings, ShieldCheck } from "lucide-react";
import { Show, SignInButton, SignUpButton, UserButton, useAuth, useUser } from "@clerk/react";
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  addApprovedRelationshipMemory,
  createLocalWorkspace,
  recordCardExport,
  removeApprovedRelationshipMemory,
  saveEventToWorkspace,
  setSavedEventStatus,
  updateCardHistoryStatus,
  type CardDraftInput,
  type CardLifecycleStatus,
  type CardOpportunity,
  type CardPanel,
  type LocalWorkspace
} from "../src/customerWorkflow";
import { buildPanelSvgExportFile } from "../src/printExport";
import { legalDocumentLinks } from "../src/legalCompliance";
import {
  initialViewFromLocation,
  reviewerReferenceDate,
  useAppState,
  type ViewId
} from "../src/appStateOrchestrator";
import {
  buildHandoffChecklistText,
  type ArchiveEntry,
  copyHandoffChecklist,
  downloadArchiveEntries,
  downloadExportArchive,
  downloadPrintPackageArchive,
  postCustomerMutation,
  useDraftAutosave
} from "./customerShellCommands";
import { buildDraftProgressState } from "./draftProgress";
import { jpegDataUrlToBytes, panelToJpegBase64 } from "./panelMediaAdapter";
import { buildProofSignature } from "./proofApproval";
import {
  adminNavItems,
  canEnterAdminSurface,
  customerNavItems,
  getAdminAccessStatus,
  getAdminSurfaceHeading,
  getAdminTargetLabel,
  isAdminRoute,
  isBusinessRoute,
  resolveActiveCustomerNavView,
  resolveVisibleCustomerView,
  shouldRenderCustomerNav,
  shouldShowCustomerCta,
  shouldShowTopNav,
  type AdminAccessPolicy
} from "./routePolicy";
import { themes, useTheme } from "./theme";
import { Toast } from "./ui";
import { BusinessLandingView } from "./views/BusinessLandingView";
import { EventsView } from "./views/EventsView";
import { HomeView } from "./views/HomeView";
import { NotesView } from "./views/NotesView";
import { PeopleView } from "./views/PeopleView";
import { PrintView } from "./views/PrintView";
import { SettingsView } from "./views/SettingsView";
import { StudioView } from "./views/StudioView";

const AdminOperationalView = lazy(() => import("./AdminOperationalView"));

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
  const { isLoaded, isSignedIn, user } = useUser();
  const state = useAppState(getToken);
  const {
    activeView,
    setActiveView,
    workspace,
    setWorkspace,
    inviteText,
    setInviteText,
    opportunityDecision,
    setOpportunityDecision,
    vendorId,
    setVendorId,
    localeCode,
    setLocaleCode,
    memoryForm,
    setMemoryForm,
    exportStatus,
    setExportStatus,
    draftInput,
    setDraftInput,
    aiFlowConfigs,
    setAiFlowConfigs,
    aiFlowSummary,
    aiDraft,
    aiStale,
    keepAiArtwork,
    aiCardGenLoading,
    aiCardGenStatus,
    aiGenerationJobs,
    triggerAiCardGen,
    cardGenAvailable,
    memories,
    signal,
    pricingComparison,
    opportunity,
    draft,
    activeDraft,
    panelOverrides,
    updatePanelOverride,
    revertPanelOverride,
    validation,
    handoff,
    printPackage
  } = state;

  const isAdminView = isAdminRoute(activeView);
  const isBusinessView = isBusinessRoute(activeView);
  const visibleCustomerView = resolveVisibleCustomerView(activeView);
  const visibleNavView = resolveActiveCustomerNavView(activeView);
  const renderCustomerNav = shouldRenderCustomerNav(useViewportWidth());
  const displayPanels: CardPanel[] = activeDraft.panels;
  const displayDraft = activeDraft;
  const proofSignature = useMemo(() => buildProofSignature(displayDraft), [displayDraft]);
  const customerEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const customerIdentity = useMemo(
    () => ({
      name: user?.fullName || draftInput.sender || "CustomCard customer",
      email: customerEmail
    }),
    [customerEmail, draftInput.sender, user?.fullName]
  );
  const checkoutProfile = {
    // Blank when we only have the placeholder default, so the form shows real placeholders.
    name: user?.fullName ?? (draftInput.sender === "Local User" ? "" : draftInput.sender),
    firstName: user?.firstName ?? undefined,
    lastName: user?.lastName ?? undefined,
    email: customerEmail,
    phone: user?.primaryPhoneNumber?.phoneNumber ?? user?.phoneNumbers?.[0]?.phoneNumber ?? ""
  };

  const getCustomerApiToken = useCallback(async () => {
    try {
      return (await getToken()) ?? undefined;
    } catch {
      return undefined;
    }
  }, [getToken]);

  useDraftAutosave({
    draftInput,
    enabled: Boolean(isLoaded && isSignedIn),
    getToken,
    localeCode,
    opportunityDecision,
    opportunityId: opportunity.id,
    setDraftInput,
    setLocaleCode,
    setOpportunityDecision,
    setVendorId,
    validationPassed: validation.passed,
    vendorId
  });

  /* ---------- navigation ---------- */
  function openView(view: ViewId) {
    setActiveView(view);
    if (initialViewFromLocation() !== view) updateViewRoute(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- workspace + notes ---------- */
  function saveWorkspace(next: LocalWorkspace | undefined) {
    setWorkspace(next);
  }

  function addNote(saveToAccount: boolean) {
    const nextWorkspace = addApprovedRelationshipMemory(
      workspace,
      customerIdentity,
      memoryForm,
      reviewerReferenceDate
    );
    saveWorkspace(nextWorkspace);
    if (isSignedIn && saveToAccount) {
      setExportStatus("Note saving");
      void postCustomerMutation(getToken, "/api/memories/review", {
          recipientName: memoryForm.recipient,
          text: memoryForm.note,
          decision: "approve"
        })
        .then(() => setExportStatus("Note saved"))
        .catch(() => setExportStatus("Note saved locally; sync failed"));
    } else {
      setExportStatus(saveToAccount ? "Note saved" : "Saved for your next card only");
    }
    setMemoryForm({ recipient: memoryForm.recipient, note: "" });
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

  function ensureWorkspace(): LocalWorkspace {
    return workspace ?? createLocalWorkspace(customerIdentity.name, customerIdentity.email || "local@customcard.local");
  }

  /** Moments-inbox decisions from real imported calendar opportunities. */
  function handleMomentDecision(
    moment: { opportunityId: string; recipientName: string; title: string; startsAt: string },
    decision: "make-card" | "snooze" | "dismiss" | "handled"
  ) {
    const savedOpportunity: CardOpportunity = {
      ...opportunity,
      id: moment.opportunityId,
      title: moment.title,
      recipient: moment.recipientName || opportunity.recipient,
      dateLabel: moment.startsAt ? moment.startsAt.slice(0, 10) : "Date needed"
    };
    const base = saveEventToWorkspace(ensureWorkspace(), savedOpportunity, moment.startsAt ? moment.startsAt.slice(0, 10) : undefined);
    if (decision === "make-card") {
      saveWorkspace(base);
      setDraftInput((current) => ({
        ...current,
        recipient: moment.recipientName || current.recipient,
        occasion: moment.title || current.occasion
      }));
      openView("studio");
      return;
    }
    const status = decision === "snooze" ? "snoozed" : "dismissed";
    saveWorkspace(setSavedEventStatus(base, moment.opportunityId, status));
    setExportStatus(
      decision === "snooze" ? "Moment snoozed" : decision === "handled" ? "Marked as handled" : "Moment dismissed"
    );
  }

  /** Real card lifecycle events: proof approval, Walgreens checkout, downloads. */
  function handleCardEvent(status: CardLifecycleStatus) {
    const base = ensureWorkspace();
    const existing = (base.cardHistory ?? []).some((entry) => entry.id === displayDraft.id);
    saveWorkspace(
      existing
        ? updateCardHistoryStatus(base, displayDraft.id, status)
        : recordCardExport(base, displayDraft, new Date(), status)
    );
  }

  /* ---------- downloads ---------- */
  async function downloadPrintPackage() {
    setExportStatus("Preparing print package");
    const checklistEntry = buildManualUploadChecklistEntry(displayDraft.id, buildHandoffChecklistText(handoff));

    try {
      const uploadEntries = await buildUploadPanelImageEntries(displayPanels);
      downloadPrintPackageArchive(printPackage, [...uploadEntries, checklistEntry]);
      setExportStatus("Print package saved");
    } catch {
      downloadPrintPackageArchive(printPackage, [checklistEntry]);
      setExportStatus("Print package saved; upload panels need browser rendering");
    }
    handleCardEvent("downloaded");
  }

  async function downloadPanels() {
    setExportStatus("Preparing upload panels");

    try {
      const uploadEntries = await buildUploadPanelImageEntries(displayPanels);
      downloadArchiveEntries(uploadEntries, `${displayDraft.id}-walgreens-upload-panels.zip`);
      setExportStatus("Upload panels saved");
    } catch {
      downloadExportArchive(
        displayPanels.map((panel) => buildPanelSvgExportFile(panel, displayDraft.id)),
        `${displayDraft.id}-source-panels.zip`
      );
      setExportStatus("Source panels saved");
    }
    handleCardEvent("downloaded");
  }

  async function copyChecklist() {
    const result = await copyHandoffChecklist(handoff);
    setExportStatus(result === "copied" ? "Checklist copied" : "Couldn't reach the clipboard");
  }

  /* ---------- toast ---------- */
  const [toast, setToast] = useState<string | null>(null);
  const previousStatus = useRef(exportStatus);
  useEffect(() => {
    if (previousStatus.current === exportStatus) {
      return;
    }
    previousStatus.current = exportStatus;
    setToast(exportStatus);
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [exportStatus]);

  useEffect(() => {
    setVendorId("walgreens");
  }, [setVendorId]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const calendarConnection = url.searchParams.get("calendarConnection");
    if (!calendarConnection) return;
    const imported = url.searchParams.get("calendarImported");
    const error = url.searchParams.get("calendarError");
    setExportStatus(
      calendarConnection === "connected"
        ? `Google Calendar connected${imported ? ` · ${imported} event${imported === "1" ? "" : "s"} imported` : ""}`
        : error || "Google Calendar connection failed"
    );
    if (calendarConnection === "connected") {
      const importedCount = imported ? Number(imported) : 0;
      if (importedCount > 0) {
        setInviteText(
          [
            "Google Calendar import review",
            `${importedCount} Google Calendar event${importedCount === 1 ? "" : "s"} imported as read-only event metadata.`
          ].join("\n")
        );
      }
      setOpportunityDecision("pending");
      setActiveView("opportunities");
      url.searchParams.set("view", "opportunities");
    }
    url.searchParams.delete("calendarConnection");
    url.searchParams.delete("calendarImported");
    url.searchParams.delete("calendarError");
    window.history.replaceState({ customCardView: calendarConnection === "connected" ? "opportunities" : initialViewFromLocation() }, "", url);
  }, [setActiveView, setExportStatus, setOpportunityDecision]);

  /* ---------- live CTA ---------- */
  const estimate = pricingComparison.selectedVendorOptions.find((option) => option.observation.vendorId === "walgreens");
  const priceLabel = estimate?.effectiveSubtotalLabel;
  const designing = visibleCustomerView === "studio";
  const printing = visibleCustomerView === "handoff";

  const cta = printing
    ? {
        label: "Save print package",
        icon: <Download size={16} />,
        disabled: !printPackage.manifest.passed,
        meta: priceLabel ? `est. ${priceLabel} at Walgreens` : "Walgreens confirms price at checkout",
        metaTitle: validation.passed ? "Your card is print-ready" : "Almost ready",
        onClick: downloadPrintPackage
      }
    : designing
      ? {
          label: "Review print proof",
          icon: <ArrowRight size={16} />,
          disabled: false,
          meta: priceLabel ? `est. ${priceLabel} at Walgreens · same-day pickup` : "Print at Walgreens",
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

  const draftProgress = buildDraftProgressState(draftInput, validation.passed);
  const hasProgress = draftProgress.hasMeaningfulProgress || inviteText.trim().length > 0;
  const showTopNav = shouldShowTopNav({
    hasCustomerNavItems: customerNavItems.length > 0,
    isAdmin: adminAccess.isAdmin,
    renderCustomerNav
  });

  const showBottomNav = !renderCustomerNav && !isAdminView;

  return (
    <div
      className="shell"
      data-admin-view={isAdminView ? "true" : undefined}
      data-bottomnav={showBottomNav ? "true" : undefined}
    >
      <a className="skipLink" href="#main-content">
        Skip to main content
      </a>
      <header className="topbar">
        <button className="wordmark" onClick={() => openView("customer")} type="button">
          <img alt="" aria-hidden="true" className="wordmark-glyph wordmark-logo" src="/icon-192.png" />
          <span className="wordmark-name">CustomCard</span>
        </button>
        {showTopNav ? (
          <nav className="mainnav" aria-label="CustomCard navigation">
            {customerNavItems.map((item) => (
              <button
                className="navlink"
                data-active={item.id === visibleNavView}
                key={item.id}
                onClick={() => openView(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
            {adminAccess.isAdmin ? (
              <>
                {customerNavItems.length > 0 ? <span className="navdivider" aria-hidden="true" /> : null}
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
        ) : null}
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
              <AdminLazyPanel>
                <AdminOperationalView
                  activeView={activeView}
                  aiFlowConfigs={aiFlowConfigs}
                  aiGenerationJobs={aiGenerationJobs}
                  aiFlowSummary={aiFlowSummary}
                  getAdminApiToken={getCustomerApiToken}
                  onAiFlowConfigsChange={setAiFlowConfigs}
                />
              </AdminLazyPanel>
            }
            adaptersPanel={
              <AdminLazyPanel>
                <AdminOperationalView
                  activeView={activeView}
                  aiFlowConfigs={aiFlowConfigs}
                  aiGenerationJobs={aiGenerationJobs}
                  aiFlowSummary={aiFlowSummary}
                  getAdminApiToken={getCustomerApiToken}
                  onAiFlowConfigsChange={setAiFlowConfigs}
                />
              </AdminLazyPanel>
            }
            legalPanel={
              <AdminLazyPanel>
                <AdminOperationalView
                  activeView={activeView}
                  aiFlowConfigs={aiFlowConfigs}
                  aiGenerationJobs={aiGenerationJobs}
                  aiFlowSummary={aiFlowSummary}
                  getAdminApiToken={getCustomerApiToken}
                  onAiFlowConfigsChange={setAiFlowConfigs}
                />
              </AdminLazyPanel>
            }
          />
        ) : null}

        {!isAdminView && !isBusinessView && visibleCustomerView === "customer" ? (
          <HomeView
            draft={displayDraft}
            hasProgress={hasProgress}
            importProps={{
              calendarConnectionStartPackets: state.calendarConnectionStartPackets,
              getCustomerApiToken,
              inviteText,
              isSignedIn: Boolean(isSignedIn),
              onAccept: acceptOpportunity,
              onDismiss: dismissOpportunity,
              onInviteText: setInviteText,
              onMomentDecision: handleMomentDecision,
              opportunity,
              signal
            }}
            onCreate={() => openView("studio")}
            onFindMoments={() => openView("opportunities")}
            onOccasion={startOccasion}
            onResume={() => openView("studio")}
          />
        ) : null}

        {!isAdminView && isBusinessView ? (
          <BusinessLandingView
            draft={displayDraft}
            onCreate={() => openView("studio")}
            onReview={() => openView("opportunities")}
          />
        ) : null}

        {!isAdminView && visibleCustomerView === "opportunities" ? (
          <EventsView
            calendarConnectionStartPackets={state.calendarConnectionStartPackets}
            getCustomerApiToken={getCustomerApiToken}
            inviteText={inviteText}
            isSignedIn={Boolean(isSignedIn)}
            onAccept={acceptOpportunity}
            onDismiss={dismissOpportunity}
            onInviteText={setInviteText}
            onMomentDecision={handleMomentDecision}
            opportunity={opportunity}
            signal={signal}
          />
        ) : null}

        {!isAdminView && visibleCustomerView === "studio" ? (
          <StudioView
            aiActive={aiDraft !== null}
            aiAvailable={cardGenAvailable}
            aiLoading={aiCardGenLoading}
            aiPanelProgress={state.aiPanelGenerationProgress}
            aiStale={aiStale}
            aiStatus={aiCardGenStatus}
            aiRequiresSignIn={!isSignedIn}
            draft={displayDraft}
            draftInput={draftInput}
            memories={memories}
            onAddNote={() => openView("people")}
            onField={updateDraft}
            onGenerateAi={triggerAiCardGen}
            onKeepArtwork={keepAiArtwork}
            onPanelEdit={updatePanelOverride}
            onPanelRevert={revertPanelOverride}
            panelOverrides={panelOverrides}
            printFitPassed={validation.passed}
          />
        ) : null}

        {!isAdminView && visibleCustomerView === "memory" ? (
          <NotesView
            draft={displayDraft}
            draftStatus={draftProgress.status}
            hasProgress={draftProgress.hasMeaningfulProgress}
            history={workspace?.cardHistory ?? []}
            isSignedIn={Boolean(isSignedIn)}
            onMakeAnother={(recipient) => {
              updateDraft("recipient", recipient);
              openView("studio");
            }}
            onResume={() => openView("studio")}
            onReviewProof={() => openView("handoff")}
            onStartCard={() => openView("customer")}
          />
        ) : null}

        {!isAdminView && visibleCustomerView === "people" ? (
          <PeopleView
            form={memoryForm}
            history={workspace?.cardHistory ?? []}
            isSignedIn={Boolean(isSignedIn)}
            memories={memories}
            onAdd={addNote}
            onDelete={deleteNote}
            onForm={setMemoryForm}
            onMakeCard={(recipient) => {
              updateDraft("recipient", recipient);
              openView("studio");
            }}
          />
        ) : null}

        {!isAdminView && visibleCustomerView === "settings" ? (
          <SettingsView
            getToken={getToken}
            isSignedIn={Boolean(isSignedIn)}
            userEmail={customerEmail}
            userName={user?.fullName ?? ""}
          />
        ) : null}

        {!isAdminView && visibleCustomerView === "handoff" ? (
          <PrintView
            checkoutCustomerDefaults={checkoutProfile}
            getCustomerApiToken={getCustomerApiToken}
            onCardEvent={handleCardEvent}
            onCopyChecklist={copyChecklist}
            onDownloadPackage={downloadPrintPackage}
            onDownloadPanels={downloadPanels}
            manualUploadSteps={handoff.checklist}
            panels={displayPanels}
            pricingComparison={pricingComparison}
            printPackage={printPackage}
            proofSignature={proofSignature}
          />
        ) : null}
      </main>

      <AppFooter />

      {shouldShowCustomerCta(activeView) ? <div className="ctadock">
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

      {showBottomNav ? (
        <nav aria-label="CustomCard quick navigation" className="bottomnav">
          {customerNavItems.map((item) => (
            <button
              className="bottomnav-link"
              data-active={item.id === visibleNavView}
              key={item.id}
              onClick={() => openView(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
      ) : null}

      {toast ? <Toast message={toast} /> : null}
    </div>
  );
}

async function buildUploadPanelImageEntries(panels: CardPanel[]): Promise<ArchiveEntry[]> {
  return Promise.all(
    panels.map(async (panel, index) => {
      const imageDataUrl = await panelToJpegBase64(panel);
      return {
        path: `upload-jpg/${String(index + 1).padStart(2, "0")}-${panel.id}.jpg`,
        bytes: jpegDataUrlToBytes(imageDataUrl)
      };
    })
  );
}

function buildManualUploadChecklistEntry(draftId: string, checklistText: string): ArchiveEntry {
  return {
    path: `${draftId}-manual-upload-steps.txt`,
    bytes: checklistText
  };
}

function useViewportWidth(): number | undefined {
  const [viewportWidth, setViewportWidth] = useState<number | undefined>(() =>
    typeof window === "undefined" ? undefined : window.innerWidth
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncViewportWidth = () => setViewportWidth(window.innerWidth);
    syncViewportWidth();
    window.addEventListener("resize", syncViewportWidth);
    return () => window.removeEventListener("resize", syncViewportWidth);
  }, []);

  return viewportWidth;
}

interface AdminAccess extends AdminAccessPolicy {
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
  adaptersPanel,
  legalPanel
}: {
  access: AdminAccess;
  activeView: ViewId;
  adminPanel: ReactNode;
  adaptersPanel: ReactNode;
  legalPanel: ReactNode;
}) {
  if (!canEnterAdminSurface(access)) {
    return <AdminGate access={access} target={getAdminTargetLabel(activeView)} />;
  }
  const heading = getAdminSurfaceHeading(activeView);

  return (
    <section className="adminSurface reveal">
      <div className="adminSurfaceHead">
        <span className="adminBadge">
          {activeView === "adapters" ? <Settings size={16} /> : <ShieldCheck size={16} />}
          Staff/Admin preview
        </span>
        <div>
          <h1>{heading}</h1>
          <p>Operational views are visible only to signed-in admin users.</p>
        </div>
      </div>
      <div className="adminLegacySurface">
        {activeView === "adapters" ? adaptersPanel : activeView === "legal" ? legalPanel : adminPanel}
      </div>
    </section>
  );
}

function AdminLazyPanel({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="panelcard">Loading admin view...</div>}>
      {children}
    </Suspense>
  );
}

function AppFooter() {
  return (
    <footer className="appFooter" aria-label="Legal documents">
      <nav aria-label="Legal document links">
        {legalDocumentLinks.map((link) => (
          <a href={link.path} key={link.id}>
            {link.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}

function AdminGate({ access, target }: { access: AdminAccess; target: string }) {
  const status = getAdminAccessStatus(access);

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
