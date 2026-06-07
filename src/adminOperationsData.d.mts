import type { AdminPanelModel } from "./providerCatalog";
import type { ExternalAuditReadinessItem } from "./externalAuditReadiness";
import type { HostedApiReadinessItem } from "./hostedApiReadiness";
import type { ObservabilityReadinessItem } from "./observabilityReadiness";
import type { PaymentReadinessItem } from "./paymentReadiness";
import type { ProductionLaunchGate } from "./productionReadiness";
import type { RetailFulfillmentReadinessItem } from "./retailFulfillmentReadiness";

export type AdminOperationOwnerId =
  | "identity-access"
  | "provider-integrations"
  | "commerce-fulfillment"
  | "platform-infrastructure"
  | "observability-audit";

export type AdminOperationPriority = "p0" | "p1" | "p2";
export type AdminOperationStatus =
  | "repo-local-ready"
  | "evidence-required"
  | "certification-blocked"
  | "protection-blocked"
  | "blocked";
export type AdminOperationSource =
  | "production-launch"
  | "credential-vault"
  | "hosted-api"
  | "retail"
  | "payment"
  | "observability"
  | "external-audit";

export interface AdminOperationTask {
  id: string;
  label: string;
  ownerId: AdminOperationOwnerId;
  priority: AdminOperationPriority;
  status: AdminOperationStatus;
  source: AdminOperationSource;
  adminAction: string;
  requiredEvidence: string[];
  currentEvidence: string[];
  blocker: string;
  envVarNames: string[];
  liveEnabled: boolean;
}

export interface AdminOperationOwnerLane {
  id: AdminOperationOwnerId;
  label: string;
  description: string;
  tasks: AdminOperationTask[];
  p0Tasks: number;
  evidenceRequired: number;
  blocked: number;
  nextTask: AdminOperationTask | undefined;
}

export interface AdminOperationSummary {
  taskCount: number;
  ownerCount: number;
  p0Tasks: number;
  p1Tasks: number;
  repoLocalReady: number;
  evidenceRequired: number;
  blocked: number;
  credentialTasks: number;
  requiredEvidence: string[];
  liveEnabled: number;
}

export interface AdminOperationsWorkflow {
  summary: AdminOperationSummary;
  ownerLanes: AdminOperationOwnerLane[];
  tasks: AdminOperationTask[];
  priorityTasks: AdminOperationTask[];
  sourceLabels: Record<AdminOperationSource, string>;
  blockers: string[];
}

export interface AdminOperationsWorkflowInput {
  model: AdminPanelModel;
  productionGates: ProductionLaunchGate[];
  hostedApiReadinessItems: HostedApiReadinessItem[];
  retailFulfillmentReadinessItems: RetailFulfillmentReadinessItem[];
  paymentReadinessItems: PaymentReadinessItem[];
  observabilityReadinessItems: ObservabilityReadinessItem[];
  externalAuditReadinessItems: ExternalAuditReadinessItem[];
}

export function buildAdminOperationsWorkflow(input: AdminOperationsWorkflowInput): AdminOperationsWorkflow;
export function summarizeAdminOperationsWorkflow(
  tasks: AdminOperationTask[],
  ownerLanes: AdminOperationOwnerLane[]
): AdminOperationSummary;
export function validateAdminOperationsWorkflow(workflow: Pick<AdminOperationsWorkflow, "tasks"> & Partial<AdminOperationsWorkflow>): string[];
