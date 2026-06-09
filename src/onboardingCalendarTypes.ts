export type OnboardingPersona =
  | "busy-family-organizer"
  | "last-minute-card-buyer"
  | "privacy-cautious-user"
  | "icloud-first-user"
  | "relationship-memory-user";

export type OnboardingStageId =
  | "account-baseline"
  | "calendar-choice"
  | "consent-preview"
  | "import-preview"
  | "opportunity-review"
  | "card-setup"
  | "memory-consent"
  | "handoff-readiness";

export type CalendarIntegrationId = "google-calendar-events" | "icloud-ics-fallback";
export type CalendarProvider = "Google Calendar API" | "iCloud Calendar export" | "Manual invite or ICS paste";
export type CalendarConnectionMode = "oauth-readiness-contract" | "manual-export-contract";
export type AdapterLaunchStatus = "credential-gated" | "contract-only";
export type CalendarOnboardingChoiceId = "manual-invite-or-ics" | CalendarIntegrationId;
export type CalendarOnboardingChoiceStatus = "ready-local" | "credential-gated" | "manual-export";
export type CalendarConnectionStartMode = "metadata-import" | "oauth-evidence-required" | "manual-export-guide";
export type CalendarEvidenceOwner = "customer" | "operator" | "system";
export type CalendarEvidenceRequirementKind =
  | "scope-review"
  | "metadata-schema"
  | "credential-boundary"
  | "revocation"
  | "manual-export"
  | "import-preview"
  | "fallback";

export interface OnboardingUserStory {
  id: string;
  persona: OnboardingPersona;
  story: string;
  calendarDependency: CalendarIntegrationId | "calendar-agnostic";
  onboardingStageIds: OnboardingStageId[];
  acceptanceCriteria: string[];
  nonGoals: string[];
}

export interface OnboardingStage {
  id: OnboardingStageId;
  title: string;
  userGoal: string;
  requiredDecision: string;
  completionSignal: string;
  blockedUntil: string[];
  productionNotes: string[];
}

export interface CalendarAdapterReadinessContract {
  id: CalendarIntegrationId;
  provider: CalendarProvider;
  mode: CalendarConnectionMode;
  launchStatus: AdapterLaunchStatus;
  catalogAdapterId: CalendarIntegrationId;
  requiredEnv: string[];
  requiredScopes: string[];
  officialScopeUris: string[];
  safetyGates: string[];
  metadataFields: string[];
  rawContentAllowed: false;
  liveOAuthEnabled: false;
  storesProviderCredentials: false;
  networkRequestFactory: "not-implemented";
  fallbackImportPath: string;
  readinessChecklist: string[];
  blockedReasons: string[];
}

export interface CalendarOnboardingChoice {
  id: CalendarOnboardingChoiceId;
  provider: CalendarProvider;
  label: string;
  status: CalendarOnboardingChoiceStatus;
  actionLabel: string;
  customerVisible: boolean;
  canStartNow: boolean;
  liveOAuthEnabled: false;
  sourceMode: "local-paste" | "oauth-readiness" | "manual-export";
  dataBoundary: string;
  credentialBoundary: string;
  requiredScopes: string[];
  officialScopeUris: string[];
  blockedReason?: string;
}

export type CalendarOnboardingActionActor = "customer" | "operator" | "system";

export interface CalendarOnboardingActionStep {
  actor: CalendarOnboardingActionActor;
  title: string;
  detail: string;
  evidenceRequired: string[];
}

export interface CalendarConnectionEvidenceRequirement {
  id: string;
  owner: CalendarEvidenceOwner;
  kind: CalendarEvidenceRequirementKind;
  label: string;
  requiredBefore: "customer-visible-choice" | "provider-connection" | "opportunity-creation";
  proofArtifact: string;
  officialSourceUrl?: string;
  satisfiedInRepo: boolean;
  blocksLiveConnection: boolean;
}

export interface CalendarOnboardingActionPacket {
  id: CalendarOnboardingChoiceId;
  provider: CalendarProvider;
  label: string;
  status: CalendarOnboardingChoiceStatus;
  actionLabel: string;
  customerVisible: boolean;
  canStartNow: boolean;
  liveOAuthEnabled: false;
  networkRequestPrepared: false;
  credentialStorageEnabled: false;
  providerRequestUrl: null;
  sourceMode: CalendarOnboardingChoice["sourceMode"];
  officialDocs: string[];
  requiredEnv: string[];
  requiredScopes: string[];
  officialScopeUris: string[];
  dataBoundary: string;
  credentialBoundary: string;
  safetyChecks: string[];
  evidenceRequirements: CalendarConnectionEvidenceRequirement[];
  customerSteps: CalendarOnboardingActionStep[];
  operatorSteps: CalendarOnboardingActionStep[];
  successSignal: string;
  fallbackChoiceId?: CalendarOnboardingChoiceId;
  blockedReason?: string;
}

export interface CalendarConnectionStartPacket {
  id: CalendarOnboardingChoiceId;
  provider: CalendarProvider;
  label: string;
  status: CalendarOnboardingChoiceStatus;
  startMode: CalendarConnectionStartMode;
  apiRoute: "/api/calendar/connections/start";
  nextApiRoute: "/api/import-preview" | null;
  serverOwned: true;
  clientMayPrepareProviderRequest: false;
  customerVisible: boolean;
  canStartNow: boolean;
  liveOAuthEnabled: false;
  networkRequestPrepared: false;
  credentialStorageEnabled: false;
  providerRequestUrl: null;
  rawContentStored: false;
  externalNetworkCalls: false;
  realOrdersEnabled: false;
  sourceMode: CalendarOnboardingChoice["sourceMode"];
  officialDocs: string[];
  requiredEnv: string[];
  requiredScopes: string[];
  officialScopeUris: string[];
  dataBoundary: string;
  credentialBoundary: string;
  safetyChecks: string[];
  requiredEvidenceIds: string[];
  blockingEvidenceIds: string[];
  missingRepoEvidenceIds: string[];
  customerSteps: CalendarOnboardingActionStep[];
  operatorSteps: CalendarOnboardingActionStep[];
  fallbackChoiceId?: CalendarOnboardingChoiceId;
  blockedReason?: string;
}

export interface CalendarConnectionStartResponse {
  service: "customcard-api";
  status: "ready-local" | "blocked";
  route: "calendar-connection-start";
  requestedChoiceId: CalendarOnboardingChoiceId;
  startPacket: CalendarConnectionStartPacket;
  serverOwned: true;
  clientMayPrepareProviderRequest: false;
  providerRequestUrl: null;
  networkRequestPrepared: false;
  credentialStorageEnabled: false;
  externalNetworkCalls: false;
  realOrdersEnabled: false;
  rawContentStored: false;
  nextApiRoute: CalendarConnectionStartPacket["nextApiRoute"];
  blockers: string[];
}

export interface OnboardingPlan {
  stories: OnboardingUserStory[];
  stages: OnboardingStage[];
  calendarAdapters: CalendarAdapterReadinessContract[];
  productionGuardrails: string[];
}

export interface AdapterReadinessResult {
  adapterId: CalendarIntegrationId;
  readyForLiveUse: false;
  contractReady: boolean;
  missingGates: string[];
  blockedReasons: string[];
}

export interface CalendarOnboardingEvidenceSummary {
  total: number;
  repoSatisfied: number;
  blocksLiveConnection: number;
  customerOwned: number;
  operatorOwned: number;
  systemOwned: number;
  providerConnectionRequired: number;
  opportunityCreationRequired: number;
  officialSourceCount: number;
  missingRepoEvidenceIds: string[];
}
