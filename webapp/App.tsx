import { ArrowRight, Download, LockKeyhole, Settings, ShieldCheck } from "lucide-react";
import { Show, SignInButton, SignUpButton, UserButton, useAuth, useUser } from "@clerk/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AdminPanelView, AdaptersView } from "../src/App";
import {
  addApprovedRelationshipMemory,
  removeApprovedRelationshipMemory,
  type CardDraftInput,
  type CardPanel,
  type LocalWorkspace,
  type OpportunityDecision,
  type VendorId
} from "../src/customerWorkflow";
import { buildPanelSvgExportFile, type PrintExportFile } from "../src/printExport";
import {
  initialViewFromLocation,
  reviewerReferenceDate,
  useAppState,
  type ViewId
} from "../src/appStateOrchestrator";
import type { SupportedLocaleCode } from "../src/localization";
import { buildDraftProgressState } from "./draftProgress";
import {
  adminNavItems,
  canEnterAdminSurface,
  customerNavItems,
  getAdminAccessStatus,
  getAdminSurfaceHeading,
  getAdminTargetLabel,
  isAdminRoute,
  isBusinessRoute,
  isLegalRoute,
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
import { LegalView } from "./views/LegalView";
import { NotesView } from "./views/NotesView";
import { PrintView } from "./views/PrintView";
import { StudioView } from "./views/StudioView";

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
  const state = useAppState();
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

  const isAdminView = isAdminRoute(activeView);
  const isLegalView = isLegalRoute(activeView);
  const isBusinessView = isBusinessRoute(activeView);
  const visibleCustomerView = resolveVisibleCustomerView(activeView);
  const visibleNavView = resolveActiveCustomerNavView(activeView);
  const renderCustomerNav = shouldRenderCustomerNav(useViewportWidth());
  const displayPanels: CardPanel[] = aiDraft?.panels ?? draft.panels;
  const displayDraft = aiDraft ?? draft;
  const customerEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const customerIdentity = useMemo(
    () => ({
      name: user?.fullName || draftInput.sender || "CustomCard customer",
      email: customerEmail
    }),
    [customerEmail, draftInput.sender, user?.fullName]
  );
  const checkoutProfile = {
    name: customerIdentity.name,
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

  function addNote() {
    const nextWorkspace = addApprovedRelationshipMemory(
      workspace,
      customerIdentity,
      memoryForm,
      reviewerReferenceDate
    );
    saveWorkspace(nextWorkspace);
    if (isSignedIn) {
      void postCustomerMutation(getToken, "/api/memories/review", {
        recipientName: memoryForm.recipient,
        text: memoryForm.note,
        decision: "approve"
      });
    }
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
    url.searchParams.delete("calendarConnection");
    url.searchParams.delete("calendarImported");
    url.searchParams.delete("calendarError");
    window.history.replaceState({ customCardView: initialViewFromLocation() }, "", url);
  }, [setExportStatus]);

  /* ---------- live CTA ---------- */
  const estimate = pricingComparison.selectedVendorOptions.find((option) => option.observation.vendorId === "walgreens");
  const priceLabel = estimate?.effectiveSubtotalLabel;
  const designing = visibleCustomerView === "studio";
  const printing = visibleCustomerView === "handoff";

  const cta = printing
    ? {
        label: "Save card files",
        icon: <Download size={16} />,
        disabled: !printPackage.manifest.passed,
        meta: priceLabel ? `est. ${priceLabel} at Walgreens` : "Walgreens confirms price at checkout",
        metaTitle: validation.passed ? "Your card is print-ready" : "Almost ready",
        onClick: downloadPrintPackage
      }
    : designing
      ? {
          label: "Continue to print",
          icon: <ArrowRight size={16} />,
          disabled: false,
          meta: priceLabel ? `est. ${priceLabel} at Walgreens · same-day pickup` : "Checkout at Walgreens",
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
  const canPrintFromHome = draftProgress.hasMeaningfulProgress && printPackage.manifest.passed;
  const showTopNav = shouldShowTopNav({
    hasCustomerNavItems: customerNavItems.length > 0,
    isAdmin: adminAccess.isAdmin,
    renderCustomerNav
  });

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
              <AdminPanelView
                aiFlowConfigs={aiFlowConfigs}
                aiFlowSummary={aiFlowSummary}
                localizationSummary={localizationSummary}
                model={adminPanelModel}
                onAiFlowConfigsChange={setAiFlowConfigs}
                productionReadiness={productionReadiness}
                providerGovernance={providerGovernance}
                readiness={readiness}
                runtimeReadiness={runtimeReadiness}
              />
            }
            adaptersPanel={<AdaptersView runtimeReadiness={runtimeReadiness} />}
          />
        ) : null}

        {!isAdminView && !isLegalView && !isBusinessView && visibleCustomerView === "customer" ? (
          <HomeView
            canPrint={canPrintFromHome}
            draft={displayDraft}
            hasProgress={hasProgress}
            onImport={() => openView("opportunities")}
            onNote={() => openView("memory")}
            onOccasion={startOccasion}
            onPrint={() => openView("handoff")}
            onResume={() => openView("studio")}
            printPriceLabel={priceLabel}
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
            aiRequiresSignIn={!isSignedIn}
            draft={displayDraft}
            draftInput={draftInput}
            memories={memories}
            onAddNote={() => openView("memory")}
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
            checkoutCustomerDefaults={checkoutProfile}
            getCustomerApiToken={getCustomerApiToken}
            onCopyChecklist={copyChecklist}
            onDownloadPackage={downloadPrintPackage}
            onDownloadPanels={downloadPanels}
            panels={displayPanels}
            pricingComparison={pricingComparison}
            printPackage={printPackage}
          />
        ) : null}

        {!isAdminView && isLegalView ? (
          <LegalView
            items={readiness.legalCompliance.items}
            summary={readiness.legalCompliance.summary}
          />
        ) : null}
      </main>

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

      {toast ? <Toast message={toast} /> : null}
    </div>
  );
}

