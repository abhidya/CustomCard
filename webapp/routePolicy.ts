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
  { id: "adapters", label: "Adapters" },
  { id: "legal", label: "Legal" }
];

export function isAdminRoute(view: ViewId): boolean {
  return view === "admin" || view === "adapters" || view === "legal";
}

export function isBusinessRoute(view: ViewId): boolean {
  return view === "business";
}

export function resolveVisibleCustomerView(view: ViewId): ViewId {
  return isAdminRoute(view) || view === "mobile" || isBusinessRoute(view) ? "customer" : view;
}

export function resolveActiveCustomerNavView(view: ViewId): ViewId {
  if (isAdminRoute(view) || view === "mobile" || isBusinessRoute(view)) return "customer";
  // Studio, print, and invite import are stages of the create flow — highlight "Create".
  if (view === "studio" || view === "handoff" || view === "opportunities") return "customer";
  return view;
}

export function shouldShowCustomerCta(view: ViewId): boolean {
  return view === "studio" || view === "handoff";
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
