import {
  capabilityLabels,
  providerStatusLabel,
  type ProviderAdapter
} from "./providerCatalog";
import type { ProductionLaunchGate } from "./productionReadiness";
import type {
  AiProviderReadinessItem,
  AiQueueOperationsItem,
  BusinessEngagementReadinessItem,
  CloudArtifactProofReadinessItem,
  E2eCoverageItem,
  ExternalAuditReadinessItem,
  HostedApiReadinessItem,
  LegalComplianceItem,
  MobileRenderReadinessItem,
  ObservabilityReadinessItem,
  PaymentReadinessItem,
  RetailFulfillmentReadinessItem,
  ReviewerDbSeedReadinessItem
} from "./readinessSummary";

export type AdminReadinessClassName = "ready-local" | "credential-gated" | "contract-only" | "blocked";

export interface AdminReadinessMiniListItem {
  id: string;
  eyebrow: string;
  label: string;
  detail: string;
  className: AdminReadinessClassName;
}

export function AdminReadinessMiniList({
  items,
  listClassName = "adapterMiniList",
  rowClassName = "adapterMini"
}: {
  items: AdminReadinessMiniListItem[];
  listClassName?: string;
  rowClassName?: string;
}) {
  return (
    <div className={listClassName}>
      {items.map((item) => (
        <div className={`${rowClassName} ${item.className}`} key={item.id}>
          <span>{item.eyebrow}</span>
          <strong>{item.label}</strong>
          <small>{item.detail}</small>
        </div>
      ))}
    </div>
  );
}

export function readinessStatusClass(
  status: string,
  options: { ready?: string[]; blocked?: string[]; contractOnly?: string[] } = {}
): AdminReadinessClassName {
  if ((options.ready ?? ["repo-local-ready"]).includes(status)) return "ready-local";
  if ((options.blocked ?? []).includes(status)) return "blocked";
  if ((options.contractOnly ?? []).includes(status)) return "contract-only";
  return "credential-gated";
}

export function AdapterMiniList({ adapters }: { adapters: ProviderAdapter[] }) {
  return (
    <AdminReadinessMiniList
      items={adapters.map((adapter) => ({
        id: adapter.id,
        eyebrow: capabilityLabels[adapter.capability],
        label: adapter.label,
        detail: providerStatusLabel(adapter.status),
        className: adapter.status
      }))}
    />
  );
}

export function ProductionGateList({ gates }: { gates: ProductionLaunchGate[] }) {
  return (
    <AdminReadinessMiniList
      items={gates.map((gate) => ({
        id: gate.id,
        eyebrow: gate.category,
        label: gate.label,
        detail: gate.status === "blocked" ? "Blocked" : "Evidence missing",
        className: gate.status === "blocked" ? "blocked" : "credential-gated"
      }))}
    />
  );
}

export function ExternalAuditList({ items }: { items: ExternalAuditReadinessItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.category,
        label: item.label,
        detail: externalAuditStatusLabel(item.status),
        className: readinessStatusClass(item.status, { blocked: ["certification-blocked"] })
      }))}
    />
  );
}

export function LegalComplianceList({ items }: { items: LegalComplianceItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: `${item.region.toUpperCase()} · ${item.category}`,
        label: item.label,
        detail: item.status === "repo-local-ready" ? "Local contract" : "Evidence required",
        className: readinessStatusClass(item.status)
      }))}
    />
  );
}

export function E2eCoverageList({ items }: { items: E2eCoverageItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.surface,
        label: item.label,
        detail: e2eAutomationLabel(item.automationType),
        className: "ready-local"
      }))}
    />
  );
}

export function ObservabilityReadinessList({ items }: { items: ObservabilityReadinessItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.lane,
        label: item.label,
        detail: item.liveIngestionEnabled ? "Live ingestion" : "Live ingestion off",
        className: readinessStatusClass(item.status)
      }))}
    />
  );
}

export function AiProviderReadinessList({ items }: { items: AiProviderReadinessItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.lane,
        label: item.label,
        detail: item.liveProviderCallsEnabled ? "Live AI" : "Live AI off",
        className: readinessStatusClass(item.status)
      }))}
    />
  );
}

