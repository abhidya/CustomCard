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
  customerSteps: CalendarOnboardingActionStep[];
  operatorSteps: CalendarOnboardingActionStep[];
  successSignal: string;
  fallbackChoiceId?: CalendarOnboardingChoiceId;
  blockedReason?: string;
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

export const onboardingStages: OnboardingStage[] = [
  {
    id: "account-baseline",
    title: "Create a private card workspace",
    userGoal: "Start without committing to a live provider connection.",
    requiredDecision: "Choose local workspace auth or production account path.",
    completionSignal: "A workspace exists with visible privacy and deletion expectations.",
    blockedUntil: ["Production auth provider is selected and verified for hosted accounts."],
    productionNotes: ["The local workspace uses browser storage; production accounts require hosted auth and recovery."]
  },
  {
    id: "calendar-choice",
    title: "Choose calendar source",
    userGoal: "Pick Google Calendar, iCloud export, pasted invite, or manual note.",
    requiredDecision: "Select the least invasive import source that can identify upcoming card moments.",
    completionSignal: "The selected source is shown with its exact data boundary.",
    blockedUntil: ["Provider consent copy is reviewed.", "Unsupported sources have a manual fallback."],
    productionNotes: ["Google is OAuth-gated; iCloud is a manual ICS export contract in this repo state."]
  },
  {
    id: "consent-preview",
    title: "Preview consent and scopes",
    userGoal: "Understand what CustomCard would read before connecting a calendar.",
    requiredDecision: "Approve metadata-only access or continue with manual import.",
    completionSignal: "User sees provider, scopes, retention posture, and revocation path.",
    blockedUntil: ["OAuth client, redirect URI, revocation handling, and privacy copy are verified."],
    productionNotes: ["No live OAuth URL is generated by this module."]
  },
  {
    id: "import-preview",
    title: "Review imported event metadata",
    userGoal: "Inspect candidate events before any card project is created.",
    requiredDecision: "Confirm that the event is real, relevant, and not too sensitive.",
    completionSignal: "Only title, date, location label, attendees label, and evidence summary are retained.",
    blockedUntil: ["Raw descriptions and full message bodies are rejected or redacted."],
    productionNotes: ["Calendar data is treated as untrusted input."]
  },
  {
    id: "opportunity-review",
    title: "Approve card opportunity",
    userGoal: "Decide whether the event deserves a card.",
    requiredDecision: "Generate, snooze, dismiss, or edit the opportunity.",
    completionSignal: "A card project is created only after an explicit generate decision.",
    blockedUntil: ["Dismiss/snooze actions are persisted and auditable."],
    productionNotes: ["False positives should be recoverable without creating hidden memories."]
  },
  {
    id: "card-setup",
    title: "Answer card interview",
    userGoal: "Give the system relationship, tone, language, and style context.",
    requiredDecision: "Choose sender, relationship, tone, visual direction, and high-care details.",
    completionSignal: "The card brief is complete enough for deterministic validation.",
    blockedUntil: ["High-care religious, grief, and multilingual prompts remain review-gated."],
    productionNotes: ["AI can later help draft copy, but layout and approval remain deterministic gates."]
  },
  {
    id: "memory-consent",
    title: "Approve relationship memory",
    userGoal: "Control what the product remembers for future cards.",
    requiredDecision: "Approve, edit, suppress, or delete proposed memory records.",
    completionSignal: "Every memory has user-visible provenance and a deletion path.",
    blockedUntil: ["Memory write path proves consent, sensitivity, and forget controls."],
    productionNotes: ["No hidden vector-only memory is part of this onboarding contract."]
  },
  {
    id: "handoff-readiness",
    title: "Review print options",
    userGoal: "Download or hand off print-ready assets after approval.",
    requiredDecision: "Choose manual download, local printer, or future certified retail checkout.",
    completionSignal: "Real ordering stays blocked unless quote, approval, payment, and certification gates pass.",
    blockedUntil: ["Physical print QA and vendor certification evidence exists."],
    productionNotes: ["Calendar integrations never imply automatic vendor sharing."]
  }
];

