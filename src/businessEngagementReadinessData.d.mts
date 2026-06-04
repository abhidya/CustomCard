export type BusinessEngagementReadinessStatus = "repo-local-ready" | "evidence-missing" | "approval-blocked";
export type BusinessEngagementReadinessLane =
  | "crm-source"
  | "crm-oauth"
  | "campaign-logic"
  | "approval-queue"
  | "workflow-routing"
  | "outreach-channels"
  | "compliance"
  | "feedback-loop";
export type BusinessEngagementLifecycleTrigger = "birthday" | "purchase-anniversary" | "warranty-anniversary";

export interface BusinessEngagementReadinessItem {
  id: string;
  label: string;
  lane: BusinessEngagementReadinessLane;
  status: BusinessEngagementReadinessStatus;
  crmAdapterIds: string[];
  workflowAdapterIds: string[];
  notificationAdapterIds: string[];
  lifecycleTriggers: BusinessEngagementLifecycleTrigger[];
  requiresLiveOAuth: boolean;
  requiresCustomerOptIn: boolean;
  requiresSuppressionReview: boolean;
  requiresHumanReview: boolean;
  requiresLiveSendProof: boolean;
  liveMessagesEnabled: false;
  crmWritesEnabled: false;
  externalNetworkCalls: false;
  realOrdersEnabled: false;
  currentEvidence: string[];
  requiredEvidence: string[];
  blocker: string;
}

export interface BusinessEngagementReadinessSummary {
  total: number;
  repoLocalReady: number;
  evidenceMissing: number;
  approvalBlocked: number;
  crmAdapterContracts: number;
  workflowAdapterContracts: number;
  notificationAdapterContracts: number;
  lifecycleTriggerKinds: number;
  liveOAuthRequired: number;
  optInRequired: number;
  suppressionReviewRequired: number;
  humanReviewRequired: number;
  liveSendProofRequired: number;
  liveMessagesEnabled: number;
  crmWritesEnabled: number;
  externalNetworkCalls: number;
  realOrdersEnabled: number;
  requiredEvidence: string[];
  blockers: string[];
}

export const businessEngagementReadinessItems: BusinessEngagementReadinessItem[];
export function summarizeBusinessEngagementReadiness(
  items?: BusinessEngagementReadinessItem[]
): BusinessEngagementReadinessSummary;
export function validateBusinessEngagementReadiness(items?: BusinessEngagementReadinessItem[]): string[];
