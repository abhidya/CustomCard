import type { PersistenceTableName } from "./persistenceContracts";

export type LocalPersistenceProductionStorage = "postgres" | "postgres-and-object-store" | "browser-only";

export interface LocalPersistenceAuditItem {
  id: string;
  label: string;
  currentSurface: "localStorage";
  currentKey: string;
  localFields: string[];
  productionStorage: LocalPersistenceProductionStorage;
  targetTables: PersistenceTableName[];
  apiRoutes: string[];
  customerData: boolean;
  rationale: string;
  productionAction: string;
}

export interface LocalPersistenceAuditSummary {
  service: "customcard-local-persistence-audit";
  status: "action-required" | "browser-only-ok";
  localStorageKeys: string[];
  total: number;
  dbRequired: number;
  objectStoreRequired: number;
  browserOnly: number;
  customerDataItems: number;
  targetTables: PersistenceTableName[];
  apiRoutes: string[];
  actions: Array<Pick<LocalPersistenceAuditItem, "id" | "label" | "productionAction">>;
}

export const reviewerLocalWorkspaceStorageKey = "customcard-free-workspace-v1";
export const browserThemeStorageKey = "customcard-theme-v1";

export const localPersistenceAuditItems: LocalPersistenceAuditItem[] = [
  {
    id: "local-workspace-identity",
    label: "Local workspace identity",
    currentSurface: "localStorage",
    currentKey: reviewerLocalWorkspaceStorageKey,
    localFields: ["LocalWorkspace.id", "LocalWorkspace.name", "LocalWorkspace.email", "LocalWorkspace.createdAtIso"],
    productionStorage: "postgres",
    targetTables: ["users", "account_identities", "auth_sessions"],
    apiRoutes: ["/api/customer/bootstrap", "/api/mobile/bootstrap"],
    customerData: true,
    rationale: "The browser workspace currently owns account-shaped customer identity and cannot support recovery, revocation, or cross-device continuity.",
    productionAction: "Move workspace identity to hosted auth/account rows; keep only session-bound UI cache in the browser."
  },
  {
    id: "approved-relationship-memories",
    label: "Approved relationship memories",
    currentSurface: "localStorage",
    currentKey: reviewerLocalWorkspaceStorageKey,
    localFields: [
      "LocalWorkspace.memories[].recipient",
      "LocalWorkspace.memories[].note",
      "LocalWorkspace.memories[].tags",
      "LocalWorkspace.memories[].approved",
      "LocalWorkspace.memories[].sensitivity",
      "LocalWorkspace.memories[].updatedAtIso"
    ],
    productionStorage: "postgres",
    targetTables: ["relationship_memories", "audit_log"],
    apiRoutes: ["/api/memories/review", "/api/data-requests"],
    customerData: true,
    rationale: "Relationship memory is the product's durable personalization layer and needs review, forget, export, and audit controls.",
    productionAction: "Persist approved memories through relationship_memories and audit every approve/forget mutation."
  },
  {
    id: "saved-event-queue-decisions",
    label: "Saved event queue and decisions",
    currentSurface: "localStorage",
    currentKey: reviewerLocalWorkspaceStorageKey,
    localFields: [
      "LocalWorkspace.events[].title",
      "LocalWorkspace.events[].recipient",
      "LocalWorkspace.events[].occasion",
      "LocalWorkspace.events[].dateLabel",
      "LocalWorkspace.events[].isoDate",
      "LocalWorkspace.events[].status",
      "LocalWorkspace.events[].savedAtIso"
    ],
    productionStorage: "postgres",
    targetTables: ["provider_connections", "imported_events", "card_opportunities", "audit_log"],
    apiRoutes: ["/api/import-preview"],
    customerData: true,
    rationale: "Upcoming card opportunities drive reminders, snooze/dismiss behavior, and mobile queue sync; browser-only state drops those decisions.",
    productionAction: "Persist metadata-only imports and opportunity decisions; add an idempotent decision mutation before hosted sync."
  },
  {
    id: "card-history-render-preview",
    label: "Card history and rendered front preview",
    currentSurface: "localStorage",
    currentKey: reviewerLocalWorkspaceStorageKey,
    localFields: [
      "LocalWorkspace.cardHistory[].id",
      "LocalWorkspace.cardHistory[].title",
      "LocalWorkspace.cardHistory[].recipient",
      "LocalWorkspace.cardHistory[].occasion",
      "LocalWorkspace.cardHistory[].exportedAtIso",
      "LocalWorkspace.cardHistory[].frontSvg"
    ],
    productionStorage: "postgres-and-object-store",
    targetTables: ["card_projects", "render_packets", "orders", "order_events", "audit_log"],
    apiRoutes: ["/api/card-projects", "/api/render-packets", "/api/vendor-handoff/manual"],
    customerData: true,
    rationale: "Finished-card history is needed for reuse and support, but SVG/PDF bytes are render artifacts and should not live only in localStorage or directly in Postgres.",
    productionAction: "Store project/history metadata in Postgres and store rendered SVG/PDF artifacts in object storage behind signed URLs."
  },
  {
    id: "theme-preference",
    label: "Theme preference",
    currentSurface: "localStorage",
    currentKey: browserThemeStorageKey,
    localFields: ["webapp/theme.ts selected theme id"],
    productionStorage: "browser-only",
    targetTables: [],
    apiRoutes: [],
    customerData: false,
    rationale: "Theme selection is a low-risk device preference and does not need account recovery or audit semantics.",
    productionAction: "Keep the theme preference in browser storage unless explicit cross-device preferences are added later."
  }
];

export function summarizeLocalPersistenceAudit(
  items: LocalPersistenceAuditItem[] = localPersistenceAuditItems
): LocalPersistenceAuditSummary {
  const dbRequiredItems = items.filter((item) => item.productionStorage !== "browser-only");
  const objectStoreRequiredItems = items.filter((item) => item.productionStorage === "postgres-and-object-store");
  const browserOnlyItems = items.filter((item) => item.productionStorage === "browser-only");

  return {
    service: "customcard-local-persistence-audit",
    status: dbRequiredItems.length > 0 ? "action-required" : "browser-only-ok",
    localStorageKeys: uniqueSorted(items.map((item) => item.currentKey)),
    total: items.length,
    dbRequired: dbRequiredItems.length,
    objectStoreRequired: objectStoreRequiredItems.length,
    browserOnly: browserOnlyItems.length,
    customerDataItems: items.filter((item) => item.customerData).length,
    targetTables: uniqueSorted(dbRequiredItems.flatMap((item) => item.targetTables)) as PersistenceTableName[],
    apiRoutes: uniqueSorted(dbRequiredItems.flatMap((item) => item.apiRoutes)),
    actions: dbRequiredItems.map(({ id, label, productionAction }) => ({ id, label, productionAction }))
  };
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((first, second) => first.localeCompare(second));
}