export const onboardingUserStories: OnboardingUserStory[] = [
  {
    id: "story-google-calendar-proactive-card",
    persona: "busy-family-organizer",
    story:
      "As a busy family organizer, I want CustomCard to find upcoming Google Calendar events so I can approve a thoughtful card before the week gets busy.",
    calendarDependency: "google-calendar-events",
    onboardingStageIds: [
      "account-baseline",
      "calendar-choice",
      "consent-preview",
      "import-preview",
      "opportunity-review",
      "card-setup",
      "handoff-readiness"
    ],
    acceptanceCriteria: [
      "Google Calendar is presented as a credential-gated provider, not a live connection in local review.",
      "Only event metadata is eligible for import.",
      "The user must approve a candidate before a card project is created."
    ],
    nonGoals: ["No background scan starts before consent.", "No raw calendar descriptions are stored."]
  },
  {
    id: "story-icloud-export-user",
    persona: "icloud-first-user",
    story:
      "As an iCloud Calendar user, I want a manual export path so I can use CustomCard without giving the app my Apple account credentials.",
    calendarDependency: "icloud-ics-fallback",
    onboardingStageIds: ["account-baseline", "calendar-choice", "import-preview", "opportunity-review", "card-setup"],
    acceptanceCriteria: [
      "iCloud is modeled as manual ICS export in this repo state.",
      "No Apple ID, app-specific password, or CalDAV credential is stored.",
      "The pasted/exported ICS path feeds the same opportunity review stage."
    ],
    nonGoals: ["No fake iCloud OAuth.", "No live CalDAV connector claim."]
  },
  {
    id: "story-last-minute-pickup",
    persona: "last-minute-card-buyer",
    story:
      "As a last-minute card buyer, I want onboarding to show event urgency so I can prioritize a printable card and same-day print options.",
    calendarDependency: "calendar-agnostic",
    onboardingStageIds: ["import-preview", "opportunity-review", "card-setup", "handoff-readiness"],
    acceptanceCriteria: [
      "Date confidence is visible before generation.",
      "Manual print options remain available when calendar integration is not connected.",
      "Real retail ordering remains disabled."
    ],
    nonGoals: ["No live pickup-window guarantee.", "No automatic checkout."]
  },
  {
    id: "story-privacy-first-onboarding",
    persona: "privacy-cautious-user",
    story:
      "As a privacy-cautious user, I want to see scopes, retention, and revocation before importing events so I can choose a manual path if needed.",
    calendarDependency: "calendar-agnostic",
    onboardingStageIds: ["account-baseline", "calendar-choice", "consent-preview", "import-preview", "memory-consent"],
    acceptanceCriteria: [
      "Every provider path names its required scopes or explains that it has none.",
      "Raw event content is rejected by default.",
      "Memory creation requires separate user approval."
    ],
    nonGoals: ["No silent memory creation.", "No broad calendar or email history scan by default."]
  },
  {
    id: "story-recurring-memory",
    persona: "relationship-memory-user",
    story:
      "As a recurring card sender, I want approved relationship memories to improve later card interviews without hiding what the product remembers.",
    calendarDependency: "calendar-agnostic",
    onboardingStageIds: ["opportunity-review", "card-setup", "memory-consent"],
    acceptanceCriteria: [
      "Memory records are proposed after card approval, not during provider import.",
      "Sensitive memories stay review-gated.",
      "The user can edit or delete memory records."
    ],
    nonGoals: ["No vector-only hidden memory.", "No provider data is used as memory without consent."]
  }
];