export function AiQueueOperationsList({ items }: { items: AiQueueOperationsItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.lane,
        label: item.label,
        detail: `${item.metrics.length} metrics · ${item.humanOwner}`,
        className: readinessStatusClass(item.status)
      }))}
    />
  );
}

export function RetailFulfillmentReadinessList({ items }: { items: RetailFulfillmentReadinessItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.lane,
        label: item.label,
        detail: item.directOrderEnabled ? "Direct orders" : "Orders off",
        className: readinessStatusClass(item.status, { blocked: ["certification-blocked"] })
      }))}
    />
  );
}

export function PaymentReadinessList({ items }: { items: PaymentReadinessItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.lane,
        label: item.label,
        detail: item.liveChargesEnabled ? "Live charge" : "Charges off",
        className: readinessStatusClass(item.status, { blocked: ["certification-blocked"] })
      }))}
    />
  );
}

export function MobileRenderReadinessList({ items }: { items: MobileRenderReadinessItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.lane,
        label: item.label,
        detail: item.emulatorRenderProofAttached || item.nativeArtifactSigned ? "Proof attached" : "Proof missing",
        className: readinessStatusClass(item.status, { blocked: ["artifact-blocked"] })
      }))}
    />
  );
}

export function HostedApiReadinessList({ items }: { items: HostedApiReadinessItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.lane,
        label: item.label,
        detail:
          item.publicRouteProofAttached || item.hostedDbConnected || item.hostedTokenVerificationAttached
            ? "Proof attached"
            : "Proof missing",
        className: readinessStatusClass(item.status, { blocked: ["protection-blocked"] })
      }))}
    />
  );
}

export function ReviewerDbSeedReadinessList({ items }: { items: ReviewerDbSeedReadinessItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.lane,
        label: item.label,
        detail: item.hostedSeedExecuted || item.hostedTokenProbeAttached ? "Proof attached" : "Proof missing",
        className: readinessStatusClass(item.status)
      }))}
    />
  );
}

export function CloudArtifactProofReadinessList({ items }: { items: CloudArtifactProofReadinessItem[] }) {
  const repoLocalItems = items.filter((item) => item.status === "repo-local-ready");
  const evidenceItems = items.filter((item) => item.status !== "repo-local-ready");

  return (
    <div className="cloudProofColumns">
      <div>
        <p className="eyebrow">Source contracts</p>
        <div className="cloudProofList">
          {repoLocalItems.map((item) => (
            <CloudArtifactProofRow item={item} key={item.id} />
          ))}
        </div>
      </div>
      <div>
        <p className="eyebrow">Evidence required</p>
        <div className="cloudProofList">
          {evidenceItems.map((item) => (
            <CloudArtifactProofRow item={item} key={item.id} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CloudArtifactProofRow({ item }: { item: CloudArtifactProofReadinessItem }) {
  const stateLabel = item.status === "repo-local-ready" ? "Repo-local ready" : "Proof missing";

  return (
    <div className={`cloudProofRow ${readinessStatusClass(item.status)}`}>
      <div>
        <span>{item.lane}</span>
        <strong>{item.label}</strong>
      </div>
      <small>{stateLabel}</small>
    </div>
  );
}

export function BusinessEngagementReadinessList({ items }: { items: BusinessEngagementReadinessItem[] }) {
  return (
    <AdminReadinessMiniList
      items={items.map((item) => ({
        id: item.id,
        eyebrow: item.lane,
        label: item.label,
        detail: item.liveMessagesEnabled || item.crmWritesEnabled ? "Live enabled" : "Live off",
        className: readinessStatusClass(item.status, { blocked: ["approval-blocked"] })
      }))}
    />
  );
}

function e2eAutomationLabel(type: E2eCoverageItem["automationType"]): string {
  if (type === "browser-smoke") return "Browser smoke";
  if (type === "contract-test") return "Contract test";
  if (type === "ci-workflow") return "CI workflow";
  return "Doctor";
}

function externalAuditStatusLabel(status: ExternalAuditReadinessItem["status"]): string {
  if (status === "internal-baseline-ready") return "Internal baseline only";
  if (status === "certification-blocked") return "Certification blocked";
  return "Evidence missing";
}
