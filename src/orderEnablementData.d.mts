import type { RetailPrinterVendorId } from "./retailPrinterContracts";

export type OrderEnablementVendorId = RetailPrinterVendorId | "staples" | "office-depot" | "local-print-shop";
export type OrderHandoffMode = "manual-upload";
export type OrderCostControl = "free-app-no-paid-api";

export interface OrderEnablementPolicy {
  vendorId: OrderEnablementVendorId;
  realOrdersEnabled: false;
  directOrderEnabled: false;
  canPlaceRealOrder: false;
  requiresManualConfirmation: true;
  liveQuoteEnabled: false;
  imageUploadEnabled: false;
  orderPlacementEnabled: false;
  handoffMode: OrderHandoffMode;
  costControl: OrderCostControl;
  requiredEvidence: string[];
  requiredGates: string[];
  requiredLegalReview: string[];
  disabledReasons: string[];
  blockedReasons: string[];
}

export interface OrderEnablementRuntimeFlags {
  realOrdersEnabled: false;
  directOrderEnabled: false;
  canPlaceRealOrder: false;
  requiresManualConfirmation: true;
  liveQuoteEnabled: false;
  imageUploadEnabled: false;
  orderPlacementEnabled: false;
}

export const retailOrderEnablementVendorIds: RetailPrinterVendorId[];
export const orderEnablementPolicies: Record<OrderEnablementVendorId, OrderEnablementPolicy>;
export function getOrderEnablementPolicy(vendorId: OrderEnablementVendorId | string): OrderEnablementPolicy;
export function getRetailOrderEnablementPolicies(): OrderEnablementPolicy[];
export function orderEnablementRuntimeFlags(vendorIdOrPolicy: OrderEnablementVendorId | string | OrderEnablementPolicy): OrderEnablementRuntimeFlags;
export function validateOrderEnablementPolicies(policies?: OrderEnablementPolicy[]): string[];