export const calendarAdapterReadinessContracts: CalendarAdapterReadinessContract[] = [
  {
    id: "google-calendar-events",
    provider: "Google Calendar API",
    mode: "oauth-readiness-contract",
    launchStatus: "credential-gated",
    catalogAdapterId: "google-calendar-events",
    requiredEnv: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
    requiredScopes: ["calendar.events.readonly"],
    officialScopeUris: ["https://www.googleapis.com/auth/calendar.events.readonly"],
    safetyGates: [
      "OAuth consent required",
      "Calendar scope consent",
      "Metadata schema validation",
      "Revocation handling",
      "No raw content storage"
    ],
    metadataFields: ["providerEventId", "title", "startIso", "endIso", "locationLabel", "attendeeLabels", "evidenceSummary"],
    rawContentAllowed: false,
    liveOAuthEnabled: false,
    storesProviderCredentials: false,
    networkRequestFactory: "not-implemented",
    fallbackImportPath: "Manual ICS paste remains available when Google OAuth is not configured.",
    readinessChecklist: [
      "Register OAuth app and redirect URI.",
      "Verify least-privilege Calendar API scope.",
      "Store refresh tokens only through the production secret/session boundary.",
      "Implement revocation and disconnect handling before background sync.",
      "Run metadata-only import tests against recorded schema fixtures."
    ],
    blockedReasons: ["No live OAuth consent flow is implemented in this repository state."]
  },
  {
    id: "icloud-ics-fallback",
    provider: "iCloud Calendar export",
    mode: "manual-export-contract",
    launchStatus: "contract-only",
    catalogAdapterId: "icloud-ics-fallback",
    requiredEnv: [],
    requiredScopes: [],
    officialScopeUris: [],
    safetyGates: ["Manual export only", "No Apple account credentials stored", "Metadata schema validation"],
    metadataFields: ["title", "startIso", "endIso", "locationLabel", "evidenceSummary"],
    rawContentAllowed: false,
    liveOAuthEnabled: false,
    storesProviderCredentials: false,
    networkRequestFactory: "not-implemented",
    fallbackImportPath: "User exports or pastes ICS text into the existing manual import flow.",
    readinessChecklist: [
      "Keep Apple account credentials out of CustomCard.",
      "Parse customer-provided ICS data through the same untrusted-input path.",
      "Show export instructions before the paste/import step.",
      "Do not claim CalDAV or native Apple Calendar sync until credential handling is designed."
    ],
    blockedReasons: ["Live iCloud CalDAV/native sync is intentionally not implemented."]
  }
];

export const onboardingProductionGuardrails = [
  "No fake live OAuth URLs or provider callbacks are exposed by the onboarding contracts.",
  "Calendar import contracts are metadata-only and reject raw email/calendar body storage.",
  "Calendar connection does not create card projects, memories, vendor shares, payments, or orders without explicit user approval.",
  "Google Calendar is credential-gated; iCloud is manual-export contract-only until a real Apple calendar credential strategy exists.",
  "Manual invite and ICS paste remain the free fallback for every onboarding path."
];

function requireCalendarAdapterReadinessContract(
  adapterId: CalendarIntegrationId,
  adapters: CalendarAdapterReadinessContract[]
): CalendarAdapterReadinessContract {
  const adapter = adapters.find((candidate) => candidate.id === adapterId);
  if (!adapter) {
    throw new Error(`Missing calendar readiness contract for ${adapterId}.`);
  }

  return adapter;
}

