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
  { id: "opportunities", label: "Occasions" },
  { id: "memory", label: "Notes" },
  { id: "handoff", label: "Print" },
  { id: "legal", label: "Legal" }
];

export const adminNavItems: NavItem[] = [
  { id: "admin", label: "Admin" },
  { id: "adapters", label: "Adapters" }
];

export function isAdminRoute(view: ViewId): boolean {
  return view === "admin" || view === "adapters";
}

export function isLegalRoute(view: ViewId): boolean {
  return view === "legal";
}

export function isBusinessRoute(view: ViewId): boolean {
  return view === "business";
}

export function resolveVisibleCustomerView(view: ViewId): ViewId {
  return isAdminRoute(view) || view === "mobile" || isLegalRoute(view) || isBusinessRoute(view) ? "customer" : view;
}

export function resolveActiveCustomerNavView(view: ViewId): ViewId {
  return isAdminRoute(view) || view === "mobile" || isBusinessRoute(view) ? "customer" : view;
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
  return view === "adapters" ? "Adapters" : "Admin panel";
}

export function getAdminSurfaceHeading(view: ViewId): string {
  return view === "adapters" ? "Adapter readiness" : "Admin panel";
}

export function canEnterAdminSurface(access: AdminAccessPolicy): boolean {
  return access.isAdmin;
}

export function getAdminAccessStatus(access: AdminAccessPolicy): string {
  if (!access.isLoaded) return "Checking account access";
  return access.isSignedIn ? "Admin access required" : "Sign in required";
}
