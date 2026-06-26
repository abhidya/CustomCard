export declare const adminSafetyControlsRoute: string;
export declare const safetyControlVendorIds: readonly string[];
export declare const safetyControlVendorModes: readonly string[];

export interface AdminSafetyControls {
  service: "customcard-admin-safety-controls";
  status: "ready" | "fail-closed";
  realOrdersEnabled: boolean;
  vendorModes: Record<string, "disabled_until_certified" | "sandbox" | "production">;
  vendorCertification: Record<string, boolean>;
  productionMutationAcknowledged: boolean;
  liveWriteAcknowledged: boolean;
  externalNetworkCalls: boolean;
  liveVendorOrders: boolean;
  updatedAtIso: string | null;
  updatedBy: string | null;
  allowedVendorModes: readonly string[];
  vendorIds: readonly string[];
  blockers: string[];
}

export declare function createAdminSafetyControlStore(options?: {
  initialControls?: Partial<AdminSafetyControls>;
  now?: () => Date;
}): {
  read(): AdminSafetyControls;
  update(patch: Partial<AdminSafetyControls>, context?: { authContext?: { userId?: string }; userId?: string }): AdminSafetyControls;
};

export declare function normalizeAdminSafetyControls(input?: Partial<AdminSafetyControls>): AdminSafetyControls;
export declare function updateAdminSafetyControls(
  current?: Partial<AdminSafetyControls>,
  patch?: Partial<AdminSafetyControls>,
  context?: { authContext?: { userId?: string }; userId?: string; now?: () => Date }
): AdminSafetyControls;
export declare function walgreensCheckoutModeFromSafetyControls(
  controls?: Partial<AdminSafetyControls>
): "disabled_until_certified" | "sandbox" | "production";
export declare function walgreensCheckoutSafetyBlockers(controls?: Partial<AdminSafetyControls>): string[];
export declare function summarizeAdminSafetyControlBlockers(controls?: Partial<AdminSafetyControls>): string[];