export function buildCalendarOnboardingActionPackets(
  adapters: CalendarAdapterReadinessContract[] = calendarAdapterReadinessContracts
): CalendarOnboardingActionPacket[] {
  const google = requireCalendarAdapterReadinessContract("google-calendar-events", adapters);
  const icloud = requireCalendarAdapterReadinessContract("icloud-ics-fallback", adapters);

  return [
    {
      id: "manual-invite-or-ics",
      provider: "Manual invite or ICS paste",
      label: "Paste invite or ICS",
      status: "ready-local",
      actionLabel: "Paste event",
      customerVisible: true,
      canStartNow: true,
      liveOAuthEnabled: false,
      networkRequestPrepared: false,
      credentialStorageEnabled: false,
      providerRequestUrl: null,
      sourceMode: "local-paste",
      officialDocs: [],
      dataBoundary: "Customer-provided invite text or ICS event metadata only.",
      credentialBoundary: "No provider account, OAuth token, Apple credential, or background sync.",
      requiredEnv: [],
      requiredScopes: [],
      officialScopeUris: [],
      safetyChecks: [
        "Treat pasted invite and ICS text as untrusted input.",
        "Extract event metadata only.",
        "Require opportunity approval before card creation."
      ],
      customerSteps: [
        {
          actor: "customer",
          title: "Paste event details",
          detail: "Paste an invite, selected event fields, or ICS text into the local import path.",
          evidenceRequired: ["Customer-provided event text exists."]
        },
        {
          actor: "customer",
          title: "Review detected metadata",
          detail: "Confirm title, date, location label, and relationship relevance before generating a card.",
          evidenceRequired: ["Import preview is visible before card creation."]
        }
      ],
      operatorSteps: [
        {
          actor: "system",
          title: "Validate untrusted input",
          detail: "Run the manual import parser and reject raw body persistence before showing opportunity review.",
          evidenceRequired: ["Manual import parser tests pass.", "Raw content storage checks pass."]
        }
      ],
      successSignal: "A metadata-only import preview is visible without provider credentials."
    },
    {
      id: "google-calendar-events",
      provider: "Google Calendar API",
      label: "Google Calendar connection",
      status: "credential-gated",
      actionLabel: "Requires OAuth setup",
      customerVisible: true,
      canStartNow: false,
      liveOAuthEnabled: false,
      networkRequestPrepared: false,
      credentialStorageEnabled: false,
      providerRequestUrl: null,
      sourceMode: "oauth-readiness",
      officialDocs: ["https://developers.google.com/workspace/calendar/api/auth"],
      dataBoundary: "Event metadata only after explicit consent; raw descriptions stay out of storage.",
      credentialBoundary: "Needs OAuth client, consent screen, redirect URI, token storage, and revocation handling.",
      requiredEnv: google.requiredEnv,
      requiredScopes: google.requiredScopes,
      officialScopeUris: google.officialScopeUris,
      safetyChecks: google.safetyGates,
      customerSteps: [
        {
          actor: "customer",
          title: "Review Google access",
          detail: "Review the metadata-only scope and use manual paste while OAuth is not enabled.",
          evidenceRequired: ["Scope URI is visible.", "Manual fallback remains available."]
        }
      ],
      operatorSteps: [
        {
          actor: "operator",
          title: "Register OAuth app",
          detail: "Configure the OAuth client, redirect URI, consent screen, and required environment variables.",
          evidenceRequired: google.requiredEnv
        },
        {
          actor: "operator",
          title: "Prove revocation and token boundary",
          detail: "Implement token storage, disconnect, and revocation handling before any provider request is prepared.",
          evidenceRequired: ["Revocation test evidence.", "Token storage boundary review.", "Metadata schema fixture tests."]
        }
      ],
      successSignal: "Google remains blocked until OAuth, revocation, token storage, and metadata import proof exist.",
      fallbackChoiceId: "manual-invite-or-ics",
      blockedReason: google.blockedReasons[0]
    },
    {
      id: "icloud-ics-fallback",
      provider: "iCloud Calendar export",
      label: "Apple Calendar ICS export",
      status: "manual-export",
      actionLabel: "Export ICS, then paste",
      customerVisible: true,
      canStartNow: true,
      liveOAuthEnabled: false,
      networkRequestPrepared: false,
      credentialStorageEnabled: false,
      providerRequestUrl: null,
      sourceMode: "manual-export",
      officialDocs: [
        "https://support.apple.com/guide/calendar/import-or-export-calendars-icl1023/mac",
        "https://support.apple.com/en-gb/108306"
      ],
      dataBoundary: "Customer exports an .ics file or downloads a temporary iCloud.com ICS copy, then pastes selected event data.",
      credentialBoundary: "No Apple ID, app-specific password, CalDAV session, or native Apple Calendar sync.",
      requiredEnv: icloud.requiredEnv,
      requiredScopes: icloud.requiredScopes,
      officialScopeUris: icloud.officialScopeUris,
      safetyChecks: icloud.safetyGates,
      customerSteps: [
        {
          actor: "customer",
          title: "Export or download ICS",
          detail: "Export an event from Calendar on Mac or download a temporary iCloud.com calendar copy, then stop sharing when finished.",
          evidenceRequired: ["Customer-controlled ICS export exists."]
        },
        {
          actor: "customer",
          title: "Paste selected event data",
          detail: "Paste selected event details into the same local import preview used by manual invite paste.",
          evidenceRequired: ["Import preview uses metadata-only fields."]
        }
      ],
      operatorSteps: [
        {
          actor: "operator",
          title: "Keep Apple credentials out",
          detail: "Do not collect Apple ID, app-specific password, CalDAV session, or native Apple Calendar credentials.",
          evidenceRequired: ["Credential collection is absent.", "Manual ICS parser tests pass."]
        }
      ],
      successSignal: "A customer-controlled ICS export reaches opportunity review without Apple credentials.",
      fallbackChoiceId: "manual-invite-or-ics",
      blockedReason: icloud.blockedReasons[0]
    }
  ];
}