interface DraftAutosaveInput {
  draftInput: CardDraftInput;
  enabled: boolean;
  getToken: () => Promise<string | null>;
  localeCode: SupportedLocaleCode;
  opportunityDecision: OpportunityDecision;
  opportunityId: string;
  setDraftInput: (updater: ((current: CardDraftInput) => CardDraftInput) | CardDraftInput) => void;
  setLocaleCode: (code: SupportedLocaleCode) => void;
  setOpportunityDecision: (decision: OpportunityDecision) => void;
  setVendorId: (vendorId: VendorId) => void;
  validationPassed: boolean;
  vendorId: VendorId;
}

interface SavedDraftState {
  draftInput?: CardDraftInput;
  localeCode?: SupportedLocaleCode;
  opportunityDecision?: OpportunityDecision;
  vendorId?: VendorId;
}

function useDraftAutosave({
  draftInput,
  enabled,
  getToken,
  localeCode,
  opportunityDecision,
  opportunityId,
  setDraftInput,
  setLocaleCode,
  setOpportunityDecision,
  setVendorId,
  validationPassed,
  vendorId
}: DraftAutosaveInput) {
  const hydrated = useRef(false);
  const draftProgress = useMemo(
    () => buildDraftProgressState(draftInput, validationPassed),
    [draftInput, validationPassed]
  );
  const draftSnapshot = useMemo(
    () =>
      JSON.stringify({
        draftInput,
        localeCode,
        opportunityDecision,
        opportunityId,
        status: draftProgress.status,
        vendorId
      }),
    [draftInput, draftProgress.status, localeCode, opportunityDecision, opportunityId, vendorId]
  );

  useEffect(() => {
    if (!enabled) {
      hydrated.current = false;
      return;
    }

    let cancelled = false;
    getCustomerJson(getToken, "/api/customer/draft-state/current")
      .then((payload) => {
        if (cancelled) return;
        const saved = payload?.draftState as SavedDraftState | undefined;
        if (saved?.draftInput) setDraftInput((current) => ({ ...current, ...saved.draftInput }));
        if (saved?.localeCode) setLocaleCode(saved.localeCode);
        if (saved?.opportunityDecision) setOpportunityDecision(saved.opportunityDecision);
        if (saved?.vendorId) setVendorId(saved.vendorId);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) hydrated.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, getToken, setDraftInput, setLocaleCode, setOpportunityDecision, setVendorId]);

  useEffect(() => {
    if (!enabled || !hydrated.current || !draftProgress.hasMeaningfulProgress) return;
    const timer = window.setTimeout(() => {
      const body = JSON.parse(draftSnapshot) as Record<string, unknown>;
      void postCustomerMutation(getToken, "/api/customer/draft-state", body);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [draftProgress.hasMeaningfulProgress, draftSnapshot, enabled, getToken]);
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

async function getCustomerJson(getToken: () => Promise<string | null>, path: string): Promise<Record<string, unknown> | undefined> {
  const headers = await buildCustomerHeaders(getToken);
  const response = await fetch(path, { headers });
  if (!response.ok) return undefined;
  return response.json() as Promise<Record<string, unknown>>;
}

async function postCustomerMutation(
  getToken: () => Promise<string | null>,
  path: string,
  body: Record<string, unknown>
): Promise<void> {
  const headers = await buildCustomerHeaders(getToken);
  headers.set("Content-Type", "application/json");
  headers.set("X-Idempotency-Key", buildBrowserIdempotencyKey(path));
  await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
}

async function buildCustomerHeaders(getToken: () => Promise<string | null>): Promise<Headers> {
  const headers = new Headers();
  try {
    const token = await getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  } catch {
    /* signed-in UI stays usable while the API session recovers */
  }
  return headers;
}

function buildBrowserIdempotencyKey(path: string): string {
  const routeSlug = path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "mutation";
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${routeSlug}-${crypto.randomUUID()}`;
  return `${routeSlug}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
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
  adaptersPanel
}: {
  access: AdminAccess;
  activeView: ViewId;
  adminPanel: ReactNode;
  adaptersPanel: ReactNode;
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
          Admin
        </span>
        <div>
          <h1>{heading}</h1>
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
