import type { ViewId } from "../src/appStateOrchestrator";

export interface NavItem {
  id: ViewId;
  label: string;
}

export interface AdminAccessPolicy {
  isLoaded: boolean;
  isSignedIn: boolean;
  isAdmin: boolean;
}

export const customerNavItems: NavItem[] = [
  { id: "customer", label: "Create" },
  { id: "memory", label: "My cards" },
  { id: "people", label: "People" },
  { id: "settings", label: "Settings" }
];

export const adminNavItems: NavItem[] = [
  { id: "admin", label: "Admin" },
  { id: "business", label: "B2B" },
  { id: "adapters", label: "Adapters" },
  { id: "legal", label: "Legal" }
];

export function isAdminRoute(view: ViewId): boolean {
  return view === "admin" || view === "adapters" || view === "legal";
}

export function isBusinessRoute(view: ViewId): boolean {
  return view === "business";
}

/**
 * The B2B landing still reads as internal readiness commentary, so it stays
 * admin-only until real marketing copy exists. Everyone else lands on the
 * customer home instead.
 */
export function shouldRenderBusinessLanding(view: ViewId, isAdmin: boolean): boolean {
  return isBusinessRoute(view) && isAdmin;
}

/**
 * Deep links straight to print with nothing designed yet show an empty proof
 * page; send those visits to the studio so the flow starts where work exists.
 * In-session navigation (Continue to proof checks) is not affected — this is
 * only consulted for the entry view.
 */
export function resolveCreateFlowEntryView(view: ViewId, hasMeaningfulProgress: boolean): ViewId {
  return view === "handoff" && !hasMeaningfulProgress ? "studio" : view;
}

export interface CreateFlowStep {
  view: Extract<ViewId, "customer" | "studio" | "handoff">;
  label: string;
}

/** The three labeled stages of the create flow, in order. */
export const createFlowSteps: readonly CreateFlowStep[] = [
  { view: "customer", label: "Start" },
  { view: "studio", label: "Design" },
  { view: "handoff", label: "Print" }
];

export function createFlowStepIndex(view: ViewId): number {
  return createFlowSteps.findIndex((step) => step.view === view);
}

export function shouldShowCreateFlowStepper(view: ViewId): boolean {
  return view === "studio" || view === "handoff";
}

export function resolveVisibleCustomerView(view: ViewId): ViewId {
  return isAdminRoute(view) || view === "mobile" || isBusinessRoute(view) ? "customer" : view;
}

export function resolveActiveCustomerNavView(view: ViewId): ViewId {
  if (isAdminRoute(view) || view === "mobile") return "customer";
  if (isBusinessRoute(view)) return view;
  // Studio, print, and invite import are stages of the create flow — highlight "Create".
  if (view === "studio" || view === "handoff" || view === "opportunities") return "customer";
  return view;
}

export function shouldShowCustomerCta(view: ViewId): boolean {
  // Print owns proof approval, package download, and Walgreens checkout in context.
  return false;
}

export function shouldRenderCustomerNav(viewportWidth: number | undefined): boolean {
  return viewportWidth === undefined || viewportWidth >= 600;
}

export function shouldShowTopNav({
  hasCustomerNavItems,
  isAdmin,
  renderCustomerNav
}: {
  hasCustomerNavItems: boolean;
  isAdmin: boolean;
  renderCustomerNav: boolean;
}): boolean {
  return renderCustomerNav && (hasCustomerNavItems || isAdmin);
}

export interface AppShellViewModel {
  isAdminView: boolean;
  showBusinessLanding: boolean;
  visibleCustomerView: ViewId;
  visibleNavView: ViewId;
  renderCustomerNav: boolean;
  showTopNav: boolean;
  showBottomNav: boolean;
  showCreateFlowStepper: boolean;
  showCustomerCta: boolean;
}

export function buildAppShellViewModel({
  activeView,
  hasCustomerNavItems = customerNavItems.length > 0,
  isAdmin,
  viewportWidth
}: {
  activeView: ViewId;
  hasCustomerNavItems?: boolean;
  isAdmin: boolean;
  viewportWidth?: number;
}): AppShellViewModel {
  const isAdminView = isAdminRoute(activeView);
  const renderCustomerNav = shouldRenderCustomerNav(viewportWidth);
  return {
    isAdminView,
    showBusinessLanding: shouldRenderBusinessLanding(activeView, isAdmin),
    visibleCustomerView: resolveVisibleCustomerView(activeView),
    visibleNavView: resolveActiveCustomerNavView(activeView),
    renderCustomerNav,
    showTopNav: shouldShowTopNav({
      hasCustomerNavItems,
      isAdmin,
      renderCustomerNav
    }),
    showBottomNav: !renderCustomerNav && !isAdminView,
    showCreateFlowStepper: !isAdminView && shouldShowCreateFlowStepper(activeView),
    showCustomerCta: shouldShowCustomerCta(activeView)
  };
}

export function getAdminTargetLabel(view: ViewId): string {
  if (view === "legal") return "Legal docs";
  return view === "adapters" ? "Adapters" : "Admin panel";
}

export function getAdminSurfaceHeading(view: ViewId): string {
  if (view === "legal") return "Legal readiness and policy docs";
  return view === "adapters" ? "Adapter readiness" : "Admin panel";
}

export function canEnterAdminSurface(access: AdminAccessPolicy): boolean {
  return access.isAdmin;
}

export function getAdminAccessStatus(access: AdminAccessPolicy): string {
  if (!access.isLoaded) return "Checking account access";
  return access.isSignedIn ? "Admin access required" : "Sign in required";
}