export function buildCalendarOnboardingChoices(
  adapters: CalendarAdapterReadinessContract[] = calendarAdapterReadinessContracts
): CalendarOnboardingChoice[] {
  return buildCalendarOnboardingActionPackets(adapters).map((packet) => ({
    id: packet.id,
    provider: packet.provider,
    label: packet.label,
    status: packet.status,
    actionLabel: packet.actionLabel,
    customerVisible: packet.customerVisible,
    canStartNow: packet.canStartNow,
    liveOAuthEnabled: packet.liveOAuthEnabled,
    sourceMode: packet.sourceMode,
    dataBoundary: packet.dataBoundary,
    credentialBoundary: packet.credentialBoundary,
    requiredScopes: packet.requiredScopes,
    officialScopeUris: packet.officialScopeUris,
    blockedReason: packet.blockedReason
  }));
}

export function buildOnboardingPlan(adapterIds: CalendarIntegrationId[] = ["google-calendar-events", "icloud-ics-fallback"]): OnboardingPlan {
  const selectedAdapters = calendarAdapterReadinessContracts.filter((adapter) => adapterIds.includes(adapter.id));
  const selectedStageIds = new Set<OnboardingStageId>();

  for (const story of onboardingUserStories) {
    if (story.calendarDependency === "calendar-agnostic" || adapterIds.includes(story.calendarDependency)) {
      for (const stageId of story.onboardingStageIds) {
        selectedStageIds.add(stageId);
      }
    }
  }

  return {
    stories: onboardingUserStories.filter(
      (story) => story.calendarDependency === "calendar-agnostic" || adapterIds.includes(story.calendarDependency)
    ),
    stages: onboardingStages.filter((stage) => selectedStageIds.has(stage.id)),
    calendarAdapters: selectedAdapters,
    productionGuardrails: onboardingProductionGuardrails
  };
}

export function evaluateCalendarAdapterReadiness(
  adapter: CalendarAdapterReadinessContract,
  satisfiedGates: string[] = []
): AdapterReadinessResult {
  const missingGates = adapter.safetyGates.filter((gate) => !satisfiedGates.includes(gate));

  return {
    adapterId: adapter.id,
    readyForLiveUse: false,
    contractReady:
      adapter.rawContentAllowed === false &&
      adapter.liveOAuthEnabled === false &&
      adapter.storesProviderCredentials === false &&
      adapter.networkRequestFactory === "not-implemented" &&
      adapter.metadataFields.length > 0,
    missingGates,
    blockedReasons: adapter.blockedReasons
  };
}
